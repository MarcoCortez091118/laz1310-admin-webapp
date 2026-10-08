import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowUp,
  Image as ImageIcon,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";

import type { Card, CardsBlock, Page } from "../../api/types";
import { ApiError } from "../../api/errors";
import {
  adminQueryKeys,
  deletePage,
  putPage,
} from "../content/api";
import { useDraftQuery } from "../content/queries";
import { ManagedImageField } from "../media/ManagedImageField";

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

function BannersEditor({
  page,
  revision,
  etag,
}: {
  page: Page | null;
  revision: number;
  etag: string;
}) {
  const queryClient = useQueryClient();
  const existingBlock = useMemo(
    () =>
      page?.blocks?.find(
        (block): block is CardsBlock => block.type === "cards",
      ) ?? null,
    [page],
  );
  const [blockId] = useState(
    () => existingBlock?.id ?? crypto.randomUUID(),
  );
  const [items, setItems] = useState<Card[]>(
    () => existingBlock?.items ?? [],
  );

  const save = useMutation({
    mutationFn: async () => {
      if (!items.length) {
        if (!page) return null;
        return deletePage(BANNERS_PAGE_SLUG, etag);
      }

      for (const [index, item] of items.entries()) {
        if (!item.title.trim()) {
          throw new Error(`Banner ${index + 1} requires an internal title.`);
        }
        if (!item.imageUrl?.trim()) {
          throw new Error(`Banner ${index + 1} requires an image.`);
        }
        if (
          item.link?.kind === "external" &&
          !item.link.target.startsWith("https://")
        ) {
          throw new Error(
            `Banner ${index + 1} external link must start with https://.`,
          );
        }
      }

      const block: CardsBlock = {
        id: blockId,
        type: "cards",
        items,
      };
      const payload: Page = {
        slug: BANNERS_PAGE_SLUG,
        title: BANNERS_PAGE_TITLE,
        blocks: [block],
      };

      return putPage(payload, etag);
    },
    onSuccess: (result) => {
      if (result) {
        queryClient.setQueryData(adminQueryKeys.draft, result);
      } else {
        void queryClient.invalidateQueries({ queryKey: adminQueryKeys.draft });
      }
      void queryClient.invalidateQueries({ queryKey: adminQueryKeys.preview });
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

  const error = save.error;
  const conflict = error instanceof ApiError && error.kind === "conflict";

  return (
    <Stack spacing={2.5}>
      <Alert severity="info">
        <strong>Draft-only until Publish.</strong> Mobile reads the immutable
        published release. Saving here updates only Draft #{revision}.
      </Alert>

      {error ? (
        <Alert severity={conflict ? "warning" : "error"}>
          {error instanceof Error ? error.message : "Unable to save banners."}
        </Alert>
      ) : null}

      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Box>
          <Typography variant="h6" fontWeight={800}>
            {items.length} {items.length === 1 ? "banner" : "banners"}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Order here is the order used by the Home carousel.
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
        <Stack spacing={2}>
          {items.map((banner, index) => (
            <Paper
              key={`${index}-${banner.title}`}
              variant="outlined"
              sx={{ borderRadius: 3, overflow: "hidden" }}
            >
              <Stack spacing={2} sx={{ p: 2 }}>
                <Stack
                  direction={{ xs: "column", md: "row" }}
                  justifyContent="space-between"
                  spacing={1.5}
                >
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip label={index + 1} color="primary" size="small" />
                    <Typography fontWeight={800}>
                      {banner.title || `Banner ${index + 1}`}
                    </Typography>
                  </Stack>
                  <Stack direction="row" spacing={0.75}>
                    <Button
                      disabled={index === 0}
                      onClick={() => moveBanner(index, -1)}
                      size="small"
                      startIcon={<ArrowUp size={15} />}
                    >
                      Up
                    </Button>
                    <Button
                      disabled={index === items.length - 1}
                      onClick={() => moveBanner(index, 1)}
                      size="small"
                      startIcon={<ArrowDown size={15} />}
                    >
                      Down
                    </Button>
                    <Button
                      color="error"
                      onClick={() =>
                        setItems((current) =>
                          current.filter((_, currentIndex) => currentIndex !== index),
                        )
                      }
                      size="small"
                      startIcon={<Trash2 size={15} />}
                    >
                      Remove
                    </Button>
                  </Stack>
                </Stack>

                <TextField
                  helperText="Internal/accessibility label. This text is not rendered over the artwork in Mobile."
                  label="Banner title"
                  onChange={(event) =>
                    updateBanner(index, {
                      ...banner,
                      title: event.target.value,
                    })
                  }
                  value={banner.title}
                />

                <ManagedImageField
                  description="Use a horizontal banner artwork. Mobile renders it at approximately 3:1 on Home."
                  label="Banner artwork"
                  onChange={(imageUrl) =>
                    updateBanner(index, { ...banner, imageUrl })
                  }
                  pickerTitle="Choose banner artwork"
                  required
                  value={banner.imageUrl}
                />

                {banner.imageUrl ? (
                  <Box
                    component="img"
                    src={banner.imageUrl}
                    alt={banner.title}
                    referrerPolicy="no-referrer"
                    sx={{
                      aspectRatio: "3 / 1",
                      borderRadius: 2,
                      display: "block",
                      objectFit: "cover",
                      width: "100%",
                    }}
                  />
                ) : null}

                <Divider />

                <TextField
                  helperText="Optional. Leave empty for a non-clickable banner. Only HTTPS links are enabled in Banners V1."
                  label="Destination URL"
                  onChange={(event) => {
                    const value = event.target.value.trim();
                    updateBanner(index, {
                      ...banner,
                      link: value
                        ? { kind: "external", target: value }
                        : null,
                    });
                  }}
                  placeholder="https://..."
                  type="url"
                  value={externalLinkValue(banner)}
                />
              </Stack>
            </Paper>
          ))}
        </Stack>
      ) : (
        <Paper
          variant="outlined"
          sx={{
            borderRadius: 3,
            minHeight: 220,
            display: "grid",
            placeItems: "center",
            p: 3,
          }}
        >
          <Stack spacing={1} alignItems="center" color="text.secondary">
            <ImageIcon size={34} />
            <Typography fontWeight={800}>No Home banners in Draft</Typography>
            <Typography variant="body2" textAlign="center">
              Add the first banner. If the published release has no banners,
              Mobile simply omits the carousel.
            </Typography>
          </Stack>
        </Paper>
      )}

      <Paper
        elevation={0}
        sx={{
          position: "sticky",
          bottom: 16,
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 3,
          p: 1.5,
          bgcolor: "rgba(255,255,255,0.96)",
          backdropFilter: "blur(10px)",
          zIndex: 2,
        }}
      >
        <Stack
          direction={{ xs: "column", sm: "row" }}
          alignItems={{ sm: "center" }}
          justifyContent="space-between"
          spacing={1.5}
        >
          <Typography color="text.secondary" variant="body2">
            Protected by ETag {etag}. Saving does not publish the release.
          </Typography>
          <Button
            disabled={save.isPending}
            onClick={() => save.mutate()}
            startIcon={<Save size={16} />}
            variant="contained"
          >
            {save.isPending ? "Saving…" : items.length ? "Save banners" : "Save empty state"}
          </Button>
        </Stack>
      </Paper>
    </Stack>
  );
}

export function BannersPage() {
  const draft = useDraftQuery();

  if (draft.isPending) {
    return (
      <section className="page-stack">
        <div className="panel">Loading banner Draft…</div>
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
      (item) => item.slug === BANNERS_PAGE_SLUG,
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
            Manage the horizontal promotional carousel shown on Home immediately
            below the module navigation chips.
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
