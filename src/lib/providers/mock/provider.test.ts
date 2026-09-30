import { describe, expect, it } from "vitest";
import { analyzeMatch } from "@/lib/engine/analyze";
import { DEFAULT_MODEL_SETTINGS } from "@/lib/domain/settings";
import { MockSportDataProvider } from "./provider";

const NOW = Date.UTC(2026, 8, 30, 15, 0);
const provider = new MockSportDataProvider(() => NOW);

describe("MockSportDataProvider", () => {
  it("is deterministic and flagged as demo", async () => {
    const a = await provider.getMatches({ from: new Date(NOW - 86_400_000).toISOString(), to: new Date(NOW + 86_400_000).toISOString() });
    const b = await new MockSportDataProvider(() => NOW).getMatches({ from: new Date(NOW - 86_400_000).toISOString(), to: new Date(NOW + 86_400_000).toISOString() });
    expect(a.length).toBeGreaterThan(10);
    expect(a.map((m) => m.id)).toEqual(b.map((m) => m.id));
    expect(a.every((m) => m.isDemo && m.competition.isDemo)).toBe(true);
  });

  it("never exposes results of future matches", async () => {
    const upcoming = await provider.getMatches({ from: new Date(NOW + 3_600_000).toISOString(), to: new Date(NOW + 5 * 86_400_000).toISOString() });
    expect(upcoming.length).toBeGreaterThan(0);
    expect(upcoming.every((m) => m.score === null && m.status === "SCHEDULED")).toBe(true);
  });

  it("returns team form strictly before a date", async () => {
    const [m] = await provider.getMatches({ from: new Date(NOW + 3_600_000).toISOString(), limit: 1 });
    const form = await provider.getTeamForm(m.homeTeam.id, { before: m.kickoff, limit: 10 });
    expect(form).toHaveLength(10);
    expect(form.every((r) => r.date < m.kickoff)).toBe(true);
    expect(form[0].date > form[9].date).toBe(true);
  });

  it("does not invent player availability", async () => {
    expect(await provider.getAvailability()).toEqual({ home: null, away: null });
  });

  it("produces a coherent analysis", async () => {
    const [m] = await provider.getMatches({ from: new Date(NOW + 3_600_000).toISOString(), limit: 1 });
    const [homeRecords, awayRecords, h2h, odds, standings] = await Promise.all([
      provider.getTeamForm(m.homeTeam.id, { before: m.kickoff, limit: 10 }),
      provider.getTeamForm(m.awayTeam.id, { before: m.kickoff, limit: 10 }),
      provider.getHeadToHead(m.homeTeam.id, m.awayTeam.id, { before: m.kickoff }),
      provider.getOdds(m.id),
      provider.getStandings(m.competition.id),
    ]);
    const analysis = analyzeMatch(
      {
        match: m,
        homeRecords,
        awayRecords,
        h2h,
        odds,
        availability: { home: null, away: null },
        league: { avgHomeGoals: 1.5, avgAwayGoals: 1.2, avgTotalCorners: 10, sample: 100 },
        standings,
      },
      DEFAULT_MODEL_SETTINGS,
    );
    const p = (k: string) => analysis.markets.find((x) => x.key === k)!.probability;
    expect(p("1X2_HOME") + p("1X2_DRAW") + p("1X2_AWAY")).toBeCloseTo(1, 3);
    expect(p("OU_2_5_OVER") + p("OU_2_5_UNDER")).toBeCloseTo(1, 3);
    expect(p("DC_1X")).toBeCloseTo(p("1X2_HOME") + p("1X2_DRAW"), 3);
    expect(analysis.factors.find((f) => f.key === "availability")!.available).toBe(false);
    expect(analysis.markets.every((x) => x.confidence.score >= 0 && x.confidence.score <= 100)).toBe(true);
    const weights = analysis.factors.filter((f) => f.available).reduce((s, f) => s + f.normalizedWeight, 0);
    expect(weights).toBeCloseTo(1, 3);
  });
});
