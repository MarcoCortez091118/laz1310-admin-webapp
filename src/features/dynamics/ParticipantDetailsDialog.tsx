import {
  Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Divider,
  Stack, Typography,
} from "@mui/material";
import { ShieldCheck } from "lucide-react";
import type { AccountParticipation } from "./participantTypes";

function dateTime(value: string | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unknown" : date.toLocaleString();
}

/** PII remains visible only after an explicit admin-only row selection. */
export function ParticipantDetailsDialog({ item, onClose }: {
  item: AccountParticipation | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={Boolean(item)} onClose={onClose} maxWidth="sm" fullWidth
      aria-labelledby="participant-detail-title"
      slotProps={{ paper: { sx: { borderRadius: 3, maxHeight: "90vh" } } }}>
      <DialogTitle id="participant-detail-title">Participation details</DialogTitle>
      <DialogContent dividers>
        {!item ? null : <Stack spacing={2}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip size="small" color="success" label="Accepted" />
            <Typography variant="body2" color="text.secondary">{dateTime(item.submittedAt)}</Typography>
          </Stack>
          <Box>
            <Typography fontWeight={800}>{item.account?.displayName || (item.authenticated ? "Authenticated listener" : "Anonymous participant")}</Typography>
            <Typography variant="body2" color="text.secondary">{item.account?.email ?? "Account email unavailable"}</Typography>
            {item.account?.userId ? (
              <Button component="a" href={`/users?userId=${encodeURIComponent(item.account.userId)}`}
                variant="outlined" size="small" sx={{ mt: 1 }}>
                Open registered user history
              </Button>
            ) : <Typography variant="caption" color="text.secondary">No linked LA Z account</Typography>}
          </Box>
          <Divider/>
          <Typography fontWeight={800}>Submitted answers</Typography>
          {Object.entries(item.values ?? {}).length ? Object.entries(item.values ?? {}).map(([key, value]) => (
            <Box key={key} sx={{ overflowWrap: "anywhere" }}>
              <Typography variant="caption" color="text.secondary">{key}</Typography>
              <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>{String(value)}</Typography>
            </Box>
          )) : <Typography variant="body2" color="text.secondary">No additional answers recorded.</Typography>}
          <Divider/>
          <Stack direction="row" spacing={1}><ShieldCheck size={17}/>
            <Typography fontWeight={800}>Consent and release evidence</Typography>
          </Stack>
          <Typography variant="body2">Consent v{item.consent?.version ?? "—"} · accepted {dateTime(item.consent?.acceptedAt)}</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ overflowWrap: "anywhere" }}>
            Participation: {item.id}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ overflowWrap: "anywhere" }}>
            Presented release: {item.releaseId}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ overflowWrap: "anywhere" }}>
            Accepted release: {item.acceptedReleaseId}
          </Typography>
        </Stack>}
      </DialogContent>
      <DialogActions sx={{ p: 2 }}><Button onClick={onClose}>Close</Button></DialogActions>
    </Dialog>
  );
}
