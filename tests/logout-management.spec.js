import { test, expect } from '@playwright/test';
import LoginPage from '../pages/LoginPage.js';
import users from '../test-data/users.js';

test('TC_053 - Logout successfully', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await page.goto('/');
    await page.getByRole('link', { name: 'Login', exact: true }).click();
    await loginPage.login(users.userA.email, users.userA.password);
    await expect(page.locator('.navbar-user')).toBeVisible({ timeout: 15000 });

    await page.getByRole('button', { name: 'Logout' }).click();

    await expect(page).toHaveURL('/');
    await expect(page.getByText('Welcome to ParkEasy')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Login', exact: true })).toBeVisible();
    await expect(page.locator('.navbar-user')).toHaveCount(0);
});

test('TC_054 - Deny access to My Bookings after logout', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await page.goto('/');
    await page.getByRole('link', { name: 'Login', exact: true }).click();
    await loginPage.login(users.userA.email, users.userA.password);
    await expect(page.locator('.navbar-user')).toBeVisible({ timeout: 15000 });

    await page.getByRole('link', { name: 'My Bookings', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'My Bookings' })).toBeVisible();
    await page.getByRole('button', { name: 'Logout' }).click();
    await expect(page.getByRole('link', { name: 'Login', exact: true })).toBeVisible();

    await page.goto('/my-bookings');

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: 'My Bookings' })).not.toBeVisible();
    await expect(page.getByRole('link', { name: 'Login', exact: true })).toBeVisible();
    await expect(page.locator('.navbar-user')).toHaveCount(0);
});

test('TC_055 - Prevent protected data access using browser Back after logout', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await page.goto('/');
    await page.getByRole('link', { name: 'Login', exact: true }).click();
    await loginPage.login(users.userA.email, users.userA.password);
    await expect(page.locator('.navbar-user')).toBeVisible({ timeout: 15000 });

    await page.getByRole('link', { name: 'My Bookings', exact: true }).click();
    await expect(page).toHaveURL(/\/my-bookings$/);
    await expect(page.getByRole('heading', { name: 'My Bookings' })).toBeVisible();
    await expect(page.locator('.booking-card').first()).toBeVisible();

    await page.getByRole('button', { name: 'Logout' }).click();
    await expect(page).toHaveURL('/');
    await expect(page.locator('.navbar-user')).toHaveCount(0);

    await page.goBack();

    await expect(page.getByRole('heading', { name: 'My Bookings' })).not.toBeVisible();
    await expect(page.getByRole('link', { name: 'Login', exact: true })).toBeVisible();
    await expect(page.locator('.navbar-user')).toHaveCount(0);

    await page.reload();
    await expect(page.getByRole('heading', { name: 'My Bookings' })).not.toBeVisible();
    await expect(page.getByRole('link', { name: 'Login', exact: true })).toBeVisible();
    await expect(page.locator('.navbar-user')).toHaveCount(0);
});

test('TC_056 - Deny direct access to protected pages when unauthenticated', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: 'Login', exact: true })).toBeVisible();
    await expect(page.locator('.navbar-user')).toHaveCount(0);

    await page.goto('/my-bookings');

    await expect(page).toHaveURL('/login');
    await expect(page.getByRole('link', { name: 'Login', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'My Bookings' })).not.toBeVisible();
    await expect(page.locator('.navbar-user')).toHaveCount(0);
});

test('TC_057 - Keep the authenticated session active during navigation', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await page.goto('/');
    await page.getByRole('link', { name: 'Login', exact: true }).click();
    await loginPage.login(users.userA.email, users.userA.password);
    await expect(page.locator('.navbar-user')).toBeVisible({ timeout: 15000 });

    await page.getByRole('link', { name: 'Find Parking', exact: true }).click();
    await expect(page).toHaveURL(/\/slots$/);
    await expect(page.locator('.navbar-user')).toBeVisible();

    await page.getByRole('link', { name: 'My Bookings', exact: true }).click();
    await expect(page).toHaveURL(/\/my-bookings$/);
    await expect(page.getByRole('heading', { name: 'My Bookings' })).toBeVisible();
    await expect(page.locator('.navbar-user')).toBeVisible();

    await page.getByRole('link', { name: 'Find Parking', exact: true }).click();
    await expect(page).toHaveURL(/\/slots$/);
    await expect(page.locator('.navbar-user')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible();
});

