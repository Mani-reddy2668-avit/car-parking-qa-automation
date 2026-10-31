import { test, expect } from '@playwright/test';
import LoginPage from '../pages/LoginPage.js';
import ParkingSlotsPage from '../pages/ParkingSlotsPage.js';
import users from '../test-data/users.js';

test('TC_038 - Initiate payment for a valid unpaid booking', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await page.goto('/');
    await page.getByRole('link', { name: 'Login', exact: true }).click();
    await loginPage.login(users.userA.email, users.userA.password);
    await expect(page.locator('.navbar-user')).toBeVisible({ timeout: 15000 });

    await page.getByRole('link', { name: 'My Bookings', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'My Bookings' })).toBeVisible();

    const unpaidBooking = page.locator('.booking-card')
        .filter({ has: page.locator('.status-badge.pending') })
        .filter({ has: page.getByRole('button', { name: /Pay Now|Continue demo payment/i }) })
        .first();
    await expect(unpaidBooking).toBeVisible();

    await unpaidBooking.getByRole('button', {
        name: /Pay Now|Continue demo payment/i
    }).click();

    await expect(
        page.getByRole('heading', { name: 'Choose a demo payment method' })
    ).toBeVisible();
    await expect(
        page.getByRole('heading', { name: 'Payment Summary' })
    ).toBeVisible();
    await expect(
        page.getByRole('button', { name: 'Pay & Confirm Booking' })
    ).toBeVisible();
});

test('TC_039 - Verify unpaid booking amount on the demo payment page', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await page.goto('/');
    await page.getByRole('link', { name: 'Login', exact: true }).click();
    await loginPage.login(users.userA.email, users.userA.password);
    await expect(page.locator('.navbar-user')).toBeVisible({ timeout: 15000 });

    await page.getByRole('link', { name: 'My Bookings', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'My Bookings' })).toBeVisible();

    const unpaidBooking = page.locator('.booking-card')
        .filter({ has: page.locator('.status-badge.pending') })
        .filter({ has: page.getByRole('button', { name: /Pay Now|Continue demo payment/i }) })
        .first();
    await expect(unpaidBooking).toBeVisible();

    const bookingText = await unpaidBooking.innerText();
    const expectedAmount = bookingText.match(/Total Price:\s*(₹[\d,]+)/i)?.[1];
    expect(expectedAmount, 'The unpaid booking should display its total price').toBeTruthy();

    await unpaidBooking.getByRole('button', {
        name: /Pay Now|Continue demo payment/i
    }).click();

    await expect(
        page.getByRole('heading', { name: 'Choose a demo payment method' })
    ).toBeVisible();
    const paymentSummary = page.getByRole('region', { name: 'Payment Summary' });
    await expect(paymentSummary.getByText(expectedAmount, { exact: true })).toBeVisible();
});

