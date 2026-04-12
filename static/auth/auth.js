const auth = {
  loginForm: document.getElementById("login-form"),
  regForm: document.getElementById("register-form"),
  authCard: document.getElementById("auth-card"),
  successScreen: document.getElementById("success-screen"),
  subtitle: document.getElementById("form-subtitle"),
  toggleArea: document.getElementById("toggle-area"),

  init() {
    this.checkSession();
    if (this.loginForm) this.loginForm.onsubmit = (e) => this.handleLogin(e);
    if (this.regForm) this.regForm.onsubmit = (e) => this.handleRegister(e);
  },

  checkSession() {
    if (localStorage.getItem("isLoggedIn") === "true") {
      this.redirect();
    }
  },

  toggle() {
    const isLogin = !this.loginForm.classList.contains("hidden");
    if (isLogin) {
      this.loginForm.classList.add("hidden");
      this.regForm.classList.remove("hidden");
      this.subtitle.innerText = "Join Mediora to get started";
      this.toggleArea.innerHTML = `Already have an account? <span class="toggle-link" onclick="auth.toggle()">Sign In</span>`;
    } else {
      this.regForm.classList.add("hidden");
      this.loginForm.classList.remove("hidden");
      this.subtitle.innerText = "Sign in to start your consultation";
      this.toggleArea.innerHTML = `Don't have an account? <span class="toggle-link" onclick="auth.toggle()">Register</span>`;
    }
  },

  handleRegister(e) {
    e.preventDefault();

    const user = document.getElementById("reg-user").value.trim();
    const email = document.getElementById("reg-email").value.trim();
    const pass = document.getElementById("reg-pass").value;
    const confirm = document.getElementById("reg-confirm").value;
    const msg = document.getElementById("reg-msg");

    // reset message
    msg.innerText = "";
    msg.style.color = "var(--danger)";

    // basic validation
    if (!user || !email || !pass || !confirm) {
      msg.innerText = "All fields are required";
      return;
    }

    // email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      msg.innerText = "Enter a valid email address";
      return;
    }

    // password strength validation
    const strongPass = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/;
    if (!strongPass.test(pass)) {
      msg.innerText = "Password must be 6+ chars with letters and numbers";
      return;
    }

    // confirm password match
    if (pass !== confirm) {
      msg.innerText = "Passwords do not match";
      return;
    }

    // get users
    const users = JSON.parse(localStorage.getItem("all_med_users")) || [];

    // check duplicate email
    if (users.find((u) => u.email === email)) {
      msg.innerText = "Email already registered";
      return;
    }

    // store user
    users.push({ user, email, pass });
    localStorage.setItem("all_med_users", JSON.stringify(users));

    // success
    msg.style.color = "#4ade80";
    msg.innerText = "Account ready. Redirecting...";
    setTimeout(() => this.toggle(), 1200);
  },

  handleLogin(e) {
    e.preventDefault();
    const id = document.getElementById("login-id").value.trim();
    const pass = document.getElementById("login-pass").value;
    const msg = document.getElementById("msg");

    const users = JSON.parse(localStorage.getItem("all_med_users")) || [];
    const userMatch = users.find(
      (u) => (u.email === id || u.user === id) && u.pass === pass,
    );

    if (userMatch) {
      localStorage.setItem("isLoggedIn", "true");
      localStorage.setItem("user_creds", JSON.stringify(userMatch));
      this.redirect();
    } else {
      msg.innerText = "Invalid username or password";
    }
  },

  redirect() {
    if (this.authCard) this.authCard.style.display = "none";
    if (this.successScreen) this.successScreen.style.display = "block";
    setTimeout(() => {
      window.location.href = "/";
    }, 1500);
  },
};

auth.init();
