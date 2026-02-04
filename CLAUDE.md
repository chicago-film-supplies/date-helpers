# CLAUDE.md

Patch Test 

This file provides guidance to Claude Code (claude.ai/code) when working with this repository.

## Purpose

`@cfs/date-helpers` is a shared npm package providing pure date calculation functions for Chicago Film Supplies (CFS) applications. It enables client-side date calculations for rental durations, business days, and holiday exclusions without requiring Firebase calls.

### Organization Structure

This package is part of the `chicago-film-supplies` GitHub organization, which contains separate repositories:
- **date-helpers** (this repo) - Shared date calculation utilities
- **api** - Firebase Cloud Functions (consumes this package)
- **manager** - Vue.js admin application (consumes this package)

These are independent repositories, not a monorepo. The local `~/cfs/` directory mirrors the GitHub organization structure for development convenience.

This separation allows:
- Client-side date calculations (avoiding Firebase cold starts)
- Shared logic between frontend and backend
- Independent versioning and deployment

### Schema Reference

Holiday data structure is defined in the API repo at:
`api/functions/schema/holiday-dates.json`

This schema defines the Firestore document structure for pre-calculated holiday dates (25-year range) stored at `config/XN9iFfm9qgWom5RvoH5k/dates`.

## Code Style

- **Language**: JavaScript ES modules (no TypeScript)
- **String Style**: Use double quotes for strings, avoid template literals, prefer string concatenation with "+" operator
- **Documentation**: All functions MUST have JSDoc comments documenting parameters, return values, and behavior
- **Purity**: All functions must be pure - no side effects, no Firebase/Firestore dependencies
- **Error Handling**: Validate inputs and throw descriptive errors for invalid arguments

## Dependencies

- `date-fns` ^4.1.0 - Modern date utility library
- `@date-fns/tz` ^1.1.2 - Timezone support (all dates use America/Chicago)

**Important**: This package must remain free of Firebase dependencies to enable client-side usage.

## Available Functions

All functions accept a `holidays` array parameter (array of ISO date strings):

- `isHoliday(testDate, holidays)` - Test if date is a CFS holiday
- `isOffHours(date)` - Test if time is outside business hours (8am-4pm America/Chicago)
- `getDefaultStartDate(holidays)` - Get next business day at 9am
- `getEndDateByChargePeriod(startDate, chargePeriod, holidays)` - Calculate end date from chargeable days
- `getDuration(start, end, holidays)` - Calculate duration excluding weekends/holidays

## Development Workflow

### Making Changes

1. Edit functions in `index.js`
2. Add/update JSDoc comments for all modified functions
3. Test manually by importing into a consuming repo (api or manager)
4. Update version in `package.json` following semver
5. Update `README.md` if API changes

### Testing

**TODO**: Add ESLint for code quality checks before release

Currently no automated tests. Test changes by:
1. Link package locally: `npm link` (in date-helpers directory)
2. Link in consuming repo: `npm link @cfs/date-helpers` (in api/functions or manager)
3. Test the affected functionality in the consuming application
4. Unlink when done: `npm unlink @cfs/date-helpers` (in consuming repo)

## Version Management

This package follows semantic versioning:
- **v0.x.x**: Pre-release (breaking changes acceptable)
- **v1.0.0+**: Stable API (breaking changes require major version bump)

### Release Process

1. Make and test changes
2. Update version in `package.json`:
   - Patch (0.1.0 → 0.1.1): Bug fixes
   - Minor (0.1.0 → 0.2.0): New features, non-breaking changes
   - Major (0.x.x → 1.0.0): Breaking changes, stable release
3. Commit changes:
   ```bash
   git commit -am "feat: description of changes"
   ```
4. Create and push tag:
   ```bash
   git tag v0.2.0
   git push origin main
   git push origin v0.2.0
   ```
5. Update consuming repos:
   - Edit `package.json` in `api/functions` and `manager`
   - Update version: `"@cfs/date-helpers": "git+https://github.com/chicago-film-supplies/date-helpers.git#v0.2.0"`
   - Run `npm install`

## Business Logic

**Business Hours**: 8:00 AM - 4:00 PM America/Chicago timezone

**Chargeable Days**: Business days excluding weekends and CFS holidays
- Weekends: Saturday and Sunday
- Holidays: Fetched from Firestore (managed via callable functions in API repo)

**Rental Calculations**:
- Default start: Next business day at 9am (if after 8am today, defaults to tomorrow)
- Duration: Calculated in calendar days, calendar weeks, chargeable days, chargeable weeks
- Charge labels: "1 day", "3 days", "1 week", "2.4 weeks"
