import { Button } from "@/components/ui/button";

interface DisconnectDialogProps {
  onCancel: () => void;
  onConfirm: () => void;
}

export function DisconnectDialog({
  onCancel,
  onConfirm,
}: DisconnectDialogProps) {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-ink/30 px-6">
      <div className="w-full rounded border border-rule bg-paper p-4 shadow-paper-3">
        <div className="font-display text-[17px] font-medium text-ink">
          Disconnect extension?
        </div>
        <p className="mt-2 text-xs leading-5 text-ink-3">
          You can reconnect later with a new pairing code from the dashboard.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button
            variant="outline"
            className="h-8 px-3 text-xs"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            className="h-8 bg-red-600 px-3 text-xs text-white hover:bg-red-700"
            onClick={onConfirm}
          >
            Disconnect
          </Button>
        </div>
      </div>
    </div>
  );
}
