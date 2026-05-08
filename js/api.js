/**
 * api.js — Fetch wrapper for Google Apps Script Web App API.
 * Handles PIN injection, loading states, and error handling.
 *
 * Note: Google Apps Script web apps return a 302 redirect. We use
 * redirect:'follow' (default) and parse the final response as text first
 * to handle cases where the response isn't valid JSON.
 */

const API_BASE_URL = 'https://script.google.com/macros/s/AKfycbzFFpXWM6oYdvmOlm8IvCHedhHE1YvOUCHymJt2ft_9f_z4NYZpmqtSedRCvmMZAgo/exec';

const Api = {
  /**
   * Make a GET request to the API.
   */
  async get(action, params = {}) {
    const pin = sessionStorage.getItem('pin');
    const query = new URLSearchParams({ action, pin, ...params });
    const url = `${API_BASE_URL}?${query}`;

    try {
      const response = await fetch(url, { redirect: 'follow' });
      const text = await response.text();
      try {
        return JSON.parse(text);
      } catch (parseErr) {
        console.error(`API GET ${action} — response not JSON:`, text.substring(0, 200));
        return { success: false, error: 'Invalid response from server' };
      }
    } catch (err) {
      console.error(`API GET ${action} failed:`, err);
      return { success: false, error: err.message };
    }
  },

  /**
   * Make a POST request to the API.
   */
  async post(action, data = {}) {
    const pin = sessionStorage.getItem('pin');

    try {
      const response = await fetch(API_BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ action, pin, ...data }),
        redirect: 'follow'
      });
      const text = await response.text();
      try {
        return JSON.parse(text);
      } catch (parseErr) {
        console.error(`API POST ${action} — response not JSON:`, text.substring(0, 200));
        return { success: false, error: 'Invalid response from server' };
      }
    } catch (err) {
      console.error(`API POST ${action} failed:`, err);
      return { success: false, error: err.message };
    }
  },

  /**
   * Validate a PIN (used during login).
   */
  async validatePin(pin) {
    const query = new URLSearchParams({ action: 'getMembers', pin });
    const url = `${API_BASE_URL}?${query}`;

    try {
      const response = await fetch(url, { redirect: 'follow' });
      const text = await response.text();
      try {
        const result = JSON.parse(text);
        return result.success;
      } catch (parseErr) {
        console.error('PIN validation — response not JSON:', text.substring(0, 200));
        return false;
      }
    } catch (err) {
      console.error('PIN validation failed:', err);
      return false;
    }
  }
};

/**
 * Show/hide the global loading overlay.
 */
function showLoading() {
  document.getElementById('loading-overlay').classList.remove('hidden');
}

function hideLoading() {
  document.getElementById('loading-overlay').classList.add('hidden');
}
