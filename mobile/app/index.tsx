/**
 * Welcome/Onboarding Screen
 *
 * Light minimalist UI inspired by claudetempo.vercel.app and tomalmog.vercel.app
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS, SIZES, ColorblindnessType } from "../constants/accessibility";
import {
  getColorblindType,
  setColorblindType,
  completeOnboarding,
  isOnboardingComplete,
} from "../services/storage";
import { speak } from "../services/speech";
import { useAuth } from "../contexts/AuthContext";

type SelectableType = Exclude<ColorblindnessType, "unknown">;

const VISION_TYPES: {
  type: SelectableType;
  label: string;
  description: string;
}[] = [
  {
    type: "normal",
    label: "Normal Vision",
    description: "No color vision deficiency",
  },
  {
    type: "protanopia",
    label: "Protanopia",
    description: "Difficulty seeing red",
  },
  {
    type: "deuteranopia",
    label: "Deuteranopia",
    description: "Difficulty seeing green",
  },
  {
    type: "tritanopia",
    label: "Tritanopia",
    description: "Difficulty seeing blue/yellow",
  },
  {
    type: "low_vision",
    label: "Low Vision",
    description: "Prefer full audio descriptions",
  },
];

export default function WelcomeScreen() {
  const router = useRouter();
  const { user, isAuth, loading: authLoading } = useAuth();
  const [hasCompletedSetup, setHasCompletedSetup] = useState(false);
  const [userColorblindType, setUserColorblindType] =
    useState<ColorblindnessType>("unknown");
  const [selectedType, setSelectedType] =
    useState<ColorblindnessType>("normal");

  useEffect(() => {
    const completed = isOnboardingComplete();
    setHasCompletedSetup(completed);
    if (completed) {
      setUserColorblindType(getColorblindType());
    }
  }, []);

  if (authLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={COLORS.textPrimary} />
        </View>
      </SafeAreaView>
    );
  }

  const handleSelectType = (type: SelectableType) => {
    setSelectedType(type);
    setColorblindType(type);
    completeOnboarding();
    speak(getVisionTypeLabel(type) + " selected");
  };

  const handleTakeTest = () => {
    speak("Starting color vision assessment");
    router.push("/test");
  };

  const handleStartCamera = () => {
    if (selectedType !== "unknown") {
      setColorblindType(selectedType);
      completeOnboarding();
    }
    speak("Starting traffic signal detection");
    router.push("/camera");
  };

  const hasSelection = selectedType !== "unknown";

  // Completed setup - show home screen
  if (hasCompletedSetup) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.title}>TrueLight</Text>
            <Text style={styles.subtitle}>Color vision assistant</Text>
          </View>

          {user && <Text style={styles.userInfo}>{user.username}</Text>}

          <View style={styles.card}>
            <Text style={styles.cardLabel}>Current profile</Text>
            <Text style={styles.cardValue}>
              {getVisionTypeLabel(userColorblindType)}
            </Text>
          </View>

          <View style={styles.buttonGroup}>
            <Pressable
              style={styles.primaryButton}
              onPress={handleStartCamera}
              accessibilityRole="button"
              accessibilityLabel="Start detection"
            >
              <Text style={styles.primaryButtonText}>Start Detection</Text>
            </Pressable>

            <Pressable
              style={styles.textButton}
              onPress={() => {
                setHasCompletedSetup(false);
                speak("Changing settings");
              }}
              accessibilityRole="button"
            >
              <Text style={styles.textButtonText}>Change profile</Text>
            </Pressable>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Your data stays on your device
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // First-time onboarding
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>TrueLight</Text>
          <Text style={styles.subtitle}>Color vision assistant</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select your vision type</Text>

          <View style={styles.optionsContainer}>
            {VISION_TYPES.map(({ type, label, description }) => (
              <Pressable
                key={type}
                style={[
                  styles.optionButton,
                  selectedType === type && styles.optionButtonSelected,
                ]}
                onPress={() => handleSelectType(type)}
                accessibilityRole="button"
                accessibilityLabel={`${label}: ${description}`}
                accessibilityState={{ selected: selectedType === type }}
              >
                <View style={styles.optionContent}>
                  <Text
                    style={[
                      styles.optionLabel,
                      selectedType === type && styles.optionLabelSelected,
                    ]}
                  >
                    {label}
                  </Text>
                  <Text
                    style={[
                      styles.optionDescription,
                      selectedType === type && styles.optionDescriptionSelected,
                    ]}
                  >
                    {description}
                  </Text>
                </View>
                {selectedType === type && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </Pressable>
            ))}
          </View>
        </View>

        <Pressable
          style={styles.textButton}
          onPress={handleTakeTest}
          accessibilityRole="button"
        >
          <Text style={styles.textButtonText}>Not sure? Take a short test</Text>
        </Pressable>

        <View style={styles.spacer} />

        <Pressable
          style={[
            styles.primaryButton,
            !hasSelection && styles.primaryButtonDisabled,
          ]}
          onPress={handleStartCamera}
          disabled={!hasSelection}
          accessibilityRole="button"
          accessibilityState={{ disabled: !hasSelection }}
        >
          <Text
            style={[
              styles.primaryButtonText,
              !hasSelection && styles.primaryButtonTextDisabled,
            ]}
          >
            Continue
          </Text>
        </Pressable>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Your data stays on your device</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function getVisionTypeLabel(type: ColorblindnessType): string {
  switch (type) {
    case "normal":
      return "Normal Vision";
    case "protanopia":
      return "Protanopia";
    case "deuteranopia":
      return "Deuteranopia";
    case "tritanopia":
      return "Tritanopia";
    case "low_vision":
      return "Low Vision";
    default:
      return "Unknown";
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 48,
  },
  title: {
    fontSize: 32,
    fontWeight: "600",
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    fontWeight: "400",
  },
  userInfo: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 24,
  },
  description: {
    fontSize: 16,
    color: COLORS.textSecondary,
    lineHeight: 24,
    marginBottom: 40,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 16,
  },
  card: {
    backgroundColor: COLORS.backgroundSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 20,
    marginBottom: 32,
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: COLORS.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  cardValue: {
    fontSize: 18,
    fontWeight: "500",
    color: COLORS.textPrimary,
  },
  optionsContainer: {
    gap: 8,
  },
  optionButton: {
    backgroundColor: COLORS.backgroundSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  optionButtonSelected: {
    backgroundColor: COLORS.textPrimary,
    borderColor: COLORS.textPrimary,
  },
  optionContent: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: "500",
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  optionLabelSelected: {
    color: COLORS.background,
  },
  optionDescription: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  optionDescriptionSelected: {
    color: "rgba(250, 251, 252, 0.7)",
  },
  checkmark: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.background,
    marginLeft: 12,
  },
  buttonGroup: {
    gap: 12,
  },
  primaryButton: {
    backgroundColor: COLORS.buttonBackground,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonDisabled: {
    backgroundColor: COLORS.border,
  },
  primaryButtonText: {
    color: COLORS.buttonText,
    fontSize: 15,
    fontWeight: "500",
  },
  primaryButtonTextDisabled: {
    color: COLORS.textMuted,
  },
  textButton: {
    paddingVertical: 12,
    alignItems: "center",
  },
  textButtonText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: "400",
  },
  spacer: {
    flex: 1,
    minHeight: 32,
  },
  footer: {
    marginTop: 24,
    alignItems: "center",
  },
  footerText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
});