test('TC_040 - Complete a demo payment and verify the booking is paid', async ({ page }) => {
    test.setTimeout(60000);

    const loginPage = new LoginPage(page);
    const parkingSlotsPage = new ParkingSlotsPage(page);

    await page.goto('/');
    await page.getByRole('link', { name: 'Login', exact: true }).click();
    await loginPage.login(users.userA.email, users.userA.password);
    await expect(page.locator('.navbar-user')).toBeVisible({ timeout: 15000 });

    await page.getByRole('link', { name: 'My Bookings', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'My Bookings' })).toBeVisible();

    let eligibleUnpaidBooking = page.locator('.booking-card')
        .filter({ has: page.locator('.status-badge.pending') })
        .filter({ has: page.getByRole('button', { name: /Pay Now|Continue demo payment/i }) });

    let targetVehicleNumber;
    if (await eligibleUnpaidBooking.count() === 0) {
        targetVehicleNumber = `MH01AB${Math.floor(1000 + Math.random() * 9000)}`;

        await parkingSlotsPage.open();
        await parkingSlotsPage.selectState('Telangana');
        await parkingSlotsPage.selectCity('Hyderabad');

        const availableSlot = parkingSlotsPage.slotCards.filter({
            has: page.locator('button.book-button:enabled')
        }).first();
        await expect(availableSlot).toBeVisible();
        await availableSlot.locator('button.book-button').click();

        await page.locator('input[name="vehicleNumber"]').fill(targetVehicleNumber);
        await page.locator('input[name="vehicleModel"]').fill('Playwright Demo Payment Vehicle');

        const startDate = page.locator('input[name="startDate"]');
        const endDate = page.locator('input[name="endDate"]');
        const startTime = page.locator('input[name="startTime"]');
        const endTime = page.locator('input[name="endTime"]');
        const continueToPayment = page.getByRole('button', { name: 'Continue to Payment' });
        const unavailableMessage = page.getByText(
            'Parking slot is not available for this time period.',
            { exact: true }
        );
        let bookingCreated = false;

        for (let daysFromToday = 7; daysFromToday <= 60; daysFromToday += 1) {
            const bookingDate = new Date();
            bookingDate.setDate(bookingDate.getDate() + daysFromToday);
            const formattedDate = [
                bookingDate.getFullYear(),
                String(bookingDate.getMonth() + 1).padStart(2, '0'),
                String(bookingDate.getDate()).padStart(2, '0')
            ].join('-');

            await startDate.fill(formattedDate);
            await startTime.fill('10:00');
            await endDate.fill(formattedDate);
            await endTime.fill('12:00');
            await page.getByRole('button', { name: 'Confirm Booking' }).click();
            await expect(continueToPayment.or(unavailableMessage)).toBeVisible({ timeout: 10000 });

            if (await continueToPayment.isVisible()) {
                bookingCreated = true;
                break;
            }
        }

        expect(bookingCreated, 'A new unpaid booking should be available for the test').toBe(true);
        await continueToPayment.click();
        await expect(
            page.getByRole('heading', { name: 'Choose a demo payment method' })
        ).toBeVisible();
        await page.getByRole('link', { name: 'My Bookings', exact: true }).click();
        await expect(page.getByRole('heading', { name: 'My Bookings' })).toBeVisible();

        eligibleUnpaidBooking = page.locator('.booking-card')
            .filter({ has: page.locator('.status-badge.pending') })
            .filter({ hasText: targetVehicleNumber })
            .filter({ has: page.getByRole('button', { name: /Pay Now|Continue demo payment/i }) });
    }

    const unpaidBooking = eligibleUnpaidBooking.first();
    await expect(unpaidBooking).toBeVisible();

    const bookingText = await unpaidBooking.innerText();
    const bookingSlot = bookingText.match(/Slot(?:\s+Number)?\s*:?\s*(\S+)/i)?.[1];
    const bookingVehicle = bookingText.match(/Vehicle:\s*(\S+)/i)?.[1];
    const bookingAmount = bookingText.match(/Total Price:\s*(₹[\d,]+)/i)?.[1];
    expect(bookingSlot, 'The unpaid booking should display its slot').toBeTruthy();
    expect(bookingVehicle, 'The unpaid booking should display its vehicle number').toBeTruthy();
    expect(bookingAmount, 'The unpaid booking should display its total price').toBeTruthy();
    await expect(unpaidBooking.locator('.payment-status.pending')).toHaveText(/^pending$/i);

    await unpaidBooking.getByRole('button', {
        name: /Pay Now|Continue demo payment/i
    }).click();
    await expect(
        page.getByRole('heading', { name: 'Choose a demo payment method' })
    ).toBeVisible();

    const paymentSummary = page.getByRole('region', { name: 'Payment Summary' });
    await expect(paymentSummary.getByText(bookingAmount, { exact: true })).toBeVisible();
    const upiOption = page.getByRole('radio', { name: 'UPI' });
    await expect(upiOption).toBeChecked();
    await page.getByRole('button', { name: 'Pay & Confirm Booking' }).click();
    await expect(
        page.getByRole('heading', { name: 'Booking Confirmed Successfully' })
    ).toBeVisible();

    await page.getByRole('link', { name: 'My Bookings', exact: true }).click();
    await expect(page).toHaveURL(/\/my-bookings$/);
    await page.reload();
    await expect(page.getByRole('heading', { name: 'My Bookings' })).toBeVisible();

    const paidBooking = page.locator('.booking-card')
        .filter({ hasText: bookingVehicle })
        .filter({ hasText: bookingSlot });
    await expect(paidBooking).toHaveCount(1, { timeout: 15000 });
    await expect(paidBooking).toContainText(bookingAmount);
    await expect(paidBooking).toContainText(/Payment Status:\s*completed\s*·\s*UPI/i);
});

