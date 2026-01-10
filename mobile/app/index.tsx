/**
 * Welcome/Onboarding Screen
 *
 * Entry point that either:
 * - Shows onboarding for first-time users
 * - Redirects to main app for returning users
 */

import React from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { useRouter, Redirect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS, SIZES } from "../constants/accessibility";
import { useAppStore } from "../store/useAppStore";
import { speak } from "../services/speech";

export default function WelcomeScreen() {
  const router = useRouter();
  const { hasCompletedOnboarding, setOnboardingComplete, setColorVisionProfile } =
    useAppStore();

  // If user has completed onboarding, redirect to main app
  if (hasCompletedOnboarding) {
    return <Redirect href="/(tabs)/dashcam" />;
  }

  const handleGetStarted = () => {
    speak("Let's set up Delta for you.");
    router.push("/(tabs)/profile/test");
  };

  const handleSkip = () => {
    // Set to low vision mode for maximum assistance
    setColorVisionProfile({
      type: "low_vision",
      severity: "moderate",
      confidence: 0.5,
      testDate: null,
      problematicColors: {
        red: true,
        green: true,
        blue: true,
        yellow: true,
      },
    });
    setOnboardingComplete(true);
    speak("Using enhanced audio mode for maximum assistance.");
    router.replace("/(tabs)/dashcam");
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Logo/Title */}
        <View style={styles.header}>
          <Text style={styles.logo}>DELTA</Text>
          <Text style={styles.tagline}>Your Eyes on the Road</Text>
        </View>

        {/* Description */}
        <View style={styles.descriptionContainer}>
          <Text style={styles.description}>
            Delta is a dashcam app designed for people with color blindness and
            visual impairments.
          </Text>

          <View style={styles.featureList}>
            <FeatureItem
              icon="C"
              title="Smart Detection"
              description="Identifies traffic signals, stop signs, brake lights, and more"
            />
            <FeatureItem
              icon="V"
              title="Voice Alerts"
              description="Clear audio notifications for hazards you might miss"
            />
            <FeatureItem
              icon="P"
              title="Personalized"
              description="Adapts to your specific color vision needs"
            />
            <FeatureItem
              icon="M"
              title="Multi-Mode"
              description="Works for driving, biking, walking, and more"
            />
          </View>
        </View>

        {/* Quick Vision Test Prompt */}
        <View style={styles.testPrompt}>
          <Text style={styles.testPromptTitle}>
            Quick Color Vision Assessment
          </Text>
          <Text style={styles.testPromptText}>
            Take a 1-2 minute test to help us customize alerts for your vision.
            This isn't a medical diagnosis — it helps personalize your
            experience.
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <Pressable
            style={styles.primaryButton}
            onPress={handleGetStarted}
            accessibilityRole="button"
            accessibilityLabel="Get started with vision test"
          >
            <Text style={styles.primaryButtonText}>GET STARTED</Text>
          </Pressable>

          <Pressable
            style={styles.secondaryButton}
            onPress={handleSkip}
            accessibilityRole="button"
            accessibilityLabel="Skip test and use enhanced audio mode"
          >
            <Text style={styles.secondaryButtonText}>
              Skip & Use Enhanced Audio
            </Text>
          </Pressable>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          Your data stays on your device. No account required.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function FeatureItem({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <View style={styles.featureItem}>
      <View style={styles.featureIcon}>
        <Text style={styles.featureIconText}>{icon}</Text>
      </View>
      <View style={styles.featureContent}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDescription}>{description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
    padding: SIZES.spacingLarge,
    justifyContent: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: SIZES.spacingLarge * 2,
  },
  logo: {
    fontSize: 64,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    letterSpacing: 12,
  },
  tagline: {
    fontSize: SIZES.textMedium,
    color: COLORS.green,
    marginTop: SIZES.spacingSmall,
  },
  descriptionContainer: {
    marginBottom: SIZES.spacingLarge,
  },
  description: {
    fontSize: SIZES.textSmall,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: SIZES.spacingLarge,
  },
  featureList: {
    gap: SIZES.spacingMedium,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: COLORS.backgroundSecondary,
    padding: SIZES.spacingMedium,
    borderRadius: SIZES.borderRadius,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.green,
    alignItems: "center",
    justifyContent: "center",
    marginRight: SIZES.spacingMedium,
  },
  featureIconText: {
    color: COLORS.background,
    fontSize: 18,
    fontWeight: "bold",
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: SIZES.textSmall,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  featureDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  testPrompt: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: SIZES.borderRadius,
    padding: SIZES.spacingLarge,
    marginBottom: SIZES.spacingLarge,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.green,
  },
  testPromptTitle: {
    fontSize: SIZES.textSmall,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    marginBottom: SIZES.spacingSmall,
  },
  testPromptText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  buttonContainer: {
    gap: SIZES.spacingMedium,
    marginBottom: SIZES.spacingLarge,
  },
  primaryButton: {
    backgroundColor: COLORS.green,
    paddingVertical: SIZES.buttonPadding,
    borderRadius: SIZES.borderRadius,
    alignItems: "center",
  },
  primaryButtonText: {
    color: COLORS.background,
    fontSize: SIZES.textMedium,
    fontWeight: "bold",
    letterSpacing: 2,
  },
  secondaryButton: {
    backgroundColor: "transparent",
    paddingVertical: SIZES.buttonPadding,
    borderRadius: SIZES.borderRadius,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: COLORS.textSecondary,
    fontSize: SIZES.textSmall,
  },
  footer: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "center",
    opacity: 0.6,
  },
});