test('TC_058 - Isolate booking data when switching users', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await page.goto('/');
    await page.getByRole('link', { name: 'Login', exact: true }).click();
    await loginPage.login(users.userA.email, users.userA.password);
    await expect(page.locator('.navbar-user')).toBeVisible({ timeout: 15000 });
    const userAIdentity = (await page.locator('.navbar-user').innerText()).trim();
    await page.getByRole('link', { name: 'My Bookings', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'My Bookings' })).toBeVisible();

    const userABookingTexts = await page.locator('.booking-card').allInnerTexts();
    expect(userABookingTexts, 'User A should have bookings to compare').not.toHaveLength(0);
    const userABookingIdentifiers = userABookingTexts.map(bookingText => {
        const slot = bookingText.match(/Slot\s+([^\s]+)/i)?.[1];
        const vehicle = bookingText.match(/Vehicle:\s*([A-Z0-9]+)/i)?.[1];
        const startTime = bookingText.match(/Start Time:\s*(.+?)\s+End Time:/i)?.[1]
            ?.replace(/\s+/g, ' ')
            .trim();

        expect(slot, 'Each User A booking should display a slot').toBeTruthy();
        expect(vehicle, 'Each User A booking should display a vehicle number').toBeTruthy();
        expect(startTime, 'Each User A booking should display a start time').toBeTruthy();

        return `${slot}|${vehicle}|${startTime}`;
    });

    await page.getByRole('button', { name: 'Logout' }).click();
    await expect(page.getByRole('link', { name: 'Login', exact: true })).toBeVisible();
    await expect(page.locator('.navbar-user')).toHaveCount(0);

    await page.getByRole('link', { name: 'Login', exact: true }).click();
    await loginPage.login(users.userB.email, users.userB.password);
    await expect(page.locator('.navbar-user')).toBeVisible({ timeout: 15000 });
    const userBNavbar = page.locator('.navbar-user');
    const userBIdentity = (await userBNavbar.innerText()).trim();
    const userBEmailVisible = await userBNavbar.getByText(users.userB.email, { exact: true }).count();
    if (userBEmailVisible > 0) {
        await expect(userBNavbar).toContainText(users.userB.email);
    } else {
        expect(userBIdentity, 'The navbar should identify User B, not the previous session').not.toBe(userAIdentity);
    }
    await page.getByRole('link', { name: 'My Bookings', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'My Bookings' })).toBeVisible();

    const userBBookingTexts = await page.locator('.booking-card').allInnerTexts();
    const userBBookingIdentifiers = userBBookingTexts.map(bookingText => {
        const slot = bookingText.match(/Slot\s+([^\s]+)/i)?.[1];
        const vehicle = bookingText.match(/Vehicle:\s*([A-Z0-9]+)/i)?.[1];
        const startTime = bookingText.match(/Start Time:\s*(.+?)\s+End Time:/i)?.[1]
            ?.replace(/\s+/g, ' ')
            .trim();

        expect(slot, 'Each User B booking should display a slot').toBeTruthy();
        expect(vehicle, 'Each User B booking should display a vehicle number').toBeTruthy();
        expect(startTime, 'Each User B booking should display a start time').toBeTruthy();

        return `${slot}|${vehicle}|${startTime}`;
    });

    for (const identifier of userABookingIdentifiers) {
        expect(userBBookingIdentifiers).not.toContain(identifier);
    }
});