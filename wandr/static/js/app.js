/* Wandr */

const PRICE_LABELS = { 1: "$", 2: "$$", 3: "$$$" };

const PLACE_TYPES = {
  spot: { label: "Spots", icon: "📍", color: "#ff6b2c" },
  hostel: { label: "Hostels", icon: "🛏️", color: "#8b5cf6" },
  hotel: { label: "Hotels", icon: "🏨", color: "#6366f1" },
  food: { label: "Food", icon: "🍜", color: "#22c55e" },
  transport: { label: "Stations", icon: "🚉", color: "#0ea5e9" },
  view: { label: "Views", icon: "🌅", color: "#eab308" },
};

let map;
let baseTileLayer = null;
let pins = [];
let markers = {};
let heatLayer = null;
let trainLayer = null;
let appSettings = null;

const MAP_TILES = {
  light: {
    url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    attribution: "&copy; OSM &copy; CARTO",
  },
  dark: {
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: "&copy; OSM &copy; CARTO",
  },
};
let interrailLayer = null;
let stationsLayer = null;
let travelCircle = null;
let travelCentreMarker = null;
let countriesMapLayer = null;
let dropMode = false;
let selectedPinId = null;
let selectedRating = 0;
let routeFilter = "all";
let pendingCountryCode = null;
let showCommunityPins = true;
let lassoMode = false;

const typeFilters = Object.fromEntries(Object.keys(PLACE_TYPES).map((k) => [k, true]));

const els = {};

function cacheElements() {
  els.pinList = document.getElementById("pin-list");
  els.pinDetail = document.getElementById("pin-detail");
  els.mapHint = document.getElementById("map-hint");
  els.legendTypeDots = document.getElementById("legend-type-dots");
  els.pinsDrawer = document.getElementById("pins-drawer");
  els.pinsDrawerTrigger = document.getElementById("pins-drawer-trigger");
  els.pinsListView = document.getElementById("pins-list-view");
  els.pinsDetailView = document.getElementById("pins-detail-view");
  els.pinsTriggerLabel = document.querySelector(".pins-trigger-label");
  els.btnToggleCommunity = document.getElementById("btn-toggle-community");
  els.modalNewPin = document.getElementById("modal-new-pin");
  els.modalReview = document.getElementById("modal-review");
  els.modalCountry = document.getElementById("modal-country");
  els.formNewPin = document.getElementById("form-new-pin");
  els.formReview = document.getElementById("form-review");
  els.regionStatus = document.getElementById("region-status");
  els.btnLassoRegion = document.getElementById("btn-lasso-region");
  els.btnClearRegion = document.getElementById("btn-clear-region");
  els.btnTools = document.getElementById("btn-tools");
  els.toolsPanel = document.getElementById("tools-panel");
  els.photoPreview = document.getElementById("photo-preview");
  els.btnPhotoDay = document.getElementById("btn-photo-day");
  els.photoThumb = document.getElementById("photo-thumb");
  els.photoTitle = document.getElementById("photo-title");
  els.photoEmpty = document.getElementById("photo-empty");
}

function normalizeType(t) {
  if (t === "hangout") return "spot";
  return PLACE_TYPES[t] ? t : "spot";
}

function placeMeta(type) {
  return PLACE_TYPES[normalizeType(type)];
}

function priceLabel(tier) {
  if (!tier) return "—";
  return PRICE_LABELS[Math.round(tier)] || "—";
}

function stars(n) {
  return "★".repeat(n) + "☆".repeat(5 - n);
}

function anonLabel(review) {
  if (review.isAnonymous) return "Anonymous";
  return review.displayName || "Traveller";
}

function escapeHtml(str) {
  const d = document.createElement("div");
  d.textContent = str;
  return d.innerHTML;
}

