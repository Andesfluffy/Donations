/**
 * Liturgical season for a given date, used to tint the site's accent rule.
 *
 * Everything hangs off Easter, so we compute it properly with the
 * Meeus/Jones/Butcher Gregorian algorithm rather than shipping a lookup table
 * that expires. All arithmetic is in UTC to keep the season from flipping a day
 * early for readers east of the server.
 *
 * This follows the Roman Rite, Ordinary Form. Local calendars vary (Epiphany
 * and Ascension get transferred to a Sunday in some conferences); the tint is
 * decorative, so approximating those is acceptable — misreporting a date is
 * not, which is why nothing here is exposed as a published date.
 */

export type LiturgicalSeason =
  | "advent"
  | "gaudete"
  | "christmas"
  | "ordinary"
  | "lent"
  | "laetare"
  | "passion"
  | "easter"
  | "pentecost";

const DAY_MS = 86_400_000;

function utc(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month, day));
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

/** Strip the time component so comparisons are date-only. */
function startOfUtcDay(date: Date): Date {
  return utc(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

/** Easter Sunday (Gregorian) — Meeus/Jones/Butcher. */
export function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3 = March, 4 = April
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return utc(year, month - 1, day);
}

/**
 * First Sunday of Advent: the fourth Sunday before Christmas Day, which always
 * lands between 27 November and 3 December.
 */
export function adventStart(year: number): Date {
  const christmas = utc(year, 11, 25);
  // Sunday before Christmas (or Christmas itself if it is a Sunday)
  const christmasDow = christmas.getUTCDay();
  const fourthSundayBefore = addDays(christmas, -(christmasDow === 0 ? 28 : christmasDow + 21));
  return fourthSundayBefore;
}

/**
 * Baptism of the Lord — the Sunday after Epiphany, and the end of Christmas.
 * Where Epiphany is transferred to a Sunday and falls on 7 or 8 January, the
 * Baptism moves to the following Monday.
 */
export function baptismOfTheLord(year: number): Date {
  const epiphany = utc(year, 0, 6);
  const dow = epiphany.getUTCDay();
  return addDays(epiphany, dow === 0 ? 7 : 7 - dow);
}

export function getLiturgicalSeason(date: Date = new Date()): LiturgicalSeason {
  const today = startOfUtcDay(date);
  const year = today.getUTCFullYear();

  const easter = easterSunday(year);
  const ashWednesday = addDays(easter, -46);
  const laetare = addDays(easter, -21); // Fourth Sunday of Lent
  const palmSunday = addDays(easter, -7);
  const pentecost = addDays(easter, 49);
  const advent = adventStart(year);
  const gaudete = addDays(advent, 14); // Third Sunday of Advent
  const christmasDay = utc(year, 11, 25);
  const baptism = baptismOfTheLord(year);

  const on = (d: Date) => today.getTime() === d.getTime();
  const between = (from: Date, to: Date) =>
    today.getTime() >= from.getTime() && today.getTime() <= to.getTime();

  // Single-day observances first — they sit inside longer seasons.
  if (on(gaudete)) return "gaudete";
  if (on(laetare)) return "laetare";
  if (on(pentecost)) return "pentecost";

  // Christmastide spans the new year, so January is checked against this
  // year's Baptism of the Lord before anything else.
  if (between(utc(year, 0, 1), baptism)) return "christmas";
  if (between(christmasDay, utc(year, 11, 31))) return "christmas";

  if (between(advent, addDays(christmasDay, -1))) return "advent";

  // Holy Week and the Triduum are red, not violet.
  if (between(palmSunday, addDays(easter, -1))) return "passion";
  if (between(ashWednesday, addDays(palmSunday, -1))) return "lent";
  if (between(easter, pentecost)) return "easter";

  return "ordinary";
}

const SEASON_LABELS: Record<LiturgicalSeason, string> = {
  advent: "Advent",
  gaudete: "Gaudete Sunday",
  christmas: "Christmastide",
  ordinary: "Ordinary Time",
  lent: "Lent",
  laetare: "Laetare Sunday",
  passion: "Holy Week",
  easter: "Eastertide",
  pentecost: "Pentecost",
};

export function seasonLabel(season: LiturgicalSeason): string {
  return SEASON_LABELS[season];
}
