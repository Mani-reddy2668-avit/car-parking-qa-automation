import { test, expect } from '@playwright/test';
import LoginPage from '../pages/LoginPage.js';
import ParkingSlotsPage from '../pages/ParkingSlotsPage.js';
import users from '../test-data/users.js';

test('TC_046 - View booking history after login', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await page.goto('/');
    await page.getByRole('link', { name: 'Login', exact: true }).click();
    await loginPage.login(users.userA.email, users.userA.password);
    await expect(page.locator('.navbar-user')).toBeVisible({ timeout: 15000 });

    await page.getByRole('link', { name: 'My Bookings', exact: true }).click();
    await expect(page).toHaveURL(/\/my-bookings$/);
    await expect(page.getByRole('heading', { name: 'My Bookings' })).toBeVisible();
    await expect(page.locator('.booking-card').first()).toBeVisible();
});

test('TC_047 - Verify booking details in My Bookings', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await page.goto('/');
    await page.getByRole('link', { name: 'Login', exact: true }).click();
    await loginPage.login(users.userA.email, users.userA.password);
    await expect(page.locator('.navbar-user')).toBeVisible({ timeout: 15000 });

    await page.getByRole('link', { name: 'My Bookings', exact: true }).click();
    await expect(page).toHaveURL(/\/my-bookings$/);
    await expect(page.getByRole('heading', { name: 'My Bookings' })).toBeVisible();

    const booking = page.locator('.booking-card').first();
    await expect(booking).toBeVisible();
    const bookingText = await booking.innerText();

    await expect(booking.getByRole('heading', { level: 3 })).toBeVisible();
    expect(bookingText).toMatch(/\b(?:confirmed|cancelled|pending)\b/i);
    expect(bookingText).toMatch(/Vehicle:\s*[A-Z0-9]+\s+\([^)]+\)/i);
    expect(bookingText).toMatch(/Location:\s*.+?\s+Address:/i);
    expect(bookingText).toMatch(/Start Time:\s*.+?\s+End Time:/i);
    expect(bookingText).toMatch(/End Time:\s*.+?\s+Duration:/i);
    expect(bookingText).toMatch(/Duration:\s*.+?\s+Total Price:/i);
    expect(bookingText).toMatch(/Total Price:\s*₹[\d,]+/i);
    expect(bookingText).toMatch(/Payment Status:\s*(?:pending|completed)(?:\s*·\s*\w+)?/i);
});

test('TC_048 - Show only the logged-in user’s bookings', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await page.goto('/');
    await page.getByRole('link', { name: 'Login', exact: true }).click();
    await loginPage.login(users.userA.email, users.userA.password);
    await expect(page.locator('.navbar-user')).toBeVisible({ timeout: 15000 });
    await page.getByRole('link', { name: 'My Bookings', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'My Bookings' })).toBeVisible();

    const userABookingTexts = await page.locator('.booking-card').allInnerTexts();
    expect(userABookingTexts, 'User A should have at least one booking to compare').not.toHaveLength(0);
    const getBookingIdentifiers = bookingTexts => bookingTexts.map(bookingText => {
        const slot = bookingText.match(/Slot\s+([^\s]+)/i)?.[1];
        const vehicle = bookingText.match(/Vehicle:\s*([A-Z0-9]+)/i)?.[1];
        const startTime = bookingText.match(/Start Time:\s*(.+?)\s+End Time:/i)?.[1]
            ?.replace(/\s+/g, ' ')
            .trim();

        expect(slot, 'Each booking should display its slot').toBeTruthy();
        expect(vehicle, 'Each booking should display its vehicle number').toBeTruthy();
        expect(startTime, 'Each booking should display its start time').toBeTruthy();

        return `${slot}|${vehicle}|${startTime}`;
    });
    const userABookingIdentifiers = getBookingIdentifiers(userABookingTexts);

    await page.getByRole('button', { name: 'Logout' }).click();
    await expect(page.getByRole('link', { name: 'Login', exact: true })).toBeVisible();

    await page.getByRole('link', { name: 'Login', exact: true }).click();
    await loginPage.login(users.userB.email, users.userB.password);
    await expect(page.locator('.navbar-user')).toBeVisible({ timeout: 15000 });
    await page.getByRole('link', { name: 'My Bookings', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'My Bookings' })).toBeVisible();

    const userBBookingTexts = await page.locator('.booking-card').allInnerTexts();
    const userBBookingIdentifiers = getBookingIdentifiers(userBBookingTexts);
    for (const bookingIdentifier of userABookingIdentifiers) {
        expect(userBBookingIdentifiers).not.toContain(bookingIdentifier);
    }
});

