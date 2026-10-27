import {
  Alert, Box, Button, Card, CardContent, Chip, CircularProgress,
  Divider, Paper, Stack, Tab, Tabs, Typography,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Download, ShieldCheck } from "lucide-react";
import { useState } from "react";
import type { Dynamic } from "../../../api/types";
import { useStaff } from "../../auth/StaffGate";
import { DynamicsPage } from "../../dynamics/DynamicsPage";
import { getDynamicParticipations, getDynamics, getParticipationServiceStatus } from "../../dynamics/api";
import { WebsiteBannersPage } from "../banners/WebsiteBannersPage";
import { WebsiteTicketPromotionsPage } from "../tickets/WebsiteTicketPromotionsPage";
import { WebsitePopupPage } from "./WebsitePopupPage";
import {
  campaignCsvFilename, campaignRegistrationsCsv, collectCampaignRegistrations,
} from "./registrations";

type CampaignTab = "premios" | "banners" | "boletos" | "popup" | "ubicaciones" | "registros";

const TABS: { id: CampaignTab; label: string }[] = [
  { id: "premios", label: "Premios" },
  { id: "banners", label: "Banners" },
  { id: "boletos", label: "Boletos" },
  { id: "popup", label: "Pop Up" },
  { id: "ubicaciones", label: "Ubicaciones" },
  { id: "registros", label: "Registros y descargas" },
];

