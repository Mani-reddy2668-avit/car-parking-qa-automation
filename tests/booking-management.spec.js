import { test, expect } from '@playwright/test';
import LoginPage from '../pages/LoginPage.js';
import ParkingSlotsPage from '../pages/ParkingSlotsPage.js';
import users from '../test-data/users.js';

test('TC_028 - Verify a logged-in user can successfully create a parking booking', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const parkingSlotsPage = new ParkingSlotsPage(page);
    const vehicleNumber = `MH01AB${Date.now().toString().slice(-4)}`;
    const vehicleModel = 'Playwright Test Vehicle';

    // Step 1: Log in and open the parking slots page.
    await page.goto('/');
    await page.getByRole('link', { name: 'Login', exact: true }).click();
    await loginPage.login(users.userA.email, users.userA.password);
    await expect(page).toHaveURL(/\/slots$/, { timeout: 15000 });

    // Step 2: Select an available parking slot and retain its details for verification.
    await parkingSlotsPage.selectState('Telangana');
    await parkingSlotsPage.selectCity('Hyderabad');
    const availableSlot = parkingSlotsPage.slotCards.filter({
        has: page.locator('button.book-button:enabled')
    }).last();
    await expect(availableSlot).toBeVisible();

    const slotDetails = await availableSlot.innerText();
    const slotNumber = slotDetails.match(/Slot Number:\s*(\S+)/i)?.[1];
    const hourlyRate = slotDetails.match(/Price:\s*(?:₹|Rs\.?\s*|INR\s*)([\d,]+)/i)?.[1];
    expect(slotNumber, 'Selected slot should display its slot number').toBeTruthy();
    expect(hourlyRate, 'Selected slot should display its hourly price').toBeTruthy();

    const expectedTotal = Number(hourlyRate.replace(/,/g, '')) * 2;
    await availableSlot.locator('button.book-button').click();

    // Steps 3-6: Enter vehicle and booking details. Move to a future date if a
    // previously created booking occupies the selected slot and time.
    await page.locator('input[name="vehicleNumber"]').fill(vehicleNumber);
    await page.locator('input[name="vehicleModel"]').fill(vehicleModel);

    const startDate = page.locator('input[name="startDate"]');
    const endDate = page.locator('input[name="endDate"]');
    const startTime = page.locator('input[name="startTime"]');
    const endTime = page.locator('input[name="endTime"]');
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

        await startDate.fill(formattedBookingDate);
        await startTime.fill('10:00');
        await endDate.fill(formattedBookingDate);
        await endTime.fill('12:00');
        await expect(startDate).toHaveValue(formattedBookingDate);
        await expect(startTime).toHaveValue('10:00');
        await expect(endDate).toHaveValue(formattedBookingDate);
        await expect(endTime).toHaveValue('12:00');
        await expect(page.locator('body')).toContainText('2 Hours');
        await expect(page.locator('body')).toContainText(`₹${expectedTotal}`);

        await page.getByRole('button', { name: 'Confirm Booking' }).click();
        await expect(continueToPayment.or(unavailableMessage)).toBeVisible({ timeout: 10000 });

        if (await continueToPayment.isVisible()) {
            break;
        }
    }

    await expect(continueToPayment).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Confirm your booking' })).toBeVisible();

    // Steps 7-8: Confirm the booking details and the two-hour calculated price.
    const bookingSummary = (await page.locator('body').innerText()).replace(/,/g, '');
    const bookingSummaryDate = `${bookingDate.getDate()} ${
        ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][
            bookingDate.getMonth()
        ]
    } ${bookingDate.getFullYear()}`;
    expect(bookingSummary).toContain(slotNumber);
    expect(bookingSummary).toContain(vehicleNumber);
    expect(bookingSummary).toContain(vehicleModel);
    expect(bookingSummary).toContain(bookingSummaryDate);
    expect(bookingSummary).toContain('10:00 am');
    expect(bookingSummary).toContain('12:00 pm');
    expect(bookingSummary).toContain('2 hour(s)');
    expect(bookingSummary).toContain(`₹${expectedTotal}`);

    // Step 9: Complete the application's demo payment.
    await continueToPayment.click();
    await page.getByRole('button', { name: 'Pay & Confirm Booking' }).click();
    await expect(
        page.getByRole('heading', { name: 'Booking Confirmed Successfully' })
    ).toBeVisible();

    // Verify the confirmed booking is associated with this user's booking history.
    await page.getByRole('link', { name: 'My Bookings', exact: true }).click();
    const createdBooking = page.locator('.booking-card').filter({
        hasText: vehicleNumber
    });
    await expect(createdBooking).toBeVisible();
    await expect(createdBooking).toContainText(slotNumber);
    await expect(createdBooking).toContainText(vehicleModel);
});

