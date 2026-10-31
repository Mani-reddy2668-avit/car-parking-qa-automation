# API Test Evidence — Car Parking Slot Booking System

## Test Environment

- API endpoint: `GET /api/bookings`
- Backend API host: `https://car-parking-slot-booking-system-hd8n.onrender.com`
- Tool: Postman
- Test area: Protected booking API authorization

## API Test Execution Results

### TC_073 — Unauthenticated Access to Protected Bookings API

- **Test Type:** API / Authorization
- **Request Method:** GET
- **Endpoint:** `/api/bookings`
- **Authentication:** No authentication token
- **Expected Result:** The API should reject unauthenticated access with HTTP 401 or 403.
- **Recorded Result:** The unauthenticated access check was successfully completed and the expected authorization rejection was verified.
- **Status:** PASS

### TC_074 — Cross-User Booking Modification Security

- **Test Type:** API / Security
- **Expected Result:** User A should not be able to modify a booking belonging to User B.
- **Execution Result:** Could not be completed because the required isolated and suitable test environment was unavailable.
- **Status:** SKIPPED

### TC_075 — Normal User Access to Protected Bookings API

- **Test Type:** API / Authorization
- **Request Method:** GET
- **Endpoint:** `/api/bookings`
- **Authentication:** Normal user's Bearer token
- **Expected Result:** The API should reject access to the protected bookings endpoint for a normal user.
- **Actual Result:** HTTP 403 Forbidden.
- **Status:** PASS

## Summary

| Result | Count |
|---|---:|
| Passed | 2 |
| Skipped | 1 |
| Failed | 0 |
| Total | 3 |

## Evidence Note

This document records the previously confirmed API test execution results. Original Postman response screenshots were not retained. TC_074 remains skipped and has not been presented as a completed security verification.