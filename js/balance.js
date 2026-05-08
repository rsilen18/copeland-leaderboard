/**
 * balance.js — Balance display and settlement directives.
 * Renders inline below the expenses list.
 */

const Balance = {
  currentBalance: null,

  /**
   * Load and display balance for the current month.
   */
  async load(month) {
    const content = document.getElementById('balance-content');
    content.innerHTML = '<p class="placeholder">Calculating balances...</p>';

    const result = await Api.get('getBalance', { month });

    if (!result.success) {
      content.innerHTML = '<p class="placeholder">Could not load balances.</p>';
      console.error('Balance load error:', result.error);
      return;
    }

    this.currentBalance = result.data;
    this.renderSummary(result.data);
  },

  /**
   * Render the balance summary inline.
   */
  renderSummary(data) {
    const content = document.getElementById('balance-content');
    const selectedUser = localStorage.getItem('selectedUser');
    const settlements = data.settlements;
    const balances = data.balances;

    if (!settlements || settlements.length === 0) {
      // No settlements means either no expenses or everyone paid equally
      const hasBalances = balances && Object.values(balances).some(v => Math.abs(v) > 0.01);
      if (!hasBalances) {
        content.innerHTML = '<p class="placeholder">No balances to show.</p>';
        return;
      }
    }

    let html = '<h3 class="balance-heading">Who Owes What</h3>';

    // Show settlements
    if (settlements && settlements.length > 0) {
      html += '<ul class="settlement-list">';
      for (const s of settlements) {
        if (s.from === selectedUser) {
          html += `<li class="settlement-item owes">
            <span>You owe <strong>${s.to}</strong></span>
            <span class="settlement-amount">$${s.amount.toFixed(2)}</span>
          </li>`;
        } else if (s.to === selectedUser) {
          html += `<li class="settlement-item owed">
            <span><strong>${s.from}</strong> owes you</span>
            <span class="settlement-amount">$${s.amount.toFixed(2)}</span>
          </li>`;
        } else {
          html += `<li class="settlement-item">
            <span><strong>${s.from}</strong> owes <strong>${s.to}</strong></span>
            <span class="settlement-amount">$${s.amount.toFixed(2)}</span>
          </li>`;
        }
      }
      html += '</ul>';
    }

    // Show per-person net below
    if (balances) {
      html += '<details class="balance-details"><summary>Per-person breakdown</summary>';
      html += '<table class="balance-table"><tr><th>Member</th><th>Net</th></tr>';
      for (const name in balances) {
        const amount = balances[name];
        const cls = amount > 0.01 ? 'positive' : amount < -0.01 ? 'negative' : '';
        const sign = amount > 0 ? '+' : '';
        html += `<tr><td>${name}</td><td class="${cls}">${sign}$${amount.toFixed(2)}</td></tr>`;
      }
      html += '</table></details>';
    }

    content.innerHTML = html;
  },

  /**
   * Initialize balance event handlers.
   */
  init() {
    // Balance detail modal — keep for potential future use but no standalone button needed
    const modal = document.getElementById('balance-modal');
    if (modal) {
      const closeBtn = document.getElementById('balance-modal-close');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
      }
      const backdrop = modal.querySelector('.modal-backdrop');
      if (backdrop) {
        backdrop.addEventListener('click', () => modal.classList.add('hidden'));
      }
    }
  }
};
