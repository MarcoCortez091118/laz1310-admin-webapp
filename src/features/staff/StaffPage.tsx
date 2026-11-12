import {
  Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Dialog,
  DialogActions, DialogContent, DialogTitle, Divider, FormControlLabel,
  MenuItem, Stack, Switch, TextField, Typography,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { Copy, MailPlus, RefreshCw, ShieldCheck, UserRoundCog } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useStaff } from "../auth/StaffGate";
import {
  inviteStaff, saveStaff, staffCatalog, staffDirectory,
  type StaffAction, type StaffChanges, type StaffMember, type StaffRole,
} from "./api";

const headers: Record<StaffAction, string> = {
  view: "Ver", edit: "Editar", publish: "Publicar", delete: "Eliminar",
};
const DEFAULT: StaffChanges = { role: "editor", permissions: [], enabled: true };

function togglePermission(permissions: string[], module: string, action: StaffAction, enabled: boolean): string[] {
  const current = new Set(permissions);
  const key = `${module}.${action}`;
  if (enabled) {
    current.add(key);
    if (action !== "view") current.add(`${module}.view`);
  } else {
    current.delete(key);
    if (action === "view") {
      for (const other of ["edit", "publish", "delete"]) current.delete(`${module}.${other}`);
    }
  }
  return [...current].sort();
}

