"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** true uniquement côté client après hydratation (évite les écarts SSR/stockage local). */
export function useMounted() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