test('TC_041 - Handle a failed payment without marking the booking as paid', async ({ page }) => {
    test.setTimeout(60000);

    const loginPage = new LoginPage(page);
    const parkingSlotsPage = new ParkingSlotsPage(page);

    await page.goto('/');
    await page.getByRole('link', { name: 'Login', exact: true }).click();
    await loginPage.login(users.userA.email, users.userA.password);
    await expect(page.locator('.navbar-user')).toBeVisible({ timeout: 15000 });

    await page.getByRole('link', { name: 'My Bookings', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'My Bookings' })).toBeVisible();

    let unpaidBooking = page.locator('.booking-card')
        .filter({ has: page.locator('.status-badge.pending') })
        .filter({ has: page.getByRole('button', { name: /Pay Now|Continue demo payment/i }) })
        .first();
    let bookingVehicle;

    if (await unpaidBooking.count() === 0) {
        bookingVehicle = `MH01AB${Math.floor(1000 + Math.random() * 9000)}`;

        await parkingSlotsPage.open();
        await parkingSlotsPage.selectState('Telangana');
        await parkingSlotsPage.selectCity('Hyderabad');

        const availableSlot = parkingSlotsPage.slotCards.filter({
            has: page.locator('button.book-button:enabled')
        }).first();
        await expect(availableSlot).toBeVisible();
        await availableSlot.locator('button.book-button').click();

        await page.locator('input[name="vehicleNumber"]').fill(bookingVehicle);
        await page.locator('input[name="vehicleModel"]').fill('Playwright Failed Payment Vehicle');

        const startDate = page.locator('input[name="startDate"]');
        const endDate = page.locator('input[name="endDate"]');
        const startTime = page.locator('input[name="startTime"]');
        const endTime = page.locator('input[name="endTime"]');
        const continueToPayment = page.getByRole('button', { name: 'Continue to Payment' });
        const unavailableMessage = page.getByText(
            'Parking slot is not available for this time period.',
            { exact: true }
        );
        let bookingCreated = false;

        for (let daysFromToday = 7; daysFromToday <= 60; daysFromToday += 1) {
            const bookingDate = new Date();
            bookingDate.setDate(bookingDate.getDate() + daysFromToday);
            const formattedDate = [
                bookingDate.getFullYear(),
                String(bookingDate.getMonth() + 1).padStart(2, '0'),
                String(bookingDate.getDate()).padStart(2, '0')
            ].join('-');

            await startDate.fill(formattedDate);
            await startTime.fill('10:00');
            await endDate.fill(formattedDate);
            await endTime.fill('12:00');
            await page.getByRole('button', { name: 'Confirm Booking' }).click();
            await expect(continueToPayment.or(unavailableMessage)).toBeVisible({ timeout: 10000 });

            if (await continueToPayment.isVisible()) {
                bookingCreated = true;
                break;
            }
        }

        expect(bookingCreated, 'A new unpaid booking should be available for the test').toBe(true);
        await continueToPayment.click();
        await expect(
            page.getByRole('heading', { name: 'Choose a demo payment method' })
        ).toBeVisible();
        await page.getByRole('link', { name: 'My Bookings', exact: true }).click();
        await expect(page.getByRole('heading', { name: 'My Bookings' })).toBeVisible();

        unpaidBooking = page.locator('.booking-card')
            .filter({ hasText: bookingVehicle })
            .filter({ has: page.locator('.status-badge.pending') })
            .filter({ has: page.getByRole('button', { name: /Pay Now|Continue demo payment/i }) })
            .first();
    }

    await expect(unpaidBooking).toBeVisible();
    if (!bookingVehicle) {
        const bookingText = await unpaidBooking.innerText();
        bookingVehicle = bookingVehicle || bookingText.match(/Vehicle:\s*(\S+)/i)?.[1];
    }
    expect(bookingVehicle, 'The unpaid booking should display its vehicle number').toBeTruthy();

    await unpaidBooking.getByRole('button', {
        name: /Pay Now|Continue demo payment/i
    }).click();
    await expect(
        page.getByRole('heading', { name: 'Choose a demo payment method' })
    ).toBeVisible();
    await expect(page.getByRole('radio', { name: 'UPI' })).toBeChecked();

    let paymentRequest;
    await page.route('**/bookings/*/demo-payment', async route => {
        const request = route.request();
        if (request.method() === 'OPTIONS') {
            const requestHeaders = request.headers()['access-control-request-headers']
                || 'authorization,content-type';
            await route.fulfill({
                status: 204,
                headers: {
                    'access-control-allow-origin': request.headers().origin || '*',
                    'access-control-allow-methods': 'POST, OPTIONS',
                    'access-control-allow-headers': requestHeaders
                }
            });
            return;
        }

        if (request.method() !== 'POST') {
            await route.continue();
            return;
        }

        paymentRequest = request;
        await route.fulfill({
            status: 402,
            headers: {
                'access-control-allow-origin': request.headers().origin || '*'
            },
            contentType: 'application/json',
            body: JSON.stringify({ message: 'Payment failed. Please try again.' })
        });
    });

    await page.getByRole('button', { name: 'Pay & Confirm Booking' }).click();
    await expect(page.getByText('Payment failed. Please try again.', { exact: true })).toBeVisible();
    expect(paymentRequest, 'The payment attempt should use the demo-payment endpoint').toBeTruthy();
    expect(paymentRequest.method()).toBe('POST');
    expect(new URL(paymentRequest.url()).pathname).toMatch(/\/bookings\/[^/]+\/demo-payment$/);

    await page.getByRole('link', { name: 'My Bookings', exact: true }).click();
    await expect(page).toHaveURL(/\/my-bookings$/);
    await page.reload();
    await expect(page.getByRole('heading', { name: 'My Bookings' })).toBeVisible();

    const bookingAfterFailure = page.locator('.booking-card').filter({ hasText: bookingVehicle });
    await expect(bookingAfterFailure).toHaveCount(1);
    await expect(bookingAfterFailure.getByText('Payment Status:', { exact: true })).toBeVisible();
    await expect(bookingAfterFailure.locator('.payment-status.pending')).toHaveText(/^pending$/i);
    await expect(bookingAfterFailure.locator('.payment-status.paid')).toHaveCount(0);
});

