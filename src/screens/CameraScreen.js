import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Speech from 'expo-speech';
import HazardDetector from '../utils/HazardDetector';
import SpeedDetector from '../utils/SpeedDetector';

const { width, height } = Dimensions.get('window');

export default function CameraScreen({ route, navigation }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [detectedHazards, setDetectedHazards] = useState([]);
  const [speed, setSpeed] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const cameraRef = useRef(null);
  const hazardDetectorRef = useRef(null);
  const speedDetectorRef = useRef(null);
  const lastWarningRef = useRef({});

  const colorblindnessType = route.params?.colorblindnessType || 'Normal Vision';

  useEffect(() => {
    // Initialize detectors
    hazardDetectorRef.current = new HazardDetector();
    speedDetectorRef.current = new SpeedDetector();

    // Start speed detection
    speedDetectorRef.current.startTracking((newSpeed) => {
      setSpeed(newSpeed);
    });

    // Start camera processing loop
    const interval = setInterval(() => {
      if (cameraRef.current && !isProcessing) {
        processFrame();
      }
    }, 1000); // Process every second

    return () => {
      clearInterval(interval);
      if (speedDetectorRef.current) {
        speedDetectorRef.current.stopTracking();
      }
    };
  }, []);

  useEffect(() => {
    // Check for new hazards and issue warnings
    detectedHazards.forEach((hazard) => {
      const now = Date.now();
      const lastWarning = lastWarningRef.current[hazard.type] || 0;
      
      // Calculate warning interval based on speed
      const warningInterval = getWarningInterval(speed);
      
      if (now - lastWarning > warningInterval) {
        issueWarning(hazard);
        lastWarningRef.current[hazard.type] = now;
      }
    });
  }, [detectedHazards, speed]);

  const processFrame = async () => {
    if (!cameraRef.current) return;
    
    setIsProcessing(true);
    try {
      // Take a photo for processing
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.5,
        base64: false,
        skipProcessing: true,
      });

      // Detect hazards in the frame
      const hazards = await hazardDetectorRef.current.detectHazards(photo.uri);
      setDetectedHazards(hazards);
    } catch (error) {
      console.error('Error processing frame:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const getWarningInterval = (currentSpeed) => {
    // Speed in km/h
    if (currentSpeed < 5) {
      // Walking
      return 5000; // 5 seconds
    } else if (currentSpeed < 25) {
      // Biking
      return 3000; // 3 seconds
    } else {
      // Driving
      return 1500; // 1.5 seconds
    }
  };

  const issueWarning = (hazard) => {
    const message = getWarningMessage(hazard, colorblindnessType);
    
    // Speak the warning
    Speech.speak(message, {
      language: 'en',
      pitch: 1.0,
      rate: 1.2,
    });
  };

  const getWarningMessage = (hazard, cbType) => {
    const distance = hazard.distance || 'ahead';
    const direction = hazard.direction || 'in front';

    switch (hazard.type) {
      case 'traffic_light_red':
        if (cbType.includes('Protanopia') || cbType.includes('Deuteranopia')) {
          return `Warning: Red traffic light ${distance}. Stop required.`;
        }
        return `Red traffic light ${distance}`;

      case 'traffic_light_yellow':
        return `Yellow traffic light ${distance}. Prepare to stop.`;

      case 'traffic_light_green':
        return `Green traffic light ${distance}. Safe to proceed.`;

      case 'stop_sign':
        if (cbType.includes('Protanopia') || cbType.includes('Deuteranopia')) {
          return `Warning: Stop sign ${distance}. Red octagon ahead. Full stop required.`;
        }
        return `Stop sign ${distance}`;

      case 'brake_lights':
        if (cbType.includes('Protanopia') || cbType.includes('Deuteranopia')) {
          return `Warning: Vehicle braking ${direction}. Bright red lights detected. Reduce speed.`;
        }
        return `Vehicle braking ${direction}`;

      case 'emergency_vehicle':
        return `Emergency vehicle detected ${direction}. Pull over safely.`;

      default:
        return `Hazard detected ${direction}`;
    }
  };

  if (!permission) {
    return <View style={styles.container}><Text>Requesting camera permission...</Text></View>;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.permissionText}>Camera permission is required</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView style={styles.camera} ref={cameraRef} facing="back">
        <View style={styles.overlay}>
          <View style={styles.infoPanel}>
            <Text style={styles.infoText}>Type: {colorblindnessType}</Text>
            <Text style={styles.infoText}>
              Speed: {speed.toFixed(1)} km/h ({getSpeedMode(speed)})
            </Text>
            <Text style={styles.infoText}>
              Hazards: {detectedHazards.length}
            </Text>
          </View>

          {detectedHazards.map((hazard, index) => (
            <View
              key={index}
              style={[
                styles.hazardIndicator,
                { top: hazard.y || 100, left: hazard.x || 100 },
              ]}
            >
              <Text style={styles.hazardText}>{hazard.type}</Text>
            </View>
          ))}

          <View style={styles.bottomPanel}>
            <TouchableOpacity
              style={styles.recalibrateButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.recalibrateButtonText}>Recalibrate</Text>
            </TouchableOpacity>
          </View>
        </View>
      </CameraView>
    </View>
  );
}

const getSpeedMode = (speed) => {
  if (speed < 5) return 'Walking';
  if (speed < 25) return 'Biking';
  return 'Driving';
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
  },
  infoPanel: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 15,
    borderRadius: 10,
  },
  infoText: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 5,
    fontWeight: '600',
  },
  hazardIndicator: {
    position: 'absolute',
    backgroundColor: 'rgba(231, 76, 60, 0.8)',
    padding: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#fff',
  },
  hazardText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  bottomPanel: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  recalibrateButton: {
    backgroundColor: 'rgba(52, 152, 219, 0.9)',
    padding: 15,
    borderRadius: 10,
    minWidth: 150,
    alignItems: 'center',
  },
  recalibrateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  permissionText: {
    fontSize: 18,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#3498db',
    padding: 15,
    borderRadius: 10,
    minWidth: 200,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
