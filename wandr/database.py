import json
import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path

DB_PATH = Path(__file__).parent / "data" / "wandr.db"


def get_connection():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    with get_connection() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS pins (
                id TEXT PRIMARY KEY,
                lat REAL NOT NULL,
                lng REAL NOT NULL,
                title TEXT NOT NULL,
                place_type TEXT DEFAULT 'spot',
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS reviews (
                id TEXT PRIMARY KEY,
                pin_id TEXT NOT NULL,
                rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
                price_tier INTEGER NOT NULL CHECK (price_tier BETWEEN 1 AND 3),
                body TEXT NOT NULL,
                is_anonymous INTEGER NOT NULL DEFAULT 1,
                display_name TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY (pin_id) REFERENCES pins(id) ON DELETE CASCADE
            );
            """
        )
        _migrate(conn)
        count = conn.execute("SELECT COUNT(*) FROM pins").fetchone()[0]
        if count == 0:
            _seed_demo(conn)


def _migrate(conn):
    conn.execute("UPDATE pins SET place_type = 'spot' WHERE place_type = 'hangout'")
    cols = {row[1] for row in conn.execute("PRAGMA table_info(pins)")}
    if "photo_url" not in cols:
        conn.execute("ALTER TABLE pins ADD COLUMN photo_url TEXT")
    has_hotel = conn.execute(
        "SELECT 1 FROM pins WHERE place_type = 'hotel' LIMIT 1"
    ).fetchone()
    if not has_hotel:
        _seed_extra_pins(conn)
    _seed_demo_photos(conn)
    conn.commit()


def _seed_demo_photos(conn):
    """Ensure at least one user-style photo exists for photo-of-the-day."""
    row = conn.execute(
        "SELECT id FROM pins WHERE title LIKE '%Navigli%' AND (photo_url IS NULL OR photo_url = '')"
    ).fetchone()
    if row:
        conn.execute(
            "UPDATE pins SET photo_url = ? WHERE id = ?",
            (
                "https://images.unsplash.com/photo-1513581166391-887a96dde670?w=800&q=80",
                row["id"],
            ),
        )


def _seed_extra_pins(conn):
    """Add newer demo pins for existing databases."""
    now = datetime.now(timezone.utc).isoformat()
    extras = [
        (52.3676, 4.9041, "Amsterdam Centrum budget hotel", "hotel"),
        (50.1109, 8.6821, "Frankfurt Hauptbahnhof", "transport"),
        (45.4642, 9.19, "Navigli canals sunset", "view"),
    ]
    for lat, lng, title, place_type in extras:
        pin_id = str(uuid.uuid4())
        conn.execute(
            "INSERT INTO pins (id, lat, lng, title, place_type, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            (pin_id, lat, lng, title, place_type, now),
        )


def _seed_demo(conn):
    now = datetime.now(timezone.utc).isoformat()
    demos = [
        {
            "id": str(uuid.uuid4()),
            "lat": 48.8566,
            "lng": 2.3522,
            "title": "Canal Saint-Martin picnic spot",
            "place_type": "spot",
            "reviews": [
                (5, 1, "Cheap wine from the supermarket nearby. Locals chill here at sunset — felt safe and vibey.", 1, None),
                (4, 1, "Free views, bring your own food. Way better than tourist traps by the Seine.", 1, None),
            ],
        },
        {
            "id": str(uuid.uuid4()),
            "lat": 41.3825,
            "lng": 2.1769,
            "title": "Gràcia hostel strip",
            "place_type": "hostel",
            "reviews": [
                (4, 2, "Bunks from €28 in shoulder season. Book early for weekends.", 1, None),
                (3, 2, "Shared kitchen saves money. Metro 10 min walk.", 0, "Maya_T"),
            ],
        },
        {
            "id": str(uuid.uuid4()),
            "lat": 52.5200,
            "lng": 13.4050,
            "title": "Hauptbahnhof area eats",
            "place_type": "food",
            "reviews": [
                (4, 1, "Currywurst stand outside station — €4 and actually good.", 1, None),
                (2, 3, "Sit-down place in the mall is overpriced for what you get.", 1, None),
            ],
        },
        {
            "id": str(uuid.uuid4()),
            "lat": 51.5074,
            "lng": -0.1278,
            "title": "King's Cross student food",
            "place_type": "food",
            "reviews": [
                (5, 1, "Meal deals at Tesco before your train — lifesaver on Interrail days.", 1, None),
                (4, 2, "Food hall has £8 lunches if you need a sit-down.", 0, "rail_kid"),
            ],
        },
        {
            "id": str(uuid.uuid4()),
            "lat": 52.3676,
            "lng": 4.9041,
            "title": "Amsterdam Centrum budget hotel",
            "place_type": "hotel",
            "reviews": [
                (4, 2, "Small doubles ~€65/night if you book 2 weeks ahead. Canal view not worth the upgrade.", 1, None),
                (3, 2, "Breakfast extra — hit the bakery on the corner instead.", 1, None),
            ],
        },
        {
            "id": str(uuid.uuid4()),
            "lat": 50.1109,
            "lng": 8.6821,
            "title": "Frankfurt Hauptbahnhof",
            "place_type": "transport",
            "reviews": [
                (4, 1, "REWE in the station for cheap snacks before night trains.", 1, None),
                (5, 1, "Good interchange for Rhine-Main — lockers on platform 7 area.", 1, None),
            ],
        },
        {
            "id": str(uuid.uuid4()),
            "lat": 45.4642,
            "lng": 9.19,
            "title": "Navigli canals sunset",
            "place_type": "view",
            "reviews": [
                (5, 1, "Free golden hour. Grab aperitivo from the carrefour nearby.", 1, None),
            ],
        },
    ]
    for pin in demos:
        conn.execute(
            "INSERT INTO pins (id, lat, lng, title, place_type, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            (pin["id"], pin["lat"], pin["lng"], pin["title"], pin["place_type"], now),
        )
        for rating, tier, body, anon, name in pin["reviews"]:
            conn.execute(
                """
                INSERT INTO reviews (id, pin_id, rating, price_tier, body, is_anonymous, display_name, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (str(uuid.uuid4()), pin["id"], rating, tier, body, anon, name, now),
            )
    conn.commit()


def _row_to_pin(row, reviews):
    keys = row.keys()
    photo_url = row["photo_url"] if "photo_url" in keys else None
    return {
        "id": row["id"],
        "lat": row["lat"],
        "lng": row["lng"],
        "title": row["title"],
        "placeType": row["place_type"],
        "photoUrl": photo_url,
        "createdAt": row["created_at"],
        "reviews": reviews,
        "avgRating": round(sum(r["rating"] for r in reviews) / len(reviews), 1) if reviews else None,
        "avgPriceTier": round(sum(r["priceTier"] for r in reviews) / len(reviews), 2) if reviews else None,
    }


def _row_to_review(row):
    return {
        "id": row["id"],
        "pinId": row["pin_id"],
        "rating": row["rating"],
        "priceTier": row["price_tier"],
        "body": row["body"],
        "isAnonymous": bool(row["is_anonymous"]),
        "displayName": row["display_name"],
        "createdAt": row["created_at"],
    }


def list_pins():
    with get_connection() as conn:
        pins = conn.execute("SELECT * FROM pins ORDER BY created_at DESC").fetchall()
        result = []
        for pin in pins:
            reviews = conn.execute(
                "SELECT * FROM reviews WHERE pin_id = ? ORDER BY created_at DESC",
                (pin["id"],),
            ).fetchall()
            result.append(_row_to_pin(pin, [_row_to_review(r) for r in reviews]))
        return result


def create_pin(lat, lng, title, place_type="spot", photo_url=None):
    pin_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    with get_connection() as conn:
        conn.execute(
            """
            INSERT INTO pins (id, lat, lng, title, place_type, photo_url, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (pin_id, lat, lng, title, place_type, photo_url, now),
        )
        conn.commit()
    return get_pin(pin_id)


def photo_of_day():
    """Pick a community photo pin for today (stable daily rotation)."""
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT * FROM pins WHERE photo_url IS NOT NULL AND photo_url != '' ORDER BY created_at DESC"
        ).fetchall()
    if not rows:
        return None
    day_index = datetime.now(timezone.utc).timetuple().tm_yday % len(rows)
    row = rows[day_index]
    reviews = []
    return _row_to_pin(row, reviews)


def get_pin(pin_id):
    with get_connection() as conn:
        row = conn.execute("SELECT * FROM pins WHERE id = ?", (pin_id,)).fetchone()
        if not row:
            return None
        reviews = conn.execute(
            "SELECT * FROM reviews WHERE pin_id = ? ORDER BY created_at DESC",
            (pin_id,),
        ).fetchall()
        return _row_to_pin(row, [_row_to_review(r) for r in reviews])


def add_review(pin_id, rating, price_tier, body, is_anonymous=True, display_name=None):
    review_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    with get_connection() as conn:
        if not conn.execute("SELECT 1 FROM pins WHERE id = ?", (pin_id,)).fetchone():
            return None
        conn.execute(
            """
            INSERT INTO reviews (id, pin_id, rating, price_tier, body, is_anonymous, display_name, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                review_id,
                pin_id,
                rating,
                price_tier,
                body,
                1 if is_anonymous else 0,
                display_name if not is_anonymous else None,
                now,
            ),
        )
        conn.commit()
    return get_pin(pin_id)


def heatmap_points():
    """Budget-friendly intensity: cheaper + higher rating = hotter."""
    pins = list_pins()
    points = []
    for pin in pins:
        if not pin["reviews"]:
            continue
        for review in pin["reviews"]:
            budget_score = (4 - review["priceTier"]) / 3
            rating_norm = review["rating"] / 5
            intensity = round(budget_score * 0.6 + rating_norm * 0.4, 3)
            points.append([pin["lat"], pin["lng"], max(0.15, intensity)])
    return points
