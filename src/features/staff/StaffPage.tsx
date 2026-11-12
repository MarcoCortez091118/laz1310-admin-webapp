import {
  Alert, Box, Button, Card, CardContent, Checkbox, Chip, Dialog, DialogActions,
  DialogContent, DialogTitle, FormControlLabel, MenuItem, Stack, Switch,
  TextField, Typography,
} from "@mui/material";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, ShieldCheck, UserRoundCog } from "lucide-react";
import { useMemo, useState } from "react";
import { useStaff } from "../auth/StaffGate";
import {
  STAFF_ACTIONS, STAFF_MODULES, initialPermissions, inviteStaff, listStaff,
  updateStaff, type Member, type StaffPermissions, type StaffRole,
} from "./api";

function PermissionEditor({ grants, onChange, role }: {
  grants: StaffPermissions;
  onChange: (value: StaffPermissions) => void;
  role: StaffRole;
}) {
  function setModule(module: string, enabled: boolean) {
    const next = { ...grants };
    if (enabled) next[module] = role === "admin" ? ["view", "create", "edit", "publish", "delete"] : ["view", "create", "edit"];
    else delete next[module];
    onChange(next);
  }
  function toggle(module: string, action: string, enabled: boolean) {
    const selected = new Set(grants[module] ?? []);
    if (enabled) {
      selected.add("view");
      selected.add(action);
    } else {
      selected.delete(action);
      if (action === "view") selected.clear();
    }
    onChange({ ...grants, [module]: [...selected] });
  }
  return (
    <Stack spacing={1.5}>
      {(["Website", "App"] as const).map(workspace => (
        <Box key={workspace}>
          <Typography variant="subtitle1" fontWeight={850} sx={{ mb: 1 }}>{workspace}</Typography>
          {STAFF_MODULES.filter(row => row[2] === workspace).map(([module, label]) => (
            <Box key={module} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, mb: 1, px: 1.5, py: 1 }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Typography fontWeight={700} fontSize={13.5}>{label}</Typography>
                <Switch inputProps={{ "aria-label": `Habilitar ${label}` }} size="small"
                  checked={Boolean(grants[module]?.includes("view"))}
                  onChange={(_, enabled) => setModule(module, enabled)} />
              </Stack>
              {grants[module]?.includes("view") && (
                <Stack direction="row" flexWrap="wrap" gap={0.25}>
                  {STAFF_ACTIONS.filter(action => role === "admin" || !["publish", "delete"].includes(action)).map(action => (
                    <FormControlLabel key={action} sx={{ mr: 1.4 }}
                      control={<Checkbox size="small" checked={grants[module]?.includes(action) ?? false}
                        onChange={(_, checked) => toggle(module, action, checked)} />}
                      label={<Typography fontSize={11.5}>{({ view: "Ver", create: "Crear", edit: "Editar", publish: "Publicar", delete: "Eliminar" } as Record<string, string>)[action]}</Typography>}
                    />
                  ))}
                </Stack>
              )}
            </Box>
          ))}
        </Box>
      ))}
    </Stack>
  );
}

