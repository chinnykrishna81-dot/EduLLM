export type OfferingValidity = {
  validityMode: 'duration' | 'date_range';
  validityValue?: number | null;
  validityUnit?: 'days' | 'months' | null;
  validityStartDate?: string | Date | null;
  validityEndDate?: string | Date | null;
  freeTrialDays?: number | null;
};

const dateOnly = (value: string | Date | null | undefined) => {
  if (!value) return '';
  return value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
};

export const validateOfferingValidity = (offering: OfferingValidity) => {
  const trial = Number(offering.freeTrialDays || 0);
  if (!Number.isInteger(trial) || trial < 0 || trial > 365) throw new Error('Free trial must be between 0 and 365 days');
  if (offering.validityMode === 'duration') {
    const value = Number(offering.validityValue);
    if (!Number.isInteger(value) || value < 1 || !['days', 'months'].includes(String(offering.validityUnit))) throw new Error('Duration validity requires a positive whole number and days or months');
    return;
  }
  if (offering.validityMode !== 'date_range') throw new Error('Invalid validity mode');
  const start = dateOnly(offering.validityStartDate), end = dateOnly(offering.validityEndDate);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end) || end < start) throw new Error('Date-range validity requires a valid start and end date');
};

export const accessWindow = (offering: OfferingValidity, now = new Date()) => {
  validateOfferingValidity(offering);
  if (offering.validityMode === 'date_range') {
    const startDate = dateOnly(offering.validityStartDate), endDate = dateOnly(offering.validityEndDate);
    const startsAt = new Date(`${startDate}T00:00:00+05:30`), expiresAt = new Date(`${endDate}T00:00:00+05:30`);
    expiresAt.setUTCDate(expiresAt.getUTCDate() + 1);
    return { startsAt, expiresAt, available: now >= startsAt && now < expiresAt };
  }
  const startsAt = new Date(now), expiresAt = new Date(now), trial = Number(offering.freeTrialDays || 0);
  if (trial > 0) expiresAt.setUTCDate(expiresAt.getUTCDate() + trial);
  else if (offering.validityUnit === 'months') expiresAt.setUTCMonth(expiresAt.getUTCMonth() + Number(offering.validityValue));
  else expiresAt.setUTCDate(expiresAt.getUTCDate() + Number(offering.validityValue));
  return { startsAt, expiresAt, available: true };
};
