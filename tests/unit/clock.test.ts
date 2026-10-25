import { describe, expect, it } from 'vitest';
import { dispatchClock, dispatchHolidays } from '../../src/lib/clock';

function at(iso: string): Date {
  return new Date(iso);
}

describe('dispatchClock before cutoff', () => {
  it('counts down to 3:00 PM PKT on a weekday', () => {
    expect(dispatchClock(at('2026-10-21T11:48:00+05:00'))).toEqual({
      kind: 'today',
      chip: 'Dispatching today · order within 3 h 12 m',
      eta: 'Order within 3 h 12 m',
      within: '3 h 12 m',
    });
  });

  it('omits a zero hour or a zero minute', () => {
    expect(dispatchClock(at('2026-10-21T12:00:00+05:00')).within).toBe('3 h');
    expect(dispatchClock(at('2026-10-21T14:48:00+05:00')).within).toBe('12 m');
    expect(dispatchClock(at('2026-10-26T00:00:00+05:00')).within).toBe('15 h');
  });

  it('counts a full last minute as 1 m, and less than that minute as less than 1 m', () => {
    expect(dispatchClock(at('2026-10-21T14:59:00+05:00')).within).toBe('1 m');
    expect(dispatchClock(at('2026-10-21T14:59:59.999+05:00'))).toMatchObject({
      kind: 'today',
      within: 'less than 1 m',
      chip: 'Dispatching today · order within less than 1 m',
    });
  });

  it('still dispatches on Saturday morning', () => {
    const clock = dispatchClock(at('2026-10-24T14:00:00+05:00'));
    expect(clock.kind).toBe('today');
    expect(clock.chip).toBe('Dispatching today · order within 1 h');
    expect(clock.eta).toBe('Order within 1 h');
  });
});

describe('dispatchClock after cutoff', () => {
  it('says tomorrow once 3:00 PM PKT has passed on a weekday', () => {
    expect(dispatchClock(at('2026-10-21T15:00:00+05:00'))).toEqual({
      kind: 'next',
      chip: 'Order now for dispatch tomorrow',
      eta: 'Order now for dispatch tomorrow',
      within: null,
    });
    expect(dispatchClock(at('2026-10-21T18:30:00+05:00')).chip).toBe('Order now for dispatch tomorrow');
  });

  it('still says tomorrow on Friday, because Saturday is a dispatch day', () => {
    expect(dispatchClock(at('2026-10-23T16:00:00+05:00')).chip).toBe('Order now for dispatch tomorrow');
  });
});

describe('dispatchClock Saturday evening', () => {
  it('skips Sunday and names Monday, from a UTC instant that is still morning in other zones', () => {
    const clock = dispatchClock(at('2026-10-24T10:30:00Z'));
    expect(clock).toEqual({
      kind: 'next',
      chip: 'Order now for dispatch Monday',
      eta: 'Order now for dispatch Monday',
      within: null,
    });
  });
});

describe('dispatchClock Sunday', () => {
  it('says dispatch resumes Monday in the morning and the evening', () => {
    const morning = dispatchClock(at('2026-10-25T04:00:00Z'));
    const evening = dispatchClock(at('2026-10-25T21:00:00+05:00'));
    expect(morning).toEqual({
      kind: 'closed',
      chip: 'Dispatch resumes Monday',
      eta: 'Dispatch resumes Monday',
      within: null,
    });
    expect(evening.chip).toBe('Dispatch resumes Monday');
  });
});

describe('dispatch holidays', () => {
  it('ships with no dates until the owner lists them', () => {
    expect(dispatchHolidays).toEqual([]);
  });

  it('skips a listed weekday, including Wednesday at midnight', () => {
    expect(dispatchClock(at('2026-10-21T11:00:00+05:00'), ['2026-10-21']).chip).toBe('Dispatch resumes Thursday');
    expect(dispatchClock(at('2026-10-21T00:00:00+05:00'), ['2026-10-21']).chip).toBe('Dispatch resumes Thursday');
  });

  it('names the next open day when Monday is listed', () => {
    expect(dispatchClock(at('2026-10-25T11:00:00+05:00'), ['2026-10-26']).chip).toBe('Dispatch resumes Tuesday');
  });

  it('does not call a listed Saturday tomorrow', () => {
    expect(dispatchClock(at('2026-10-23T16:00:00+05:00'), ['2026-10-24']).chip).toBe('Order now for dispatch Monday');
  });

  it('walks past a run of listed days', () => {
    const clock = dispatchClock(at('2026-10-21T10:00:00+05:00'), ['2026-10-21', '2026-10-22']);
    expect(clock.chip).toBe('Dispatch resumes Friday');
  });

  it('ignores a value that is not a real calendar date', () => {
    expect(dispatchClock(at('2026-10-21T11:48:00+05:00'), ['2026-02-31', 'nope']).kind).toBe('today');
  });
});

describe('dispatchClock unreadable', () => {
  it('omits the chip and the ETA', () => {
    expect(dispatchClock(new Date(Number.NaN))).toEqual({
      kind: 'unknown',
      chip: null,
      eta: null,
      within: null,
    });
  });
});