test('TC_029 - Verify required vehicle and booking fields cannot be left blank', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const parkingSlotsPage = new ParkingSlotsPage(page);

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
    await availableSlot.locator('button.book-button').click();

    const requiredFields = [
        page.locator('input[name="vehicleNumber"]'),
        page.locator('input[name="vehicleModel"]'),
        page.locator('input[name="startDate"]'),
        page.locator('input[name="startTime"]'),
        page.locator('input[name="endDate"]'),
        page.locator('input[name="endTime"]')
    ];

    for (const field of requiredFields) {
        await expect(field).toHaveValue('');
    }

    await expect(page.getByRole('button', { name: 'Confirm Booking' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Continue to Payment' })).toHaveCount(0);

    for (const field of requiredFields) {
        await expect(field.locator('xpath=..').locator('label')).toContainText('*');
    }
});

test('TC_030 - Verify invalid vehicle information is rejected during booking', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const parkingSlotsPage = new ParkingSlotsPage(page);

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
    await availableSlot.locator('button.book-button').click();

    const vehicleNumber = page.locator('input[name="vehicleNumber"]');
    await vehicleNumber.fill('INVALID!');
    await page.locator('input[name="vehicleModel"]').fill('Playwright Test Vehicle');

    const bookingDate = new Date();
    bookingDate.setDate(bookingDate.getDate() + 7);
    const formattedBookingDate = [
        bookingDate.getFullYear(),
        String(bookingDate.getMonth() + 1).padStart(2, '0'),
        String(bookingDate.getDate()).padStart(2, '0')
    ].join('-');

    await page.locator('input[name="startDate"]').fill(formattedBookingDate);
    await page.locator('input[name="startTime"]').fill('10:00');
    await page.locator('input[name="endDate"]').fill(formattedBookingDate);
    await page.locator('input[name="endTime"]').fill('12:00');

    const confirmBooking = page.getByRole('button', { name: 'Confirm Booking' });
    if (await confirmBooking.isEnabled()) {
        await confirmBooking.click();
    }

    await expect(confirmBooking).toBeVisible();
    await expect(
        page.getByText(
            'Enter a valid Indian vehicle registration number, such as MH01AB1234.',
            { exact: true }
        )
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Continue to Payment' })).toHaveCount(0);
});

test('TC_031 - Verify a valid booking period calculates duration correctly', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const parkingSlotsPage = new ParkingSlotsPage(page);

    await page.goto('/');
    await page.getByRole('link', { name: 'Login', exact: true }).click();
    await loginPage.login(users.userA.email, users.userA.password);
    await expect(page).toHaveURL(/\/slots$/, { timeout: 15000 });

    await parkingSlotsPage.selectState('Telangana');
    await parkingSlotsPage.selectCity('Hyderabad');
    const availableSlot = parkingSlotsPage.slotCards.filter({
        has: page.locator('button.book-button:enabled')
    }).last();
    await expect(availableSlot).toBeVisible();

    const slotDetails = await availableSlot.innerText();
    const hourlyRate = slotDetails.match(/Price:\s*(?:₹|Rs\.?\s*|INR\s*)([\d,]+)/i)?.[1];
    expect(hourlyRate, 'Selected slot should display its hourly price').toBeTruthy();
    const expectedTotal = Number(hourlyRate.replace(/,/g, '')) * 3;
    await availableSlot.locator('button.book-button').click();

    await page.locator('input[name="vehicleNumber"]').fill(
        `MH01AB${Date.now().toString().slice(-4)}`
    );
    await page.locator('input[name="vehicleModel"]').fill('Playwright Test Vehicle');

    const startDate = page.locator('input[name="startDate"]');
    const endDate = page.locator('input[name="endDate"]');
    const startTime = page.locator('input[name="startTime"]');
    const endTime = page.locator('input[name="endTime"]');
    const continueToPayment = page.getByRole('button', { name: 'Continue to Payment' });
    const unavailableMessage = page.getByText(
        'Parking slot is not available for this time period.',
        { exact: true }
    );

    for (let daysFromToday = 7; daysFromToday <= 60; daysFromToday += 1) {
        const bookingDate = new Date();
        bookingDate.setDate(bookingDate.getDate() + daysFromToday);
        const formattedBookingDate = [
            bookingDate.getFullYear(),
            String(bookingDate.getMonth() + 1).padStart(2, '0'),
            String(bookingDate.getDate()).padStart(2, '0')
        ].join('-');
        const startDateTime = new Date(`${formattedBookingDate}T10:00:00`);
        const endDateTime = new Date(`${formattedBookingDate}T13:00:00`);
        expect(
            endDateTime.getTime(),
            'Booking end date/time should be later than the start date/time'
        ).toBeGreaterThan(startDateTime.getTime());

        await startDate.fill(formattedBookingDate);
        await startTime.fill('10:00');
        await endDate.fill(formattedBookingDate);
        await endTime.fill('13:00');

        await expect(startDate).toHaveValue(formattedBookingDate);
        await expect(startTime).toHaveValue('10:00');
        await expect(endDate).toHaveValue(formattedBookingDate);
        await expect(endTime).toHaveValue('13:00');
        await expect(page.locator('body')).toContainText('3 Hours');
        await expect(page.locator('body')).toContainText(`₹${expectedTotal}`);

        await page.getByRole('button', { name: 'Confirm Booking' }).click();
        await expect(continueToPayment.or(unavailableMessage)).toBeVisible({ timeout: 10000 });

        if (await continueToPayment.isVisible()) {
            break;
        }
    }

    await expect(continueToPayment).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Confirm your booking' })).toBeVisible();
    const bookingSummary = (await page.locator('body').innerText()).replace(/,/g, '');
    expect(bookingSummary).toContain('10:00 am');
    expect(bookingSummary).toContain('1:00 pm');
    expect(bookingSummary).toContain('3 hour(s)');
    expect(bookingSummary).toContain(`₹${expectedTotal}`);
});

test('TC_032 - Verify an earlier end date disables booking confirmation', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const parkingSlotsPage = new ParkingSlotsPage(page);

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
    await availableSlot.locator('button.book-button').click();

    const bookingDate = new Date();
    bookingDate.setDate(bookingDate.getDate() + 8);
    const startDateValue = [
        bookingDate.getFullYear(),
        String(bookingDate.getMonth() + 1).padStart(2, '0'),
        String(bookingDate.getDate()).padStart(2, '0')
    ].join('-');
    const validEndDateValue = startDateValue;
    const earlierEndDate = new Date(bookingDate);
    earlierEndDate.setDate(earlierEndDate.getDate() - 1);
    const earlierEndDateValue = [
        earlierEndDate.getFullYear(),
        String(earlierEndDate.getMonth() + 1).padStart(2, '0'),
        String(earlierEndDate.getDate()).padStart(2, '0')
    ].join('-');

    await page.locator('input[name="vehicleNumber"]').fill(
        `MH01AB${Date.now().toString().slice(-4)}`
    );
    await page.locator('input[name="vehicleModel"]').fill('Playwright Test Vehicle');
    await page.locator('input[name="startDate"]').fill(startDateValue);
    await page.locator('input[name="startTime"]').fill('10:00');
    await page.locator('input[name="endDate"]').fill(validEndDateValue);
    await page.locator('input[name="endTime"]').fill('12:00');

    await expect(page.locator('input[name="startDate"]')).toHaveValue(startDateValue);
    await expect(page.locator('input[name="endDate"]')).toHaveValue(validEndDateValue);
    const confirmBooking = page.getByRole('button', { name: 'Confirm Booking' });
    await expect(confirmBooking).toBeEnabled();

    await page.locator('input[name="endDate"]').fill(earlierEndDateValue);
    await expect(page.locator('input[name="endDate"]')).toHaveValue(earlierEndDateValue);
    const endBeforeStart = new Date(`${earlierEndDateValue}T12:00:00`);
    const startDateTime = new Date(`${startDateValue}T10:00:00`);
    expect(
        endBeforeStart.getTime(),
        'Test booking end date/time must be earlier than its start date/time'
    ).toBeLessThan(startDateTime.getTime());

    await expect(confirmBooking).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Continue to Payment' })).toHaveCount(0);
});

