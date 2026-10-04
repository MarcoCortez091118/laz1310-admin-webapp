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
import { useMemo } from "react";
import { useNotificationUsersQuery } from "./queries";
import type { NotificationAudience } from "./model";
import type { AdminUserSummary } from "./users";

function userLabel(user: AdminUserSummary): string {
  return user.displayName || user.email || user.id;
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
  const usersQuery = useNotificationUsersQuery(isAdmin && audience.type === "user");
  const users = useMemo(
    () => usersQuery.data?.pages.flatMap((page) => page.data.items) ?? [],
    [usersQuery.data],
  );
  const selected = audience.type === "user"
    ? users.find((user) => user.id === audience.userId) ?? null
    : null;

  if (audience.type !== "user") return null;

  if (!isAdmin) {
    return (
      <Alert severity="info">
        Specific-user targeting requires an administrator because recipient lookup exposes protected user metadata.
      </Alert>
    );
  }

  return (
    <Stack spacing={1.25}>
      <Autocomplete
        disabled={disabled}
        options={users}
        value={selected}
        loading={usersQuery.isLoading}
        getOptionLabel={userLabel}
        isOptionEqualToValue={(option, value) => option.id === value.id}
        onChange={(_event, user) => onChange({ type: "user", userId: user?.id ?? "" })}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Registered user"
            placeholder="Search loaded users by name or email"
            helperText="The campaign stores the LA Z internal User UUID; Firebase UID and push tokens are never exposed."
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  {usersQuery.isFetching ? <CircularProgress color="inherit" size={16} /> : null}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
          />
        )}
        renderOption={(props, user) => (
          <Box component="li" {...props} key={user.id}>
            <Box>
              <Typography variant="body2" fontWeight={700}>{userLabel(user)}</Typography>
              <Typography variant="caption" color="text.secondary">
                {user.email ?? "No email"} · {user.lastSeenAt ? `Last seen ${new Date(user.lastSeenAt).toLocaleString()}` : "No recent session"}
              </Typography>
            </Box>
          </Box>
        )}
      />

      {usersQuery.error ? (
        <Alert severity="error">
          The recipient directory is unavailable. Merge and deploy the LAZ API admin-user-directory change before using specific-user targeting.
        </Alert>
      ) : null}

      {usersQuery.hasNextPage ? (
        <Button
          size="small"
          variant="outlined"
          disabled={usersQuery.isFetchingNextPage || disabled}
          onClick={() => void usersQuery.fetchNextPage()}
        >
          {usersQuery.isFetchingNextPage ? "Loading more users…" : "Load more users"}
        </Button>
      ) : null}
    </Stack>
  );
}
