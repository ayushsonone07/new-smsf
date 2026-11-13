import { Button } from "@hrm/components/ui/button";
import { Dialog, DialogFooter } from "@hrm/components/ui/dialog";

interface ConfirmDialogProps {
  open: boolean;
  title?: string;
  description?: string | undefined;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  loading?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function ConfirmDialog({
  open,
  title = "Are you sure?",
  description,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  confirmVariant = "destructive",
  loading = false,
  onClose,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} title={title} size="sm">
      {description ? (
        <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
      ) : null}
      <DialogFooter>
        <Button variant="ghost" onClick={onClose} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button variant={confirmVariant} onClick={onConfirm} disabled={loading}>
          {loading ? "Loading..." : confirmLabel}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

export default ConfirmDialog;
