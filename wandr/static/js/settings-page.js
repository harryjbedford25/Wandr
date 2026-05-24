(function () {
  const s = WandrSettings.load();

  const fields = {
    darkMode: document.getElementById("set-dark-mode"),
    reduceMotion: document.getElementById("set-reduce-motion"),
    showCommunityPins: document.getElementById("set-community-pins"),
    anonymousByDefault: document.getElementById("set-anonymous"),
    trainSpeedKmh: document.getElementById("set-train-speed"),
    distanceUnit: document.getElementById("set-distance-unit"),
  };

  fields.darkMode.checked = s.darkMode;
  fields.reduceMotion.checked = s.reduceMotion;
  fields.showCommunityPins.checked = s.showCommunityPins;
  fields.anonymousByDefault.checked = s.anonymousByDefault;
  fields.trainSpeedKmh.value = String(s.trainSpeedKmh);
  fields.distanceUnit.value = s.distanceUnit;

  const savedEl = document.getElementById("settings-saved");
  let savedTimer;

  function flashSaved() {
    savedEl.hidden = false;
    clearTimeout(savedTimer);
    savedTimer = setTimeout(() => {
      savedEl.hidden = true;
    }, 1600);
  }

  function bindToggle(el, key) {
    el.addEventListener("change", () => {
      WandrSettings.save({ [key]: el.checked });
      flashSaved();
    });
  }

  function bindSelect(el, key, asNumber = false) {
    el.addEventListener("change", () => {
      const val = asNumber ? Number(el.value) : el.value;
      WandrSettings.save({ [key]: val });
      flashSaved();
    });
  }

  bindToggle(fields.darkMode, "darkMode");
  bindToggle(fields.reduceMotion, "reduceMotion");
  bindToggle(fields.showCommunityPins, "showCommunityPins");
  bindToggle(fields.anonymousByDefault, "anonymousByDefault");
  bindSelect(fields.trainSpeedKmh, "trainSpeedKmh", true);
  bindSelect(fields.distanceUnit, "distanceUnit");

  document.getElementById("btn-clear-local").addEventListener("click", () => {
    if (!confirm("Clear visited countries, bucket list, and lasso area on this device?")) return;
    WandrSettings.clearLocalData();
    flashSaved();
  });
})();
