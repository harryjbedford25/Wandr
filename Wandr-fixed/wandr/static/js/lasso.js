/* Freehand lasso region selection for Leaflet */

const WandrLasso = {
  map: null,
  polygon: null,
  fillLayer: null,
  trailLayer: null,
  active: false,
  drawing: false,
  points: [],
  onComplete: null,
  onClear: null,

  init(map, callbacks = {}) {
    this.map = map;
    this.onComplete = callbacks.onComplete;
    this.onClear = callbacks.onClear;
    this._onMouseDown = this._handleMouseDown.bind(this);
    this._onMouseMove = this._handleMouseMove.bind(this);
    this._onMouseUp = this._handleMouseUp.bind(this);
  },

  hasSelection() {
    return this.polygon && this.polygon.length >= 3;
  },

  contains(lat, lng) {
    if (!this.hasSelection()) return true;
    return this._pointInPolygon(lat, lng, this.polygon);
  },

  start() {
    if (this.active) return;
    this.active = true;
    this.drawing = false;
    this.map.getContainer().classList.add("lasso-mode");
    this.map.dragging.disable();
    this.map.doubleClickZoom.disable();
    const c = this.map.getContainer();
    c.addEventListener("mousedown", this._onMouseDown);
    c.addEventListener("touchstart", this._onMouseDown, { passive: false });
  },

  stop() {
    if (!this.active) return;
    this.active = false;
    this.drawing = false;
    this.points = [];
    this._removeTrail();
    this.map.getContainer().classList.remove("lasso-mode");
    this.map.dragging.enable();
    this.map.doubleClickZoom.enable();
    const c = this.map.getContainer();
    c.removeEventListener("mousedown", this._onMouseDown);
    c.removeEventListener("touchstart", this._onMouseDown);
    document.removeEventListener("mousemove", this._onMouseMove);
    document.removeEventListener("mouseup", this._onMouseUp);
    document.removeEventListener("touchmove", this._onMouseMove);
    document.removeEventListener("touchend", this._onMouseUp);
  },

  clear() {
    this.polygon = null;
    if (this.fillLayer) {
      this.map.removeLayer(this.fillLayer);
      this.fillLayer = null;
    }
    if (this.onClear) this.onClear();
  },

  toggle() {
    if (this.active) this.stop();
    else this.start();
  },

  _latLngFromEvent(e) {
    const ev = e.touches ? e.touches[0] : e;
    const rect = this.map.getContainer().getBoundingClientRect();
    const x = ev.clientX - rect.left;
    const y = ev.clientY - rect.top;
    return this.map.containerPointToLatLng([x, y]);
  },

  _handleMouseDown(e) {
    if (!this.active || e.button === 2) return;
    if (e.target.closest?.(".leaflet-control, .glass-map-tools, .glass-pins-drawer, .glass-tools-panel, .map-legend-stack")) return;
    e.preventDefault();
    if (this.fillLayer) {
      this.map.removeLayer(this.fillLayer);
      this.fillLayer = null;
      this.polygon = null;
    }
    this.drawing = true;
    this.points = [];
    this._removeTrail();
    document.addEventListener("mousemove", this._onMouseMove);
    document.addEventListener("mouseup", this._onMouseUp);
    document.addEventListener("touchmove", this._onMouseMove, { passive: false });
    document.addEventListener("touchend", this._onMouseUp);
    const ll = this._latLngFromEvent(e);
    this.points.push([ll.lat, ll.lng]);
  },

  _handleMouseMove(e) {
    if (!this.drawing) return;
    e.preventDefault?.();
    const ll = this._latLngFromEvent(e);
    const last = this.points[this.points.length - 1];
    if (last && Math.abs(last[0] - ll.lat) + Math.abs(last[1] - ll.lng) < 0.0003) return;
    this.points.push([ll.lat, ll.lng]);
    this._drawTrail();
  },

  _handleMouseUp(e) {
    if (!this.drawing) return;
    this.drawing = false;
    document.removeEventListener("mousemove", this._onMouseMove);
    document.removeEventListener("mouseup", this._onMouseUp);
    document.removeEventListener("touchmove", this._onMouseMove);
    document.removeEventListener("touchend", this._onMouseUp);
    this._removeTrail();

    const simplified = this._simplify(this.points);
    if (simplified.length < 3) {
      this.points = [];
      return;
    }
    this.polygon = simplified;
    this._drawFill();
    this.stop();
    if (this.onComplete) this.onComplete(this.polygon);
  },

  _simplify(points) {
    if (points.length <= 48) return points;
    const step = Math.ceil(points.length / 48);
    const out = points.filter((_, i) => i % step === 0);
    if (out[out.length - 1] !== points[points.length - 1]) {
      out.push(points[points.length - 1]);
    }
    return out;
  },

  _drawTrail() {
    this._removeTrail();
    if (this.points.length < 2) return;
    const latlngs = this.points.map(([lat, lng]) => [lat, lng]);
    this.trailLayer = L.polyline(latlngs, {
      color: "#ff6b2c",
      weight: 3,
      opacity: 0.9,
      dashArray: "6 4",
    }).addTo(this.map);
  },

  _drawFill() {
    if (this.fillLayer) this.map.removeLayer(this.fillLayer);
    const latlngs = this.polygon.map(([lat, lng]) => [lat, lng]);
    this.fillLayer = L.polygon(latlngs, {
      color: "#ff6b2c",
      weight: 2,
      fillColor: "#ff6b2c",
      fillOpacity: 0.15,
      dashArray: "4 6",
    }).addTo(this.map);
  },

  _removeTrail() {
    if (this.trailLayer) {
      this.map.removeLayer(this.trailLayer);
      this.trailLayer = null;
    }
  },

  _pointInPolygon(lat, lng, polygon) {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const [latI, lngI] = polygon[i];
      const [latJ, lngJ] = polygon[j];
      const intersect =
        lngI > lng !== lngJ > lng &&
        lat < ((latJ - latI) * (lng - lngI)) / (lngJ - lngI) + latI;
      if (intersect) inside = !inside;
    }
    return inside;
  },
};
