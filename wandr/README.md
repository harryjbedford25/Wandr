# Wandr

Honest travel pins for 16–25 year old explorers. Drop spots on the map, leave reviews with **$ / $$ / $$$** pricing, and browse community tips — **anonymously by default**.

## Features

- **Interactive map** — click “Drop a pin” then tap the map to add a place
- **Colour-coded pins** — each type has its own colour; toggle types on/off in the sidebar
- **Reviews & pricing** — star ratings plus budget tiers ($, $$, $$$)
- **Anonymous posting** — reviews default to anonymous; optional display name
- **Train routes** — OpenRailwayMap overlay + major stations in view (Overpass)
- **Interrail corridors** — popular route lines with map legend
- **Budget heatmap** — combines price tier and ratings to highlight budget-friendly areas
- **Photo of the day** — click to jump to that spot on the map
- **Countries overlay** — mark visited / bucket list; click countries on the map
- **Travel radius** — slider for hours-by-train distance circle
- **Budget filter** — show $–$$ pins from the Trip tools dropdown

## Theme

Creamy whites (`#fff9f2`), orange accents (`#ff6b2c`), black text — built for a bright, youthful feel.

## Settings

Open [http://127.0.0.1:5000/settings](http://127.0.0.1:5000/settings) (or tap ⚙ on the map) to configure:

- **Dark mode** — dark UI and map tiles
- **Reduce motion** — minimal animations
- **Community pins** — show/hide by default
- **Train speed** — travel radius estimate (regional / standard / high-speed)
- **Distance units** — km or miles
- **Anonymous reviews** — default when posting
- **Clear local data** — reset countries overlay and lasso on this device

Settings are stored in your browser (`localStorage`).

## Run locally

```bash
cd wandr
pip install -r requirements.txt
python app.py
```

Open [http://127.0.0.1:5000](http://127.0.0.1:5000) in your browser.

Demo pins are seeded in Europe on first run (Paris, Barcelona, Berlin, London).

## Stack

- **Backend:** Flask + SQLite
- **Frontend:** Leaflet, Leaflet.heat, vanilla JS
- **Tiles:** CARTO Voyager (base), OpenRailwayMap (trains)

## Roadmap (from your notes)

- Interrail route data and filters (CO₂, budget, time)
- Hostel/hotel finder
- Countries visited overlay
- Live train map
