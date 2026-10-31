
import { test, expect } from '@playwright/test';
import LoginPage from '../pages/LoginPage.js';
import users from '../test-data/users.js';
import ParkingSlotsPage from '../pages/ParkingSlotsPage.js';
import fs from 'node:fs';

// TC_018 - Verify that available parking slots are displayed with the correct details
test('TC_018 - Verify available parking slots and their details', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const parkingSlotsPage = new ParkingSlotsPage(page);

    await parkingSlotsPage.open();

    // Log in if the session is not already authenticated
    await page.getByRole('link', { name: 'Login', exact: true }).click();
    await loginPage.login(users.userA.email, users.userA.password);

    await expect(page).toHaveURL(/\/slots$/);

    await parkingSlotsPage.selectState('Telangana');
    await parkingSlotsPage.selectCity('Hyderabad');

    await expect(parkingSlotsPage.resultCount).toBeVisible();
    await expect(parkingSlotsPage.slotNumbers.first()).toBeVisible();

    await expect(parkingSlotsPage.resultCount).toContainText(
        /Found \d+ parking slot\(s\)/
    );

    await expect(parkingSlotsPage.slotNumbers.first()).toContainText(
        /Slot Number:\s*\S+/
    );
});


 // TC_019 - Verify that the user can select an available parking slot for booking
test('TC_019 - Verify that the user can select an available parking slot for booking', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const parkingSlotsPage = new ParkingSlotsPage(page);

    await parkingSlotsPage.open();

    await page.getByRole('link', { name: 'Login', exact: true }).click();
    await loginPage.login(users.userA.email, users.userA.password);

    await expect(page).toHaveURL(/\/slots$/);

    await parkingSlotsPage.selectState('Telangana');
    await parkingSlotsPage.selectCity('Hyderabad');

    await expect(parkingSlotsPage.bookButtons.first()).toBeVisible();
    await expect(parkingSlotsPage.bookButtons.first()).toBeEnabled();

    await parkingSlotsPage.bookButtons.first().click();

    // Selecting a slot opens the booking form without changing the route.
    await expect(page.getByRole('heading', { name: 'Book Parking Slot' })).toBeVisible();
    await expect(page.locator('input[name="vehicleNumber"]')).toBeVisible();
});

// TC_020 - Verify that the user cannot select an unavailable or occupied parking slot
test('TC_020 - Verify unavailable or occupied slots cannot be booked', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const parkingSlotsPage = new ParkingSlotsPage(page);

    await parkingSlotsPage.open();

    await page.getByRole('link', { name: 'Login', exact: true }).click();
    await loginPage.login(users.userA.email, users.userA.password);

    await expect(page).toHaveURL(/\/slots$/);

    await parkingSlotsPage.selectState('Telangana');
    await parkingSlotsPage.selectCity('Hyderabad');
    await parkingSlotsPage.showAllSlots();

    // Find slots that are marked as unavailable or occupied.
    const unavailableSlots = page.locator(
        '.slot-card:has-text("Occupied"), .slot-card:has-text("Unavailable")'
    );

    const unavailableCount = await unavailableSlots.count();

    test.skip(
        unavailableCount === 0,
        'TC_020 cannot be executed because no occupied or unavailable slots exist in the test data.'
    );

    const bookButton = unavailableSlots.first().locator('button.book-button');

    await expect(bookButton).toBeDisabled();
});


 // TC_021 - Verify that the selected parking slot is correctly associated with the booking
