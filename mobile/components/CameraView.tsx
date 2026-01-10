/**
 * CameraView Component
 *
 * Smart detection with local pre-filtering:
 * 1. Capture frames frequently (every 200ms)
 * 2. Run fast local color detection to check for traffic light colors
 * 3. Only call API if potential traffic light detected
 * 4. This reduces API calls and enables faster recognition
 */

import React, { useRef, useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import {
  CameraView as ExpoCameraView,
  useCameraPermissions,
} from "expo-camera";
import {
  COLORS,
  SIZES,
  TIMING,
  SignalState,
  ColorblindnessType,
  getSignalMessage,
} from "../constants/accessibility";
import { detectSignal, DetectionResponse } from "../services/api";
import { speakSignalState, resetSpeechState } from "../services/speech";
import { detectTrafficLightColors } from "../services/colorDetection";

// Timing configuration - optimized for driving
const SCAN_INTERVAL = 150; // Local color scan every 150ms
const MIN_API_INTERVAL = 250; // Don't call API more than once per 250ms
const FALLBACK_API_INTERVAL = 2000; // Call API every 2s even without detection (safety)

// Debug timing - set to true to see timing logs in console
const DEBUG_TIMING = __DEV__;

interface Props {
  colorblindType: ColorblindnessType;
  onError?: (error: string) => void;
}

export function CameraViewComponent({ colorblindType, onError }: Props) {
  const cameraRef = useRef<ExpoCameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [isCapturing, setIsCapturing] = useState(true);
  const [currentState, setCurrentState] = useState<SignalState>("unknown");
  const [confidence, setConfidence] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showApiIndicator, setShowApiIndicator] = useState(false);

  // Refs for timing control
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastApiCallRef = useRef<number>(0);
  const lastDetectionTimeRef = useRef<number>(0);
  const isScanningRef = useRef(false);

  // Flash the API indicator briefly
  const flashApiIndicator = useCallback(() => {
    setShowApiIndicator(true);
    setTimeout(() => setShowApiIndicator(false), 100);
  }, []);

  // Call the actual API for traffic light detection
  const callDetectionApi = useCallback(
    async (base64: string) => {
      const now = Date.now();

      // Throttle API calls
      if (now - lastApiCallRef.current < MIN_API_INTERVAL) {
        return;
      }

      if (isProcessing) return;

      try {
        setIsProcessing(true);
        lastApiCallRef.current = now;
        flashApiIndicator();

        const apiStart = Date.now();
        const result: DetectionResponse = await detectSignal(base64);

        if (DEBUG_TIMING) {
          console.log(
            `[API] Response in ${Date.now() - apiStart}ms, State: ${result.state}`,
          );
        }

        setCurrentState(result.state);
        setConfidence(result.confidence);

        if (result.confidence >= TIMING.minConfidenceToAnnounce) {
          await speakSignalState(result.state, colorblindType);
        }
      } catch (error) {
        console.error("API detection error:", error);
        onError?.(error instanceof Error ? error.message : "Detection failed");
      } finally {
        setIsProcessing(false);
      }
    },
    [isProcessing, colorblindType, onError, flashApiIndicator],
  );

  // Main scan loop - runs frequently, does local detection first
  const scanFrame = useCallback(async () => {
    if (!cameraRef.current || isScanningRef.current || !isCapturing) return;

    const frameStart = Date.now();
    isScanningRef.current = true;

    try {
      // Capture frame - use very low quality for speed, no visual interruption
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.1, // Very low quality = faster
        skipProcessing: true,
        shutterSound: false,
      });

      const captureTime = Date.now() - frameStart;

      if (!photo?.base64) {
        return;
      }

      // Run local color detection (fast)
      const colorStart = Date.now();
      const colorResult = await detectTrafficLightColors(photo.base64);
      const colorTime = Date.now() - colorStart;

      const now = Date.now();
      const timeSinceLastApi = now - lastApiCallRef.current;

      if (DEBUG_TIMING && colorResult.hasTrafficLightColors) {
        console.log(
          `[Scan] Capture: ${captureTime}ms, Color: ${colorTime}ms, Found: R${colorResult.redPercentage.toFixed(1)}% Y${colorResult.yellowPercentage.toFixed(1)}% G${colorResult.greenPercentage.toFixed(1)}%`,
        );
      }

      // Only call API when traffic light colors are detected
      if (colorResult.hasTrafficLightColors) {
        lastDetectionTimeRef.current = now;
        await callDetectionApi(photo.base64);
      }
    } catch (error) {
      // Silent fail - don't spam console
    } finally {
      isScanningRef.current = false;
    }
  }, [isCapturing, callDetectionApi, currentState]);

  // Start/stop scan loop
  useEffect(() => {
    if (isCapturing && permission?.granted) {
      resetSpeechState();
      lastApiCallRef.current = 0;
      lastDetectionTimeRef.current = 0;

      scanIntervalRef.current = setInterval(scanFrame, SCAN_INTERVAL);
    }

    return () => {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
        scanIntervalRef.current = null;
      }
    };
  }, [isCapturing, permission?.granted, scanFrame]);

  // Get color for detected state text only
  const getStateColor = () => {
    switch (currentState) {
      case "red":
        return COLORS.red;
      case "yellow":
        return COLORS.yellow;
      case "green":
        return COLORS.green;
      default:
        return COLORS.textSecondary;
    }
  };

  const getStateLabel = () => {
    switch (currentState) {
      case "red":
        return "Red";
      case "yellow":
        return "Yellow";
      case "green":
        return "Green";
      default:
        return "Scanning";
    }
  };

  const getActionText = () => {
    if (currentState === "unknown") {
      return "Point camera at traffic light";
    }
    return getSignalMessage(currentState, colorblindType);
  };

  // Permission states
  if (!permission) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.message}>Checking camera permission...</Text>
        </View>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.title}>Camera Access</Text>
          <Text style={styles.message}>
            TrueLight needs camera access to detect traffic signals.
          </Text>
          <Pressable
            style={styles.primaryButton}
            onPress={requestPermission}
            accessibilityRole="button"
            accessibilityLabel="Grant camera permission"
          >
            <Text style={styles.primaryButtonText}>Enable Camera</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.stateText, { color: getStateColor() }]}>
          {getStateLabel()}
        </Text>
        <Text style={styles.actionText}>{getActionText()}</Text>
      </View>

      {/* Camera - no visual interruption during capture */}
      <View style={styles.cameraContainer}>
        <ExpoCameraView
          ref={cameraRef}
          style={styles.camera}
          facing="back"
          autofocus="off"
        >
          {/* Small dev indicator - only flashes when API is called */}
          {showApiIndicator && (
            <View style={styles.devIndicator}>
              <View style={styles.devDot} />
            </View>
          )}
        </ExpoCameraView>
      </View>

      {/* Controls */}
      <View style={styles.footer}>
        <Pressable
          style={[
            styles.controlButton,
            !isCapturing && styles.controlButtonActive,
          ]}
          onPress={() => setIsCapturing(!isCapturing)}
          accessibilityRole="button"
          accessibilityLabel={
            isCapturing ? "Pause detection" : "Resume detection"
          }
        >
          <Text
            style={[
              styles.controlButtonText,
              !isCapturing && styles.controlButtonTextActive,
            ]}
          >
            {isCapturing ? "Pause" : "Resume"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: SIZES.spacingLarge,
  },
  header: {
    paddingTop: 70,
    paddingHorizontal: SIZES.spacingLarge,
    paddingBottom: SIZES.spacingMedium,
  },
  stateText: {
    fontSize: SIZES.textXL,
    fontWeight: "600",
    letterSpacing: -1,
    marginBottom: 4,
  },
  actionText: {
    fontSize: SIZES.textMedium,
    color: COLORS.textSecondary,
  },
  cameraContainer: {
    flex: 1,
    marginHorizontal: SIZES.spacingLarge,
    marginBottom: SIZES.spacingMedium,
    borderRadius: SIZES.borderRadius,
    overflow: "hidden",
    backgroundColor: COLORS.textPrimary,
  },
  camera: {
    flex: 1,
  },
  devIndicator: {
    position: "absolute",
    top: 8,
    right: 8,
  },
  devDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#00FF00",
  },
  footer: {
    paddingHorizontal: SIZES.spacingLarge,
    paddingBottom: SIZES.spacingLarge,
  },
  controlButton: {
    backgroundColor: COLORS.backgroundSecondary,
    paddingVertical: SIZES.buttonPadding,
    borderRadius: SIZES.borderRadius,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  controlButtonActive: {
    backgroundColor: COLORS.buttonBackground,
    borderColor: COLORS.buttonBackground,
  },
  controlButtonText: {
    color: COLORS.textPrimary,
    fontSize: SIZES.textMedium,
    fontWeight: "500",
  },
  controlButtonTextActive: {
    color: COLORS.buttonText,
  },
  title: {
    fontSize: SIZES.textLarge,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: SIZES.spacingSmall,
  },
  message: {
    fontSize: SIZES.textMedium,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginBottom: SIZES.spacingLarge,
    lineHeight: 26,
  },
  primaryButton: {
    backgroundColor: COLORS.buttonBackground,
    paddingVertical: SIZES.buttonPadding,
    paddingHorizontal: SIZES.spacingLarge * 2,
    borderRadius: SIZES.borderRadius,
  },
  primaryButtonText: {
    color: COLORS.buttonText,
    fontSize: SIZES.textMedium,
    fontWeight: "600",
  },
});
