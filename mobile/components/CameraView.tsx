/**
 * CameraView Component
 *
 * Captures camera frames and sends them to the backend for analysis.
 * Optimized for real-time traffic signal detection with hazard overlays.
 *
 * IMPLEMENTATION NOTES:
 * - Captures frames at configurable intervals (adaptive to speed)
 * - Compresses images to reduce upload size and latency
 * - Handles camera permissions gracefully
 * - Provides visual feedback during capture
 * - Shows hazard bounding boxes with priority colors
 * - Displays speed and transit mode indicator
 */

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import { CameraView as ExpoCameraView, useCameraPermissions } from 'expo-camera';
import { COLORS, SIZES, TIMING, SignalState, ColorblindnessType } from '../constants/accessibility';
import { detectSignal, DetectionResponse } from '../services/api';
import { speakSignalState, resetSpeechState } from '../services/speech';
import { SignalDisplay } from './SignalDisplay';
import { SpeedIndicator } from './SpeedIndicator';
import { HazardOverlay } from './HazardOverlay';
import { locationService, TransitMode, LocationState } from '../services/LocationService';
import { audioAlertService } from '../services/AudioAlertService';
import { mlService, Detection } from '../services/MLService';
import { filterHazardsForUser, PrioritizedHazard } from '../constants/hazardPriority';
import { getSettings } from '../services/storage';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Props {
  colorblindType: ColorblindnessType;
  onError?: (error: string) => void;
}

