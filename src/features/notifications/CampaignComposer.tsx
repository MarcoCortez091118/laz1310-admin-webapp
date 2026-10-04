import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  Select,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Send } from "lucide-react";
import { useState } from "react";
import { ApiError } from "../../api/errors";
import {
  createNotificationCampaign,
  notificationsQueryKeys,
  replaceNotificationCampaign,
  sendNotificationCampaign,
} from "./api";
import {
  CATEGORIES,
  campaignToInput,
  contentBytes,
  defaultCampaignInput,
  statusLabel,
  validateCampaignInput,
  type CampaignInput,
  type NotificationCampaign,
} from "./model";
import { RecipientSelector } from "./RecipientSelector";

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.kind === "conflict") return "This draft changed or is no longer editable. Reload before continuing.";
    if (error.kind === "rate-limited") {
      return `Notification quota exceeded.${error.retryAfterSeconds ? ` Retry in about ${error.retryAfterSeconds}s.` : ""}`;
    }
    if (error.kind === "unavailable") return "Notification sending is currently disabled or unavailable in the API environment.";
    return error.message;
  }
  return error instanceof Error ? error.message : "Unexpected notification error.";
}

export function CampaignComposer({
  campaign,
  etag,
  isAdmin,
  onSaved,
  onReload,
}: {
  campaign: NotificationCampaign | null;
  etag?: string;
  isAdmin: boolean;
  onSaved: (id: string) => void;
  onReload: () => void;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<CampaignInput>(() => campaign ? campaignToInput(campaign) : defaultCampaignInput());
  const [clientError, setClientError] = useState<string | null>(null);
  const [confirmSend, setConfirmSend] = useState(false);
  const mutable = !campaign || campaign.status === "draft";
  const dynamicId = form.target.value.startsWith("/dynamics/") ? form.target.value.slice(10) : "";
  const destination = dynamicId ? "dynamic_detail" : form.target.value;

  const save = useMutation({
    mutationFn: async () => {
      const issue = validateCampaignInput(form);
      if (issue) throw new Error(issue);
      if (!campaign) return createNotificationCampaign(form);
      if (!etag) throw new Error("Campaign ETag unavailable. Reload this draft before editing.");
      return replaceNotificationCampaign(campaign.id, form, etag);
    },
    onSuccess: async (result) => {
      queryClient.setQueryData(notificationsQueryKeys.detail(result.data.id), result);
      await queryClient.invalidateQueries({ queryKey: notificationsQueryKeys.list });
      onSaved(result.data.id);
    },
  });

  const send = useMutation({
    mutationFn: async () => {
      if (!campaign) throw new Error("Save the notification draft before sending it.");
      return sendNotificationCampaign(campaign.id);
    },
    onSuccess: async (result) => {
      queryClient.setQueryData(notificationsQueryKeys.detail(result.data.id), result);
      await queryClient.invalidateQueries({ queryKey: notificationsQueryKeys.list });
      setConfirmSend(false);
    },
  });

  function update(patch: Partial<CampaignInput>) {
    setForm((current) => ({ ...current, ...patch }));
    setClientError(null);
    save.reset();
  }

  const error = clientError ?? (save.error ? errorMessage(save.error) : null) ?? (send.error ? errorMessage(send.error) : null);
  const pending = save.isPending || send.isPending;
  const hasInboxWithoutPushDevice = Boolean(
    campaign
      && campaign.status !== "draft"
      && campaign.inboxCount > 0
      && campaign.targetedCount === 0,
  );

  return (
    <Stack spacing={2} minWidth={0}>
      <Paper variant="outlined" sx={{ borderRadius: 3, overflow: "hidden", minWidth: 0 }}>
        <Box sx={{ p: { xs: 2, sm: 2.5 }, minWidth: 0 }}>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2} minWidth={0}>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="overline" color="primary.main" fontWeight={800}>
                {campaign ? "Campaign detail" : "New notification"}
              </Typography>
              <Typography variant="h5" fontWeight={850} sx={{ overflowWrap: "anywhere" }}>{campaign?.title || "Compose notification"}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: .5 }}>
                {mutable ? "Drafts remain editable until an administrator queues the send." : "This campaign is immutable because dispatch has started."}
              </Typography>
            </Box>
            {campaign ? <Chip label={`${statusLabel(campaign.status)} · rev ${campaign.revision}`} size="small" variant="outlined" sx={{ alignSelf: "flex-start", flexShrink: 0 }} /> : null}
          </Stack>
        </Box>
        <Divider />

        <Box
          component="form"
          onSubmit={(event) => {
            event.preventDefault();
            const issue = validateCampaignInput(form);
            setClientError(issue);
            if (!issue) save.mutate();
          }}
          sx={{ p: { xs: 2, sm: 2.5 }, minWidth: 0 }}
        >
          <Stack spacing={2.25} minWidth={0}>
            {error ? (
              <Alert
                severity="error"
                action={save.error instanceof ApiError && save.error.kind === "conflict" ? <Button color="inherit" onClick={onReload}>Reload</Button> : undefined}
              >
                {error}
              </Alert>
            ) : null}

            {hasInboxWithoutPushDevice ? (
              <Alert severity={campaign?.status === "sending" || campaign?.status === "queued" ? "info" : "warning"}>
                This campaign created an in-app Inbox item, but no eligible FCM device has been targeted yet. The mobile app must register a native FCM token with notifications enabled before a system push can be delivered.
              </Alert>
            ) : null}

            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "minmax(0,1fr) 220px" }, gap: 2, minWidth: 0 }}>
              <TextField
                disabled={!mutable || pending}
                label="Title"
                required
                value={form.title}
                inputProps={{ maxLength: 120 }}
                helperText={`${form.title.length}/120`}
                onChange={(event) => update({ title: event.target.value })}
              />
              <FormControl disabled={!mutable || pending}>
                <InputLabel>Category</InputLabel>
                <Select
                  label="Category"
                  value={form.category}
                  onChange={(event) => update({ category: event.target.value as CampaignInput["category"] })}
                >
                  {CATEGORIES.map((category) => <MenuItem key={category.value} value={category.value}>{category.label}</MenuItem>)}
                </Select>
              </FormControl>
            </Box>

            <TextField
              disabled={!mutable || pending}
              label="Message"
              required
              multiline
              minRows={4}
              value={form.body}
              inputProps={{ maxLength: 1000 }}
              helperText={`${form.body.length}/1000 · ${contentBytes(form)}/2500 UTF-8 content bytes`}
              onChange={(event) => update({ body: event.target.value })}
            />

            <Paper variant="outlined" sx={{ borderRadius: 2.5, p: { xs: 1.5, sm: 2 }, minWidth: 0 }}>
              <Stack spacing={1.5} minWidth={0}>
                <Box>
                  <Typography fontWeight={800}>In-app destination</Typography>
                  <Typography variant="body2" color="text.secondary">Only allowlisted Notifications V1 routes can be sent.</Typography>
                </Box>
                <ToggleButtonGroup
                  exclusive
                  disabled={!mutable || pending}
                  size="small"
                  value={destination}
                  onChange={(_event, value: string | null) => {
                    if (!value) return;
                    update({ target: { kind: "route", value: value === "dynamic_detail" ? `/dynamics/${dynamicId}` : value } });
                  }}
                  sx={{ flexWrap: "wrap", gap: .5, "& .MuiToggleButtonGroup-grouped": { flex: "1 1 130px", border: "1px solid !important", borderColor: "divider !important", borderRadius: "8px !important", m: 0 } }}
                >
                  <ToggleButton value="/home">Home</ToggleButton>
                  <ToggleButton value="/radio">Radio / Programs</ToggleButton>
                  <ToggleButton value="/dynamics">Dynamics</ToggleButton>
                  <ToggleButton value="dynamic_detail">Dynamic detail</ToggleButton>
                </ToggleButtonGroup>
                {destination === "dynamic_detail" ? (
                  <TextField
                    disabled={!mutable || pending}
                    label="Dynamic UUID"
                    value={dynamicId}
                    placeholder="88a17268-ce3e-42ea-bf3c-5c8eed7d1d6f"
                    helperText="Use the UUID of a published Dynamic. The backend rejects any route outside the closed allowlist."
                    onChange={(event) => update({ target: { kind: "route", value: `/dynamics/${event.target.value.trim().toLowerCase()}` } })}
                  />
                ) : null}
              </Stack>
            </Paper>

            <Paper variant="outlined" sx={{ borderRadius: 2.5, p: { xs: 1.5, sm: 2 }, minWidth: 0 }}>
              <Stack spacing={1.5} minWidth={0}>
                <Box>
                  <Typography fontWeight={800}>Audience</Typography>
                  <Typography variant="body2" color="text.secondary">Category preferences and device notification permission are enforced again by the backend before delivery.</Typography>
                </Box>
                <RadioGroup
                  value={form.audience.type}
                  onChange={(event) => update({ audience: event.target.value === "user" ? { type: "user", userId: "" } : { type: "all_opted_in" } })}
                >
                  <FormControlLabel disabled={!mutable || pending} value="all_opted_in" control={<Radio />} label="All users opted in to this category" />
                  <FormControlLabel disabled={!mutable || pending || !isAdmin} value="user" control={<Radio />} label="One registered user" />
                </RadioGroup>
                <RecipientSelector
                  audience={form.audience}
                  disabled={!mutable || pending}
                  isAdmin={isAdmin}
                  onChange={(audience) => update({ audience })}
                />
              </Stack>
            </Paper>

            {campaign ? (
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(3,minmax(0,1fr))" }, gap: 1.5 }}>
                <Box><Typography variant="caption" color="text.secondary">Created</Typography><Typography variant="body2" fontWeight={700}>{new Date(campaign.createdAt).toLocaleString()}</Typography></Box>
                <Box><Typography variant="caption" color="text.secondary">Queued</Typography><Typography variant="body2" fontWeight={700}>{campaign.queuedAt ? new Date(campaign.queuedAt).toLocaleString() : "—"}</Typography></Box>
                <Box><Typography variant="caption" color="text.secondary">Finished</Typography><Typography variant="body2" fontWeight={700}>{campaign.sentAt ? new Date(campaign.sentAt).toLocaleString() : "—"}</Typography></Box>
              </Box>
            ) : null}

            <Divider />
            <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "stretch", sm: "center" }} spacing={1.5} minWidth={0}>
              <Typography variant="caption" color="text.secondary" sx={{ overflowWrap: "anywhere" }}>
                {campaign ? `Campaign ${campaign.id}` : "Creating a campaign stores a draft only; it does not contact FCM."}
              </Typography>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1} flexShrink={0}>
                {campaign?.status === "draft" ? (
                  <Button
                    color="error"
                    disabled={!isAdmin || pending}
                    onClick={() => setConfirmSend(true)}
                    startIcon={<Send size={16} />}
                    variant="outlined"
                  >
                    {isAdmin ? "Queue send" : "Admin required"}
                  </Button>
                ) : null}
                {mutable ? <Button disabled={pending} type="submit" variant="contained">{save.isPending ? "Saving…" : campaign ? "Save draft" : "Create draft"}</Button> : null}
              </Stack>
            </Stack>
          </Stack>
        </Box>
      </Paper>

      {campaign && campaign.status !== "draft" ? (
        <Paper variant="outlined" sx={{ borderRadius: 3, p: 2.25, minWidth: 0 }}>
          <Stack spacing={1.5} minWidth={0}>
            <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1}>
              <Typography fontWeight={800}>Delivery results</Typography>
              <Chip label={statusLabel(campaign.status)} size="small" sx={{ alignSelf: "flex-start" }} />
            </Stack>
            <Box className="notifications-delivery-grid">
              {[
                ["Targeted", campaign.targetedCount],
                ["Accepted", campaign.successCount],
                ["Failed", campaign.failureCount],
                ["Skipped", campaign.skippedCount],
                ["Inbox", campaign.inboxCount],
              ].map(([label, value]) => <Box key={label} sx={{ bgcolor: "#f8fafc", borderRadius: 2, p: 1.25, minWidth: 0 }}><Typography variant="caption" color="text.secondary">{label}</Typography><Typography variant="h6" fontWeight={800}>{value}</Typography></Box>)}
            </Box>
            <Typography variant="caption" color="text.secondary">Accepted means FCM accepted the message; it does not prove the user viewed it. Inbox counts users, not devices.</Typography>
          </Stack>
        </Paper>
      ) : null}

      <Dialog open={confirmSend} onClose={() => !send.isPending && setConfirmSend(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Queue this notification?</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>This transition is irreversible. Once queued, the campaign becomes immutable and the outbox worker owns delivery.</Alert>
          <Typography fontWeight={800}>{form.title}</Typography>
          <Typography variant="body2" sx={{ mt: .75 }}>{form.body}</Typography>
        </DialogContent>
        <DialogActions>
          <Button disabled={send.isPending} onClick={() => setConfirmSend(false)}>Cancel</Button>
          <Button color="error" disabled={send.isPending} onClick={() => send.mutate()} variant="contained" startIcon={<Send size={16} />}>{send.isPending ? "Queueing…" : "Queue send"}</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
