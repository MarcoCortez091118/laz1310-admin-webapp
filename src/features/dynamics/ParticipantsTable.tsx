import {
  Avatar, Button, Checkbox, Chip, FormControl, InputAdornment, InputLabel, ListItemText,
  MenuItem, Paper, Select, Stack, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, TextField, Typography,
} from "@mui/material";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { ParticipantDetailsDialog } from "./ParticipantDetailsDialog";
import type { AccountParticipation } from "./participantTypes";

const columns = [
  { id: "email", label: "Email" },
  { id: "status", label: "Account type" },
  { id: "date", label: "Submitted" },
  { id: "consent", label: "Consent" },
  { id: "release", label: "Release" },
] as const;
type ColumnId = (typeof columns)[number]["id"];

function dateTime(value: string | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unknown" : date.toLocaleString();
}

/** Search/filter only operate on fetched pages; the protected server is the data authority. */
export function ParticipantsTable({ items, title }: {
  items: AccountParticipation[];
  title: string;
}) {
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState("all");
  const [columnsVisible, setColumnsVisible] = useState<ColumnId[]>(columns.map((column) => column.id));
  const [selected, setSelected] = useState<AccountParticipation | null>(null);
  const visible = useMemo(() => items.filter((item) => {
    if (kind === "registered" && !item.account?.userId) return false;
    if (kind === "anonymous" && item.authenticated) return false;
    if (kind === "unlinked" && (!item.authenticated || item.account?.userId)) return false;
    const haystack = [
      item.account?.displayName, item.account?.email, item.id, item.submittedAt,
    ].filter(Boolean).join(" ").toLowerCase();
    return haystack.includes(search.trim().toLowerCase());
  }), [items, kind, search]);

  return (
    <Stack spacing={1.5}>
      <Paper variant="outlined" sx={{ borderRadius: 3, p: 1.75 }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={1.25}>
          <TextField size="small" fullWidth label="Search loaded participations" value={search}
            onChange={(event) => setSearch(event.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><Search size={16}/></InputAdornment> }} />
          <TextField select size="small" value={kind} label="Identity" onChange={(event) => setKind(event.target.value)}
            sx={{ minWidth: 165 }}>
            <MenuItem value="all">All participants</MenuItem>
            <MenuItem value="registered">Linked accounts</MenuItem>
            <MenuItem value="unlinked">Unlinked logged-in</MenuItem>
            <MenuItem value="anonymous">Anonymous</MenuItem>
          </TextField>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel id="participant-columns-label">Columns</InputLabel>
            <Select labelId="participant-columns-label" label="Columns" multiple
              value={columnsVisible} renderValue={() => `${columnsVisible.length} columns`}
              onChange={(event) => setColumnsVisible(event.target.value as ColumnId[])}>
              {columns.map((column) => (
                <MenuItem value={column.id} key={column.id}>
                  <Checkbox checked={columnsVisible.includes(column.id)} size="small" />
                  <ListItemText primary={column.label}/>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
        <Typography variant="caption" color="text.secondary">
          Showing {visible.length} of {items.length} loaded records. Search does not query all server pages.
        </Typography>
      </Paper>
      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3 }}>
        <Table stickyHeader size="small" aria-label={`${title} participants`}>
          <TableHead><TableRow>
            <TableCell>Participant</TableCell>
            {columnsVisible.includes("email") && <TableCell>Email</TableCell>}
            {columnsVisible.includes("status") && <TableCell>Identity</TableCell>}
            {columnsVisible.includes("date") && <TableCell>Submitted</TableCell>}
            {columnsVisible.includes("consent") && <TableCell>Consent</TableCell>}
            {columnsVisible.includes("release") && <TableCell>Accepted release</TableCell>}
            <TableCell align="right">Details</TableCell>
          </TableRow></TableHead>
          <TableBody>
            {visible.map((item) => {
              const display = item.account?.displayName || (item.account?.userId ? "LA Z account" : item.authenticated ? "Authenticated" : "Anonymous");
              return <TableRow key={item.id} hover>
                <TableCell sx={{ minWidth: 190 }}>
                  <Stack spacing={1} direction="row" alignItems="center">
                    <Avatar sx={{ width: 34, height: 34, bgcolor: "#2F0908", fontSize: 13 }}>
                      {display[0]?.toUpperCase() ?? "U"}
                    </Avatar>
                    <Typography variant="body2" fontWeight={750}>{display}</Typography>
                  </Stack>
                </TableCell>
                {columnsVisible.includes("email") && <TableCell>{item.account?.email ?? "—"}</TableCell>}
                {columnsVisible.includes("status") && <TableCell>
                  <Chip size="small" color={item.account?.userId ? "success" : "default"}
                    variant="outlined" label={item.account?.userId ? "Registered user" : item.authenticated ? "Unlinked account" : "Anonymous"} />
                </TableCell>}
                {columnsVisible.includes("date") && <TableCell sx={{ whiteSpace: "nowrap" }}>{dateTime(item.submittedAt)}</TableCell>}
                {columnsVisible.includes("consent") && <TableCell>v{item.consent?.version ?? "—"}</TableCell>}
                {columnsVisible.includes("release") && <TableCell>
                  <Typography variant="caption" title={item.acceptedReleaseId}>{item.acceptedReleaseId.slice(0, 8)}…</Typography>
                </TableCell>}
                <TableCell align="right"><Button variant="outlined" size="small" onClick={() => setSelected(item)}>Review</Button></TableCell>
              </TableRow>;
            })}
            {!visible.length && <TableRow><TableCell colSpan={columnsVisible.length + 2} align="center" sx={{ py: 4 }}>
              No loaded participants match this filter.
            </TableCell></TableRow>}
          </TableBody>
        </Table>
      </TableContainer>
      <ParticipantDetailsDialog item={selected} onClose={() => setSelected(null)} />
    </Stack>
  );
}
