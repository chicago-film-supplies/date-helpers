# CLAUDE.md

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
3. Run `npm test` and `npm run lint` to verify changes
4. Update `README.md` if API changes

### Testing

Tests use [Vitest](https://vitest.dev/) and live in `index.test.js`. **Any new function must have corresponding tests. Any time an existing function is edited, its tests must be reviewed and updated if needed.**

```bash
npm test        # run tests once
npm run lint    # run ESLint
```

CI runs lint and tests on every PR to `main` via `.github/workflows/ci.yml`. The `Lint & Test` job must pass before merging.

## Version Management

This package follows semantic versioning:
- **v0.x.x**: Pre-release (breaking changes acceptable)
- **v1.0.0+**: Stable API (breaking changes require major version bump)

### Release Process

Releases are automated via [semantic-release](https://semantic-release.gitbook.io/) in `.github/workflows/release.yml`. Use [Conventional Commits](https://www.conventionalcommits.org/):

- `fix: ...` → patch release
- `feat: ...` → minor release
- `feat!: ...` or `BREAKING CHANGE:` → major release

On merge to `main` (or `beta`), semantic-release creates a GitHub release and publishes to GitHub Packages, then dispatches update events to consuming repos (api, manager).

## Business Logic

**Business Hours**: 8:00 AM - 4:00 PM America/Chicago timezone

**Chargeable Days**: Business days excluding weekends and CFS holidays
- Weekends: Saturday and Sunday
- Holidays: Fetched from Firestore (managed via callable functions in API repo)

**Rental Calculations**:
- Default start: Next business day at 9am (if after 8am today, defaults to tomorrow)
- Duration: Calculated in calendar days, calendar weeks, chargeable days, chargeable weeks
- Charge labels: "1 day", "3 days", "1 week", "2.4 weeks"
