import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  createUserWithEmailAndPassword, GoogleAuthProvider, sendEmailVerification,
  sendPasswordResetEmail, signInWithEmailAndPassword, signInWithPopup,
} from "firebase/auth";
import { apiRequest } from "../../api/client";
import { LockKeyhole, RadioTower } from "lucide-react";
import { type FormEvent, useState } from "react";
import { auth } from "../../lib/firebase";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const [registration, setRegistration] = useState(false);

  async function activateAndEnter() {
    const user = auth.currentUser;
    if (!user) throw new Error("No hay una sesión de Firebase activa.");
    await user.reload();
    if (!user.emailVerified) {
      await sendEmailVerification(user);
      setMessage("Te enviamos un correo de verificación de Firebase. Confirma tu dirección y vuelve a iniciar sesión.");
      return;
    }
    try {
      await apiRequest("/api/v1/admin/staff/activate", { method: "POST" });
      await user.getIdToken(true);
    } catch (activationError) {
      // Existing staff provisioned by IAM/operator do not need an invitation.
      const token = await user.getIdTokenResult(true);
      const roles = token.claims.laz_roles;
      if (!Array.isArray(roles) || !roles.some(r => r === "admin" || r === "editor")) {
        throw activationError;
      }
    }
    window.location.assign("/");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(undefined);
    try {
      if (registration) {
        const result = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await sendEmailVerification(result.user);
        setMessage("Cuenta creada. Firebase te envió un correo de verificación. Después de verificarlo, inicia sesión para activar tu invitación.");
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
        await activateAndEnter();
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo autenticar la cuenta.");
    } finally {
      setSubmitting(false);
    }
  }

  async function googleSignIn() {
    setSubmitting(true);
    setMessage(undefined);
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
      await activateAndEnter();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo iniciar sesión con Google.");
    } finally {
      setSubmitting(false);
    }
  }

  async function resetPassword() {
    if (!email.includes("@")) {
      setMessage("Primero escribe tu dirección de correo.");
      return;
    }
    setSubmitting(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setMessage("Si la cuenta existe, recibirás instrucciones de recuperación de contraseña.");
    } catch {
      setMessage("No fue posible solicitar la recuperación de contraseña.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Box component="main" className="modern-login-shell">
      <Box className="modern-login-brand-panel">
        <Box className="modern-login-brand-lockup">
          <Box className="modern-login-logo">Z</Box>
          <Box>
            <Typography color="white" fontSize={20} fontWeight={850}>
              LA Z 1310
            </Typography>
            <Typography sx={{ color: "rgba(255,255,255,.62)" }} fontSize={12}>
              Digital Platform
            </Typography>
          </Box>
        </Box>

        <Box className="modern-login-brand-copy">
          <Box className="modern-login-icon">
            <RadioTower size={24} />
          </Box>
          <Typography color="white" variant="h3" maxWidth={520}>
            One control plane for the LA Z digital experience.
          </Typography>
          <Typography sx={{ color: "rgba(255,255,255,.68)" }} fontSize={15} maxWidth={500} mt={2} lineHeight={1.65}>
            Manage editorial content, radio programming, Dynamics, releases, media and platform configuration from a single authenticated workspace.
          </Typography>
        </Box>

        <Typography sx={{ color: "rgba(255,255,255,.45)" }} fontSize={11.5}>
          FastAPI · Firebase Auth · App Check
        </Typography>
      </Box>

      <Box className="modern-login-form-panel">
        <Card className="modern-login-card">
          <CardContent sx={{ p: { xs: 3, sm: 4.5 } }}>
            <Stack spacing={3}>
              <Box>
                <Box className="modern-login-form-icon">
                  <LockKeyhole size={20} />
                </Box>
                <Typography variant="h4" mt={2}>
                  Welcome back
                </Typography>
                <Typography color="text.secondary" fontSize={14} mt={0.8}>
                  Sign in with an authorized LA Z staff account.
                </Typography>
              </Box>

              {message ? <Alert severity="error">{message}</Alert> : null}

              <Box component="form" onSubmit={submit}>
                <Stack spacing={2}>
                  <TextField
                    autoComplete="email"
                    fullWidth
                    inputMode="email"
                    label="Email"
                    onChange={(event) => setEmail(event.target.value)}
                    required
                    type="email"
                    value={email}
                  />
                  <TextField
                    autoComplete="current-password"
                    fullWidth
                    label="Password"
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    type="password"
                    value={password}
                  />
                  <Button disabled={submitting} fullWidth size="large" type="submit" variant="contained">
                    {submitting ? "Procesando…" : registration ? "Crear cuenta con invitación" : "Iniciar sesión"}
                  </Button>
                </Stack>
              </Box>

              <Stack spacing={1.2}>
                <Button variant="outlined" fullWidth disabled={submitting} onClick={() => void googleSignIn()}>
                  Continuar con Google
                </Button>
                <Button fullWidth disabled={submitting} onClick={() => {setRegistration(v => !v);setMessage(undefined);}}>
                  {registration ? "Ya tengo una cuenta" : "Tengo una invitación y necesito crear mi cuenta"}
                </Button>
                {!registration && <Button size="small" disabled={submitting} onClick={() => void resetPassword()}>
                  Recuperar contraseña
                </Button>}
              </Stack>
              <Typography color="text.secondary" fontSize={11.5} textAlign="center">
                Solo el personal invitado o autorizado puede acceder. Para correo/contraseña es obligatorio verificar el correo. El acceso con Google requiere un dominio OAuth autorizado.
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
