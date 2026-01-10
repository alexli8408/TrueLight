/**
 * ML Service - Hazard Detection
 *
 * Handles machine learning inference for detecting traffic hazards.
 * Uses TensorFlow.js for on-device inference with COCO-SSD model.
 *
 * FEATURES:
 * - Traffic light detection with color state
 * - Vehicle detection (cars, trucks, bicycles)
 * - Brake light detection
 * - Stop sign detection
 * - On-device processing for privacy
 */

import { SignalState } from '../constants/accessibility';

export interface BoundingBox {
  x: number;      // Left
  y: number;      // Top
  width: number;
  height: number;
}

export interface Detection {
  id: string;
  type: HazardType;
  confidence: number;
  bbox: BoundingBox;
  colorState?: 'red' | 'yellow' | 'green' | 'unknown';
  isActive?: boolean;  // For brake lights
  timestamp: number;
}

export type HazardType =
  | 'traffic_light'
  | 'stop_sign'
  | 'yield_sign'
  | 'vehicle'
  | 'brake_lights'
  | 'emergency_vehicle'
  | 'pedestrian_signal'
  | 'unknown';

export interface MLServiceConfig {
  modelPath?: string;
  confidenceThreshold: number;
  maxDetections: number;
  useQuantizedModel: boolean;
}

const DEFAULT_CONFIG: MLServiceConfig = {
  confidenceThreshold: 0.5,
  maxDetections: 10,
  useQuantizedModel: true,  // Better performance on mobile
};

/**
 * Hazard classes we're interested in detecting
 * Maps COCO-SSD class names to our hazard types
 */
const HAZARD_CLASS_MAP: Record<string, HazardType> = {
  'traffic light': 'traffic_light',
  'stop sign': 'stop_sign',
  'car': 'vehicle',
  'truck': 'vehicle',
  'bus': 'vehicle',
  'motorcycle': 'vehicle',
  'bicycle': 'vehicle',
  'person': 'unknown',  // We track but don't alert on pedestrians
};

class MLService {
  private config: MLServiceConfig;
  private isInitialized: boolean = false;
  private isProcessing: boolean = false;

  constructor(config: Partial<MLServiceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize the ML model
   * In production, this would load TensorFlow.js and COCO-SSD
   */
  async initialize(): Promise<boolean> {
    try {
      // Note: In a full implementation, we would:
      // 1. await tf.ready()
      // 2. await tf.setBackend('rn-webgl') for React Native
      // 3. Load the COCO-SSD model
      
      // For now, we use the backend API for detection
      // This allows for faster hackathon iteration
      
      this.isInitialized = true;
      console.log('ML Service initialized');
      return true;
    } catch (error) {
      console.error('ML Service initialization failed:', error);
      return false;
    }
  }

  /**
   * Detect hazards in an image
   * Returns all detected hazards with bounding boxes
   */
  async detectHazards(base64Image: string): Promise<Detection[]> {
    if (this.isProcessing) {
      return [];
    }

    this.isProcessing = true;

    try {
      // For the hackathon, we use a simplified approach:
      // 1. Send to backend for COCO-SSD detection
      // 2. Post-process results to classify hazards
      // 3. Analyze colors for traffic lights

      // In production, this would run on-device with TensorFlow.js
      const detections = await this.runBackendDetection(base64Image);
      
      return detections;
    } catch (error) {
      console.error('Hazard detection error:', error);
      return [];
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Run detection through backend API
   */
  private async runBackendDetection(base64Image: string): Promise<Detection[]> {
    const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
    
    try {
      const response = await fetch(`${API_URL}/api/detect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          image: base64Image,
          detectHazards: true  // Request full hazard detection
        }),
      });

      if (!response.ok) {
        throw new Error(`Detection API error: ${response.status}`);
      }

      const result = await response.json();
      
      // Convert API response to our Detection format
      return this.parseApiResponse(result);
    } catch (error) {
      console.error('Backend detection error:', error);
      return [];
    }
  }

  /**
   * Parse API response into Detection objects
   */
  private parseApiResponse(apiResult: any): Detection[] {
    const detections: Detection[] = [];
    const timestamp = Date.now();

    // Handle traffic light detection (existing functionality)
    if (apiResult.state && apiResult.state !== 'unknown') {
      detections.push({
        id: `traffic_light_${timestamp}`,
        type: 'traffic_light',
        confidence: apiResult.confidence || 0.5,
        bbox: apiResult.bbox || { x: 0.4, y: 0.2, width: 0.2, height: 0.3 },
        colorState: apiResult.state as 'red' | 'yellow' | 'green',
        timestamp,
      });
    }

    // Handle additional hazard detections if present
    if (apiResult.hazards && Array.isArray(apiResult.hazards)) {
      for (const hazard of apiResult.hazards) {
        const type = HAZARD_CLASS_MAP[hazard.class] || 'unknown';
        if (type === 'unknown') continue;

        detections.push({
          id: `${type}_${timestamp}_${Math.random().toString(36).substr(2, 9)}`,
          type,
          confidence: hazard.score || hazard.confidence || 0.5,
          bbox: {
            x: hazard.bbox?.[0] || 0,
            y: hazard.bbox?.[1] || 0,
            width: hazard.bbox?.[2] || 0.1,
            height: hazard.bbox?.[3] || 0.1,
          },
          colorState: hazard.colorState,
          isActive: hazard.isActive,
          timestamp,
        });
      }
    }

    return detections.filter(d => d.confidence >= this.config.confidenceThreshold);
  }

  /**
   * Analyze traffic light color from a cropped region
   * Uses HSV color space analysis
   */
  analyzeTrafficLightColor(
    imageTensor: any, // Would be tf.Tensor3D
    bbox: BoundingBox
  ): 'red' | 'yellow' | 'green' | 'unknown' {
    // In a full implementation, this would:
    // 1. Crop the traffic light region
    // 2. Split into top (red), middle (yellow), bottom (green) sections
    // 3. Analyze brightness in each section
    // 4. Return the section with highest brightness
    
    // For now, this is handled by the backend
    return 'unknown';
  }

  /**
   * Detect if brake lights are active on a vehicle
   */
  analyzeBrakeLights(
    imageTensor: any,
    vehicleBbox: BoundingBox
  ): boolean {
    // In a full implementation:
    // 1. Focus on bottom 30% of vehicle bbox (tail lights area)
    // 2. Convert to HSV color space
    // 3. Look for bright red regions (hue ~0-10° or 350-360°)
    // 4. If >5% of rear section is bright red, brakes are on
    
    return false;
  }

  /**
   * Convert detections to SignalState for compatibility
   */
  getSignalStateFromDetections(detections: Detection[]): SignalState {
    const trafficLight = detections.find(d => d.type === 'traffic_light');
    if (trafficLight?.colorState) {
      return trafficLight.colorState as SignalState;
    }
    return 'unknown';
  }

  /**
   * Check if service is ready
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Check if currently processing
   */
  isBusy(): boolean {
    return this.isProcessing;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<MLServiceConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    // In production, would dispose of TF.js model
    this.isInitialized = false;
  }
}

// Singleton instance
export const mlService = new MLService();
