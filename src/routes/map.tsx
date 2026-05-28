import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient, useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowLeft, ChevronDown, ExternalLink, Loader2, MapPin, Plus, Star, Train, X } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { listPins, createPin } from "@/lib/pins.functions";
import { PLACE_TYPES, placeMeta, priceLabel, stars, type PlaceType } from "@/lib/place-types";
import type { Pin } from "@/lib/place-types";

const pinsQuery = queryOptions({ queryKey: ["pins"], queryFn: () => listPins() });

const RAIL_TILE      = "https://{s}.tiles.openrailwaymap.org/standard/{z}/{x}/{y}.png";
const TRANSPORT_TILE = "https://tile.memomaps.de/tilegen/{z}/{x}/{y}.png";
const OVERPASS_API   = "https://overpass-api.de/api/interpreter";

// POI types to fetch from Overpass, each with display config
const TRANSPORT_POIS = [
  { key: "bus",   label: "Bus stops",      query: `node["highway"="bus_stop"]`,          color: "#2563eb", fill: "#60a5fa" },
  { key: "tram",  label: "Tram stops",     query: `node["railway"="tram_stop"]`,          color: "#7c3aed", fill: "#a78bfa" },
  { key: "metro", label: "Metro stations", query: `node["station"="subway"]`,             color: "#dc2626", fill: "#f87171" },
  { key: "ferry", label: "Ferry terminals", query: `node["amenity"="ferry_terminal"]`,    color: "#0891b2", fill: "#67e8f9" },
] as const;

type PoiKey = typeof TRANSPORT_POIS[number]["key"];

