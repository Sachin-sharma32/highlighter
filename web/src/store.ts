import { create } from "zustand";
import type { Id } from "../../convex/_generated/dataModel";

type ActiveCollection = Id<"collections"> | "inbox" | "all" | "notes";

interface AppStore {
  activeCollectionId: ActiveCollection;
  activeTag: string | null;
  activeDomain: string | null;
  selectedHighlightId: Id<"highlights"> | null;
  commandPaletteOpen: boolean;
  searchQuery: string;
  pricingModalOpen: boolean;
  connectExtensionModalOpen: boolean;
  setActiveCollection: (id: ActiveCollection) => void;
  setActiveTag: (tag: string | null) => void;
  setActiveDomain: (domain: string | null) => void;
  setSelectedHighlight: (id: Id<"highlights"> | null) => void;
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
    }),
  setActiveTag: (tag) =>
    set({
      activeTag: tag,
      activeCollectionId: "all",
      activeDomain: null,
      selectedHighlightId: null,
    }),
  setActiveDomain: (domain) =>
    set({ activeDomain: domain, activeTag: null, selectedHighlightId: null }),
  setSelectedHighlight: (id) => set({ selectedHighlightId: id }),
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  setPricingModalOpen: (open) => set({ pricingModalOpen: open }),
  setConnectExtensionModalOpen: (open) =>
    set({ connectExtensionModalOpen: open }),
}));
