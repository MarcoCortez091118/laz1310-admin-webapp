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
import { signInWithEmailAndPassword } from "firebase/auth";
import { LockKeyhole, RadioTower } from "lucide-react";
import { type FormEvent, useState } from "react";
import { auth } from "../../lib/firebase";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(undefined);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      window.location.assign("/");
    } catch {
      setMessage("Sign-in failed. Verify the account and configured Firebase provider.");
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
                    {submitting ? "Signing in…" : "Sign in"}
                  </Button>
                </Stack>
              </Box>

              <Typography color="text.secondary" fontSize={11.5} textAlign="center">
                Authorized editorial and platform staff only.
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
