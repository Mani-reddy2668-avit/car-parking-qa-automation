[![Playwright Tests](https://github.com/Mani-reddy2668-avit/car-parking-qa-automation/actions/workflows/playwright.yml/badge.svg)](https://github.com/Mani-reddy2668-avit/car-parking-qa-automation/actions/workflows/playwright.yml)
# Car Parking Slot Booking System — Playwright Automation

## 1. Project Overview

This repository contains Playwright Test automation for the Car Parking Slot Booking System. It uses browser tests and selected API checks against the deployed application.

## 2. Project Objective

The project validates implemented user flows and application behavior for registration, authentication, parking slots, bookings, payments, booking history, sessions, and access control.

## 3. Application Under Test

- **Frontend / configured base URL:** https://car-parking-slot-booking-system-self.vercel.app
- **Backend URL:** No separate backend base URL is configured in the project. API checks use the application origin.

## 4. Testing Scope

The test files cover:

- Registration, including required-field, email, and phone validation
- Login, invalid credentials, and password visibility
- Parking-slot browsing, selection, availability, filters, and overlapping bookings
- Booking inputs, vehicle validation, date/time, duration, price, confirmation, and cancellation
- Demo-payment initiation, successful payment completion, and applicable payment-status checks.
- Payment-failure, gateway-cancellation, and signature-verification scenarios are limited by the current demo implementation.
- Booking history, booking details, user-specific data, and session/logout behavior
- Desktop and mobile-viewport layout checks and form-control usability
- Selected authorization checks for protected booking API access

These are areas represented by the test cases; this does not imply that every possible behavior in each area is covered. Admin-management test cases are skipped because admin functionality is not implemented.

## 5. Tools and Technologies

- JavaScript
- Node.js and npm
- Playwright Test (`@playwright/test`)
- dotenv for loading environment variables
- Chromium (the only enabled Playwright browser project)
- GitHub Actions

## 6. Project Folder Structure

```text
.
├── .github/
│   └── workflows/
│       └── playwright.yml
├── pages/
│   ├── LoginPage.js
│   ├── ParkingSlotsPage.js
│   └── RegistrationPage.js
├── test-data/
│   ├── tc023-booking.json
│   └── users.js
├── tests/
│   ├── Ui,compatibility.spec.js
│   ├── admin-management.spec.js
│   ├── booking-management.spec.js
│   ├── login.spec.js
│   ├── logout-management.spec.js
│   ├── my-bookings.spec.js
│   ├── parking-slots.spec.js
│   ├── payment-management.spec.js
│   └── registration.spec.js
├── .env                  # Local only; ignored by Git
├── .gitignore
├── package-lock.json
├── package.json
├── playwright.config.js
├── playwright-report/    # Generated, ignored by Git
├── README.md
└── test-results/         # Generated, ignored by Git
```

Generated dependencies (`node_modules/`) are also ignored by Git.

## 7. Prerequisites

- Node.js and npm
- Network access to the configured application
- Authorized test-user accounts provided through environment variables
- Playwright's Chromium browser

## 8. Installation and Setup

From the project root, install the locked dependencies and browser:

```bash
npm ci
npx playwright install chromium
```

Create a local `.env` file containing the required test-user variables. The Playwright configuration loads it through `dotenv/config`. The `.env` file is ignored by Git; do not commit or share its contents.

## 9. Environment Variables

Variable names used by the test data:

```text
USER_A_EMAIL
USER_A_PASSWORD
USER_B_EMAIL
USER_B_PASSWORD
USER_C_EMAIL
USER_C_PASSWORD
```

The Playwright configuration also checks `CI` to control CI-specific retries and the `forbidOnly` setting.

## 10. How to Run Tests

There are no npm scripts defined in `package.json`. Run Playwright directly:

```bash
npx playwright test
```

Run one test file:

```bash
npx playwright test tests/login.spec.js
```

Run the configured browser project explicitly:

```bash
npx playwright test --project=chromium
```

## 11. How to Generate and View the Playwright HTML Report

The configured HTML reporter generates the report when tests run. Open it locally with:

```bash
npx playwright show-report
```

The report is written to `playwright-report/`.

## 12. Test Execution Summary

The confirmed execution results are:

| Result | Count |
|---|---:|
| Total tests | 75 |
| Passed | 64 |
| Skipped | 11 |
| Failed | 0 |

## 13. Skipped Test Cases and Reasons

The 11 skipped tests are:

- **9 Admin Management tests (TC_059–TC_067):** Admin functionality is not implemented in the application.
- **TC_020:** The required unavailable or booked slot is not present in the current test data.
- **TC_074:** Cross-user booking modification security verification is pending an isolated, authorized test environment.

## 14. Defect Tracking (Jira)

Defects are tracked separately in the **ParkEasy QA** Jira project; Jira is not integrated with this automation.

| Issue | Description | Status |
|---|---|---|
| SCRUM-5 | Registration accepts invalid phone numbers with incorrect length | Done |
| SCRUM-6 | Booking fails with "Parking slot not found" for available parking slots | Done |
| SCRUM-8 | Invalid vehicle details accepted during booking | Done |

All three defects were fixed and retested successfully.

## 15. Known Limitations

- Only Chromium is enabled in the Playwright configuration. Mobile checks use a mobile viewport; Firefox and WebKit are not configured as active projects.
- The tests use shared remote demo accounts and booking data. The configuration runs with one worker and disables full parallel execution.
- Admin-management behavior is not available in the application and its corresponding test cases are skipped.
- TC_020 depends on unavailable or occupied slot data that may not be present.
- TC_074 requires an isolated, authorized environment before cross-user booking modification security verification can be performed.
- No separate backend base URL is configured.

## 16. Test Evidence

- Portfolio evidence deliverables maintained separately from this repository: the Master Test Cases Excel workbook, Jira defect-tracking evidence, and Final QA Test Execution Report PDF.
- The local HTML report is generated in `playwright-report/` and can be opened with `npx playwright show-report`.
- Playwright writes run output to `test-results/`.
- The GitHub Actions workflow is configured for pushes and pull requests targeting `main` or `master`. It runs on `ubuntu-latest` with a 60-minute job timeout, checks out the project using `actions/checkout@v4`, and sets up the latest Node.js LTS using `actions/setup-node@v4` with `node-version: lts/*`.
- CI installs dependencies with `npm ci`, installs Playwright browsers and their system dependencies with `npx playwright install --with-deps`, and runs `npx playwright test`.
- The workflow uses `actions/upload-artifact@v4` to upload `playwright-report/` as the `playwright-report` artifact when the run has not been cancelled; retention is set to 30 days. It does not configure an upload for `test-results/`. These are workflow settings, not evidence that a CI run completed successfully.