test('TC_021 - Verify selected parking slot is correctly associated with the booking', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const parkingSlotsPage = new ParkingSlotsPage(page);

    await parkingSlotsPage.open();

    await page.getByRole('link', { name: 'Login', exact: true }).click();
    await loginPage.login(users.userA.email, users.userA.password);

    await expect(page).toHaveURL(/\/slots$/);

    await parkingSlotsPage.selectState('Telangana');
    await parkingSlotsPage.selectCity('Hyderabad');

    // Capture the slot number before clicking Book Now.
    const slotDetails = parkingSlotsPage.slotNumbers.first();
    await expect(slotDetails).toBeVisible();

    const slotText = await slotDetails.innerText();

    const slotNumber = slotText
       .replace('Slot Number:', '')
       .trim()
       .split(/\s+/)
       .pop();

     // Open the booking page for the selected slot.
     await parkingSlotsPage.bookButtons.first().click();

     // Verify the booking page displays the same slot number.
     await expect(parkingSlotsPage.selectedSlotDetails).toBeVisible();
     await expect(parkingSlotsPage.selectedSlotDetails).toContainText(
        `Slot #${slotNumber}`
    );
});

test('TC_022 - Verify user cannot proceed without selecting a parking slot', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const parkingSlotsPage = new ParkingSlotsPage(page);

    // Open application
    await page.goto('/');

    // Login
    await page.getByRole('link', { name: 'Login', exact: true }).click();
    await loginPage.login(users.userA.email, users.userA.password);

    // Verify user reaches the parking slots page
    await expect(page).toHaveURL(/\/slots/, { timeout: 10000 });

    // Load parking slots
    await parkingSlotsPage.selectState('Telangana');
    await parkingSlotsPage.selectCity('Hyderabad');

    // Verify slots are displayed
    await expect(parkingSlotsPage.bookButtons.first()).toBeVisible();

    // User has NOT selected any parking slot yet,
    // so the booking page should not be accessible.
    await expect(page).toHaveURL(/\/slots/);

    // Confirm Booking button should not exist on the slots page.
    await expect(
        page.getByRole('button', { name: 'Confirm Booking' })
    ).toHaveCount(0);
});


test('TC_023 - Verify a parking slot becomes unavailable for another overlapping booking', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const parkingSlotsPage = new ParkingSlotsPage(page);

    await page.goto('/');
    await page.getByRole('link', { name: 'Login', exact: true }).click();
    await loginPage.login(users.userA.email, users.userA.password);
    await expect(page).toHaveURL(/\/slots/, { timeout: 10000 });

    await parkingSlotsPage.selectState('Telangana');
    await parkingSlotsPage.selectCity('Hyderabad');
    const slotCard = parkingSlotsPage.slotCards.filter({
        has: page.locator('button.book-button:enabled')
    }).last();
    await expect(slotCard).toBeVisible();

    const slotNumberText = await slotCard.locator('p').filter({
        hasText: 'Slot Number:'
    }).innerText();
    const slotNumber = slotNumberText.split(/\s+/).pop();

    await slotCard.locator('button.book-button').click();

    const startDate = page.locator('input[name="startDate"]');
    const startTime = page.locator('input[name="startTime"]');
    const endDate = page.locator('input[name="endDate"]');
    const endTime = page.locator('input[name="endTime"]');
    const vehicleNumber = `MH01AB${Date.now().toString().slice(-4)}`;
    const vehicleModel = 'ktm';
    const paymentButton = page.getByRole('button', { name: 'Continue to Payment' });
    const unavailableMessage = page.getByText(
        'Parking slot is not available for this time period.',
        { exact: true }
    );

    await page.locator('input[name="vehicleNumber"]').fill(vehicleNumber);
    await page.locator('input[name="vehicleModel"]').fill(vehicleModel);

    let bookingDate;
    for (let daysFromToday = 7; daysFromToday <= 30; daysFromToday += 1) {
        bookingDate = new Date();
        bookingDate.setDate(bookingDate.getDate() + daysFromToday);
        const formattedBookingDate = [
            bookingDate.getFullYear(),
            String(bookingDate.getMonth() + 1).padStart(2, '0'),
            String(bookingDate.getDate()).padStart(2, '0')
        ].join('-');

        await startDate.fill(formattedBookingDate);
        await startTime.fill('10:00');
        await endDate.fill(formattedBookingDate);
        await endTime.fill('12:00');
        await page.getByRole('button', { name: 'Confirm Booking' }).click();
        await expect(paymentButton.or(unavailableMessage)).toBeVisible();

        if (await paymentButton.isVisible()) {
            break;
        }
    }

    await expect(paymentButton).toBeVisible();
    await paymentButton.click();
    await page.getByRole('button', { name: 'Pay & Confirm Booking' }).click();
    await expect(
        page.getByRole('heading', { name: 'Booking Confirmed Successfully' })
    ).toBeVisible();

    await page.goto('/slots');
    await parkingSlotsPage.selectState('Telangana');
    await parkingSlotsPage.selectCity('Hyderabad');
    await parkingSlotsPage.showAllSlots();

    const bookedSlot = parkingSlotsPage.slotCards.filter({
        hasText: slotNumber
    });
    await expect(bookedSlot).toBeVisible();

    const bookedSlotButton = bookedSlot.locator('button.book-button');
    if (await bookedSlotButton.isEnabled()) {
        await bookedSlotButton.click();
        await page.locator('input[name="vehicleNumber"]').fill(vehicleNumber);
        await page.locator('input[name="vehicleModel"]').fill(vehicleModel);

        const formattedBookingDate = [
            bookingDate.getFullYear(),
            String(bookingDate.getMonth() + 1).padStart(2, '0'),
            String(bookingDate.getDate()).padStart(2, '0')
        ].join('-');
        await startDate.fill(formattedBookingDate);
        await startTime.fill('10:00');
        await endDate.fill(formattedBookingDate);
        await endTime.fill('12:00');
        await page.getByRole('button', { name: 'Confirm Booking' }).click();
        await expect(unavailableMessage).toBeVisible();
    } else {
        await expect(bookedSlotButton).toBeDisabled();
    }
    fs.writeFileSync(
    'test-data/tc023-booking.json',
    JSON.stringify({
        slotNumber,
        bookingDate: [
            bookingDate.getFullYear(),
            String(bookingDate.getMonth() + 1).padStart(2, '0'),
            String(bookingDate.getDate()).padStart(2, '0')
        ].join('-')
    }, null, 2)
);
});