test('TC_042 - Close the payment process and keep the booking eligible for retry', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await page.goto('/');
    await page.getByRole('link', { name: 'Login', exact: true }).click();
    await loginPage.login(users.userA.email, users.userA.password);
    await expect(page.locator('.navbar-user')).toBeVisible({ timeout: 15000 });

    await page.getByRole('link', { name: 'My Bookings', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'My Bookings' })).toBeVisible();

    const unpaidBooking = page.locator('.booking-card')
        .filter({ has: page.locator('.payment-status.pending') })
        .filter({ has: page.getByRole('button', { name: /Pay Now|Continue demo payment/i }) })
        .first();
    await expect(unpaidBooking).toBeVisible();

    const bookingText = await unpaidBooking.innerText();
    const bookingVehicle = bookingText.match(/Vehicle:\s*(\S+)/i)?.[1];
    expect(bookingVehicle, 'The unpaid booking should display its vehicle number').toBeTruthy();

    let paymentAttempted = false;
    page.on('request', request => {
        const requestUrl = new URL(request.url());
        if (request.method() === 'POST' && /\/bookings\/[^/]+\/demo-payment$/.test(requestUrl.pathname)) {
            paymentAttempted = true;
        }
    });

    await unpaidBooking.getByRole('button', {
        name: /Pay Now|Continue demo payment/i
    }).click();
    await expect(
        page.getByRole('heading', { name: 'Choose a demo payment method' })
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Pay & Confirm Booking' })).toBeVisible();

    await page.goBack();
    await expect(page).toHaveURL(/\/my-bookings$/);
    await page.reload();
    await expect(page.getByRole('heading', { name: 'My Bookings' })).toBeVisible();

    const bookingAfterClosingPayment = page.locator('.booking-card').filter({ hasText: bookingVehicle });
    await expect(bookingAfterClosingPayment).toHaveCount(1);
    await expect(bookingAfterClosingPayment.locator('.payment-status.pending')).toHaveText(/^pending$/i);
    await expect(bookingAfterClosingPayment.getByRole('button', {
        name: /Pay Now|Continue demo payment/i
    })).toBeVisible();
    await expect(bookingAfterClosingPayment.locator('.payment-status.paid')).toHaveCount(0);
    expect(paymentAttempted, 'Closing the payment process must not submit a payment').toBe(false);

    await bookingAfterClosingPayment.getByRole('button', {
        name: /Pay Now|Continue demo payment/i
    }).click();
    await expect(
        page.getByRole('heading', { name: 'Choose a demo payment method' })
    ).toBeVisible();
    expect(paymentAttempted, 'Retrying should open payment without submitting it').toBe(false);
});

