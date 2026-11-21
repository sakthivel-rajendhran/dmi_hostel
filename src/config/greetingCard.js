/**
 * Student Dashboard Greeting Card Configuration
 * Background images can be customized or replaced per time period without modifying component code.
 */

export const GREETING_CARD_CONFIG = {
  backgrounds: {
    morning: "/images/greeting-morning.jpg",
    afternoon: "/images/greeting-afternoon.jpg",
    evening: "/images/greeting-evening.jpg",
    night: "/images/greeting-night.jpg",
    default: "/images/greeting-bg.jpg",
  },
  timePeriods: {
    morning: { startHour: 5, endHour: 11, greeting: "Good Morning" },
    afternoon: { startHour: 12, endHour: 16, greeting: "Good Afternoon" },
    evening: { startHour: 17, endHour: 19, greeting: "Good Evening" },
    night: { startHour: 20, endHour: 4, greeting: "Good Night" },
  },
};

/**
 * Returns dynamic time-period details based on the user's local device clock.
 * Morning: 5:00 AM – 11:59 AM
 * Afternoon: 12:00 PM – 4:59 PM
 * Evening: 5:00 PM – 7:59 PM
 * Night: 8:00 PM – 4:59 AM
 *
 * @param {Date} [date] - Optional date object (defaults to new Date())
 * @param {string} [overridePeriod] - Optional test override ('morning', 'afternoon', 'evening', 'night')
 */
export function getTimePeriodData(date = new Date(), overridePeriod = null) {
  if (overridePeriod && ["morning", "afternoon", "evening", "night"].includes(overridePeriod.toLowerCase())) {
    const p = overridePeriod.toLowerCase();
    return getPeriodConfig(p);
  }

  const hour = date.getHours();

  if (hour >= 5 && hour < 12) {
    return getPeriodConfig("morning");
  } else if (hour >= 12 && hour < 17) {
    return getPeriodConfig("afternoon");
  } else if (hour >= 17 && hour < 20) {
    return getPeriodConfig("evening");
  } else {
    return getPeriodConfig("night");
  }
}

function getPeriodConfig(period) {
  switch (period) {
    case "morning":
      return {
        id: "morning",
        greeting: "Good Morning",
        bgImage: GREETING_CARD_CONFIG.backgrounds.morning,
        overlayGradient: "from-amber-600/35 via-sky-950/45 to-slate-950/80",
        accentGlow: "bg-amber-400/20",
        themeTag: "Fresh Morning Sky",
      };
    case "afternoon":
      return {
        id: "afternoon",
        greeting: "Good Afternoon",
        bgImage: GREETING_CARD_CONFIG.backgrounds.afternoon,
        overlayGradient: "from-sky-700/35 via-slate-900/45 to-slate-950/80",
        accentGlow: "bg-blue-400/20",
        themeTag: "Bright Daylight",
      };
    case "evening":
      return {
        id: "evening",
        greeting: "Good Evening",
        bgImage: GREETING_CARD_CONFIG.backgrounds.evening,
        overlayGradient: "from-orange-700/40 via-purple-950/50 to-slate-950/85",
        accentGlow: "bg-orange-400/25",
        themeTag: "Golden Sunset",
      };
    case "night":
    default:
      return {
        id: "night",
        greeting: "Good Night",
        bgImage: GREETING_CARD_CONFIG.backgrounds.night,
        overlayGradient: "from-indigo-950/60 via-slate-950/70 to-black/90",
        accentGlow: "bg-indigo-400/15",
        themeTag: "Midnight Sky",
      };
  }
}
