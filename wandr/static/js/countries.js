/* Country visited / wanted overlay — stored in localStorage */

const COUNTRY_STORAGE_KEY = "wandr:countries";
const GEOJSON_URL =
  "https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json";

let countriesLayer = null;
let countriesGeo = null;

function loadCountryState() {
  try {
    return JSON.parse(localStorage.getItem(COUNTRY_STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveCountryState(state) {
  localStorage.setItem(COUNTRY_STORAGE_KEY, JSON.stringify(state));
}

function getCountryStatus(code) {
  const state = loadCountryState();
  return state[code] || null;
}

function setCountryStatus(code, status) {
  const state = loadCountryState();
  if (!status) delete state[code];
  else state[code] = status;
  saveCountryState(state);
}

function countryStyle(feature) {
  const code = feature.id;
  const status = getCountryStatus(code);
  if (status === "visited") {
    return { fillColor: "#22c55e", fillOpacity: 0.45, color: "#15803d", weight: 1 };
  }
  if (status === "wanted") {
    return { fillColor: "#ff6b2c", fillOpacity: 0.35, color: "#c2410c", weight: 1 };
  }
  return { fillColor: "#f5ebe0", fillOpacity: 0.15, color: "#d6d3d1", weight: 0.5 };
}

async function ensureCountriesGeo() {
  if (countriesGeo) return countriesGeo;
  const res = await fetch(GEOJSON_URL);
  countriesGeo = await res.json();
  return countriesGeo;
}

async function initCountriesLayer(map) {
  const geo = await ensureCountriesGeo();
  countriesLayer = L.geoJSON(geo, {
    style: countryStyle,
    onEachFeature: (feature, layer) => {
      const name = feature.properties.name;
      const code = feature.id;
      layer.bindPopup(`<strong>${name}</strong><br/><small>${code}</small>`);
      layer.on("click", () => {
        if (typeof window.onCountryClick === "function") {
          window.onCountryClick(code, name);
        }
      });
    },
  });
  return countriesLayer;
}

function refreshCountriesStyle() {
  if (!countriesLayer) return;
  countriesLayer.eachLayer((layer) => {
    layer.setStyle(countryStyle(layer.feature));
  });
}

function listCountriesByStatus(status) {
  const state = loadCountryState();
  return Object.entries(state)
    .filter(([, s]) => s === status)
    .map(([code]) => code);
}

window.WandrCountries = {
  initCountriesLayer,
  refreshCountriesStyle,
  getCountryStatus,
  setCountryStatus,
  listCountriesByStatus,
  loadCountryState,
};
