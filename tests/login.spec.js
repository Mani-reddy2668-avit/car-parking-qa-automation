
import { test, expect } from '@playwright/test';
import LoginPage from '../pages/LoginPage.js';
import users from '../test-data/users.js';

test('TC_001 - Login with valid credentials', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Login' }).click();

    const loginPage = new LoginPage(page);
    await loginPage.login(users.userA.email, users.userA.password);

    await page.waitForLoadState('networkidle');
    await expect(page.locator('.navbar-user')).toBeVisible();
});

test('TC_002 - Login with invalid email', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Login' }).click();

    const loginPage = new LoginPage(page);
    await loginPage.login('invalid-user@example.com', users.userA.password);

    await expect(page.getByText(/invalid credentials/i)).toBeVisible();
});

test('TC_003 - Valid email with incorrect password', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Login' }).click();

    const loginPage = new LoginPage(page);
    await loginPage.login(
        users.userA.email,
        'WrongPassword123!'
    );

    await expect(page.getByText(/invalid credentials/i)).toBeVisible();
});

test('TC_004 - Invalid email with valid password', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Login' }).click();

    const loginPage = new LoginPage(page);
    await loginPage.login(
        'invalid-user@example.com',
        users.userA.password
    );

    await expect(page.getByText(/invalid credentials/i)).toBeVisible();
});

test('TC_005 - Login with blank email', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Login' }).click();

    const loginPage = new LoginPage(page);
    await loginPage.passwordInput.fill(users.userA.password);
    await loginPage.loginButton.click();

    await expect(loginPage.emailInput).toBeFocused();
});

test('TC_006 - Login with blank password', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Login' }).click();

    const loginPage = new LoginPage(page);
    await loginPage.emailInput.fill(users.userA.email);
    await loginPage.loginButton.click();

    await expect(loginPage.passwordInput).toBeFocused();
});

test('TC_007 - Login with both fields blank', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Login' }).click();

    const loginPage = new LoginPage(page);
    await loginPage.loginButton.click();

    await expect(loginPage.emailInput).toBeFocused();
});

test('TC_008 - Validate incorrectly formatted email', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Login' }).click();

    const loginPage = new LoginPage(page);
    await loginPage.emailInput.fill('invalid-email');
    await loginPage.passwordInput.fill(users.userA.password);
    await loginPage.loginButton.click();

    await expect(loginPage.emailInput).toBeFocused();
});


test('TC_009 - Verify password visibility control', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Login' }).click();

    const loginPage = new LoginPage(page);

    await loginPage.passwordInput.fill(users.userA.password);

    // Verify password is masked by default
    await expect(loginPage.passwordInput).toHaveAttribute('type', 'password');

    // Show the password
    await page.getByRole('button', {
        name: 'Toggle password visibility'
    }).click();

    await expect(loginPage.passwordInput).toHaveAttribute('type', 'text');

    // Hide the password again
    await page.getByRole('button', {
        name: 'Toggle password visibility'
    }).click();

    await expect(loginPage.passwordInput).toHaveAttribute('type', 'password');
});
