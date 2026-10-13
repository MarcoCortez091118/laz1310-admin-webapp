import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { Globe, Image as ImageIcon, LockKeyhole, Monitor, RefreshCw, Smartphone } from "lucide-react";
import { useStaff } from "../auth/StaffGate";
import { getWebsiteBanners, type WebsiteBanner } from "./api";

function BannerList({
  label,
  description,
  icon: Icon,
  items,
}: {
  label: string;
  description: string;
  icon: typeof Monitor;
  items: WebsiteBanner[];
}) {
  return (
    <Card variant="outlined" sx={{ borderRadius: 3, height: "100%" }}>
      <CardContent sx={{ p: { xs: 2, md: 3 } }}>
        <Stack spacing={2}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Stack direction="row" spacing={1.25} alignItems="center">
              <Box sx={{ p: 1.25, borderRadius: 2, bgcolor: "#FFF1F2", color: "primary.main" }}>
                <Icon size={20} />
              </Box>
              <Box>
                <Typography variant="h6" fontWeight={800}>{label}</Typography>
                <Typography variant="caption" color="text.secondary">{description}</Typography>
              </Box>
            </Stack>
            <Chip size="small" variant="outlined" label={`${items.length} loaded`} />
          </Stack>
          <Divider />
          {items.length ? (
            <Stack spacing={1.5}>
              {items.map((banner, index) => (
                <Box key={`${banner.id}-${index}`} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, overflow: "hidden" }}>
                  <Box component="img" src={banner.url} alt={`${label} banner ${index + 1}`}
                    referrerPolicy="no-referrer"
                    sx={{ display: "block", width: "100%", aspectRatio: "3 / 1", objectFit: "contain", bgcolor: "action.hover" }} />
                  <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1} sx={{ p: 1.25 }}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body2" fontWeight={700}>Slide {index + 1}</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ overflowWrap: "anywhere" }}>
                        {banner.linkUrl ? `Destination: ${banner.linkUrl}` : "No destination link"}
                      </Typography>
                    </Box>
                    <Chip size="small" variant="outlined" label="Read only" />
                  </Stack>
                </Box>
              ))}
            </Stack>
          ) : (
            <Stack alignItems="center" spacing={1} sx={{ py: 4, textAlign: "center", color: "text.secondary" }}>
              <ImageIcon size={28} />
              <Typography variant="body2">No slides found in this variant.</Typography>
            </Stack>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}

export function WebsiteBannersPage() {
  const staff = useStaff();
  const isAdmin = staff.roles.includes("admin");
  const banners = useQuery({
    queryKey: ["admin", "website", "legacy-banners"],
    queryFn: ({ signal }) => getWebsiteBanners(signal),
    enabled: isAdmin,
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 30_000,
  });
  const inventory = banners.data?.data;
  if (!isAdmin) {
    return <Box className="modern-page">
      <Alert severity="warning">Website legacy inventory access is restricted to administrators.</Alert>
    </Box>;
  }

  return (
    <Box className="modern-page">
      <Stack spacing={2.25}>
        <Stack direction={{ xs: "column", md: "row" }} alignItems={{ md: "center" }} justifyContent="space-between" spacing={2}>
          <Box>
            <Typography variant="overline" color="primary.main" fontWeight={800} sx={{ letterSpacing: ".12em" }}>
              Website · Separate editorial domain
            </Typography>
            <Typography variant="h4" fontWeight={850}>Website banners</Typography>
            <Typography color="text.secondary" sx={{ mt: 0.5, maxWidth: 770 }}>
              Safe read-only inventory of the existing laz1310.com hero. Desktop and mobile below
              are responsive website variants; neither refers to the LA Z React Native app.
            </Typography>
          </Box>
          <Button variant="outlined" onClick={() => void banners.refetch()} disabled={banners.isFetching}
            startIcon={banners.isFetching ? <CircularProgress size={15}/> : <RefreshCw size={16}/>}>
            Refresh website data
          </Button>
        </Stack>
        <Alert severity="info" icon={<LockKeyhole size={20}/>}>
          Migration phase 1: this page cannot edit, upload or publish. Website content and
          Mobile content remain independent. All reads go through the existing secured FastAPI client.
        </Alert>
        {banners.isPending ? (
          <Stack justifyContent="center" alignItems="center" sx={{ py: 7 }} spacing={2}>
            <CircularProgress size={28}/>
            <Typography color="text.secondary">Loading website inventory…</Typography>
          </Stack>
        ) : banners.error ? (
          <Alert severity="warning" action={<Button color="inherit" onClick={() => void banners.refetch()}>Retry</Button>}>
            Website inventory is unavailable. The API must be deployed and
            WEBSITE_LEGACY_READS_ENABLED must be enabled after staging security review.
            {" "}{banners.error instanceof Error ? banners.error.message : ""}
          </Alert>
        ) : inventory ? (
          <>
            {!inventory.sourceExists ? (
              <Alert severity="info">
                The legacy settings/banners document was not found. The website may still
                use Storage folder fallbacks; this first read-only adapter does not scan Storage.
              </Alert>
            ) : null}
            {inventory.warnings.length ? (
              <Alert severity="warning">
                {inventory.warnings.length} legacy entries require review:
                {" "}{inventory.warnings.join("; ")}
              </Alert>
            ) : null}
            <Stack direction="row" alignItems="center" gap={1}>
              <Globe size={17} />
              <Typography variant="body2" color="text.secondary">
                Source: {inventory.source} · No legacy content was modified
              </Typography>
            </Stack>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", xl: "1fr 1fr" }, gap: 2 }}>
              <BannerList icon={Monitor} label="Website desktop"
                description="Legacy field: settings/banners.web" items={inventory.desktop} />
              <BannerList icon={Smartphone} label="Website mobile"
                description="Legacy field: settings/banners.mobile" items={inventory.mobile} />
            </Box>
          </>
        ) : null}
      </Stack>
    </Box>
  );
}
