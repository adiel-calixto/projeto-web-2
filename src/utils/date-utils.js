export const TIME_ZONE = 'America/Fortaleza';

const weekdayFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: TIME_ZONE,
  weekday: 'short',
});

const localDateFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: TIME_ZONE,
  calendar: 'gregory',
  numberingSystem: 'latn',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function formatLocalDate(date) {
  const parts = Object.fromEntries(
    localDateFormatter.formatToParts(date).map(({ type, value }) => [type, value]),
  );

  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function isWeekday(date = new Date()) {
  return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].includes(weekdayFormatter.format(date));
}

export function isValidDateParam(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function filterLogsByDate(logs, date) {
  return logs.filter((entry) => formatLocalDate(entry.timestamp) === date);
}