test('TC_033 - Verify total booking duration matches the selected date and time', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const parkingSlotsPage = new ParkingSlotsPage(page);

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
    await availableSlot.locator('button.book-button').click();

    const bookingDate = new Date();
    bookingDate.setDate(bookingDate.getDate() + 7);
    const bookingDateValue = [
        bookingDate.getFullYear(),
        String(bookingDate.getMonth() + 1).padStart(2, '0'),
        String(bookingDate.getDate()).padStart(2, '0')
    ].join('-');
    const startTimeValue = '10:00';
    const endTimeValue = '14:00';

    await page.locator('input[name="vehicleNumber"]').fill(
        `MH01AB${Date.now().toString().slice(-4)}`
    );
    await page.locator('input[name="vehicleModel"]').fill('Playwright Test Vehicle');
    await page.locator('input[name="startDate"]').fill(bookingDateValue);
    await page.locator('input[name="startTime"]').fill(startTimeValue);
    await page.locator('input[name="endDate"]').fill(bookingDateValue);
    await page.locator('input[name="endTime"]').fill(endTimeValue);

    await expect(page.locator('input[name="startDate"]')).toHaveValue(bookingDateValue);
    await expect(page.locator('input[name="startTime"]')).toHaveValue(startTimeValue);
    await expect(page.locator('input[name="endDate"]')).toHaveValue(bookingDateValue);
    await expect(page.locator('input[name="endTime"]')).toHaveValue(endTimeValue);
    await expect(page.locator('body')).toContainText('4 Hours');
    await expect(page.getByRole('button', { name: 'Confirm Booking' })).toBeEnabled();
});

