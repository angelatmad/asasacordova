import { Modal } from "@/components/admin/Modal";

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  // busy disables the buttons while an API request is still running.
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

// Reusable yes/no dialog used before important or destructive actions.
export function ConfirmDialog({
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  // The parent decides what actually happens when a button is clicked.
  return (
    <Modal
      title={title}
      size="sm"
      onClose={onCancel}
      footer={
        <>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-full border border-[#EBD5D3] bg-white px-5 py-2.5 text-sm font-semibold text-[#58111A] transition hover:bg-[#FAF6F5] disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="rounded-full bg-[#800020] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#58111A] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Working..." : confirmLabel}
          </button>
        </>
      }
    >
      {/* Line breaks from the parent message are kept. */}
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#7A585B]">{message}</p>
    </Modal>
  );
}
