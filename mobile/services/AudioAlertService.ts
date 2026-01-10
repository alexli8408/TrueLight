/**
 * Audio Alert Service
 *
 * Enhanced audio feedback system with priority-based alerts,
 * smart queuing, and cooldown management to prevent alert spam.
 *
 * FEATURES:
 * - Priority-based alert system (critical, high, medium)
 * - Interrupt capability for critical alerts
 * - Cooldown to prevent repeated alerts for same hazard
 * - Different voice characteristics by priority
 * - Queue management for non-critical alerts
 */

import * as Speech from 'expo-speech';
import { SignalState, ColorblindnessType, getSignalMessage, TIMING } from '../constants/accessibility';
import type { Detection } from './MLService';

export type AlertPriority = 'critical' | 'high' | 'medium' | 'low';

export interface Alert {
  id: string;
  message: string;
  priority: AlertPriority;
  timestamp: number;
  hazardType?: string;
}

interface AlertHistoryEntry {
  id: string;
  lastAlertTime: number;
}

class AudioAlertService {
  private isCurrentlySpeaking: boolean = false;
  private alertQueue: Alert[] = [];
  private alertHistory: Map<string, AlertHistoryEntry> = new Map();
  private isEnabled: boolean = true;
  private lastSpokenState: SignalState | null = null;
  private lastSpokenTime: number = 0;

  // Cooldown times by priority (ms)
  private cooldowns = {
    critical: 3000,
    high: 5000,
    medium: 8000,
    low: 10000,
  };

  // Voice settings by priority
  private voiceSettings = {
    critical: { pitch: 1.2, rate: 1.1 },   // Higher pitch, faster
    high: { pitch: 1.1, rate: 1.0 },
    medium: { pitch: 1.0, rate: 1.0 },
    low: { pitch: 0.9, rate: 0.9 },        // Lower pitch, slower
  };

  /**
   * Speak a prioritized alert
   */
  async speakAlert(alert: Alert): Promise<void> {
    if (!this.isEnabled) return;

    // Check cooldown
    if (!this.shouldPlayAlert(alert.id, this.cooldowns[alert.priority])) {
      return;
    }

    // Critical alerts interrupt current speech
    if (alert.priority === 'critical' && this.isCurrentlySpeaking) {
      await Speech.stop();
    }

    // Add to queue based on priority
    if (this.isCurrentlySpeaking && alert.priority !== 'critical') {
      this.queueAlert(alert);
      return;
    }

    await this.playAlert(alert);
  }

  /**
   * Play an alert immediately
   */
  private async playAlert(alert: Alert): Promise<void> {
    this.isCurrentlySpeaking = true;
    const settings = this.voiceSettings[alert.priority];

    // Record this alert
    this.alertHistory.set(alert.id, {
      id: alert.id,
      lastAlertTime: Date.now(),
    });

    try {
      await new Promise<void>((resolve) => {
        Speech.speak(alert.message, {
          language: 'en-US',
          pitch: settings.pitch,
          rate: settings.rate,
          onDone: () => {
            this.isCurrentlySpeaking = false;
            resolve();
            this.processQueue();
          },
          onError: () => {
            this.isCurrentlySpeaking = false;
            resolve();
            this.processQueue();
          },
        });
      });
    } catch (error) {
      console.error('Speech error:', error);
      this.isCurrentlySpeaking = false;
    }
  }

  /**
   * Queue an alert for later playback
   */
  private queueAlert(alert: Alert): void {
    // Remove lower priority duplicates
    this.alertQueue = this.alertQueue.filter(
      a => a.id !== alert.id || this.getPriorityScore(a.priority) > this.getPriorityScore(alert.priority)
    );

    // Insert by priority
    const insertIndex = this.alertQueue.findIndex(
      a => this.getPriorityScore(a.priority) < this.getPriorityScore(alert.priority)
    );

    if (insertIndex === -1) {
      this.alertQueue.push(alert);
    } else {
      this.alertQueue.splice(insertIndex, 0, alert);
    }

    // Limit queue size
    if (this.alertQueue.length > 5) {
      this.alertQueue = this.alertQueue.slice(0, 5);
    }
  }