test('TC_034 - Verify total booking price is duration multiplied by hourly rate', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const parkingSlotsPage = new ParkingSlotsPage(page);

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
    const hourlyRate = slotDetails.match(/Price:\s*(?:₹|Rs\.?\s*|INR\s*)([\d,]+)/i)?.[1];
    expect(hourlyRate, 'Selected slot should display its hourly price').toBeTruthy();

    await availableSlot.locator('button.book-button').click();

    const bookingDate = new Date();
    bookingDate.setDate(bookingDate.getDate() + 7);
    const bookingDateValue = [
        bookingDate.getFullYear(),
        String(bookingDate.getMonth() + 1).padStart(2, '0'),
        String(bookingDate.getDate()).padStart(2, '0')
    ].join('-');
    const startTimeValue = '10:00';
    const endTimeValue = '13:00';
    const startDateTime = new Date(`${bookingDateValue}T${startTimeValue}:00`);
    const endDateTime = new Date(`${bookingDateValue}T${endTimeValue}:00`);
    const bookingDurationHours =
        (endDateTime.getTime() - startDateTime.getTime()) / (60 * 60 * 1000);
    expect(
        bookingDurationHours,
        'Selected booking end date/time should be later than its start date/time'
    ).toBeGreaterThan(0);

    const hourlyRateAmount = Number(hourlyRate.replace(/,/g, ''));
    const expectedTotal = hourlyRateAmount * bookingDurationHours;
    expect(Number.isFinite(expectedTotal), 'Expected booking total should be a valid number').toBe(true);

    await page.locator('input[name="vehicleNumber"]').fill(
        `MH01AB${Date.now().toString().slice(-4)}`
    );
    await page.locator('input[name="vehicleModel"]').fill('Playwright Test Vehicle');
    await page.locator('input[name="startDate"]').fill(bookingDateValue);
    await page.locator('input[name="startTime"]').fill(startTimeValue);
    await page.locator('input[name="endDate"]').fill(bookingDateValue);
    await page.locator('input[name="endTime"]').fill(endTimeValue);

    await expect(page.locator('input[name="startDate"]')).toHaveValue(bookingDateValue);
    await expect(page.locator('input[name="startTime"]')).toHaveValue(startTimeValue);
    await expect(page.locator('input[name="endDate"]')).toHaveValue(bookingDateValue);
    await expect(page.locator('input[name="endTime"]')).toHaveValue(endTimeValue);
    await expect(page.locator('body')).toContainText(`${bookingDurationHours} Hours`);
    await expect(page.locator('body')).toContainText(`₹${expectedTotal}`);
});