function RegistrationsPage() {
  const staff = useStaff();
  const admin = staff.roles.includes("admin");
  const [downloading, setDownloading] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const catalog = useQuery({
    queryKey: ["admin", "campaigns", "export-catalog"],
    queryFn: async () => (await getDynamics()).data,
    enabled: admin,
    retry: false,
  });
  const protection = useQuery({
    queryKey: ["admin", "campaigns", "participation-service"],
    queryFn: async () => (await getParticipationServiceStatus()).data,
    enabled: admin,
    retry: false,
  });
  const forms = ((catalog.data ?? []) as Dynamic[]).filter(
    (item) => item.participation?.type === "form",
  );

  async function download(campaign: Dynamic) {
    const campaignId = campaign.id;
    if (!campaignId || !admin || !protection.data?.configured || downloading) return;
    setMessage(null);
    setDownloading(campaignId);
    try {
      const rows = await collectCampaignRegistrations(
        campaignId,
        async (id, limit, after) =>
          (await getDynamicParticipations(id, limit, after)).data,
      );
      const file = new Blob(["\uFEFF", campaignRegistrationsCsv(rows)], {
        type: "text/csv;charset=utf-8",
      });
      const url = URL.createObjectURL(file);
      try {
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = campaignCsvFilename(campaign.slug || campaignId);
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
      } finally {
        URL.revokeObjectURL(url);
      }
      setMessage("Descarga realizada: " + rows.length + " registros retenidos de " + campaign.title + ".");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo generar la descarga.");
    } finally {
      setDownloading(null);
    }
  }

  return (
    <Stack spacing={2}>
      <Alert severity="info" icon={<ShieldCheck size={20} />}>
        Sólo los registros de formularios nativos de Premios (App) están disponibles
        en la API actual. Los envíos Web y formularios externos no están centralizados
        todavía. Cada lectura está autenticada y auditada por FastAPI.
      </Alert>
      {!admin ? (
        <Alert severity="warning">Los datos personales y descargas requieren rol administrador verificado.</Alert>
      ) : protection.isPending || catalog.isPending ? (
        <CircularProgress size={26} />
      ) : protection.isError || catalog.isError ? (
        <Alert severity="error">No se pudo verificar el servicio o catálogo. Descargas desactivadas.</Alert>
      ) : !protection.data?.configured ? (
        <Alert severity="warning">La API no tiene cifrado de participaciones habilitado. Descargas desactivadas.</Alert>
      ) : (
        <>
          <Typography variant="body2" color="text.secondary">
            Campañas con formulario en el borrador de App: {forms.length}.
            Esto no es el total de participantes. Se recuperan todas las páginas
            no expiradas hasta un máximo de 500 registros. Si hay más o falla una
            lectura, la descarga se cancela sin generar un archivo incompleto.
          </Typography>
          {message ? (
            <Alert severity={message.startsWith("Descarga realizada") ? "success" : "warning"}>
              {message}
            </Alert>
          ) : null}
          {forms.length === 0 ? (
            <Alert severity="info">No hay campañas con formularios en el borrador.</Alert>
          ) : null}
          {forms.map(campaign => (
            <Card key={campaign.id} variant="outlined">
              <CardContent>
                <Stack direction={{ xs: "column", md: "row" }}
                  alignItems={{ md: "center" }} justifyContent="space-between" spacing={2}>
                  <Box>
                    <Typography fontWeight={800}>{campaign.title}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {campaign.slug} · App Android/iOS
                    </Typography>
                  </Box>
                  <Button variant="outlined"
                    startIcon={downloading === campaign.id ? <CircularProgress size={16} /> : <Download size={16} />}
                    disabled={Boolean(downloading)}
                    onClick={() => void download(campaign)}>
                    {downloading === campaign.id ? "Recuperando registros…" : "Descargar CSV"}
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </>
      )}
    </Stack>
  );
}

export function WebsiteCampaignsPage() {
  const [tab, setTab] = useState<CampaignTab>("premios");
  return (
    <Box className="modern-page" component="section" aria-label="Premios y campañas">
      <Stack spacing={2.5}>
        <Box>
          <Typography variant="overline" color="primary.main" fontWeight={800}>
            LA Z 1310 · PANEL ADMINISTRATIVO
          </Typography>
          <Typography component="h1" variant="h4" fontWeight={850}>
            Premios y Campañas
          </Typography>
          <Typography color="text.secondary" maxWidth={900} mt={1}>
            Administración agrupada en pestañas. Website y App conservan publicaciones
            independientes. Todas las operaciones actuales siguen pasando por FastAPI.
          </Typography>
        </Box>
        <Paper variant="outlined" sx={{ borderRadius: 3, overflow: "hidden" }}>
          <Tabs value={tab}
            onChange={(_event, next: CampaignTab) => setTab(next)}
            variant="scrollable" scrollButtons="auto"
            aria-label="Módulos de premios y campañas">
            {TABS.map(entry => <Tab key={entry.id} value={entry.id} label={entry.label} />)}
          </Tabs>
          <Divider />
          <Box role="tabpanel" sx={{ p: { xs: 2, md: 3 } }}>
            {tab === "premios" && (
              <Stack spacing={2}>
                <Alert severity="info">
                  <Chip label="App Android/iOS" size="small" sx={{ mr: 1 }} />
                  Premios reutiliza formularios configurables, fechas y publicaciones
                  nativas ya existentes. No se publica automáticamente en Website.
                </Alert>
                <DynamicsPage />
              </Stack>
            )}
            {tab === "banners" && (
              <Stack spacing={2}>
                <Alert severity="info">
                  <Chip label="Website" size="small" sx={{ mr: 1 }} />
                  Banners Website: borrador, publicación y rollback propios.
                  Su diseño mobile es para navegador móvil, no la App.
                </Alert>
                <WebsiteBannersPage />
              </Stack>
            )}
            {tab === "boletos" && (
              <Stack spacing={2}>
                <Alert severity="info">
                  <Chip label="Website" size="small" sx={{ mr: 1 }} />
                  Boletos Website conserva creación, edición, publicación y enlaces
                  mediante FastAPI. Formularios multicanal requieren un contrato nuevo.
                </Alert>
                <WebsiteTicketPromotionsPage />
              </Stack>
            )}
            {tab === "popup" && <WebsitePopupPage />}
            {tab === "ubicaciones" && (
              <Stack spacing={1.5}>
                <Alert severity="info">
                  Publicar por destino (Web/App) y posición (Home, Programación,
                  Actividades) requiere primero el contrato de ubicaciones y
                  releases independientes en FastAPI. No se ofrecen controles sin persistencia real.
                </Alert>
                {(["Home", "Programación", "Actividades"] as const).map(slot => (
                  <Card key={slot} variant="outlined">
                    <CardContent>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography fontWeight={750}>{slot}</Typography>
                        <Chip label="Pendiente de API multicanal" size="small" variant="outlined" />
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            )}
            {tab === "registros" && <RegistrationsPage />}
          </Box>
        </Paper>
        <Alert severity="info">
          Pendiente de FastAPI Campaigns V1: posiciones programables, Pop Up,
          caducidad e historial visual Website, formularios Web/App y métricas
          agregadas por campaña. No se mezclan registros entre canales ni se
          inventan métricas.
          <Button component={Link} to="/website" variant="text" size="small" sx={{ ml: 1 }}>
            Volver al dashboard
          </Button>
        </Alert>
      </Stack>
    </Box>
  );
}