test('TC_043 - Verify successful payment details are associated with the correct booking', async ({ page }) => {
    test.setTimeout(60000);

    const loginPage = new LoginPage(page);
    const parkingSlotsPage = new ParkingSlotsPage(page);

    await page.goto('/');
    await page.getByRole('link', { name: 'Login', exact: true }).click();
    await loginPage.login(users.userA.email, users.userA.password);
    await expect(page.locator('.navbar-user')).toBeVisible({ timeout: 15000 });

    await page.getByRole('link', { name: 'My Bookings', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'My Bookings' })).toBeVisible();

    let unpaidBooking = page.locator('.booking-card')
        .filter({ has: page.locator('.payment-status.pending') })
        .filter({ has: page.getByRole('button', { name: /Pay Now|Continue demo payment/i }) })
        .first();
    let bookingVehicle;

    if (await unpaidBooking.count() === 0) {
        bookingVehicle = `MH01AB${Math.floor(1000 + Math.random() * 9000)}`;

        await parkingSlotsPage.open();
        await parkingSlotsPage.selectState('Telangana');
        await parkingSlotsPage.selectCity('Hyderabad');

        const availableSlot = parkingSlotsPage.slotCards.filter({
            has: page.locator('button.book-button:enabled')
        }).first();
        await expect(availableSlot).toBeVisible();
        await availableSlot.locator('button.book-button').click();

        await page.locator('input[name="vehicleNumber"]').fill(bookingVehicle);
        await page.locator('input[name="vehicleModel"]').fill('Honda City');

        const continueToPayment = page.getByRole('button', { name: 'Continue to Payment' });
        const unavailableMessage = page.getByText(
            'Parking slot is not available for this time period.',
            { exact: true }
        );
        let bookingCreated = false;

        for (let daysFromToday = 7; daysFromToday <= 60; daysFromToday += 1) {
            const bookingDate = new Date();
            bookingDate.setDate(bookingDate.getDate() + daysFromToday);
            const formattedDate = [
                bookingDate.getFullYear(),
                String(bookingDate.getMonth() + 1).padStart(2, '0'),
                String(bookingDate.getDate()).padStart(2, '0')
            ].join('-');

            await page.locator('input[name="startDate"]').fill(formattedDate);
            await page.locator('input[name="startTime"]').fill('10:00');
            await page.locator('input[name="endDate"]').fill(formattedDate);
            await page.locator('input[name="endTime"]').fill('12:00');
            await page.getByRole('button', { name: 'Confirm Booking' }).click();
            await expect(continueToPayment.or(unavailableMessage)).toBeVisible({ timeout: 10000 });

            if (await continueToPayment.isVisible()) {
                bookingCreated = true;
                break;
            }
        }

        expect(bookingCreated, 'A new unpaid booking should be available for the test').toBe(true);
        await continueToPayment.click();
        await expect(
            page.getByRole('heading', { name: 'Choose a demo payment method' })
        ).toBeVisible();
        await page.getByRole('link', { name: 'My Bookings', exact: true }).click();
        await expect(page.getByRole('heading', { name: 'My Bookings' })).toBeVisible();

        unpaidBooking = page.locator('.booking-card')
            .filter({ hasText: bookingVehicle })
            .filter({ has: page.locator('.payment-status.pending') })
            .filter({ has: page.getByRole('button', { name: /Pay Now|Continue demo payment/i }) })
            .first();
    }

    await expect(unpaidBooking).toBeVisible();

    const bookingText = await unpaidBooking.innerText();
    bookingVehicle = bookingVehicle || bookingText.match(/Vehicle:\s*(\S+)/i)?.[1];
    const bookingSlot = bookingText.match(/Slot(?:\s+Number)?\s*:?\s*(\S+)/i)?.[1];
    const bookingAmount = bookingText.match(/Total Price:\s*(₹[\d,]+)/i)?.[1];
    expect(bookingVehicle, 'The unpaid booking should display its vehicle number').toBeTruthy();
    expect(bookingSlot, 'The unpaid booking should display its slot').toBeTruthy();
    expect(bookingAmount, 'The unpaid booking should display its total price').toBeTruthy();

    await unpaidBooking.getByRole('button', {
        name: /Pay Now|Continue demo payment/i
    }).click();
    await expect(
        page.getByRole('heading', { name: 'Choose a demo payment method' })
    ).toBeVisible();

    const paymentSummary = page.getByRole('region', { name: 'Payment Summary' });
    await expect(paymentSummary.getByText(bookingAmount, { exact: true })).toBeVisible();
    await expect(page.getByRole('radio', { name: 'UPI' })).toBeChecked();

    const paymentResponsePromise = page.waitForResponse(response =>
        response.request().method() === 'POST'
        && /\/bookings\/[^/]+\/demo-payment$/.test(new URL(response.url()).pathname)
    );
    await page.getByRole('button', { name: 'Pay & Confirm Booking' }).click();
    const paymentResponse = await paymentResponsePromise;
    expect(paymentResponse.ok(), 'The payment verification request should succeed').toBe(true);
    await expect(
        page.getByRole('heading', { name: 'Booking Confirmed Successfully' })
    ).toBeVisible();

    await page.getByRole('link', { name: 'My Bookings', exact: true }).click();
    await expect(page).toHaveURL(/\/my-bookings$/);
    await page.reload();
    await expect(page.getByRole('heading', { name: 'My Bookings' })).toBeVisible();

    const paidBooking = page.locator('.booking-card')
        .filter({ hasText: bookingVehicle })
        .filter({ hasText: bookingSlot });
    await expect(paidBooking).toHaveCount(1);
    await expect(paidBooking).toContainText(bookingAmount);
    await expect(paidBooking).toContainText(/Payment Status:\s*completed\s*·\s*UPI/i);
});

