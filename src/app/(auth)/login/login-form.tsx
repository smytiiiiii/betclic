"use client";

import { Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogoMark } from "@/components/common/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error?.message ?? "Connexion impossible");
      router.replace(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connexion impossible");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="card-surface w-full max-w-sm space-y-5 rounded-2xl p-8">
      <div className="flex flex-col items-center gap-3 text-center">
        <LogoMark className="size-11" />
        <div>
          <h1 className="text-lg font-semibold">Accès protégé</h1>
          <p className="text-sm text-muted-foreground">Saisissez le mot de passe de l&apos;application.</p>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Mot de passe</Label>
        <div className="relative">
          <Lock className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input id="password" type="password" autoComplete="current-password" autoFocus value={password} onChange={(e) => setPassword(e.target.value)} className="pl-9" aria-invalid={Boolean(error)} />
        </div>
        {error && <p className="text-xs text-negative">{error}</p>}
      </div>
      <Button type="submit" className="w-full" loading={loading} disabled={!password}>
        Se connecter
      </Button>
    </form>
  );
}
