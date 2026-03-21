/**
 * CLI bridge for running workflows.
 *
 * Usage:
 *   npm run workflow:run -- implementation --work-item-id PLAN-144 --summary "Implement feature X"
 *
 * This script:
 * 1. Connects to the workflow API
 * 2. Starts a workflow run with the specified definition
 * 3. Returns the run ID for inspection
 */

const WORKFLOW_API_URL = process.env.WORKFLOW_API_URL ?? "http://localhost:3001";

interface WorkflowRunOptions {
  definitionName: string;
  input?: Record<string, string>;
}

interface WorkflowRunResponse {
  run: { id: string; status: string };
  effects: unknown[];
}

async function startWorkflowRun(options: WorkflowRunOptions): Promise<void> {
  try {
    const payload = {
      definitionName: options.definitionName,
      ...(options.input ? { input: options.input } : {})
    };

    console.warn(`Starting workflow '${options.definitionName}'...`);
    console.warn(`Input: ${JSON.stringify(payload.input, null, 2)}`);

    const response = await fetch(`${WORKFLOW_API_URL}/api/workflow/runs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(
        `Error starting workflow: ${String(response.status)}`
      );
      console.error(error);
      process.exit(1);
    }

    const result = (await response.json()) as WorkflowRunResponse;

    console.warn("\nWorkflow run started successfully!");
    console.warn(`Run ID: ${result.run.id}`);
    console.warn(`Status: ${result.run.status}`);
    console.warn("\nInspect run details with:");
    console.warn(
      `  curl ${WORKFLOW_API_URL}/api/workflow/runs/${result.run.id}`
    );
  } catch (error) {
    console.error("Failed to start workflow run:", error);
    process.exit(1);
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error("Usage: npm run workflow:run -- <definition-name> [options]");
    console.error(
      "Example: npm run workflow:run -- implementation --work-item-id PLAN-144"
    );
    process.exit(1);
  }

  const definitionName = args[0] ?? "";
  const remainingArgs = args.slice(1);

  // Parse remaining arguments as --key value pairs
  const input: Record<string, string> = {};

  for (let i = 0; i < remainingArgs.length; i += 2) {
    const key = remainingArgs[i];
    const value = remainingArgs[i + 1];
    if (key && key.startsWith("--") && value) {
      const cleanKey = key.slice(2); // Remove -- prefix
      input[cleanKey] = value;
    }
  }

  if (Object.keys(input).length > 0) {
    await startWorkflowRun({
      definitionName,
      input
    });
  } else {
    await startWorkflowRun({
      definitionName
    });
  }
}

main().catch((error: unknown) => {
  console.error("Unexpected error:", error);
  process.exit(1);
});
