import React, { useCallback, useState } from "react";
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  type Node,
  type Edge,
  type NodeTypes
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Box,
  Typography
} from "@mui/material";
import {
  Code as CodeIcon,
  Psychology as AgentIcon,
  CheckCircle as ApprovalIcon,
  Schedule as WaitIcon,
  Help as HelpIcon
} from "@mui/icons-material";
import * as dagre from "dagre";

import type { WorkflowDefinition, WorkflowStepRun } from "../app/api.js";
import { StepDetailDrawer } from "./StepDetailDrawer.js";
import type { WorkflowStep } from "./workflow-types.js";

export type { WorkflowStep } from "./workflow-types.js";

interface WorkflowRunOverlay {
  stepRuns: WorkflowStepRun[];
  runStatus: string;
}

interface WorkflowGraphProps {
  definition: WorkflowDefinition;
  runOverlay?: WorkflowRunOverlay | undefined;
}

interface CustomNodeData extends Record<string, unknown> {
  step: WorkflowStep;
  runStatus?: "completed" | "in-progress" | "failed" | "skipped" | "not-reached";
  stepRun?: WorkflowStepRun;
}

const getDefaultNodeColor = (stepType: WorkflowStep["type"]): string => {
  const colors: Partial<Record<WorkflowStep["type"], string>> = {
    command: "primary.main",
    deterministic: "primary.main",
    agent: "secondary.main",
    approval: "warning.dark",
    condition: "warning.main",
    parallel: "info.main",
    "context-pack": "info.dark",
    wait: "success.main"
  };
  return colors[stepType] ?? "text.disabled";
};

const getStatusNodeColor = (status: string): string => {
  const colors: Record<string, string> = {
    completed: "success.main",
    "in-progress": "info.main",
    failed: "error.main",
    skipped: "action.disabled",
    "not-reached": "action.disabled"
  };
  return colors[status] ?? "text.disabled";
};

const nodeBoxBaseSx = {
  padding: 1.5,
  borderRadius: 1,
  minWidth: 120,
  textAlign: "center",
  border: "2px solid",
  borderColor: "common.white"
} as const;

const pulseAnimationSx = {
  "@keyframes pulse": {
    "0%": { opacity: 1 },
    "50%": { opacity: 0.6 },
    "100%": { opacity: 1 }
  },
  animation: "pulse 1.5s infinite"
} as const;

function getStepRunStatus(
  runOverlay: WorkflowRunOverlay | undefined,
  stepId: string
): "completed" | "in-progress" | "failed" | "skipped" | "not-reached" | undefined {
  if (!runOverlay) return undefined;
  const stepRun = runOverlay.stepRuns.find((sr) => sr.stepId === stepId);
  if (!stepRun) return undefined;
  if (stepRun.errorJson) return "failed";
  if (stepRun.completedAt) return "completed";
  if (stepRun.startedAt && !stepRun.completedAt) return "in-progress";
  return undefined;
}

function getStepRunByStepId(
  runOverlay: WorkflowRunOverlay | undefined,
  stepId: string
): WorkflowStepRun | undefined {
  if (!runOverlay) return undefined;
  return runOverlay.stepRuns.find((sr) => sr.stepId === stepId);
}

/**
 * Recursively collect all steps from the definition, including steps nested
 * inside condition branches and parallel branches.
 */
function collectAllSteps(steps: WorkflowStep[]): WorkflowStep[] {
  const result: WorkflowStep[] = [];
  for (const step of steps) {
    result.push(step);
    if (step.trueBranch) result.push(...collectAllSteps(step.trueBranch));
    if (step.falseBranch) result.push(...collectAllSteps(step.falseBranch));
    if (Array.isArray(step.branches)) {
      for (const branch of step.branches) {
        result.push(...collectAllSteps(branch));
      }
    }
  }
  return result;
}

interface BranchEdgeArgs {
  sourceId: string;
  edgeLabel: string;
  branch: WorkflowStep[];
  followingId: string | null;
}

function addOneBranchEdge(args: BranchEdgeArgs, edges: Edge[]): void {
  const { sourceId, edgeLabel, branch, followingId } = args;
  const branchFirst = branch[0]?.id ?? null;
  if (branchFirst) {
    edges.push({ id: `${sourceId}-${edgeLabel}`, source: sourceId, target: branchFirst, label: edgeLabel, animated: false });
    buildEdgesForSequence(branch, edges, followingId);
  } else if (followingId) {
    edges.push({ id: `${sourceId}-skip-${edgeLabel}`, source: sourceId, target: followingId, label: edgeLabel, animated: false });
  }
}

function addConditionEdges(step: WorkflowStep, edges: Edge[], followingId: string | null): void {
  addOneBranchEdge({ sourceId: step.id, edgeLabel: "true", branch: step.trueBranch ?? [], followingId }, edges);
  addOneBranchEdge({ sourceId: step.id, edgeLabel: "false", branch: step.falseBranch ?? [], followingId }, edges);
}

function addParallelEdges(step: WorkflowStep, edges: Edge[], followingId: string | null): void {
  if (!Array.isArray(step.branches)) return;
  step.branches.forEach((branch, idx) => {
    addOneBranchEdge({ sourceId: step.id, edgeLabel: `branch-${String(idx)}`, branch, followingId }, edges);
  });
}

