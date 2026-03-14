import { readFile } from "node:fs/promises";
import * as path from "node:path";

import {
  CreateKnowledgeEntryInputSchema,
  CreateKnowledgeSubjectInputSchema
} from "@taxes/shared";

import { KNOWLEDGE_DATABASE_URL } from "../../apps/knowledge/api/src/config.js";
import { applyPendingKnowledgeMigrations } from "../../apps/knowledge/api/src/db/migrations.js";
import {
  createKnowledgeEntry,
  createKnowledgeSubject,
  getKnowledgeWorkspace,
  importRepositoryKnowledge,
  updateKnowledgeEntry
} from "../../apps/knowledge/api/src/services/knowledge.js";
import {
  findKnowledgeEntries,
  FindKnowledgeEntriesInputSchema,
  ResearchReportUpsertInputSchema,
  resolveResearchReportUpsert
} from "./research-report.js";

type CommandHandler = (args: string[]) => Promise<unknown>;

const commandHandlers = new Map<string, CommandHandler>([
  ["entry:find", handleEntryFind],
  ["entry:create", handleEntryCreate],
  ["repo-docs:sync", handleRepoDocsSync],
  ["research-report:upsert", handleResearchReportUpsert],
  ["subject:create", handleSubjectCreate],
  ["workspace:get", handleWorkspaceGet]
]);

async function main(): Promise<void> {
  const [group, action, ...restArgs] = process.argv.slice(2);
  const commandKey = `${group ?? ""}:${action ?? ""}`;
  const handler = commandHandlers.get(commandKey);

  if (handler === undefined) {
    throw new Error(`Unknown command '${commandKey}'. Expected one of: ${[...commandHandlers.keys()].join(", ")}`);
  }

  await applyPendingKnowledgeMigrations(KNOWLEDGE_DATABASE_URL);
  const result = await handler(restArgs);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

async function handleWorkspaceGet(): Promise<Awaited<ReturnType<typeof getKnowledgeWorkspace>>> {
  return getKnowledgeWorkspace();
}

async function handleSubjectCreate(args: string[]): Promise<{ subject: Awaited<ReturnType<typeof createKnowledgeSubject>> }> {
  const input = await readJsonFileFlag(args, "--json-file", CreateKnowledgeSubjectInputSchema);

  return {
    subject: await createKnowledgeSubject(input)
  };
}

async function handleEntryCreate(args: string[]): Promise<{ entry: Awaited<ReturnType<typeof createKnowledgeEntry>> }> {
  const input = await readJsonFileFlag(args, "--json-file", CreateKnowledgeEntryInputSchema);

  return {
    entry: await createKnowledgeEntry(input)
  };
}

async function handleEntryFind(args: string[]): Promise<{ entries: ReturnType<typeof findKnowledgeEntries> }> {
  const workspace = await getKnowledgeWorkspace();
  const input = FindKnowledgeEntriesInputSchema.parse({
    kind: readOptionalFlag(args, "--kind"),
    limit: readOptionalIntFlag(args, "--limit"),
    namespace: readOptionalFlag(args, "--namespace"),
    search: readOptionalFlag(args, "--search")
  });

  return {
    entries: findKnowledgeEntries(workspace.entries, input)
  };
}

async function handleResearchReportUpsert(
  args: string[]
): Promise<{ action: "create" | "update"; entry: Awaited<ReturnType<typeof createKnowledgeEntry>> }> {
  const workspace = await getKnowledgeWorkspace();
  const input = await readJsonFileFlag(args, "--json-file", ResearchReportUpsertInputSchema);
  const mutation = resolveResearchReportUpsert(workspace.entries, input, new Date().toISOString());

  if (mutation.action === "create") {
    return {
      action: "create",
      entry: await createKnowledgeEntry(mutation.input)
    };
  }

  return {
    action: "update",
    entry: await updateKnowledgeEntry(mutation.entryId, mutation.input)
  };
}

async function handleRepoDocsSync(): Promise<{ sync: Awaited<ReturnType<typeof importRepositoryKnowledge>> }> {
  return {
    sync: await importRepositoryKnowledge()
  };
}

function readRequiredFlag(args: string[], flagName: string): string {
  const value = readOptionalFlag(args, flagName);

  if (value === undefined) {
    throw new Error(`Pass ${flagName}.`);
  }

  return value;
}

function readOptionalFlag(args: string[], flagName: string): string | undefined {
  const index = args.indexOf(flagName);

  if (index === -1) {
    return undefined;
  }

  const value = args[index + 1];

  if (value === undefined) {
    throw new Error(`Missing value after ${flagName}.`);
  }

  return value;
}

function readOptionalIntFlag(args: string[], flagName: string): number | undefined {
  const value = readOptionalFlag(args, flagName);

  if (value === undefined) {
    return undefined;
  }

  return Number(value);
}

async function readJsonFileFlag<TSchemaOutput>(
  args: string[],
  flagName: string,
  schema: { parse: (value: unknown) => TSchemaOutput }
): Promise<TSchemaOutput> {
  const filePath = readRequiredFlag(args, flagName);
  const rawContent = await readFile(path.resolve(filePath), "utf8");

  return schema.parse(JSON.parse(rawContent) as unknown);
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
