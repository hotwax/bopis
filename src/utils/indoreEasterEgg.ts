/**
 * Gated on the BROWSER's timezone rather than the app's configured one, and the difference matters:
 * a tester in Indore working a US store has the app set to America/Chicago while their machine is
 * still Asia/Kolkata. So this keys off who is holding the device, not which store they are testing.
 * A US machine never renders any of it.
 *
 * Confined to one file and reached through one `if` in the settings screen and one in the alert,
 * so it can be deleted wholesale.
 */

// "Asia/Calcutta" is the legacy zone id and still what some browsers report.
export const INDIA_TIMEZONES = ["Asia/Kolkata", "Asia/Calcutta"];

export const INDORI_MODE_STORAGE_KEY = "bopis.indoriMode";

export function isIndoreTeam(timeZone?: string): boolean {
  try {
    const zone = timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
    return INDIA_TIMEZONES.includes(zone);
  } catch {
    return false;
  }
}

export interface IndoriLine {
  /** Devanagari, read by a Hindi voice — the version that actually sounds right. */
  text: string;
  /** Romanised, for an Indian-English voice — used only if the engine will not start the Hindi one. */
  fallbackText: string;
}

/** Keep them affectionate and safe for a shop floor: this plays out loud. */
export const INDORI_LINES: IndoriLine[] = [
  { text: "नया ऑर्डर आ गया, पोहा ठंडा हो रहा है", fallbackText: "Naya order aa gaya, poha thanda ho raha hai" },
  { text: "ऑर्डर आया है, सराफा बंद होने से पहले निपटा लो", fallbackText: "Order aaya hai, Sarafa band hone se pehle nipta lo" },
  { text: "ऑर्डर रेडी है, जलेबी के साथ", fallbackText: "Order ready hai, jalebi ke saath" }
];

/** `random` is injectable so a test can pin the choice. */
export function pickIndoriLine(random: () => number = Math.random): IndoriLine {
  return INDORI_LINES[Math.floor(random() * INDORI_LINES.length)];
}

export function isIndoriModeEnabled(): boolean {
  // Timezone first, never cached: a stored preference must not be able to switch this on for a
  // device outside India, however it got written.
  if (!isIndoreTeam()) return false;
  try {
    return localStorage.getItem(INDORI_MODE_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function setIndoriModeEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(INDORI_MODE_STORAGE_KEY, String(enabled));
  } catch {
    // A blocked preference store should not break the settings screen.
  }
}
