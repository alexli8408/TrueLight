/**
 * Audio Alert Service
 *
 * Manages voice alerts for detected objects with problematic colors.
 * Only alerts for colors the user cannot see well.
 */

import { speak, stopSpeaking } from './speech';

class AudioAlertServiceClass {
  private enabled: boolean = true;
  private lastAlertTime: number = 0;
  private cooldownMs: number = 2000; // Minimum time between alerts
  
  /**
   * Enable or disable audio alerts
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      stopSpeaking();
    }
  }
  
  /**
   * Check if audio alerts are enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }
  
  /**
   * Set cooldown between alerts
   */
  setCooldown(ms: number): void {
    this.cooldownMs = ms;
  }
  
  /**
   * Set cooldowns (alias for setCooldown)
   */
  setCooldowns(ms: number): void {
    this.cooldownMs = ms;
  }
  
  /**
   * Alert if cooldown has passed
   */
  alert(message: string): boolean {
    if (!this.enabled) return false;
    
    const now = Date.now();
    if (now - this.lastAlertTime < this.cooldownMs) {
      return false;
    }
    
    this.lastAlertTime = now;
    speak(message);
    return true;
  }
  
  /**
   * Force alert regardless of cooldown (for critical alerts)
   */
  criticalAlert(message: string): void {
    if (!this.enabled) return;
    stopSpeaking();
    this.lastAlertTime = Date.now();
    speak(message);
  }
}

export const audioAlertService = new AudioAlertServiceClass();
