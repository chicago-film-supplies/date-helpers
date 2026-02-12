# @cfs/date-helpers

Shared date helper functions for CFS applications. Provides pure functions for date calculations including business days, holidays, and rental durations.

## Installation

This package is hosted as a private GitHub repository and installed via git URL:

```bash
npm install git+https://github.com/chicago-film-supplies/date-helpers.git#v0.1.0
```

## Usage

All functions are pure and accept a `holidays` array parameter. This enables client-side calculations without Firebase calls.

```javascript
import {
  isHoliday,
  isOffHours,
  getDefaultStartDate,
  getEndDateByChargePeriod,
  countCfsBusinessDays,
  getDuration
} from '@cfs/date-helpers';

// Example: Get holidays from Firestore (client-side)
const holidays = ["2025-01-01T00:00:00-06:00", "2025-07-04T00:00:00-05:00", ...];

// Check if a date is a holiday
const date = new Date('2025-01-01');
if (isHoliday(date, holidays)) {
  console.log('This is a holiday!');
}

// Get next business day (9am)
const startDate = getDefaultStartDate(holidays);

// Calculate end date (5 chargeable days from start)
const endDate = getEndDateByChargePeriod(startDate, 5, holidays);

// Count business days between two date objects
const count = countCfsBusinessDays(startDate, endDate, holidays);
console.log(count.periodLabel); // "1 week"

// Get active + charge durations for an order's dates
const duration = getDuration({
  delivery_start: '2024-06-17T14:00:00.000Z',
  collection_start: '2024-06-21T20:00:00.000Z',
  charge_start: '',  // optional, falls back to delivery_start
  charge_end: '',    // optional, falls back to collection_start
}, holidays);
console.log(duration.activePeriodLabel); // "1 week"
```

## API

### `isHoliday(testDate, holidays)`

Test if a date is a CFS holiday.

**Parameters:**
- `testDate` (Date): date-fns date object to test
- `holidays` (Array<string>): Array of ISO date strings

**Returns:** `boolean`

### `isOffHours(date)`

Test if a date/time is outside business hours (before 8am or after 4pm).

**Parameters:**
- `date` (Date): date-fns date object in America/Chicago timezone

**Returns:** `boolean`

### `getDefaultStartDate(holidays)`

Get the default start date for a rental (next business day at 9am). If after 8am today, defaults to tomorrow. Skips weekends and holidays.

**Parameters:**
- `holidays` (Array<string>): Array of ISO date strings

**Returns:** `Date` (TZDate in America/Chicago)

### `getEndDateByChargePeriod(startDate, chargePeriod, holidays)`

Calculate end date based on start date and number of chargeable days. The start date itself counts as the first chargeable day. Chargeable days exclude weekends and holidays.

**Parameters:**
- `startDate` (Date): date-fns date object
- `chargePeriod` (number): Number of chargeable days (must be >= 1)
- `holidays` (Array<string>): Array of ISO date strings

**Returns:** `Date` (end date)

### `countCfsBusinessDays(start, end, holidays)`

Count CFS business days between two date objects (excludes weekends and CFS holidays).

**Parameters:**
- `start` (Date): date-fns date object
- `end` (Date): date-fns date object
- `holidays` (Array<string>): Array of ISO date strings

**Returns:**
```javascript
{
  calendarDays: number,
  calendarWeeks: number,
  days: number,          // business days count
  weeks: number,         // days / 5
  label: string,         // unit only, e.g., "week", "days"
  periodLabel: string    // e.g., "1 week", "3 days"
}
```

### `getDuration(dates, holidays)`

Calculate active and chargeable durations for an order's dates. Accepts the full order dates object and returns both "active" (delivery_start → collection_start) and "charge" (charge_start → charge_end) durations.

When `charge_start` or `charge_end` are empty/missing, they fall back to `delivery_start`/`collection_start` respectively. When charge dates equal delivery/collection dates, the charge values are reused from the active calculation (not recalculated).

**Parameters:**
- `dates` (object): Order dates object with:
  - `delivery_start` (string, required): ISO date string
  - `collection_start` (string, required): ISO date string
  - `charge_start` (string, optional): ISO date string, falls back to `delivery_start`
  - `charge_end` (string, optional): ISO date string, falls back to `collection_start`
- `holidays` (Array<string>): Array of ISO date strings

**Returns:**
```javascript
{
  activeDays: number,          // business days: delivery_start → collection_start
  activeWeeks: number,         // activeDays / 5
  activeLabel: string,         // "day" | "days" | "week" | "weeks"
  activePeriodLabel: string,   // e.g., "3 days"
  chargeDays: number,          // business days: charge_start → charge_end
  chargeWeeks: number,         // chargeDays / 5
  chargeLabel: string,         // "day" | "days" | "week" | "weeks"
  chargePeriodLabel: string    // e.g., "2 weeks"
}
```

## Version Management

### Releasing a New Version

1. Make changes to the package
2. Update version in `package.json` (follow semver):
   - `0.1.0 → 0.2.0`: Minor changes, new features
   - `0.2.0 → 0.3.0`: Breaking changes (acceptable in v0.x)
   - `0.x.x → 1.0.0`: First stable release
3. Commit and tag:
   ```bash
   git commit -am "feat: add new helper function"
   git tag v0.2.0
   git push origin main
   git push origin v0.2.0
   ```

### Updating Consuming Repos

After releasing a new version:

1. Update `package.json` in consuming repos (`api/functions`, `manager`):
   ```json
   "@cfs/date-helpers": "git+https://github.com/chicago-film-supplies/date-helpers.git#v0.2.0"
   ```

2. Run `npm install` in each repo

## Dependencies

- `date-fns` ^4.1.0 - Modern date utility library
- `@date-fns/tz` ^1.1.2 - Timezone support for date-fns

## Business Hours

CFS business hours are 8:00 AM - 4:00 PM America/Chicago timezone.

## License

UNLICENSED - Private package for Chicago Film Supplies