export const Route = createFileRoute("/map")({
  head: () => ({
    meta: [
      { title: "Map — WANDR" },
      { name: "description", content: "Honest travel pins on a clean train-friendly map." },
    ],
    links: [
      { rel: "stylesheet", href: "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(pinsQuery),
  component: MapPage,
});

function MapPage() {
  const { data: pins } = useSuspenseQuery(pinsQuery);
  const [dropMode, setDropMode] = useState(false);
  const [draft, setDraft] = useState<{ lat: number; lng: number } | null>(null);
  const [showPins, setShowPins] = useState(true);
  const [focusPin, setFocusPin] = useState<{ lat: number; lng: number; id: string; t: number } | null>(null);
  const [selectedPin, setSelectedPin] = useState<typeof pins[number] | null>(null);

  // Public transport master toggle + sub-toggles
  const [transportOpen, setTransportOpen] = useState(false);
  const [transportLayerOn, setTransportLayerOn] = useState(false);
  const [trainLayerOn, setTrainLayerOn] = useState(false);
  const [poiToggles, setPoiToggles] = useState<Record<PoiKey, boolean>>({
    bus: false, tram: false, metro: false, ferry: false,
  });
  const [loadingPois, setLoadingPois] = useState<Set<PoiKey>>(new Set());

  // Opening the dropdown auto-enables the transport tile overlay
  function handleTransportToggle() {
    const next = !transportOpen;
    setTransportOpen(next);
    if (next) setTransportLayerOn(true);
    else {
      setTransportLayerOn(false);
      setTrainLayerOn(false);
      setPoiToggles({ bus: false, tram: false, metro: false, ferry: false });
    }
  }

  function togglePoi(key: PoiKey) {
    setPoiToggles((p) => ({ ...p, [key]: !p[key] }));
  }

  return (
    <PageShell>
      <section className="mt-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-4xl sm:text-5xl">Map</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {pins.length} pin{pins.length === 1 ? "" : "s"} from the community.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm transition-colors hover:bg-muted">
              <input
                type="checkbox"
                checked={showPins}
                onChange={(e) => setShowPins(e.target.checked)}
                className="accent-foreground"
              />
              Show pins
            </label>

            {/* Public transport master button */}
            <button
              onClick={handleTransportToggle}
              aria-expanded={transportOpen}
              className={
                "inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors " +
                (transportOpen
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-background text-foreground hover:bg-muted")
              }
            >
              <Train className="h-3.5 w-3.5" />
              Transport
              <ChevronDown className={"h-3.5 w-3.5 transition-transform duration-200 " + (transportOpen ? "rotate-180" : "")} />
            </button>

            <button
              onClick={() => setDropMode((d) => !d)}
              className={
                "inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors " +
                (dropMode ? "border border-border bg-muted" : "bg-primary text-primary-foreground")
              }
            >
              {dropMode ? <><X className="h-4 w-4" /> Cancel</> : <><Plus className="h-4 w-4" /> Pin a place</>}
            </button>
          </div>
        </div>

        {/* Transport sub-panel */}
        {transportOpen && (
          <div className="mt-2 rounded-md border border-border bg-card shadow-sm">
            {/* Section: Tile overlays */}
            <div className="px-4 py-3">
              <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Map overlays
              </p>
              <div className="flex flex-wrap gap-2">
                <label className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-sm transition-colors hover:bg-muted has-[:checked]:border-foreground has-[:checked]:bg-foreground has-[:checked]:text-background">
                  <input type="checkbox" checked={trainLayerOn} onChange={(e) => setTrainLayerOn(e.target.checked)} className="sr-only" />
                  <span className="inline-block h-2 w-2 rounded-full bg-orange-400" />
                  Train lines
                </label>
                <label className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-sm transition-colors hover:bg-muted has-[:checked]:border-foreground has-[:checked]:bg-foreground has-[:checked]:text-background">
                  <input type="checkbox" checked={transportLayerOn} onChange={(e) => setTransportLayerOn(e.target.checked)} className="sr-only" />
                  <span className="inline-block h-2 w-2 rounded-full bg-sky-400" />
                  Transit routes
                </label>
              </div>
            </div>

            <div className="mx-4 border-t border-border" />

            {/* Section: POI stops */}
            <div className="px-4 py-3">
              <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Stops &amp; stations
              </p>
              <div className="flex flex-wrap gap-2">
                {TRANSPORT_POIS.map(({ key, label, fill, color }) => (
                  <label
                    key={key}
                    className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-sm transition-colors hover:bg-muted has-[:checked]:border-foreground has-[:checked]:bg-foreground has-[:checked]:text-background"
                  >
                    <input
                      type="checkbox"
                      checked={poiToggles[key]}
                      onChange={() => togglePoi(key)}
                      className="sr-only"
                    />
                    {loadingPois.has(key) ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <span
                        className="inline-block h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-white/30"
                        style={{ background: fill }}
                      />
                    )}
                    {label}
                  </label>
                ))}
              </div>
              <p className="mt-2.5 text-[11px] text-muted-foreground">
                Fetches live data from OpenStreetMap for the selected types.
              </p>
            </div>
          </div>
        )}

        {dropMode && (
          <div className="mt-3 rounded-md border border-foreground/20 bg-muted px-4 py-2 text-sm">
            Click the map to place your pin.
          </div>
        )}

        <div className="relative mt-4 grid gap-4 lg:grid-cols-[1fr_300px]">
          <div className="isolate overflow-hidden rounded-md border border-border">
            <LeafletMap
              pins={pins}
              dropMode={dropMode}
              trainLayerOn={trainLayerOn}
              transportLayerOn={transportLayerOn}
              poiToggles={poiToggles}
              showPins={showPins}
              focusPin={focusPin}
              onDrop={(latlng) => { setDropMode(false); setDraft(latlng); }}
              onSavePoiAsPin={(latlng) => setDraft(latlng)}
            />
          </div>
          <aside className="relative z-10 flex flex-col rounded-md border border-border bg-card overflow-hidden">
            {selectedPin ? (
              <PinSidebar
                pin={selectedPin}
                allPins={pins}
                onClose={() => setSelectedPin(null)}
                onSelectPin={(p) => { setFocusPin({ lat: p.lat, lng: p.lng, id: p.id, t: Date.now() }); setSelectedPin(p); }}
              />
            ) : (
              <>
                <div className="border-b border-border px-4 py-3">
                  <h2 className="text-sm font-semibold tracking-wide">All pins</h2>
                  <p className="text-xs text-muted-foreground">Click a pin to explore</p>
                </div>
                <ul className="max-h-[60vh] divide-y divide-border overflow-y-auto">
                  {pins.length === 0 && (
                    <li className="px-4 py-6 text-sm text-muted-foreground">No pins yet.</li>
                  )}
                  {pins.map((p) => (
                    <li key={p.id}>
                      <button
                        onClick={() => { setFocusPin({ lat: p.lat, lng: p.lng, id: p.id, t: Date.now() }); setSelectedPin(p); }}
                        className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted"
                      >
                        <div
                          className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ background: PLACE_TYPES[(p.placeType in PLACE_TYPES ? p.placeType : "spot") as PlaceType].mapColor }}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">{p.title}</div>
                          <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                            {PLACE_TYPES[(p.placeType in PLACE_TYPES ? p.placeType : "spot") as PlaceType].label}
                            {" · "}
                            {p.lat.toFixed(2)}°, {p.lng.toFixed(2)}°
                          </div>
                        </div>
                        {p.avgRating && (
                          <span className="shrink-0 text-xs text-muted-foreground">★ {p.avgRating}</span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </aside>
        </div>
      </section>

      {draft && <NewPinModal lat={draft.lat} lng={draft.lng} onClose={() => setDraft(null)} />}
    </PageShell>
  );
}

// ── LeafletMap ────────────────────────────────────────────────────────────────

function LeafletMap({
  pins,
  dropMode,
  trainLayerOn,
  transportLayerOn,
  poiToggles,
  showPins,
  focusPin,
  onDrop,
  onSavePoiAsPin,
  onPoiLoadingChange,
  onSelectPin,
}: {
  pins: Pin[];
  dropMode: boolean;
  trainLayerOn: boolean;
  transportLayerOn: boolean;
  poiToggles: Record<PoiKey, boolean>;
  showPins: boolean;
  focusPin: { lat: number; lng: number; id: string; t: number } | null;
  onDrop: (latlng: { lat: number; lng: number }) => void;
  onSavePoiAsPin: (latlng: { lat: number; lng: number }) => void;
  onPoiLoadingChange: (updater: (prev: Set<PoiKey>) => Set<PoiKey>) => void;
  onSelectPin: (pin: import("@/lib/place-types").Pin) => void;
}) {
  const containerRef    = useRef<HTMLDivElement>(null);
  const mapRef          = useRef<any>(null);
  const trainRef        = useRef<any>(null);
  const transportRef    = useRef<any>(null);
  const poiLayersRef    = useRef<Partial<Record<PoiKey, any>>>({});
  const markersRef      = useRef<Record<string, any>>({});
  const mapReadyRef     = useRef(false);

  // Prop refs — read inside async callbacks without triggering effect re-runs
  const dropModeRef        = useRef(dropMode);        dropModeRef.current        = dropMode;
  const onDropRef          = useRef(onDrop);          onDropRef.current          = onDrop;
  const onSavePoiAsPinRef  = useRef(onSavePoiAsPin);  onSavePoiAsPinRef.current  = onSavePoiAsPin;
  const onPoiLoadingChangeRef = useRef(onPoiLoadingChange); onPoiLoadingChangeRef.current = onPoiLoadingChange;
  const onSelectPinRef = useRef(onSelectPin); onSelectPinRef.current = onSelectPin;
  const pinsRef            = useRef(pins);            pinsRef.current            = pins;
  const showPinsRef        = useRef(showPins);        showPinsRef.current        = showPins;
  const trainLayerOnRef    = useRef(trainLayerOn);    trainLayerOnRef.current    = trainLayerOn;
  const transportLayerOnRef = useRef(transportLayerOn); transportLayerOnRef.current = transportLayerOn;

  // Stable marker renderer — always reads latest pins/showPins via refs
  const doRenderMarkers = useRef<((L: any) => void) | null>(null);
  doRenderMarkers.current = (L: any) => {
    if (!mapRef.current) return;
    Object.values(markersRef.current).forEach((m: any) => mapRef.current.removeLayer(m));
    markersRef.current = {};
    if (!showPinsRef.current) return;
    pinsRef.current.forEach((pin) => {
      const pinMeta = PLACE_TYPES[(pin.placeType in PLACE_TYPES ? pin.placeType : "spot") as PlaceType];
      const marker = L.circleMarker([pin.lat, pin.lng], {
        radius: pin.photoUrl ? 9 : 7,
        color: "#ffffff",
        weight: 2,
        fillColor: pinMeta.mapColor,
        fillOpacity: 1,
        pane: "markerPane",
      });
      const photo = pin.photoUrl
        ? `<img src="${escapeHtml(pin.photoUrl)}" style="width:100%;height:100px;object-fit:cover;border-radius:4px;margin-bottom:6px;" />`
        : "";
      const ratingText = pin.avgRating ? `★ ${pin.avgRating}` : "No reviews";
      marker.bindPopup(
        `<div style="font-family:Inter,sans-serif;min-width:160px">
          ${photo}
          <strong style="display:block;margin-bottom:4px">${escapeHtml(pin.title)}</strong>
          <span style="display:inline-flex;align-items:center;gap:4px;font-size:11px;color:#666;margin-bottom:4px;">
            <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${pinMeta.mapColor};flex-shrink:0;"></span>
            ${escapeHtml(pinMeta.label)}
          </span><br/>
          <span style="font-size:12px;color:#666">${ratingText}</span><br/>
          <a href="/pins/${pin.id}" style="font-size:12px;color:#000;text-decoration:underline">Open →</a>
        </div>`,
      );
      marker.on("click", () => onSelectPinRef.current(pin));
      marker.addTo(mapRef.current);
      markersRef.current[pin.id] = marker;
    });
  };

  // ── Init map once ─────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current || mapRef.current) return;

      const map = L.map(containerRef.current, { zoomControl: true }).setView([48.5, 10], 5);

      // Custom panes — explicit z-indices, deterministic stacking
      map.createPane("railPane").style.zIndex       = "210";
      map.createPane("transportPane").style.zIndex  = "220";
      map.createPane("poiPane").style.zIndex        = "230";
      map.createPane("labelsPane").style.zIndex     = "240";
      // Overlay panes must not capture pointer events
      for (const p of ["railPane", "transportPane", "poiPane", "labelsPane"]) {
        (map.getPane(p) as HTMLElement).style.pointerEvents = "none";
      }

      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png",
        { attribution: "© OSM © CARTO", maxZoom: 19 },
      ).addTo(map);

      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png",
        { maxZoom: 19, pane: "labelsPane" },
      ).addTo(map);

      map.on("click", (e: any) => {
        if (dropModeRef.current) onDropRef.current({ lat: e.latlng.lat, lng: e.latlng.lng });
      });

      mapRef.current = map;
      map.getContainer().style.cursor = dropModeRef.current ? "crosshair" : "";

      if (trainLayerOnRef.current) {
        trainRef.current = L.tileLayer(RAIL_TILE, {
          attribution: "Trains © OpenRailwayMap",
          subdomains: "abc",
          maxZoom: 19,
          maxNativeZoom: 19,
          opacity: 0.9,
          pane: "railPane",
        } as any).addTo(map);
      }

      if (transportLayerOnRef.current) {
        transportRef.current = L.tileLayer(TRANSPORT_TILE, {
          attribution: '© <a href="https://memomaps.de">MeMoMaps</a> © OSM',
          maxZoom: 17,
          maxNativeZoom: 17,
          opacity: 0.75,
          pane: "transportPane",
        } as any).addTo(map);
      }

      doRenderMarkers.current!(L);
      mapReadyRef.current = true;
    })();
    return () => {
      cancelled = true;
      mapReadyRef.current = false;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        trainRef.current = null;
        transportRef.current = null;
        poiLayersRef.current = {};
        markersRef.current = {};
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Cursor ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.getContainer().style.cursor = dropMode ? "crosshair" : "";
  }, [dropMode]);

  // ── Train tile layer ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current) return;
    if (trainLayerOn && !trainRef.current) {
      import("leaflet").then(({ default: L }) => {
        if (!mapRef.current || trainRef.current) return;
        trainRef.current = L.tileLayer(RAIL_TILE, {
          attribution: "Trains © OpenRailwayMap",
          subdomains: "abc",
          maxZoom: 19,
          maxNativeZoom: 19,
          opacity: 0.9,
          pane: "railPane",
        } as any).addTo(mapRef.current);
      });
    } else if (!trainLayerOn && trainRef.current) {
      mapRef.current.removeLayer(trainRef.current);
      trainRef.current = null;
    }
  }, [trainLayerOn]);

  // ── Transport tile layer ──────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current) return;
    if (transportLayerOn && !transportRef.current) {
      import("leaflet").then(({ default: L }) => {
        if (!mapRef.current || transportRef.current) return;
        transportRef.current = L.tileLayer(TRANSPORT_TILE, {
          attribution: '© <a href="https://memomaps.de">MeMoMaps</a> © OSM',
          maxZoom: 17,
          maxNativeZoom: 17,
          opacity: 0.75,
          pane: "transportPane",
        } as any).addTo(mapRef.current);
      });
    } else if (!transportLayerOn && transportRef.current) {
      mapRef.current.removeLayer(transportRef.current);
      transportRef.current = null;
    }
  }, [transportLayerOn]);

  // ── POI marker layers (one effect per toggle key) ─────────────────────────
  // Using a single effect watching the whole poiToggles object — we diff inside.
  useEffect(() => {
    if (!mapReadyRef.current) return;

    import("leaflet").then(async ({ default: L }) => {
      if (!mapRef.current) return;

      for (const poi of TRANSPORT_POIS) {
        const on = poiToggles[poi.key];
        const existing = poiLayersRef.current[poi.key];

        if (on && !existing) {
          // Fetch from Overpass — viewport-independent world query, cached by Overpass
          onPoiLoadingChangeRef.current((prev) => { const next = new Set(prev); next.add(poi.key); return next; });
          const q = encodeURIComponent(
            `[out:json][timeout:25];${poi.query}(if:count_tags()>0);out body;`
          );
          let nodes: Array<{ lat: number; lon: number; tags: Record<string, string> }> = [];
          try {
            const res = await fetch(`${OVERPASS_API}?data=${q}`);
            const json = await res.json();
            nodes = json.elements ?? [];
          } catch {
            toast.error(`Couldn't load ${poi.label}`);
            onPoiLoadingChangeRef.current((prev) => { const next = new Set(prev); next.delete(poi.key); return next; });
            return;
          }
          onPoiLoadingChangeRef.current((prev) => { const next = new Set(prev); next.delete(poi.key); return next; });
          if (!mapRef.current) return;

          const group = L.layerGroup([], { pane: "poiPane" } as any);

          nodes.forEach((node) => {
            const name = node.tags?.name ?? node.tags?.ref ?? poi.label.replace(/s$/, "");
            const marker = L.circleMarker([node.lat, node.lon], {
              radius: 5,
              color: poi.color,
              weight: 1.5,
              fillColor: poi.fill,
              fillOpacity: 0.9,
              pane: "poiPane",
            } as any);

            // Popup with "Save as pin" button — uses a unique id per node
            const popupId = `poi-save-${node.lat}-${node.lon}`;
            marker.bindPopup(
              `<div style="font-family:Inter,sans-serif;min-width:140px">
                <strong style="display:block;margin-bottom:4px">${escapeHtml(name)}</strong>
                <span style="font-size:11px;color:#888;display:block;margin-bottom:8px">${poi.label.replace(/s$/, "")} · ${node.lat.toFixed(4)}°, ${node.lon.toFixed(4)}°</span>
                <button id="${popupId}" style="width:100%;padding:5px 0;background:#000;color:#fff;border:none;border-radius:4px;font-size:12px;cursor:pointer;">
                  + Save as pin
                </button>
              </div>`
            );

            // Wire the button after popup opens — popupopen fires on the marker
            marker.on("popupopen", () => {
              const btn = document.getElementById(popupId);
              if (btn) {
                btn.onclick = () => {
                  onSavePoiAsPinRef.current({ lat: node.lat, lng: node.lon });
                  marker.closePopup();
                };
              }
            });

            group.addLayer(marker);
          });

          group.addTo(mapRef.current);
          poiLayersRef.current[poi.key] = group;

        } else if (!on && existing) {
          mapRef.current.removeLayer(existing);
          delete poiLayersRef.current[poi.key];
        }
      }
    });
  }, [poiToggles]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Community pin markers ─────────────────────────────────────────────────
  useEffect(() => {
    if (!mapReadyRef.current) return;
    import("leaflet").then(({ default: L }) => doRenderMarkers.current!(L));
  }, [pins, showPins]);

  // ── Fly to focused pin ────────────────────────────────────────────────────
  useEffect(() => {
    if (!focusPin || !mapRef.current) return;
    mapRef.current.flyTo([focusPin.lat, focusPin.lng], Math.max(mapRef.current.getZoom(), 11), {
      duration: 0.8,
    });
    const tryOpen = () => markersRef.current[focusPin.id]?.openPopup();
    tryOpen();
    const t = setTimeout(tryOpen, 350);
    return () => clearTimeout(t);
  }, [focusPin]);

  return <div ref={containerRef} className="h-[70vh] min-h-[480px] w-full" />;
}

// ── PinSidebar ────────────────────────────────────────────────────────────────

function PinSidebar({
  pin,
  allPins,
  onClose,
  onSelectPin,
}: {
  pin: import("@/lib/place-types").Pin;
  allPins: import("@/lib/place-types").Pin[];
  onClose: () => void;
  onSelectPin: (p: import("@/lib/place-types").Pin) => void;
}) {
  const meta = placeMeta(pin.placeType);

  // Related pins — same category, excluding current
  const related = allPins
    .filter((p) => p.id !== pin.id && p.placeType === pin.placeType)
    .slice(0, 3);

  return (
    <div className="flex max-h-[60vh] flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
        <button
          onClick={onClose}
          className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Back to all pins"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <span className="flex-1 truncate text-sm font-semibold">{pin.title}</span>
        <Link
          to="/pins/$pinId"
          params={{ pinId: pin.id }}
          className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Open pin page"
        >
          <ExternalLink className="h-4 w-4" />
        </Link>
      </div>

      <div className="overflow-y-auto">
        {/* Photo */}
        {pin.photoUrl && (
          <div className="aspect-[16/9] w-full overflow-hidden">
            <img src={pin.photoUrl} alt={pin.title} className="h-full w-full object-cover" />
          </div>
        )}

        {/* Meta */}
        <div className="px-4 py-3">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-0.5 text-[11px] uppercase tracking-wider text-muted-foreground">
            <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: meta.color }} />
            {meta.label}
          </span>

          <div className="mt-2 flex items-center gap-3 text-sm">
            {pin.avgRating ? (
              <span className="inline-flex items-center gap-1">
                <Star className="h-3.5 w-3.5 fill-foreground text-foreground" />
                <strong>{pin.avgRating}</strong>
                <span className="text-muted-foreground">({pin.reviews.length})</span>
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">No reviews yet</span>
            )}
            {pin.avgPriceTier && (
              <span className="text-muted-foreground">{priceLabel(pin.avgPriceTier)}</span>
            )}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {pin.lat.toFixed(4)}°, {pin.lng.toFixed(4)}°
          </p>
        </div>

        {/* Reviews */}
        {pin.reviews.length > 0 && (
          <div className="border-t border-border px-4 py-3">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Reviews
            </p>
            <ul className="space-y-3">
              {pin.reviews.slice(0, 3).map((r) => (
                <li key={r.id} className="text-sm">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{stars(r.rating)}</span>
                    <span>{priceLabel(r.priceTier)}</span>
                    <span>·</span>
                    <span>{r.isAnonymous ? "Anonymous" : (r.displayName ?? "Traveller")}</span>
                  </div>
                  <p className="mt-0.5 text-[13px] leading-snug line-clamp-3">{r.body}</p>
                </li>
              ))}
            </ul>
            {pin.reviews.length > 3 && (
              <Link
                to="/pins/$pinId"
                params={{ pinId: pin.id }}
                className="mt-2 block text-xs text-muted-foreground underline-offset-2 hover:underline"
              >
                See all {pin.reviews.length} reviews →
              </Link>
            )}
          </div>
        )}

        {/* Related places */}
        {related.length > 0 && (
          <div className="border-t border-border px-4 py-3">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              More {meta.plural}
            </p>
            <ul className="space-y-1">
              {related.map((p) => (
                <li key={p.id}>
                  <button
                    onClick={() => onSelectPin(p)}
                    className="flex w-full items-center gap-2 rounded py-1 text-left text-sm transition-colors hover:text-foreground text-muted-foreground"
                  >
                    <MapPin className="h-3 w-3 shrink-0" />
                    <span className="truncate">{p.title}</span>
                    {p.avgRating && (
                      <span className="ml-auto shrink-0 text-xs">★ {p.avgRating}</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* CTA */}
        <div className="border-t border-border px-4 py-3">
          <Link
            to="/pins/$pinId"
            params={{ pinId: pin.id }}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Open full page <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!),
  );
}

// ── NewPinModal ───────────────────────────────────────────────────────────────

function NewPinModal({ lat, lng, onClose }: { lat: number; lng: number; onClose: () => void }) {
  const qc     = useQueryClient();
  const submit = useServerFn(createPin);
  const [title, setTitle]         = useState("");
  const [placeType, setPlaceType] = useState<PlaceType>("spot");
  const m = useMutation({
    mutationFn: submit,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pins"] });
      toast.success("Pin added");
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4">
      <div className="w-full max-w-md rounded-md bg-card p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl">Drop a pin</h2>
          <button onClick={onClose} aria-label="Close"><X className="h-5 w-5" /></button>
        </div>
        <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3" /> {lat.toFixed(4)}°, {lng.toFixed(4)}°
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!title.trim()) return toast.error("Add a place name");
            m.mutate({ data: { lat, lng, title: title.trim(), placeType } });
          }}
          className="mt-5 space-y-4"
        >
          <label className="block">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Place name</span>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
              placeholder="e.g. Tiny ramen bar near the station"
            />
          </label>
          <div>
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Type</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {(Object.keys(PLACE_TYPES) as PlaceType[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setPlaceType(k)}
                  className={
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors " +
                    (placeType === k
                      ? "border-foreground bg-foreground text-background"
                      : "border-border hover:bg-muted")
                  }
                >
                  <span
                    className="inline-block h-2 w-2 shrink-0 rounded-full"
                    style={{ background: PLACE_TYPES[k].mapColor }}
                  />
                  {PLACE_TYPES[k].label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-md border border-border px-4 py-2 text-sm">
              Cancel
            </button>
            <button
              type="submit"
              disabled={m.isPending}
              className="rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {m.isPending ? "Posting…" : "Post pin"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