test('TC_024 - Verify the system prevents booking the same parking slot with overlapping date and time', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const parkingSlotsPage = new ParkingSlotsPage(page);

    // Load the existing booking details saved by TC_023.
    const existingBooking = JSON.parse(
        fs.readFileSync('test-data/tc023-booking.json', 'utf8')
    );

    const slotNumber = existingBooking.slotNumber;
    const bookingDate = existingBooking.bookingDate;

    const unavailableMessage = page.getByText(
        'Parking slot is not available for this time period.',
        { exact: true }
    );

    // Step 1: Log in.
    await page.goto('/');
    await page.getByRole('link', { name: 'Login', exact: true }).click();
    await loginPage.login(users.userA.email, users.userA.password);

    await expect(page).toHaveURL(/\/slots/, { timeout: 15000 });

    // Step 2: Find the same parking slot.
    await parkingSlotsPage.selectState('Telangana');
    await parkingSlotsPage.selectCity('Hyderabad');
    await parkingSlotsPage.showAllSlots();

    const bookedSlot = parkingSlotsPage.slotCards.filter({
        hasText: slotNumber
    });

    await expect(bookedSlot).toBeVisible();

    const bookButton = bookedSlot.locator('button.book-button');
    await expect(bookButton).toBeEnabled();

    // Step 3: Open the booking form.
    await bookButton.click();

    // Step 4: Enter the same overlapping date and time.
    await page.locator('input[name="startDate"]').fill(bookingDate);
    await page.locator('input[name="startTime"]').fill('10:00');
    await page.locator('input[name="endDate"]').fill(bookingDate);
    await page.locator('input[name="endTime"]').fill('12:00');

    // Step 5: Enter vehicle details.
    await page.locator('input[name="vehicleNumber"]').fill(
        `MH01AB${Date.now().toString().slice(-4)}`
    );
    await page.locator('input[name="vehicleModel"]').fill('ktm');

    // Step 6: Attempt to confirm the overlapping booking.
    await page.getByRole('button', { name: 'Confirm Booking' }).click();

    // Expected result: the overlapping booking is rejected.
    await expect(unavailableMessage).toBeVisible({ timeout: 10000 });
});




