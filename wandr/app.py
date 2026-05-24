import os
import uuid
from datetime import datetime, timezone
from pathlib import Path

from flask import Flask, jsonify, render_template, request, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename

import database as db

UPLOAD_DIR = Path(__file__).parent / "static" / "uploads"
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "webp", "gif"}
MAX_UPLOAD_BYTES = 3 * 1024 * 1024

app = Flask(__name__, static_folder="static", template_folder="templates")
CORS(app)

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
db.init_db()


def _allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/settings")
def settings():
    return render_template("settings.html")


@app.get("/uploads/<path:filename>")
def serve_upload(filename):
    return send_from_directory(UPLOAD_DIR, filename)


@app.get("/api/pins")
def api_list_pins():
    return jsonify(db.list_pins())


@app.post("/api/pins")
def api_create_pin():
    if request.content_type and "multipart/form-data" in request.content_type:
        lat = request.form.get("lat")
        lng = request.form.get("lng")
        title = (request.form.get("title") or "").strip()
        place_type = request.form.get("placeType", "spot")
        photo_url = None
        file = request.files.get("photo")
        if file and file.filename:
            if not _allowed_file(file.filename):
                return jsonify({"error": "Photo must be PNG, JPG, or WebP"}), 400
            file.seek(0, os.SEEK_END)
            if file.tell() > MAX_UPLOAD_BYTES:
                return jsonify({"error": "Photo must be under 3 MB"}), 400
            file.seek(0)
            ext = file.filename.rsplit(".", 1)[1].lower()
            name = f"{uuid.uuid4().hex}.{ext}"
            path = UPLOAD_DIR / name
            file.save(path)
            photo_url = f"/uploads/{name}"
    else:
        data = request.get_json(force=True)
        lat = data.get("lat")
        lng = data.get("lng")
        title = (data.get("title") or "").strip()
        place_type = data.get("placeType", "spot")
        photo_url = data.get("photoUrl")

    if lat is None or lng is None or not title:
        return jsonify({"error": "lat, lng, and title are required"}), 400
    pin = db.create_pin(float(lat), float(lng), title, place_type, photo_url)
    return jsonify(pin), 201


@app.get("/api/pins/<pin_id>")
def api_get_pin(pin_id):
    pin = db.get_pin(pin_id)
    if not pin:
        return jsonify({"error": "Pin not found"}), 404
    return jsonify(pin)


@app.post("/api/pins/<pin_id>/reviews")
def api_add_review(pin_id):
    data = request.get_json(force=True)
    rating = data.get("rating")
    price_tier = data.get("priceTier")
    body = (data.get("body") or "").strip()
    if not rating or not price_tier or not body:
        return jsonify({"error": "rating, priceTier, and body are required"}), 400
    is_anonymous = data.get("isAnonymous", True)
    display_name = None if is_anonymous else (data.get("displayName") or "").strip() or None
    pin = db.add_review(
        pin_id,
        int(rating),
        int(price_tier),
        body,
        is_anonymous=bool(is_anonymous),
        display_name=display_name,
    )
    if not pin:
        return jsonify({"error": "Pin not found"}), 404
    return jsonify(pin), 201


@app.get("/api/heatmap")
def api_heatmap():
    return jsonify(db.heatmap_points())


@app.get("/api/photo-of-day")
def api_photo_of_day():
    photo = db.photo_of_day()
    if not photo:
        return jsonify({"error": "No community photos yet — drop a pin with a photo!"}), 404
    return jsonify(
        {
            "pinId": photo["id"],
            "title": photo["title"],
            "lat": photo["lat"],
            "lng": photo["lng"],
            "photoUrl": photo["photoUrl"],
            "placeType": photo["placeType"],
        }
    )


if __name__ == "__main__":
    app.run(debug=True, port=5000)
