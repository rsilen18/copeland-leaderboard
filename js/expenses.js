/**
 * expenses.js — Expense list rendering, add/edit/delete UI, and split preview.
 */

const Expenses = {
  expenses: [],
  editingId: null,

  /**
   * Load and display expenses for the current month.
   */
  async load(month) {
    const list = document.getElementById('expenses-list');
    list.innerHTML = '<p class="placeholder">Loading expenses...</p>';

    const result = await Api.get('getExpenses', { month });
    console.log('getExpenses result:', result);

    if (!result.success) {
      list.innerHTML = `<p class="placeholder">Could not load expenses. ${result.error || ''}</p>`;
      return;
    }

    this.expenses = result.data;
    this.render();
  },

  /**
   * Render the expense table.
   */
  render() {
    const list = document.getElementById('expenses-list');

    if (this.expenses.length === 0) {
      list.innerHTML = '<p class="placeholder">No expenses this month. Click "+ Add Expense" to get started.</p>';
      return;
    }

    // Sort by date descending
    const sorted = [...this.expenses].sort((a, b) => b.date.localeCompare(a.date));

    let html = `<table class="expense-table">
      <thead>
        <tr>
          <th>Date</th>
          <th>Description</th>
          <th>Amount</th>
          <th>Paid By</th>
          <th>Split</th>
          <th></th>
        </tr>
      </thead>
      <tbody>`;

    for (const exp of sorted) {
      const date = new Date(exp.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const location = exp.location ? ` <span class="expense-location">(${this.escapeHtml(exp.location)})</span>` : '';
      html += `<tr>
        <td>${date}</td>
        <td>${this.escapeHtml(exp.description)}${location}</td>
        <td>$${parseFloat(exp.amount).toFixed(2)}</td>
        <td>${exp.paidBy}</td>
        <td>${exp.splitScheme}</td>
        <td class="expense-actions">
          <button class="btn-icon" onclick="Expenses.edit('${exp.id}')" title="Edit">&#9998;</button>
          <button class="btn-icon" onclick="Expenses.confirmDelete('${exp.id}')" title="Delete" style="color: var(--danger);">&times;</button>
        </td>
      </tr>`;
    }

    html += '</tbody></table>';
    list.innerHTML = html;
  },

  /**
   * Open the add expense modal.
   */
  openModal(expense = null) {
    const modal = document.getElementById('expense-modal');
    const title = document.getElementById('modal-title');

    this.editingId = expense ? expense.id : null;
    title.textContent = expense ? 'Edit Expense' : 'Add Expense';

    // Set defaults
    document.getElementById('expense-date').value = expense ? expense.date : new Date().toISOString().split('T')[0];
    document.getElementById('expense-description').value = expense ? expense.description : '';
    document.getElementById('expense-amount').value = expense ? expense.amount : '';
    document.getElementById('expense-location').value = expense ? (expense.location || '') : '';
    document.getElementById('expense-paidby').value = expense ? expense.paidBy : (localStorage.getItem('selectedUser') || '');
    document.getElementById('expense-scheme').value = expense ? expense.splitScheme : '';

    // Set member checkboxes
    if (expense && expense.splitMembers) {
      const checkboxes = document.querySelectorAll('#expense-members input[type="checkbox"]');
      checkboxes.forEach(cb => {
        cb.checked = expense.splitMembers.includes(cb.value);
      });
    } else {
      // Default: check all members
      const checkboxes = document.querySelectorAll('#expense-members input[type="checkbox"]');
      checkboxes.forEach(cb => { cb.checked = true; });
    }

    // Handle custom weights if editing a custom expense
    this.onSchemeChange();
    this.updateSplitPreview();
    modal.classList.remove('hidden');
  },

  /**
   * Close the expense modal.
   */
  closeModal() {
    document.getElementById('expense-modal').classList.add('hidden');
    this.editingId = null;
  },

  /**
   * Handle expense form submission (add or edit).
   */
  async handleSubmit(e) {
    e.preventDefault();
    const submitBtn = document.getElementById('expense-submit');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';

    const schemeName = document.getElementById('expense-scheme').value;

    const data = {
      date: document.getElementById('expense-date').value,
      description: document.getElementById('expense-description').value.trim(),
      amount: parseFloat(document.getElementById('expense-amount').value),
      location: document.getElementById('expense-location').value.trim(),
      paidBy: document.getElementById('expense-paidby').value,
      splitScheme: schemeName,
      splitMembers: this.getSelectedMembers(),
      createdBy: localStorage.getItem('selectedUser') || ''
    };

    // If custom scheme, include the custom weights
    if (schemeName === 'Custom') {
      data.customWeights = this.getCustomWeights();
    }

    let result;
    if (this.editingId) {
      result = await Api.post('editExpense', { id: this.editingId, ...data });
    } else {
      result = await Api.post('addExpense', data);
    }

    if (result.success) {
      this.closeModal();
      // Reload expenses and balances
      await Promise.all([
        this.load(App.currentMonth),
        Balance.load(App.currentMonth)
      ]);
    } else {
      alert('Error: ' + (result.error || 'Could not save expense.'));
    }

    submitBtn.disabled = false;
    submitBtn.textContent = 'Save Expense';
  },

  /**
   * Edit an existing expense.
   */
  edit(id) {
    const expense = this.expenses.find(e => e.id === id);
    if (expense) this.openModal(expense);
  },

  /**
   * Confirm and delete an expense.
   */
  async confirmDelete(id) {
    const expense = this.expenses.find(e => e.id === id);
    if (!expense) return;

    if (!confirm(`Delete "${expense.description}" ($${parseFloat(expense.amount).toFixed(2)})?`)) return;

    showLoading();
    const result = await Api.post('deleteExpense', { id });
    hideLoading();

    if (result.success) {
      await Promise.all([
        this.load(App.currentMonth),
        Balance.load(App.currentMonth)
      ]);
    } else {
      alert('Error: ' + (result.error || 'Could not delete expense.'));
    }
  },

  /**
   * Get currently selected members from the checkbox group.
   */
  getSelectedMembers() {
    const checkboxes = document.querySelectorAll('#expense-members input[type="checkbox"]:checked');
    return Array.from(checkboxes).map(cb => cb.value);
  },

  /**
   * Get custom weight values from the custom weights inputs.
   */
  getCustomWeights() {
    const weights = {};
    const inputs = document.querySelectorAll('#custom-weights input[type="number"]');
    inputs.forEach(input => {
      const val = parseFloat(input.value) || 0;
      if (val > 0) {
        weights[input.dataset.member] = val;
      }
    });
    return weights;
  },

  /**
   * Handle scheme dropdown change — show/hide custom weights, update member checkboxes.
   */
  onSchemeChange() {
    const schemeName = document.getElementById('expense-scheme').value;
    const customGroup = document.getElementById('custom-weights-group');

    if (schemeName === 'Custom') {
      // Show custom weights UI
      this.renderCustomWeights();
      customGroup.classList.remove('hidden');
      // Check all members for custom
      const checkboxes = document.querySelectorAll('#expense-members input[type="checkbox"]');
      checkboxes.forEach(cb => { cb.checked = true; });
    } else {
      customGroup.classList.add('hidden');

      // Auto-exclude members with weight 0 in the selected scheme
      if (schemeName) {
        const scheme = App.schemes.find(s => s.name === schemeName);
        if (scheme) {
          const checkboxes = document.querySelectorAll('#expense-members input[type="checkbox"]');
          checkboxes.forEach(cb => {
            const weight = scheme.weights[cb.value];
            // Uncheck if weight is explicitly 0, check otherwise
            if (weight === 0) {
              cb.checked = false;
            } else {
              cb.checked = true;
            }
          });
        }
      }
    }

    this.updateSplitPreview();
  },

  /**
   * Render custom weight inputs for each member.
   */
  renderCustomWeights() {
    const container = document.getElementById('custom-weights');
    const members = App.members;
    let html = '';
    for (const m of members) {
      html += `<div class="custom-weight-row">
        <span>${m.name}</span>
        <input type="number" data-member="${m.name}" value="1" min="0" step="1" class="custom-weight-input">
      </div>`;
    }
    container.innerHTML = html;

    // Listen for changes to update preview
    container.querySelectorAll('input').forEach(input => {
      input.addEventListener('input', () => this.updateSplitPreview());
    });
  },

  /**
   * Update the split preview based on current form values.
   */
  updateSplitPreview() {
    const preview = document.getElementById('split-preview');
    const content = document.getElementById('split-preview-content');
    const amount = parseFloat(document.getElementById('expense-amount').value);
    const schemeName = document.getElementById('expense-scheme').value;
    const selectedMembers = this.getSelectedMembers();

    if (!amount || !schemeName || selectedMembers.length === 0) {
      preview.classList.add('hidden');
      return;
    }

    // Get weights based on scheme
    let memberWeights = {};
    let totalWeight = 0;

    if (schemeName === 'Custom') {
      const customWeights = this.getCustomWeights();
      for (const member of selectedMembers) {
        const weight = customWeights[member] || 0;
        if (weight > 0) {
          memberWeights[member] = weight;
          totalWeight += weight;
        }
      }
    } else {
      const scheme = App.schemes.find(s => s.name === schemeName);
      if (!scheme) {
        preview.classList.add('hidden');
        return;
      }
      for (const member of selectedMembers) {
        const weight = scheme.weights[member] || 1;
        memberWeights[member] = weight;
        totalWeight += weight;
      }
    }

    if (totalWeight === 0) {
      preview.classList.add('hidden');
      return;
    }

    let html = '';
    for (const member of selectedMembers) {
      if (memberWeights[member]) {
        const share = (memberWeights[member] / totalWeight) * amount;
        html += `<div class="split-preview-item">
          <span>${member}</span>
          <span>$${share.toFixed(2)}</span>
        </div>`;
      }
    }

    content.innerHTML = html;
    preview.classList.remove('hidden');
  },

  /**
   * Populate the paid-by and members UI with current member list.
   */
  populateMembers(members) {
    // Paid-by dropdown
    const paidBy = document.getElementById('expense-paidby');
    paidBy.innerHTML = '<option value="">Select who paid</option>';
    for (const m of members) {
      paidBy.innerHTML += `<option value="${m.name}">${m.name}</option>`;
    }

    // Member checkboxes
    const group = document.getElementById('expense-members');
    group.innerHTML = '';
    for (const m of members) {
      group.innerHTML += `<label><input type="checkbox" value="${m.name}" checked>${m.name}</label>`;
    }
  },

  /**
   * Populate the scheme dropdown (includes "Custom" option).
   */
  populateSchemes(schemes) {
    const select = document.getElementById('expense-scheme');
    select.innerHTML = '<option value="">Select a scheme</option>';
    for (const s of schemes) {
      select.innerHTML += `<option value="${s.name}">${s.name}</option>`;
    }
    // Always add Custom as the last option
    select.innerHTML += '<option value="Custom">Custom</option>';
  },

  /**
   * Initialize expense-related event listeners.
   */
  init() {
    const modal = document.getElementById('expense-modal');
    const addBtn = document.getElementById('add-expense-btn');
    const closeBtn = document.getElementById('modal-close');
    const cancelBtn = document.getElementById('expense-cancel');
    const form = document.getElementById('expense-form');

    addBtn.addEventListener('click', () => this.openModal());
    closeBtn.addEventListener('click', () => this.closeModal());
    cancelBtn.addEventListener('click', () => this.closeModal());
    modal.querySelector('.modal-backdrop').addEventListener('click', () => this.closeModal());

    form.addEventListener('submit', (e) => this.handleSubmit(e));

    // Live split preview updates
    document.getElementById('expense-amount').addEventListener('input', () => this.updateSplitPreview());
    document.getElementById('expense-scheme').addEventListener('change', () => this.onSchemeChange());
    document.getElementById('expense-members').addEventListener('change', () => this.updateSplitPreview());
  },

  /**
   * Escape HTML to prevent XSS.
   */
  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
};
