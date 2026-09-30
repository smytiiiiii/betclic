"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="fr">
      <body style={{ background: "#07090a", color: "#edf1f3", fontFamily: "system-ui, sans-serif", display: "grid", placeItems: "center", minHeight: "100vh", margin: 0 }}>
        <div style={{ textAlign: "center", padding: 24 }}>
          <h1 style={{ fontSize: 20, marginBottom: 8 }}>Une erreur inattendue est survenue</h1>
          <p style={{ color: "#8d99a4", marginBottom: 16 }}>Veuillez réessayer dans un instant.</p>
          <button onClick={reset} style={{ background: "#3ce39b", color: "#03140c", border: 0, borderRadius: 8, padding: "10px 16px", fontWeight: 600, cursor: "pointer" }}>
            Réessayer
          </button>
        </div>
      </body>
    </html>
  );
}
