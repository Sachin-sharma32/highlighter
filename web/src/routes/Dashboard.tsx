import { TopNav } from "@/components/TopNav";
import { Sidebar } from "@/components/Sidebar";
import { HighlightList } from "@/components/HighlightList";
import { HighlightDetail } from "@/components/HighlightDetail";
import { NotesList } from "@/components/NotesList";
import { NoteDetail } from "@/components/NoteDetail";
import { CommandPalette } from "@/components/CommandPalette";
import { PricingModal } from "@/components/PricingModal";
import { UsageBanner } from "@/components/UsageBanner";
import { ConnectExtensionDialog } from "@/components/ConnectExtensionDialog";
import { useAppStore } from "@/store";

export default function Dashboard() {
  const activeCollectionId = useAppStore((s) => s.activeCollectionId);
  const isNotes = activeCollectionId === "custom-notes";

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-paper">
      <TopNav />
      <UsageBanner />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        {isNotes ? (
          <>
            <NotesList />
            <NoteDetail />
          </>
        ) : (
          <>
            <HighlightList />
            <HighlightDetail />
          </>
        )}
      </div>
      <CommandPalette />
      <PricingModal />
      <ConnectExtensionDialog />
    </div>
  );
}
