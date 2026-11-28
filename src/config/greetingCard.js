/**
 * Student Dashboard Greeting Card Configuration
 * Background images and time period mappings for the dynamic 4-session greeting card.
 * Time periods follow Indian Standard Time (Asia/Kolkata, UTC+05:30):
 * - GOOD MORNING:   05:00 AM – 11:59 AM
 * - GOOD AFTERNOON: 12:00 PM – 04:59 PM
 * - GOOD EVENING:   05:00 PM – 07:59 PM
 * - GOOD NIGHT:     08:00 PM – 04:59 AM
 */

export const GREETING_CARD_CONFIG = {
  backgroundFallback: "/images/student-greeting-bg.png",
  timePeriods: {
    morning: {
      id: "morning",
      startHour: 5,
      endHour: 11,
      greeting: "GOOD MORNING",
      bgImage: "/images/greeting-morning.png",
      glowClass: "greeting-glow-morning",
      glowIntensity: "subtle",
      showCelestial: false,
    },
    afternoon: {
      id: "afternoon",
      startHour: 12,
      endHour: 16,
      greeting: "GOOD AFTERNOON",
      bgImage: "/images/greeting-afternoon.png",
      glowClass: "greeting-glow-afternoon",
      glowIntensity: "minimal",
      showCelestial: false,
    },
    evening: {
      id: "evening",
      startHour: 17,
      endHour: 19,
      greeting: "GOOD EVENING",
      bgImage: "/images/greeting-evening.png",
      glowClass: "greeting-glow-evening",
      glowIntensity: "moderate",
      showCelestial: false,
    },
    night: {
      id: "night",
      startHour: 20,
      endHour: 4,
      greeting: "GOOD NIGHT",
      bgImage: "/images/greeting-night.png",
      glowClass: "greeting-glow-night",
      glowIntensity: "luminous",
      showCelestial: true,
    },
  },
};

/**
 * Returns hours and minutes in Asia/Kolkata timezone
 * @param {Date} date
 */
export function getKolkataTime(date = new Date()) {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Kolkata",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      hour12: false,
    });
    const parts = formatter.formatToParts(date);
    const hourPart = parts.find((p) => p.type === "hour");
    const minutePart = parts.find((p) => p.type === "minute");
    const secondPart = parts.find((p) => p.type === "second");
    return {
      hour: hourPart ? parseInt(hourPart.value, 10) : date.getHours(),
      minute: minutePart ? parseInt(minutePart.value, 10) : date.getMinutes(),
      second: secondPart ? parseInt(secondPart.value, 10) : date.getSeconds(),
    };
  } catch (e) {
    const utc = date.getTime() + date.getTimezoneOffset() * 60000;
    const kolkataDate = new Date(utc + 5.5 * 3600000);
    return {
      hour: kolkataDate.getHours(),
      minute: kolkataDate.getMinutes(),
      second: kolkataDate.getSeconds(),
    };
  }
}

/**
 * Returns dynamic time-period details based on Asia/Kolkata local time:
 * - Morning: 5:00 AM – 11:59 AM -> "GOOD MORNING"
 * - Afternoon: 12:00 PM – 4:59 PM -> "GOOD AFTERNOON"
 * - Evening: 5:00 PM – 7:59 PM -> "GOOD EVENING"
 * - Night: 8:00 PM – 4:59 AM -> "GOOD NIGHT"
 *
 * @param {Date} [date] - Optional date object (defaults to new Date())
 * @param {string} [overridePeriod] - Optional test override ('morning', 'afternoon', 'evening', 'night' or simulated time '06:00', '13:00', '18:00', '22:00')
 */
export function getTimePeriodData(date = new Date(), overridePeriod = null) {
  if (overridePeriod) {
    const opt = String(overridePeriod).trim().toLowerCase();

    // Direct period name match
    if (["morning", "afternoon", "evening", "night"].includes(opt)) {
      return GREETING_CARD_CONFIG.timePeriods[opt];
    }

    // Direct time format match (e.g. "06:00", "13:00", "18:00", "22:00")
    if (opt.includes(":")) {
      const parts = opt.split(":");
      const testHour = parseInt(parts[0], 10);
      if (!isNaN(testHour)) {
        if (testHour >= 5 && testHour < 12) {
          return GREETING_CARD_CONFIG.timePeriods.morning;
        } else if (testHour >= 12 && testHour < 17) {
          return GREETING_CARD_CONFIG.timePeriods.afternoon;
        } else if (testHour >= 17 && testHour < 20) {
          return GREETING_CARD_CONFIG.timePeriods.evening;
        } else {
          return GREETING_CARD_CONFIG.timePeriods.night;
        }
      }
    }
  }

  const { hour } = getKolkataTime(date);

  if (hour >= 5 && hour < 12) {
    return GREETING_CARD_CONFIG.timePeriods.morning;
  } else if (hour >= 12 && hour < 17) {
    return GREETING_CARD_CONFIG.timePeriods.afternoon;
  } else if (hour >= 17 && hour < 20) {
    return GREETING_CARD_CONFIG.timePeriods.evening;
  } else {
    return GREETING_CARD_CONFIG.timePeriods.night;
  }
}
