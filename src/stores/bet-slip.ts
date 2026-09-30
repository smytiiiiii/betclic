"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { MarketKey } from "@/lib/domain/types";

export interface SlipSelection {
  id: string;
  matchId: string;
  marketKey: MarketKey;
  matchLabel: string;
  marketLabel: string;
  competition: string;
  kickoff: string;
  /** Cote de la source au moment de l'ajout (indicative). */
  odds: number | null;
  /** Cote saisie par l'utilisateur (prioritaire si définie). */
  customOdds: number | null;
  probability: number;
  addedAt: string;
}

interface SlipState {
  selections: SlipSelection[];
  add: (s: Omit<SlipSelection, "id" | "addedAt" | "customOdds">) => void;
  remove: (id: string) => void;
  toggle: (s: Omit<SlipSelection, "id" | "addedAt" | "customOdds">) => boolean;
  setCustomOdds: (id: string, odds: number | null) => void;
  clear: () => void;
}

export const MAX_SELECTIONS = 15;
export const selectionId = (matchId: string, marketKey: string) => `${matchId}:${marketKey}`;

export const useBetSlip = create<SlipState>()(
  persist(
    (set, get) => ({
      selections: [],
      add: (s) => {
        const id = selectionId(s.matchId, s.marketKey);
        if (get().selections.some((x) => x.id === id) || get().selections.length >= MAX_SELECTIONS) return;
        set({ selections: [...get().selections, { ...s, id, customOdds: null, addedAt: new Date().toISOString() }] });
      },
      remove: (id) => set({ selections: get().selections.filter((x) => x.id !== id) }),
      toggle: (s) => {
        const id = selectionId(s.matchId, s.marketKey);
        if (get().selections.some((x) => x.id === id)) {
          get().remove(id);
          return false;
        }
        if (get().selections.length >= MAX_SELECTIONS) return false;
        get().add(s);
        return true;
      },
      setCustomOdds: (id, odds) => set({ selections: get().selections.map((x) => (x.id === id ? { ...x, customOdds: odds } : x)) }),
      clear: () => set({ selections: [] }),
    }),
    { name: "kairos-bet-slip", version: 1, storage: createJSONStorage(() => localStorage) },
  ),
);
