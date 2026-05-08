/**
 * Auth.gs — PIN validation
 * Validates the shared PIN against the Config tab.
 */

/**
 * Check if the provided PIN matches the one stored in Config.
 * Returns true if valid, false otherwise.
 */
function validatePin(pin) {
  if (!pin) return false;
  var storedPin = getConfigValue('PIN');
  return storedPin !== null && storedPin.toString() === pin.toString();
}
