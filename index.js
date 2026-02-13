/**
 * @cfs/date-helpers
 *
 * Pure date helper functions for CFS applications.
 * All functions accept holidays as a parameter to enable client-side calculations.
 */

import { addDays, getHours, isAfter, isBefore, isSameDay, isValid, isWeekend, parseISO, set } from "date-fns";
import { TZDate, tz } from "@date-fns/tz";

/**
 * Test if a given date is a CFS holiday
 * @param {object} testDate - date-fns date object
 * @param {Array<string>} holidays - Array of ISO date strings
 * @returns {boolean} True if testDate is a holiday
 * @throws {Error} If testDate is invalid or holidays is not an array
 */
export function isHoliday(testDate, holidays) {
  if (!testDate || !isValid(testDate)) {
    throw new Error("testDate must be a valid date object");
  }
  if (!Array.isArray(holidays)) {
    throw new Error("holidays must be an array");
  }

  for (const holiday of holidays) {
    if (isSameDay(parseISO(holiday, { in: tz("America/Chicago") }), testDate)) {
      return true;
    }
  }
  return false;
}

/**
 * Test if a date/time is outside business hours (before 8am or after 4pm)
 * @param {object} date - date-fns date object in America/Chicago tz
 * @returns {boolean} True if outside business hours
 * @throws {Error} If date is invalid
 */
export function isOffHours(date) {
  if (!date || !isValid(date)) {
    throw new Error("date must be a valid date object");
  }

  const open = set(date, { hours: 8, minutes: 0, seconds: 0, milliseconds: 0 }, { in: tz("America/Chicago") });
  const close = set(date, { hours: 16, minutes: 0, seconds: 0, milliseconds: 0 }, { in: tz("America/Chicago") });

  if (isBefore(date, open) || isAfter(date, close)) {
    return true;
  } else {
    return false;
  }
}

/**
 * Get the default start date for a rental (next business day at 9am)
 * If after 8am today, defaults to tomorrow. Skips weekends and holidays.
 * @param {Array<string>} holidays - Array of ISO date strings
 * @returns {object} date-fns date object (TZDate in America/Chicago)
 * @throws {Error} If holidays is not an array
 */
export function getDefaultStartDate(holidays) {
  if (!Array.isArray(holidays)) {
    throw new Error("holidays must be an array");
  }

  let day = TZDate.tz("America/Chicago");

  // If we're past 8am, default to tomorrow
  if (getHours(day) > 8) {
    day = addDays(day, 1);
  }

  // Set to 9am
  day = set(day, { hours: 9, minutes: 0, seconds: 0, milliseconds: 0 });

  // Skip weekends and holidays
  while (isWeekend(day) === true || isHoliday(day, holidays)) {
    day = addDays(day, 1);
  }

  return day;
}

/**
 * Calculate end date based on start date and number of chargeable days
 * Chargeable days exclude weekends and holidays.
 * @param {object} startDate - date-fns date object
 * @param {number} chargePeriod - Number of chargeable days (must be >= 1)
 * @param {Array<string>} holidays - Array of ISO date strings
 * @returns {object} date-fns date object (end date)
 * @throws {Error} If startDate is invalid, chargePeriod < 1, or holidays is not an array
 */
export function getEndDateByChargePeriod(startDate, chargePeriod, holidays) {
  if (!isValid(startDate)) {
    throw new Error("startDate not a valid date object");
  }
  if (chargePeriod < 1) {
    throw new Error("charge period must be a whole number");
  }
  if (!Array.isArray(holidays)) {
    throw new Error("holidays must be an array");
  }

  let endDate = startDate;
  let chargeableDays = 0;

  while (chargeableDays < chargePeriod) {
    if (!isWeekend(endDate) && !isHoliday(endDate, holidays)) {
      chargeableDays++;
    }
    if (chargeableDays < chargePeriod) {
      endDate = addDays(endDate, 1);
    }
  }

  return endDate;
}

/**
 * Count CFS business days between two dates (excludes weekends and CFS holidays)
 * @param {object} start - date-fns date object
 * @param {object} end - date-fns date object
 * @param {Array<string>} holidays - Array of ISO date strings (CFS holiday list)
 * @returns {{ calendarDays: number, calendarWeeks: number, days: number, weeks: number, label: string, periodLabel: string }}
 * @throws {Error} If start or end is invalid, or holidays is not an array
 */
export function countCfsBusinessDays(start, end, holidays) {
  if (!start || !isValid(start) || !end || !isValid(end)) {
    throw new Error("start and end must be valid date objects");
  }
  if (!Array.isArray(holidays)) {
    throw new Error("holidays must be an array");
  }

  let calendarDays = 0;
  let days = 0;
  let lastTested = start;
  const lastDay = addDays(end, 1);

  while (isSameDay(lastDay, lastTested) === false) {
    calendarDays++;
    if (isWeekend(lastTested) === false && isHoliday(lastTested, holidays) === false) {
      days++;
    }
    lastTested = addDays(lastTested, 1);
  }

  const weeks = days / 5;
  const calendarWeeks = calendarDays / 5;

  let label = "";
  let periodLabel = "";
  if (days === 1) {
    label = "day";
    periodLabel = days + " day";
  } else if (days > 1 && days < 5) {
    label = "days";
    periodLabel = days + " days";
  } else if (days === 5) {
    label = "week";
    periodLabel = weeks + " week";
  } else if (days > 5) {
    label = "weeks";
    periodLabel = weeks + " weeks";
  }

  return { calendarDays, calendarWeeks, days, weeks, label, periodLabel };
}

/**
 * Calculate active and chargeable durations for an order's dates
 * @param {object} dates - Order dates object with delivery_start, collection_start, and optional charge_start, charge_end (ISO strings)
 * @param {Array<string>} holidays - Array of ISO date strings
 * @returns {object} Duration object with active and charge period values
 * @throws {Error} If dates is not an object, required fields are missing, or holidays is not an array
 */
export function getDuration(dates, holidays) {
  if (!dates || typeof dates !== "object") {
    throw new Error("dates must be a non-null object");
  }
  if (!dates.delivery_start || !dates.collection_start) {
    throw new Error("dates.delivery_start and dates.collection_start are required");
  }
  if (!Array.isArray(holidays)) {
    throw new Error("holidays must be an array");
  }

  const deliveryStart = parseISO(dates.delivery_start, { in: tz("America/Chicago") });
  const collectionStart = parseISO(dates.collection_start, { in: tz("America/Chicago") });

  if (!isValid(deliveryStart) || !isValid(collectionStart)) {
    throw new Error("delivery_start or collection_start is not a valid date string");
  }

  const active = countCfsBusinessDays(deliveryStart, collectionStart, holidays);

  const chargeStart = dates.charge_start ? dates.charge_start : dates.delivery_start;
  const chargeEnd = dates.charge_end ? dates.charge_end : dates.collection_start;

  let charge;
  if (chargeStart === dates.delivery_start && chargeEnd === dates.collection_start) {
    charge = active;
  } else {
    const parsedChargeStart = parseISO(chargeStart, { in: tz("America/Chicago") });
    const parsedChargeEnd = parseISO(chargeEnd, { in: tz("America/Chicago") });
    charge = countCfsBusinessDays(parsedChargeStart, parsedChargeEnd, holidays);
  }

  return {
    activeDays: active.days,
    activeWeeks: active.weeks,
    activeLabel: active.label,
    activePeriodLabel: active.periodLabel,
    chargeDays: charge.days,
    chargeWeeks: charge.weeks,
    chargeLabel: charge.label,
    chargePeriodLabel: charge.periodLabel,
  };
}
