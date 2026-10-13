import { Alert, Box, Card, CardContent, Chip, Stack, Typography } from "@mui/material";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Globe, Image, Newspaper, Radio, Ticket } from "lucide-react";

const websiteModules = [
  {
    label: "News / Blog",
    description: "Prepare articles, review drafts and manage Website publications.",
    to: "/website/news",
    icon: Newspaper,
  },
  {
    label: "Website Banners",
    description: "Manage the responsive banners shown on laz1310.com.",
    to: "/website/banners",
    icon: Image,
  },
  {
    label: "Website Shows",
    description: "Recover, edit and publish Website shows individually.",
    to: "/website/shows",
    icon: Radio,
  },
  {
    label: "Ticket Promotions",
    description: "Manage promotional slides and their Website publication.",
    to: "/website/ticket-promotions",
    icon: Ticket,
  },
] as const;

/** Website landing deliberately never displays native Mobile draft/release statistics. */
export function WebsiteDashboardPage() {
  return (
    <Box component="section" className="modern-page" aria-label="Website dashboard">
      <Stack spacing={2.5}>
        <Box>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Globe size={19} color="#D30A12" aria-hidden />
            <Typography variant="overline" color="primary.main" fontWeight={800}>
              LA Z 1310 · Website
            </Typography>
            <Chip label="Website only" size="small" variant="outlined" />
          </Stack>
          <Typography component="h1" variant="h4" fontWeight={850} mt={0.5}>
            Website Dashboard
          </Typography>
          <Typography color="text.secondary" mt={1} maxWidth={740}>
            Manage the official laz1310.com Website. Choose a section below to edit its
            own drafts and publications.
          </Typography>
        </Box>
        <Alert severity="info">
          Website editorial content is managed separately from the Android/iOS application.
          To manage app content, choose App Android / iOS in the sidebar.
        </Alert>
        <Box sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" },
          gap: 2,
        }}>
          {websiteModules.map(module => {
            const Icon = module.icon;
            return (
              <Link key={module.to} to={module.to} style={{ textDecoration: "none", color: "inherit" }}>
                <Card variant="outlined" sx={{
                  height: "100%",
                  borderRadius: 3,
                  transition: "border-color 150ms ease, box-shadow 150ms ease",
                  "&:hover": { borderColor: "primary.main", boxShadow: "0 6px 22px rgba(16,24,40,.08)" },
                }}>
                  <CardContent sx={{ p: 3 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                      <Box sx={{
                        display: "grid", placeItems: "center", width: 42, height: 42,
                        borderRadius: 2, bgcolor: "#FFF1F2", color: "#B42318",
                      }}>
                        <Icon size={21} aria-hidden />
                      </Box>
                      <ArrowUpRight size={18} color="#667085" aria-hidden />
                    </Stack>
                    <Typography variant="h6" fontWeight={800} mt={2}>{module.label}</Typography>
                    <Typography color="text.secondary" fontSize={13.5} mt={0.7}>
                      {module.description}
                    </Typography>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </Box>
      </Stack>
    </Box>
  );
}
