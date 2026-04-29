export const BRAZIL_TIME_ZONE = 'America/Sao_Paulo';

const dateOnlyFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: BRAZIL_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const readableDateFormatter = new Intl.DateTimeFormat('pt-BR', {
  timeZone: BRAZIL_TIME_ZONE,
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

const monthYearFormatter = new Intl.DateTimeFormat('pt-BR', {
  timeZone: BRAZIL_TIME_ZONE,
  month: 'long',
  year: 'numeric',
});

const parseISODate = (isoDate: string) => {
  const [year, month, day] = isoDate.split('-').map(Number);
  return { year, month, day };
};

const formatDatePartsToISO = (date: Date) => {
  const parts = dateOnlyFormatter.formatToParts(date);
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;

  if (!year || !month || !day) {
    throw new Error('Unable to format date to ISO in Brasilia timezone.');
  }

  return `${year}-${month}-${day}`;
};

export const getTodayISODateInBrazil = () => formatDatePartsToISO(new Date());

export const toISODateInBrazil = (date: Date) => formatDatePartsToISO(date);

export const formatReadableDateInBrazil = (date: Date) => readableDateFormatter.format(date);

export const formatMonthYearInBrazil = (date: Date) => monthYearFormatter.format(date);

export const formatDateInBrazil = (value: string | Date) => {
  const date = typeof value === 'string' ? new Date(value) : value;

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: BRAZIL_TIME_ZONE,
    year: '2-digit',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
};

export const addDaysToISODate = (isoDate: string, days: number) => {
  const { year, month, day } = parseISODate(isoDate);
  const utcDate = new Date(Date.UTC(year, month - 1, day));
  utcDate.setUTCDate(utcDate.getUTCDate() + days);
  return utcDate.toISOString().slice(0, 10);
};

export const addMonthsClampedToISODate = (isoDate: string, months: number) => {
  const { year, month, day } = parseISODate(isoDate);
  const utcDate = new Date(Date.UTC(year, month - 1, 1));
  utcDate.setUTCMonth(utcDate.getUTCMonth() + months);

  const daysInTargetMonth = new Date(
    Date.UTC(utcDate.getUTCFullYear(), utcDate.getUTCMonth() + 1, 0)
  ).getUTCDate();

  utcDate.setUTCDate(Math.min(day, daysInTargetMonth));
  return utcDate.toISOString().slice(0, 10);
};

export const isSameBrazilDate = (date: Date, isoDate: string) => {
  return toISODateInBrazil(date) === isoDate;
};