test('TC_049 - Show a newly created booking in booking history', async ({ page }) => {
    test.setTimeout(60000);

    const loginPage = new LoginPage(page);
    const parkingSlotsPage = new ParkingSlotsPage(page);
    const vehicleNumber = `MH01AB${Math.floor(1000 + Math.random() * 9000)}`;
    const vehicleModel = 'Playwright Booking History Vehicle';

    await page.goto('/');
    await page.getByRole('link', { name: 'Login', exact: true }).click();
    await loginPage.login(users.userA.email, users.userA.password);
    await expect(page).toHaveURL(/\/slots$/, { timeout: 15000 });

    await parkingSlotsPage.selectState('Telangana');
    await parkingSlotsPage.selectCity('Hyderabad');
    const availableSlot = parkingSlotsPage.slotCards.filter({
        has: page.locator('button.book-button:enabled')
    }).first();
    await expect(availableSlot).toBeVisible();

    const slotDetails = await availableSlot.innerText();
    const slotNumber = slotDetails.match(/Slot Number:\s*(\S+)/i)?.[1];
    const hourlyRate = slotDetails.match(/Price:\s*(?:₹|Rs\.?\s*|INR\s*)([\d,]+)/i)?.[1];
    expect(slotNumber, 'The selected slot should display its number').toBeTruthy();
    expect(hourlyRate, 'The selected slot should display its hourly price').toBeTruthy();
    const totalPrice = Number(hourlyRate.replace(/,/g, '')) * 2;

    await availableSlot.locator('button.book-button').click();
    await page.locator('input[name="vehicleNumber"]').fill(vehicleNumber);
    await page.locator('input[name="vehicleModel"]').fill(vehicleModel);

    const continueToPayment = page.getByRole('button', { name: 'Continue to Payment' });
    const unavailableMessage = page.getByText(
        'Parking slot is not available for this time period.',
        { exact: true }
    );
    let bookingDate;
    let formattedBookingDate;

    for (let daysFromToday = 7; daysFromToday <= 60; daysFromToday += 1) {
        bookingDate = new Date();
        bookingDate.setDate(bookingDate.getDate() + daysFromToday);
        formattedBookingDate = [
            bookingDate.getFullYear(),
            String(bookingDate.getMonth() + 1).padStart(2, '0'),
            String(bookingDate.getDate()).padStart(2, '0')
        ].join('-');

        await page.locator('input[name="startDate"]').fill(formattedBookingDate);
        await page.locator('input[name="startTime"]').fill('10:00');
        await page.locator('input[name="endDate"]').fill(formattedBookingDate);
        await page.locator('input[name="endTime"]').fill('12:00');
        await page.getByRole('button', { name: 'Confirm Booking' }).click();
        await expect(continueToPayment.or(unavailableMessage)).toBeVisible({ timeout: 10000 });

        if (await continueToPayment.isVisible()) {
            break;
        }
    }

    await expect(continueToPayment).toBeVisible();
    const locationDetails = await page.getByText('Hotel / Location', { exact: true })
        .locator('xpath=following-sibling::*[1]')
        .innerText();
    const location = locationDetails.split(' · ')[0];
    expect(location, 'The booking confirmation should display the location').toBeTruthy();

    await continueToPayment.click();
    await expect(
        page.getByRole('heading', { name: 'Choose a demo payment method' })
    ).toBeVisible();
    await page.getByRole('link', { name: 'My Bookings', exact: true }).click();
    await expect(page).toHaveURL(/\/my-bookings$/);
    await expect(page.getByRole('heading', { name: 'My Bookings' })).toBeVisible();

    const createdBooking = page.locator('.booking-card').filter({ hasText: vehicleNumber });
    await expect(createdBooking).toHaveCount(1);
    await expect(createdBooking.getByRole('heading', { name: `Slot ${slotNumber}` })).toBeVisible();
    await expect(createdBooking).toContainText(
        new RegExp(`Vehicle:\\s*${vehicleNumber}\\s+\\(${vehicleModel}\\)`, 'i')
    );
    await expect(createdBooking).toContainText(location);
    await expect(createdBooking.locator('.status-badge.pending')).toHaveText(/^pending$/i);
    const displayDate = `${bookingDate.getDate()} ${
        ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][
            bookingDate.getMonth()
        ]
    } ${bookingDate.getFullYear()}`;
    const displayDatePattern = displayDate.replace(/ /g, '\\s*');
    await expect(createdBooking).toContainText(
        new RegExp(`Start Time:\\s*${displayDatePattern},?\\s*10:00 am`, 'i')
    );
    await expect(createdBooking).toContainText(
        new RegExp(`End Time:\\s*${displayDatePattern},?\\s*12:00 pm`, 'i')
    );
    await expect(createdBooking).toContainText(/Duration:\s*2 hour(?:s)?/i);
    await expect(createdBooking).toContainText(new RegExp(`Total Price:\\s*₹${totalPrice}`, 'i'));
    await expect(createdBooking).toContainText(/Payment Status:\s*pending/i);
});

