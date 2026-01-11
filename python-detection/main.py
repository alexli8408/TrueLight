"""
Delta Detection Microservice
OpenCV + YOLO-based object detection with color analysis for colorblind users
"""

import os
import base64
import logging
from io import BytesIO
from typing import Optional
from contextlib import asynccontextmanager

import cv2
import numpy as np
from PIL import Image
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from detector import ObjectDetector
from color_analyzer import ColorAnalyzer, ColorBlindnessType

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global detector instance
detector: Optional[ObjectDetector] = None
color_analyzer: Optional[ColorAnalyzer] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize detector on startup"""
    global detector, color_analyzer
    logger.info("Loading YOLO model...")
    detector = ObjectDetector()
    color_analyzer = ColorAnalyzer()
    logger.info("Detection service ready")
    yield
    logger.info("Shutting down detection service")


app = FastAPI(
    title="Delta Detection Service",
    description="Object detection and color analysis for colorblind assistance",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class DetectionRequest(BaseModel):
    """Request model for detection endpoint"""
    image: str  # Base64 encoded image
    colorblindness_type: str = "normal"  # User's colorblindness type
    min_confidence: float = 0.5  # Minimum confidence threshold


class BoundingBox(BaseModel):
    """Bounding box for detected object"""
    x: int
    y: int
    width: int
    height: int


class DetectedObject(BaseModel):
    """Detected object with color analysis"""
    label: str
    confidence: float
    bbox: BoundingBox
    dominant_colors: list[str]
    is_problematic_color: bool  # True if color is problematic for user's colorblindness
    color_warning: Optional[str] = None  # Warning message for problematic colors
    priority: str = "normal"  # "critical", "high", "normal", "low"


class DetectionResponse(BaseModel):
    """Response model for detection endpoint"""
    success: bool
    objects: list[DetectedObject]
    frame_width: int
    frame_height: int
    processing_time_ms: float
    alert_message: Optional[str] = None


class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    model_loaded: bool


def decode_base64_image(base64_string: str) -> np.ndarray:
    """Decode base64 image to OpenCV format"""
    # Remove data URL prefix if present
    if "," in base64_string:
        base64_string = base64_string.split(",")[1]
    
    # Decode base64
    image_data = base64.b64decode(base64_string)
    
    # Convert to PIL Image
    pil_image = Image.open(BytesIO(image_data))
    
    # Convert to OpenCV format (BGR)
    cv_image = cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR)
    
    return cv_image


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return HealthResponse(
        status="healthy",
        model_loaded=detector is not None and detector.is_loaded()
    )


@app.post("/detect", response_model=DetectionResponse)
async def detect_objects(request: DetectionRequest):
    """
    Detect objects in image and analyze colors for colorblind users
    """
    import time
    start_time = time.time()
    
    if detector is None:
        raise HTTPException(status_code=503, detail="Detection service not initialized")
    
    try:
        # Decode image
        frame = decode_base64_image(request.image)
        frame_height, frame_width = frame.shape[:2]
        
        # Parse colorblindness type
        try:
            cb_type = ColorBlindnessType(request.colorblindness_type.lower())
        except ValueError:
            cb_type = ColorBlindnessType.NORMAL
        
        # Run object detection
        detections = detector.detect(frame, request.min_confidence)
        
        # Analyze colors and filter for colorblind relevance
        detected_objects = []
        critical_alerts = []
        
        for det in detections:
            x, y, w, h = det["bbox"]
            
            # Extract region of interest for color analysis
            roi = frame[y:y+h, x:x+w]
            
            # Analyze colors in the detected region
            color_info = color_analyzer.analyze_region(roi, cb_type)
            
            # Determine priority based on object type and color
            priority = determine_priority(det["label"], color_info["is_problematic"])
            
            obj = DetectedObject(
                label=det["label"],
                confidence=det["confidence"],
                bbox=BoundingBox(x=x, y=y, width=w, height=h),
                dominant_colors=color_info["dominant_colors"],
                is_problematic_color=color_info["is_problematic"],
                color_warning=color_info.get("warning"),
                priority=priority
            )
            detected_objects.append(obj)
            
            # Collect critical alerts
            if color_info["is_problematic"] and priority in ["critical", "high"]:
                critical_alerts.append(f"{det['label']}: {color_info.get('warning', 'color may be hard to see')}")
        
        # Generate alert message
        alert_message = None
        if critical_alerts:
            alert_message = "; ".join(critical_alerts[:3])  # Limit to 3 alerts
        
        processing_time = (time.time() - start_time) * 1000
        
        return DetectionResponse(
            success=True,
            objects=detected_objects,
            frame_width=frame_width,
            frame_height=frame_height,
            processing_time_ms=round(processing_time, 2),
            alert_message=alert_message
        )
        
    except Exception as e:
        logger.error(f"Detection error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


def determine_priority(label: str, is_problematic: bool) -> str:
    """Determine alert priority based on object type and color relevance"""
    critical_objects = ["traffic light", "stop sign", "fire", "emergency vehicle"]
    high_objects = ["brake light", "turn signal", "yield sign", "warning sign", "cone"]
    
    label_lower = label.lower()
    
    if any(obj in label_lower for obj in critical_objects):
        return "critical" if is_problematic else "high"
    elif any(obj in label_lower for obj in high_objects):
        return "high" if is_problematic else "normal"
    else:
        return "normal" if is_problematic else "low"


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
