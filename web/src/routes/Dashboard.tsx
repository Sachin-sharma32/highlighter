import { TopNav } from "@/components/TopNav";
import { Sidebar } from "@/components/Sidebar";
import { HighlightList } from "@/components/HighlightList";
import { HighlightDetail } from "@/components/HighlightDetail";
import { CommandPalette } from "@/components/CommandPalette";
import { PricingModal } from "@/components/PricingModal";
import { UsageBanner } from "@/components/UsageBanner";
import { ConnectExtensionDialog } from "@/components/ConnectExtensionDialog";

export default function Dashboard() {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-paper">
      <TopNav />
      <UsageBanner />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <HighlightList />
        <HighlightDetail />
      </div>
      <CommandPalette />
      <PricingModal />
      <ConnectExtensionDialog />
    </div>
  );
}
