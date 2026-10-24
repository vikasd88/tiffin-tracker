# My Tiffin Tracker — review and acceptance status

## Fixes applied in this review

- Replacing an out-of-station slot with an order now removes only that slot on that date. The rest of the absence range and the other meal slot remain absent.
- Meal edits now check the finalized status of the meal's actual month, not only the currently displayed month.
- Absence ranges are rejected if they cross any finalized month, so a multi-month absence cannot bypass month locking.
- Date-only validation now rejects impossible calendar dates (for example, 31 April) while accepting valid leap dates.
- JSON restore validates date/meal/payment shapes, non-duplicate date+slot records, unique finalized months and no-charge No Order prices before asking to replace existing data.
- Restoring a backup also refreshes the pricing form state so a later settings save cannot overwrite restored prices with stale values.
- Local storage writes are guarded so disabled/full browser storage shows a warning instead of an uncaught error.
- Meal timestamps are displayed in Asia/Kolkata; month navigation uses UTC calendar arithmetic to avoid local timezone rollover.
- Replaced a non-functional profile-looking button with a non-interactive personal-use marker and improved the no-absence empty state.

## Logic smoke tests run

- PASS — strict date-only validation, including leap-day and invalid-date cases.
- PASS — replacing one slot on one date within a multi-day, two-slot absence preserves the other dates and other slot.
- PASS — chargeable meal sum and partial-payment arithmetic.

## Not verified in this environment

- Full TypeScript/Vite production build and browser end-to-end tests could not run because React and the other npm dependencies are missing from `node_modules`; `npm install` timed out while trying to reach the package registry.
- `http://localhost:5173/` was not reachable from this execution environment. Browser refresh persistence, mobile layout and UI console errors therefore still require verification on the user's machine.

## Manual browser acceptance checklist

1. Select a Mini Meal for lunch; verify dinner remains unchanged.
2. Change lunch to Full Meal and then No Order; verify the bill updates and No Order costs ₹0.
3. Mark three days away for lunch only; verify dinner and dates outside the range remain unaffected.
4. While away across a range, confirm one date's lunch with an order; verify other dates remain away and dinner remains away on that date.
5. Change prices and verify existing order prices remain unchanged.
6. Record a partial payment against a month; verify outstanding = bill − payments allocated to that month.
7. Navigate between months and verify date-wise rows and payments are scoped to the selected month.
8. Refresh and verify data remains; export JSON, import it into a test state and verify meals, prices, absences, payments and finalized months.
9. Import malformed JSON and verify the app rejects it without replacing current data.
10. Test narrow mobile widths and check the console for runtime errors.