async function api(path, options = {}) {
  const res = await fetch(path, options);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

function pinInRegion(pin) {
  return WandrLasso.contains(pin.lat, pin.lng);
}

function updateRegionStatus() {
  if (!els.regionStatus) return;
  if (WandrLasso.hasSelection()) {
    els.regionStatus.textContent = "Lasso area active";
    els.btnClearRegion.hidden = false;
  } else {
    els.regionStatus.textContent = "Everywhere";
    els.btnClearRegion.hidden = true;
  }
}

function updatePinsTriggerLabel() {
  if (!els.pinsTriggerLabel) return;
  const n = getVisiblePins().length;
  els.pinsTriggerLabel.textContent = `${n} pin${n === 1 ? "" : "s"}`;
}

function updateCommunityButton() {
  if (!els.btnToggleCommunity) return;
  els.btnToggleCommunity.textContent = showCommunityPins ? "Hide pins" : "Show pins";
}

function openPinsDrawer() {
  els.pinsDrawer?.classList.add("open");
  els.pinsDrawerTrigger?.setAttribute("aria-expanded", "true");
}

function closePinsDrawer() {
  els.pinsDrawer?.classList.remove("open");
  els.pinsDrawerTrigger?.setAttribute("aria-expanded", "false");
}

function togglePinsDrawer() {
  els.pinsDrawer?.classList.toggle("open");
  const open = els.pinsDrawer?.classList.contains("open");
  els.pinsDrawerTrigger?.setAttribute("aria-expanded", open ? "true" : "false");
}

function isTypeVisible(pin) {
  return typeFilters[normalizeType(pin.placeType)] !== false;
}

function passesRouteFilter(pin) {
  if (routeFilter !== "budget") return true;
  if (!pin.reviews.length) return false;
  if (pin.avgPriceTier && pin.avgPriceTier <= 2) return true;
  return pin.reviews.some((r) => r.priceTier <= 2);
}

function getVisiblePins() {
  if (!showCommunityPins) return [];
  return pins.filter((p) => isTypeVisible(p) && passesRouteFilter(p) && pinInRegion(p));
}

function createPinLayer(pin) {
  const meta = placeMeta(pin.placeType);
  const hasPhoto = Boolean(pin.photoUrl);
  const marker = L.circleMarker([pin.lat, pin.lng], {
    radius: hasPhoto ? 11 : 8,
    color: "#ffffff",
    weight: 2,
    fillColor: meta.color,
    fillOpacity: 1,
  });

  const photoHtml = hasPhoto
    ? `<img src="${escapeHtml(pin.photoUrl)}" alt="" class="popup-photo" />`
    : "";
  const avg = pin.avgRating ? `${stars(Math.round(pin.avgRating))}` : "No reviews";
  marker.bindPopup(
    `${photoHtml}
     <strong>${escapeHtml(pin.title)}</strong><br/>
     ${meta.icon} ${meta.label} · ${avg}<br/>
     <button type="button" class="popup-btn">Details</button>`
  );
  marker.on("click", () => selectPin(pin.id));
  marker.on("popupopen", (e) => {
    const btn = e.popup.getElement()?.querySelector(".popup-btn");
    if (btn) btn.onclick = (ev) => { ev.stopPropagation(); selectPin(pin.id); };
  });
  return marker;
}

function formatDistance(km) {
  if (!appSettings) appSettings = WandrSettings.load();
  if (appSettings.distanceUnit === "mi") {
    const mi = km * 0.621371;
    return `~${Math.round(mi)} mi`;
  }
  return `~${Math.round(km)} km`;
}

function applyMapTheme() {
  if (!map) return;
  const dark = appSettings?.darkMode;
  const spec = dark ? MAP_TILES.dark : MAP_TILES.light;
  if (baseTileLayer) map.removeLayer(baseTileLayer);
  baseTileLayer = L.tileLayer(spec.url, {
    attribution: spec.attribution,
    maxZoom: 19,
  }).addTo(map);
  if (trainLayer && map.hasLayer(trainLayer)) {
    trainLayer.setOpacity(dark ? 0.65 : 0.85);
  }
}

function applyAppSettings(settings) {
  appSettings = settings || WandrSettings.load();
  WandrSettings.apply(appSettings);
  showCommunityPins = appSettings.showCommunityPins;
  updateCommunityButton();
  applyMapTheme();
  if (els.formReview) {
    const anon = document.getElementById("review-anonymous");
    if (anon) anon.checked = appSettings.anonymousByDefault;
  }
  renderMarkers();
  renderPinList();
  updatePinsTriggerLabel();
  updateTravelCircle();
  void refreshHeatmap();
}

function initMap() {
  map = L.map("map", { zoomControl: true }).setView([48.5, 10], 5);
  appSettings = WandrSettings.load();
  applyMapTheme();

  trainLayer = L.tileLayer("https://tiles.openrailwaymap.org/standard/{z}/{x}/{y}.png", {
    attribution: "Trains &copy; OpenRailwayMap",
    maxZoom: 19,
    opacity: 0.85,
  });
  trainLayer.addTo(map);

  map.on("click", onMapClick);
  map.on("moveend", debounce(loadStationsIfEnabled, 400));

  WandrLasso.init(map, {
    onComplete: () => {
      lassoMode = false;
      els.btnLassoRegion.classList.remove("active");
      els.mapHint.hidden = true;
      updateRegionStatus();
      renderMarkers();
      renderPinList();
      refreshHeatmap();
    },
    onClear: () => {
      updateRegionStatus();
      renderMarkers();
      renderPinList();
      refreshHeatmap();
    },
  });
}

function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

async function loadInterrailLayer() {
  if (interrailLayer) return;
  const res = await fetch("/static/data/interrail-corridors.geojson");
  interrailLayer = L.geoJSON(await res.json(), {
    style: { color: "#7c3aed", weight: 4, opacity: 0.75, dashArray: "10 8" },
    onEachFeature: (f, layer) => {
      layer.bindPopup(`<strong>${escapeHtml(f.properties.name)}</strong>`);
    },
  });
}

async function loadPins() {
  pins = await api("/api/pins");
  renderMarkers();
  renderPinList();
  if (document.getElementById("layer-heatmap")?.checked) await refreshHeatmap();
}

function renderMarkers() {
  Object.values(markers).forEach((m) => map.removeLayer(m));
  markers = {};
  getVisiblePins().forEach((pin) => {
    const marker = createPinLayer(pin);
    marker.addTo(map);
    markers[pin.id] = marker;
  });
}

function renderPinList() {
  const visible = getVisiblePins();
  updatePinsTriggerLabel();
  els.pinList.innerHTML = visible.length
    ? visible
        .map((pin) => {
          const meta = placeMeta(pin.placeType);
          const thumb = pin.photoUrl
            ? `<img class="list-thumb" src="${escapeHtml(pin.photoUrl)}" alt="" />`
            : `<span class="type-dot" style="background:${meta.color}"></span>`;
          return `
    <li>
      <button type="button" class="pin-card ${pin.id === selectedPinId ? "active" : ""}" data-id="${pin.id}">
        ${thumb}
        <div>
          <h4>${escapeHtml(pin.title)}</h4>
          <div class="meta">${meta.label} · ${priceLabel(pin.avgPriceTier)}</div>
        </div>
      </button>
    </li>`;
        })
        .join("")
    : `<li class="empty-list">${showCommunityPins ? "No pins in this area — draw a new lasso or clear it." : "Community pins hidden."}</li>`;

  els.pinList.querySelectorAll(".pin-card").forEach((btn) => {
    btn.addEventListener("click", () => selectPin(btn.dataset.id));
  });
}

function renderLegendDots() {
  els.legendTypeDots.innerHTML = Object.entries(PLACE_TYPES)
    .map(
      ([key, meta]) =>
        `<button type="button" class="legend-dot ${typeFilters[key] ? "on" : "off"}"
          data-type="${key}" style="--dot-color:${meta.color}"
          title="${meta.label}" aria-label="${meta.label}" aria-pressed="${typeFilters[key]}"></button>`
    )
    .join("");

  els.legendTypeDots.querySelectorAll(".legend-dot").forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = btn.dataset.type;
      typeFilters[key] = !typeFilters[key];
      btn.classList.toggle("on", typeFilters[key]);
      btn.classList.toggle("off", !typeFilters[key]);
      btn.setAttribute("aria-pressed", typeFilters[key]);
      renderMarkers();
      renderPinList();
      refreshHeatmap();
    });
  });
}

