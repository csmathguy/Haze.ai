import { describe, it, expect } from "vitest";
import { z } from "zod";
import {
  WorkflowEngine
} from "./workflow.js";
import type {
  WorkflowDefinition,
  CommandStep,
  StepResult,
  WorkflowEvent
} from "./workflow-schemas.js";

describe("WorkflowEngine - Sequencing", () => {
  const engine = new WorkflowEngine();

  // ========================================================================
  // Multi-Step Sequencing Tests
  // ========================================================================

  describe("advanceRun (multi-step sequencing)", () => {
    const multiStepDefinition: WorkflowDefinition = {
      name: "multi-step-workflow",
      version: "1.0.0",
      triggers: ["manual"],
      inputSchema: z.object({}),
      steps: [
        {
          type: "command",
          id: "1",
          label: "First step",
          scriptPath: "/path/to/script1.sh"
        } as CommandStep,
        {
          type: "command",
          id: "2",
          label: "Second step",
          scriptPath: "/path/to/script2.sh"
        } as CommandStep,
        {
          type: "command",
          id: "3",
          label: "Third step",
          scriptPath: "/path/to/script3.sh"
        } as CommandStep
      ]
    };

    it("advances to next step when step succeeds", () => {
      const startResult = engine.startRun(multiStepDefinition, {});
      const run = startResult.nextRun;

      expect(run.currentStepId).toBe("1");

      const stepResult: StepResult = { type: "success", output: { result: "step1-done" } };
      const advanceResult = engine.advanceRun(run, stepResult, multiStepDefinition);

      expect(advanceResult.nextRun.status).toBe("running");
      expect(advanceResult.nextRun.currentStepId).toBe("2");
      expect(advanceResult.effects).toHaveLength(1);
      expect(advanceResult.effects[0]?.type).toBe("execute-step");
      if (advanceResult.effects[0]?.type === "execute-step") {
        expect(advanceResult.effects[0].step.id).toBe("2");
      }
    });

    it("completes workflow after last step succeeds", () => {
      // Start at step 3 (the last step)
      const run = {
        id: "test-run",
        definitionName: multiStepDefinition.name,
        version: multiStepDefinition.version,
        status: "running" as const,
        currentStepId: "3",
        contextJson: { input: {} },
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const stepResult: StepResult = { type: "success", output: { result: "step3-done" } };
      const advanceResult = engine.advanceRun(run, stepResult, multiStepDefinition);

      expect(advanceResult.nextRun.status).toBe("completed");
      expect(advanceResult.nextRun.completedAt).toBeDefined();
      expect(advanceResult.effects).toHaveLength(1);
      expect(advanceResult.effects[0]?.type).toBe("complete-run");
    });

    it("preserves all step outputs in context", () => {
      // Simulate running step 1 through step 3
      const run1 = { ...engine.startRun(multiStepDefinition, {}).nextRun };

      const result1 = engine.advanceRun(run1, { type: "success", output: { data: "step1" } }, multiStepDefinition);
      const run2 = result1.nextRun;

      const result2 = engine.advanceRun(run2, { type: "success", output: { data: "step2" } }, multiStepDefinition);
      const run3 = result2.nextRun;

      const result3 = engine.advanceRun(run3, { type: "success", output: { data: "step3" } }, multiStepDefinition);

      const finalContext = result3.nextRun.contextJson;
      expect(finalContext.step_1).toEqual({ data: "step1" });
      expect(finalContext.step_2).toEqual({ data: "step2" });
      expect(finalContext.step_3).toEqual({ data: "step3" });
    });
  });

  // ========================================================================
  // Approval Step Tests
  // ========================================================================

  describe("advanceRun (approval steps)", () => {
    const approvalWorkflow: WorkflowDefinition = {
      name: "approval-workflow",
      version: "1.0.0",
      triggers: ["manual"],
      inputSchema: z.object({}),
      steps: [
        {
          type: "command",
          id: "step-1",
          label: "First step",
          scriptPath: "/path/to/script.sh"
        } as CommandStep,
        {
          type: "approval",
          id: "approval-1",
          label: "Manual approval",
          prompt: "Do you approve?"
        }
      ]
    };

    it("pauses workflow when encountering approval step", () => {
      const run = {
        id: "test-run",
        definitionName: approvalWorkflow.name,
        version: approvalWorkflow.version,
        status: "running" as const,
        currentStepId: "step-1",
        contextJson: { input: {} },
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const stepResult: StepResult = { type: "success", output: { result: "done" } };
      const advanceResult = engine.advanceRun(run, stepResult, approvalWorkflow);

      expect(advanceResult.nextRun.status).toBe("paused");
      expect(advanceResult.nextRun.currentStepId).toBe("approval-1");
      expect(advanceResult.effects).toHaveLength(1);
      expect(advanceResult.effects[0]?.type).toBe("create-approval");
    });
  });

  // ========================================================================
  // Approval Response Tests
  // ========================================================================

  describe("signalRun (approval.responded)", () => {
    const approvalWorkflow: WorkflowDefinition = {
      name: "approval-workflow",
      version: "1.0.0",
      triggers: ["manual"],
      inputSchema: z.object({}),
      steps: [
        {
          type: "command",
          id: "step-1",
          label: "First step",
          scriptPath: "/path/to/script.sh"
        } as CommandStep,
        {
          type: "approval",
          id: "approval-1",
          label: "Manual approval",
          prompt: "Do you approve?"
        },
        {
          type: "command",
          id: "step-2",
          label: "Second step",
          scriptPath: "/path/to/script2.sh"
        } as CommandStep
      ]
    };

    it("resumes workflow on approval.responded with decision=approved", () => {
      const run = {
        id: "test-run",
        definitionName: approvalWorkflow.name,
        version: approvalWorkflow.version,
        status: "paused" as const,
        currentStepId: "approval-1",
        contextJson: { input: {} },
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const event: WorkflowEvent = {
        type: "approval.responded",
        payload: { decision: "approved" }
      };
      const result = engine.signalRun(run, event, approvalWorkflow);

      expect(result.nextRun.status).toBe("running");
      expect(result.nextRun.currentStepId).toBe("step-2");
      expect(result.effects).toHaveLength(1);
      expect(result.effects[0]?.type).toBe("execute-step");
    });

    it("fails workflow on approval.responded with decision=rejected", () => {
      const run = {
        id: "test-run",
        definitionName: approvalWorkflow.name,
        version: approvalWorkflow.version,
        status: "paused" as const,
        currentStepId: "approval-1",
        contextJson: { input: {} },
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const event: WorkflowEvent = {
        type: "approval.responded",
        payload: { decision: "rejected" }
      };
      const result = engine.signalRun(run, event, approvalWorkflow);

      expect(result.nextRun.status).toBe("failed");
      expect(result.nextRun.completedAt).toBeDefined();
      expect(result.effects).toHaveLength(1);
      expect(result.effects[0]?.type).toBe("fail-run");
      if (result.effects[0]?.type === "fail-run") {
        expect(result.effects[0].error.message).toBe("Approval rejected");
      }
    });

    it("completes workflow after approval when no more steps", () => {
      const shortApprovalWorkflow: WorkflowDefinition = {
        name: "short-approval-workflow",
        version: "1.0.0",
        triggers: ["manual"],
        inputSchema: z.object({}),
        steps: [
          {
            type: "command",
            id: "step-1",
            label: "First step",
            scriptPath: "/path/to/script.sh"
          } as CommandStep,
          {
            type: "approval",
            id: "approval-1",
            label: "Manual approval",
            prompt: "Do you approve?"
          }
        ]
      };

      const run = {
        id: "test-run",
        definitionName: shortApprovalWorkflow.name,
        version: shortApprovalWorkflow.version,
        status: "paused" as const,
        currentStepId: "approval-1",
        contextJson: { input: {} },
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const event: WorkflowEvent = {
        type: "approval.responded",
        payload: { decision: "approved" }
      };
      const result = engine.signalRun(run, event, shortApprovalWorkflow);

      expect(result.nextRun.status).toBe("completed");
      expect(result.nextRun.completedAt).toBeDefined();
      expect(result.effects).toHaveLength(1);
      expect(result.effects[0]?.type).toBe("complete-run");
    });
  });
});
