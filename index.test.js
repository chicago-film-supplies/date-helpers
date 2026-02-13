import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { TZDate } from "@date-fns/tz";
import {
  isHoliday,
  isOffHours,
  getDefaultStartDate,
  getEndDateByChargePeriod,
  countCfsBusinessDays,
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
  it("returns same day for 1 chargeable day (no weekends/holidays)", () => {
    // Monday June 17, 2024
    const startDate = new TZDate(2024, 5, 17, 9, 0, 0, "America/Chicago");
    const result = getEndDateByChargePeriod(startDate, 1, []);
    expect(result.getDate()).toBe(17); // Monday (start day is first chargeable day)
  });

  it("calculates correctly for multiple chargeable days", () => {
    // Monday June 17, 2024
    const startDate = new TZDate(2024, 5, 17, 9, 0, 0, "America/Chicago");
    const result = getEndDateByChargePeriod(startDate, 3, []);
    expect(result.getDate()).toBe(19); // Wednesday (Mon, Tue, Wed = 3 days)
  });

  it("skips weekends when calculating chargeable days", () => {
    // Thursday June 20, 2024
    const startDate = new TZDate(2024, 5, 20, 9, 0, 0, "America/Chicago");
    const result = getEndDateByChargePeriod(startDate, 3, []);
    // Thu 20 (1), Fri 21 (2), skip Sat/Sun, Mon 24 (3)
    expect(result.getDate()).toBe(24);
  });

  it("skips holidays when calculating chargeable days", () => {
    // Tuesday July 2, 2024
    const startDate = new TZDate(2024, 6, 2, 9, 0, 0, "America/Chicago");
    const result = getEndDateByChargePeriod(startDate, 3, ["2024-07-04"]);
    // Tue 2 (1), Wed 3 (2), skip Thu 4 (holiday), Fri 5 (3)
    expect(result.getDate()).toBe(5);
  });

  it("handles a full week (5 chargeable days)", () => {
    // Monday June 17, 2024
    const startDate = new TZDate(2024, 5, 17, 9, 0, 0, "America/Chicago");
    const result = getEndDateByChargePeriod(startDate, 5, []);
    // Mon 17 (1), Tue 18 (2), Wed 19 (3), Thu 20 (4), Fri 21 (5)
    expect(result.getDate()).toBe(21);
  });

  it("round-trips with countCfsBusinessDays", () => {
    const startDate = new TZDate(2024, 5, 17, 9, 0, 0, "America/Chicago");
    for (const period of [1, 2, 3, 5, 10]) {
      const endDate = getEndDateByChargePeriod(startDate, period, []);
      const duration = countCfsBusinessDays(startDate, endDate, []);
      expect(duration.days).toBe(period);
    }
  });

  it("round-trips with countCfsBusinessDays across holidays", () => {
    const startDate = new TZDate(2024, 6, 1, 9, 0, 0, "America/Chicago");
    const testHolidays = ["2024-07-04"];
    for (const period of [1, 3, 5, 10]) {
      const endDate = getEndDateByChargePeriod(startDate, period, testHolidays);
      const duration = countCfsBusinessDays(startDate, endDate, testHolidays);
      expect(duration.days).toBe(period);
    }
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

describe("countCfsBusinessDays", () => {
  it("counts 1 business day for same-day range", () => {
    const start = new TZDate(2024, 5, 17, 9, 0, 0, "America/Chicago");
    const end = new TZDate(2024, 5, 17, 17, 0, 0, "America/Chicago");
    const result = countCfsBusinessDays(start, end, []);
    expect(result.days).toBe(1);
    expect(result.calendarDays).toBe(1);
    expect(result.label).toBe("day");
    expect(result.periodLabel).toBe("1 day");
  });

  it("counts multiple business days correctly", () => {
    const start = new TZDate(2024, 5, 17, 9, 0, 0, "America/Chicago");
    const end = new TZDate(2024, 5, 19, 17, 0, 0, "America/Chicago");
    const result = countCfsBusinessDays(start, end, []);
    expect(result.days).toBe(3);
    expect(result.calendarDays).toBe(3);
    expect(result.label).toBe("days");
    expect(result.periodLabel).toBe("3 days");
  });

  it("excludes weekends", () => {
    const start = new TZDate(2024, 5, 20, 9, 0, 0, "America/Chicago"); // Thursday
    const end = new TZDate(2024, 5, 25, 17, 0, 0, "America/Chicago"); // Tuesday
    const result = countCfsBusinessDays(start, end, []);
    expect(result.calendarDays).toBe(6);
    expect(result.days).toBe(4); // Thu, Fri, Mon, Tue
  });

  it("excludes holidays", () => {
    const start = new TZDate(2024, 6, 1, 9, 0, 0, "America/Chicago");
    const end = new TZDate(2024, 6, 5, 17, 0, 0, "America/Chicago");
    const result = countCfsBusinessDays(start, end, ["2024-07-04"]);
    expect(result.calendarDays).toBe(5);
    expect(result.days).toBe(4);
  });

  it("calculates 1 week (5 business days) correctly", () => {
    const start = new TZDate(2024, 5, 17, 9, 0, 0, "America/Chicago");
    const end = new TZDate(2024, 5, 21, 17, 0, 0, "America/Chicago");
    const result = countCfsBusinessDays(start, end, []);
    expect(result.days).toBe(5);
    expect(result.weeks).toBe(1);
    expect(result.label).toBe("week");
    expect(result.periodLabel).toBe("1 week");
  });

  it("calculates multiple weeks correctly", () => {
    const start = new TZDate(2024, 5, 17, 9, 0, 0, "America/Chicago");
    const end = new TZDate(2024, 5, 28, 17, 0, 0, "America/Chicago");
    const result = countCfsBusinessDays(start, end, []);
    expect(result.days).toBe(10);
    expect(result.weeks).toBe(2);
    expect(result.label).toBe("weeks");
    expect(result.periodLabel).toBe("2 weeks");
  });

  it("calculates partial weeks correctly", () => {
    const start = new TZDate(2024, 5, 17, 9, 0, 0, "America/Chicago");
    const end = new TZDate(2024, 6, 2, 17, 0, 0, "America/Chicago");
    const result = countCfsBusinessDays(start, end, []);
    expect(result.weeks).toBe(result.days / 5);
    expect(result.label).toBe("weeks");
    expect(result.periodLabel).toContain("weeks");
  });

  it("throws error for invalid start date", () => {
    const end = new TZDate(2024, 5, 17, 17, 0, 0, "America/Chicago");
    expect(() => countCfsBusinessDays(null, end, [])).toThrow("start and end must be valid date objects");
    expect(() => countCfsBusinessDays(new Date("invalid"), end, [])).toThrow("start and end must be valid date objects");
  });

  it("throws error for invalid end date", () => {
    const start = new TZDate(2024, 5, 17, 9, 0, 0, "America/Chicago");
    expect(() => countCfsBusinessDays(start, null, [])).toThrow("start and end must be valid date objects");
    expect(() => countCfsBusinessDays(start, new Date("invalid"), [])).toThrow("start and end must be valid date objects");
  });

  it("throws error when holidays is not an array", () => {
    const start = new TZDate(2024, 5, 17, 9, 0, 0, "America/Chicago");
    const end = new TZDate(2024, 5, 19, 17, 0, 0, "America/Chicago");
    expect(() => countCfsBusinessDays(start, end, null)).toThrow("holidays must be an array");
  });
});

describe("getDuration", () => {
  it("calculates active duration for basic date range", () => {
    const start = new TZDate(2024, 5, 17, 9, 0, 0, "America/Chicago");
    const end = new TZDate(2024, 5, 17, 17, 0, 0, "America/Chicago");
    const result = getDuration({ delivery_start: start.toISOString(), collection_start: end.toISOString() }, []);
    expect(result.activeDays).toBe(1);
    expect(result.activeLabel).toBe("day");
    expect(result.activePeriodLabel).toBe("1 day");
  });

  it("calculates multiple active days correctly", () => {
    const start = new TZDate(2024, 5, 17, 9, 0, 0, "America/Chicago");
    const end = new TZDate(2024, 5, 19, 17, 0, 0, "America/Chicago");
    const result = getDuration({ delivery_start: start.toISOString(), collection_start: end.toISOString() }, []);
    expect(result.activeDays).toBe(3);
    expect(result.activeLabel).toBe("days");
    expect(result.activePeriodLabel).toBe("3 days");
  });

  it("excludes weekends from active days", () => {
    const start = new TZDate(2024, 5, 20, 9, 0, 0, "America/Chicago"); // Thursday
    const end = new TZDate(2024, 5, 25, 17, 0, 0, "America/Chicago"); // Tuesday
    const result = getDuration({ delivery_start: start.toISOString(), collection_start: end.toISOString() }, []);
    expect(result.activeDays).toBe(4); // Thu, Fri, Mon, Tue
  });

  it("excludes holidays from active days", () => {
    const start = new TZDate(2024, 6, 1, 9, 0, 0, "America/Chicago");
    const end = new TZDate(2024, 6, 5, 17, 0, 0, "America/Chicago");
    const result = getDuration({ delivery_start: start.toISOString(), collection_start: end.toISOString() }, ["2024-07-04"]);
    expect(result.activeDays).toBe(4);
  });

  it("calculates 1 week (5 active days) correctly", () => {
    const start = new TZDate(2024, 5, 17, 9, 0, 0, "America/Chicago");
    const end = new TZDate(2024, 5, 21, 17, 0, 0, "America/Chicago");
    const result = getDuration({ delivery_start: start.toISOString(), collection_start: end.toISOString() }, []);
    expect(result.activeDays).toBe(5);
    expect(result.activeWeeks).toBe(1);
    expect(result.activeLabel).toBe("week");
    expect(result.activePeriodLabel).toBe("1 week");
  });

  it("calculates multiple weeks correctly", () => {
    const start = new TZDate(2024, 5, 17, 9, 0, 0, "America/Chicago");
    const end = new TZDate(2024, 5, 28, 17, 0, 0, "America/Chicago");
    const result = getDuration({ delivery_start: start.toISOString(), collection_start: end.toISOString() }, []);
    expect(result.activeDays).toBe(10);
    expect(result.activeWeeks).toBe(2);
    expect(result.activeLabel).toBe("weeks");
    expect(result.activePeriodLabel).toBe("2 weeks");
  });

  it("calculates partial weeks correctly", () => {
    const start = new TZDate(2024, 5, 17, 9, 0, 0, "America/Chicago");
    const end = new TZDate(2024, 6, 2, 17, 0, 0, "America/Chicago");
    const result = getDuration({ delivery_start: start.toISOString(), collection_start: end.toISOString() }, []);
    expect(result.activeWeeks).toBe(result.activeDays / 5);
    expect(result.activeLabel).toBe("weeks");
    expect(result.activePeriodLabel).toContain("weeks");
  });

  it("reuses active values for charge when charge dates match delivery/collection", () => {
    const start = new TZDate(2024, 5, 17, 9, 0, 0, "America/Chicago");
    const end = new TZDate(2024, 5, 21, 17, 0, 0, "America/Chicago");
    const startIso = start.toISOString();
    const endIso = end.toISOString();
    const result = getDuration({
      delivery_start: startIso,
      collection_start: endIso,
      charge_start: startIso,
      charge_end: endIso,
    }, []);
    expect(result.chargeDays).toBe(result.activeDays);
    expect(result.chargeWeeks).toBe(result.activeWeeks);
    expect(result.chargeLabel).toBe(result.activeLabel);
    expect(result.chargePeriodLabel).toBe(result.activePeriodLabel);
  });

  it("reuses active values when charge dates are empty", () => {
    const start = new TZDate(2024, 5, 17, 9, 0, 0, "America/Chicago");
    const end = new TZDate(2024, 5, 21, 17, 0, 0, "America/Chicago");
    const result = getDuration({
      delivery_start: start.toISOString(),
      collection_start: end.toISOString(),
      charge_start: "",
      charge_end: "",
    }, []);
    expect(result.chargeDays).toBe(result.activeDays);
    expect(result.chargeWeeks).toBe(result.activeWeeks);
  });

  it("computes charge values independently when charge dates differ", () => {
    const deliveryStart = new TZDate(2024, 5, 17, 9, 0, 0, "America/Chicago"); // Monday
    const collectionStart = new TZDate(2024, 5, 21, 17, 0, 0, "America/Chicago"); // Friday (5 days)
    const chargeStart = new TZDate(2024, 5, 18, 9, 0, 0, "America/Chicago"); // Tuesday
    const chargeEnd = new TZDate(2024, 5, 20, 17, 0, 0, "America/Chicago"); // Thursday (3 days)
    const result = getDuration({
      delivery_start: deliveryStart.toISOString(),
      collection_start: collectionStart.toISOString(),
      charge_start: chargeStart.toISOString(),
      charge_end: chargeEnd.toISOString(),
    }, []);
    expect(result.activeDays).toBe(5);
    expect(result.chargeDays).toBe(3);
    expect(result.activeLabel).toBe("week");
    expect(result.chargeLabel).toBe("days");
  });

  it("round-trips with getEndDateByChargePeriod", () => {
    const startDate = new TZDate(2024, 5, 17, 9, 0, 0, "America/Chicago");
    for (const period of [1, 2, 3, 5, 10]) {
      const endDate = getEndDateByChargePeriod(startDate, period, []);
      const duration = getDuration({ delivery_start: startDate.toISOString(), collection_start: endDate.toISOString() }, []);
      expect(duration.activeDays).toBe(period);
    }
  });

  it("round-trips with getEndDateByChargePeriod across holidays", () => {
    const startDate = new TZDate(2024, 6, 1, 9, 0, 0, "America/Chicago");
    const testHolidays = ["2024-07-04"];
    for (const period of [1, 3, 5, 10]) {
      const endDate = getEndDateByChargePeriod(startDate, period, testHolidays);
      const duration = getDuration({ delivery_start: startDate.toISOString(), collection_start: endDate.toISOString() }, testHolidays);
      expect(duration.activeDays).toBe(period);
    }
  });

  it("throws error when dates is not an object", () => {
    expect(() => getDuration(null, [])).toThrow("dates must be a non-null object");
    expect(() => getDuration("invalid", [])).toThrow("dates must be a non-null object");
    expect(() => getDuration(undefined, [])).toThrow("dates must be a non-null object");
  });

  it("throws error when delivery_start is missing", () => {
    expect(() => getDuration({ collection_start: "2024-06-17T09:00:00Z" }, [])).toThrow("dates.delivery_start and dates.collection_start are required");
    expect(() => getDuration({ delivery_start: "", collection_start: "2024-06-17T09:00:00Z" }, [])).toThrow("dates.delivery_start and dates.collection_start are required");
  });

  it("throws error when collection_start is missing", () => {
    expect(() => getDuration({ delivery_start: "2024-06-17T09:00:00Z" }, [])).toThrow("dates.delivery_start and dates.collection_start are required");
    expect(() => getDuration({ delivery_start: "2024-06-17T09:00:00Z", collection_start: "" }, [])).toThrow("dates.delivery_start and dates.collection_start are required");
  });

  it("throws error when holidays is not an array", () => {
    const start = new TZDate(2024, 5, 17, 9, 0, 0, "America/Chicago");
    const end = new TZDate(2024, 5, 19, 17, 0, 0, "America/Chicago");
    expect(() => getDuration({ delivery_start: start.toISOString(), collection_start: end.toISOString() }, null)).toThrow("holidays must be an array");
  });
});
