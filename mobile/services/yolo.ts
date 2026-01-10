/**
 * YOLO Detection Service
 *
 * Handles object detection using YOLOv8 via the backend API.
 * YOLO provides superior detection for:
 * - Traffic lights (with bounding boxes)
 * - Cars and trucks
 * - Stop signs
 * - Emergency vehicles
 *
 * IMPLEMENTATION NOTES:
 * - YOLOv8n (nano) model: 3.2M parameters, ~6MB, 30+ FPS on mobile
 * - Detection runs on the backend to avoid mobile model loading overhead
 * - Results include bounding boxes for further color analysis
 */

import { API_BASE_URL } from './api';
import { TIMING } from '../constants/accessibility';

// COCO class IDs that are relevant for traffic safety
export const RELEVANT_CLASSES = {
  CAR: 2,
  TRUCK: 7,
  TRAFFIC_LIGHT: 9,
  STOP_SIGN: 11,
  PERSON: 0,
  BICYCLE: 1,
  MOTORCYCLE: 3,
  BUS: 5,
} as const;

export type DetectionClass = keyof typeof RELEVANT_CLASSES;

export interface BoundingBox {
  x: number;      // Center x (normalized 0-1)
  y: number;      // Center y (normalized 0-1)
  width: number;  // Width (normalized 0-1)
  height: number; // Height (normalized 0-1)
}

export interface Detection {
  classId: number;
  className: string;
  confidence: number;
  bbox: BoundingBox;
}

export interface YOLODetectionResult {
  detections: Detection[];
  processingTimeMs: number;
  imageWidth: number;
  imageHeight: number;
}

export interface TrafficLightDetection extends Detection {
  lightState?: 'red' | 'yellow' | 'green' | 'unknown';
  stateConfidence?: number;
}

/**
 * Sends an image to the backend for YOLO object detection
 */
export async function detectObjects(base64Image: string): Promise<YOLODetectionResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMING.apiTimeout);

  try {
    const response = await fetch(`${API_BASE_URL}/api/detect/yolo`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: base64Image,
        confidenceThreshold: 0.5,
        classes: Object.values(RELEVANT_CLASSES), // Only detect relevant classes
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`YOLO API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('YOLO detection timeout');
    }

    throw error;
  }
}

/**
 * Filters detections for traffic lights only
 */
export function getTrafficLights(result: YOLODetectionResult): Detection[] {
  return result.detections.filter(d => d.classId === RELEVANT_CLASSES.TRAFFIC_LIGHT);
}

/**
 * Filters detections for vehicles (cars, trucks, buses, motorcycles)
 */
export function getVehicles(result: YOLODetectionResult): Detection[] {
  const vehicleClasses = [
    RELEVANT_CLASSES.CAR,
    RELEVANT_CLASSES.TRUCK,
    RELEVANT_CLASSES.BUS,
    RELEVANT_CLASSES.MOTORCYCLE,
  ];
  return result.detections.filter(d => vehicleClasses.includes(d.classId));
}

/**
 * Gets stop signs from detection results
 */
export function getStopSigns(result: YOLODetectionResult): Detection[] {
  return result.detections.filter(d => d.classId === RELEVANT_CLASSES.STOP_SIGN);
}

/**
 * Checks if a vehicle is likely showing brake lights
 * This is determined by checking if the rear of the vehicle has bright red pixels
 * The backend will analyze the cropped vehicle region
 */
export async function checkBrakeLights(
  base64Image: string,
  vehicleBbox: BoundingBox
): Promise<{ isBraking: boolean; confidence: number }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMING.apiTimeout);

  try {
    const response = await fetch(`${API_BASE_URL}/api/detect/brake-lights`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: base64Image,
        bbox: vehicleBbox,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return { isBraking: false, confidence: 0 };
    }

    return await response.json();
  } catch {
    clearTimeout(timeoutId);
    return { isBraking: false, confidence: 0 };
  }
}

/**
 * Maps COCO class ID to human-readable name
 */
export function getClassName(classId: number): string {
  const classNames: Record<number, string> = {
    0: 'person',
    1: 'bicycle',
    2: 'car',
    3: 'motorcycle',
    5: 'bus',
    7: 'truck',
    9: 'traffic light',
    11: 'stop sign',
  };
  return classNames[classId] || 'unknown';
}

/**
 * Determines priority of detection for audio announcements
 * Higher priority = more urgent to announce
 */
export function getDetectionPriority(detection: Detection): 'critical' | 'high' | 'medium' | 'low' {
  // Traffic lights and stop signs are critical
  if (detection.classId === RELEVANT_CLASSES.TRAFFIC_LIGHT ||
      detection.classId === RELEVANT_CLASSES.STOP_SIGN) {
    return 'critical';
  }

  // Large vehicles close to camera are high priority
  if (detection.classId === RELEVANT_CLASSES.TRUCK ||
      detection.classId === RELEVANT_CLASSES.BUS) {
    return detection.bbox.height > 0.3 ? 'high' : 'medium';
  }

  // Cars depend on proximity (bbox size as proxy)
  if (detection.classId === RELEVANT_CLASSES.CAR) {
    if (detection.bbox.height > 0.4) return 'high';
    if (detection.bbox.height > 0.2) return 'medium';
    return 'low';
  }

  return 'medium';
}
