const DEFAULT_TIMEZONE = "Europe/Paris";
const DEFAULT_PILLULE_REMINDER_HOUR = 20;
const DEFAULT_GAME_REMINDER_HOUR = 19;
const DEFAULT_GAME_RANDOM_MIN_HOUR = 10;
const DEFAULT_GAME_RANDOM_MAX_HOUR = 21;

type DateParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

export type UserNotificationSettings = {
  telegramChatId: string;
  timezone: string;
  pilluleEnabled: boolean;
  gameEnabled: boolean;
  pilluleReminderHour: number;
  gameReminderHour: number;
  pushEnabled: boolean;
  webPushTokens: string[];
};

function normalizeHour(value: unknown, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  if (parsed < 0 || parsed > 23) return fallback;
  return Math.trunc(parsed);
}

export function normalizeTimeZone(value: unknown, fallback = DEFAULT_TIMEZONE) {
  const candidate = typeof value === "string" ? value.trim() : "";
  const zone = candidate || fallback;

  try {
    new Intl.DateTimeFormat("en-US", { timeZone: zone }).format(new Date());
    return zone;
  } catch {
    return fallback;
  }
}

export function normalizeUserNotificationSettings(source: any): UserNotificationSettings {
  const settings = source?.notificationSettings || {};
  const telegramChatId = String(settings.telegramChatId || "").trim();
  const timezone = normalizeTimeZone(settings.timezone);
  const rawPushTokens = Array.isArray(settings.webPushTokens) ? settings.webPushTokens : [];
  const webPushTokens = rawPushTokens
    .map((token: unknown) => String(token || "").trim())
    .filter((token: string) => token.length > 0);

  return {
    telegramChatId,
    timezone,
    pilluleEnabled: settings.pilluleEnabled !== false,
    gameEnabled: settings.gameEnabled !== false,
    pilluleReminderHour: normalizeHour(settings.pilluleReminderHour, DEFAULT_PILLULE_REMINDER_HOUR),
    gameReminderHour: normalizeHour(settings.gameReminderHour, DEFAULT_GAME_REMINDER_HOUR),
    pushEnabled: settings.pushEnabled !== false,
    webPushTokens,
  };
}

function getZonedDateParts(date: Date, timezone: string): DateParts {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const map = new Map(parts.map((part) => [part.type, part.value]));

  return {
    year: Number(map.get("year") || 0),
    month: Number(map.get("month") || 0),
    day: Number(map.get("day") || 0),
    hour: Number(map.get("hour") || 0),
    minute: Number(map.get("minute") || 0),
  };
}

export function getLocalDateInfo(date: Date, timezone: string) {
  const parts = getZonedDateParts(date, timezone);
  const dateKey = `${parts.year.toString().padStart(4, "0")}-${parts.month
    .toString()
    .padStart(2, "0")}-${parts.day.toString().padStart(2, "0")}`;

  return {
    dateKey,
    hour: parts.hour,
    minute: parts.minute,
  };
}

export function isReminderDue(
  localHour: number,
  localMinute: number,
  targetHour: number,
  minuteWindow = 20,
) {
  return localHour === targetHour && localMinute >= 0 && localMinute < minuteWindow;
}

function hashToPositiveInt(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getDailyRandomGameHour(
  uid: string,
  dateKey: string,
  minHour = DEFAULT_GAME_RANDOM_MIN_HOUR,
  maxHour = DEFAULT_GAME_RANDOM_MAX_HOUR,
) {
  const safeMin = Math.min(minHour, maxHour);
  const safeMax = Math.max(minHour, maxHour);
  const hourRange = safeMax - safeMin + 1;
  const seed = `${uid}:${dateKey}`;
  const hash = hashToPositiveInt(seed);
  return safeMin + (hash % hourRange);
}

function parseDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map((value) => Number(value));
  if (!year || !month || !day) return null;
  return { year, month, day };
}

export function diffDaysFromDateKeys(fromDateKey: string, toDateKey: string) {
  const from = parseDateKey(fromDateKey);
  const to = parseDateKey(toDateKey);
  if (!from || !to) return null;

  const fromUtc = Date.UTC(from.year, from.month - 1, from.day);
  const toUtc = Date.UTC(to.year, to.month - 1, to.day);

  return Math.floor((fromUtc - toUtc) / (1000 * 60 * 60 * 24));
}

export function isDateKey(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.trim());
}
