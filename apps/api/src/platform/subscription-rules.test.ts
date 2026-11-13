import { describe, expect, it } from 'vitest';
import { accessWindow, validateOfferingValidity } from './subscription-rules';

describe('subscription access rules', () => {
  it('keeps a configured 15-day calendar window open through its end date', () => {
    const offering = { validityMode:'date_range' as const, validityStartDate:'2026-11-01', validityEndDate:'2026-11-15' };
    expect(accessWindow(offering,new Date('2026-11-15T18:29:59Z')).available).toBe(true);
    expect(accessWindow(offering,new Date('2026-11-15T18:30:00Z')).available).toBe(false);
  });
  it('supports arbitrary valid date ranges', () => {
    expect(() => validateOfferingValidity({validityMode:'date_range',validityStartDate:'2026-11-03',validityEndDate:'2026-12-22'})).not.toThrow();
  });
  it('uses a configurable trial duration when selected', () => {
    const expiry=accessWindow({validityMode:'duration',validityValue:12,validityUnit:'months',freeTrialDays:15},new Date('2026-11-13T10:00:00Z')).expiresAt;
    expect(expiry.toISOString()).toBe('2026-11-28T10:00:00.000Z');
  });
  it('rejects inverted date ranges', () => {
    expect(() => validateOfferingValidity({validityMode:'date_range',validityStartDate:'2026-11-16',validityEndDate:'2026-11-15'})).toThrow(/valid start and end/);
  });
});
