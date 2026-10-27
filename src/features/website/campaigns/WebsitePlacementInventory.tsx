import { Alert, Button, Card, CardContent, Chip, CircularProgress, Stack, Typography } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "../../../api/client";

type Slot = "home" | "programacion" | "actividades";
type Kind = "banner" | "boletos" | "popup";
type Status = "active" | "scheduled" | "expired" | "disabled";

interface PlacementItem {
  id: string;
  kind: Kind;
  title: string;
  slot: Slot;
  status: Status;
  layout: "desktop" | "mobile" | null;
  startsAt: string | null;
  endsAt: string | null;
}

interface PlacementInventory {
  channel: "website";
  items: PlacementItem[];
}

const SLOTS: { key: Slot; label: string }[] = [
  { key: "home", label: "Home Page" },
  { key: "programacion", label: "Programación" },
  { key: "actividades", label: "Actividades" },
];

const KIND_LABELS: Record<Kind, string> = {
  banner: "Banners", boletos: "Boletos", popup: "Pop Up",
};

const STATUS_LABELS: Record<Status, string> = {
  active: "Activa", scheduled: "Programada", expired: "Finalizada", disabled: "Desactivada",
};

export function WebsitePlacementInventory({
  onEdit,
}: {
  onEdit: (kind: "banners" | "boletos" | "popup") => void;
}) {
  const query = useQuery({
    queryKey: ["admin", "website", "placements"],
    queryFn: async () => (await apiRequest<PlacementInventory>(
      "/api/v1/admin/website/placements", { method: "GET" },
    )).data,
    staleTime: 0,
    retry: false,
  });

  if (query.isPending) return <CircularProgress size={26} />;
  if (query.isError) return <Alert severity="error" action={
    <Button color="inherit" onClick={() => void query.refetch()}>Reintentar</Button>
  }>
    No fue posible consultar las ubicaciones publicadas. Verifica el despliegue de FastAPI.
  </Alert>;

  const rows = query.data?.items ?? [];

  return <Stack spacing={2}>
    <Alert severity="info">
      Ubicaciones reales de publicaciones aprobadas en Website. Para cambiar destinos
      y fechas, abre el editor correspondiente, guarda el borrador y publícalo.
      El canal App mantiene un circuito independiente.
    </Alert>
    <Stack direction="row" justifyContent="space-between" alignItems="center">
      <Typography color="text.secondary" variant="body2">
        {rows.length} asignaciones de contenido publicadas
      </Typography>
      <Button size="small" variant="outlined" onClick={() => void query.refetch()}>
        Actualizar
      </Button>
    </Stack>
    {SLOTS.map(slot => {
      const items = rows.filter(row => row.slot === slot.key);
      return <Card key={slot.key} variant="outlined">
        <CardContent>
          <Typography fontWeight={800} variant="h6" mb={1.5}>{slot.label}</Typography>
          {items.length === 0 ? (
            <Typography color="text.secondary" variant="body2">
              Sin contenidos aprobados para esta ubicación.
            </Typography>
          ) : (
            <Stack spacing={1.5}>
              {items.map((item, index) => (
                <Stack key={item.kind + item.id + item.layout + index}
                  direction={{ xs: "column", md: "row" }} gap={1}
                  justifyContent="space-between" alignItems={{ md: "center" }}
                  sx={{ p: 1.5, borderRadius: 2, bgcolor: "action.hover" }}>
                  <Stack gap={0.5} sx={{ minWidth: 0 }}>
                    <Typography fontWeight={700}>{item.title}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {KIND_LABELS[item.kind]} {item.layout ? "· " + item.layout : ""}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {item.startsAt ? "Desde: " + new Date(item.startsAt).toLocaleString() : "Inicio abierto"}
                      {" · "}
                      {item.endsAt ? "Hasta: " + new Date(item.endsAt).toLocaleString() : "Sin caducidad"}
                    </Typography>
                  </Stack>
                  <Stack direction="row" alignItems="center" gap={1}>
                    <Chip size="small" variant="outlined" label={STATUS_LABELS[item.status]}
                      color={item.status === "active" ? "success" : "default"} />
                    <Button size="small" variant="outlined"
                      onClick={() => onEdit(item.kind === "banner" ? "banners" : item.kind)}>
                      Editar
                    </Button>
                  </Stack>
                </Stack>
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>;
    })}
    <Alert severity="warning">
      Estas asignaciones corresponden a Website y reflejan releases publicadas.
      No activan automáticamente componentes nuevos en el sitio hasta aprobar el
      lector público y su configuración canary.
    </Alert>
  </Stack>;
}