function setTypeFilterOn(key, on = true) {
  typeFilters[key] = on;
  const btn = els.legendTypeDots?.querySelector(`[data-type="${key}"]`);
  if (btn) {
    btn.classList.toggle("on", on);
    btn.classList.toggle("off", !on);
    btn.setAttribute("aria-pressed", on);
  }
}

function selectPin(pinId) {
  selectedPinId = pinId;
  const pin = pins.find((p) => p.id === pinId);
  if (!pin) return;

  map.setView([pin.lat, pin.lng], Math.max(map.getZoom(), 14), { animate: true });
  markers[pinId]?.openPopup();

  els.pinsListView.hidden = true;
  els.pinsDetailView.hidden = false;
  openPinsDrawer();

  const meta = placeMeta(pin.placeType);
  const photoBlock = pin.photoUrl
    ? `<img class="detail-photo" src="${escapeHtml(pin.photoUrl)}" alt="${escapeHtml(pin.title)}" />`
    : "";

  const reviewsHtml =
    pin.reviews.length === 0
      ? '<p class="empty-reviews">No reviews yet.</p>'
      : `<ul class="review-list">${pin.reviews
          .map(
            (r) => `<li class="review-item">
          <div class="review-head"><span class="stars">${stars(r.rating)}</span><span>${priceLabel(r.priceTier)}</span></div>
          <span class="author ${r.isAnonymous ? "anon" : ""}">${escapeHtml(anonLabel(r))}</span>
          <p>${escapeHtml(r.body)}</p></li>`
          )
          .join("")}</ul>`;

  els.pinDetail.innerHTML = `
    <div class="pin-detail">
      ${photoBlock}
      <span class="place-type" style="border-color:${meta.color}">${meta.label}</span>
      <h2>${escapeHtml(pin.title)}</h2>
      ${reviewsHtml}
      <button type="button" class="btn btn-primary btn-sm" id="btn-add-review">+ Review</button>
    </div>`;

  document.getElementById("btn-add-review").onclick = () => openReviewModal(pin);
  renderPinList();
}

