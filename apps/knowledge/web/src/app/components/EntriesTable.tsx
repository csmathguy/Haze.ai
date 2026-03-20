/* eslint-disable max-lines-per-function, @typescript-eslint/no-confusing-void-expression */
import { useMemo, useState } from "react";
import {
  Button,
  Chip,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography
} from "@mui/material";
import { alpha, styled } from "@mui/material/styles";
import type { KnowledgeEntry } from "@taxes/shared";

import { summarizeEntryPresentation } from "../entry-presentation.js";

const DEFAULT_ROWS_PER_PAGE = 25;
const entryKinds = ["agent-memory", "doc-mirror", "follow-up", "process-note", "profile-note", "research-report", "technical-note"] as const;

export function EntriesTable({
  entries,
  kindFilter,
  onCreateResearch,
  onSelectEntry,
  search,
  selectedEntryId,
  selectedSubjectId,
  setKindFilter,
  setSearch
}: {
  readonly entries: KnowledgeEntry[];
  readonly kindFilter: string;
  readonly onCreateResearch: () => void;
  readonly onSelectEntry: (entry: KnowledgeEntry) => void;
  readonly search: string;
  readonly selectedEntryId: string | null;
  readonly selectedSubjectId: string;
  readonly setKindFilter: (value: string) => void;
  readonly setSearch: (value: string) => void;
}) {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_ROWS_PER_PAGE);
  const visibleEntries = useMemo(() => entries.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage), [entries, page, rowsPerPage]);

  return (
    <Stack spacing={2}>
      <Stack direction={{ sm: "row", xs: "column" }} justifyContent="space-between" spacing={1}>
        <div>
          <Typography variant="h2">Entries</Typography>
          <Typography color="text.secondary" variant="body2">
            Browse knowledge as a paginated table and open the selected entry in a focused drawer.
          </Typography>
        </div>
        <Button onClick={onCreateResearch} variant="contained">
          New Research
        </Button>
      </Stack>
      <Stack direction={{ md: "row", xs: "column" }} spacing={1.5}>
        <TextField label="Search" onChange={(event) => setSearch(event.target.value)} value={search} />
        <TextField label="Kind" onChange={(event) => setKindFilter(event.target.value)} select value={kindFilter}>
          <MenuItem value="all">All kinds</MenuItem>
          {entryKinds.map((kind) => (
            <MenuItem key={kind} value={kind}>
              {kind}
            </MenuItem>
          ))}
        </TextField>
      </Stack>
      <Typography color="text.secondary" variant="body2">
        {selectedSubjectId === "all" ? "Showing all namespaces." : "Filtered to the selected subject."}
      </Typography>
      <TableShell elevation={0}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Entry</TableCell>
              <TableCell>Kind</TableCell>
              <TableCell>Namespace</TableCell>
              <TableCell>Updated</TableCell>
              <TableCell>Tags</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {visibleEntries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5}>
                  <Typography color="text.secondary" variant="body2">
                    No entries match the current filters.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              visibleEntries.map((entry) => {
                const presentation = summarizeEntryPresentation(entry);
                const selected = entry.id === selectedEntryId;
                return (
                  <TableRow
                    hover
                    key={entry.id}
                    onClick={() => {
                      onSelectEntry(entry);
                    }}
                    selected={selected}
                    sx={{ cursor: "pointer" }}
                  >
                    <TableCell>
                      <Stack spacing={0.25}>
                        <Typography variant="body2">{presentation.title}</Typography>
                        <Typography color="text.secondary" variant="caption">
                          {entry.content.abstract}
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Chip color="primary" label={entry.kind} size="small" />
                    </TableCell>
                    <TableCell>{entry.namespace}</TableCell>
                    <TableCell>{formatDateTime(entry.updatedAt)}</TableCell>
                    <TableCell>
                      <Stack direction="row" flexWrap="wrap" spacing={0.5} useFlexGap>
                        {entry.tags.slice(0, 3).map((tag) => (
                          <Chip key={tag} label={tag} size="small" variant="outlined" />
                        ))}
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={entries.length}
          page={page}
          rowsPerPage={rowsPerPage}
          rowsPerPageOptions={[25, 50, 100]}
          onPageChange={(_, nextPage) => setPage(nextPage)}
          onRowsPerPageChange={(event) => {
            setRowsPerPage(Number(event.target.value));
            setPage(0);
          }}
        />
      </TableShell>
    </Stack>
  );
}

const TableShell = styled(Paper)(({ theme }) => ({
  border: `1px solid ${alpha(theme.palette.divider, 0.9)}`,
  borderRadius: Number(theme.shape.borderRadius) * 1.15,
  overflow: "hidden"
}));

function formatDateTime(value: string | number | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}
