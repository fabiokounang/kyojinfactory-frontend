const EMPTY = '-';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function parseDate(value: string): Date | null {
  const trimmed = String(value).trim();
  if (!trimmed) return null;

  const dateOnly = trimmed.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
    const [y, m, d] = dateOnly.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isDateOnly(value: string): boolean {
  const trimmed = String(value).trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed);
}

function formatParts(date: Date) {
  return {
    day: date.getDate(),
    month: MONTHS[date.getMonth()],
    year: date.getFullYear(),
    h: pad2(date.getHours()),
    m: pad2(date.getMinutes()),
    s: pad2(date.getSeconds()),
  };
}

/** Tanggal saja: 28 Oct 2026 */
export function formatTableDate(value: string | null | undefined): string {
  if (!value) return EMPTY;
  const date = parseDate(value);
  if (!date) return value;
  const { day, month, year } = formatParts(date);
  return `${day} ${month} ${year}`;
}

/** Tanggal + waktu: 28 Oct 2026 15:00:00 */
export function formatTableDateTime(value: string | null | undefined): string {
  if (!value) return EMPTY;
  const date = parseDate(value);
  if (!date) return value;
  const { day, month, year, h, m, s } = formatParts(date);
  if (isDateOnly(value)) {
    return `${day} ${month} ${year}`;
  }
  return `${day} ${month} ${year} ${h}:${m}:${s}`;
}

export const formatDisplayDate = formatTableDate;
export const formatDisplayDateTime = formatTableDateTime;
