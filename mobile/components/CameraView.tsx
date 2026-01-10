/**
 * CameraView Component
 *
 * Captures camera frames and sends them to the backend for analysis.
 * Optimized for real-time traffic signal detection with dashcam features.
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
  getSignalMessage,
} from "../constants/accessibility";
import { detectSignal, DetectionResponse } from "../services/api";
import { speakSignalState, resetSpeechState } from "../services/speech";
import { useAppStore, ColorBlindnessType } from "../store/useAppStore";

interface Props {
  colorblindType: ColorBlindnessType;
  onError?: (error: string) => void;
  onDetection?: (state: SignalState, confidence: number) => void;
}

export function CameraViewComponent({
  colorblindType,
  onError,
  onDetection,
}: Props) {
  const cameraRef = useRef<ExpoCameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [isCapturing, setIsCapturing] = useState(true);
  const [currentState, setCurrentState] = useState<SignalState>("unknown");
  const [confidence, setConfidence] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const captureIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Get settings from store
  const { alertSettings, transportSettings } = useAppStore();

  // Calculate frame interval based on transport mode
  const frameInterval =
    transportSettings.modeConfig[transportSettings.currentMode]
      .frameProcessingIntervalMs;

  // Capture and analyze a frame
  const captureFrame = useCallback(async () => {
    if (!cameraRef.current || isProcessing || !isCapturing) return;

    try {
      setIsProcessing(true);

      // Capture a photo with reduced quality for faster upload
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.3,
        skipProcessing: true,
        shutterSound: false,
      });

      if (!photo?.base64) {
        throw new Error("Failed to capture image");
      }

      // Send to backend for analysis
      const result: DetectionResponse = await detectSignal(photo.base64);

      // Update state
      setCurrentState(result.state);
      setConfidence(result.confidence);

      // Notify parent component
      onDetection?.(result.state, result.confidence);

      // Speak the result if confidence is high enough
      if (result.confidence >= alertSettings.minConfidenceToAlert) {
        await speakSignalState(
          result.state,
          colorblindType as any, // Type compatibility
          alertSettings.positionCuesEnabled
        );
      }
    } catch (error) {
      console.error("Capture error:", error);
      onError?.(error instanceof Error ? error.message : "Detection failed");
    } finally {
      setIsProcessing(false);
    }
  }, [
    isProcessing,
    isCapturing,
    colorblindType,
    onError,
    onDetection,
    alertSettings.minConfidenceToAlert,
    alertSettings.positionCuesEnabled,
  ]);

  // Start/stop capture interval
  useEffect(() => {
    if (isCapturing && permission?.granted) {
      resetSpeechState();
      captureIntervalRef.current = setInterval(captureFrame, frameInterval);
    }

    return () => {
      if (captureIntervalRef.current) {
        clearInterval(captureIntervalRef.current);
        captureIntervalRef.current = null;
      }
    };
  }, [isCapturing, permission?.granted, captureFrame, frameInterval]);

  // Get display info based on state
  const getStateColor = () => {
    switch (currentState) {
      case "red":
        return COLORS.red;
      case "yellow":
        return COLORS.yellow;
      case "green":
        return COLORS.green;
      default:
        return COLORS.unknown;
    }
  };

  const getStateLabel = () => {
    switch (currentState) {
      case "red":
        return "RED";
      case "yellow":
        return "YELLOW";
      case "green":
        return "GREEN";
      default:
        return "SCANNING";
    }
  };

  const getActionText = () => {
    if (currentState === "unknown") {
      return "Point camera at traffic light";
    }
    // Use position cues based on settings
    return getSignalMessage(
      currentState,
      alertSettings.positionCuesEnabled ? "protanopia" : "normal"
    );
  };

  // Get shape indicator for colorblind users
  const getShapeIndicator = () => {
    if (!alertSettings.shapeCuesEnabled) return null;

    switch (currentState) {
      case "red":
        return <View style={[styles.shapeSquare, { backgroundColor: COLORS.red }]} />;
      case "yellow":
        return <View style={[styles.shapeCircle, { backgroundColor: COLORS.yellow }]} />;
      case "green":
        return <View style={[styles.shapeTriangle, { borderBottomColor: COLORS.green }]} />;
      default:
        return null;
    }
  };

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
          Delta needs camera access to detect traffic signals and help keep you
          safe.
        </Text>
        <Pressable
          style={styles.permissionButton}
          onPress={requestPermission}
          accessibilityRole="button"
          accessibilityLabel="Grant camera permission"
        >
          <Text style={styles.permissionButtonText}>Enable Camera</Text>
        </Pressable>
      </View>
    );
  }

  const stateColor = getStateColor();

  return (
    <View style={styles.container}>
      {/* Camera preview - full screen for dashcam mode */}
      <ExpoCameraView ref={cameraRef} style={styles.camera} facing="back">
        {/* Status overlay at top */}
        <View style={styles.statusOverlay}>
          {/* State indicator with optional shape */}
          <View style={styles.stateRow}>
            {getShapeIndicator()}
            <View
              style={[styles.stateIndicator, { backgroundColor: stateColor }]}
            >
              <Text style={styles.stateText}>{getStateLabel()}</Text>
            </View>
          </View>

          {/* Action description */}
          {currentState !== "unknown" && (
            <View style={[styles.actionBar, { borderColor: stateColor }]}>
              <Text style={styles.actionText}>{getActionText()}</Text>
            </View>
          )}
        </View>

        {/* Processing indicator */}
        {isProcessing && (
          <View style={styles.processingIndicator}>
            <View
              style={[styles.processingDot, { backgroundColor: stateColor }]}
            />
          </View>
        )}

        {/* Confidence indicator */}
        {currentState !== "unknown" && (
          <View style={styles.confidenceBar}>
            <View
              style={[
                styles.confidenceFill,
                {
                  width: `${confidence * 100}%`,
                  backgroundColor: stateColor,
                },
              ]}
            />
          </View>
        )}
      </ExpoCameraView>

      {/* Pause/Resume control - minimal for dashcam mode */}
      <View style={styles.controlOverlay}>
        <Pressable
          style={[
            styles.controlButton,
            !isCapturing && styles.controlButtonPaused,
          ]}
          onPress={() => setIsCapturing(!isCapturing)}
          accessibilityRole="button"
          accessibilityLabel={
            isCapturing ? "Pause detection" : "Resume detection"
          }
        >
          <Text style={styles.controlButtonText}>
            {isCapturing ? "||" : "▶"}
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
  camera: {
    flex: 1,
  },
  statusOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 60,
    paddingHorizontal: SIZES.spacingMedium,
    paddingBottom: SIZES.spacingMedium,
  },
  stateRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SIZES.spacingSmall,
    marginBottom: SIZES.spacingSmall,
  },
  stateIndicator: {
    paddingHorizontal: SIZES.spacingLarge * 2,
    paddingVertical: SIZES.spacingMedium,
    borderRadius: SIZES.borderRadius,
  },
  stateText: {
    color: COLORS.background,
    fontSize: SIZES.textXL,
    fontWeight: "bold",
    letterSpacing: 4,
    textAlign: "center",
  },
  // Shape indicators for colorblind users
  shapeSquare: {
    width: 32,
    height: 32,
    borderRadius: 4,
  },
  shapeCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  shapeTriangle: {
    width: 0,
    height: 0,
    backgroundColor: "transparent",
    borderLeftWidth: 16,
    borderRightWidth: 16,
    borderBottomWidth: 32,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
  },
  actionBar: {
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    paddingVertical: SIZES.spacingMedium,
    paddingHorizontal: SIZES.spacingLarge,
    borderRadius: SIZES.borderRadius,
    borderWidth: 2,
  },
  actionText: {
    color: COLORS.textPrimary,
    fontSize: SIZES.textMedium,
    textAlign: "center",
    fontWeight: "500",
  },
  processingIndicator: {
    position: "absolute",
    top: 16,
    right: 16,
  },
  processingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    opacity: 0.9,
  },
  confidenceBar: {
    position: "absolute",
    bottom: 80,
    left: SIZES.spacingLarge,
    right: SIZES.spacingLarge,
    height: 4,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 2,
  },
  confidenceFill: {
    height: "100%",
    borderRadius: 2,
  },
  controlOverlay: {
    position: "absolute",
    bottom: 20,
    left: 20,
  },
  controlButton: {
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  controlButtonPaused: {
    backgroundColor: COLORS.green,
  },
  controlButtonText: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: "bold",
  },
  message: {
    color: COLORS.textPrimary,
    fontSize: SIZES.textMedium,
    textAlign: "center",
    marginHorizontal: SIZES.spacingLarge,
    marginBottom: SIZES.spacingLarge,
    marginTop: 100,
  },
  permissionButton: {
    alignSelf: "center",
    backgroundColor: COLORS.green,
    paddingHorizontal: SIZES.spacingLarge,
    paddingVertical: SIZES.buttonPadding,
    borderRadius: SIZES.borderRadius,
  },
  permissionButtonText: {
    color: COLORS.textPrimary,
    fontSize: SIZES.textMedium,
    fontWeight: "bold",
  },
});
