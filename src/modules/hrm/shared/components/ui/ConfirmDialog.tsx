import { Button } from "@hrm/components/ui/button";
import { Dialog, DialogDescription, DialogFooter } from "@hrm/components/ui/dialog";

interface ConfirmDialogProps {
  open: boolean;
  title?: string;
  description?: string | undefined;
  confirmLabel?: string;
  cancelLabel?: string;
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
  loading = false,
  onClose,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} title={title} description={description ?? undefined} size="sm">
      <div className="pt-2">
        {description ? <DialogDescription>{description}</DialogDescription> : null}
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button variant="destructive" onClick={onConfirm} disabled={loading}>
          {loading ? "Loading..." : confirmLabel}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

export default ConfirmDialog;
