/** Raw step shape as stored in definitionJson — covers all step types. */
export interface WorkflowStep {
  id: string;
  type: "command" | "agent" | "approval" | "condition" | "parallel" | "context-pack" | "wait" | "deterministic";
  label: string;
  // command / agent fields
  scriptPath?: string;
  args?: string[];
  agentId?: string;
  model?: string;
  skillIds?: string[];
  timeoutMs?: number;
  retryPolicy?: Record<string, unknown>;
  // condition step
  trueBranch?: WorkflowStep[];
  falseBranch?: WorkflowStep[];
  // parallel step
  branches?: WorkflowStep[][];
  // legacy flat format (condition branches as map)
  nextStep?: string;
}
