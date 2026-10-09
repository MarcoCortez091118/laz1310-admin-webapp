import {
  Alert,
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowUp,
  ExternalLink,
  Image as ImageIcon,
  Plus,
  Rocket,
  Save,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";

import type { Card, CardsBlock, Page, PageBlock } from "../../api/types";
import { ApiError } from "../../api/errors";
import { useStaff } from "../auth/StaffGate";
import {
  adminQueryKeys,
  deletePage,
  publishPage,
  putPage,
} from "../content/api";
import {
  useDraftQuery,
  usePagePublicationStatusQuery,
} from "../content/queries";
import { MediaPickerDialog } from "../media/MediaPickerDialog";

const BANNERS_PAGE_SLUG = "home-banners";
const BANNERS_PAGE_TITLE = "Home Banners";
const MAX_BANNERS = 20;

function newBanner(index: number): Card {
  return {
    title: `Banner ${index + 1}`,
    imageUrl: null,
    link: null,
  };
}

function externalLinkValue(card: Card): string {
  return card.link?.kind === "external" ? card.link.target : "";
}

function publicationLabel(
  status: "absent" | "draft" | "live" | "changes_pending" | undefined,
) {
  if (status === "live") return { label: "LIVE", color: "success" as const };
  if (status === "changes_pending") {
    return { label: "CHANGES PENDING", color: "warning" as const };
  }
  if (status === "draft") return { label: "DRAFT", color: "info" as const };
  return { label: "NOT PUBLISHED", color: "default" as const };
}

function BannerCardEditor({
  banner,
  index,
  count,
  onChange,
  onMove,
  onRemove,
}: {
  banner: Card;
  index: number;
  count: number;
  onChange: (next: Card) => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(Boolean(externalLinkValue(banner)));

  return (
    <Paper variant="outlined" sx={{ borderRadius: 3, overflow: "hidden" }}>
      <Stack spacing={1.75} sx={{ p: 2 }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems={{ sm: "center" }}
          spacing={1}
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip label={index + 1} color="primary" size="small" />
            <Box>
              <Typography fontWeight={800}>
                {banner.title || `Banner ${index + 1}`}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Home carousel · position {index + 1}
              </Typography>
            </Box>
          </Stack>

          <Stack direction="row" spacing={0.5}>
            <Button
              aria-label="Move banner up"
              disabled={index === 0}
              onClick={() => onMove(-1)}
              size="small"
            >
              <ArrowUp size={16} />
            </Button>
            <Button
              aria-label="Move banner down"
              disabled={index === count - 1}
              onClick={() => onMove(1)}
              size="small"
            >
              <ArrowDown size={16} />
            </Button>
            <Button
              color="error"
              onClick={onRemove}
              size="small"
              startIcon={<Trash2 size={15} />}
            >
              Remove
            </Button>
          </Stack>
        </Stack>

        <Box
          sx={{
            aspectRatio: "3 / 1",
            bgcolor: "#f8fafc",
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 2.5,
            display: "grid",
            overflow: "hidden",
            placeItems: "center",
            position: "relative",
          }}
        >
          {banner.imageUrl ? (
            <Box
              alt={banner.title || `Banner ${index + 1}`}
              component="img"
              referrerPolicy="no-referrer"
              src={banner.imageUrl}
              sx={{
                display: "block",
                height: "100%",
                objectFit: "cover",
                width: "100%",
              }}
            />
          ) : (
            <Stack alignItems="center" color="text.secondary" spacing={0.75}>
              <ImageIcon size={28} />
              <Typography variant="body2">Choose banner artwork</Typography>
            </Stack>
          )}

          <Button
            onClick={() => setPickerOpen(true)}
            size="small"
            sx={{
              bgcolor: "rgba(255,255,255,0.94)",
              position: "absolute",
              right: 12,
              top: 12,
              "&:hover": { bgcolor: "#fff" },
            }}
            variant="outlined"
          >
            {banner.imageUrl ? "Change image" : "Choose image"}
          </Button>
        </Box>

        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={1.5}
          alignItems={{ md: "flex-start" }}
        >
          <TextField
            fullWidth
            helperText="Internal/accessibility label; not rendered over the banner."
            label="Banner title"
            onChange={(event) =>
              onChange({ ...banner, title: event.target.value })
            }
            size="small"
            value={banner.title}
          />

          {!linkOpen ? (
            <Button
              onClick={() => setLinkOpen(true)}
              size="small"
              startIcon={<ExternalLink size={15} />}
              sx={{ minWidth: 140, mt: { md: 0.5 } }}
              variant="text"
            >
              Add link
            </Button>
          ) : (
            <TextField
              fullWidth
              helperText="Optional HTTPS destination."
              label="Destination URL"
              onChange={(event) => {
                const value = event.target.value.trim();
                onChange({
                  ...banner,
                  link: value
                    ? { kind: "external", target: value }
                    : null,
                });
              }}
              placeholder="https://..."
              size="small"
              type="url"
              value={externalLinkValue(banner)}
            />
          )}
        </Stack>

        <MediaPickerDialog
          currentUrl={banner.imageUrl}
          onClose={() => setPickerOpen(false)}
          onSelect={(asset) => {
            onChange({ ...banner, imageUrl: asset.url });
            setPickerOpen(false);
          }}
          open={pickerOpen}
          title="Choose banner artwork"
        />
      </Stack>
    </Paper>
  );
}

function BannersEditor({
  page,
  revision,
  etag,
}: {
  page: Page | null;
  revision: number;
  etag: string;
}) {
  const staff = useStaff();
  const admin = staff.roles.includes("admin");
  const queryClient = useQueryClient();
  const statusQuery = usePagePublicationStatusQuery(BANNERS_PAGE_SLUG);
  const existingBlock = useMemo(
    () =>
      page?.blocks?.find(
        (block: PageBlock): block is CardsBlock => block?.type === "cards",
      ) ?? null,
    [page],
  );
  const [blockId] = useState(
    () => existingBlock?.id ?? crypto.randomUUID(),
  );
  const initialItems = existingBlock?.items ?? [];
  const [items, setItems] = useState<Card[]>(() => initialItems);
  const dirty =
    JSON.stringify(items) !== JSON.stringify(initialItems);

  const save = useMutation({
    mutationFn: async () => {
      if (!items.length) {
        if (!page) return null;
        return deletePage(BANNERS_PAGE_SLUG, etag);
      }

      for (const [index, item] of items.entries()) {
        if (!item.title.trim()) {
          throw new Error(`Banner ${index + 1} requires a title.`);
        }
        if (!item.imageUrl?.trim()) {
          throw new Error(`Banner ${index + 1} requires artwork.`);
        }
        if (
          item.link?.kind === "external" &&
          !item.link.target.startsWith("https://")
        ) {
          throw new Error(
            `Banner ${index + 1} destination must start with https://.`,
          );
        }
      }

      const block: CardsBlock = {
        id: blockId,
        type: "cards",
        items,
      };
      return putPage(
        {
          slug: BANNERS_PAGE_SLUG,
          title: BANNERS_PAGE_TITLE,
          blocks: [block],
        },
        etag,
      );
    },
    onSuccess: (result) => {
      if (result) {
        queryClient.setQueryData(adminQueryKeys.draft, result);
      } else {
        void queryClient.invalidateQueries({ queryKey: adminQueryKeys.draft });
      }
      void queryClient.invalidateQueries({
        queryKey: adminQueryKeys.pageStatus(BANNERS_PAGE_SLUG),
      });
      void queryClient.invalidateQueries({ queryKey: adminQueryKeys.preview });
    },
  });

  const publish = useMutation({
    mutationFn: () =>
      publishPage(
        BANNERS_PAGE_SLUG,
        items.length
          ? "Publish Home banners"
          : "Remove Home banners from Mobile",
        etag,
      ),
    onSuccess: (result) => {
      queryClient.setQueryData(adminQueryKeys.publicState, result);
      void queryClient.invalidateQueries({
        queryKey: adminQueryKeys.pageStatus(BANNERS_PAGE_SLUG),
      });
      void queryClient.invalidateQueries({ queryKey: adminQueryKeys.releases });
    },
  });

  function updateBanner(index: number, next: Card) {
    setItems((current) =>
      current.map((item, currentIndex) =>
        currentIndex === index ? next : item,
      ),
    );
  }

  function moveBanner(index: number, direction: -1 | 1) {
    setItems((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      const [moved] = next.splice(index, 1);
      if (!moved) return current;
      next.splice(target, 0, moved);
      return next;
    });
  }

  const error = save.error ?? publish.error ?? statusQuery.error;
  const conflict = error instanceof ApiError && error.kind === "conflict";
  const status = statusQuery.data?.data.status;
  const publication = publicationLabel(status);
  const canPublish =
    admin &&
    !dirty &&
    !save.isPending &&
    !publish.isPending &&
    (status === "draft" || status === "changes_pending");

  return (
    <Stack spacing={2.25}>
      <Paper variant="outlined" sx={{ borderRadius: 3, p: 2 }}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          alignItems={{ md: "center" }}
          justifyContent="space-between"
          spacing={1.5}
        >
          <Stack direction="row" alignItems="center" spacing={1}>
            <Chip
              color={dirty ? "warning" : publication.color}
              label={dirty ? "UNSAVED CHANGES" : publication.label}
              size="small"
            />
            <Typography color="text.secondary" variant="body2">
              Draft #{revision}
              {statusQuery.data?.data.releaseId
                ? ` · Release ${statusQuery.data.data.releaseId.slice(0, 8)}`
                : ""}
            </Typography>
          </Stack>
          <Typography color="text.secondary" variant="body2">
            Home · below navigation chips · 3:1 artwork
          </Typography>
        </Stack>
      </Paper>

      {error ? (
        <Alert severity={conflict ? "warning" : "error"}>
          {error instanceof Error ? error.message : "Unable to update Banners."}
        </Alert>
      ) : null}

      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ sm: "center" }}
        spacing={1.5}
      >
        <Box>
          <Typography variant="h6" fontWeight={800}>
            {items.length} {items.length === 1 ? "banner" : "banners"}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Drag-free ordering: use the arrows. Mobile uses this exact order.
          </Typography>
        </Box>
        <Button
          disabled={items.length >= MAX_BANNERS}
          onClick={() =>
            setItems((current) => [...current, newBanner(current.length)])
          }
          startIcon={<Plus size={16} />}
          variant="contained"
        >
          Add banner
        </Button>
      </Stack>

      {items.length ? (
        <Stack spacing={1.5}>
          {items.map((banner, index) => (
            <BannerCardEditor
              banner={banner}
              count={items.length}
              index={index}
              key={index}
              onChange={(next) => updateBanner(index, next)}
              onMove={(direction) => moveBanner(index, direction)}
              onRemove={() =>
                setItems((current) =>
                  current.filter((_, currentIndex) => currentIndex !== index),
                )
              }
            />
          ))}
        </Stack>
      ) : (
        <Paper
          variant="outlined"
          sx={{
            borderRadius: 3,
            minHeight: 180,
            display: "grid",
            placeItems: "center",
            p: 3,
          }}
        >
          <Stack spacing={1} alignItems="center" color="text.secondary">
            <ImageIcon size={32} />
            <Typography fontWeight={800}>No banners in Draft</Typography>
            <Typography variant="body2" textAlign="center">
              Save this state, then Publish banners to remove any currently
              live carousel from Mobile.
            </Typography>
          </Stack>
        </Paper>
      )}

      <Paper
        elevation={3}
        sx={{
          position: "sticky",
          bottom: 16,
          borderRadius: 3,
          p: 1.5,
          bgcolor: "rgba(255,255,255,0.97)",
          backdropFilter: "blur(12px)",
          zIndex: 4,
        }}
      >
        <Stack
          direction={{ xs: "column", md: "row" }}
          alignItems={{ md: "center" }}
          justifyContent="space-between"
          spacing={1.5}
        >
          <Box>
            <Typography fontWeight={800} variant="body2">
              {dirty
                ? "Save the Draft before publishing."
                : status === "live"
                  ? "Banners are live in Mobile."
                  : status === "changes_pending" || status === "draft"
                    ? "Saved changes are ready to publish."
                    : "Nothing is currently published."}
            </Typography>
            <Typography color="text.secondary" variant="caption">
              Publishing Banners updates only this Home carousel; unrelated
              Draft changes stay unpublished.
            </Typography>
          </Box>

          <Stack direction="row" spacing={1}>
            <Button
              disabled={!dirty || save.isPending || publish.isPending}
              onClick={() => save.mutate()}
              startIcon={<Save size={16} />}
              variant="outlined"
            >
              {save.isPending ? "Saving…" : "Save draft"}
            </Button>
            <Button
              disabled={!canPublish}
              onClick={() => publish.mutate()}
              startIcon={<Rocket size={16} />}
              variant="contained"
            >
              {publish.isPending ? "Publishing…" : "Publish banners"}
            </Button>
          </Stack>
        </Stack>

        {!admin ? (
          <Typography color="text.secondary" variant="caption" sx={{ mt: 1, display: "block" }}>
            Editors can prepare and save banners; an Administrator is required to publish them.
          </Typography>
        ) : null}
      </Paper>
    </Stack>
  );
}

export function BannersPage() {
  const draft = useDraftQuery();

  if (draft.isPending) {
    return (
      <section className="page-stack">
        <div className="panel">Loading Banners…</div>
      </section>
    );
  }

  if (draft.error || !draft.data) {
    return (
      <section className="page-stack">
        <article className="panel">
          <p className="eyebrow">Content</p>
          <h1>Unable to load Banners.</h1>
          <p className="muted">
            {draft.error instanceof Error
              ? draft.error.message
              : "Admin API unavailable."}
          </p>
        </article>
      </section>
    );
  }

  const etag = draft.data.etag;
  if (!etag) {
    return (
      <section className="page-stack">
        <article className="panel">
          <h1>Draft ETag missing</h1>
          <p className="muted">
            Banner writes are disabled because optimistic concurrency cannot be
            enforced safely.
          </p>
        </article>
      </section>
    );
  }

  const page =
    draft.data.data.catalog?.pages?.find(
      (item: Page) => item.slug === BANNERS_PAGE_SLUG,
    ) ?? null;

  return (
    <section className="page-stack">
      <header className="page-heading split-heading">
        <div>
          <p className="eyebrow">
            Content / Draft #{draft.data.data.revision ?? "—"}
          </p>
          <h1>Banners</h1>
          <p className="muted">
            Promotional artwork shown on Home immediately below the module
            navigation chips.
          </p>
        </div>
      </header>

      <BannersEditor
        etag={etag}
        key={`${draft.data.data.revision ?? 0}-${page ? "existing" : "new"}`}
        page={page}
        revision={draft.data.data.revision ?? 0}
      />
    </section>
  );
}
