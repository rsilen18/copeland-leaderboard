/**
 * auth.js — Login/logout and session management.
 * Two-step login: PIN entry, then name selection.
 */

const Auth = {
  /**
   * Initialize auth — set up event listeners and check session state.
   */
  init() {
    const loginForm = document.getElementById('login-form');
    const logoutBtn = document.getElementById('logout-btn');
    const nameSelector = document.getElementById('login-name-selector');
    const continueBtn = document.getElementById('login-continue-btn');

    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handlePinSubmit();
    });

    nameSelector.addEventListener('change', (e) => {
      continueBtn.disabled = !e.target.value;
    });

    continueBtn.addEventListener('click', () => this.handleNameSelect());

    logoutBtn.addEventListener('click', () => this.logout());

    // Check existing session
    if (this.isLoggedIn()) {
      this.updateUserDisplay();
      App.showDashboard();
    } else {
      App.showLogin();
    }
  },

  /**
   * Check if user is currently logged in (has both PIN and name).
   */
  isLoggedIn() {
    return sessionStorage.getItem('pin') !== null && localStorage.getItem('selectedUser');
  },

  /**
   * Handle PIN form submission (step 1).
   */
  async handlePinSubmit() {
    const pinInput = document.getElementById('pin-input');
    const loginBtn = document.getElementById('login-btn');
    const loginError = document.getElementById('login-error');
    const pin = pinInput.value.trim();

    if (!pin) return;

    loginBtn.disabled = true;
    loginBtn.textContent = 'Verifying...';
    loginError.classList.add('hidden');

    const valid = await Api.validatePin(pin);

    if (valid) {
      sessionStorage.setItem('pin', pin);
      pinInput.value = '';

      // Load members for name selection
      const result = await Api.get('getMembers');
      if (result.success && result.data.length > 0) {
        this.showNameStep(result.data);
      } else {
        loginError.textContent = 'Could not load members.';
        loginError.classList.remove('hidden');
      }
    } else {
      loginError.textContent = 'Invalid PIN. Please try again.';
      loginError.classList.remove('hidden');
      pinInput.value = '';
      pinInput.focus();
    }

    loginBtn.disabled = false;
    loginBtn.textContent = 'Next';
  },

  /**
   * Show the name selection step (step 2).
   */
  showNameStep(members) {
    document.getElementById('login-step-pin').classList.add('hidden');
    document.getElementById('login-step-name').classList.remove('hidden');

    const selector = document.getElementById('login-name-selector');
    selector.innerHTML = '<option value="">Select your name</option>';
    for (const m of members) {
      selector.innerHTML += `<option value="${m.name}">${m.name}</option>`;
    }

    // Pre-select if previously saved
    const saved = localStorage.getItem('selectedUser');
    if (saved) {
      selector.value = saved;
      document.getElementById('login-continue-btn').disabled = !saved;
    }
  },

  /**
   * Handle name selection (step 2) — proceed to dashboard.
   */
  handleNameSelect() {
    const name = document.getElementById('login-name-selector').value;
    if (!name) return;

    localStorage.setItem('selectedUser', name);
    this.updateUserDisplay();

    // Reset login view for next time
    document.getElementById('login-step-pin').classList.remove('hidden');
    document.getElementById('login-step-name').classList.add('hidden');

    App.showDashboard();
  },

  /**
   * Update the user display in the header.
   */
  updateUserDisplay() {
    const name = localStorage.getItem('selectedUser') || '';
    document.getElementById('user-display').textContent = name;
  },

  /**
   * Log out — clear session and show login.
   */
  logout() {
    sessionStorage.removeItem('pin');
    localStorage.removeItem('selectedUser');

    // Reset login steps
    document.getElementById('login-step-pin').classList.remove('hidden');
    document.getElementById('login-step-name').classList.add('hidden');

    App.showLogin();
  }
};
