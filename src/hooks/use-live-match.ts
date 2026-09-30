"use client";

import { useEffect, useRef, useState } from "react";
import type { LiveSnapshot, MatchStatus } from "@/lib/domain/types";
import { useNow } from "./use-now";

const ACTIVE: MatchStatus[] = ["LIVE", "HALFTIME"];

/**
 * Abonnement temps réel à un match : Server-Sent Events avec repli sur du
 * polling si le flux est indisponible. Inactif si le match n'est pas en cours.
 */
export function useLiveMatch(matchId: string, initialStatus: MatchStatus, kickoff: string, pollSeconds = 15) {
  const [snapshot, setSnapshot] = useState<LiveSnapshot | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sourceRef = useRef<EventSource | null>(null);

  // On s'abonne si le match est en cours ou commence dans moins de 15 minutes.
  const now = useNow();
  const startsSoon = initialStatus === "SCHEDULED" && now !== null && new Date(kickoff).getTime() - now < 15 * 60_000;
  const enabled = ACTIVE.includes(initialStatus) || startsSoon;
  const finished = initialStatus === "FINISHED";

  // Match terminé : un seul chargement de l'instantané final (déroulé, stats).
  useEffect(() => {
    if (!finished) return;
    let cancelled = false;
    fetch(`/api/live/${encodeURIComponent(matchId)}`, { cache: "no-store" })
      .then((res) => (res.ok ? (res.json() as Promise<LiveSnapshot>) : Promise.reject(new Error())))
      .then((snap) => {
        if (!cancelled) setSnapshot(snap);
      })
      .catch(() => {
        if (!cancelled) setError("Déroulé du match indisponible");
      });
    return () => {
      cancelled = true;
    };
  }, [finished, matchId]);

  useEffect(() => {
    if (!enabled) return;
    let pollTimer: ReturnType<typeof setInterval> | undefined;
    let cancelled = false;

    const poll = async () => {
      try {
        const res = await fetch(`/api/live/${encodeURIComponent(matchId)}`, { cache: "no-store" });
        if (!res.ok) throw new Error();
        const snap = (await res.json()) as LiveSnapshot;
        if (!cancelled) {
          setSnapshot(snap);
          setError(null);
          if (!ACTIVE.includes(snap.status) && snap.status !== "SCHEDULED" && pollTimer) clearInterval(pollTimer);
        }
      } catch {
        if (!cancelled) setError("Mise à jour en direct indisponible");
      }
    };

    const startPolling = () => {
      if (pollTimer) return;
      poll();
      pollTimer = setInterval(poll, pollSeconds * 1000);
    };

    if (typeof EventSource !== "undefined") {
      const es = new EventSource(`/api/live/${encodeURIComponent(matchId)}/stream`);
      sourceRef.current = es;
      es.addEventListener("open", () => setConnected(true));
      es.addEventListener("snapshot", (e) => {
        try {
          const snap = JSON.parse((e as MessageEvent).data) as LiveSnapshot;
          setSnapshot(snap);
          setError(null);
          // Match terminé : on ferme le flux (évite les reconnexions automatiques).
          if (!ACTIVE.includes(snap.status) && snap.status !== "SCHEDULED") {
            es.close();
            setConnected(false);
          }
        } catch {
          /* message ignoré */
        }
      });
      es.addEventListener("error", () => {
        setConnected(false);
        // Flux fermé par le serveur (match terminé) ou coupure réseau : repli sur polling.
        if (es.readyState === EventSource.CLOSED) startPolling();
      });
    } else {
      startPolling();
    }

    return () => {
      cancelled = true;
      sourceRef.current?.close();
      if (pollTimer) clearInterval(pollTimer);
    };
  }, [enabled, matchId, pollSeconds]);

  return { snapshot, connected, error, enabled, finished };
}
