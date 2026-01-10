# Usage Guide - Delta Colorblind Hazard Detection

## Getting Started

### First Time Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Start Development Server**
   ```bash
   npm start
   ```
   This will open Expo Dev Tools in your browser.

3. **Run on Device/Emulator**
   - **iOS Simulator** (Mac only): Press `i` in terminal or click "Run on iOS simulator" in Expo Dev Tools
   - **Android Emulator**: Press `a` in terminal or click "Run on Android emulator" in Expo Dev Tools
   - **Physical Device**: Install "Expo Go" app from App/Play Store and scan the QR code

## App Walkthrough

### 1. Calibration Screen

When you first launch the app, you'll see the calibration screen.

**Purpose**: Determine your type of colorblindness to customize warnings.

**Steps**:
1. Look at the colored dot patterns (Ishihara-style tests)
2. Select what number you see (or "No number visible")
3. Complete all 5 tests
4. The app will analyze your responses and determine:
   - Normal Vision
   - Protanopia (Red-Blind)
   - Deuteranopia (Green-Blind)
   - Tritanopia (Blue-Blind)

**Skip Option**: You can skip calibration if desired. The app will default to Deuteranopia (most common).

### 2. Camera/Hazard Detection Screen

After calibration, you'll enter the main hazard detection screen.

**Features**:

- **Live Camera Feed**: Shows real-time view from your device's rear camera
- **Info Panel** (top): Displays:
  - Your colorblindness type
  - Current speed (km/h)
  - Speed mode (Walking/Biking/Driving)
  - Number of detected hazards

- **Hazard Indicators**: Visual boxes appear on detected hazards
- **Audio Warnings**: Automatic text-to-speech alerts

**Recalibrate**: Tap the "Recalibrate" button to return to calibration screen

## Hazard Types Detected

1. **Traffic Lights**
   - Red: "Warning: Red traffic light ahead. Stop required."
   - Yellow: "Yellow traffic light ahead. Prepare to stop."
   - Green: "Green traffic light ahead. Safe to proceed."

2. **Stop Signs**
   - Enhanced warnings for red-green colorblind users
   - Describes shape: "Red octagon ahead"

3. **Brake Lights**
   - Detects vehicles braking ahead
   - Enhanced for red-blind users: "Bright red lights detected"

4. **Emergency Vehicles**
   - Critical alerts for ambulances, fire trucks, police cars
   - "Emergency vehicle detected. Pull over safely."

## Warning Timing

The app adjusts warning frequency based on your speed:

- **Walking** (< 5 km/h): Warnings every 5 seconds
- **Biking** (5-25 km/h): Warnings every 3 seconds
- **Driving** (> 25 km/h): Warnings every 1.5 seconds

This prevents warning fatigue while ensuring timely alerts.

## Permissions Required

### iOS
- **Camera**: Required for hazard detection
- **Location**: Required for speed detection
- **Speech**: Built-in (no permission needed)

### Android
- **CAMERA**: Required for hazard detection
- **ACCESS_FINE_LOCATION**: Required for speed detection
- **ACCESS_COARSE_LOCATION**: Backup for speed detection

The app will request these permissions on first use.

## Tips for Best Results

1. **Hold Device Steady**: Keep camera pointed in direction of travel
2. **Good Lighting**: Detection works best in daylight
3. **Clean Camera Lens**: Ensure camera is not obstructed
4. **Volume Up**: Ensure device volume is high enough to hear warnings
5. **Don't Rely Solely**: This is an assistive tool, not a replacement for attention

## Troubleshooting

### No Camera View
- Check camera permission in device settings
- Ensure no other app is using the camera
- Restart the app

### No Audio Warnings
- Check device volume
- Verify app has microphone permission (some devices)
- Check Do Not Disturb settings

### Speed Shows 0
- Check location permission
- Ensure GPS is enabled
- Try moving to open area for better GPS signal
- Note: Simulated speed is used in development mode

### Hazards Not Detected
- Current version uses simulated detection for demonstration
- Production version would use TensorFlow Lite for real detection
- Ensure good lighting and clear view

## Development Notes

### Current Implementation
The current version uses **simulated hazard detection** for demonstration purposes. This means:
- Hazards are randomly generated for testing
- Detection is not based on actual computer vision
- Perfect for UI/UX testing and development

### Production Implementation
For real-world use, the following would be implemented:
- TensorFlow Lite models for object detection
- Real-time frame processing and analysis
- Trained models for traffic lights, signs, vehicles
- Color-based detection algorithms
- Temporal filtering for stable detection

## Support

For issues or questions:
- Check the README.md for technical details
- Review app.json for configuration
- See validate.js for structure verification

## Safety Disclaimer

**IMPORTANT**: This app is an assistive tool and should NOT be used as the sole means of hazard detection. Always maintain visual awareness and follow traffic laws. The app is designed to supplement, not replace, your natural awareness and judgment.
