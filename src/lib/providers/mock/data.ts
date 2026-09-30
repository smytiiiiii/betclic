/**
 * Référentiel FICTIF du provider de démonstration.
 *
 * Toutes les compétitions, équipes et stades ci-dessous sont inventés.
 * Toute ressemblance avec des clubs existants serait fortuite. Ces données
 * ne doivent jamais être présentées comme réelles.
 */

export interface DemoCompetitionSeed {
  id: string;
  code: string;
  name: string;
  shortName: string;
  country: { code: string; name: string; flag: string };
  /** Décalage (jours) du calendrier pour étaler les journées. */
  dayOffset: number;
  baseGoals: number;
  homeAdvantage: number;
  teams: { name: string; shortName: string; city: string; stadium: string }[];
}

export const DEMO_COMPETITIONS: DemoCompetitionSeed[] = [
  {
    id: "demo-fr",
    code: "fr",
    name: "Ligue Horizon",
    shortName: "Horizon",
    country: { code: "FR", name: "France", flag: "🇫🇷" },
    dayOffset: 0,
    baseGoals: 1.24,
    homeAdvantage: 0.21,
    teams: [
      { name: "FC Valmont", shortName: "Valmont", city: "Valmont", stadium: "Stade des Tilleuls" },
      { name: "Olympique de Varenne", shortName: "Varenne", city: "Varenne", stadium: "Parc de la Varenne" },
      { name: "AS Clairmont", shortName: "Clairmont", city: "Clairmont", stadium: "Stade Pierre-Aubrac" },
      { name: "Stade Rivelois", shortName: "Rivelois", city: "Rivel", stadium: "Stade du Bord-de-l'Eau" },
      { name: "RC Belcastel", shortName: "Belcastel", city: "Belcastel", stadium: "Arena Belcastel" },
      { name: "US Montaigu", shortName: "Montaigu", city: "Montaigu", stadium: "Stade des Remparts" },
      { name: "SC Portéval", shortName: "Portéval", city: "Portéval", stadium: "Stade de la Jetée" },
      { name: "AC Lorvenne", shortName: "Lorvenne", city: "Lorvenne", stadium: "Stade Lucien-Morel" },
      { name: "FC Saint-Aurèle", shortName: "St-Aurèle", city: "Saint-Aurèle", stadium: "Stade du Moulin" },
      { name: "Racing Hautmont", shortName: "Hautmont", city: "Hautmont", stadium: "Stade des Hauts" },
      { name: "Étoile de Mirebeau", shortName: "Mirebeau", city: "Mirebeau", stadium: "Stade de l'Étoile" },
      { name: "Union Sablières", shortName: "Sablières", city: "Sablières", stadium: "Stade des Dunes" },
    ],
  },
  {
    id: "demo-es",
    code: "es",
    name: "Liga Meridiana",
    shortName: "Meridiana",
    country: { code: "ES", name: "Espagne", flag: "🇪🇸" },
    dayOffset: 1,
    baseGoals: 1.2,
    homeAdvantage: 0.24,
    teams: [
      { name: "Real Solana", shortName: "Solana", city: "Solana", stadium: "Estadio del Sol" },
      { name: "Atlético Valdoria", shortName: "Valdoria", city: "Valdoria", stadium: "Estadio Valdoria" },
      { name: "CD Marisca", shortName: "Marisca", city: "Marisca", stadium: "Campo de la Marea" },
      { name: "Deportivo Almendra", shortName: "Almendra", city: "Almendra", stadium: "Estadio Los Almendros" },
      { name: "UD Costaverde", shortName: "Costaverde", city: "Costaverde", stadium: "Estadio Costaverde" },
      { name: "Sporting Castrillo", shortName: "Castrillo", city: "Castrillo", stadium: "El Castillo" },
      { name: "CF Brisamar", shortName: "Brisamar", city: "Brisamar", stadium: "Estadio Brisamar" },
      { name: "Racing Oliveda", shortName: "Oliveda", city: "Oliveda", stadium: "Campo de Olivos" },
      { name: "SD Peñalta", shortName: "Peñalta", city: "Peñalta", stadium: "Estadio La Peña" },
      { name: "Club Albarán", shortName: "Albarán", city: "Albarán", stadium: "Estadio Albarán" },
      { name: "CD Riomar", shortName: "Riomar", city: "Riomar", stadium: "Estadio Riomar" },
      { name: "Unión Sierranova", shortName: "Sierranova", city: "Sierranova", stadium: "Estadio de la Sierra" },
    ],
  },
  {
    id: "demo-en",
    code: "en",
    name: "Albion Premier League",
    shortName: "Albion PL",
    country: { code: "GB", name: "Angleterre", flag: "🇬🇧" },
    dayOffset: 2,
    baseGoals: 1.3,
    homeAdvantage: 0.18,
    teams: [
      { name: "Ashford Rovers", shortName: "Ashford", city: "Ashford", stadium: "Rovers Park" },
      { name: "Kingsbridge United", shortName: "Kingsbridge", city: "Kingsbridge", stadium: "Bridge Lane" },
      { name: "Harrowgate City", shortName: "Harrowgate", city: "Harrowgate", stadium: "City Ground Harrowgate" },
      { name: "Wexmoor Athletic", shortName: "Wexmoor", city: "Wexmoor", stadium: "Moorside" },
      { name: "Blackmere Town", shortName: "Blackmere", city: "Blackmere", stadium: "Mere Road" },
      { name: "Northfield Albion", shortName: "Northfield", city: "Northfield", stadium: "The Albion Ground" },
      { name: "Castlereach Wanderers", shortName: "Castlereach", city: "Castlereach", stadium: "Keep Park" },
      { name: "Redbrook FC", shortName: "Redbrook", city: "Redbrook", stadium: "Brookside Stadium" },
      { name: "Elmsworth County", shortName: "Elmsworth", city: "Elmsworth", stadium: "County Park" },
      { name: "Stonemoor Rangers", shortName: "Stonemoor", city: "Stonemoor", stadium: "Quarry Lane" },
      { name: "Thornbury Forest", shortName: "Thornbury", city: "Thornbury", stadium: "Forest Fields" },
      { name: "Millgate Palace", shortName: "Millgate", city: "Millgate", stadium: "Palace Meadow" },
    ],
  },
  {
    id: "demo-it",
    code: "it",
    name: "Serie Aurea",
    shortName: "Aurea",
    country: { code: "IT", name: "Italie", flag: "🇮🇹" },
    dayOffset: 2,
    baseGoals: 1.18,
    homeAdvantage: 0.2,
    teams: [
      { name: "AC Vallombra", shortName: "Vallombra", city: "Vallombra", stadium: "Stadio dell'Ombra" },
      { name: "Sporting Lucerna", shortName: "Lucerna", city: "Lucerna", stadium: "Stadio della Luce" },
      { name: "US Castellino", shortName: "Castellino", city: "Castellino", stadium: "Stadio Comunale Castellino" },
      { name: "Virtus Brenta", shortName: "Brenta", city: "Brenta", stadium: "Stadio del Fiume" },
      { name: "AS Ravenara", shortName: "Ravenara", city: "Ravenara", stadium: "Stadio Ravenara" },
      { name: "Polisportiva Arcadia", shortName: "Arcadia", city: "Arcadia", stadium: "Arena Arcadia" },
      { name: "US Torrenova", shortName: "Torrenova", city: "Torrenova", stadium: "Stadio della Torre" },
      { name: "FC Pietralba", shortName: "Pietralba", city: "Pietralba", stadium: "Stadio Pietralba" },
      { name: "Calcio Veloria", shortName: "Veloria", city: "Veloria", stadium: "Stadio Veloria" },
      { name: "Sporting Marenza", shortName: "Marenza", city: "Marenza", stadium: "Stadio del Mare" },
      { name: "AC Collebianco", shortName: "Collebianco", city: "Collebianco", stadium: "Stadio del Colle" },
      { name: "Dinamo Sabbiona", shortName: "Sabbiona", city: "Sabbiona", stadium: "Stadio Sabbiona" },
    ],
  },
  {
    id: "demo-de",
    code: "de",
    name: "Kaiserliga",
    shortName: "Kaiserliga",
    country: { code: "DE", name: "Allemagne", flag: "🇩🇪" },
    dayOffset: 1,
    baseGoals: 1.36,
    homeAdvantage: 0.19,
    teams: [
      { name: "FC Rheinwald", shortName: "Rheinwald", city: "Rheinwald", stadium: "Waldstadion Rheinwald" },
      { name: "SV Eichenfeld", shortName: "Eichenfeld", city: "Eichenfeld", stadium: "Eichenpark" },
      { name: "Borussia Talheim", shortName: "Talheim", city: "Talheim", stadium: "Talarena" },
      { name: "TSV Grünau", shortName: "Grünau", city: "Grünau", stadium: "Sportpark Grünau" },
      { name: "1. FC Bergstadt", shortName: "Bergstadt", city: "Bergstadt", stadium: "Bergstadion" },
      { name: "SC Nordhafen", shortName: "Nordhafen", city: "Nordhafen", stadium: "Hafenstadion" },
      { name: "VfB Lindenau", shortName: "Lindenau", city: "Lindenau", stadium: "Lindenpark" },
      { name: "Eintracht Wolfsgrund", shortName: "Wolfsgrund", city: "Wolfsgrund", stadium: "Grundarena" },
      { name: "Fortuna Mühlbach", shortName: "Mühlbach", city: "Mühlbach", stadium: "Mühlenstadion" },
      { name: "SpVgg Hohenstein", shortName: "Hohenstein", city: "Hohenstein", stadium: "Steinbruch-Arena" },
      { name: "Union Kesselbrunn", shortName: "Kesselbrunn", city: "Kesselbrunn", stadium: "Brunnenstadion" },
      { name: "Viktoria Seefeld", shortName: "Seefeld", city: "Seefeld", stadium: "Seestadion" },
    ],
  },
];

/** Paires de couleurs de maillot (primaire, secondaire). */
export const KIT_COLORS: [string, string][] = [
  ["#e11d48", "#ffffff"],
  ["#2563eb", "#ffffff"],
  ["#16a34a", "#f8fafc"],
  ["#f59e0b", "#111827"],
  ["#7c3aed", "#f5f3ff"],
  ["#0ea5e9", "#0f172a"],
  ["#111827", "#facc15"],
  ["#dc2626", "#111827"],
  ["#0d9488", "#ffffff"],
  ["#1e3a8a", "#fbbf24"],
  ["#be185d", "#fdf2f8"],
  ["#ea580c", "#ffffff"],
  ["#475569", "#e2e8f0"],
  ["#065f46", "#fde68a"],
  ["#9f1239", "#fecdd3"],
  ["#1d4ed8", "#ef4444"],
];

