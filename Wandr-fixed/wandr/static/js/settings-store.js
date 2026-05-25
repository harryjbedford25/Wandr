/* Wandr — shared settings (localStorage) */

const WANDR_SETTINGS_KEY = "wandr:settings";

const SETTINGS_DEFAULTS = {
  darkMode: false,
  reduceMotion: false,
  showCommunityPins: true,
  anonymousByDefault: true,
  trainSpeedKmh: 80,
  distanceUnit: "km",
};

function loadSettings() {
  try {
    const raw = localStorage.getItem(WANDR_SETTINGS_KEY);
    if (!raw) return { ...SETTINGS_DEFAULTS };
    return { ...SETTINGS_DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...SETTINGS_DEFAULTS };
  }
}

function saveSettings(partial) {
  const next = { ...loadSettings(), ...partial };
  localStorage.setItem(WANDR_SETTINGS_KEY, JSON.stringify(next));
  applySettings(next);
  return next;
}

function applySettings(settings = loadSettings()) {
  const s = { ...SETTINGS_DEFAULTS, ...settings };
  document.documentElement.setAttribute("data-theme", s.darkMode ? "dark" : "light");
  document.documentElement.classList.toggle("reduce-motion", s.reduceMotion);
  window.dispatchEvent(new CustomEvent("wandr:settings", { detail: s }));
  return s;
}

function applySettingsEarly() {
  try {
    const raw = localStorage.getItem(WANDR_SETTINGS_KEY);
    if (!raw) return;
    const s = { ...SETTINGS_DEFAULTS, ...JSON.parse(raw) };
    if (s.darkMode) document.documentElement.setAttribute("data-theme", "dark");
    if (s.reduceMotion) document.documentElement.classList.add("reduce-motion");
  } catch {
    /* ignore */
  }
}

function clearLocalData() {
  localStorage.removeItem("wandr:countries");
  if (typeof WandrLasso !== "undefined") WandrLasso.clear();
  window.dispatchEvent(new CustomEvent("wandr:cleared-local"));
}

window.WandrSettings = {
  KEY: WANDR_SETTINGS_KEY,
  DEFAULTS: SETTINGS_DEFAULTS,
  load: loadSettings,
  save: saveSettings,
  apply: applySettings,
  applyEarly: applySettingsEarly,
  clearLocalData,
};
