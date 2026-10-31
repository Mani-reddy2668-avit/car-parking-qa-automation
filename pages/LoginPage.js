class LoginPage {


    constructor(page) {

    this.page = page;

    this.emailInput = page.getByPlaceholder('Enter your email');
    this.passwordInput = page.getByPlaceholder('Enter your password');
    this.loginButton = page.getByRole('button', { name: 'Login' });
  }

    async login(email, password) 
    {

     await this.emailInput.fill(email);
     await this.passwordInput.fill(password);
     await this.loginButton.click();
   }

}
export default LoginPage;