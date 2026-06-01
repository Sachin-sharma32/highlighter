import { TopNav } from "@/components/TopNav";
import { Sidebar } from "@/components/Sidebar";
import { HighlightList } from "@/components/HighlightList";
import { HighlightDetail } from "@/components/HighlightDetail";
import { CollectionList } from "@/components/CollectionList";
import { NotesList } from "@/components/NotesList";
import { NoteDetail } from "@/components/NoteDetail";
import { CommandPalette } from "@/components/CommandPalette";
import { PricingModal } from "@/components/PricingModal";
import { UsageBanner } from "@/components/UsageBanner";
import { ConnectExtensionDialog } from "@/components/ConnectExtensionDialog";
import { useAppStore } from "@/store";

const SPECIAL_VIEWS = ["inbox", "all", "notes", "custom-notes"];

export default function Dashboard() {
  const activeCollectionId = useAppStore((s) => s.activeCollectionId);
  const lastSelectedKind = useAppStore((s) => s.lastSelectedKind);
  const isNotes = activeCollectionId === "custom-notes";
  const isCollection = !SPECIAL_VIEWS.includes(activeCollectionId as string);

  let content;
  if (isNotes) {
    content = (
      <>
        <NotesList />
        <NoteDetail />
      </>
    );
  } else if (isCollection) {
    // A collection can hold both highlights and notes; show the matching
    // detail pane for whichever the user selected last.
    content = (
      <>
        <CollectionList />
        {lastSelectedKind === "note" ? <NoteDetail /> : <HighlightDetail />}
      </>
    );
  } else {
    content = (
      <>
        <HighlightList />
        <HighlightDetail />
      </>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-paper">
      <TopNav />
      <UsageBanner />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        {content}
      </div>
      <CommandPalette />
      <PricingModal />
      <ConnectExtensionDialog />
    </div>
  );
}