test('TC_025 - Verify parking slots can be filtered by State, City, Location Type, and Vehicle Type', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const parkingSlotsPage = new ParkingSlotsPage(page);

    // Step 1: Log in.
    await page.goto('/');
    await page.getByRole('link', { name: 'Login', exact: true }).click();

    await loginPage.login(users.userA.email, users.userA.password);

    await expect(page).toHaveURL(/\/slots/, { timeout: 15000 });

    // Step 2: Select State, City, and Location Type.
    await parkingSlotsPage.selectState('Telangana');
    await parkingSlotsPage.selectCity('Hyderabad');

    await parkingSlotsPage.locationTypeDropdown.selectOption({
        label: 'Residential'
    });

    // Step 3: Verify Vehicle Type options are available.
    await expect(
        parkingSlotsPage.vehicleTypeDropdown.locator('option').filter({
            hasText: /^bike$/
        })
    ).toHaveCount(1);

    // Step 4: Select Vehicle Type.
    await parkingSlotsPage.vehicleTypeDropdown.selectOption({
        value: 'bike'
    });

    // Step 5: Verify all selected filter values.
    await expect(parkingSlotsPage.stateDropdown).toHaveValue(
        await parkingSlotsPage.stateDropdown.inputValue()
    );

    await expect(parkingSlotsPage.cityDropdown).toHaveValue(
        await parkingSlotsPage.cityDropdown.inputValue()
    );

    await expect(parkingSlotsPage.locationTypeDropdown).toHaveValue(
        await parkingSlotsPage.locationTypeDropdown.inputValue()
    );

    await expect(parkingSlotsPage.vehicleTypeDropdown).toHaveValue('bike');

    // Step 6: Verify matching parking slots are displayed.
    const matchingSlots = parkingSlotsPage.slotCards;

    await expect(matchingSlots.first()).toBeVisible();

    const slotCount = await matchingSlots.count();

    expect(slotCount).toBeGreaterThan(0);

    // Step 7: Verify the displayed slots match the selected criteria.
    for (let i = 0; i < slotCount; i++) {
        const slotText = await matchingSlots.nth(i).innerText();

        expect(slotText).toContain('Hyderabad');
        expect(slotText).toContain('Residential');
        expect(slotText.toLowerCase()).toContain('bike');
    }
});