function addStepEdges(step: WorkflowStep, edges: Edge[], followingId: string | null): void {
  if (step.trueBranch !== undefined || step.falseBranch !== undefined) {
    addConditionEdges(step, edges, followingId);
  } else if (Array.isArray(step.branches) && step.branches.length > 0) {
    addParallelEdges(step, edges, followingId);
  } else if (followingId) {
    edges.push({ id: `${step.id}-${followingId}`, source: step.id, target: followingId, animated: false });
  }
}

function buildEdgesForSequence(steps: WorkflowStep[], edges: Edge[], nextStepId: string | null): void {
  steps.forEach((step, i) => {
    const followingId = i + 1 < steps.length ? (steps[i + 1]?.id ?? null) : nextStepId;
    addStepEdges(step, edges, followingId);
  });
}

function buildNodesAndEdges(
  definition: WorkflowDefinition,
  runOverlay: WorkflowRunOverlay | undefined
): { nodes: Node[]; edges: Edge[] } {
  const definitionData = JSON.parse(definition.definitionJson) as Record<string, unknown>;
  const topLevelSteps = (definitionData.steps as WorkflowStep[] | undefined) ?? [];

  const allSteps = collectAllSteps(topLevelSteps);

  const nodes: Node[] = allSteps.map((step) => ({
    id: step.id,
    data: {
      step,
      runStatus: getStepRunStatus(runOverlay, step.id),
      stepRun: getStepRunByStepId(runOverlay, step.id)
    } as CustomNodeData,
    position: { x: 0, y: 0 },
    type: "custom"
  }));

  const edges: Edge[] = [];
  buildEdgesForSequence(topLevelSteps, edges, null);

  const layoutNodes = applyDagreLayout(nodes, edges);
  return { nodes: layoutNodes, edges };
}

const CustomNode: React.FC<{ data: CustomNodeData }> = ({ data }) => {
  const step = data.step;
  const runStatus = data.runStatus;
  const stepRun = data.stepRun;

  const nodeColor = runStatus ? getStatusNodeColor(runStatus) : getDefaultNodeColor(step.type);

  const durationMs = stepRun?.completedAt
    ? new Date(stepRun.completedAt).getTime() - new Date(stepRun.startedAt).getTime()
    : null;

  const getNodeIcon = () => {
    switch (step.type) {
      case "command":
      case "deterministic": return <CodeIcon fontSize="small" />;
      case "agent":
      case "context-pack": return <AgentIcon fontSize="small" />;
      case "approval": return <ApprovalIcon fontSize="small" />;
      case "condition": return <HelpIcon fontSize="small" />;
      case "parallel":
      case "wait": return <WaitIcon fontSize="small" />;
      default: return null;
    }
  };

  const animationSx = runStatus === "in-progress" ? pulseAnimationSx : {};

  return (
    <Box
      sx={{
        ...nodeBoxBaseSx,
        backgroundColor: nodeColor,
        color: "common.white",
        ...animationSx
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0.5, mb: 0.5 }}>
        {getNodeIcon()}
        <Typography variant="caption" sx={{ fontWeight: 600 }}>
          {step.type}
        </Typography>
      </Box>
      <Typography variant="body2" sx={{ fontWeight: 500 }}>
        {step.label}
      </Typography>
      {runStatus && (
        <Typography variant="caption" sx={{ display: "block", mt: 0.5, fontSize: "0.7rem" }}>
          {runStatus}
          {durationMs !== null && ` (${String(durationMs)}ms)`}
        </Typography>
      )}
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
    </Box>
  );
};

const nodeTypes: NodeTypes = {
  custom: CustomNode
};

export const WorkflowGraph: React.FC<WorkflowGraphProps> = ({ definition, runOverlay }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([] as Node[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([] as Edge[]);
  const [selectedStep, setSelectedStep] = useState<WorkflowStep | null>(null);
  const [selectedStepRun, setSelectedStepRun] = useState<WorkflowStepRun | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  React.useEffect(() => {
    const { nodes: newNodes, edges: newEdges } = buildNodesAndEdges(definition, runOverlay);
    setNodes(newNodes);
    setEdges(newEdges);
  }, [definition, runOverlay, setNodes, setEdges]);

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      const nodeData = node.data as CustomNodeData;
      setSelectedStep(nodeData.step);
      setSelectedStepRun(nodeData.stepRun ?? null);
      setDrawerOpen(true);
    },
    []
  );

  const closeDrawer = () => {
    setDrawerOpen(false);
    setSelectedStep(null);
  };

  return (
    <Box sx={{ width: "100%", height: 640 }}>
      <Box sx={{ height: 600, width: "100%", position: "relative" }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          onNodeClick={handleNodeClick}
          fitView
        >
          <Background />
          <Controls />
        </ReactFlow>
      </Box>

      <StepDetailDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        selectedStep={selectedStep}
        selectedStepRun={selectedStepRun}
      />
    </Box>
  );
};

function applyDagreLayout(nodes: Node[], edges: Edge[]): Node[] {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: "TB" });
  g.setDefaultEdgeLabel(() => ({}));

  nodes.forEach((node) => {
    g.setNode(node.id, { width: 150, height: 100 });
  });

  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target);
  });

  dagre.layout(g);

  return nodes.map((node) => {
    const pos = g.node(node.id);
    return {
      ...node,
      position: { x: pos.x - 75, y: pos.y - 50 }
    };
  });
}
