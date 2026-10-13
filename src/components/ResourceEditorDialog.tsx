import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Typography,
} from "@mui/material";
import { X } from "lucide-react";
import { useId, useState, type ReactNode } from "react";

/**
 * One accessible, responsive editing surface shared by editorial domains.
 * Domain forms keep their own validation, mutations, ETag and publish behavior.
 */
export function ResourceEditorDialog({
  open,
  title,
  description,
  dirty = false,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  description?: string;
  dirty?: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  function requestClose() {
    if (dirty) {
      setConfirmDiscard(true);
    } else {
      onClose();
    }
  }

  return (
    <>
      <Dialog
        aria-describedby={description ? descriptionId : undefined}
        aria-labelledby={titleId}
        fullWidth
        maxWidth="lg"
        onClose={requestClose}
        open={open}
        scroll="paper"
        slotProps={{
          paper: {
            sx: {
              borderRadius: { xs: 0, sm: 3 },
              height: { xs: "100%", sm: "auto" },
              maxHeight: { xs: "100%", sm: "90dvh" },
              m: { xs: 0, sm: 2 },
            },
          },
        }}
      >
        <DialogTitle id={titleId} sx={{ pr: 7 }}>
          <Typography component="span" variant="h6" fontWeight={800}>{title}</Typography>
          {description ? (
            <Typography id={descriptionId} variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {description}
            </Typography>
          ) : null}
          <IconButton
            aria-label="Close editor"
            onClick={requestClose}
            sx={{ position: "absolute", right: 12, top: 12 }}
          >
            <X size={19} />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ px: { xs: 1.5, sm: 3 }, py: 2.5 }}>
          <Box sx={{ minWidth: 0 }}>{children}</Box>
        </DialogContent>
      </Dialog>
      <Dialog open={confirmDiscard} onClose={() => setConfirmDiscard(false)} aria-labelledby="discard-editor-title">
        <DialogTitle id="discard-editor-title">Discard unsaved changes?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            The changes in this editor have not been saved to Draft. Keep editing or discard them.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDiscard(false)}>Keep editing</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => {
              setConfirmDiscard(false);
              onClose();
            }}
          >
            Discard changes
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