test('TC_035 - Verify successful booking confirmation and history details', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const parkingSlotsPage = new ParkingSlotsPage(page);
    const vehicleNumber = `MH01AB${Date.now().toString().slice(-4)}`;
    const vehicleModel = 'Playwright Test Vehicle';
    const startTimeValue = '10:00';
    const endTimeValue = '12:00';
    const bookingDurationHours = 2;

    await page.goto('/');
    await page.getByRole('link', { name: 'Login', exact: true }).click();
    await loginPage.login(users.userA.email, users.userA.password);
    await expect(page).toHaveURL(/\/slots$/, { timeout: 15000 });

    await parkingSlotsPage.selectState('Telangana');
    await parkingSlotsPage.selectCity('Hyderabad');
    const availableSlot = parkingSlotsPage.slotCards.filter({
        has: page.locator('button.book-button:enabled')
    }).last();
    await expect(availableSlot).toBeVisible();

    const slotDetails = await availableSlot.innerText();
    const slotNumber = slotDetails.match(/Slot Number:\s*(\S+)/i)?.[1];
    const hourlyRate = slotDetails.match(/Price:\s*(?:₹|Rs\.?\s*|INR\s*)([\d,]+)/i)?.[1];
    expect(slotNumber, 'Selected slot should display its slot number').toBeTruthy();
    expect(hourlyRate, 'Selected slot should display its hourly price').toBeTruthy();
    const expectedTotal = Number(hourlyRate.replace(/,/g, '')) * bookingDurationHours;

    await availableSlot.locator('button.book-button').click();
    await page.locator('input[name="vehicleNumber"]').fill(vehicleNumber);
    await page.locator('input[name="vehicleModel"]').fill(vehicleModel);

    const startDate = page.locator('input[name="startDate"]');
    const endDate = page.locator('input[name="endDate"]');
    const startTime = page.locator('input[name="startTime"]');
    const endTime = page.locator('input[name="endTime"]');
    const continueToPayment = page.getByRole('button', { name: 'Continue to Payment' });
    const unavailableMessage = page.getByText(
        'Parking slot is not available for this time period.',
        { exact: true }
    );
    let bookingDate;
    let bookingDateValue;

    for (let daysFromToday = 7; daysFromToday <= 60; daysFromToday += 1) {
        bookingDate = new Date();
        bookingDate.setDate(bookingDate.getDate() + daysFromToday);
        bookingDateValue = [
            bookingDate.getFullYear(),
            String(bookingDate.getMonth() + 1).padStart(2, '0'),
            String(bookingDate.getDate()).padStart(2, '0')
        ].join('-');

        await startDate.fill(bookingDateValue);
        await startTime.fill(startTimeValue);
        await endDate.fill(bookingDateValue);
        await endTime.fill(endTimeValue);

        await expect(startDate).toHaveValue(bookingDateValue);
        await expect(startTime).toHaveValue(startTimeValue);
        await expect(endDate).toHaveValue(bookingDateValue);
        await expect(endTime).toHaveValue(endTimeValue);
        await expect(page.locator('body')).toContainText(`${bookingDurationHours} Hours`);
        await expect(page.locator('body')).toContainText(`₹${expectedTotal}`);

        await page.getByRole('button', { name: 'Confirm Booking' }).click();
        await expect(continueToPayment.or(unavailableMessage)).toBeVisible({ timeout: 10000 });

        if (await continueToPayment.isVisible()) {
            break;
        }
    }

    await expect(continueToPayment).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Confirm your booking' })).toBeVisible();

    const bookingDateLabel = `${bookingDate.getDate()} ${
        ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][
            bookingDate.getMonth()
        ]
    } ${bookingDate.getFullYear()}`;
    const bookingSummary = (await page.locator('body').innerText()).replace(/,/g, '');
    expect(bookingSummary).toContain(slotNumber);
    expect(bookingSummary).toContain(vehicleNumber);
    expect(bookingSummary).toContain(vehicleModel);
    expect(bookingSummary).toContain(bookingDateLabel);
    expect(bookingSummary).toContain('10:00 am');
    expect(bookingSummary).toContain('12:00 pm');
    expect(bookingSummary).toContain(`${bookingDurationHours} hour(s)`);
    expect(bookingSummary).toContain(`₹${expectedTotal}`);

    await continueToPayment.click();
    await page.getByRole('button', { name: 'Pay & Confirm Booking' }).click();
    await expect(
        page.getByRole('heading', { name: 'Booking Confirmed Successfully' })
    ).toBeVisible();

    await page.getByRole('link', { name: 'My Bookings', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'My Bookings' })).toBeVisible();
    const createdBooking = page.locator('.booking-card').filter({
        hasText: vehicleNumber
    });
    await expect(createdBooking).toBeVisible();
    await expect(createdBooking).toContainText(slotNumber);
    await expect(createdBooking).toContainText(vehicleModel);
    await expect(createdBooking).toContainText(bookingDateLabel);
    await expect(createdBooking).toContainText('10:00 am');
    await expect(createdBooking).toContainText('12:00 pm');
    await expect(createdBooking).toContainText(`${bookingDurationHours} hour(s)`);
    await expect(createdBooking).toContainText(`₹${expectedTotal}`);
});

