import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { TZDate } from "@date-fns/tz";
import {
  isHoliday,
  isOffHours,
  getDefaultStartDate,
  getEndDateByChargePeriod,
  getDuration
} from "./index.js";

// Sample holidays for testing
const holidays = [
  "2024-12-25", // Wednesday - Christmas
  "2024-01-01", // Monday - New Year's Day
  "2024-07-04", // Thursday - Independence Day
  "2024-11-28", // Thursday - Thanksgiving
];

describe("isHoliday", () => {
  it("returns true for a date that is a holiday", () => {
    const christmas = new TZDate(2024, 11, 25, "America/Chicago");
    expect(isHoliday(christmas, holidays)).toBe(true);
  });

  it("returns false for a date that is not a holiday", () => {
    const regularDay = new TZDate(2024, 11, 26, "America/Chicago");
    expect(isHoliday(regularDay, holidays)).toBe(false);
  });

  it("returns false for an empty holidays array", () => {
    const christmas = new TZDate(2024, 11, 25, "America/Chicago");
    expect(isHoliday(christmas, [])).toBe(false);
  });

  it("throws error for invalid date", () => {
    expect(() => isHoliday(null, holidays)).toThrow("testDate must be a valid date object");
    expect(() => isHoliday(undefined, holidays)).toThrow("testDate must be a valid date object");
    expect(() => isHoliday(new Date("invalid"), holidays)).toThrow("testDate must be a valid date object");
  });

  it("throws error when holidays is not an array", () => {
    const date = new TZDate(2024, 11, 25, "America/Chicago");
    expect(() => isHoliday(date, null)).toThrow("holidays must be an array");
    expect(() => isHoliday(date, "2024-12-25")).toThrow("holidays must be an array");
    expect(() => isHoliday(date, {})).toThrow("holidays must be an array");
  });
});

describe("isOffHours", () => {
  it("returns true before 8am", () => {
    const earlyMorning = new TZDate(2024, 5, 15, 7, 59, 0, "America/Chicago");
    expect(isOffHours(earlyMorning)).toBe(true);
  });

  it("returns false at exactly 8am", () => {
    const openingTime = new TZDate(2024, 5, 15, 8, 0, 0, "America/Chicago");
    expect(isOffHours(openingTime)).toBe(false);
  });

  it("returns false during business hours (e.g., 12pm)", () => {
    const midday = new TZDate(2024, 5, 15, 12, 0, 0, "America/Chicago");
    expect(isOffHours(midday)).toBe(false);
  });

  it("returns false at exactly 4pm", () => {
    const closingTime = new TZDate(2024, 5, 15, 16, 0, 0, "America/Chicago");
    expect(isOffHours(closingTime)).toBe(false);
  });

  it("returns true after 4pm", () => {
    const afterClose = new TZDate(2024, 5, 15, 16, 1, 0, "America/Chicago");
    expect(isOffHours(afterClose)).toBe(true);
  });

  it("returns true late at night", () => {
    const lateNight = new TZDate(2024, 5, 15, 23, 0, 0, "America/Chicago");
    expect(isOffHours(lateNight)).toBe(true);
  });

  it("throws error for invalid date", () => {
    expect(() => isOffHours(null)).toThrow("date must be a valid date object");
    expect(() => isOffHours(undefined)).toThrow("date must be a valid date object");
    expect(() => isOffHours(new Date("invalid"))).toThrow("date must be a valid date object");
  });
});

