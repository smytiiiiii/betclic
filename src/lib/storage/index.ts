import "server-only";
import { env, storageDriver } from "@/lib/config/env";
import { FileRepository } from "./file-store";
import type { Repository } from "./types";

let repo: Repository | null = null;

/**
 * Renvoie le dépôt de persistance configuré :
 * - PostgreSQL (Prisma) si DATABASE_URL est défini (ou STORAGE_DRIVER=postgres) ;
 * - sinon un fichier JSON local dans DATA_DIR.
 */
export async function getRepository(): Promise<Repository> {
  if (repo) return repo;
  const e = env();
  if (storageDriver() === "postgres") {
    if (!e.DATABASE_URL) throw new Error("STORAGE_DRIVER=postgres nécessite DATABASE_URL");
    // Import dynamique : le client Prisma n'est chargé que s'il est utilisé.
    const { PrismaRepository } = await import("./prisma-store");
    repo = new PrismaRepository(e.DATABASE_URL);
  } else {
    repo = new FileRepository(e.DATA_DIR);
  }
  return repo;
}

export type { Repository } from "./types";
