/**
 * Speed Detection Service
 *
 * Uses expo-location to track user movement speed.
 * This helps contextualize alerts:
 * - Walking speed (< 10 km/h): Pedestrian mode
 * - Biking speed (10-30 km/h): Cyclist mode
 * - Driving speed (> 30 km/h): Vehicle mode
 *
 * The detection mode affects:
 * - Alert frequency and urgency
 * - Which hazards to prioritize
 * - Audio feedback style
 */

import * as Location from 'expo-location';

export type MovementMode = 'stationary' | 'walking' | 'cycling' | 'driving';

export interface SpeedData {
  speedKmh: number;
  speedMph: number;
  mode: MovementMode;
  accuracy: number | null;
  heading: number | null;
  timestamp: number;
}

// Speed thresholds in km/h
const SPEED_THRESHOLDS = {
  stationary: 1,    // < 1 km/h = stationary
  walking: 10,      // 1-10 km/h = walking
  cycling: 30,      // 10-30 km/h = cycling
  // > 30 km/h = driving
};

// Callback for speed updates
type SpeedCallback = (data: SpeedData) => void;

// Service state
let locationSubscription: Location.LocationSubscription | null = null;
let speedCallback: SpeedCallback | null = null;
let lastLocation: Location.LocationObject | null = null;
let isTracking = false;

// Speed smoothing (moving average)
const speedHistory: number[] = [];
const SPEED_HISTORY_SIZE = 5;

/**
 * Requests location permissions
 */
export async function requestLocationPermission(): Promise<boolean> {
  const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();

  if (foregroundStatus !== 'granted') {
    console.warn('[Speed] Foreground location permission denied');
    return false;
  }

  return true;
}

/**
 * Starts tracking speed
 *
 * @param callback - Called whenever speed is updated
 * @param intervalMs - Update interval in milliseconds (default 1000ms)
 */
export async function startSpeedTracking(
  callback: SpeedCallback,
  intervalMs = 1000
): Promise<boolean> {
  if (isTracking) {
    console.warn('[Speed] Already tracking');
    return true;
  }

  const hasPermission = await requestLocationPermission();
  if (!hasPermission) {
    return false;
  }

  speedCallback = callback;

  try {
    locationSubscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: intervalMs,
        distanceInterval: 1, // Update every 1 meter
      },
      handleLocationUpdate
    );

    isTracking = true;
    console.log('[Speed] Tracking started');
    return true;
  } catch (error) {
    console.error('[Speed] Failed to start tracking:', error);
    return false;
  }
}

/**
 * Handles location updates from expo-location
 */
function handleLocationUpdate(location: Location.LocationObject): void {
  const speedMs = location.coords.speed; // Speed in m/s

  let speedKmh = 0;
  if (speedMs !== null && speedMs >= 0) {
    speedKmh = speedMs * 3.6; // Convert m/s to km/h
  } else if (lastLocation) {
    // Calculate speed from position difference if not provided
    const timeDiff = (location.timestamp - lastLocation.timestamp) / 1000; // seconds
    if (timeDiff > 0) {
      const distance = getDistanceKm(
        lastLocation.coords.latitude,
        lastLocation.coords.longitude,
        location.coords.latitude,
        location.coords.longitude
      );
      speedKmh = (distance / timeDiff) * 3600; // km/h
    }
  }

  // Smooth speed using moving average
  speedHistory.push(speedKmh);
  if (speedHistory.length > SPEED_HISTORY_SIZE) {
    speedHistory.shift();
  }
  const smoothedSpeed = speedHistory.reduce((a, b) => a + b, 0) / speedHistory.length;

  // Determine movement mode
  const mode = getMovementMode(smoothedSpeed);

  const speedData: SpeedData = {
    speedKmh: Math.round(smoothedSpeed * 10) / 10,
    speedMph: Math.round(smoothedSpeed * 0.621371 * 10) / 10,
    mode,
    accuracy: location.coords.accuracy,
    heading: location.coords.heading,
    timestamp: location.timestamp,
  };

  lastLocation = location;

  if (speedCallback) {
    speedCallback(speedData);
  }
}

/**
 * Determines movement mode based on speed
 */
function getMovementMode(speedKmh: number): MovementMode {
  if (speedKmh < SPEED_THRESHOLDS.stationary) {
    return 'stationary';
  } else if (speedKmh < SPEED_THRESHOLDS.walking) {
    return 'walking';
  } else if (speedKmh < SPEED_THRESHOLDS.cycling) {
    return 'cycling';
  } else {
    return 'driving';
  }
}

/**
 * Calculates distance between two coordinates using Haversine formula
 */
function getDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Stops speed tracking
 */
export function stopSpeedTracking(): void {
  if (locationSubscription) {
    locationSubscription.remove();
    locationSubscription = null;
  }

  speedCallback = null;
  lastLocation = null;
  speedHistory.length = 0;
  isTracking = false;

  console.log('[Speed] Tracking stopped');
}

/**
 * Gets the current speed without continuous tracking
 */
export async function getCurrentSpeed(): Promise<SpeedData | null> {
  try {
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) return null;

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    const speedMs = location.coords.speed;
    const speedKmh = speedMs !== null && speedMs >= 0 ? speedMs * 3.6 : 0;

    return {
      speedKmh: Math.round(speedKmh * 10) / 10,
      speedMph: Math.round(speedKmh * 0.621371 * 10) / 10,
      mode: getMovementMode(speedKmh),
      accuracy: location.coords.accuracy,
      heading: location.coords.heading,
      timestamp: location.timestamp,
    };
  } catch (error) {
    console.error('[Speed] Failed to get current speed:', error);
    return null;
  }
}

/**
 * Checks if currently tracking
 */
export function isSpeedTracking(): boolean {
  return isTracking;
}

/**
 * Gets recommended capture interval based on movement mode
 * Faster movement = faster capture for safety
 */
export function getRecommendedCaptureInterval(mode: MovementMode): number {
  switch (mode) {
    case 'driving':
      return 400; // 400ms - fast for vehicle speeds
    case 'cycling':
      return 600; // 600ms
    case 'walking':
      return 800; // 800ms
    case 'stationary':
    default:
      return 1000; // 1000ms - slower when not moving
  }
}

/**
 * Gets alert frequency based on movement mode
 * Returns debounce time in ms for audio announcements
 */
export function getAlertDebounceForMode(mode: MovementMode): number {
  switch (mode) {
    case 'driving':
      return 1500; // More frequent alerts when driving
    case 'cycling':
      return 2000;
    case 'walking':
      return 3000;
    case 'stationary':
    default:
      return 4000; // Less frequent when stationary
  }
}