export function StaffPage() {
  const current = useStaff() as { uid: string; roles: string[]; managed?: boolean };
  const isOwner = current.roles.includes("admin") && !current.managed;
  const queryClient = useQueryClient();
  const staff = useQuery({ queryKey: ["admin", "staff-directory"], queryFn: listStaff, enabled: isOwner, retry: false });
  const [editing, setEditing] = useState<Member | "invite" | null>(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<StaffRole>("editor");
  const [grants, setGrants] = useState<StaffPermissions>({});
  const [enabled, setEnabled] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const members = staff.data?.members ?? [];
  const invitations = staff.data?.invitations.filter(item => item.status === "pending") ?? [];
  const selectedCount = useMemo(() => Object.values(grants).filter(actions => actions.includes("view")).length, [grants]);

  function beginInvite() {
    setEditing("invite"); setEmail(""); setName(""); setRole("editor");
    setGrants(initialPermissions("editor")); setEnabled(true); setError(null);
  }
  function beginEdit(member: Member) {
    setEditing(member); setEmail(member.email); setName(member.name); setRole(member.role);
    setGrants(structuredClone(member.permissions)); setEnabled(member.status === "active"); setError(null);
  }
  async function save() {
    setError(null);
    if (!editing) return;
    if (selectedCount === 0 && enabled) {
      setError("Selecciona al menos un módulo con permiso de lectura.");
      return;
    }
    setBusy(true);
    try {
      if (editing === "invite") {
        await inviteStaff({ email: email.trim().toLowerCase(), name: name.trim(), role, permissions: grants });
        setSuccess("Invitación registrada. Comparte la dirección del WebAdmin con el usuario. Si usa correo/contraseña, deberá verificar su correo antes de acceder; con Google puede aceptar con su cuenta verificada. No se ha enviado un email automático de invitación.");
      } else {
        await updateStaff(editing, grants, enabled ? "active" : "disabled");
        setSuccess("Permisos guardados. El servidor aplicará la nueva autorización en las siguientes peticiones.");
      }
      setEditing(null);
      await queryClient.invalidateQueries({ queryKey: ["admin", "staff-directory"] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron guardar los permisos.");
    } finally {
      setBusy(false);
    }
  }

  if (!isOwner) return <Alert severity="warning">Este módulo está reservado al administrador principal.</Alert>;
  return (
    <Box className="modern-page">
      <Stack spacing={2.5}>
        <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ sm: "center" }} justifyContent="space-between" gap={2}>
          <Box>
            <Typography variant="overline" color="primary.main">Seguridad y equipo</Typography>
            <Typography variant="h4" fontWeight={850}>Administradores y permisos</Typography>
            <Typography color="text.secondary">Invita integrantes y limita sus módulos de Website y App desde FastAPI.</Typography>
          </Box>
          <Button variant="contained" startIcon={<Plus size={18}/>} onClick={beginInvite}>Agregar administrador</Button>
        </Stack>
        {success && <Alert severity="success" onClose={() => setSuccess(null)}>{success}</Alert>}
        {staff.error && <Alert severity="error">{staff.error instanceof Error ? staff.error.message : "No se pudo cargar el personal."}</Alert>}
        <Card variant="outlined"><CardContent>
          <Stack direction="row" gap={1} alignItems="center" sx={{ mb: 2 }}><ShieldCheck size={20}/><Typography variant="h6">Personal autorizado</Typography></Stack>
          {!staff.isLoading && members.length === 0 && <Alert severity="info">Todavía no se han activado administradores invitados. Los administradores principales provisionados por el operador conservan sus accesos.</Alert>}
          <Stack spacing={1}>
            {members.map(member => (
              <Stack key={member.uid} direction={{ xs: "column", sm: "row" }} gap={2} alignItems={{ sm: "center" }} justifyContent="space-between"
                sx={{ p: 1.5, border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
                <Box>
                  <Typography fontWeight={750}>{member.name}</Typography>
                  <Typography fontSize={12} color="text.secondary">{member.email}</Typography>
                  <Stack direction="row" gap={1} mt={0.8}>
                    <Chip size="small" label={member.role === "admin" ? "Administrador" : "Editor"}/>
                    <Chip size="small" color={member.status === "active" ? "success" : "default"}
                      label={member.status === "active" ? "Activo" : "Suspendido"}/>
                    <Chip size="small" label={`${Object.values(member.permissions).filter(x=>x.includes("view")).length} módulos`}/>
                  </Stack>
                </Box>
                <Button variant="outlined" startIcon={<UserRoundCog size={17}/>} onClick={() => beginEdit(member)}>Gestionar accesos</Button>
              </Stack>
            ))}
          </Stack>
        </CardContent></Card>
        <Card variant="outlined"><CardContent>
          <Typography variant="h6" gutterBottom>Invitaciones pendientes</Typography>
          {invitations.length === 0 ? <Typography color="text.secondary">No hay invitaciones pendientes.</Typography> : invitations.map(inv => (
            <Box key={inv.email} sx={{ py: 1.2, borderBottom: "1px solid", borderColor: "divider" }}>
              <Typography fontWeight={700}>{inv.name}</Typography>
              <Typography color="text.secondary" fontSize={12}>{inv.email} · {inv.role}</Typography>
            </Box>
          ))}
        </CardContent></Card>
      </Stack>
      <Dialog open={Boolean(editing)} onClose={() => !busy && setEditing(null)} fullWidth maxWidth="md">
        <DialogTitle>{editing === "invite" ? "Invitar administrador" : "Editar permisos de administrador"}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField fullWidth label="Nombre" value={name} disabled={editing !== "invite"}
              onChange={event => setName(event.target.value)} />
            <TextField fullWidth type="email" label="Correo electrónico" value={email} disabled={editing !== "invite"}
              onChange={event => setEmail(event.target.value)} />
            <TextField select label="Rol" value={role} disabled={editing !== "invite"}
              onChange={event => {
                const next = event.target.value as StaffRole;
                setRole(next); setGrants(initialPermissions(next));
              }}>
              <MenuItem value="editor">Editor</MenuItem><MenuItem value="admin">Administrador delegado</MenuItem>
            </TextField>
            {editing !== "invite" && <FormControlLabel label="Cuenta activa"
              control={<Switch checked={enabled} onChange={(_, v) => setEnabled(v)}/>} />}
            <Typography fontWeight={750}>Permisos por módulo · {selectedCount} habilitados</Typography>
            <PermissionEditor grants={grants} onChange={setGrants} role={role}/>
            <Alert severity="info">Se aplicará seguridad tanto en el menú como en FastAPI. Los administradores delegados no pueden modificar cuentas de otros administradores.</Alert>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button disabled={busy} onClick={() => setEditing(null)}>Cancelar</Button>
          <Button disabled={busy || (editing === "invite" && (!email.includes("@") || !name.trim()))} variant="contained" onClick={() => void save()}>
            {busy ? "Guardando…" : editing === "invite" ? "Crear invitación" : "Guardar permisos"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
