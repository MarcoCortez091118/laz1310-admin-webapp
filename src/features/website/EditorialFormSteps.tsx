import { Box, Step, StepLabel, Stepper, Typography } from "@mui/material";

export const EDITORIAL_STEPS = ["Information", "Artwork", "Review"] as const;

export function EditorialFormSteps({ active }: { active: number }) {
  return <Box sx={{ mb: 2 }}>
    <Stepper activeStep={active} alternativeLabel
      aria-label="Editorial form progress">
      {EDITORIAL_STEPS.map(label => <Step key={label}>
        <StepLabel>{label}</StepLabel>
      </Step>)}
    </Stepper>
    <Typography variant="caption" color="text.secondary"
      sx={{ display: "block", textAlign: "center", mt: 1 }}>
      Step {active + 1} of {EDITORIAL_STEPS.length}
    </Typography>
  </Box>;
}