test('TC_050 - Preserve booking history after logging in again', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await page.goto('/');
    await page.getByRole('link', { name: 'Login', exact: true }).click();
    await loginPage.login(users.userA.email, users.userA.password);
    await expect(page.locator('.navbar-user')).toBeVisible({ timeout: 15000 });
    await page.getByRole('link', { name: 'My Bookings', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'My Bookings' })).toBeVisible();

    const bookingCards = page.locator('.booking-card');
    await expect(bookingCards.first()).toBeVisible();

    const readBookingDetails = async card => {
        const bookingText = await card.innerText();
        const slot = await card.getByRole('heading', { level: 3 }).innerText();
        const status = (await card.locator('.status-badge').innerText()).trim();
        const vehicle = bookingText.match(/Vehicle:\s*([A-Z0-9]+\s+\([^)]+\))/i)?.[1];
        const location = bookingText.match(/Location:\s*(.+?)\s+Address:/i)?.[1];
        const startTime = bookingText.match(/Start Time:\s*(.+?)\s+End Time:/i)?.[1];
        const endTime = bookingText.match(/End Time:\s*(.+?)\s+Duration:/i)?.[1];
        const duration = bookingText.match(/Duration:\s*(.+?)\s+Total Price:/i)?.[1];
        const totalPrice = bookingText.match(/Total Price:\s*(₹[\d,]+)/i)?.[1];
        const paymentStatus = (await card.getByText('Payment Status:', { exact: true })
            .locator('xpath=following-sibling::*[1]')
            .innerText()).trim();

        expect(vehicle, 'Each booking should display its vehicle details').toBeTruthy();
        expect(location, 'Each booking should display its location').toBeTruthy();
        expect(startTime, 'Each booking should display its start time').toBeTruthy();
        expect(endTime, 'Each booking should display its end time').toBeTruthy();
        expect(duration, 'Each booking should display its duration').toBeTruthy();
        expect(totalPrice, 'Each booking should display its total price').toBeTruthy();
        expect(paymentStatus, 'Each booking should display its payment status').toBeTruthy();

        return {
            identifier: `${slot}|${vehicle}|${startTime}`,
            slot,
            status,
            vehicle,
            location,
            startTime,
            endTime,
            duration,
            totalPrice,
            paymentStatus
        };
    };

    const initialBookingCount = await bookingCards.count();
    const initialBookings = [];
    for (let index = 0; index < initialBookingCount; index += 1) {
        initialBookings.push(await readBookingDetails(bookingCards.nth(index)));
    }

    await page.getByRole('button', { name: 'Logout' }).click();
    await expect(page.getByRole('link', { name: 'Login', exact: true })).toBeVisible();

    await page.getByRole('link', { name: 'Login', exact: true }).click();
    await loginPage.login(users.userA.email, users.userA.password);
    await expect(page.locator('.navbar-user')).toBeVisible({ timeout: 15000 });
    await page.getByRole('link', { name: 'My Bookings', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'My Bookings' })).toBeVisible();

    const restoredBookingCards = page.locator('.booking-card');
    const restoredBookingCount = await restoredBookingCards.count();
    expect(restoredBookingCount).toBe(initialBookingCount);
    const restoredBookings = [];
    for (let index = 0; index < restoredBookingCount; index += 1) {
        restoredBookings.push(await readBookingDetails(restoredBookingCards.nth(index)));
    }

    for (const initialBooking of initialBookings) {
        const restoredBooking = restoredBookings.find(
            booking => booking.identifier === initialBooking.identifier
        );
        expect(
            restoredBooking,
            `Booking should remain available after re-login: ${initialBooking.identifier}`
        ).toEqual(initialBooking);
    }
});