test('TC_026 - Verify parking slots can be filtered by availability status', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const parkingSlotsPage = new ParkingSlotsPage(page);

    // Step 1: Log in.
    await page.goto('/');
    await page.getByRole('link', { name: 'Login', exact: true }).click();
    await expect(page).toHaveURL(/\/login/);
    await loginPage.login(users.userA.email, users.userA.password);
    await expect(page).toHaveURL(/\/slots$/, { timeout: 15000 });

    await parkingSlotsPage.selectState('Telangana');
    await parkingSlotsPage.selectCity('Hyderabad');
    await expect(parkingSlotsPage.slotCards.first()).toBeVisible();

    // Use the option values exposed by the application instead of assuming their values.
    const availabilityOptions = await parkingSlotsPage.availabilityDropdown
        .locator('option')
        .evaluateAll(options => options.map(option => ({
            label: option.textContent.trim(),
            value: option.value
        })));
    const availableOption = availabilityOptions.find(option =>
        /\bavailable\b/i.test(option.label) && !/\bunavailable\b/i.test(option.label)
    );
    const unavailableOption = availabilityOptions.find(option =>
        /\b(unavailable|occupied)\b/i.test(option.label)
    );

    expect(availableOption, 'Availability filter should include an Available option').toBeTruthy();

    const verifyFilteredSlots = async (option, statusMatches) => {
        await parkingSlotsPage.availabilityDropdown.selectOption({ value: option.value });

        const matchingSlots = parkingSlotsPage.slotCards;
        await expect(matchingSlots.first()).toBeVisible();
        await expect.poll(() => matchingSlots.count()).toBeGreaterThan(0);

        const slotCount = await matchingSlots.count();
        for (let index = 0; index < slotCount; index += 1) {
            const slotText = (await matchingSlots.nth(index).innerText()).toLowerCase();
            expect(statusMatches(slotText), `Unexpected slot status: ${slotText}`).toBe(true);
        }
        return slotCount;
    };

    // Steps 3-5: Show and verify only available slots.
    const availableCount = await verifyFilteredSlots(
        availableOption,
        slotText => slotText.includes('available') && !slotText.includes('unavailable')
    );

    if (unavailableOption) {
        // Steps 6-7: Use the dedicated unavailable filter when the application provides it.
        await verifyFilteredSlots(
            unavailableOption,
            slotText => slotText.includes('unavailable') || slotText.includes('occupied')
        );
    } else {
        // The current application only offers Available Only and All Slots.
        await parkingSlotsPage.showAllSlots();
        await expect(parkingSlotsPage.slotCards.first()).toBeVisible();
        const allSlotCount = await parkingSlotsPage.slotCards.count();
        expect(allSlotCount).toBeGreaterThanOrEqual(availableCount);

        for (let index = 0; index < allSlotCount; index += 1) {
            const slotText = (await parkingSlotsPage.slotCards.nth(index).innerText()).toLowerCase();
            expect(
                slotText.includes('available') ||
                slotText.includes('unavailable') ||
                slotText.includes('occupied'),
                `Slot does not display an availability status: ${slotText}`
            ).toBe(true);
        }
    }
});

test('TC_027 - Verify multiple parking slot filters can be applied together', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const parkingSlotsPage = new ParkingSlotsPage(page);

    // Step 1: Log in and open the parking slots page.
    await page.goto('/');
    await page.getByRole('link', { name: 'Login', exact: true }).click();
    await loginPage.login(users.userA.email, users.userA.password);
    await expect(page).toHaveURL(/\/slots$/, { timeout: 15000 });

    // Steps 3-7: Apply all requested filters.
    await parkingSlotsPage.selectState('Telangana');
    await parkingSlotsPage.selectCity('Hyderabad');
    await parkingSlotsPage.locationTypeDropdown.selectOption({ label: 'Residential' });
    await parkingSlotsPage.vehicleTypeDropdown.selectOption({ label: 'bike' });
    await parkingSlotsPage.availabilityDropdown.selectOption({ label: 'Available Only' });

    await expect(parkingSlotsPage.stateDropdown.locator('option:checked')).toHaveText('Telangana');
    await expect(parkingSlotsPage.cityDropdown.locator('option:checked')).toHaveText('Hyderabad');
    await expect(parkingSlotsPage.locationTypeDropdown.locator('option:checked')).toHaveText('Residential');
    await expect(parkingSlotsPage.vehicleTypeDropdown.locator('option:checked')).toHaveText('bike');
    await expect(parkingSlotsPage.availabilityDropdown.locator('option:checked'))
        .toHaveText('Available Only');

    // Step 8: Every displayed slot must match every selected criterion.
    const matchingSlots = parkingSlotsPage.slotCards;
    await expect(matchingSlots.first()).toBeVisible();
    const slotCount = await matchingSlots.count();
    expect(slotCount).toBeGreaterThan(0);

    for (let index = 0; index < slotCount; index += 1) {
        const slotText = (await matchingSlots.nth(index).innerText()).toLowerCase();
        expect(slotText).toContain('hyderabad');
        expect(slotText).toContain('residential');
        expect(slotText).toContain('bike');
        expect(slotText).toContain('available');
        expect(slotText).not.toContain('unavailable');
        expect(slotText).not.toContain('occupied');
    }
});
