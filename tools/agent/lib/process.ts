import { createWriteStream } from "node:fs";
import { existsSync, readFileSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import * as path from "node:path";

import {
  appendAuditEvent,
  type AuditPaths,
  type AuditStepSummary,
  createEvent,
  type WorkflowStatus
} from "./audit.js";

export interface LoggedCommand {
  args: string[];
  command: ResolvedCommand;
  step: string;
}

export interface ResolvedCommand {
  command: string;
  prefixArgs: string[];
}

export async function runLoggedCommand(
  workflow: string,
  runId: string,
  paths: AuditPaths,
  loggedCommand: LoggedCommand
): Promise<AuditStepSummary> {
  await mkdir(paths.logsDir, { recursive: true });

  const startedAt = new Date();
  const logFile = path.join(paths.logsDir, `${loggedCommand.step}.log`);
  const output = createWriteStream(logFile, { flags: "a" });

  await appendAuditEvent(
    paths,
    createEvent(runId, workflow, "command-start", {
      command: getCommandLine(loggedCommand),
      logFile,
      status: "running",
      step: loggedCommand.step
    })
  );

  const exitCode = await spawnWithTee(
    loggedCommand.command.command,
    [...loggedCommand.command.prefixArgs, ...loggedCommand.args],
    output
  );
  const durationMs = Date.now() - startedAt.getTime();
  const status: WorkflowStatus = exitCode === 0 ? "success" : "failed";

  await appendAuditEvent(
    paths,
    createEvent(runId, workflow, "command-end", {
      command: getCommandLine(loggedCommand),
      durationMs,
      exitCode,
      logFile,
      status,
      step: loggedCommand.step
    })
  );

  return {
    command: getCommandLine(loggedCommand),
    durationMs,
    exitCode,
    logFile,
    startedAt: startedAt.toISOString(),
    status,
    step: loggedCommand.step
  };
}

export function resolveNpmCommand(): ResolvedCommand {
  const pinnedRuntime = resolvePinnedNpmRuntime(process.cwd());

  if (pinnedRuntime !== null) {
    return pinnedRuntime;
  }

  const npmExecPath = process.env.npm_execpath;

  if (typeof npmExecPath === "string" && npmExecPath.length > 0) {
    return {
      command: process.execPath,
      prefixArgs: [npmExecPath]
    };
  }

  return {
    command: process.platform === "win32" ? "npm.cmd" : "npm",
    prefixArgs: []
  };
}

function spawnWithTee(command: string, args: string[], output: NodeJS.WritableStream): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      env: sanitizeEnv(process.env),
      shell: false,
      stdio: ["ignore", "pipe", "pipe"]
    });

    child.once("error", reject);

    child.stdout.on("data", (chunk: Buffer | string) => {
      process.stdout.write(chunk);
      output.write(chunk);
    });

    child.stderr.on("data", (chunk: Buffer | string) => {
      process.stderr.write(chunk);
      output.write(chunk);
    });

    child.once("close", (code) => {
      output.end();
      resolve(code ?? 1);
    });
  });
}

function sanitizeEnv(environment: NodeJS.ProcessEnv): Record<string, string> {
  return Object.fromEntries(
    Object.entries(environment).flatMap(([key, value]) => (value === undefined ? [] : [[key, value]]))
  );
}

function getCommandLine(loggedCommand: LoggedCommand): string[] {
  return [loggedCommand.command.command, ...loggedCommand.command.prefixArgs, ...loggedCommand.args];
}

function resolvePinnedNpmRuntime(cwd: string): ResolvedCommand | null {
  const versionFile = path.join(cwd, ".nvmrc");

  if (!existsSync(versionFile)) {
    return null;
  }

  const appData = process.env.APPDATA;
  const nvmHome = process.env.NVM_HOME;
  let nvmDirectory: string | null = null;

  if (typeof nvmHome === "string" && nvmHome.length > 0) {
    nvmDirectory = nvmHome;
  } else if (typeof appData === "string" && appData.length > 0) {
    nvmDirectory = path.join(appData, "nvm");
  }

  if (nvmDirectory === null) {
    return null;
  }

  const version = readFileSync(versionFile, "utf8").trim();
  const nodeDirectory = path.join(nvmDirectory, `v${version}`);
  const nodeExecutable = path.join(nodeDirectory, "node.exe");
  const npmCli = path.join(nodeDirectory, "node_modules", "npm", "bin", "npm-cli.js");

  if (!existsSync(nodeExecutable) || !existsSync(npmCli)) {
    return null;
  }

  return {
    command: nodeExecutable,
    prefixArgs: [npmCli]
  };
}