test('TC_044 - Prevent another payment for an already-paid booking', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await page.goto('/');
    await page.getByRole('link', { name: 'Login', exact: true }).click();
    await loginPage.login(users.userA.email, users.userA.password);
    await expect(page.locator('.navbar-user')).toBeVisible({ timeout: 15000 });

    await page.getByRole('link', { name: 'My Bookings', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'My Bookings' })).toBeVisible();

    const paidBooking = page.locator('.booking-card')
        .filter({ hasText: /Payment Status:\s*completed/i })
        .first();
    await expect(paidBooking).toBeVisible();
    await expect(paidBooking).toContainText(/Payment Status:\s*completed\s*·\s*UPI/i);

    const paymentRequests = [];
    page.on('request', request => {
        const requestPath = new URL(request.url()).pathname;
        if (
            request.method() === 'POST' &&
            /\/bookings\/[^/]+\/demo-payment$/.test(requestPath)
        ) {
            paymentRequests.push(request);
        }
    });

    const retryPaymentButton = paidBooking.getByRole('button', {
        name: /Pay Now|Continue demo payment/i
    });
    if (await retryPaymentButton.count() > 0) {
        await retryPaymentButton.click();
    }

    await expect(
        page.getByRole('heading', { name: 'Choose a demo payment method' })
    ).not.toBeVisible();
    await expect(paidBooking).toContainText(/Payment Status:\s*completed/i);
    await expect(paidBooking.getByRole('button', {
        name: /Pay Now|Continue demo payment/i
    })).toHaveCount(0);
    expect(paymentRequests, 'An already-paid booking must not submit another payment').toHaveLength(0);

    await page.reload();
    await expect(page.getByRole('heading', { name: 'My Bookings' })).toBeVisible();

    const paidBookingAfterReload = page.locator('.booking-card')
        .filter({ hasText: /Payment Status:\s*completed/i })
        .first();

    await expect(paidBookingAfterReload).toBeVisible();
    await expect(paidBookingAfterReload).toContainText(/Payment Status:\s*completed\s*·\s*UPI/i);
    await expect(
        paidBookingAfterReload.getByRole('button', {
            name: /Pay Now|Continue demo payment/i
        })
    ).toHaveCount(0);
});

