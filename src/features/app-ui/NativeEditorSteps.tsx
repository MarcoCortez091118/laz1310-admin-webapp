import { Box, Step, StepLabel, Stepper, Typography } from "@mui/material";

export const NATIVE_EDITOR_STEPS = ["Information", "Artwork", "Review"] as const;

export function NativeEditorSteps({
  active, labels = NATIVE_EDITOR_STEPS,
}: {
  active: number;
  labels?: readonly string[];
}) {
  return <Box sx={{ mb: 2, minWidth: 0 }}>
    <Stepper activeStep={active} alternativeLabel aria-label="Android/iOS editor progress">
      {labels.map(label => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
    </Stepper>
    <Typography component="p" textAlign="center" variant="caption"
      color="text.secondary" mt={1}>
      Step {active + 1} of {labels.length}
    </Typography>
  </Box>;
}
