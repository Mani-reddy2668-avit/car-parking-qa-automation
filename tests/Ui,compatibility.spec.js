import { test, expect } from '@playwright/test';
import LoginPage from '../pages/LoginPage.js';
import RegistrationPage from '../pages/RegistrationPage.js';
import ParkingSlotsPage from '../pages/ParkingSlotsPage.js';
import users from '../test-data/users.js';

test('TC_068 - Verify the application UI on a desktop browser', async ({ page }) => {
    expect(users.userA.email, 'Set USER_A_EMAIL to a valid user account').toBeTruthy();
    expect(users.userA.password, 'Set USER_A_PASSWORD for the valid user account').toBeTruthy();

    const expectDesktopLayout = async () => {
        const hasHorizontalOverflow = await page.evaluate(
            () => document.documentElement.scrollWidth > document.documentElement.clientWidth
        );
        expect(hasHorizontalOverflow, `Unexpected horizontal overflow on ${page.url()}`).toBe(false);
    };

    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Welcome to ParkEasy' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Find Parking', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Login', exact: true })).toBeVisible();
    await expectDesktopLayout();

    await page.getByRole('link', { name: 'Login', exact: true }).click();
    const loginPage = new LoginPage(page);
    await expect(page.getByRole('heading', { name: 'Login to ParkEasy' })).toBeVisible();
    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.loginButton).toBeVisible();
    await expect(loginPage.loginButton).toBeEnabled();
    await expectDesktopLayout();

    await page.locator('p')
        .filter({ hasText: "Don't have an account?" })
        .getByRole('link', { name: 'Sign Up', exact: true })
        .click();
    const registrationPage = new RegistrationPage(page);
    await expect(registrationPage.nameInput).toBeVisible();
    await expect(registrationPage.emailInput).toBeVisible();
    await expect(registrationPage.phoneInput).toBeVisible();
    await expect(registrationPage.passwordInput).toBeVisible();
    await expect(registrationPage.signUpButton).toBeVisible();
    await expect(registrationPage.signUpButton).toBeEnabled();
    await expectDesktopLayout();

    await page.goto('/login');
    await loginPage.login(users.userA.email, users.userA.password);
    await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible({ timeout: 15000 });
    await expectDesktopLayout();

    const parkingSlotsPage = new ParkingSlotsPage(page);
    await parkingSlotsPage.open();
    await expect(page).toHaveURL(/\/slots$/);
    await expect(parkingSlotsPage.stateDropdown).toBeVisible();
    await expect(parkingSlotsPage.cityDropdown).toBeVisible();
    await expect(parkingSlotsPage.locationTypeDropdown).toBeVisible();
    await expect(parkingSlotsPage.vehicleTypeDropdown).toBeVisible();
    await parkingSlotsPage.selectState('Telangana');
    await parkingSlotsPage.selectCity('Hyderabad');
    await expect(parkingSlotsPage.resultCount).toBeVisible();
    await expect(parkingSlotsPage.slotCards.first()).toBeVisible();
    await expectDesktopLayout();
});