test('TC_045 - Reject invalid payment verification without marking booking paid', async ({ page }) => {
    test.setTimeout(60000);

    const loginPage = new LoginPage(page);
    const parkingSlotsPage = new ParkingSlotsPage(page);

    await page.goto('/');
    await page.getByRole('link', { name: 'Login', exact: true }).click();
    await loginPage.login(users.userA.email, users.userA.password);
    await expect(page.locator('.navbar-user')).toBeVisible({ timeout: 15000 });

    await page.getByRole('link', { name: 'My Bookings', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'My Bookings' })).toBeVisible();

    let unpaidBooking = page.locator('.booking-card')
        .filter({ has: page.locator('.payment-status.pending') })
        .filter({ has: page.getByRole('button', { name: /Pay Now|Continue demo payment/i }) })
        .first();
    let bookingVehicle;

    if (await unpaidBooking.count() === 0) {
        bookingVehicle = `MH01AB${Math.floor(1000 + Math.random() * 9000)}`;

        await parkingSlotsPage.open();
        await parkingSlotsPage.selectState('Telangana');
        await parkingSlotsPage.selectCity('Hyderabad');

        const availableSlot = parkingSlotsPage.slotCards.filter({
            has: page.locator('button.book-button:enabled')
        }).first();
        await expect(availableSlot).toBeVisible();
        await availableSlot.locator('button.book-button').click();

        await page.locator('input[name="vehicleNumber"]').fill(bookingVehicle);
        await page.locator('input[name="vehicleModel"]').fill('Playwright Invalid Verification Vehicle');

        const continueToPayment = page.getByRole('button', { name: 'Continue to Payment' });
        const unavailableMessage = page.getByText(
            'Parking slot is not available for this time period.',
            { exact: true }
        );
        let bookingCreated = false;

        for (let daysFromToday = 7; daysFromToday <= 60; daysFromToday += 1) {
            const bookingDate = new Date();
            bookingDate.setDate(bookingDate.getDate() + daysFromToday);
            const formattedDate = [
                bookingDate.getFullYear(),
                String(bookingDate.getMonth() + 1).padStart(2, '0'),
                String(bookingDate.getDate()).padStart(2, '0')
            ].join('-');

            await page.locator('input[name="startDate"]').fill(formattedDate);
            await page.locator('input[name="startTime"]').fill('10:00');
            await page.locator('input[name="endDate"]').fill(formattedDate);
            await page.locator('input[name="endTime"]').fill('12:00');
            await page.getByRole('button', { name: 'Confirm Booking' }).click();
            await expect(continueToPayment.or(unavailableMessage)).toBeVisible({ timeout: 10000 });

            if (await continueToPayment.isVisible()) {
                bookingCreated = true;
                break;
            }
        }

        expect(bookingCreated, 'A new unpaid booking should be available for the test').toBe(true);
        await continueToPayment.click();
        await expect(
            page.getByRole('heading', { name: 'Choose a demo payment method' })
        ).toBeVisible();
        await page.getByRole('link', { name: 'My Bookings', exact: true }).click();
        await expect(page.getByRole('heading', { name: 'My Bookings' })).toBeVisible();

        unpaidBooking = page.locator('.booking-card')
            .filter({ hasText: bookingVehicle })
            .filter({ has: page.locator('.payment-status.pending') })
            .filter({ has: page.getByRole('button', { name: /Pay Now|Continue demo payment/i }) })
            .first();
    }

    await expect(unpaidBooking).toBeVisible();
    if (!bookingVehicle) {
        const bookingText = await unpaidBooking.innerText();
        bookingVehicle = bookingText.match(/Vehicle:\s*(\S+)/i)?.[1];
    }
    expect(bookingVehicle, 'The unpaid booking should display its vehicle number').toBeTruthy();

    await unpaidBooking.getByRole('button', {
        name: /Pay Now|Continue demo payment/i
    }).click();
    await expect(
        page.getByRole('heading', { name: 'Choose a demo payment method' })
    ).toBeVisible();

    let paymentRequest;
    await page.route('**/bookings/*/demo-payment', async route => {
        const request = route.request();
        if (request.method() === 'OPTIONS') {
            const requestHeaders = request.headers()['access-control-request-headers']
                || 'authorization,content-type';
            await route.fulfill({
                status: 204,
                headers: {
                    'access-control-allow-origin': request.headers().origin || '*',
                    'access-control-allow-methods': 'POST, OPTIONS',
                    'access-control-allow-headers': requestHeaders
                }
            });
            return;
        }

        if (request.method() !== 'POST') {
            await route.continue();
            return;
        }

        paymentRequest = request;
        await route.fulfill({
            status: 400,
            headers: {
                'access-control-allow-origin': request.headers().origin || '*'
            },
            contentType: 'application/json',
            body: JSON.stringify({ message: 'Invalid payment verification data.' })
        });
    });

    await page.getByRole('button', { name: 'Pay & Confirm Booking' }).click();
    await expect(
        page.getByText('Invalid payment verification data.', { exact: true })
    ).toBeVisible();
    expect(paymentRequest, 'The verification attempt should use the demo-payment endpoint').toBeTruthy();
    expect(paymentRequest.method()).toBe('POST');
    expect(new URL(paymentRequest.url()).pathname)
        .toMatch(/\/bookings\/[^/]+\/demo-payment$/);

    await page.getByRole('link', { name: 'My Bookings', exact: true }).click();
    await expect(page).toHaveURL(/\/my-bookings$/);
    await page.reload();
    await expect(page.getByRole('heading', { name: 'My Bookings' })).toBeVisible();

    const bookingAfterInvalidVerification = page.locator('.booking-card')
        .filter({ hasText: bookingVehicle });
    await expect(bookingAfterInvalidVerification).toHaveCount(1);
    await expect(bookingAfterInvalidVerification)
        .toContainText(/Payment Status:\s*pending/i);

    await expect(bookingAfterInvalidVerification)
        .not.toContainText(/Payment Status:\s*completed/i);
    await expect(bookingAfterInvalidVerification.getByRole('button', {
        name: /Pay Now|Continue demo payment/i
    })).toBeVisible();
});