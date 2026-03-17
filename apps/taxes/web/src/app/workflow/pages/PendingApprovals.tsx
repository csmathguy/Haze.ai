import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardHeader,
  CircularProgress,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography
} from "@mui/material";
import CheckCircleOutlinedIcon from "@mui/icons-material/CheckCircleOutlined";
import ChecklistOutlinedIcon from "@mui/icons-material/ChecklistOutlined";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";

import { fetchPendingApprovals, respondToApproval, type WorkflowApproval } from "../api.js";

interface SnackbarState {
  open: boolean;
  message: string;
  severity: "success" | "error";
}

interface ApprovalTableRowProps {
  readonly approval: WorkflowApproval;
  readonly isResponding: boolean;
  readonly onRespond: (id: string, decision: "approved" | "rejected") => void;
}

function ApprovalTableRow({ approval, isResponding, onRespond }: ApprovalTableRowProps) {
  return (
    <TableRow key={approval.id}>
      <TableCell>
        <Typography variant="caption" sx={{ fontFamily: "monospace" }}>
          {approval.runId.slice(0, 12)}…
        </Typography>
      </TableCell>
      <TableCell>
        <Typography variant="caption" sx={{ fontFamily: "monospace" }}>
          {approval.stepId.slice(0, 12)}…
        </Typography>
      </TableCell>
      <TableCell>
        <Typography color="textSecondary" variant="body2">
          {approval.prompt}
        </Typography>
      </TableCell>
      <TableCell align="right">
        <Typography variant="caption">{new Date(approval.requestedAt).toLocaleDateString()}</Typography>
      </TableCell>
      <TableCell align="right">
        <Stack direction="row" spacing={1} justifyContent="flex-end">
          <Button
            color="success"
            disabled={isResponding}
            endIcon={<CheckCircleOutlinedIcon />}
            onClick={() => { onRespond(approval.id, "approved"); }}
            size="small"
            variant="outlined"
          >
            Approve
          </Button>
          <Button
            color="error"
            disabled={isResponding}
            endIcon={<CancelOutlinedIcon />}
            onClick={() => { onRespond(approval.id, "rejected"); }}
            size="small"
            variant="outlined"
          >
            Reject
          </Button>
        </Stack>
      </TableCell>
    </TableRow>
  );
}

interface ApprovalTableProps {
  readonly approvals: WorkflowApproval[];
  readonly respondingTo: string | null;
  readonly onRespond: (id: string, decision: "approved" | "rejected") => void;
}

function ApprovalTable({ approvals, respondingTo, onRespond }: ApprovalTableProps) {
  return (
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Run ID</TableCell>
            <TableCell>Step ID</TableCell>
            <TableCell>Prompt</TableCell>
            <TableCell align="right">Requested</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {approvals.map((approval) => (
            <ApprovalTableRow
              key={approval.id}
              approval={approval}
              isResponding={respondingTo === approval.id}
              onRespond={onRespond}
            />
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export function PendingApprovals() {
  const [approvals, setApprovals] = useState<WorkflowApproval[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<SnackbarState>({ open: false, message: "", severity: "success" });

  useEffect(() => {
    void loadApprovals();
  }, []);

  async function loadApprovals(): Promise<void> {
    setIsLoading(true);
    const apprvls = await fetchPendingApprovals();
    setApprovals(apprvls);
    setIsLoading(false);
  }

  const handleRespond = useCallback(
    async (approvalId: string, decision: "approved" | "rejected"): Promise<void> => {
      setRespondingTo(approvalId);
      try {
        const result = await respondToApproval(approvalId, decision, "user@example.com");
        if (result) {
          setSnackbar({
            open: true,
            message: `Approval ${decision === "approved" ? "approved" : "rejected"} successfully.`,
            severity: "success"
          });
          // Remove the approved/rejected item from the list optimistically
          setApprovals((prev) => prev.filter((a) => a.id !== approvalId));
        } else {
          setSnackbar({
            open: true,
            message: "Failed to respond to approval.",
            severity: "error"
          });
        }
      } catch {
        // sonarjs/no-ignored-exceptions: Error is handled by setting snackbar state
        // eslint-disable-next-line sonarjs/no-ignored-exceptions
        setSnackbar({
          open: true,
          message: "Failed to respond to approval.",
          severity: "error"
        });
      } finally {
        setRespondingTo(null);
      }
    },
    []
  );

  function handleCloseSnackbar(): void {
    setSnackbar({ ...snackbar, open: false });
  }

  if (isLoading) {
    return (
      <Stack alignItems="center" minHeight={400} justifyContent="center">
        <CircularProgress />
      </Stack>
    );
  }

  return (
    <Stack spacing={3}>
      <Stack spacing={1}>
        <Typography variant="h2">Pending Approvals</Typography>
        <Typography variant="body1">
          Human-approval gates that are currently waiting for action. Approvals block workflow execution until
          resolved.
        </Typography>
      </Stack>

      <Card variant="outlined">
        <CardHeader avatar={<ChecklistOutlinedIcon />} title="Approval Gates" />
        <CardContent>
          {approvals.length === 0 ? (
            <Alert severity="success">No pending approvals. All workflows are proceeding unblocked.</Alert>
          ) : (
            <ApprovalTable approvals={approvals} respondingTo={respondingTo} onRespond={handleRespond} />
          )}
        </CardContent>
      </Card>

      <Snackbar
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        open={snackbar.open}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: "100%" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Stack>
  );
}
