/**
 * @cfs/date-helpers
 *
 * Pure date helper functions for CFS applications.
 * All functions accept holidays as a parameter to enable client-side calculations.
 */

import { addDays, getHours, isAfter, isBefore, isSameDay, isValid, isWeekend, parseISO, set, setHours, setMinutes, setSeconds, setMilliseconds } from "date-fns";
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

  let today = TZDate.tz("America/Chicago");

  // If we're past 8am, default to tomorrow
  if (getHours(today) > 8) {
    today = addDays(today, 1);
  }

  // Set to 9am
  today = setHours(today, 9);
  today = setMinutes(today, 0);
  today = setSeconds(today, 0);
  today = setMilliseconds(today, 0);

  // Skip weekends and holidays
  while (isWeekend(today) === true || isHoliday(today, holidays)) {
    today = addDays(today, 1);
  }

  return today;
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
 * Calculate duration between two dates including chargeable days
 * @param {object} start - date-fns date object for rental start
 * @param {object} end - date-fns date object for rental end
 * @param {Array<string>} holidays - Array of ISO date strings
 * @returns {object} Duration object with calendarDays, calendarWeeks, chargeableDays, chargeableWeeks, chargeLabel
 * @throws {Error} If start or end is invalid, or holidays is not an array
 */
export function getDuration(start, end, holidays) {
  if (!isValid(start) || !isValid(end)) {
    throw new Error("start or end not a valid date object");
  }
  if (!Array.isArray(holidays)) {
    throw new Error("holidays must be an array");
  }

  let calendarDays = 0;
  let chargeableDays = 0;
  let lastTested = start;
  const lastDay = addDays(end, 1);

  while (isSameDay(lastDay, lastTested) === false) {
    calendarDays++;
    if (isWeekend(lastTested) === false && isHoliday(lastTested, holidays) === false) {
      chargeableDays++;
    }
    lastTested = addDays(lastTested, 1);
  }

  const chargeableWeeks = chargeableDays / 5;
  const calendarWeeks = calendarDays / 5;

  let chargeLabel = "";
  if (chargeableDays === 1) {
    chargeLabel = chargeableDays + " day";
  } else if (chargeableDays > 1 && chargeableDays < 5) {
    chargeLabel = chargeableDays + " days";
  } else if (chargeableDays === 5) {
    chargeLabel = chargeableWeeks + " week";
  } else if (chargeableDays > 5) {
    chargeLabel = chargeableWeeks + " weeks";
  }

  return { calendarDays, calendarWeeks, chargeableDays, chargeableWeeks, chargeLabel };
}