test('TC_069 - Verify the application layout on a mobile viewport', async ({ page }) => {
    expect(users.userA.email, 'Set USER_A_EMAIL to a valid user account').toBeTruthy();
    expect(users.userA.password, 'Set USER_A_PASSWORD for the valid user account').toBeTruthy();

    await page.setViewportSize({ width: 390, height: 844 });

    const expectMobileLayout = async () => {
        const hasHorizontalOverflow = await page.evaluate(
            () => document.documentElement.scrollWidth > document.documentElement.clientWidth
        );
        expect(hasHorizontalOverflow, `Unexpected horizontal overflow on ${page.url()}`).toBe(false);
    };

    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Welcome to ParkEasy' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Find Parking', exact: true })).toBeVisible();
    await expectMobileLayout();

    await page.goto('/login');
    const loginPage = new LoginPage(page);
    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.loginButton).toBeVisible();
    await expect(loginPage.loginButton).toBeEnabled();
    await expectMobileLayout();

    await page.locator('p')
        .filter({ hasText: "Don't have an account?" })
        .getByRole('link', { name: 'Sign Up', exact: true })
        .click();
    const registrationPage = new RegistrationPage(page);
    await expect(registrationPage.nameInput).toBeVisible();
    await expect(registrationPage.emailInput).toBeVisible();
    await expect(registrationPage.phoneInput).toBeVisible();
    await expect(registrationPage.passwordInput).toBeVisible();
    await expect(registrationPage.signUpButton).toBeVisible();
    await expectMobileLayout();

    await page.goto('/login');
    await loginPage.login(users.userA.email, users.userA.password);
    await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible({ timeout: 15000 });
    await expectMobileLayout();

    const parkingSlotsPage = new ParkingSlotsPage(page);
    await parkingSlotsPage.open();
    await expect(page).toHaveURL(/\/slots$/);
    await expect(parkingSlotsPage.stateDropdown).toBeVisible();
    await expect(parkingSlotsPage.cityDropdown).toBeVisible();
    await expect(parkingSlotsPage.locationTypeDropdown).toBeVisible();
    await expect(parkingSlotsPage.vehicleTypeDropdown).toBeVisible();
    await parkingSlotsPage.selectState('Telangana');
    await parkingSlotsPage.selectCity('Hyderabad');
    await expect(parkingSlotsPage.slotCards.first()).toBeVisible();
    await expectMobileLayout();

    await page.getByRole('link', { name: 'My Bookings', exact: true }).click();
    await expect(page).toHaveURL(/\/my-bookings$/);
    await expect(page.getByRole('heading', { name: 'My Bookings' })).toBeVisible();
    const bookingCards = page.locator('.booking-card');
    await expect(bookingCards.first()).toBeVisible();
    const firstBooking = bookingCards.first();
    await firstBooking.scrollIntoViewIfNeeded();
    await expect(firstBooking.getByRole('heading', { level: 3 })).toBeVisible();

    const bookingText = await firstBooking.innerText();
    expect(bookingText).toMatch(/Vehicle:\s*[A-Z0-9]+\s+\([^)]+\)/i);
    expect(bookingText).toMatch(/Location:\s*.+?\s+Address:/i);
    expect(bookingText).toMatch(/Start Time:\s*.+?\s+End Time:/i);
    expect(bookingText).toMatch(/Total Price:\s*₹[\d,]+/i);
    expect(bookingText).toMatch(/Payment Status:\s*(?:pending|completed)(?:\s*·\s*\w+)?/i);

    const bookingFitsViewport = await firstBooking.evaluate(card => {
        const { left, right } = card.getBoundingClientRect();
        return left >= 0 && right <= document.documentElement.clientWidth;
    });
    expect(bookingFitsViewport, 'The booking card should fit within the mobile viewport').toBe(true);
    await expectMobileLayout();
});

test('TC_070 - Verify main functionality across configured browsers', async ({ page }) => {
    expect(users.userA.email, 'Set USER_A_EMAIL to a valid user account').toBeTruthy();
    expect(users.userA.password, 'Set USER_A_PASSWORD for the valid user account').toBeTruthy();

    await page.goto('/login');
    const loginPage = new LoginPage(page);
    await loginPage.login(users.userA.email, users.userA.password);
    await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible({ timeout: 15000 });

    const parkingSlotsPage = new ParkingSlotsPage(page);
    await parkingSlotsPage.open();
    await expect(page).toHaveURL(/\/slots$/);
    await expect(page.getByRole('heading', { name: 'Available Parking Slots' })).toBeVisible();
    await expect(parkingSlotsPage.stateDropdown).toBeVisible();
    await expect(parkingSlotsPage.cityDropdown).toBeVisible();
    await parkingSlotsPage.selectState('Telangana');
    await parkingSlotsPage.selectCity('Hyderabad');
    await expect(parkingSlotsPage.slotCards.first()).toBeVisible();
    await expect(parkingSlotsPage.bookButtons.first()).toBeEnabled();

    await page.getByRole('link', { name: 'My Bookings', exact: true }).click();
    await expect(page).toHaveURL(/\/my-bookings$/);
    await expect(page.getByRole('heading', { name: 'My Bookings' })).toBeVisible();
    await expect(page.locator('.booking-card').first()).toBeVisible();
});