  /**
   * Process the next alert in queue
   */
  private processQueue(): void {
    if (this.alertQueue.length === 0 || this.isCurrentlySpeaking) return;

    const nextAlert = this.alertQueue.shift();
    if (nextAlert && this.shouldPlayAlert(nextAlert.id, this.cooldowns[nextAlert.priority])) {
      this.playAlert(nextAlert);
    } else {
      // Try next alert
      this.processQueue();
    }
  }

  /**
   * Check if enough time has passed since last alert
   */
  shouldPlayAlert(hazardId: string, cooldownMs: number): boolean {
    const now = Date.now();
    const entry = this.alertHistory.get(hazardId);

    if (!entry) return true;

    return now - entry.lastAlertTime >= cooldownMs;
  }

  /**
   * Get numeric priority score for sorting
   */
  private getPriorityScore(priority: AlertPriority): number {
    const scores = { critical: 4, high: 3, medium: 2, low: 1 };
    return scores[priority] || 0;
  }

  /**
   * Speak traffic signal state (maintains compatibility with existing app)
   */
  async speakSignalState(
    state: SignalState,
    colorblindType: ColorblindnessType,
    force = false
  ): Promise<void> {
    const now = Date.now();

    // Skip if same state was announced recently
    if (
      !force &&
      state === this.lastSpokenState &&
      now - this.lastSpokenTime < TIMING.audioDebounce
    ) {
      return;
    }

    if (state === 'unknown') return;

    const message = getSignalMessage(state, colorblindType);
    if (!message) return;

    // Determine priority based on signal state
    let priority: AlertPriority = 'high';
    if (state === 'red') priority = 'critical';
    if (state === 'green') priority = 'medium';

    await this.speakAlert({
      id: `signal_${state}`,
      message,
      priority,
      timestamp: now,
      hazardType: 'traffic_light',
    });

    this.lastSpokenState = state;
    this.lastSpokenTime = now;
  }

  /**
   * Generate alert from detection
   */
  createAlertFromDetection(
    detection: Detection,
    warningText: string,
    priority: AlertPriority
  ): Alert {
    return {
      id: this.generateHazardId(detection),
      message: warningText,
      priority,
      timestamp: Date.now(),
      hazardType: detection.type,
    };
  }

  /**
   * Generate unique ID for a hazard based on location
   */
  private generateHazardId(detection: Detection): string {
    const { bbox, type } = detection;
    const centerX = Math.round((bbox.x + bbox.width / 2) * 10);
    const centerY = Math.round((bbox.y + bbox.height / 2) * 10);
    return `${type}-${centerX}-${centerY}`;
  }

  /**
   * Speak a custom message
   */
  async speak(message: string, priority: AlertPriority = 'medium'): Promise<void> {
    await this.speakAlert({
      id: `custom_${Date.now()}`,
      message,
      priority,
      timestamp: Date.now(),
    });
  }

  /**
   * Stop all audio
   */
  async stop(): Promise<void> {
    await Speech.stop();
    this.isCurrentlySpeaking = false;
    this.alertQueue = [];
  }

  /**
   * Enable/disable audio alerts
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    if (!enabled) {
      this.stop();
    }
  }

  /**
   * Check if audio is enabled
   */
  isAudioEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Update cooldown settings
   */
  setCooldowns(cooldowns: Partial<typeof this.cooldowns>): void {
    this.cooldowns = { ...this.cooldowns, ...cooldowns };
  }

  /**
   * Reset state (useful when resuming app)
   */
  reset(): void {
    this.lastSpokenState = null;
    this.lastSpokenTime = 0;
    this.alertHistory.clear();
    this.alertQueue = [];
  }

  /**
   * Check if currently speaking
   */
  async isSpeaking(): Promise<boolean> {
    return await Speech.isSpeakingAsync();
  }

  /**
   * Clear alert history for a specific hazard
   */
  clearAlertHistory(hazardId?: string): void {
    if (hazardId) {
      this.alertHistory.delete(hazardId);
    } else {
      this.alertHistory.clear();
    }
  }
}

// Singleton instance
export const audioAlertService = new AudioAlertService();