export function CameraViewComponent({ colorblindType, onError }: Props) {
  const cameraRef = useRef<ExpoCameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [isCapturing, setIsCapturing] = useState(true);
  const [currentState, setCurrentState] = useState<SignalState>('unknown');
  const [confidence, setConfidence] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const captureIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // New state for enhanced features
  const [speed, setSpeed] = useState(0);
  const [transitMode, setTransitMode] = useState<TransitMode>(TransitMode.STATIONARY);
  const [hazards, setHazards] = useState<PrioritizedHazard[]>([]);
  const [captureInterval, setCaptureInterval] = useState(TIMING.captureInterval);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [speedTrackingEnabled, setSpeedTrackingEnabled] = useState(true);

  // Load settings and initialize services
  useEffect(() => {
    const settings = getSettings();
    setAudioEnabled(settings.audioEnabled);
    setSpeedTrackingEnabled(settings.speedTrackingEnabled);
    audioAlertService.setEnabled(settings.audioEnabled);
    
    // Initialize ML service
    mlService.initialize();
    
    // Start location tracking if enabled
    if (settings.speedTrackingEnabled) {
      locationService.startTracking(handleLocationUpdate);
    }
    
    return () => {
      locationService.stopTracking();
    };
  }, []);

  // Handle location updates
  const handleLocationUpdate = useCallback((state: LocationState) => {
    setSpeed(state.speed);
    setTransitMode(state.mode);
    
    // Adjust capture interval based on speed
    const newInterval = locationService.getCaptureIntervalMs();
    if (newInterval !== captureInterval) {
      setCaptureInterval(newInterval);
    }
  }, [captureInterval]);

  // Capture and analyze a frame
  const captureFrame = useCallback(async () => {
    if (!cameraRef.current || isProcessing || !isCapturing) return;

    try {
      setIsProcessing(true);

      // Capture a photo with reduced quality for faster upload
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.3, // Low quality for speed
        skipProcessing: true, // Skip post-processing for speed
      });

      if (!photo?.base64) {
        throw new Error('Failed to capture image');
      }

      // Send to backend for analysis
      const result: DetectionResponse = await detectSignal(photo.base64);

      // Update state
      setCurrentState(result.state);
      setConfidence(result.confidence);

      // Get hazard detections from ML service
      const detections = await mlService.detectHazards(photo.base64);
      
      // Filter hazards based on user's colorblindness type
      const prioritizedHazards = filterHazardsForUser(detections, colorblindType, speed);
      setHazards(prioritizedHazards);

      // Speak alerts for hazards
      if (audioEnabled && result.confidence >= TIMING.minConfidenceToAnnounce) {
        // Use enhanced audio service for priority-based alerts
        await audioAlertService.speakSignalState(result.state, colorblindType);
        
        // Alert for other high-priority hazards
        for (const hazard of prioritizedHazards) {
          if (hazard.rule.priority === 'critical' || hazard.rule.priority === 'high') {
            const alert = audioAlertService.createAlertFromDetection(
              hazard,
              hazard.warningText,
              hazard.rule.priority
            );
            await audioAlertService.speakAlert(alert);
          }
        }
      }
    } catch (error) {
      console.error('Capture error:', error);
      onError?.(error instanceof Error ? error.message : 'Detection failed');
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, isCapturing, colorblindType, onError, audioEnabled, speed]);

  // Start/stop capture interval with adaptive timing
  useEffect(() => {
    if (isCapturing && permission?.granted) {
      // Reset speech state when starting
      resetSpeechState();
      audioAlertService.reset();

      // Start capture interval with adaptive timing
      captureIntervalRef.current = setInterval(captureFrame, captureInterval);
    }

    return () => {
      if (captureIntervalRef.current) {
        clearInterval(captureIntervalRef.current);
        captureIntervalRef.current = null;
      }
    };
  }, [isCapturing, permission?.granted, captureFrame, captureInterval]);

  // Handle permissions
  if (!permission) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>Checking camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>
          Delta needs camera access to detect traffic signals and help keep you safe.
        </Text>
        <Pressable
          style={styles.button}
          onPress={requestPermission}
          accessibilityRole="button"
          accessibilityLabel="Grant camera permission"
        >
          <Text style={styles.buttonText}>Enable Camera</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Camera preview */}
      <View style={styles.cameraContainer}>
        <ExpoCameraView
          ref={cameraRef}
          style={styles.camera}
          facing="back"
        >
          {/* Hazard bounding boxes overlay */}
          <HazardOverlay
            hazards={hazards}
            cameraWidth={SCREEN_WIDTH}
            cameraHeight={SCREEN_HEIGHT}
          />
          
          {/* Processing indicator */}
          {isProcessing && (
            <View style={styles.processingIndicator}>
              <View style={styles.processingDot} />
            </View>
          )}
        </ExpoCameraView>
      </View>

      {/* Speed indicator (top left) */}
      {speedTrackingEnabled && (
        <View style={styles.speedOverlay}>
          <SpeedIndicator mode={transitMode} speed={speed} compact />
        </View>
      )}

      {/* Audio toggle (top right) */}
      <Pressable
        style={[styles.audioToggle, !audioEnabled && styles.audioToggleOff]}
        onPress={() => {
          const newState = !audioEnabled;
          setAudioEnabled(newState);
          audioAlertService.setEnabled(newState);
        }}
        accessibilityRole="button"
        accessibilityLabel={audioEnabled ? 'Mute audio' : 'Enable audio'}
      >
        <Text style={styles.audioToggleText}>
          {audioEnabled ? '🔊' : '🔇'}
        </Text>
      </Pressable>

      {/* Signal display overlay */}
      <View style={styles.signalOverlay}>
        <SignalDisplay
          state={currentState}
          confidence={confidence}
          colorblindType={colorblindType}
        />
      </View>

      {/* Hazard count indicator */}
      {hazards.length > 0 && (
        <View style={styles.hazardCount}>
          <Text style={styles.hazardCountText}>
            {hazards.length} hazard{hazards.length !== 1 ? 's' : ''} detected
          </Text>
        </View>
      )}

      {/* Pause/Resume button */}
      <Pressable
        style={[styles.controlButton, !isCapturing && styles.controlButtonPaused]}
        onPress={() => setIsCapturing(!isCapturing)}
        accessibilityRole="button"
        accessibilityLabel={isCapturing ? 'Pause detection' : 'Resume detection'}
      >
        <Text style={styles.controlButtonText}>
          {isCapturing ? 'PAUSE' : 'RESUME'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  cameraContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  camera: {
    flex: 1,
  },
  speedOverlay: {
    position: 'absolute',
    top: 50,
    left: 16,
    zIndex: 10,
  },
  audioToggle: {
    position: 'absolute',
    top: 50,
    right: 60,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  audioToggleOff: {
    backgroundColor: 'rgba(255, 59, 48, 0.6)',
  },
  audioToggleText: {
    fontSize: 20,
  },
  hazardCount: {
    position: 'absolute',
    top: 100,
    alignSelf: 'center',
    backgroundColor: 'rgba(255, 149, 0, 0.8)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    zIndex: 10,
  },
  hazardCountText: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: 'bold',
  },
  processingIndicator: {
    position: 'absolute',
    top: 20,
    right: 20,
    padding: 8,
  },
  processingDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.red,
    opacity: 0.8,
  },
  signalOverlay: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingVertical: SIZES.spacingMedium,
  },
  controlButton: {
    position: 'absolute',
    bottom: 30,
    alignSelf: 'center',
    backgroundColor: COLORS.buttonBackground,
    paddingHorizontal: SIZES.spacingLarge,
    paddingVertical: SIZES.buttonPadding,
    borderRadius: SIZES.borderRadius,
    minWidth: 150,
    alignItems: 'center',
  },
  controlButtonPaused: {
    backgroundColor: COLORS.green,
  },
  controlButtonText: {
    color: COLORS.textPrimary,
    fontSize: SIZES.textMedium,
    fontWeight: 'bold',
  },
  message: {
    color: COLORS.textPrimary,
    fontSize: SIZES.textMedium,
    textAlign: 'center',
    marginHorizontal: SIZES.spacingLarge,
    marginBottom: SIZES.spacingLarge,
  },
  button: {
    backgroundColor: COLORS.green,
    paddingHorizontal: SIZES.spacingLarge,
    paddingVertical: SIZES.buttonPadding,
    borderRadius: SIZES.borderRadius,
  },
  buttonText: {
    color: COLORS.textPrimary,
    fontSize: SIZES.textMedium,
    fontWeight: 'bold',
  },
});
