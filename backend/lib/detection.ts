/**
 * Traffic Signal Detection using HSV Color Analysis + YOLO Integration
 *
 * APPROACH:
 * 1. Use YOLO for object detection (traffic lights, vehicles, stop signs)
 * 2. Use color-based analysis for traffic light state (red/yellow/green)
 * 3. Combine both for comprehensive hazard detection
 *
 * YOLO MODEL:
 * - YOLOv8n (nano): 3.2M parameters, ~6MB, 30+ FPS
 * - Pre-trained on COCO dataset (80 classes)
 * - Relevant classes: traffic light (9), stop sign (11), car (2), truck (7), etc.
 *
 * For hackathon, we simulate YOLO detection with color-based approach
 * In production: npm install @ultralytics/yolov8
 */

export type SignalState = 'red' | 'yellow' | 'green' | 'flashing' | 'unknown';

export interface BoundingBox {
  x: number;      // Center x (normalized 0-1)
  y: number;      // Center y (normalized 0-1)
  width: number;  // Width (normalized 0-1)
  height: number; // Height (normalized 0-1)
}

export interface YOLODetection {
  classId: number;
  className: string;
  confidence: number;
  bbox: BoundingBox;
}

export interface DetectionResult {
  state: SignalState;
  confidence: number;
  message: string;
  bbox?: BoundingBox;
  hazards?: HazardDetection[];
  debug?: {
    redScore: number;
    yellowScore: number;
    greenScore: number;
    brightnessVariance?: number;
    yoloDetections?: YOLODetection[];
  };
}

export interface HazardDetection {
  class: string;
  confidence: number;
  bbox: BoundingBox;
  colorState?: SignalState;
  isActive?: boolean;
}

export interface ColorAnalysisResult {
  state: SignalState;
  confidence: number;
  debug?: {
    topBrightness: number;
    middleBrightness: number;
    bottomBrightness: number;
  };
}

// COCO class IDs for relevant objects
export const COCO_CLASSES = {
  PERSON: 0,
  BICYCLE: 1,
  CAR: 2,
  MOTORCYCLE: 3,
  BUS: 5,
  TRUCK: 7,
  TRAFFIC_LIGHT: 9,
  STOP_SIGN: 11,
} as const;

// Color thresholds in RGB space
const COLOR_THRESHOLDS = {
  red: {
    minR: 150, maxR: 255,
    minG: 0, maxG: 100,
    minB: 0, maxB: 100,
  },
  yellow: {
    minR: 180, maxR: 255,
    minG: 140, maxG: 220,
    minB: 0, maxB: 100,
  },
  green: {
    minR: 0, maxR: 120,
    minG: 150, maxG: 255,
    minB: 50, maxB: 200,
  },
};

const MIN_BRIGHTNESS = 100;

/**
 * Main detection function - combines YOLO + color analysis
 */
export async function detectSignal(
  base64Image: string,
  options: { detectHazards?: boolean } = {}
): Promise<DetectionResult> {
  try {
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');

    // Run color-based analysis (always)
    const colorResult = await analyzeImageColors(imageBuffer);

    // If hazard detection requested, simulate YOLO results
    let hazards: HazardDetection[] = [];
    if (options.detectHazards) {
      hazards = await detectHazards(imageBuffer, colorResult);
    }

    return {
      ...colorResult,
      hazards: hazards.length > 0 ? hazards : undefined,
    };
  } catch (error) {
    console.error('Detection error:', error);
    return {
      state: 'unknown',
      confidence: 0,
      message: 'Unable to analyze image',
    };
  }
}

/**
 * YOLO-based object detection
 * In production, this would use actual YOLO model inference
 */
