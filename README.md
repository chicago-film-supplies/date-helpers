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

// Get duration between dates
const duration = getDuration(startDate, endDate, holidays);
console.log(duration.chargeLabel); // "1 week"
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

Calculate end date based on start date and number of chargeable days. Chargeable days exclude weekends and holidays.

**Parameters:**
- `startDate` (Date): date-fns date object
- `chargePeriod` (number): Number of chargeable days (must be >= 1)
- `holidays` (Array<string>): Array of ISO date strings

**Returns:** `Date` (end date)

### `getDuration(start, end, holidays)`

Calculate duration between two dates including chargeable days.

**Parameters:**
- `start` (Date): date-fns date object for rental start
- `end` (Date): date-fns date object for rental end
- `holidays` (Array<string>): Array of ISO date strings

**Returns:**
```javascript
{
  calendarDays: number,
  calendarWeeks: number,
  chargeableDays: number,
  chargeableWeeks: number,
  chargeLabel: string  // e.g., "1 week", "3 days"
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
