"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

/** Appel d'API mutante + rafraîchissement des données serveur + notifications. */
export function useApiMutation() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [, startTransition] = useTransition();

  const run = async <T,>(url: string, init: RequestInit, success?: string): Promise<T | null> => {
    setPending(true);
    try {
      const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init.headers ?? {}) } });
      const body = res.status === 204 ? null : await res.json().catch(() => null);
      if (!res.ok) {
        const details = (body?.error?.details as { message: string }[] | undefined)?.map((d) => d.message).join(" · ");
        throw new Error(details || body?.error?.message || "Opération impossible");
      }
      if (success) toast.success(success);
      startTransition(() => router.refresh());
      return body as T;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Opération impossible");
      return null;
    } finally {
      setPending(false);
    }
  };

  return { run, pending };
}