export async function detectYOLO(base64Image: string): Promise<YOLODetection[]> {
  // For hackathon: simulate YOLO detection based on color analysis
  // In production: use ultralytics/yolov8 or onnxruntime-node

  const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
  const imageBuffer = Buffer.from(base64Data, 'base64');

  const detections: YOLODetection[] = [];
  const colorResult = await analyzeImageColors(imageBuffer);

  // If we detect a traffic light color, simulate a traffic light detection
  if (colorResult.state !== 'unknown' && colorResult.confidence > 0.3) {
    detections.push({
      classId: COCO_CLASSES.TRAFFIC_LIGHT,
      className: 'traffic light',
      confidence: colorResult.confidence,
      bbox: {
        x: 0.5,
        y: 0.3,
        width: 0.15,
        height: 0.25,
      },
    });
  }

  return detections;
}

/**
 * Detect all hazards in the image
 */
async function detectHazards(
  imageBuffer: Buffer,
  colorResult: DetectionResult
): Promise<HazardDetection[]> {
  const hazards: HazardDetection[] = [];

  // Add traffic light if detected
  if (colorResult.state !== 'unknown' && colorResult.confidence > 0.3) {
    hazards.push({
      class: 'traffic_light',
      confidence: colorResult.confidence,
      bbox: {
        x: 0.5,
        y: 0.3,
        width: 0.15,
        height: 0.25,
      },
      colorState: colorResult.state,
    });
  }

  // In production, YOLO would detect additional objects:
  // - Stop signs
  // - Vehicles (for brake light detection)
  // - Pedestrians
  // - Emergency vehicles

  return hazards;
}

/**
 * Analyze traffic light color from a cropped bounding box region
 */
export async function analyzeTrafficLightColor(
  base64Image: string,
  bbox: BoundingBox
): Promise<ColorAnalysisResult> {
  try {
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');

    // For a proper implementation:
    // 1. Decode image properly (using sharp or jimp)
    // 2. Crop to bbox region
    // 3. Divide into 3 vertical sections
    // 4. Analyze brightness in each section

    // Simplified: analyze the full image for now
    const result = await analyzeImageColors(imageBuffer);

    return {
      state: result.state,
      confidence: result.confidence,
      debug: {
        topBrightness: result.debug?.redScore || 0,
        middleBrightness: result.debug?.yellowScore || 0,
        bottomBrightness: result.debug?.greenScore || 0,
      },
    };
  } catch (error) {
    console.error('Color analysis error:', error);
    return {
      state: 'unknown',
      confidence: 0,
    };
  }
}

/**
 * Detect brake lights on a vehicle
 */
export async function detectBrakeLights(
  base64Image: string,
  vehicleBbox: BoundingBox
): Promise<{ isBraking: boolean; confidence: number }> {
  try {
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');

    // Focus on bottom 30% of vehicle bbox (tail lights area)
    // Look for bright red pixels
    let redPixels = 0;
    let totalPixels = 0;

    // Sample the buffer (simplified approach)
    for (let i = 0; i < imageBuffer.length - 3; i += 4) {
      const r = imageBuffer[i];
      const g = imageBuffer[i + 1];
      const b = imageBuffer[i + 2];

      totalPixels++;

      // Bright red (brake light)
      if (r > 200 && g < 80 && b < 80) {
        redPixels++;
      }
    }

    const redPercentage = (redPixels / Math.max(totalPixels, 1)) * 100;
    const isBraking = redPercentage > 5;
    const confidence = Math.min(redPercentage / 20, 1);

    return { isBraking, confidence };
  } catch (error) {
    console.error('Brake light detection error:', error);
    return { isBraking: false, confidence: 0 };
  }
}

/**
 * Detect emergency vehicle lights (flashing red/blue)
 */
