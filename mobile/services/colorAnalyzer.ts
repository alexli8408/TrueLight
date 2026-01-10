/**
 * Traffic Light Color Analyzer
 *
 * After YOLO detects a traffic light's bounding box, this service
 * analyzes the pixel colors within that region to determine if the
 * light is red, yellow, or green.
 *
 * APPROACH:
 * Traffic lights have 3 vertically stacked lights (top=red, middle=yellow, bottom=green).
 * We divide the bounding box into thirds and check which region is brightest.
 *
 * This runs on the backend to leverage server-side image processing.
 */

import { BoundingBox } from './yolo';
import { SignalState } from '../constants/accessibility';
import { API_BASE_URL } from './api';
import { TIMING } from '../constants/accessibility';

export interface ColorAnalysisResult {
  state: SignalState;
  confidence: number;
  debug?: {
    topBrightness: number;
    middleBrightness: number;
    bottomBrightness: number;
    dominantColor: string;
  };
}

/**
 * Analyzes a traffic light's color state by examining the cropped region
 *
 * @param base64Image - Full frame as base64
 * @param bbox - Bounding box of the traffic light from YOLO
 */
export async function analyzeTrafficLightColor(
  base64Image: string,
  bbox: BoundingBox
): Promise<ColorAnalysisResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMING.apiTimeout);

  try {
    const response = await fetch(`${API_BASE_URL}/api/detect/color`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: base64Image,
        bbox,
        analysisType: 'traffic_light',
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Color analysis API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Color analysis timeout');
    }

    throw error;
  }
}

/**
 * Client-side heuristic for traffic light color detection
 * Used as fallback when backend analysis fails
 *
 * This is a simplified version that works directly with image data
 * if we have access to pixel values from the camera
 */
export function analyzeTrafficLightHeuristic(
  pixelData: {
    topRegion: { r: number; g: number; b: number; brightness: number };
    middleRegion: { r: number; g: number; b: number; brightness: number };
    bottomRegion: { r: number; g: number; b: number; brightness: number };
  }
): ColorAnalysisResult {
  const { topRegion, middleRegion, bottomRegion } = pixelData;

  // Find the brightest region (indicates which light is on)
  const regions = [
    { name: 'top', data: topRegion, state: 'red' as SignalState },
    { name: 'middle', data: middleRegion, state: 'yellow' as SignalState },
    { name: 'bottom', data: bottomRegion, state: 'green' as SignalState },
  ];

  // Sort by brightness
  regions.sort((a, b) => b.data.brightness - a.data.brightness);
  const brightest = regions[0];
  const secondBrightest = regions[1];

  // Calculate confidence based on brightness difference
  const brightnessDiff = brightest.data.brightness - secondBrightest.data.brightness;
  const minBrightness = 80; // Minimum brightness to consider a light "on"

  if (brightest.data.brightness < minBrightness) {
    return {
      state: 'unknown',
      confidence: 0,
      debug: {
        topBrightness: topRegion.brightness,
        middleBrightness: middleRegion.brightness,
        bottomBrightness: bottomRegion.brightness,
        dominantColor: 'none',
      },
    };
  }

  // Validate color matches expected color for that position
  const colorValid = validateColorForPosition(brightest.name, brightest.data);

  // Confidence based on brightness difference and color validation
  let confidence = Math.min(brightnessDiff / 100, 0.5) + (colorValid ? 0.5 : 0);
  confidence = Math.min(confidence, 1);

  return {
    state: brightest.state,
    confidence,
    debug: {
      topBrightness: topRegion.brightness,
      middleBrightness: middleRegion.brightness,
      bottomBrightness: bottomRegion.brightness,
      dominantColor: brightest.name,
    },
  };
}

/**
 * Validates that the color in a region matches the expected color
 * for that position (top=red, middle=yellow, bottom=green)
 */
function validateColorForPosition(
  position: string,
  color: { r: number; g: number; b: number }
): boolean {
  const { r, g, b } = color;

  switch (position) {
    case 'top': // Should be red
      return r > 150 && r > g * 1.5 && r > b * 1.5;

    case 'middle': // Should be yellow/amber
      return r > 150 && g > 100 && r > b * 2 && Math.abs(r - g) < 80;

    case 'bottom': // Should be green
      return g > 100 && g > r * 0.8 && g > b * 0.8;

    default:
      return false;
  }
}

/**
 * Detects if brake lights are illuminated on a vehicle
 *
 * @param base64Image - Full frame as base64
 * @param vehicleBbox - Bounding box of the vehicle from YOLO
 */
export async function detectBrakeLights(
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
 * Detects emergency vehicle lights (red/blue flashing)
 *
 * @param base64Image - Full frame as base64
 * @param vehicleBbox - Bounding box of the vehicle from YOLO
 */
export async function detectEmergencyLights(
  base64Image: string,
  vehicleBbox: BoundingBox
): Promise<{ isEmergency: boolean; confidence: number }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMING.apiTimeout);

  try {
    const response = await fetch(`${API_BASE_URL}/api/detect/emergency-lights`, {
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
      return { isEmergency: false, confidence: 0 };
    }

    return await response.json();
  } catch {
    clearTimeout(timeoutId);
    return { isEmergency: false, confidence: 0 };
  }
}

/**
 * Color thresholds for different signal states
 * Can be calibrated per-user for different lighting conditions
 */
export const COLOR_THRESHOLDS = {
  red: {
    hueMin: 0,
    hueMax: 30,
    saturationMin: 100,
    brightnessMin: 100,
  },
  yellow: {
    hueMin: 30,
    hueMax: 60,
    saturationMin: 100,
    brightnessMin: 150,
  },
  green: {
    hueMin: 80,
    hueMax: 160,
    saturationMin: 50,
    brightnessMin: 80,
  },
};

/**
 * Converts RGB to HSV
 */
export function rgbToHsv(
  r: number,
  g: number,
  b: number
): { h: number; s: number; v: number } {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;

  let h = 0;
  const s = max === 0 ? 0 : d / max;
  const v = max;

  if (max !== min) {
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 255),
    v: Math.round(v * 255),
  };
}