test('TC_071 - Verify important form controls are visible and usable', async ({ page }) => {
    expect(users.userA.email, 'Set USER_A_EMAIL to a valid user account').toBeTruthy();
    expect(users.userA.password, 'Set USER_A_PASSWORD for the valid user account').toBeTruthy();

    const expectControlFitsViewport = async control => {
        const fitsViewport = await control.evaluate(element => {
            const { left, right, width } = element.getBoundingClientRect();
            return width > 0 && left >= 0 && right <= document.documentElement.clientWidth;
        });
        expect(fitsViewport, 'Form control should be visible within the viewport').toBe(true);
    };

    const loginPage = new LoginPage(page);
    await page.goto('/login');
    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.loginButton).toBeVisible();
    await expect(loginPage.emailInput).toBeEnabled();
    await expect(loginPage.passwordInput).toBeEnabled();
    await expectControlFitsViewport(loginPage.emailInput);
    await expectControlFitsViewport(loginPage.passwordInput);
    await expectControlFitsViewport(loginPage.loginButton);
    await loginPage.emailInput.fill(users.userA.email);
    await loginPage.passwordInput.fill(users.userA.password);
    await expect(loginPage.emailInput).toHaveValue(users.userA.email);
    await expect(loginPage.passwordInput).toHaveValue(users.userA.password);
    await loginPage.loginButton.click();
    await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible({ timeout: 15000 });
    await page.getByRole('button', { name: 'Logout' }).click();
    await expect(page.getByRole('link', { name: 'Login', exact: true })).toBeVisible();

    const registrationPage = new RegistrationPage(page);
    await registrationPage.open();
    for (const control of [
        registrationPage.nameInput,
        registrationPage.emailInput,
        registrationPage.phoneInput,
        registrationPage.passwordInput,
        registrationPage.signUpButton,
    ]) {
        await expect(control).toBeVisible();
        await expect(control).toBeEnabled();
        await expectControlFitsViewport(control);
    }
    const registrationEmail = `control-test-${Date.now()}@example.com`;
    await registrationPage.fillRegistrationForm(
        'Control Test User',
        registrationEmail,
        '9876543210',
        'ControlTest123!'
    );
    await expect(registrationPage.nameInput).toHaveValue('Control Test User');
    await expect(registrationPage.emailInput).toHaveValue(registrationEmail);
    await expect(registrationPage.phoneInput).toHaveValue('9876543210');
    await expect(registrationPage.passwordInput).toHaveValue('ControlTest123!');

    await page.goto('/login');
    await loginPage.login(users.userA.email, users.userA.password);
    await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible({ timeout: 15000 });

    const parkingSlotsPage = new ParkingSlotsPage(page);
    await parkingSlotsPage.open();
    await parkingSlotsPage.selectState('Telangana');
    await parkingSlotsPage.selectCity('Hyderabad');
    const availableSlot = parkingSlotsPage.slotCards.filter({
        has: page.locator('button.book-button:enabled'),
    }).first();
    await expect(availableSlot).toBeVisible();
    await availableSlot.locator('button.book-button').click();

    const vehicleNumber = `MH01AB${Date.now().toString().slice(-4)}`;
    const vehicleNumberInput = page.locator('input[name="vehicleNumber"]');
    const vehicleModelInput = page.locator('input[name="vehicleModel"]');
    const startDateInput = page.locator('input[name="startDate"]');
    const endDateInput = page.locator('input[name="endDate"]');
    const startTimeInput = page.locator('input[name="startTime"]');
    const endTimeInput = page.locator('input[name="endTime"]');
    const confirmBookingButton = page.getByRole('button', { name: 'Confirm Booking' });

    for (const control of [
        vehicleNumberInput,
        vehicleModelInput,
        startDateInput,
        endDateInput,
        startTimeInput,
        endTimeInput,
    ]) {
        await expect(control).toBeVisible();
        await expect(control).toBeEnabled();
        await expectControlFitsViewport(control);
    }
    await expect(confirmBookingButton).toBeVisible();
    await expectControlFitsViewport(confirmBookingButton);

    await vehicleNumberInput.fill(vehicleNumber);
    await vehicleModelInput.fill('Control Test Vehicle');
    await startTimeInput.fill('10:00');
    await endTimeInput.fill('12:00');
    await expect(vehicleNumberInput).toHaveValue(vehicleNumber);
    await expect(vehicleModelInput).toHaveValue('Control Test Vehicle');
    await expect(startTimeInput).toHaveValue('10:00');
    await expect(endTimeInput).toHaveValue('12:00');

    const availableDate = new Date();
    availableDate.setDate(availableDate.getDate() + 14);
    const dateValue = [
        availableDate.getFullYear(),
        String(availableDate.getMonth() + 1).padStart(2, '0'),
        String(availableDate.getDate()).padStart(2, '0'),
    ].join('-');

    await startDateInput.fill(dateValue);
    await endDateInput.fill(dateValue);
    await expect(startDateInput).toHaveValue(dateValue);
    await expect(endDateInput).toHaveValue(dateValue);
    await expect(confirmBookingButton).toBeEnabled();
});