function showPinList() {
  selectedPinId = null;
  els.pinsDetailView.hidden = true;
  els.pinsListView.hidden = false;
  renderPinList();
}

function onMapClick(e) {
  if (!dropMode) return;
  setDropMode(false);
  openNewPinModal(e.latlng);
}

function openNewPinModal(latlng) {
  const form = els.formNewPin;
  form.lat.value = latlng.lat;
  form.lng.value = latlng.lng;
  form.title.value = "";
  form.photo.value = "";
  els.photoPreview.hidden = true;
  els.modalNewPin.showModal();
  form.title.focus();
}

function openReviewModal(pin) {
  els.formReview.pinId.value = pin.id;
  document.getElementById("review-pin-title").textContent = pin.title;
  els.formReview.body.value = "";
  const anonDefault = appSettings?.anonymousByDefault ?? true;
  els.formReview.isAnonymous.checked = anonDefault;
  document.getElementById("display-name-wrap").hidden = anonDefault;
  selectedRating = 0;
  updateStarPicker();
  els.modalReview.showModal();
}

function updateStarPicker() {
  document.querySelectorAll("#star-picker button").forEach((btn) => {
    btn.classList.toggle("active", Number(btn.dataset.rating) <= selectedRating);
  });
  els.formReview.rating.value = selectedRating || "";
}

async function refreshHeatmap() {
  const points = await api("/api/heatmap");
  if (heatLayer) map.removeLayer(heatLayer);
  heatLayer = null;
  const layerHeat = document.getElementById("layer-heatmap");
  document.getElementById("legend-heatmap").hidden = !layerHeat?.checked;
  if (!layerHeat?.checked || !points.length) return;

  const visible = new Set(getVisiblePins().map((p) => `${p.lat},${p.lng}`));
  const filtered = points.filter((pt) => visible.has(`${pt[0]},${pt[1]}`));
  heatLayer = L.heatLayer(filtered.length ? filtered : points, {
    radius: 35,
    blur: 28,
    maxZoom: 12,
    gradient: { 0.2: "#86efac", 0.5: "#fbbf24", 0.8: "#fb923c", 1.0: "#ef4444" },
  }).addTo(map);
}

