import pathlib # Temporary override PosixPath with WindowsPath 
temp = pathlib.PosixPath 
pathlib.PosixPath = pathlib.WindowsPath
import pathlib  # Temporary override PosixPath with WindowsPath 
import cv2
import time
import numpy as np
import os
import sys
# Adjust the path to point to the yolov5 directory
yolov5_path = os.path.join(os.path.dirname(__file__), 'yolov5')
sys.path.append(yolov5_path)
import torch
from flask import Flask, request, jsonify
from flask_socketio import SocketIO, emit
from pymongo import MongoClient
from datetime import datetime
from yolov5.models.experimental import attempt_load
from yolov5.utils.torch_utils import select_device
from yolov5.utils.general import non_max_suppression
from yolov5.utils.augmentations import letterbox
from pathlib import Path
from dotenv import load_dotenv

from flask_cors import CORS



# Load environment variables
load_dotenv()

# Configure logging
import logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# Flask and Socket.IO setup
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "http://localhost:3000"}})  # Allow your frontend domain
socketio = SocketIO(app, cors_allowed_origins="*")

# MongoDB Atlas setup
MONGO_URI = os.getenv("MONGO_URI")
if not MONGO_URI:
    logger.error("MONGO_URI not set in environment variables.")
    exit(1)

mongo_client = MongoClient(MONGO_URI)
try:
    mongo_client.admin.command('ping')
    logger.info("Successfully connected to MongoDB.")
except Exception as e:
    logger.error(f"Failed to connect to MongoDB: {e}")
    exit(1)

db = mongo_client["vehicle_detection"]
detections_collection = db["detections"]

# Ensure paths are strings for compatibility with Windows
video_pat = str(Path('D:/Desktop/dip/server/c.mp4'))
model_pat = str(Path('D:/Desktop/dip/server/yolov5_tuned.pt'))

# Preprocess image for YOLOv5
def preprocess_image(image, img_size=640):
    img_resized, ratio, padding = letterbox(image, new_shape=img_size, auto=True)
    img_resized = img_resized[:, :, ::-1].transpose(2, 0, 1)
    img_resized = np.ascontiguousarray(img_resized)
    img_tensor = torch.from_numpy(img_resized).float()
    img_tensor /= 255.0
    if img_tensor.ndimension() == 3:
        img_tensor = img_tensor.unsqueeze(0)
    return img_tensor, ratio, padding

# Function to calculate IoU (Intersection over Union)
def calculate_iou(bbox1, bbox2):
    x1, y1, x2, y2 = bbox1
    x1_2, y1_2, x2_2, y2_2 = bbox2
    inter_x1 = max(x1, x1_2)
    inter_y1 = max(y1, y1_2)
    inter_x2 = min(x2, x2_2)
    inter_y2 = min(y2, y2_2)
    inter_area = max(0, inter_x2 - inter_x1) * max(0, inter_y2 - inter_y1)
    area1 = (x2 - x1) * (y2 - y1)
    area2 = (x2_2 - x1_2) * (y2_2 - y1_2)
    union_area = area1 + area2 - inter_area
    return inter_area / union_area if union_area > 0 else 0

# Vehicle tracking logic
def track_vehicles(frame_results, tracked_vehicles, threshold=0.5):
    new_vehicles = []
    for cls, conf, bbox in frame_results:
        matched = False
        for i, (prev_cls, prev_bbox) in enumerate(tracked_vehicles):
            iou = calculate_iou(bbox, prev_bbox)
            if iou > threshold and cls == prev_cls:
                matched = True
                tracked_vehicles[i] = (cls, bbox)  # Update position
                break
        if not matched:
            tracked_vehicles.append((cls, bbox))
            new_vehicles.append((cls, bbox))  # Add new vehicle
    return new_vehicles, tracked_vehicles

# YOLOv5 prediction function
names = [
    'ambulance', 'army vehicle', 'auto rickshaw', 'bicycle', 'bus', 'car', 'garbagevan',
    'human hauler', 'minibus', 'minivan', 'motorbike', 'pickup', 'policecar', 
    'rickshaw', 'scooter', 'suv', 'taxi', 'three wheelers -CNG-', 'truck', 
    'van', 'wheelbarrow'
]

