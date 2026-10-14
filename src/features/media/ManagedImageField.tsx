import {
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { Images, Trash2 } from "lucide-react";
import { NativeArtworkPreview } from "../app-ui/NativeArtworkPreview";
import { useState } from "react";
import { MediaPickerDialog } from "./MediaPickerDialog";

export function ManagedImageField({
  value,
  label,
  description,
  pickerTitle,
  required = false,
  onChange,
}: {
  value?: string | null;
  label: string;
  description?: string;
  pickerTitle?: string;
  required?: boolean;
  onChange: (url: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = Boolean(value?.trim());

  return (
    <Paper variant="outlined" sx={{ borderRadius: 2.5, p: 1.75 }}>
      <Stack spacing={1.5}>
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1.25}>
          <Box>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography fontWeight={800}>{label}</Typography>
              {required ? <Chip label="Required" size="small" color="primary" variant="outlined" /> : null}
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.35 }}>
              {description ?? "Upload a managed image or choose one already stored in the Media Library."}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <Button variant="outlined" size="small" startIcon={<Images size={15} />} onClick={() => setOpen(true)}>
              {selected ? "Change image" : "Upload / choose"}
            </Button>
            {selected && !required ? (
              <Button color="error" size="small" startIcon={<Trash2 size={15} />} onClick={() => onChange(null)}>
                Clear
              </Button>
            ) : null}
          </Stack>
        </Stack>

        <Box sx={{ maxWidth: 360, width: "100%", minWidth: 0 }}>
          <NativeArtworkPreview src={value} alt={label}
            shape="square" maxHeight={280}/>
        </Box>

        <Typography variant="caption" color="text.secondary">
          The browser never writes directly to Storage. FastAPI validates and re-encodes the upload, stores it, and the returned managed URL is persisted automatically.
        </Typography>
      </Stack>

      <MediaPickerDialog
        currentUrl={value}
        onClose={() => setOpen(false)}
        onSelect={(asset) => onChange(asset.url)}
        open={open}
        title={pickerTitle ?? `Choose ${label.toLowerCase()}`}
      />
    </Paper>
  );
}
