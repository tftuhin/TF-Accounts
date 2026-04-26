import { create } from "zustand";
import type { SessionUser } from "@/types";

interface AppState {
  // Current entity selection
  currentEntityId: string;
  setCurrentEntityId: (id: string) => void;

  // User session (hydrated from server)
  user: SessionUser | null;
  setUser: (user: SessionUser | null) => void;

  // Sidebar
  sidebarOpen: boolean;
  toggleSidebar: () => void;

  // Modal state
  modalOpen: string | null; // modal identifier or null
  openModal: (id: string) => void;
  closeModal: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentEntityId: "consolidated",
  setCurrentEntityId: (id) => set({ currentEntityId: id }),

  user: null,
  setUser: (user) => set({ user }),

  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

  modalOpen: null,
  openModal: (id) => set({ modalOpen: id }),
  closeModal: () => set({ modalOpen: null }),
}));