test('TC_051 - Identify unpaid booking and show payment option', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await page.goto('/');
    await page.getByRole('link', { name: 'Login', exact: true }).click();
    await loginPage.login(users.userA.email, users.userA.password);
    await expect(page.locator('.navbar-user')).toBeVisible({ timeout: 15000 });

    await page.getByRole('link', { name: 'My Bookings', exact: true }).click();
    await expect(page).toHaveURL(/\/my-bookings$/);
    await expect(page.getByRole('heading', { name: 'My Bookings' })).toBeVisible();

    const unpaidBooking = page.locator('.booking-card')
        .filter({ has: page.locator('.payment-status.pending') })
        .filter({ has: page.getByRole('button', { name: /Pay Now|Continue demo payment/i }) })
        .first();
    await expect(unpaidBooking).toBeVisible();
    await expect(unpaidBooking.locator('.payment-status.pending')).toHaveText(/^pending$/i);
    await expect(unpaidBooking.getByRole('button', {
        name: /Pay Now|Continue demo payment/i
    })).toBeVisible();
});

test('TC_052 - Match booking actions to each booking status', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await page.goto('/');
    await page.getByRole('link', { name: 'Login', exact: true }).click();
    await loginPage.login(users.userA.email, users.userA.password);
    await expect(page.locator('.navbar-user')).toBeVisible({ timeout: 15000 });

    await page.getByRole('link', { name: 'My Bookings', exact: true }).click();
    await expect(page).toHaveURL(/\/my-bookings$/);
    await expect(page.getByRole('heading', { name: 'My Bookings' })).toBeVisible();

    const bookingCards = page.locator('.booking-card');
    await expect(bookingCards.first()).toBeVisible();

    for (let index = 0; index < await bookingCards.count(); index += 1) {
        const booking = bookingCards.nth(index);
        const statusBadge = booking.locator('.status-badge');
        await expect(statusBadge).toBeVisible();
        const status = (await statusBadge.innerText()).trim().toLowerCase();
        const paymentAction = booking.getByRole('button', {
            name: /Pay Now|Continue demo payment/i
        });
        const cancelAction = booking.getByRole('button', { name: 'Cancel Booking' });

        if (status === 'pending') {
            await expect(paymentAction).toBeVisible();
            await expect(cancelAction).toBeVisible();
        } else if (status === 'confirmed') {
            await expect(cancelAction).toBeVisible();
            await expect(paymentAction).toHaveCount(0);
        } else if (status === 'completed') {
            await expect(cancelAction).toHaveCount(0);
            await expect(paymentAction).toHaveCount(0);
        } else if (status === 'cancelled' || status === 'canceled') {
            await expect(cancelAction).toHaveCount(0);
            await expect(paymentAction).toHaveCount(0);
        } else {
            throw new Error(`Unexpected booking status: "${status}"`);
        }
    }
});