describe("getDefaultStartDate", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns today at 9am if before 8am on a weekday", () => {
    // Monday June 17, 2024 at 7am Chicago time
    vi.setSystemTime(new Date("2024-06-17T12:00:00Z")); // 7am Chicago (CDT)
    const result = getDefaultStartDate([]);
    expect(result.getHours()).toBe(9);
    expect(result.getMinutes()).toBe(0);
    expect(result.getDate()).toBe(17);
  });

  it("returns tomorrow at 9am if after 8am on a weekday", () => {
    // Monday June 17, 2024 at 10am Chicago time
    vi.setSystemTime(new Date("2024-06-17T15:00:00Z")); // 10am Chicago (CDT)
    const result = getDefaultStartDate([]);
    expect(result.getHours()).toBe(9);
    expect(result.getDate()).toBe(18);
  });

  it("skips weekends", () => {
    // Friday June 14, 2024 at 10am Chicago time
    vi.setSystemTime(new Date("2024-06-14T15:00:00Z")); // 10am Chicago (CDT)
    const result = getDefaultStartDate([]);
    // Should skip Saturday (15) and Sunday (16), land on Monday (17)
    expect(result.getDate()).toBe(17);
    expect(result.getDay()).toBe(1); // Monday
  });

  it("skips holidays", () => {
    // Tuesday July 2, 2024 at 10am Chicago time (day before July 4 holiday)
    vi.setSystemTime(new Date("2024-07-02T15:00:00Z"));
    const result = getDefaultStartDate(["2024-07-03", "2024-07-04"]);
    // Should skip July 3 and July 4 holidays, land on July 5
    expect(result.getDate()).toBe(5);
  });

  it("skips both weekends and holidays", () => {
    // Thursday Dec 19, 2024 at 10am - Christmas is on Wednesday Dec 25
    vi.setSystemTime(new Date("2024-12-19T16:00:00Z"));
    const result = getDefaultStartDate(["2024-12-25"]);
    // Dec 20 (Fri) should be ok
    expect(result.getDate()).toBe(20);
  });

  it("throws error when holidays is not an array", () => {
    vi.setSystemTime(new Date("2024-06-17T15:00:00Z"));
    expect(() => getDefaultStartDate(null)).toThrow("holidays must be an array");
    expect(() => getDefaultStartDate("invalid")).toThrow("holidays must be an array");
  });
});

describe("getEndDateByChargePeriod", () => {
  it("returns next day for 1 chargeable day (no weekends/holidays)", () => {
    // Monday June 17, 2024
    const startDate = new TZDate(2024, 5, 17, 9, 0, 0, "America/Chicago");
    const result = getEndDateByChargePeriod(startDate, 1, []);
    expect(result.getDate()).toBe(18); // Tuesday
  });

  it("calculates correctly for multiple chargeable days", () => {
    // Monday June 17, 2024
    const startDate = new TZDate(2024, 5, 17, 9, 0, 0, "America/Chicago");
    const result = getEndDateByChargePeriod(startDate, 3, []);
    expect(result.getDate()).toBe(20); // Thursday (Tue, Wed, Thu = 3 days)
  });

  it("skips weekends when calculating chargeable days", () => {
    // Thursday June 20, 2024
    const startDate = new TZDate(2024, 5, 20, 9, 0, 0, "America/Chicago");
    const result = getEndDateByChargePeriod(startDate, 3, []);
    // Fri 21 (1), skip Sat/Sun, Mon 24 (2), Tue 25 (3)
    expect(result.getDate()).toBe(25);
  });

  it("skips holidays when calculating chargeable days", () => {
    // Monday July 1, 2024
    const startDate = new TZDate(2024, 6, 1, 9, 0, 0, "America/Chicago");
    const result = getEndDateByChargePeriod(startDate, 3, ["2024-07-04"]);
    // Tue 2 (1), Wed 3 (2), skip Thu 4 (holiday), Fri 5 (3)
    expect(result.getDate()).toBe(5);
  });

  it("handles a full week (5 chargeable days)", () => {
    // Monday June 17, 2024
    const startDate = new TZDate(2024, 5, 17, 9, 0, 0, "America/Chicago");
    const result = getEndDateByChargePeriod(startDate, 5, []);
    // Tue 18 (1), Wed 19 (2), Thu 20 (3), Fri 21 (4), Mon 24 (5)
    expect(result.getDate()).toBe(24);
  });

  it("throws error for invalid startDate", () => {
    expect(() => getEndDateByChargePeriod(null, 1, [])).toThrow("startDate not a valid date object");
    expect(() => getEndDateByChargePeriod(new Date("invalid"), 1, [])).toThrow("startDate not a valid date object");
  });

  it("throws error for chargePeriod less than 1", () => {
    const startDate = new TZDate(2024, 5, 17, 9, 0, 0, "America/Chicago");
    expect(() => getEndDateByChargePeriod(startDate, 0, [])).toThrow("charge period must be a whole number");
    expect(() => getEndDateByChargePeriod(startDate, -1, [])).toThrow("charge period must be a whole number");
  });

  it("throws error when holidays is not an array", () => {
    const startDate = new TZDate(2024, 5, 17, 9, 0, 0, "America/Chicago");
    expect(() => getEndDateByChargePeriod(startDate, 1, null)).toThrow("holidays must be an array");
  });
});

