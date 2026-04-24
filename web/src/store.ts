import { create } from "zustand";
import type { Id } from "../../convex/_generated/dataModel";

type ActiveCollection = Id<"collections"> | "inbox" | "all" | "notes" | "review";

interface AppStore {
  activeCollectionId: ActiveCollection;
  selectedHighlightId: Id<"highlights"> | null;
  commandPaletteOpen: boolean;
  searchQuery: string;
  setActiveCollection: (id: ActiveCollection) => void;
  setSelectedHighlight: (id: Id<"highlights"> | null) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setSearchQuery: (q: string) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  activeCollectionId: "inbox",
  selectedHighlightId: null,
  commandPaletteOpen: false,
  searchQuery: "",
  setActiveCollection: (id) => set({ activeCollectionId: id, selectedHighlightId: null }),
  setSelectedHighlight: (id) => set({ selectedHighlightId: id }),
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  setSearchQuery: (q) => set({ searchQuery: q }),
}));
