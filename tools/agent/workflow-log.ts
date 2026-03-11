import {
  appendAuditEvent,
  clearActiveRun,
  createEvent,
  createRunId,
  createWorkflowSummary,
  ensureAuditPaths,
  getActiveRunId,
  readSummary,
  setActiveRun,
  writeSummary
} from "./lib/audit.js";

type CommandName = "end" | "note" | "start";

async function main(): Promise<void> {
  const [commandName, ...rawArgs] = process.argv.slice(2);

  if (!isCommandName(commandName)) {
    throw new Error("Expected one of: start, note, end");
  }

  const args = parseArgs(commandName, rawArgs);
  const workflow = args.workflow;

  if (commandName === "start") {
    await startWorkflow(workflow, args.task);
    return;
  }

  if (commandName === "note") {
    if (args.message === undefined) {
      throw new Error("Missing note message.");
    }

    await writeWorkflowNote(workflow, args.message);
    return;
  }

  await endWorkflow(workflow, args.status, args.message);
}

async function startWorkflow(workflow: string, task?: string): Promise<void> {
  const runId = createRunId(workflow);
  const paths = await ensureAuditPaths(runId);
  const summary = createWorkflowSummary(runId, workflow, task);

  await writeSummary(paths, summary);
  await appendAuditEvent(
    paths,
    createEvent(runId, workflow, "workflow-start", task === undefined ? { status: "running" } : { status: "running", task })
  );
  await setActiveRun(workflow, runId, task);

  process.stdout.write(`${runId}\n`);
}

async function writeWorkflowNote(workflow: string, message: string): Promise<void> {
  const runId = await getExistingRunId(workflow);
  const paths = await ensureAuditPaths(runId);

  await appendAuditEvent(
    paths,
    createEvent(runId, workflow, "workflow-note", {
      metadata: {
        message
      },
      status: "running"
    })
  );
}

async function endWorkflow(workflow: string, status: "failed" | "success", message?: string): Promise<void> {
  const runId = await getExistingRunId(workflow);
  const paths = await ensureAuditPaths(runId);
  const summary = (await readSummary(paths)) ?? createWorkflowSummary(runId, workflow);
  const completedAt = new Date().toISOString();

  summary.completedAt = completedAt;
  summary.durationMs = Date.parse(completedAt) - Date.parse(summary.startedAt);
  summary.status = status;

  await writeSummary(paths, summary);
  await appendAuditEvent(
    paths,
    createEvent(
      runId,
      workflow,
      "workflow-end",
      message === undefined ? { status } : { metadata: { message }, status }
    )
  );
  await clearActiveRun(workflow);
}

async function getExistingRunId(workflow: string): Promise<string> {
  const runId = await getActiveRunId(workflow);

  if (runId === null) {
    throw new Error(`No active workflow found for "${workflow}". Run workflow:start first.`);
  }

  return runId;
}

function isCommandName(value: string | undefined): value is CommandName {
  return value === "end" || value === "note" || value === "start";
}

interface ParsedArgs {
  message?: string;
  status: "failed" | "success";
  task?: string;
  workflow: string;
}

function parseArgs(commandName: CommandName, rawArgs: string[]): ParsedArgs {
  if (looksLikeFlagForm(rawArgs)) {
    return parseFlagArgs(rawArgs);
  }

  return parsePositionalArgs(commandName, rawArgs);
}

function parseFlagArgs(rawArgs: string[]): ParsedArgs {
  const parsed: Partial<ParsedArgs> = {};

  for (let index = 0; index < rawArgs.length; index += 2) {
    const key = rawArgs[index];
    const value = rawArgs[index + 1];

    if (key === undefined || value === undefined || !key.startsWith("--")) {
      throw new Error("Arguments must be passed as --name value pairs.");
    }

    assignFlagArg(parsed, key, value);
  }

  if (parsed.workflow === undefined) {
    throw new Error("Missing required argument --workflow");
  }

  return {
    status: parsed.status ?? "success",
    workflow: parsed.workflow,
    ...(parsed.message === undefined ? {} : { message: parsed.message }),
    ...(parsed.task === undefined ? {} : { task: parsed.task })
  };
}

function parsePositionalArgs(commandName: CommandName, rawArgs: string[]): ParsedArgs {
  const [workflow, ...rest] = rawArgs;

  if (workflow === undefined || workflow.length === 0) {
    throw new Error("Missing workflow name.");
  }

  if (commandName === "start") {
    return {
      status: "success",
      workflow,
      ...(rest.length === 0 ? {} : { task: rest.join(" ") })
    };
  }

  if (commandName === "note") {
    if (rest.length === 0) {
      throw new Error("Missing note message.");
    }

    return {
      message: rest.join(" "),
      status: "success",
      workflow
    };
  }

  const [status, ...messageParts] = rest;

  if (status !== "failed" && status !== "success") {
    throw new Error("Workflow end status must be success or failed.");
  }

  return {
    status,
    workflow,
    ...(messageParts.length === 0 ? {} : { message: messageParts.join(" ") })
  };
}

function looksLikeFlagForm(rawArgs: string[]): boolean {
  return rawArgs.some((arg) => arg.startsWith("--"));
}

function assignFlagArg(parsed: Partial<ParsedArgs>, key: string, value: string): void {
  switch (key) {
    case "--status":
      parsed.status = value === "failed" ? "failed" : "success";
      break;
    case "--workflow":
      parsed.workflow = value;
      break;
    case "--message":
      parsed.message = value;
      break;
    case "--task":
      parsed.task = value;
      break;
    default:
      throw new Error(`Unknown argument: ${key}`);
  }
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