test('TC_036 - Verify created booking details are stored and displayed in booking history', async ({ page }) => {
    test.setTimeout(90000);

    const loginPage = new LoginPage(page);
    const parkingSlotsPage = new ParkingSlotsPage(page);
    const vehicleNumber = `MH01AB${Date.now().toString().slice(-4)}`;
    const vehicleModel = 'Playwright Test Vehicle';
    const bookingLocation = 'Hyderabad';
    const startTimeValue = '10:00';
    const endTimeValue = '12:00';
    const bookingDurationHours = 2;

    await page.goto('/');
    await page.getByRole('link', { name: 'Login', exact: true }).click();
    await loginPage.login(users.userA.email, users.userA.password);
    await expect(page).toHaveURL(/\/slots$/, { timeout: 15000 });

    await parkingSlotsPage.selectState('Telangana');
    await parkingSlotsPage.selectCity(bookingLocation);
    const availableSlot = parkingSlotsPage.slotCards.filter({
        has: page.locator('button.book-button:enabled')
    }).last();
    await expect(availableSlot).toBeVisible();

    const slotDetails = await availableSlot.innerText();
    const slotNumber = slotDetails.match(/Slot Number:\s*(\S+)/i)?.[1];
    const hourlyRate = slotDetails.match(/Price:\s*(?:₹|Rs\.?\s*|INR\s*)([\d,]+)/i)?.[1];
    expect(slotNumber, 'Selected slot should display its slot number').toBeTruthy();
    expect(hourlyRate, 'Selected slot should display its hourly price').toBeTruthy();
    expect(slotDetails).toContain(bookingLocation);
    const expectedTotal = Number(hourlyRate.replace(/,/g, '')) * bookingDurationHours;

    await availableSlot.locator('button.book-button').click();
    await page.locator('input[name="vehicleNumber"]').fill(vehicleNumber);
    await page.locator('input[name="vehicleModel"]').fill(vehicleModel);

    const startDate = page.locator('input[name="startDate"]');
    const endDate = page.locator('input[name="endDate"]');
    const startTime = page.locator('input[name="startTime"]');
    const endTime = page.locator('input[name="endTime"]');
    const continueToPayment = page.getByRole('button', { name: 'Continue to Payment' });
    const unavailableMessage = page.getByText(
        'Parking slot is not available for this time period.',
        { exact: true }
    );
    let bookingDate;
    let bookingDateValue;

    for (let daysFromToday = 7; daysFromToday <= 60; daysFromToday += 1) {
        bookingDate = new Date();
        bookingDate.setDate(bookingDate.getDate() + daysFromToday);
        bookingDateValue = [
            bookingDate.getFullYear(),
            String(bookingDate.getMonth() + 1).padStart(2, '0'),
            String(bookingDate.getDate()).padStart(2, '0')
        ].join('-');

        await startDate.fill(bookingDateValue);
        await startTime.fill(startTimeValue);
        await endDate.fill(bookingDateValue);
        await endTime.fill(endTimeValue);

        await expect(page.locator('body')).toContainText(`${bookingDurationHours} Hours`);
        await expect(page.locator('body')).toContainText(`₹${expectedTotal}`);
        await page.getByRole('button', { name: 'Confirm Booking' }).click();
        await expect(continueToPayment.or(unavailableMessage)).toBeVisible({ timeout: 10000 });

        if (await continueToPayment.isVisible()) {
            break;
        }
    }

    await expect(continueToPayment).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Confirm your booking' })).toBeVisible();

    const bookingDateLabel = `${bookingDate.getDate()} ${
        ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][
            bookingDate.getMonth()
        ]
    } ${bookingDate.getFullYear()}`;
    await continueToPayment.click();
    await page.getByRole('button', { name: 'Pay & Confirm Booking' }).click();
    await expect(
        page.getByRole('heading', { name: 'Booking Confirmed Successfully' })
    ).toBeVisible();

    await page.getByRole('link', { name: 'My Bookings', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'My Bookings' })).toBeVisible({
        timeout: 15000
    });

    const createdBooking = page.locator('.booking-card').filter({
        hasText: vehicleNumber
    });
    await expect(createdBooking).toBeVisible();
    await expect(createdBooking).toContainText(slotNumber);
    await expect(createdBooking).toContainText(vehicleNumber);
    await expect(createdBooking).toContainText(vehicleModel);
    await expect(createdBooking).toContainText(bookingLocation);
    await expect(createdBooking).toContainText(bookingDateLabel);
    await expect(createdBooking).toContainText('10:00 am');
    await expect(createdBooking).toContainText('12:00 pm');
    await expect(createdBooking).toContainText(`${bookingDurationHours} hour(s)`);
    await expect(createdBooking).toContainText(`₹${expectedTotal}`);
    await expect(createdBooking.locator('.status-badge.confirmed')).toHaveText(/confirmed/i);
});