test('TC_072 - Display a clear validation message for invalid login data', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await page.goto('/login');

    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.loginButton).toBeEnabled();

    await loginPage.login('invalid-user@example.com', 'InvalidPassword123!');

    await expect(
        page.locator('form').getByText(/invalid credentials/i)
    ).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
});

test('TC_073 - Reject unauthenticated Playwright API access to protected bookings', async ({ page, request }) => {
    expect(users.userA.email, 'Set USER_A_EMAIL to a valid user account').toBeTruthy();
    expect(users.userA.password, 'Set USER_A_PASSWORD for the valid user account').toBeTruthy();

    const loginPage = new LoginPage(page);
    await page.goto('/login');
    await loginPage.login(users.userA.email, users.userA.password);
    await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible({ timeout: 15000 });

    const protectedBookingsResponsePromise = page.waitForResponse(response => {
        const url = new URL(response.url());
        return ['fetch', 'xhr'].includes(response.request().resourceType())
            && response.request().method() === 'GET'
            && /bookings/i.test(url.pathname);
    });

    await page.goto('/my-bookings');
    await expect(page.getByRole('heading', { name: 'My Bookings' })).toBeVisible();
    const authenticatedResponse = await protectedBookingsResponsePromise;
    expect(authenticatedResponse.ok(), 'The authenticated request should load booking data').toBe(true);

    const unauthenticatedResponse = await request.get(authenticatedResponse.url(), {
        headers: {
            Authorization: '',
        },
    });
    expect(
        [401, 403],
        'The bookings API should reject requests without authentication'
    ).toContain(unauthenticatedResponse.status());
});

test('TC_074 - Enforce booking ownership at the API level [Not Applicable / Not Executable]', async () => {
    test.skip(
        true,
        'Not Applicable / Not Executable: cross-user booking authorization checks are deferred until an isolated, authorized local or staging environment is configured.'
    );
});

test('TC_075 - Reject normal-user access to admin-only booking API', async ({ page }) => {
    expect(users.userA.email, 'Set USER_A_EMAIL to a valid normal-user account').toBeTruthy();
    expect(users.userA.password, 'Set USER_A_PASSWORD for the normal-user account').toBeTruthy();

    const loginPage = new LoginPage(page);
    await page.goto('/login');
    await loginPage.login(users.userA.email, users.userA.password);
    await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible({ timeout: 15000 });

    const userBookingsResponsePromise = page.waitForResponse(response => {
        const url = new URL(response.url());
        return ['fetch', 'xhr'].includes(response.request().resourceType())
            && response.request().method() === 'GET'
            && /bookings/i.test(url.pathname);
    });

    await page.goto('/my-bookings');
    await expect(page.getByRole('heading', { name: 'My Bookings' })).toBeVisible();
    const userBookingsResponse = await userBookingsResponsePromise;
    expect(userBookingsResponse.ok(), 'The normal-user session should load its own bookings').toBe(true);

    const authorization = (await userBookingsResponse.request().allHeaders()).authorization;
    expect(
        authorization,
        'The authenticated booking request should include the normal-user token'
    ).toMatch(/^Bearer\s+\S+$/i);

    const adminBookingsResponse = await page.request.get(
        new URL('/api/bookings', userBookingsResponse.url()).toString(),
        { headers: { authorization }, maxRedirects: 0 }
    );
    expect(
        adminBookingsResponse.status(),
        `A normal-user token must be denied access to the admin-only bookings endpoint (content type: ${adminBookingsResponse.headers()['content-type'] ?? 'unknown'})`
    ).toBe(403);
});