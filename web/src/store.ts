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
  commandPaletteOpen: boolean;
  searchQuery: string;
  pricingModalOpen: boolean;
  connectExtensionModalOpen: boolean;
  setActiveCollection: (id: ActiveCollection) => void;
  setActiveTag: (tag: string | null) => void;
  setActiveDomain: (domain: string | null) => void;
  setSelectedHighlight: (id: Id<"highlights"> | null) => void;
  setSelectedNote: (id: Id<"notes"> | null) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setSearchQuery: (q: string) => void;
  setPricingModalOpen: (open: boolean) => void;
  setConnectExtensionModalOpen: (open: boolean) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  activeCollectionId: "inbox",
  activeTag: null,
  activeDomain: null,
  selectedHighlightId: null,
  selectedNoteId: null,
  commandPaletteOpen: false,
  searchQuery: "",
  pricingModalOpen: false,
  connectExtensionModalOpen: false,
  setActiveCollection: (id) =>
    set({
      activeCollectionId: id,
      activeTag: null,
      activeDomain: null,
      selectedHighlightId: null,
      selectedNoteId: null,
    }),
  setActiveTag: (tag) =>
    set({
      activeTag: tag,
      activeCollectionId: "all",
      activeDomain: null,
      selectedHighlightId: null,
      selectedNoteId: null,
    }),
  setActiveDomain: (domain) =>
    set({ activeDomain: domain, activeTag: null, selectedHighlightId: null }),
  setSelectedHighlight: (id) => set({ selectedHighlightId: id }),
  setSelectedNote: (id) => set({ selectedNoteId: id }),
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  setPricingModalOpen: (open) => set({ pricingModalOpen: open }),
  setConnectExtensionModalOpen: (open) =>
    set({ connectExtensionModalOpen: open }),
}));
