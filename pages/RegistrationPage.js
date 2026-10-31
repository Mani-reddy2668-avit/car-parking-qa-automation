
class RegistrationPage {
    constructor(page) {
        this.page = page;

        this.nameInput = page.getByPlaceholder('Enter your name');
        this.emailInput = page.getByPlaceholder('Enter your email');
        this.phoneInput = page.getByPlaceholder('10-digit mobile number');
        this.passwordInput = page.getByPlaceholder('Create a password');

        this.signUpLink = page.getByRole('link', {
            name: 'Sign Up',
            exact: true
        });

        this.signUpButton = page.getByRole('button', {
            name: /Sign Up/
        });
    }

    async open() {
        await this.page.goto('/');
        await this.signUpLink.click();
    }

    async fillRegistrationForm(name, email, phone, password) {
        await this.nameInput.fill(name);
        await this.emailInput.fill(email);
        await this.phoneInput.fill(phone);
        await this.passwordInput.fill(password);
    }

    async submit() {
        await this.signUpButton.click();
    }
}

export default RegistrationPage;
