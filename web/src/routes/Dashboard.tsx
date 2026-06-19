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
  const selectedHighlightId = useAppStore((s) => s.selectedHighlightId);
  const selectedNoteId = useAppStore((s) => s.selectedNoteId);
  const isNotes = activeCollectionId === "custom-notes";
  const isCollection = !SPECIAL_VIEWS.includes(activeCollectionId as string);

  // On phones we can only show one pane at a time. `detailOpen` decides whether
  // the list (false) or the detail (true) takes over the single mobile column.
  // From `md` up both panes are always visible, so the flag is purely advisory.
  let content;
  let detailOpen: boolean;
  if (isNotes) {
    detailOpen = selectedNoteId !== null;
    content = (
      <>
        <NotesList mobileHidden={detailOpen} />
        <NoteDetail mobileHidden={!detailOpen} />
      </>
    );
  } else if (isCollection) {
    // A collection can hold both highlights and notes; show the matching
    // detail pane for whichever the user selected last.
    const noteSelected = lastSelectedKind === "note";
    detailOpen = noteSelected
      ? selectedNoteId !== null
      : selectedHighlightId !== null;
    content = (
      <>
        <CollectionList mobileHidden={detailOpen} />
        {noteSelected ? (
          <NoteDetail mobileHidden={!detailOpen} />
        ) : (
          <HighlightDetail mobileHidden={!detailOpen} />
        )}
      </>
    );
  } else {
    detailOpen = selectedHighlightId !== null;
    content = (
      <>
        <HighlightList mobileHidden={detailOpen} />
        <HighlightDetail mobileHidden={!detailOpen} />
      </>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-paper">
      <TopNav />
      <UsageBanner />
      <div className="relative flex flex-1 overflow-hidden">
        <Sidebar />
        {content}
      </div>
      <CommandPalette />
      <PricingModal />
      <ConnectExtensionDialog />
    </div>
  );
}
