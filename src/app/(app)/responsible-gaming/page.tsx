import type { Metadata } from "next";
import { AlertTriangle, BarChart3, Clock, ExternalLink, HeartHandshake, Scale, ShieldCheck, Wallet } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Jeu responsable" };

const PRINCIPLES = [
  { icon: BarChart3, title: "Des analyses, pas des certitudes", text: "Kairos produit des probabilités statistiques estimées. Aucune prédiction n'est certaine : un événement estimé à 70 % ne se produit pas environ 3 fois sur 10." },
  { icon: Scale, title: "Le passé ne garantit pas l'avenir", text: "Les performances historiques du modèle (backtest) ne garantissent pas les résultats futurs. Les écarts statistiques ne sont pas des promesses de gain." },
  { icon: Wallet, title: "Un risque de perte financière", text: "Les paris sportifs comportent un risque réel de perte d'argent. Ne misez que des sommes que vous pouvez vous permettre de perdre, jamais de l'argent destiné à vos dépenses essentielles." },
  { icon: ShieldCheck, title: "Respectez la loi", text: "Les jeux d'argent sont interdits aux mineurs. Respectez la législation applicable dans votre pays et n'utilisez que des opérateurs légalement autorisés." },
];

const SIGNS = [
  "Vous misez plus que prévu ou cherchez à « vous refaire » après une perte.",
  "Vous empruntez de l'argent ou utilisez des fonds destinés à d'autres dépenses.",
  "Les paris affectent votre humeur, votre sommeil, votre travail ou vos relations.",
  "Vous cachez à vos proches le temps ou l'argent consacré aux paris.",
  "Vous avez du mal à arrêter ou à faire des pauses.",
];

export default function ResponsibleGamingPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Jeu responsable" description="Kairos est un outil d'analyse statistique. Il n'est pas un opérateur de paris et ne vous incite jamais à parier." />

      <div className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/5 p-5">
        <AlertTriangle className="mt-0.5 size-6 shrink-0 text-warning" />
        <div className="text-sm leading-relaxed">
          <p className="text-base font-semibold">Les paris comportent des risques : endettement, dépendance…</p>
          <p className="mt-1 text-muted-foreground">
            Aucune analyse, aussi rigoureuse soit-elle, ne permet de gagner à coup sûr. Les opérateurs intègrent une marge dans leurs cotes : sur le long terme,
            la grande majorité des parieurs perd de l&apos;argent.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {PRINCIPLES.map((p) => (
          <Card key={p.title}>
            <CardContent className="flex gap-4 pt-5">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-2 text-primary">
                <p.icon className="size-5" />
              </span>
              <div>
                <p className="font-semibold">{p.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{p.text}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="size-4 text-primary" /> Outils disponibles dans Kairos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Seuil d&apos;alerte lorsqu&apos;une mise dépasse un pourcentage de votre bankroll.</li>
              <li>• Limites de perte journalière et hebdomadaire, avec option de blocage strict.</li>
              <li>• Confirmation obligatoire avant d&apos;enregistrer une mise élevée.</li>
              <li>• Rappel de pause après une durée d&apos;utilisation configurable.</li>
              <li>• Affichage systématique du niveau de risque statistique des combinés.</li>
            </ul>
            <Button asChild variant="secondary" className="mt-4">
              <Link href="/settings#bankroll">Configurer mes limites</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HeartHandshake className="size-4 text-primary" /> Signaux d&apos;alerte
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {SIGNS.map((s) => (
                <li key={s}>• {s}</li>
              ))}
            </ul>
            <p className="mt-4 text-sm">
              Si vous vous reconnaissez dans l&apos;un de ces signaux, parlez-en et faites-vous aider. En France, le service{" "}
              <strong>Joueurs Info Service</strong> est joignable au <strong>09 74 75 13 13</strong> (appel non surtaxé, 7j/7).
            </p>
            <Button asChild variant="link" size="sm" className="mt-2">
              <a href="https://www.joueurs-info-service.fr/" target="_blank" rel="noopener noreferrer">
                joueurs-info-service.fr <ExternalLink />
              </a>
            </Button>
            <p className="mt-2 text-xs text-subtle-foreground">Hors de France, rapprochez-vous des services d&apos;aide de votre pays.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