function setDropMode(on) {
  if (on && lassoMode) setLassoMode(false);
  dropMode = on;
  els.mapHint.hidden = !on;
  els.mapHint.textContent = "Tap the map to place your pin";
  document.getElementById("btn-drop-mode").classList.toggle("active", on);
  if (!lassoMode) map.getContainer().style.cursor = on ? "crosshair" : "";
}

function setLassoMode(on) {
  if (on && dropMode) setDropMode(false);
  if (!on && WandrLasso.active) WandrLasso.stop();
  lassoMode = on;
  els.btnLassoRegion.classList.toggle("active", on);
  if (on) {
    els.mapHint.hidden = false;
    els.mapHint.textContent = "Draw around the area you want — release to finish";
    WandrLasso.start();
  } else {
    WandrLasso.stop();
    if (!dropMode) {
      els.mapHint.hidden = true;
      map.getContainer().style.cursor = "";
    }
  }
}

const travelIcon = L.divIcon({
  className: "travel-centre-icon",
  html: '<div class="travel-centre-dot"></div>',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

function ensureTravelMarker(latlng) {
  if (!travelCentreMarker) {
    travelCentreMarker = L.marker(latlng, {
      draggable: true,
      icon: travelIcon,
      zIndexOffset: 1000,
    }).addTo(map);
    travelCentreMarker.bindTooltip("Drag me — travel start", { permanent: false, direction: "top" });
    travelCentreMarker.on("drag", updateTravelCircle);
    travelCentreMarker.on("dragend", updateTravelCircle);
  } else {
    travelCentreMarker.setLatLng(latlng);
  }
}

function removeTravelTools() {
  if (travelCircle) {
    map.removeLayer(travelCircle);
    travelCircle = null;
  }
  if (travelCentreMarker) {
    map.removeLayer(travelCentreMarker);
    travelCentreMarker = null;
  }
}

function updateTravelCircle() {
  if (!document.getElementById("layer-travel-radius").checked) return;
  if (!travelCentreMarker) {
    ensureTravelMarker(map.getCenter());
  }
  const centre = travelCentreMarker.getLatLng();
  const hours = Number(document.getElementById("travel-hours").value);
  const speed = appSettings?.trainSpeedKmh ?? 80;
  const km = hours * speed;
  if (travelCircle) map.removeLayer(travelCircle);
  travelCircle = L.circle(centre, {
    radius: km * 1000,
    color: "#ff6b2c",
    fillColor: "#ff6b2c",
    fillOpacity: 0.1,
    weight: 2,
    dashArray: "6 6",
  }).addTo(map);
  travelCircle.bindPopup(`${formatDistance(km)} in ${hours}h by train`);
}

async function loadStationsIfEnabled() {
  if (!document.getElementById("layer-stations").checked) return;
  const b = map.getBounds();
  const query = `[out:json][timeout:20];node["railway"="station"](${b.getSouth()},${b.getWest()},${b.getNorth()},${b.getEast()});out body 40;`;
  try {
    const res = await fetch("https://overpass-api.de/api/interpreter", { method: "POST", body: query });
    const data = await res.json();
    if (stationsLayer) map.removeLayer(stationsLayer);
    stationsLayer = L.layerGroup();
    (data.elements || []).forEach((el) => {
      if (!el.lat) return;
      const m = L.circleMarker([el.lat, el.lon], {
        radius: 4,
        color: "#0ea5e9",
        fillColor: "#7dd3fc",
        fillOpacity: 0.9,
        weight: 1,
      });
      m.bindPopup(escapeHtml(el.tags?.name || "Station"));
      stationsLayer.addLayer(m);
    });
    stationsLayer.addTo(map);
  } catch { /* ignore */ }
}

async function toggleInterrail(show) {
  await loadInterrailLayer();
  document.getElementById("legend-interrail").hidden = !show;
  if (show) interrailLayer.addTo(map);
  else map.removeLayer(interrailLayer);
}

async function toggleCountries(show) {
  if (!show && countriesMapLayer) {
    map.removeLayer(countriesMapLayer);
    return;
  }
  if (!countriesMapLayer) {
    countriesMapLayer = await WandrCountries.initCountriesLayer(map);
  }
  countriesMapLayer.addTo(map);
  WandrCountries.refreshCountriesStyle();
}

function renderCountryLists() {
  const container = document.getElementById("country-summary-tools");
  if (!container) return;
  const visited = WandrCountries.listCountriesByStatus("visited");
  const wanted = WandrCountries.listCountriesByStatus("wanted");
  const chips = (codes) => codes.map((c) => `<span class="chip">${c}</span>`).join("") || "—";
  container.innerHTML = `
    <p><em>Visited</em> ${chips(visited)}</p>
    <p><em>Want</em> ${chips(wanted)}</p>`;
}

function openCountryModal(code, name) {
  pendingCountryCode = code;
  document.getElementById("country-modal-name").textContent = name;
  els.modalCountry.showModal();
}

async function loadPhotoOfDay() {
  try {
    const photo = await api("/api/photo-of-day");
    els.photoEmpty.hidden = true;
    els.btnPhotoDay.hidden = false;
    els.photoThumb.src = photo.photoUrl;
    els.photoThumb.alt = photo.title;
    els.photoTitle.textContent = photo.title;
    els.btnPhotoDay.onclick = () => {
      map.setView([photo.lat, photo.lng], 14, { animate: true });
      if (markers[photo.pinId]) selectPin(photo.pinId);
    };
  } catch {
    els.photoEmpty.hidden = false;
    els.btnPhotoDay.hidden = true;
  }
}

function initPinsDrawer() {
  els.pinsDrawerTrigger?.addEventListener("click", togglePinsDrawer);
}

function initToolsPanel() {
  els.btnTools?.addEventListener("click", () => {
    const willOpen = els.toolsPanel.hidden;
    if (willOpen) {
      els.toolsPanel.hidden = false;
      requestAnimationFrame(() => els.toolsPanel.classList.add("open"));
    } else {
      els.toolsPanel.classList.remove("open");
      els.toolsPanel.addEventListener(
        "transitionend",
        () => {
          if (!els.toolsPanel.classList.contains("open")) els.toolsPanel.hidden = true;
        },
        { once: true }
      );
    }
    els.btnTools.setAttribute("aria-expanded", willOpen ? "true" : "false");
    els.btnTools.classList.toggle("active", willOpen);
  });
}

function wireEvents() {
  document.getElementById("btn-drop-mode").onclick = () => setDropMode(!dropMode);
  document.getElementById("btn-back-list").onclick = showPinList;
  document.getElementById("btn-cancel-pin").onclick = () => els.modalNewPin.close();
  document.getElementById("btn-cancel-review").onclick = () => els.modalReview.close();
  document.getElementById("btn-close-country").onclick = () => els.modalCountry.close();

  document.querySelectorAll("#form-country [data-status]").forEach((btn) => {
    btn.onclick = () => {
      if (!pendingCountryCode) return;
      WandrCountries.setCountryStatus(pendingCountryCode, btn.dataset.status || null);
      WandrCountries.refreshCountriesStyle();
      renderCountryLists();
      els.modalCountry.close();
    };
  });
  window.onCountryClick = openCountryModal;

  els.btnToggleCommunity.onclick = () => {
    showCommunityPins = !showCommunityPins;
    WandrSettings.save({ showCommunityPins });
    updateCommunityButton();
    renderMarkers();
    renderPinList();
  };

  els.btnLassoRegion.onclick = () => setLassoMode(!lassoMode);

  els.btnClearRegion.onclick = () => {
    WandrLasso.clear();
    setLassoMode(false);
    updateRegionStatus();
    renderMarkers();
    renderPinList();
    refreshHeatmap();
  };

  els.formNewPin.photo.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) {
      els.photoPreview.hidden = true;
      return;
    }
    els.photoPreview.src = URL.createObjectURL(file);
    els.photoPreview.hidden = false;
  };

  els.formNewPin.onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(els.formNewPin);
    try {
      const res = await fetch("/api/pins", { method: "POST", body: fd });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create pin");
      }
      const pin = await res.json();
      els.modalNewPin.close();
      setTypeFilterOn(normalizeType(pin.placeType), true);
      await loadPins();
      await loadPhotoOfDay();
      selectPin(pin.id);
      openReviewModal(pin);
    } catch (err) {
      alert(err.message);
    }
  };

  els.formReview.onsubmit = async (e) => {
    e.preventDefault();
    if (!selectedRating) return alert("Pick a rating");
    const fd = new FormData(els.formReview);
    try {
      const pinId = fd.get("pinId");
      await api(`/api/pins/${pinId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating: selectedRating,
          priceTier: Number(fd.get("priceTier")),
          body: fd.get("body"),
          isAnonymous: fd.get("isAnonymous") === "on",
          displayName: fd.get("displayName"),
        }),
      });
      els.modalReview.close();
      await loadPins();
      selectPin(pinId);
    } catch (err) {
      alert(err.message);
    }
  };

  document.querySelectorAll("#star-picker button").forEach((btn) => {
    btn.onclick = () => {
      selectedRating = Number(btn.dataset.rating);
      updateStarPicker();
    };
  });

  document.getElementById("review-anonymous").onchange = (e) => {
    document.getElementById("display-name-wrap").hidden = e.target.checked;
  };

  document.getElementById("layer-trains").onchange = (e) => {
    if (e.target.checked) trainLayer.addTo(map);
    else map.removeLayer(trainLayer);
  };
  document.getElementById("layer-interrail").onchange = (e) => toggleInterrail(e.target.checked);
  document.getElementById("layer-stations").onchange = (e) => {
    if (e.target.checked) loadStationsIfEnabled();
    else if (stationsLayer) map.removeLayer(stationsLayer);
  };
  document.getElementById("layer-heatmap").onchange = () => refreshHeatmap();
  document.getElementById("layer-countries").onchange = (e) => toggleCountries(e.target.checked);

  document.getElementById("layer-travel-radius").onchange = (e) => {
    document.getElementById("travel-radius-controls").hidden = !e.target.checked;
    if (e.target.checked) {
      ensureTravelMarker(map.getCenter());
      updateTravelCircle();
    } else {
      removeTravelTools();
    }
  };

  document.getElementById("travel-hours").oninput = (e) => {
    document.getElementById("travel-hours-out").textContent = `${e.target.value} h`;
    updateTravelCircle();
  };

  document.getElementById("route-filter").onchange = (e) => {
    routeFilter = e.target.value;
    renderMarkers();
    renderPinList();
    refreshHeatmap();
  };

  document.getElementById("btn-locate").onclick = () => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        const ll = L.latLng(pos.coords.latitude, pos.coords.longitude);
        map.setView(ll, 13);
        if (document.getElementById("layer-travel-radius").checked) {
          ensureTravelMarker(ll);
          updateTravelCircle();
        }
      },
      () => alert("Could not get location")
    );
  };
}

async function init() {
  cacheElements();
  initMap();
  initPinsDrawer();
  initToolsPanel();
  renderLegendDots();
  wireEvents();
  applyAppSettings(WandrSettings.load());
  window.addEventListener("wandr:settings", (e) => applyAppSettings(e.detail));
  window.addEventListener("wandr:cleared-local", () => {
    WandrLasso.clear();
    updateRegionStatus();
    renderMarkers();
    renderPinList();
    renderCountryLists();
  });
  updateRegionStatus();
  await loadPins();
  await loadPhotoOfDay();
  renderCountryLists();
}

init();
