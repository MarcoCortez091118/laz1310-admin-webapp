import { Avatar, Box, Button, Checkbox, Chip, FormControl, InputLabel, ListItemText, MenuItem, Select, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography, Paper } from "@mui/material";
import { useState } from "react";
import type { AdminUserSummary } from "../notifications/users";

const columns = [
  { id: "email", label: "Email" },
  { id: "status", label: "Account" },
  { id: "devices", label: "Devices" },
  { id: "createdAt", label: "Registered" },
  { id: "lastSeenAt", label: "Last activity" },
] as const;
type ColumnId = (typeof columns)[number]["id"];

function displayDate(value: string | null) {
  if (!value) return "Never";
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? "Unknown" : date.toLocaleString();
}

export function UsersTable({ items, onOpen }: {
  items: AdminUserSummary[];
  onOpen: (user: AdminUserSummary) => void;
}) {
  const [visible, setVisible] = useState<ColumnId[]>(columns.map((c) => c.id));
  return (
    <Stack spacing={1.25}>
      <FormControl size="small" sx={{ width: 180, alignSelf: "flex-end" }}>
        <InputLabel id="users-columns-label">Visible columns</InputLabel>
        <Select label="Visible columns" labelId="users-columns-label" multiple value={visible}
          renderValue={() => `${visible.length} columns`}
          onChange={(e) => setVisible(e.target.value as ColumnId[])}>
          {columns.map((column) => (
            <MenuItem key={column.id} value={column.id}>
              <Checkbox checked={visible.includes(column.id)} size="small"/>
              <ListItemText primary={column.label}/>
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3 }}>
        <Table size="small" aria-label="Registered LA Z listeners">
          <TableHead><TableRow sx={{ bgcolor: "action.hover" }}>
            <TableCell>Listener</TableCell>
            {visible.includes("email") && <TableCell>Email</TableCell>}
            {visible.includes("status") && <TableCell>Status</TableCell>}
            {visible.includes("devices") && <TableCell>Devices and FCM</TableCell>}
            {visible.includes("createdAt") && <TableCell>Registered</TableCell>}
            {visible.includes("lastSeenAt") && <TableCell>Last session</TableCell>}
            <TableCell align="right">Details</TableCell>
          </TableRow></TableHead>
          <TableBody>
            {items.map((user) => {
              const name = user.displayName || user.email || "Unnamed listener";
              const initials = name.split(/\s+/).slice(0, 2).map((word) => word[0]?.toUpperCase() ?? "").join("");
              return (
                <TableRow key={user.id} hover>
                  <TableCell sx={{ minWidth: 180 }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Avatar sx={{ width: 36, height: 36, bgcolor: "#2F0908", fontSize: 12 }}>{initials}</Avatar>
                      <Typography variant="body2" fontWeight={800}>{name}</Typography>
                    </Stack>
                  </TableCell>
                  {visible.includes("email") && <TableCell>{user.email ?? "—"}</TableCell>}
                  {visible.includes("status") && <TableCell>
                    <Stack spacing={0.5} alignItems="flex-start">
                      <Chip size="small" variant="outlined" color={user.emailVerified ? "success" : "default"}
                        label={user.emailVerified ? "Verified" : "Unverified"}/>
                      {!user.profileCompleted && <Typography variant="caption" color="text.secondary">Profile incomplete</Typography>}
                    </Stack>
                  </TableCell>}
                  {visible.includes("devices") && <TableCell>
                    <Box>{user.notificationStatus?.registeredDeviceCount ?? 0} registered</Box>
                    <Chip size="small" color={user.notificationStatus?.pushEligible ? "success" : "default"}
                      label={user.notificationStatus?.pushEligible ? "FCM ready" : "No push"} />
                  </TableCell>}
                  {visible.includes("createdAt") && <TableCell sx={{ whiteSpace: "nowrap" }}>{displayDate(user.createdAt)}</TableCell>}
                  {visible.includes("lastSeenAt") && <TableCell sx={{ whiteSpace: "nowrap" }}>{displayDate(user.lastSeenAt)}</TableCell>}
                  <TableCell align="right"><Button size="small" variant="outlined"
                    onClick={() => onOpen(user)}>View history</Button></TableCell>
                </TableRow>
              );
            })}
            {!items.length && <TableRow><TableCell colSpan={visible.length + 2} align="center" sx={{ py: 4 }}>
              No users match this filter.
            </TableCell></TableRow>}
          </TableBody>
        </Table>
      </TableContainer>
    </Stack>
  );
}