# YOLOv5 prediction function
def predict_yolo(model, img_tensor, original_shape, ratio, padding):
    model.eval()
    with torch.no_grad():
        pred = model(img_tensor)[0]
    pred = non_max_suppression(pred, 0.25, 0.45, classes=None, agnostic=False)
    results = []
    for det in pred:
        if det is not None and len(det):
            det[:, :4] = scale_coords(
                img_tensor.shape[2:], det[:, :4], original_shape, 
                ratio_pad=(ratio, padding)).round()
            for *xyxy, conf, cls in det:
                xyxy = [int(x.item()) for x in xyxy]
                results.append((int(cls.item()), conf.item(), xyxy))
    return results

# Function to scale coordinates from YOLO format
def scale_coords(img1_shape, coords, img0_shape, ratio_pad):
    gain = ratio_pad[0][0] if isinstance(ratio_pad[0], (list, tuple)) else ratio_pad[0]
    pad = ratio_pad[1]
    coords[:, [0, 2]] -= pad[0]
    coords[:, [1, 3]] -= pad[1]
    coords[:, :4] /= gain
    coords[:, [0, 2]] = coords[:, [0, 2]].clamp(0, img0_shape[1])
    coords[:, [1, 3]] = coords[:, [1, 3]].clamp(0, img0_shape[0])
    return coords

# API endpoint to start detection

# Detection pipeline (with class-wise count emission)
def detection_pipeline(video_path, model_path):
    try:
        # Load model and set device
        device = select_device("cpu")
        logger.info(f"Loading YOLOv5 model from {model_path} on device {device}")
        model = attempt_load(model_path)
        model.to(device)
    except Exception as e:
        logger.error(f"Failed to load model. Error: {e}")
        return

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        logger.error(f"Failed to open video file: {video_path}")
        return

    fps = cap.get(cv2.CAP_PROP_FPS)
    frame_interval = int(fps * 2)  # Number of frames to skip for 2 seconds

    while cap.isOpened():
        current_frame = cap.get(cv2.CAP_PROP_POS_FRAMES)
        cap.set(cv2.CAP_PROP_POS_FRAMES, current_frame + frame_interval)  # Skip to the next frame at 2-second intervals

        ret, frame = cap.read()
        if not ret:
            break

        original_shape = frame.shape[:2]
        img_tensor, ratio, padding = preprocess_image(frame)
        results = predict_yolo(model, img_tensor, original_shape, ratio, padding)

        # Count total vehicles and per-class vehicles
        vehicle_count = len(results)
        class_counts = {}

        for cls, conf, bbox in results:
            class_name = names[cls]
            class_counts[class_name] = class_counts.get(class_name, 0) + 1

        # Filter out classes with 0 counts
        class_counts = {k: v for k, v in class_counts.items() if v > 0}

        # Prepare detection data
        detection_data = {
            "timestamp": datetime.now().isoformat(),
            "vehicles_detected": vehicle_count,
            "class_counts": class_counts,
        }

        # Emit results to frontend
        logger.info(f"Emitting detection update: {detection_data}")
        socketio.emit("detection_update", detection_data)

    cap.release()
    logger.info("Video processing completed.")
# API endpoint to start detection
@app.route("/start_detection", methods=["POST"])
def start_detection():
    data = request.get_json() if request.is_json else {}
    video_path = data.get("video_path", video_pat)
    model_path = data.get("model_path", model_pat)

    if not os.path.exists(video_path):
        return jsonify({"error": f"Video file not found: {video_path}"}), 400
    if not os.path.exists(model_path):
        return jsonify({"error": f"Model file not found: {model_path}"}), 400

    # Start the detection pipeline in a background task
    socketio.start_background_task(detection_pipeline, video_path, model_path)
    
    return jsonify({"message": "Detection started", "video_path": video_path, "model_path": model_path}), 200

# API endpoint to get stored detection data
@app.route("/get_detections", methods=["GET"])
def get_detections():
    limit = int(request.args.get("limit", 100))
    skip = int(request.args.get("skip", 0))
    detections = list(detections_collection.find({}, {"_id": 0}).skip(skip).limit(limit))
    return jsonify(detections), 200

@app.route('/')
def index():
    return "Socket.IO with Flask!"

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5002)