describe("getDuration", () => {
  it("calculates 1 chargeable day correctly", () => {
    // Monday to Monday (same day)
    const start = new TZDate(2024, 5, 17, 9, 0, 0, "America/Chicago");
    const end = new TZDate(2024, 5, 17, 17, 0, 0, "America/Chicago");
    const result = getDuration(start, end, []);
    expect(result.calendarDays).toBe(1);
    expect(result.chargeableDays).toBe(1);
    expect(result.chargeLabel).toBe("1 day");
  });

  it("calculates multiple chargeable days correctly", () => {
    // Monday to Wednesday
    const start = new TZDate(2024, 5, 17, 9, 0, 0, "America/Chicago");
    const end = new TZDate(2024, 5, 19, 17, 0, 0, "America/Chicago");
    const result = getDuration(start, end, []);
    expect(result.calendarDays).toBe(3);
    expect(result.chargeableDays).toBe(3);
    expect(result.chargeLabel).toBe("3 days");
  });

  it("excludes weekends from chargeable days", () => {
    // Thursday to Tuesday (spans weekend)
    const start = new TZDate(2024, 5, 20, 9, 0, 0, "America/Chicago"); // Thursday
    const end = new TZDate(2024, 5, 25, 17, 0, 0, "America/Chicago"); // Tuesday
    const result = getDuration(start, end, []);
    expect(result.calendarDays).toBe(6);
    expect(result.chargeableDays).toBe(4); // Thu, Fri, Mon, Tue
  });

  it("excludes holidays from chargeable days", () => {
    // Monday to Friday with holiday on Wednesday
    const start = new TZDate(2024, 6, 1, 9, 0, 0, "America/Chicago");
    const end = new TZDate(2024, 6, 5, 17, 0, 0, "America/Chicago");
    const result = getDuration(start, end, ["2024-07-04"]);
    expect(result.calendarDays).toBe(5);
    expect(result.chargeableDays).toBe(4); // excludes July 4
  });

  it("calculates 1 week (5 chargeable days) correctly", () => {
    // Monday to Friday
    const start = new TZDate(2024, 5, 17, 9, 0, 0, "America/Chicago");
    const end = new TZDate(2024, 5, 21, 17, 0, 0, "America/Chicago");
    const result = getDuration(start, end, []);
    expect(result.chargeableDays).toBe(5);
    expect(result.chargeableWeeks).toBe(1);
    expect(result.chargeLabel).toBe("1 week");
  });

  it("calculates multiple weeks correctly", () => {
    // 2 weeks = 10 chargeable days
    const start = new TZDate(2024, 5, 17, 9, 0, 0, "America/Chicago"); // Monday
    const end = new TZDate(2024, 5, 28, 17, 0, 0, "America/Chicago"); // Friday (2 weeks later)
    const result = getDuration(start, end, []);
    expect(result.chargeableDays).toBe(10);
    expect(result.chargeableWeeks).toBe(2);
    expect(result.chargeLabel).toBe("2 weeks");
  });

  it("calculates partial weeks correctly", () => {
    // 12 chargeable days = 2.4 weeks
    const start = new TZDate(2024, 5, 17, 9, 0, 0, "America/Chicago");
    const end = new TZDate(2024, 6, 2, 17, 0, 0, "America/Chicago");
    const result = getDuration(start, end, []);
    expect(result.chargeableWeeks).toBe(result.chargeableDays / 5);
    expect(result.chargeLabel).toContain("weeks");
  });

  it("throws error for invalid start date", () => {
    const end = new TZDate(2024, 5, 17, 17, 0, 0, "America/Chicago");
    expect(() => getDuration(null, end, [])).toThrow("start or end not a valid date object");
    expect(() => getDuration(new Date("invalid"), end, [])).toThrow("start or end not a valid date object");
  });

  it("throws error for invalid end date", () => {
    const start = new TZDate(2024, 5, 17, 9, 0, 0, "America/Chicago");
    expect(() => getDuration(start, null, [])).toThrow("start or end not a valid date object");
    expect(() => getDuration(start, new Date("invalid"), [])).toThrow("start or end not a valid date object");
  });

  it("throws error when holidays is not an array", () => {
    const start = new TZDate(2024, 5, 17, 9, 0, 0, "America/Chicago");
    const end = new TZDate(2024, 5, 19, 17, 0, 0, "America/Chicago");
    expect(() => getDuration(start, end, null)).toThrow("holidays must be an array");
  });
});
