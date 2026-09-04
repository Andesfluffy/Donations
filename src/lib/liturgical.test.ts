import { describe, expect, it } from "vitest";

import { adventStart, easterSunday, getLiturgicalSeason } from "./liturgical";

const iso = (date: Date) => date.toISOString().slice(0, 10);
const utc = (s: string) => new Date(`${s}T12:00:00.000Z`);

describe("easterSunday", () => {
  // Published Gregorian Easter dates — these are facts, not fixtures, so a
  // regression in the computus is caught rather than re-baselined.
  it.each([
    [2024, "2024-03-31"],
    [2025, "2025-04-20"],
    [2026, "2026-04-05"],
    [2027, "2027-03-28"],
    [2028, "2028-04-16"],
    [2030, "2030-04-21"],
    [2000, "2000-04-23"],
    [2038, "2038-04-25"],
  ])("computes Easter %i", (year, expected) => {
    expect(iso(easterSunday(year))).toBe(expected);
  });
});

describe("adventStart", () => {
  it.each([
    [2024, "2024-12-01"],
    [2025, "2025-11-30"],
    [2026, "2026-11-29"],
    [2027, "2027-11-28"],
    [2028, "2028-12-03"],
  ])("finds the first Sunday of Advent %i", (year, expected) => {
    expect(iso(adventStart(year))).toBe(expected);
  });

  it("always lands between 27 November and 3 December", () => {
    for (let year = 2020; year <= 2050; year++) {
      const start = adventStart(year);
      expect(start.getUTCDay()).toBe(0); // a Sunday
      const monthDay = iso(start).slice(5);
      expect(monthDay >= "11-27" && monthDay <= "12-03").toBe(true);
    }
  });
});

describe("getLiturgicalSeason", () => {
  it("marks Ash Wednesday 2026 as Lent", () => {
    // Easter 2026 is 5 April, so Ash Wednesday is 18 February.
    expect(getLiturgicalSeason(utc("2026-02-18"))).toBe("lent");
  });

  it("marks Palm Sunday through Holy Saturday as Holy Week, not Lent", () => {
    expect(getLiturgicalSeason(utc("2026-03-29"))).toBe("passion");
    expect(getLiturgicalSeason(utc("2026-04-03"))).toBe("passion");
    expect(getLiturgicalSeason(utc("2026-04-04"))).toBe("passion");
  });

  it("marks Easter Sunday and Eastertide", () => {
    expect(getLiturgicalSeason(utc("2026-04-05"))).toBe("easter");
    expect(getLiturgicalSeason(utc("2026-05-01"))).toBe("easter");
  });

  it("marks Pentecost as its own day", () => {
    // Easter 2026 + 49 days = 24 May 2026.
    expect(getLiturgicalSeason(utc("2026-05-24"))).toBe("pentecost");
  });

  it("returns Ordinary Time after Pentecost and before Advent", () => {
    expect(getLiturgicalSeason(utc("2026-07-15"))).toBe("ordinary");
    expect(getLiturgicalSeason(utc("2026-11-28"))).toBe("ordinary");
  });

  it("marks Advent from its first Sunday to Christmas Eve", () => {
    expect(getLiturgicalSeason(utc("2026-11-29"))).toBe("advent");
    expect(getLiturgicalSeason(utc("2026-12-24"))).toBe("advent");
  });

  it("marks Gaudete and Laetare Sundays", () => {
    expect(getLiturgicalSeason(utc("2026-12-13"))).toBe("gaudete");
    expect(getLiturgicalSeason(utc("2026-03-15"))).toBe("laetare");
  });

  it("carries Christmastide across the new year", () => {
    expect(getLiturgicalSeason(utc("2026-12-25"))).toBe("christmas");
    expect(getLiturgicalSeason(utc("2026-12-31"))).toBe("christmas");
    expect(getLiturgicalSeason(utc("2026-01-04"))).toBe("christmas");
  });

  it("never returns undefined for any day across three decades", () => {
    const valid = new Set([
      "advent", "gaudete", "christmas", "ordinary", "lent",
      "laetare", "passion", "easter", "pentecost",
    ]);
    for (let day = new Date(Date.UTC(2020, 0, 1)); day.getUTCFullYear() < 2050; ) {
      expect(valid.has(getLiturgicalSeason(day))).toBe(true);
      day = new Date(day.getTime() + 86_400_000);
    }
  });
});
