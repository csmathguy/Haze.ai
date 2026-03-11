import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

export const AUDIT_ROOT = path.resolve("artifacts", "audit");
const ACTIVE_RUNS_PATH = path.join(AUDIT_ROOT, "active-runs.json");

export type WorkflowStatus = "failed" | "running" | "success";

export interface AuditPaths {
  eventsPath: string;
  logsDir: string;
  runDir: string;
  summaryPath: string;
}

export interface AuditEvent {
  actor: string;
  command?: string[];
  cwd: string;
  durationMs?: number;
  eventId: string;
  eventType:
    | "command-end"
    | "command-start"
    | "workflow-end"
    | "workflow-note"
    | "workflow-start";
  exitCode?: number;
  logFile?: string;
  metadata?: Record<string, string | number | boolean | null>;
  runId: string;
  status?: WorkflowStatus;
  step?: string;
  task?: string;
  timestamp: string;
  workflow: string;
}

export interface AuditSummary {
  actor: string;
  completedAt?: string;
  cwd: string;
  durationMs?: number;
  runId: string;
  startedAt: string;
  status: WorkflowStatus;
  steps: AuditStepSummary[];
  task?: string;
  workflow: string;
}

export interface AuditStepSummary {
  command: string[];
  durationMs: number;
  exitCode: number;
  logFile: string;
  startedAt: string;
  status: WorkflowStatus;
  step: string;
}

interface ActiveRunRecord {
  runId: string;
  startedAt: string;
  task?: string;
}

type ActiveRuns = Record<string, Record<string, ActiveRunRecord>>;

export function createRunId(workflow: string, now: Date = new Date()): string {
  const stamp = formatLocalRunTimestamp(now);
  return `${stamp}-${slugify(workflow)}-${randomUUID().slice(0, 8)}`;
}

export function getAuditDateSegment(runId: string): string {
  const matchedDate = /^\d{4}-\d{2}-\d{2}/u.exec(runId)?.[0];
  return matchedDate ?? formatLocalDate(new Date());
}

export function createWorkflowSummary(runId: string, workflow: string, task?: string): AuditSummary {
  return {
    actor: detectActor(),
    cwd: process.cwd(),
    runId,
    startedAt: new Date().toISOString(),
    status: "running",
    steps: [],
    workflow,
    ...(task === undefined ? {} : { task })
  };
}

export function slugify(value: string): string {
  const characters = value.trim().toLowerCase().split("");
  let compact = "";
  let previousWasDash = false;

  for (const character of characters) {
    const isLetter = character >= "a" && character <= "z";
    const isDigit = character >= "0" && character <= "9";

    if (isLetter || isDigit) {
      compact += character;
      previousWasDash = false;
      continue;
    }

    if (!previousWasDash && compact.length > 0) {
      compact += "-";
      previousWasDash = true;
    }
  }

  const normalized = compact.endsWith("-") ? compact.slice(0, -1) : compact;
  return normalized.slice(0, 40) || "workflow";
}

export async function ensureAuditPaths(runId: string): Promise<AuditPaths> {
  const dateDir = path.join(AUDIT_ROOT, getAuditDateSegment(runId));
  const runDir = path.join(dateDir, runId);
  const logsDir = path.join(runDir, "logs");

  await mkdir(logsDir, { recursive: true });

  return {
    eventsPath: path.join(runDir, "events.ndjson"),
    logsDir,
    runDir,
    summaryPath: path.join(runDir, "summary.json")
  };
}

export async function appendAuditEvent(paths: AuditPaths, event: AuditEvent): Promise<void> {
  await mkdir(path.dirname(paths.eventsPath), { recursive: true });
  await writeFile(paths.eventsPath, `${JSON.stringify(event)}\n`, { flag: "a" });
}

export async function readSummary(paths: AuditPaths): Promise<AuditSummary | null> {
  try {
    const contents = await readFile(paths.summaryPath, "utf8");
    return JSON.parse(contents) as AuditSummary;
  } catch (error) {
    if (isMissingFile(error)) {
      return null;
    }

    throw error;
  }
}

export async function writeSummary(paths: AuditPaths, summary: AuditSummary): Promise<void> {
  await mkdir(path.dirname(paths.summaryPath), { recursive: true });
  await writeFile(paths.summaryPath, `${JSON.stringify(summary, null, 2)}\n`);
}

export async function setActiveRun(workflow: string, runId: string, task?: string): Promise<void> {
  const activeRuns = await readActiveRuns();
  const cwd = process.cwd();
  const runsForCwd = activeRuns[cwd] ?? {};

  runsForCwd[workflow] = {
    runId,
    startedAt: new Date().toISOString(),
    ...(task === undefined ? {} : { task })
  };

  activeRuns[cwd] = runsForCwd;

  await writeActiveRuns(activeRuns);
}

export async function getActiveRunId(workflow: string): Promise<string | null> {
  const activeRuns = await readActiveRuns();
  const cwd = process.cwd();
  const runsForCwd = activeRuns[cwd];

  if (runsForCwd === undefined) {
    return null;
  }

  return runsForCwd[workflow]?.runId ?? null;
}

export async function clearActiveRun(workflow: string): Promise<void> {
  const activeRuns = await readActiveRuns();
  const cwd = process.cwd();
  const runsForCwd = activeRuns[cwd];

  if (runsForCwd === undefined) {
    return;
  }

  activeRuns[cwd] = Object.fromEntries(
    Object.entries(runsForCwd).filter(([candidateWorkflow]) => candidateWorkflow !== workflow)
  );
  await writeActiveRuns(activeRuns);
}

export function createEvent(
  runId: string,
  workflow: string,
  eventType: AuditEvent["eventType"],
  fields: Partial<Omit<AuditEvent, "actor" | "cwd" | "eventId" | "eventType" | "runId" | "timestamp" | "workflow">> = {}
): AuditEvent {
  return {
    actor: detectActor(),
    cwd: process.cwd(),
    eventId: randomUUID(),
    eventType,
    runId,
    timestamp: new Date().toISOString(),
    workflow,
    ...fields
  };
}

function detectActor(): string {
  return process.env.CODEX_AGENT_NAME ?? process.env.USERNAME ?? process.env.USER ?? os.userInfo().username;
}

async function readActiveRuns(): Promise<ActiveRuns> {
  try {
    const contents = await readFile(ACTIVE_RUNS_PATH, "utf8");
    return JSON.parse(contents) as ActiveRuns;
  } catch (error) {
    if (isMissingFile(error)) {
      return {};
    }

    throw error;
  }
}

async function writeActiveRuns(activeRuns: ActiveRuns): Promise<void> {
  await mkdir(path.dirname(ACTIVE_RUNS_PATH), { recursive: true });
  await writeFile(ACTIVE_RUNS_PATH, `${JSON.stringify(activeRuns, null, 2)}\n`);
}

function isMissingFile(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}

function formatLocalRunTimestamp(value: Date): string {
  return `${formatLocalDate(value)}T${pad(value.getHours())}${pad(value.getMinutes())}${pad(value.getSeconds())}-${padMilliseconds(value.getMilliseconds())}`;
}

function formatLocalDate(value: Date): string {
  return `${value.getFullYear().toString()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
}

function pad(value: number): string {
  return value.toString().padStart(2, "0");
}

function padMilliseconds(value: number): string {
  return value.toString().padStart(3, "0");
}
