import { create } from "zustand";
import type { Id } from "../../convex/_generated/dataModel";

type ActiveCollection = Id<"collections"> | "inbox" | "all" | "notes" | "review";

interface AppStore {
  activeCollectionId: ActiveCollection;
  activeTag: string | null;
  selectedHighlightId: Id<"highlights"> | null;
  commandPaletteOpen: boolean;
  searchQuery: string;
  setActiveCollection: (id: ActiveCollection) => void;
  setActiveTag: (tag: string | null) => void;
  setSelectedHighlight: (id: Id<"highlights"> | null) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setSearchQuery: (q: string) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  activeCollectionId: "inbox",
  activeTag: null,
  selectedHighlightId: null,
  commandPaletteOpen: false,
  searchQuery: "",
  setActiveCollection: (id) => set({ activeCollectionId: id, activeTag: null, selectedHighlightId: null }),
  setActiveTag: (tag) => set({ activeTag: tag, activeCollectionId: "all", selectedHighlightId: null }),
  setSelectedHighlight: (id) => set({ selectedHighlightId: id }),
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  setSearchQuery: (q) => set({ searchQuery: q }),
}));
