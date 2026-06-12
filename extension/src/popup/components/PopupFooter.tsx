import { BookOpen, Download, PanelRight, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PopupFooterProps {
  onOpenDashboard: () => void;
  onExport: () => void;
  onOpenSidePanel: () => void;
  onRefresh: () => void;
}

export function PopupFooter({
  onOpenDashboard,
  onExport,
  onOpenSidePanel,
  onRefresh,
}: PopupFooterProps) {
  return (
    <div className="flex gap-1.5 border-t border-rule bg-paper-2 p-2.5">
      <Button onClick={onOpenDashboard} className="h-[34px] flex-1 text-xs">
        <BookOpen size={12} data-icon="inline-start" />
        Open Dashboard
      </Button>
      <Button
        onClick={onExport}
        title="Export as Markdown"
        variant="outline"
        size="icon"
      >
        <Download size={12} />
      </Button>
      <Button
        onClick={onOpenSidePanel}
        title="Open side panel"
        variant="outline"
        size="icon"
      >
        <PanelRight size={12} />
      </Button>
      <Button onClick={onRefresh} title="Refresh" variant="outline" size="icon">
        <RefreshCw size={12} />
      </Button>
    </div>
  );
}