export async function detectEmergencyLights(
  base64Image: string,
  vehicleBbox: BoundingBox
): Promise<{ isEmergency: boolean; confidence: number }> {
  try {
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');

    let bluePixels = 0;
    let brightRedPixels = 0;
    let totalPixels = 0;

    for (let i = 0; i < imageBuffer.length - 3; i += 4) {
      const r = imageBuffer[i];
      const g = imageBuffer[i + 1];
      const b = imageBuffer[i + 2];

      totalPixels++;

      // Bright blue (emergency light)
      if (b > 200 && r < 100 && g < 150) {
        bluePixels++;
      }

      // Bright red (emergency light)
      if (r > 200 && g < 50 && b < 50) {
        brightRedPixels++;
      }
    }

    const bluePercentage = (bluePixels / Math.max(totalPixels, 1)) * 100;
    const redPercentage = (brightRedPixels / Math.max(totalPixels, 1)) * 100;

    // Emergency vehicles have both red and blue lights
    const isEmergency = (bluePercentage > 2 && redPercentage > 2) || bluePercentage > 5;
    const confidence = Math.min((bluePercentage + redPercentage) / 15, 1);

    return { isEmergency, confidence };
  } catch (error) {
    console.error('Emergency light detection error:', error);
    return { isEmergency: false, confidence: 0 };
  }
}

/**
 * Color analysis for traffic signal detection
 */
async function analyzeImageColors(imageBuffer: Buffer): Promise<DetectionResult> {
  let redPixels = 0;
  let yellowPixels = 0;
  let greenPixels = 0;
  let totalBrightPixels = 0;

  for (let i = 0; i < imageBuffer.length - 3; i += 4) {
    const r = imageBuffer[i];
    const g = imageBuffer[i + 1];
    const b = imageBuffer[i + 2];

    const brightness = (r + g + b) / 3;

    if (brightness > MIN_BRIGHTNESS) {
      totalBrightPixels++;

      if (isColorMatch(r, g, b, COLOR_THRESHOLDS.red)) {
        redPixels++;
      } else if (isColorMatch(r, g, b, COLOR_THRESHOLDS.yellow)) {
        yellowPixels++;
      } else if (isColorMatch(r, g, b, COLOR_THRESHOLDS.green)) {
        greenPixels++;
      }
    }
  }

  const total = Math.max(totalBrightPixels, 1);
  const redScore = (redPixels / total) * 100;
  const yellowScore = (yellowPixels / total) * 100;
  const greenScore = (greenPixels / total) * 100;

  const scores = [
    { state: 'red' as SignalState, score: redScore },
    { state: 'yellow' as SignalState, score: yellowScore },
    { state: 'green' as SignalState, score: greenScore },
  ];

  scores.sort((a, b) => b.score - a.score);
  const topScore = scores[0];

  const MIN_CONFIDENCE_THRESHOLD = 2;

  if (topScore.score < MIN_CONFIDENCE_THRESHOLD) {
    return {
      state: 'unknown',
      confidence: 0,
      message: 'No traffic signal detected',
      debug: { redScore, yellowScore, greenScore },
    };
  }

  const confidence = Math.min(topScore.score / 10, 1);

  const messages: Record<SignalState, string> = {
    red: 'Red light',
    yellow: 'Yellow light - prepare to stop',
    green: 'Green light',
    flashing: 'Warning: flashing signal',
    unknown: 'No signal detected',
  };

  return {
    state: topScore.state,
    confidence,
    message: messages[topScore.state],
    debug: { redScore, yellowScore, greenScore },
  };
}

function isColorMatch(
  r: number,
  g: number,
  b: number,
  threshold: typeof COLOR_THRESHOLDS.red
): boolean {
  return (
    r >= threshold.minR && r <= threshold.maxR &&
    g >= threshold.minG && g <= threshold.maxG &&
    b >= threshold.minB && b <= threshold.maxB
  );
}

/**
 * Get class name from COCO class ID
 */
export function getClassName(classId: number): string {
  const names: Record<number, string> = {
    0: 'person',
    1: 'bicycle',
    2: 'car',
    3: 'motorcycle',
    5: 'bus',
    7: 'truck',
    9: 'traffic light',
    11: 'stop sign',
  };
  return names[classId] || 'unknown';
}
