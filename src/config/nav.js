/**
 * DMI College Hostel Management PWA - Navigation Config
 */

import { ROLE_CONFIG, getNavForRole } from "./roles.js";

export { ROLE_CONFIG, getNavForRole };

/**
 * Checks whether the current path matches or starts with the given href
 * @param {string} currentPath
 * @param {string} targetHref
 * @returns {boolean}
 */
export function isRouteActive(currentPath, targetHref) {
  if (!currentPath || !targetHref) return false;
  if (currentPath === targetHref) return true;
  // If target href is more specific than root
  if (targetHref !== "/" && currentPath.startsWith(targetHref)) {
    return true;
  }
  return false;
}
