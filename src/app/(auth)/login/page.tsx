import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { LoginForm } from "./login-form";
import { authEnabled } from "@/lib/security/session";

export const metadata: Metadata = { title: "Connexion" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  await connection();
  if (!authEnabled()) redirect("/");
  const sp = await searchParams;
  const next = typeof sp.next === "string" && sp.next.startsWith("/") && !sp.next.startsWith("//") ? sp.next : "/";
  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <LoginForm next={next} />
    </div>
  );
}
