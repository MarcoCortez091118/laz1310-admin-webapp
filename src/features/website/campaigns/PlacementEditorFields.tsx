import { Alert, FormControlLabel, Stack, Switch, TextField, Typography } from "@mui/material";
import { isoToZonedInput, zonedInputToIso } from "../../dynamics/model";

export const WEBSITE_TIMEZONE = "America/Detroit";
export type WebsiteSlot = "home" | "programacion" | "actividades";

export interface WebsitePlacementFields {
  placements?: WebsiteSlot[];
  startsAt?: string | null;
  endsAt?: string | null;
}

const SLOTS: { id: WebsiteSlot; label: string }[] = [
  { id: "home", label: "Home Page" },
  { id: "programacion", label: "Programación" },
  { id: "actividades", label: "Actividades" },
];

export function websiteScheduleValid(value: WebsitePlacementFields): boolean {
  const slots = value.placements ?? ["home"];
  if (!slots.length || new Set(slots).size !== slots.length) return false;
  const start = value.startsAt;
  const end = value.endsAt;
  return (!start && !end) || (
    Boolean(start && end) && Number.isFinite(Date.parse(start!)) &&
    Number.isFinite(Date.parse(end!)) && Date.parse(start!) < Date.parse(end!)
  );
}

export function PlacementEditorFields({
  value, onChange,
}: {
  value: WebsitePlacementFields;
  onChange: (patch: WebsitePlacementFields) => void;
}) {
  const slots = value.placements ?? ["home"];
  const start = value.startsAt ? isoToZonedInput(value.startsAt, WEBSITE_TIMEZONE) : "";
  const end = value.endsAt ? isoToZonedInput(value.endsAt, WEBSITE_TIMEZONE) : "";
  return <Stack spacing={1.5}>
    <Typography variant="subtitle2" fontWeight={800}>Ubicaciones · Website</Typography>
    <Stack direction="row" gap={2} flexWrap="wrap">
      {SLOTS.map(slot => (
        <FormControlLabel key={slot.id} label={slot.label} control={
          <Switch checked={slots.includes(slot.id)} onChange={(_event, checked) => {
            const next = checked
              ? [...slots, slot.id]
              : slots.filter(item => item !== slot.id);
            onChange({ placements: next });
          }}/>
        } />
      ))}
    </Stack>
    <Typography variant="subtitle2" fontWeight={800}>
      Inicio y fin de publicación (opcional)
    </Typography>
    <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
      <TextField fullWidth type="datetime-local" size="small" label="Inicio"
        InputLabelProps={{ shrink: true }} value={start}
        onChange={event => onChange({
          startsAt: event.target.value
            ? zonedInputToIso(event.target.value, WEBSITE_TIMEZONE) : null,
        })} />
      <TextField fullWidth type="datetime-local" size="small" label="Fin"
        InputLabelProps={{ shrink: true }} value={end}
        onChange={event => onChange({
          endsAt: event.target.value
            ? zonedInputToIso(event.target.value, WEBSITE_TIMEZONE) : null,
        })} />
    </Stack>
    <Typography variant="caption" color="text.secondary">
      Zona horaria: {WEBSITE_TIMEZONE}. Si estableces una fecha, debes establecer ambas.
      Las campañas expiradas dejan de aparecer en las secciones públicas automáticamente.
    </Typography>
    {!websiteScheduleValid(value) && (
      <Alert severity="warning">
        Selecciona al menos una ubicación y un intervalo de fechas válido.
      </Alert>
    )}
  </Stack>;
}
