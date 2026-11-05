const pad = (n: number) => String(n).padStart(2, "0");

/** Today as YYYY-MM-DD (same as the web's <input type="date"> value). */
export const todayInputValue = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/** Build a YYYY-MM-DD string from loose text parts. Returns null when not a real date. */
export function toIso(day: string, month: string, year: string): string | null {
  const d = parseInt(day, 10),
    m = parseInt(month, 10),
    y = parseInt(year, 10);
  if (!d || !m || !y || year.length !== 4) return null;
  const dt = new Date(y, m - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d)
    return null;
  return `${y}-${pad(m)}-${pad(d)}`;
}

export const isoToParts = (iso?: string) => {
  const [y = "", m = "", d = ""] = (iso || "").split("-");
  return { day: d, month: m, year: y };
};

export const formatIsoDate = (iso?: string | null) => {
  if (!iso) return "";
  const { day, month, year } = isoToParts(iso);
  return `${day}/${month}/${year}`;
};

function totalMonths(dobIso?: string): number | null {
  if (!dobIso) return null;
  const [y, m, d] = dobIso.split("-").map(Number);
  if (!y || !m || !d) return null;
  const now = new Date();
  const months =
    (now.getFullYear() - y) * 12 +
    (now.getMonth() + 1 - m) -
    (now.getDate() < d ? 1 : 0);
  return months < 0 ? null : months;
}

const label = (months: number) => {
  const y = Math.floor(months / 12),
    m = months % 12;
  const parts = [
    y ? `${y} year${y > 1 ? "s" : ""}` : "",
    m ? `${m} month${m > 1 ? "s" : ""}` : "",
  ].filter(Boolean);
  return parts.join(" ") || "Less than a month";
};

export const formatAgeFromDob = (dobIso?: string) => {
  const months = totalMonths(dobIso);
  return months === null ? "" : label(months);
};

type AgeSource = { dob?: string; age?: string };

export function getPetAgeLabel(pet: AgeSource, fallback = "Age unknown") {
  const fromDob = formatAgeFromDob(pet.dob);
  return fromDob || pet.age || fallback;
}

export function getPetAgeYears(pet: AgeSource): number | null {
  const months = totalMonths(pet.dob);
  if (months !== null) return months / 12;
  if (!pet.age) return null;
  const y = /(\d+)\s*year/i.exec(pet.age),
    m = /(\d+)\s*month/i.exec(pet.age);
  if (!y && !m) return null;
  return (y ? +y[1] : 0) + (m ? +m[1] : 0) / 12;
}