export function StaffPage() {
  const staff = useStaff();
  const owner = staff.isOwner === true;
  const directory = useQuery({ queryKey: ["admin", "staff", "directory"], queryFn: ({ signal }) => staffDirectory(signal), enabled: owner, refetchOnWindowFocus: true });
  const catalog = useQuery({ queryKey: ["admin", "staff", "catalog"], queryFn: ({ signal }) => staffCatalog(signal), enabled: owner, staleTime: 60_000 });
  const [open, setOpen] = useState(false);
  const [member, setMember] = useState<StaffMember | null>(null);
  const [email, setEmail] = useState("");
  const [form, setForm] = useState<StaffChanges>(DEFAULT);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ error: boolean; text: string } | null>(null);
  const [inviteLink, setInviteLink] = useState("");
  const [query, setQuery] = useState("");

  const filteredMembers = useMemo(() =>
    (directory.data?.members ?? []).filter(item =>
      `${item.displayName} ${item.email}`.toLowerCase().includes(query.trim().toLowerCase())
    ), [directory.data, query]);

  useEffect(() => {
    if (!open) setSaving(false);
  }, [open]);

  function create() {
    setMember(null);
    setEmail("");
    setForm({ ...DEFAULT, permissions: [] });
    setFeedback(null);
    setInviteLink("");
    setOpen(true);
  }

  function edit(item: StaffMember) {
    setMember(item);
    setEmail(item.email);
    setForm({ role: item.role, enabled: item.enabled, permissions: [...item.permissions] });
    setFeedback(null);
    setInviteLink("");
    setOpen(true);
  }

  function updateRole(role: StaffRole) {
    setForm(previous => ({
      ...previous,
      role,
      permissions: role === "editor"
        ? previous.permissions.filter(p => !p.endsWith(".publish") && !p.endsWith(".delete"))
        : previous.permissions,
    }));
  }

  async function save() {
    setSaving(true);
    setFeedback(null);
    try {
      if (member) {
        await saveStaff(member.uid, member.revision, form);
        setFeedback({ error: false, text: "Permisos guardados. Los cambios se aplican en la API sin esperar a que termine la sesión." });
        setOpen(false);
      } else {
        const response = await inviteStaff({
          email: email.trim().toLowerCase(), role: form.role, permissions: form.permissions,
        });
        setInviteLink(response.inviteUrl);
        const message = response.delivery === "sent"
          ? "Invitación enviada por correo. El acceso se activará cuando se verifique su cuenta."
          : response.delivery === "manual"
            ? "Invitación registrada. El envío automático no está configurado; comparte el enlace de acceso con la persona invitada."
            : "Invitación registrada, pero falló el envío por correo. Comparte el enlace manualmente.";
        setFeedback({ error: false, text: message });
      }
      await directory.refetch();
    } catch (error) {
      setFeedback({ error: true, text: error instanceof Error ? error.message : "No se pudo guardar. Intenta nuevamente." });
    } finally {
      setSaving(false);
    }
  }

  if (!owner) {
    return <Box className="modern-page"><Alert severity="warning">Solo el administrador principal puede gestionar miembros del equipo.</Alert></Box>;
  }

  return (
    <Box className="modern-page">
      <Stack spacing={2.5}>
        <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ sm: "center" }} justifyContent="space-between" spacing={2}>
          <Box>
            <Typography variant="overline" color="primary.main" fontWeight={800}>Seguridad · Equipo</Typography>
            <Typography variant="h4" fontWeight={850}>Administradores y permisos</Typography>
            <Typography color="text.secondary" sx={{ mt: 0.5, maxWidth: 720 }}>
              Da acceso por módulo al personal de LA Z 1310. Las cuentas se verifican con Firebase Auth y todas las autorizaciones se aplican en FastAPI.
            </Typography>
          </Box>
          <Button variant="contained" startIcon={<MailPlus size={18}/>} onClick={create}>Invitar administrador</Button>
        </Stack>

        {feedback && !open ? <Alert severity={feedback.error ? "error" : "success"} onClose={() => setFeedback(null)}>{feedback.text}</Alert> : null}
        <Card variant="outlined" sx={{ borderRadius: 3 }}>
          <CardContent>
            <Stack spacing={2}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2} justifyContent="space-between">
                <TextField size="small" label="Buscar personal" value={query} onChange={event => setQuery(event.target.value)} sx={{ minWidth: { sm: 320 } }} />
                <Button size="small" variant="outlined" startIcon={<RefreshCw size={16}/>} onClick={() => void directory.refetch()}>Actualizar</Button>
              </Stack>
              {directory.isPending ? <CircularProgress size={23}/> : null}
              {directory.error ? <Alert severity="error">No se pudo cargar la lista de administradores.</Alert> : null}
              {!directory.isPending && filteredMembers.length === 0 ? (
                <Alert severity="info">Todavía no hay administradores delegados. Tu cuenta principal se mantiene protegida mediante el rol de operador.</Alert>
              ) : null}
              {filteredMembers.map(item => (
                <Stack key={item.uid} direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "center" }} justifyContent="space-between" sx={{ px: 1, py: 1.5, borderBottom: "1px solid", borderColor: "divider" }}>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <UserRoundCog size={22}/>
                    <Box>
                      <Typography fontWeight={750}>{item.displayName || item.email}</Typography>
                      <Typography variant="body2" color="text.secondary">{item.email}</Typography>
                    </Box>
                  </Stack>
                  <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
                    <Chip label={item.role === "admin" ? "Administrador" : "Editor"} size="small" />
                    <Chip label={item.enabled ? "Activo" : "Suspendido"} color={item.enabled ? "success" : "default"} variant="outlined" size="small" />
                    <Chip label={`${new Set(item.permissions.map(p => p.slice(0, p.lastIndexOf(".")))).size} módulos`} size="small" variant="outlined" />
                    <Button size="small" variant="outlined" onClick={() => edit(item)}>Gestionar acceso</Button>
                  </Stack>
                </Stack>
              ))}
            </Stack>
          </CardContent>
        </Card>

        {(directory.data?.invitations.length ?? 0) > 0 && (
          <Card variant="outlined" sx={{ borderRadius: 3 }}>
            <CardContent>
              <Typography variant="h6" mb={1}>Invitaciones pendientes</Typography>
              {(directory.data?.invitations ?? []).map(invite => (
                <Stack key={invite.email} direction={{ xs: "column", md: "row" }} spacing={1} justifyContent="space-between" sx={{ py: 1, borderBottom: "1px solid", borderColor: "divider" }}>
                  <Typography>{invite.email}</Typography>
                  <Typography variant="caption" color="text.secondary">Expira: {new Date(invite.expiresAt).toLocaleDateString()} · {invite.role}</Typography>
                </Stack>
              ))}
            </CardContent>
          </Card>
        )}
      </Stack>

      <Dialog open={open} onClose={saving ? undefined : () => setOpen(false)} fullWidth maxWidth="md">
        <DialogTitle sx={{ fontWeight: 800 }}>{member ? "Editar permisos administrativos" : "Invitar administrador"}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            {feedback && <Alert severity={feedback.error ? "error" : "success"}>{feedback.text}</Alert>}
            {inviteLink && (
              <Stack spacing={1}>
                <Typography fontWeight={700}>Enlace de acceso para la persona invitada</Typography>
                <Stack direction="row" gap={1}>
                  <TextField size="small" fullWidth value={inviteLink} slotProps={{ input: { readOnly: true } }}/>
                  <Button variant="outlined" startIcon={<Copy size={16}/>} onClick={() => void navigator.clipboard.writeText(inviteLink)}>Copiar</Button>
                </Stack>
                <Typography variant="caption" color="text.secondary">Solo la cuenta con el correo invitado y verificado podrá aceptar el acceso.</Typography>
              </Stack>
            )}
            <TextField label="Correo electrónico del administrador" size="small" value={email} fullWidth disabled={Boolean(member) || saving || Boolean(inviteLink)} onChange={event => setEmail(event.target.value)} inputProps={{ autoComplete: "email" }}/>
            <TextField label="Perfil base" select size="small" fullWidth value={form.role} disabled={saving || Boolean(inviteLink)} onChange={event => updateRole(event.target.value as StaffRole)}>
              <MenuItem value="editor">Editor — consulta y edición</MenuItem>
              <MenuItem value="admin">Administrador delegado — permite publicar y eliminar cuando se autorice</MenuItem>
            </TextField>
            {member && <FormControlLabel control={<Switch checked={form.enabled} onChange={(_, v) => setForm(s => ({ ...s, enabled: v }))}/>} label={form.enabled ? "Cuenta activa" : "Cuenta suspendida (acceso bloqueado)"}/>}
            <Divider/>
            <Stack direction="row" alignItems="center" spacing={1}>
              <ShieldCheck size={20}/>
              <Typography fontWeight={800}>Acceso por módulo</Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary">
              Puedes activar Ver para mostrar un módulo. Editar, Publicar y Eliminar requieren Ver y se comprueban por separado en el servidor.
            </Typography>
            {catalog.isPending ? <CircularProgress size={22}/> : null}
            {catalog.error ? <Alert severity="error">No se pudo cargar el catálogo de permisos.</Alert> : null}
            {(catalog.data?.modules ?? []).map(module => (
              <Box key={module.id} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, p: 1.5 }}>
                <Typography fontWeight={750} mb={1}>{module.label}</Typography>
                <Stack direction="row" flexWrap="wrap" gap={1.5}>
                  {module.actions.map(action => {
                    const key = `${module.id}.${action}`;
                    const restricted = form.role === "editor" && (action === "publish" || action === "delete");
                    return <FormControlLabel key={key} control={
                      <Switch size="small" disabled={saving || Boolean(inviteLink) || restricted} checked={form.permissions.includes(key)}
                        onChange={(_, checked) => setForm(previous => ({
                          ...previous, permissions: togglePermission(previous.permissions, module.id, action, checked),
                        }))}/>
                    } label={headers[action]} sx={{ mr: 1 }} />;
                  })}
                </Stack>
              </Box>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpen(false)}>Cerrar</Button>
          {!inviteLink && <Button variant="contained" disabled={saving || catalog.isPending || Boolean(catalog.error) || (!member && !email.includes("@"))} onClick={() => void save()}>
            {saving ? "Guardando…" : member ? "Guardar cambios" : "Crear invitación"}
          </Button>}
        </DialogActions>
      </Dialog>
    </Box>
  );
}
