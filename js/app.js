/**
 * app.js — Main application logic, view switching, initialization.
 */

const App = {
  currentMonth: null,
  members: [],
  schemes: [],

  /**
   * Initialize the application.
   */
  init() {
    // Set current month to today
    const now = new Date();
    this.currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Initialize modules
    Balance.init();
    Expenses.init();
    Auth.init();

    // Month navigation
    document.getElementById('prev-month').addEventListener('click', () => this.changeMonth(-1));
    document.getElementById('next-month').addEventListener('click', () => this.changeMonth(1));
  },

  /**
   * Show the login view.
   */
  showLogin() {
    document.getElementById('view-login').classList.remove('hidden');
    document.getElementById('view-dashboard').classList.add('hidden');
  },

  /**
   * Show the dashboard view and load data.
   */
  async showDashboard() {
    document.getElementById('view-login').classList.add('hidden');
    document.getElementById('view-dashboard').classList.remove('hidden');

    this.updateMonthLabel();
    await this.loadAppData();
  },

  /**
   * Load members, schemes, and current month data.
   */
  async loadAppData() {
    showLoading();

    // Load members and schemes (cacheable)
    const [membersResult, schemesResult] = await Promise.all([
      Api.get('getMembers'),
      Api.get('getSchemes')
    ]);

    if (membersResult.success) {
      this.members = membersResult.data;
      Expenses.populateMembers(this.members);
    }

    if (schemesResult.success) {
      this.schemes = schemesResult.data;
      Expenses.populateSchemes(this.schemes);
    }

    // Load month-specific data
    await this.loadMonthData();

    hideLoading();
  },

  /**
   * Load expenses and balances for the current month.
   */
  async loadMonthData() {
    await Promise.all([
      Expenses.load(this.currentMonth),
      Balance.load(this.currentMonth)
    ]);
  },

  /**
   * Change the current month by offset (-1 or +1).
   */
  async changeMonth(offset) {
    const [year, month] = this.currentMonth.split('-').map(Number);
    const date = new Date(year, month - 1 + offset, 1);
    this.currentMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    this.updateMonthLabel();
    showLoading();
    await this.loadMonthData();
    hideLoading();
  },

  /**
   * Update the month label display.
   */
  updateMonthLabel() {
    const [year, month] = this.currentMonth.split('-').map(Number);
    const date = new Date(year, month - 1, 1);
    const label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    document.getElementById('current-month-label').textContent = label;
  }
};

// Boot the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => App.init());
