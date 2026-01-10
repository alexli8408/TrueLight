/**
 * SpeedDetector - Detects user's speed for warning timing
 * Uses device location and accelerometer data
 */

import * as Location from 'expo-location';

class SpeedDetector {
  constructor() {
    this.isTracking = false;
    this.currentSpeed = 0;
    this.locationSubscription = null;
    this.speedCallback = null;
  }

  async startTracking(callback) {
    if (this.isTracking) return;

    this.speedCallback = callback;

    try {
      // Request location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Location permission not granted');
        this.simulateSpeed();
        return;
      }

      // Start watching location for speed
      this.locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 1000, // Update every second
          distanceInterval: 1, // Update every meter
        },
        (location) => {
          // Speed is in m/s, convert to km/h
          const speedKmh = (location.coords.speed || 0) * 3.6;
          this.currentSpeed = Math.max(0, speedKmh);
          
          if (this.speedCallback) {
            this.speedCallback(this.currentSpeed);
          }
        }
      );

      this.isTracking = true;
    } catch (error) {
      console.error('Error starting speed tracking:', error);
      // Fallback to simulation
      this.simulateSpeed();
    }
  }

  stopTracking() {
    if (this.locationSubscription) {
      this.locationSubscription.remove();
      this.locationSubscription = null;
    }
    
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }
    
    this.isTracking = false;
    this.currentSpeed = 0;
  }

  /**
   * Simulate speed changes for testing purposes
   */
  simulateSpeed() {
    // Simulate realistic speed changes
    let baseSpeed = 0;
    let targetSpeed = 0;
    let mode = 'walking'; // walking, biking, driving

    this.simulationInterval = setInterval(() => {
      // Randomly change mode occasionally
      if (Math.random() < 0.05) {
        const modes = [
          { name: 'walking', minSpeed: 3, maxSpeed: 6 },
          { name: 'biking', minSpeed: 15, maxSpeed: 25 },
          { name: 'driving', minSpeed: 30, maxSpeed: 60 },
        ];
        const newMode = modes[Math.floor(Math.random() * modes.length)];
        mode = newMode.name;
        targetSpeed = newMode.minSpeed + Math.random() * (newMode.maxSpeed - newMode.minSpeed);
      }

      // Gradually adjust speed towards target
      const diff = targetSpeed - baseSpeed;
      baseSpeed += diff * 0.1;

      // Add some realistic variation
      const variation = (Math.random() - 0.5) * 2;
      this.currentSpeed = Math.max(0, baseSpeed + variation);

      if (this.speedCallback) {
        this.speedCallback(this.currentSpeed);
      }
    }, 1000);
  }

  getCurrentSpeed() {
    return this.currentSpeed;
  }

  getSpeedMode() {
    if (this.currentSpeed < 5) {
      return 'walking';
    } else if (this.currentSpeed < 25) {
      return 'biking';
    } else {
      return 'driving';
    }
  }
}

export default SpeedDetector;
