import type { NextRequest } from "next/server";
import { env } from "@/lib/config/env";
import { getProvider } from "@/lib/providers";

/**
 * Flux Server-Sent Events : pousse un instantané (score, minute, événements,
 * statistiques et cotes live) à chaque changement. Le serveur interroge la
 * source toutes les LIVE_POLL_INTERVAL_SECONDS secondes ; un fournisseur
 * disposant de webhooks/websockets pourrait alimenter ce flux directement.
 */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/live/[id]/stream">) {
  const { id } = await ctx.params;
  const provider = getProvider();
  const intervalMs = env().LIVE_POLL_INTERVAL_SECONDS * 1000;
  const encoder = new TextEncoder();
  let timer: ReturnType<typeof setInterval> | undefined;
  let last = "";
  let closed = false;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        if (closed) return;
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };
      const tick = async () => {
        try {
          const snap = await provider.getLiveSnapshot(id);
          if (!snap) {
            send("error", { message: "Match introuvable" });
            return close();
          }
          const { updatedAt, ...rest } = snap;
          const key = JSON.stringify(rest);
          if (key !== last) {
            last = key;
            send("snapshot", { ...rest, updatedAt });
          } else if (!closed) {
            controller.enqueue(encoder.encode(`: keep-alive ${updatedAt}\n\n`));
          }
          if (snap.status === "FINISHED" || snap.status === "CANCELLED" || snap.status === "POSTPONED") close();
        } catch {
          send("error", { message: "Source temps réel momentanément indisponible" });
        }
      };
      const close = () => {
        if (closed) return;
        closed = true;
        if (timer) clearInterval(timer);
        try {
          controller.close();
        } catch {
          /* déjà fermé */
        }
      };
      req.signal.addEventListener("abort", close);
      await tick();
      if (!closed) timer = setInterval(tick, intervalMs);
    },
    cancel() {
      closed = true;
      if (timer) clearInterval(timer);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
