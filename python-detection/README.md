# Delta Python Detection Microservice

OpenCV + YOLO-based object detection service with color analysis for colorblind users.

## Features

- **YOLO Object Detection**: Detects traffic-relevant objects (traffic lights, stop signs, vehicles, pedestrians)
- **Color Analysis**: Extracts dominant colors from detected objects
- **Colorblind Filtering**: Alerts only for objects with colors problematic for user's specific colorblindness type

## Setup

### 1. Create Virtual Environment

```bash
cd python-detection
python -m venv venv

# Windows
.\venv\Scripts\activate

# Linux/Mac
source venv/bin/activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Run the Service

```bash
python main.py
```

The service will start on `http://localhost:8000`

## API Endpoints

### Health Check
```
GET /health
```

### Detect Objects
```
POST /detect
Content-Type: application/json

{
  "image": "base64_encoded_image",
  "colorblindness_type": "deuteranopia",
  "min_confidence": 0.5
}
```

**Response:**
```json
{
  "success": true,
  "objects": [
    {
      "label": "traffic light",
      "confidence": 0.92,
      "bbox": {"x": 100, "y": 50, "width": 30, "height": 80},
      "dominant_colors": ["red", "black"],
      "is_problematic_color": true,
      "color_warning": "Contains red - may be difficult to see",
      "priority": "critical"
    }
  ],
  "frame_width": 1920,
  "frame_height": 1080,
  "processing_time_ms": 45.2,
  "alert_message": "traffic light: Contains red - may be difficult to see"
}
```

## Colorblindness Types Supported

- `normal` - No color blindness
- `protanopia` - Red-blind
- `protanomaly` - Red-weak
- `deuteranopia` - Green-blind
- `deuteranomaly` - Green-weak
- `tritanopia` - Blue-blind
- `tritanomaly` - Blue-weak
- `achromatopsia` - Complete color blindness

## Model

Uses YOLOv3-tiny for fast inference. Model files are automatically downloaded on first run:
- `yolov3-tiny.weights` (~34MB)
- `yolov3-tiny.cfg`

## Environment Variables

- `PORT` - Server port (default: 8000)
