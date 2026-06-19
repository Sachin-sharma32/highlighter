import { create } from "zustand";
import type { Id } from "../../convex/_generated/dataModel";

type ActiveCollection =
  | Id<"collections">
  | "inbox"
  | "all"
  | "notes"
  | "custom-notes";

interface AppStore {
  activeCollectionId: ActiveCollection;
  activeTag: string | null;
  activeDomain: string | null;
  selectedHighlightId: Id<"highlights"> | null;
  selectedNoteId: Id<"notes"> | null;
  // Which detail pane to show when both a highlight and a note can be selected
  // in the same view (e.g. a collection that contains both).
  lastSelectedKind: "highlight" | "note";
  commandPaletteOpen: boolean;
  searchQuery: string;
  pricingModalOpen: boolean;
  connectExtensionModalOpen: boolean;
  // Mobile/tablet: the sidebar collapses to an off-canvas drawer.
  sidebarOpen: boolean;
  setActiveCollection: (id: ActiveCollection) => void;
  setActiveTag: (tag: string | null) => void;
  setActiveDomain: (domain: string | null) => void;
  setSelectedHighlight: (id: Id<"highlights"> | null) => void;
  setSelectedNote: (id: Id<"notes"> | null) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setSearchQuery: (q: string) => void;
  setPricingModalOpen: (open: boolean) => void;
  setConnectExtensionModalOpen: (open: boolean) => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
}

export const useAppStore = create<AppStore>((set) => ({
  activeCollectionId: "inbox",
  activeTag: null,
  activeDomain: null,
  selectedHighlightId: null,
  selectedNoteId: null,
  lastSelectedKind: "highlight",
  commandPaletteOpen: false,
  searchQuery: "",
  pricingModalOpen: false,
  connectExtensionModalOpen: false,
  sidebarOpen: false,
  setActiveCollection: (id) =>
    set({
      activeCollectionId: id,
      activeTag: null,
      activeDomain: null,
      selectedHighlightId: null,
      selectedNoteId: null,
      lastSelectedKind: "highlight",
      // Selecting a destination closes the mobile drawer.
      sidebarOpen: false,
    }),
  setActiveTag: (tag) =>
    set({
      activeTag: tag,
      activeCollectionId: "all",
      activeDomain: null,
      selectedHighlightId: null,
      selectedNoteId: null,
      sidebarOpen: false,
    }),
  setActiveDomain: (domain) =>
    set({
      activeDomain: domain,
      activeTag: null,
      selectedHighlightId: null,
      sidebarOpen: false,
    }),
  setSelectedHighlight: (id) =>
    set(
      id
        ? { selectedHighlightId: id, lastSelectedKind: "highlight" }
        : { selectedHighlightId: id },
    ),
  setSelectedNote: (id) =>
    set(
      id
        ? { selectedNoteId: id, lastSelectedKind: "note" }
        : { selectedNoteId: id },
    ),
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  setPricingModalOpen: (open) => set({ pricingModalOpen: open }),
  setConnectExtensionModalOpen: (open) =>
    set({ connectExtensionModalOpen: open }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
}));
