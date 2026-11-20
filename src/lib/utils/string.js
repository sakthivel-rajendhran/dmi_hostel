/**
 * String utility helpers
 */

/**
 * Converts a string to Title Case (first letter of each word capitalized)
 * e.g. "rahul kumar" -> "Rahul Kumar"
 * @param {string} str
 * @returns {string}
 */
export function toTitleCase(str) {
  if (!str || typeof str !== "string") return "";
  return str
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
    .trim();
}

/**
 * Generates initials from a full name (e.g. "Rahul Kumar" -> "RK", "Arumugam" -> "A")
 * @param {string} name
 * @returns {string}
 */
export function getInitials(name) {
  if (!name || typeof name !== "string") return "DMI";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default {
  toTitleCase,
  getInitials,
};
