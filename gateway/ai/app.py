import json
import os
import threading
import time
from collections import Counter
from datetime import datetime, timezone
from typing import Any

import cv2
import numpy as np
import requests
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from ultralytics import YOLOWorld

CAMERA_ID = os.getenv("ESP_CAMERA_ID", "CAM-101")
SOURCE_URL = os.getenv("ESP_SOURCE_URL", "http://go2rtc:1984/api/stream.mjpeg?src=phone")
MODEL_NAME = os.getenv("ESP_MODEL", "yolov8s-worldv2.pt")
CONFIDENCE = float(os.getenv("ESP_CONFIDENCE", "0.28"))
FRAME_INTERVAL = float(os.getenv("ESP_FRAME_INTERVAL", "0.6"))

DEFAULT_CLASSES = [
    "person",
    "car",
    "truck",
    "bus",
    "motorcycle",
    "forklift",
    "helmet",
    "safety vest",
]

app = FastAPI(title="ESP AI Vision Engine", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

lock = threading.Lock()
state: dict[str, Any] = {
    "camera_id": CAMERA_ID,
    "model": MODEL_NAME,
    "model_status": "loading",
    "source_status": "offline",
    "last_frame_at": None,
    "last_inference_ms": None,
    "frame_width": 0,
    "frame_height": 0,
    "detections": [],
    "events": [],
    "counts": {},
    "restricted_zone": [],
    "error": None,
}

model: YOLOWorld | None = None


class ZonePayload(BaseModel):
    points: list[list[float]]


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def point_in_polygon(x: float, y: float, polygon: list[list[float]]) -> bool:
    if len(polygon) < 3:
        return False
    inside = False
    j = len(polygon) - 1
    for i in range(len(polygon)):
        xi, yi = polygon[i]
        xj, yj = polygon[j]
        intersects = ((yi > y) != (yj > y)) and (x < (xj - xi) * (y - yi) / ((yj - yi) or 1e-9) + xi)
        if intersects:
            inside = not inside
        j = i
    return inside


def decode_mjpeg_stream() -> Any:
    response = requests.get(SOURCE_URL, stream=True, timeout=(5, 10), headers={"Cache-Control": "no-cache"})
    response.raise_for_status()
    buffer = bytearray()
    for chunk in response.iter_content(chunk_size=65536):
        if not chunk:
            continue
        buffer.extend(chunk)
        while True:
            start = buffer.find(b"\xff\xd8")
            if start < 0:
                if len(buffer) > 2_000_000:
                    del buffer[:-100_000]
                break
            end = buffer.find(b"\xff\xd9", start + 2)
            if end < 0:
                if start > 0:
                    del buffer[:start]
                break
            jpeg = bytes(buffer[start:end + 2])
            del buffer[:end + 2]
            frame = cv2.imdecode(np.frombuffer(jpeg, dtype=np.uint8), cv2.IMREAD_COLOR)
            if frame is not None:
                yield frame


def analyze(frame: np.ndarray) -> tuple[list[dict[str, Any]], list[dict[str, Any]], dict[str, int]]:
    global model
    if model is None:
        raise RuntimeError("AI model is not loaded")

    start = time.perf_counter()
    result = model.predict(frame, conf=CONFIDENCE, verbose=False, imgsz=640)[0]
    height, width = frame.shape[:2]
    detections: list[dict[str, Any]] = []
    for box in result.boxes:
        xyxy = box.xyxy[0].tolist()
        confidence = float(box.conf[0])
        class_id = int(box.cls[0])
        name = str(result.names.get(class_id, class_id)).lower()
        x1, y1, x2, y2 = xyxy
        cx = ((x1 + x2) / 2) / width
        cy = ((y1 + y2) / 2) / height
        normalized_box = [x1 / width, y1 / height, x2 / width, y2 / height]
        detections.append({
            "label": name,
            "confidence": round(confidence, 3),
            "box": [round(v, 5) for v in normalized_box],
            "center": [round(cx, 5), round(cy, 5)],
        })

    people = [d for d in detections if d["label"] == "person"]
    vehicles = [d for d in detections if d["label"] in {"car", "truck", "bus", "motorcycle", "forklift"}]
    helmets = [d for d in detections if d["label"] == "helmet"]
    vests = [d for d in detections if d["label"] == "safety vest"]

    events: list[dict[str, Any]] = []
    zone = state.get("restricted_zone") or []
    for person in people:
        px, py = person["center"]
        if zone and point_in_polygon(px, py, zone):
            events.append({"type": "restricted_zone", "severity": "high", "confidence": person["confidence"], "message": "Person entered restricted zone", "box": person["box"]})

        # Conservative fall heuristic: a person box becomes unusually wide/short.
        x1, y1, x2, y2 = person["box"]
        box_w = max(x2 - x1, 1e-6)
        box_h = max(y2 - y1, 1e-6)
        if box_w / box_h > 1.35 and box_h < 0.55:
            events.append({"type": "possible_fall", "severity": "critical", "confidence": round(person["confidence"] * 0.85, 3), "message": "Possible person fall detected", "box": person["box"]})

    if len(people) >= 4:
        events.append({"type": "crowd", "severity": "medium", "confidence": 0.9, "message": f"Crowd detected: {len(people)} people", "count": len(people)})

    # PPE warnings are generated only when a person is visible and the configured open-vocabulary model
    # does not find nearby PPE. These are advisories, not proof of non-compliance.
    for person in people:
        px, py = person["center"]
        nearby_helmet = any(abs(px - h["center"][0]) < 0.12 and abs(py - h["center"][1]) < 0.18 for h in helmets)
        nearby_vest = any(abs(px - v["center"][0]) < 0.18 and abs(py - v["center"][1]) < 0.25 for v in vests)
        if not nearby_helmet:
            events.append({"type": "helmet_missing", "severity": "high", "confidence": person["confidence"], "message": "Helmet not detected for visible person", "box": person["box"]})
        if not nearby_vest:
            events.append({"type": "vest_missing", "severity": "medium", "confidence": person["confidence"], "message": "Safety vest not detected for visible person", "box": person["box"]})

    counts = dict(Counter(d["label"] for d in detections))
    counts["people"] = len(people)
    counts["vehicles"] = len(vehicles)
    counts["helmets"] = len(helmets)
    counts["safety_vests"] = len(vests)
    return detections, events, counts


def worker() -> None:
    global model
    try:
        model = YOLOWorld(MODEL_NAME)
        model.set_classes(DEFAULT_CLASSES)
        with lock:
            state["model_status"] = "ready"
            state["error"] = None
    except Exception as exc:
        with lock:
            state["model_status"] = "error"
            state["error"] = f"Model load failed: {exc}"
        return

    while True:
        try:
            for frame in decode_mjpeg_stream():
                started = time.perf_counter()
                try:
                    detections, events, counts = analyze(frame)
                    with lock:
                        state["source_status"] = "online"
                        state["last_frame_at"] = now_iso()
                        state["last_inference_ms"] = round((time.perf_counter() - started) * 1000, 1)
                        state["frame_width"] = int(frame.shape[1])
                        state["frame_height"] = int(frame.shape[0])
                        state["detections"] = detections
                        state["events"] = events
                        state["counts"] = counts
                        state["error"] = None
                except Exception as exc:
                    with lock:
                        state["error"] = f"Inference failed: {exc}"
                time.sleep(FRAME_INTERVAL)
        except Exception as exc:
            with lock:
                state["source_status"] = "offline"
                state["error"] = f"Camera source failed: {exc}"
            time.sleep(3)


@app.on_event("startup")
def startup() -> None:
    threading.Thread(target=worker, daemon=True, name="esp-ai-worker").start()


@app.get("/health")
def health() -> dict[str, Any]:
    with lock:
        return {
            "ok": state["model_status"] == "ready" and state["source_status"] == "online",
            "camera_id": CAMERA_ID,
            "model_status": state["model_status"],
            "source_status": state["source_status"],
            "last_frame_at": state["last_frame_at"],
            "last_inference_ms": state["last_inference_ms"],
            "error": state["error"],
        }


@app.get("/api/detections")
def detections() -> dict[str, Any]:
    with lock:
        return {k: state[k] for k in ["camera_id", "model", "model_status", "source_status", "last_frame_at", "last_inference_ms", "frame_width", "frame_height", "detections", "events", "counts", "restricted_zone", "error"]}


@app.put("/api/zones/restricted")
def set_restricted_zone(payload: ZonePayload) -> dict[str, Any]:
    if payload.points and any(len(p) != 2 or not all(0 <= float(v) <= 1 for v in p) for p in payload.points):
        raise HTTPException(status_code=400, detail="Zone points must be normalized values between 0 and 1")
    with lock:
        state["restricted_zone"] = [[round(float(p[0]), 5), round(float(p[1]), 5)] for p in payload.points]
        return {"ok": True, "restricted_zone": state["restricted_zone"]}


@app.get("/api/zones/restricted")
def get_restricted_zone() -> dict[str, Any]:
    with lock:
        return {"camera_id": CAMERA_ID, "restricted_zone": state["restricted_zone"]}
