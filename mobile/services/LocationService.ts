/**
 * Location Service
 *
 * GPS-based speed tracking for adjusting warning timing based on movement.
 * Supports walking, biking, and driving modes with adaptive warning distances.
 *
 * FEATURES:
 * - Real-time speed tracking
 * - Automatic transit mode detection
 * - Speed-adaptive warning distances
 * - Battery-conscious accuracy settings
 */

import * as Location from 'expo-location';

export enum TransitMode {
  STATIONARY = 'stationary',
  WALKING = 'walking',      // 0-5 mph
  BIKING = 'biking',        // 5-20 mph
  DRIVING = 'driving'       // 20+ mph
}

export interface LocationState {
  speed: number;           // Current speed in mph
  mode: TransitMode;       // Current transit mode
  latitude: number;
  longitude: number;
  accuracy: number;        // GPS accuracy in meters
  timestamp: number;
}

type LocationCallback = (state: LocationState) => void;

class LocationService {
  private currentSpeed: number = 0;
  private currentMode: TransitMode = TransitMode.STATIONARY;
  private subscription: Location.LocationSubscription | null = null;
  private callbacks: LocationCallback[] = [];
  private isTracking: boolean = false;

  /**
   * Request location permissions
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Location permission error:', error);
      return false;
    }
  }

  /**
   * Check if permissions are granted
   */
  async hasPermissions(): Promise<boolean> {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      return status === 'granted';
    } catch {
      return false;
    }
  }

  /**
   * Start tracking location and speed
   */
  async startTracking(callback?: LocationCallback): Promise<boolean> {
    if (this.isTracking) {
      if (callback) this.callbacks.push(callback);
      return true;
    }

    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      console.warn('Location permission not granted');
      return false;
    }

    if (callback) this.callbacks.push(callback);

    try {
      this.subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 2000,      // Update every 2 seconds
          distanceInterval: 5,     // Or every 5 meters
        },
        (location) => this.handleLocationUpdate(location)
      );

      this.isTracking = true;
      return true;
    } catch (error) {
      console.error('Failed to start location tracking:', error);
      return false;
    }
  }

  /**
   * Stop tracking location
   */
  stopTracking(): void {
    if (this.subscription) {
      this.subscription.remove();
      this.subscription = null;
    }
    this.isTracking = false;
    this.callbacks = [];
  }

  /**
   * Handle location updates
   */
  private handleLocationUpdate(location: Location.LocationObject): void {
    // Speed is in m/s, convert to mph
    const speedMph = (location.coords.speed ?? 0) * 2.237;
    this.currentSpeed = Math.max(0, speedMph); // Ensure non-negative
    this.currentMode = this.determineMode(this.currentSpeed);

    const state: LocationState = {
      speed: this.currentSpeed,
      mode: this.currentMode,
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy: location.coords.accuracy ?? 0,
      timestamp: location.timestamp,
    };

    // Notify all callbacks
    this.callbacks.forEach(cb => {
      try {
        cb(state);
      } catch (error) {
        console.error('Location callback error:', error);
      }
    });
  }

  /**
   * Determine transit mode based on speed
   */
  private determineMode(speedMph: number): TransitMode {
    if (speedMph < 1) return TransitMode.STATIONARY;
    if (speedMph < 5) return TransitMode.WALKING;
    if (speedMph < 20) return TransitMode.BIKING;
    return TransitMode.DRIVING;
  }

  /**
   * Get current speed
   */
  getSpeed(): number {
    return this.currentSpeed;
  }

  /**
   * Get current transit mode
   */
  getMode(): TransitMode {
    return this.currentMode;
  }

  /**
   * Get warning distance based on speed and priority
   * Returns distance in meters for when to trigger warnings
   */
  getWarningDistanceMeters(priority: 'critical' | 'high' | 'medium'): number {
    const baseDistances = {
      critical: { stationary: 5, walking: 10, biking: 30, driving: 80 },
      high: { stationary: 3, walking: 5, biking: 20, driving: 50 },
      medium: { stationary: 2, walking: 3, biking: 10, driving: 30 },
    };

    return baseDistances[priority][this.currentMode] || 10;
  }

  /**
   * Get reaction time needed based on speed
   * Returns time in seconds
   */
  getReactionTimeSeconds(): number {
    // At higher speeds, give more advance warning
    const mode = this.currentMode;
    const times = {
      stationary: 2,
      walking: 3,
      biking: 4,
      driving: 6,
    };
    return times[mode];
  }

  /**
   * Get capture interval based on speed
   * Faster movement = more frequent captures
   */
  getCaptureIntervalMs(): number {
    const intervals = {
      stationary: 1000,   // 1 fps when still
      walking: 800,       // ~1.25 fps
      biking: 400,        // 2.5 fps
      driving: 200,       // 5 fps
    };
    return intervals[this.currentMode];
  }

  /**
   * Check if tracking is active
   */
  isActive(): boolean {
    return this.isTracking;
  }

  /**
   * Remove a specific callback
   */
  removeCallback(callback: LocationCallback): void {
    this.callbacks = this.callbacks.filter(cb => cb !== callback);
  }
}

// Singleton instance
export const locationService = new LocationService();
