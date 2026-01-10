# Developer Guide - Delta Colorblind Hazard Detection

## Project Structure

```
delta/
├── App.js                          # Main app entry point with navigation
├── app.json                        # Expo configuration
├── package.json                    # Dependencies and scripts
├── babel.config.js                 # Babel configuration
├── validate.js                     # Structure validation script
├── assets/                         # App icons and images
├── src/
│   ├── screens/
│   │   ├── CalibrationScreen.js   # Ishihara test calibration
│   │   └── CameraScreen.js        # Main hazard detection view
│   ├── components/
│   │   └── IshiharaTest.js        # SVG-based colorblind test plates
│   └── utils/
│       ├── HazardDetector.js      # CV-based hazard detection
│       └── SpeedDetector.js       # GPS-based speed tracking
├── README.md                       # Main documentation
└── USAGE.md                        # User guide
```

## Architecture Overview

### Navigation Flow
```
CalibrationScreen → (user completes test) → CameraScreen
                                              ↓
                                         (can go back)
```

### Data Flow
1. **Calibration** → Determines colorblindness type → Passed to Camera
2. **Camera** → Takes photos → HazardDetector → Hazards array
3. **Speed** → GPS tracking → SpeedDetector → Speed value
4. **Warnings** → Hazards + Speed + CB Type → Audio output

## Key Components

### CalibrationScreen
- **Purpose**: Determine colorblindness type
- **State**: 
  - `currentTest`: Index of current test (0-4)
  - `answers`: Array of user responses
- **Tests**: 5 Ishihara-style tests
- **Output**: Colorblindness type string

### CameraScreen
- **Purpose**: Real-time hazard detection
- **State**:
  - `detectedHazards`: Array of hazard objects
  - `speed`: Current speed in km/h
  - `isProcessing`: Frame processing flag
- **Processing Loop**: 1 second intervals
- **Warning Logic**: Based on hazard type, CB type, and speed

### IshiharaTest
- **Purpose**: Render test plates
- **Technology**: SVG with colored circles
- **Tests**: 5 different patterns (1,2,3,4,5)
- **Colors**: 
  - Tests 1-4: Red-green (protanopia/deuteranopia)
  - Test 5: Blue-yellow (tritanopia)

### HazardDetector
- **Purpose**: Detect safety hazards in images
- **Current**: Simulated detection
- **Production**: TensorFlow Lite integration
- **Hazard Types**:
  - `traffic_light_red`
  - `traffic_light_yellow`
  - `traffic_light_green`
  - `stop_sign`
  - `brake_lights`
  - `emergency_vehicle`

### SpeedDetector
- **Purpose**: Track user speed
- **Technology**: expo-location GPS
- **Fallback**: Simulated speed (for testing)
- **Speed Modes**:
  - Walking: < 5 km/h
  - Biking: 5-25 km/h
  - Driving: > 25 km/h

## Warning System

### Warning Intervals (based on speed)
```javascript
walking:  5000ms  (5 seconds)
biking:   3000ms  (3 seconds)
driving:  1500ms  (1.5 seconds)
```

### Customized Messages
Messages are tailored based on colorblindness type:
- **Protanopia/Deuteranopia**: Enhanced warnings for red objects
- **Tritanopia**: Enhanced warnings for blue/yellow objects
- **Normal Vision**: Standard warnings

## Adding New Features

### Add a New Hazard Type

1. **Update HazardDetector.js**:
```javascript
// Add to hazardTypes array
const hazardTypes = [
  // ...existing types
  'new_hazard_type',
];

// Add detection method
async detectNewHazard(imageData) {
  // Detection logic
}
```

2. **Update CameraScreen.js**:
```javascript
const getWarningMessage = (hazard, cbType) => {
  switch (hazard.type) {
    // ...existing cases
    case 'new_hazard_type':
      return `Warning message for new hazard`;
  }
};
```

### Add a New Calibration Test

1. **Update CalibrationScreen.js**:
```javascript
const TESTS = [
  // ...existing tests
  {
    id: 6,
    correctAnswer: 'X',
    normalVision: 'X',
    protanopia: 'Y',
    deuteranopia: 'Z',
    tritanopia: 'X',
    description: 'New test description',
  },
];
```

2. **Update IshiharaTest.js**:
```javascript
const getPatternDots = (testId, centerX, centerY) => {
  switch (testId) {
    // ...existing cases
    case 6:
      // Draw pattern for new test
      break;
  }
};
```

## Testing

### Validate Structure
```bash
node validate.js
```

### Test in Expo Go
```bash
npm start
# Scan QR code with Expo Go app
```

### Test on Simulator/Emulator
```bash
npm run ios      # iOS Simulator (Mac only)
npm run android  # Android Emulator
```

## Performance Optimization

### Current Settings
- Frame processing: 1 second intervals
- Photo quality: 0.5 (50%)
- Skip processing: true (faster capture)

### For Production
- Reduce interval to 500ms or less
- Use lower resolution for faster processing
- Implement frame queue to prevent backing up
- Use Web Workers for TensorFlow inference

## Future Enhancements

### TensorFlow Lite Integration
```javascript
import * as tf from '@tensorflow/tfjs';
import { bundleResourceIO } from '@tensorflow/tfjs-react-native';

async initialize() {
  await tf.ready();
  const modelJson = require('./model/model.json');
  const modelWeights = require('./model/weights.bin');
  this.model = await tf.loadGraphModel(
    bundleResourceIO(modelJson, modelWeights)
  );
}
```

### Real-time Processing
- Use expo-camera's `onCameraReady` callback
- Process frames from video stream
- Implement frame skipping for performance

### Offline Support
- Bundle models in app
- Cache detection results
- Store user preferences locally

## Debugging Tips

### View Logs
```bash
# In Expo Dev Tools
# Click "Open Browser Console" to see logs
```

### Common Issues

**Camera not showing**:
- Check permissions in app.json
- Verify CameraView ref is set correctly

**Warnings not speaking**:
- Test Speech.speak() in isolation
- Check device volume and settings

**Speed always 0**:
- Verify location permissions
- Test on physical device (simulators may not have GPS)

## Contributing

When adding features:
1. Follow existing code style
2. Update documentation
3. Test on both iOS and Android
4. Ensure permissions are configured
5. Update validate.js if adding new files

## Resources

- [Expo Camera Docs](https://docs.expo.dev/versions/latest/sdk/camera/)
- [Expo Speech Docs](https://docs.expo.dev/versions/latest/sdk/speech/)
- [Expo Location Docs](https://docs.expo.dev/versions/latest/sdk/location/)
- [React Navigation Docs](https://reactnavigation.org/)
- [TensorFlow Lite](https://www.tensorflow.org/lite)
