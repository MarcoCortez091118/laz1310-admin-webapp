import {
  Alert,
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useMemo, useState } from "react";
import { ApiError } from "../../api/errors";
import {
  useNotificationUserByIdQuery,
  useNotificationUserEmailQuery,
  useNotificationUsersQuery,
} from "./queries";
import type { NotificationAudience } from "./model";
import type { AdminUserSummary } from "./users";

function userLabel(user: AdminUserSummary): string {
  return user.displayName || user.email || user.id;
}

function directoryErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.kind) {
      case "forbidden":
        return "Your account is not authorized to read the protected recipient directory.";
      case "unauthenticated":
      case "app-check":
        return "Recipient lookup could not authenticate this Admin session. Refresh the session and retry.";
      case "rate-limited":
        return `Recipient lookup is temporarily rate limited.${error.retryAfterSeconds ? ` Retry in about ${error.retryAfterSeconds}s.` : ""}`;
      case "unavailable":
        return "The LA Z API recipient directory is temporarily unavailable.";
      default:
        return error.message || `Recipient lookup failed with HTTP ${error.status}.`;
    }
  }
  return error instanceof Error ? error.message : "Unable to load registered users.";
}

function uniqueUsers(...groups: AdminUserSummary[][]): AdminUserSummary[] {
  const users = new Map<string, AdminUserSummary>();
  groups.flat().forEach((user) => users.set(user.id, user));
  return [...users.values()];
}

export function RecipientSelector({
  audience,
  disabled,
  isAdmin,
  onChange,
}: {
  audience: NotificationAudience;
  disabled?: boolean;
  isAdmin: boolean;
  onChange: (audience: NotificationAudience) => void;
}) {
  const [inputValue, setInputValue] = useState("");
  const enabled = isAdmin && audience.type === "user";
  const usersQuery = useNotificationUsersQuery(enabled);
  const emailQuery = useNotificationUserEmailQuery(inputValue, enabled);
  const idQuery = useNotificationUserByIdQuery(
    audience.type === "user" ? audience.userId : "",
    enabled && audience.type === "user" && Boolean(audience.userId),
  );

  const users = useMemo(() => {
    const paged = usersQuery.data?.pages.flatMap((page) => page.data.items) ?? [];
    const emailMatches = emailQuery.data?.data.items ?? [];
    const selectedMatches = idQuery.data?.data.items ?? [];
    return uniqueUsers(paged, emailMatches, selectedMatches);
  }, [emailQuery.data, idQuery.data, usersQuery.data]);

  const selected = audience.type === "user"
    ? users.find((user) => user.id === audience.userId) ?? null
    : null;
  const directoryError = usersQuery.error ?? idQuery.error;
  const loading = usersQuery.isLoading || emailQuery.isFetching || idQuery.isFetching;

  if (audience.type !== "user") return null;

  if (!isAdmin) {
    return (
      <Alert severity="info">
        Specific-user targeting requires an administrator because recipient lookup exposes protected user metadata.
      </Alert>
    );
  }

  return (
    <Stack spacing={1.25} minWidth={0}>
      <Autocomplete
        disabled={disabled}
        options={users}
        value={selected}
        inputValue={inputValue}
        loading={loading}
        getOptionLabel={userLabel}
        isOptionEqualToValue={(option, value) => option.id === value.id}
        filterOptions={(options, state) => {
          const needle = state.inputValue.trim().toLowerCase();
          if (!needle) return options;
          return options.filter((user) =>
            [user.displayName, user.email, user.id]
              .filter(Boolean)
              .some((value) => String(value).toLowerCase().includes(needle)),
          );
        }}
        onInputChange={(_event, value, reason) => {
          if (reason !== "reset") setInputValue(value);
        }}
        onChange={(_event, user) => {
          onChange({ type: "user", userId: user?.id ?? "" });
          if (user) setInputValue(userLabel(user));
        }}
        noOptionsText={loading ? "Loading registered users…" : "No registered user matches this search"}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Registered user"
            placeholder="Name or exact email address"
            helperText="Choose an LA Z account. The internal User UUID is stored automatically; Firebase UID and push tokens stay private."
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  {loading ? <CircularProgress color="inherit" size={16} /> : null}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
          />
        )}
        renderOption={(props, user) => (
          <Box component="li" {...props} key={user.id} sx={{ minWidth: 0 }}>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" fontWeight={700} noWrap>{userLabel(user)}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", overflowWrap: "anywhere" }}>
                {user.email ?? "No email"} · {user.lastSeenAt ? `Last seen ${new Date(user.lastSeenAt).toLocaleString()}` : "No recent session"}
              </Typography>
            </Box>
          </Box>
        )}
      />

      {directoryError ? (
        <Alert
          severity="error"
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() => {
                void usersQuery.refetch();
                if (audience.userId) void idQuery.refetch();
              }}
            >
              Retry
            </Button>
          }
        >
          {directoryErrorMessage(directoryError)}
          {directoryError instanceof ApiError && directoryError.requestId ? ` Request ID: ${directoryError.requestId}` : ""}
        </Alert>
      ) : null}

      {!usersQuery.isLoading && !directoryError && users.length === 0 ? (
        <Alert severity="info">
          No registered LA Z users are currently available in this API environment. A user appears here after creating a business session in the mobile app.
        </Alert>
      ) : null}

      {usersQuery.hasNextPage ? (
        <Button
          size="small"
          variant="outlined"
          disabled={usersQuery.isFetchingNextPage || disabled}
          onClick={() => void usersQuery.fetchNextPage()}
        >
          {usersQuery.isFetchingNextPage ? "Loading more users…" : "Load more registered users"}
        </Button>
      ) : null}
    </Stack>
  );
}
