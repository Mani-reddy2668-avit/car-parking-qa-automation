
import { test, expect } from '@playwright/test';
import RegistrationPage from '../pages/RegistrationPage.js';

// TC_010 - Successful registration with valid details
test('TC_010 - Verify successful registration with valid details', async ({ page }) => {
    const registrationPage = new RegistrationPage(page);

    await registrationPage.open();

    const email = `testuser${Date.now()}@example.com`;

    await registrationPage.fillRegistrationForm(
        'Test User',
        email,
        '9876543210',
        'TestPass123!'
    );

    const responsePromise = page.waitForResponse(
        response =>
            response.url().includes('/register') &&
            response.request().method() === 'POST'
    );

    await registrationPage.submit();

    const response = await responsePromise;

    expect(response.status()).toBe(201);

    const responseBody = await response.json();

    expect(responseBody.message).toBe('User registered successfully');
    expect(responseBody.user.name).toBe('Test User');
    expect(responseBody.user.email).toBe(email);
    expect(responseBody.user.phone).toBe('9876543210');
    expect(responseBody.user.role).toBe('user');

    await expect(page).toHaveURL(/\/slots$/);
});

// TC_011 - Registration validation when all required fields are blank
test('TC_011 - Verify registration validation when all required fields are blank', async ({ page }) => {
    const registrationPage = new RegistrationPage(page);

    await registrationPage.open();

    await registrationPage.submit();

    await expect(registrationPage.nameInput).toBeFocused();
    await expect(page).toHaveURL(/\/register$/);
});

// TC_012 - Existing email cannot be registered again

test('TC_012 - Verify that an already registered email cannot be registered again', async ({ page }) => {
    const registrationPage = new RegistrationPage(page);

    await registrationPage.open();

    const email = 'testuser@example.com';

    await registrationPage.fillRegistrationForm(
        'Test User',
        email,
        '9876543210',
        'TestPass123!'
    );

    const responsePromise = page.waitForResponse(
        response =>
            response.url().includes('/register') &&
            response.request().method() === 'POST'
    );

    await registrationPage.submit();

    const response = await responsePromise;
    const responseBody = await response.json();

    expect(response.status()).toBe(400);
    expect(responseBody.message).toBe('User already exists');
});


test('TC_013 - Verify registration validation for an incorrectly formatted email address', async ({ page }) => {
    const registrationPage = new RegistrationPage(page);

    await registrationPage.open();

    await registrationPage.fillRegistrationForm(
        'Test User',
        'invalid-email',
        '9876543210',
        'TestPass123!'
    );

    await registrationPage.submit();

    await expect(registrationPage.emailInput).toBeFocused();
    await expect(page).toHaveURL(/\/register$/);
});


test('TC_014 - Verify registration validation when the password is blank', async ({ page }) => {
    const registrationPage = new RegistrationPage(page);

    await registrationPage.open();

    await registrationPage.nameInput.fill('Test User');
    await registrationPage.emailInput.fill(`testuser${Date.now()}@example.com`);
    await registrationPage.phoneInput.fill('9876543210');

    // Leave the password field blank
    await registrationPage.submit();

    await expect(registrationPage.passwordInput).toBeFocused();
    await expect(page).toHaveURL(/\/register$/);
});


test('TC_015 - Verify registration validation when a required user-detail field is left blank', async ({ page }) => {
    const registrationPage = new RegistrationPage(page);

    await registrationPage.open();

    // Leave the Name field blank
    await registrationPage.emailInput.fill(`testuser${Date.now()}@example.com`);
    await registrationPage.phoneInput.fill('9876543210');
    await registrationPage.passwordInput.fill('TestPass123!');

    await registrationPage.submit();

    await expect(registrationPage.nameInput).toBeFocused();
    await expect(page).toHaveURL(/\/register$/);
});


test('TC_016 - Verify registration validation for an invalid phone number', async ({ page }) => {
    const registrationPage = new RegistrationPage(page);

    await registrationPage.open();

    await registrationPage.nameInput.fill('Test User');
    await registrationPage.emailInput.fill(`testuser${Date.now()}@example.com`);
    await registrationPage.phoneInput.fill('1234');
    await registrationPage.passwordInput.fill('TestPass123!');

    await registrationPage.submit();

    await expect(registrationPage.phoneInput).toHaveAttribute('aria-invalid', 'true');
    await expect(page).toHaveURL(/\/register$/);
});


test('TC_017 - Verify that the registration password can be shown and hidden using the visibility control', async ({ page }) => {
    const registrationPage = new RegistrationPage(page);

    await registrationPage.open();

    await registrationPage.passwordInput.fill('TestPass123!');

    await expect(registrationPage.passwordInput).toHaveAttribute('type', 'password');

    await page.getByRole('button', {
        name: 'Toggle password visibility'
    }).click();

    await expect(registrationPage.passwordInput).toHaveAttribute('type', 'text');

    await page.getByRole('button', {
        name: 'Toggle password visibility'
    }).click();

    await expect(registrationPage.passwordInput).toHaveAttribute('type', 'password');
});
