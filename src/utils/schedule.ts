/** Accepts "09:00", "9:00 AM", "5:30 pm" and returns minutes since midnight. */
export function timeToMinutes(time: string): number {
  const match = /^(\d{1,2}):(\d{2})\s*([ap]m)?$/i.exec((time || "").trim());
  if (!match) return 0;
  let h = Number(match[1]);
  const m = Number(match[2]);
  const mer = match[3]?.toLowerCase();
  if (mer === "pm" && h !== 12) h += 12;
  if (mer === "am" && h === 12) h = 0;
  return h * 60 + m;
}

const two = (n: number) => String(n).padStart(2, "0");

/** Every 30 minutes, labelled like the web schedule ("09:30 AM"). */
export const timeOptions = Array.from({ length: 48 }, (_, i) => {
  const mins = i * 30;
  const h24 = Math.floor(mins / 60);
  const m = mins % 60;
  const mer = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  const label = `${two(h12)}:${two(m)} ${mer}`;
  return { label, value: label };
});

/** Appointment dates in the mock data are "dd/MM". */
export const todayDDMM = () => {
  const d = new Date();
  return `${two(d.getDate())}/${two(d.getMonth() + 1)}`;
};