test('TC_037 - Verify an eligible active booking can be cancelled', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const parkingSlotsPage = new ParkingSlotsPage(page);

    await page.goto('/');
    await page.getByRole('link', { name: 'Login', exact: true }).click();
    await loginPage.login(users.userA.email, users.userA.password);
    await expect(page).toHaveURL(/\/slots$/, { timeout: 15000 });

    await page.getByRole('link', { name: 'My Bookings', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'My Bookings' })).toBeVisible();

    const bookingCards = page.locator('.booking-card');
    const eligibleBookings = bookingCards.filter({
        has: page.locator('.status-badge.confirmed')
    }).filter({
        has: page.getByRole('button', { name: 'Cancel Booking' })
    });
    const bookingToCancel = eligibleBookings.first();
    await expect(bookingToCancel).toBeVisible();

    const bookingIndex = await bookingToCancel.evaluate(booking =>
        Array.from(document.querySelectorAll('.booking-card')).indexOf(booking)
    );
    const selectedBooking = bookingCards.nth(bookingIndex);
    const slotHeading = await selectedBooking.getByRole('heading', { level: 3 }).innerText();
    const slotNumber = slotHeading.match(/^Slot\s+(.+)$/i)?.[1];
    expect(slotNumber, 'Eligible booking should display its parking slot number').toBeTruthy();

    page.on('dialog', dialog => dialog.accept());
    await selectedBooking.getByRole('button', { name: 'Cancel Booking' }).click();
    await expect(selectedBooking.locator('.status-badge')).toHaveText(/cancelled|canceled/i);

    await parkingSlotsPage.open();
    await parkingSlotsPage.selectState('Telangana');
    await parkingSlotsPage.selectCity('Hyderabad');
    await parkingSlotsPage.availabilityDropdown.selectOption({
        label: 'Available Only'
    });

    const exactSlotNumber = new RegExp(
        `^Slot Number:\\s*${slotNumber.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`
    );
    const slotNumberElement = page.locator('p').filter({
        has: page.locator('span.label', { hasText: 'Slot Number:' })
    }).filter({
        hasText: exactSlotNumber
    });
    const cancelledBookingSlot = parkingSlotsPage.slotCards.filter({
        has: slotNumberElement
    });

    await expect(cancelledBookingSlot).toBeVisible();
    await expect(cancelledBookingSlot.getByText('✓ Available', { exact: true })).toBeVisible();
    await expect(cancelledBookingSlot.locator('button.book-button')).toBeEnabled();
});
 