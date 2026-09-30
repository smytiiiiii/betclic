"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { useApp } from "./app-context";

const KEY = "kairos-session-start";

/** Rappel de pause périodique (jeu responsable), configurable dans les paramètres. */
export function SessionReminder() {
  const { sessionReminderMinutes } = useApp();
  useEffect(() => {
    if (!sessionReminderMinutes) return;
    let start = Date.now();
    try {
      const stored = Number(sessionStorage.getItem(KEY));
      if (stored && Number.isFinite(stored)) start = stored;
      else sessionStorage.setItem(KEY, String(start));
    } catch {
      /* stockage indisponible : on part de maintenant */
    }
    const intervalMs = sessionReminderMinutes * 60_000;
    const elapsed = Date.now() - start;
    const firstDelay = intervalMs - (elapsed % intervalMs);
    let timer: ReturnType<typeof setInterval> | undefined;
    const notify = () => {
      const minutes = Math.round((Date.now() - start) / 60_000);
      toast.info(`Vous utilisez Kairos depuis ${minutes} minutes`, {
        description: "Pensez à faire une pause. Les analyses statistiques ne garantissent aucun résultat.",
        duration: 12_000,
      });
    };
    const first = setTimeout(() => {
      notify();
      timer = setInterval(notify, intervalMs);
    }, firstDelay);
    return () => {
      clearTimeout(first);
      if (timer) clearInterval(timer);
    };
  }, [sessionReminderMinutes]);
  return null;
}
