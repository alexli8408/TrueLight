# TrueLight - AI-Powered Navigation Assistant for Colorblind Users

## Inspiration
After browsing r/colorblind on Reddit, we discovered countless posts from colorblind individuals sharing their struggles with everyday navigation. One user wrote: "I failed my driving test twice because I couldn't tell if the light was red or green in the bright sunlight." Another shared: "I can't tell when brake lights are on, so I keep too much distance and get honked at." A cyclist posted: "I've nearly been hit crossing at signals because I can't distinguish red from green in certain lighting."

The statistics are staggering: 300 million people worldwide are colorblind (about 8% of men and 0.5% of women), yet there are virtually no real-time assistive tools for safe navigation. Existing solutions like colorblind glasses are expensive ($300+) and don't work for everyone. We realized that the smartphone camera everyone already carries could be the solution.

## What it does
TrueLight is a mobile navigation assistant that provides real-time visual and audio alerts for colorblind users across all modes of transportation. It:

- **Detects traffic signals** and announces their state: "Red light ahead. Stop."
- **Identifies hazardous objects** - brake lights, vehicles, pedestrians, bikes, stop signs
- **Adapts to 9 types of vision deficiency** including protanopia, deuteranopia, tritanopia, achromatopsia, and low vision
- **Tests your color vision** with an Ishihara-based assessment to automatically configure alerts
- **Allows manual selection** of colorblindness type without retaking the test
- **Tracks moving objects** with animated targeting brackets that lock onto vehicles and pedestrians
- **Adjusts by transport mode** - walking (5s intervals), biking (3s), driving (1.5s), passenger (2s), and low vision (proximity-based)
- **Prioritizes by urgency** - for low vision users, objects are ranked by size/proximity rather than color
- **Provides scene descriptions** - tap a button to hear "3 objects detected. Large car ahead. Medium person left."
- **Uses adaptive colors** - never displays alerts in colors you can't see

## How we built it

### Mobile App (React Native + Expo)
- Camera capture with real-time frame processing every 1.5-5 seconds based on transport mode
- Custom bounding box overlay with animated targeting brackets
- Zustand for state management with persistent colorblindness profiles
- Expo Speech for offline audio alerts
- ElevenLabs API for optional natural voice enhancement
- Ishihara color vision test with 5-10 plate assessment
- Manual colorblindness type selector

### Detection Backend (Python + FastAPI)
- YOLOv3-tiny for object detection (80 COCO classes, 10% confidence threshold)
- OpenCV HSV color analysis for accurate color identification
- Transport mode-aware detection thresholds
- Low vision mode with proximity-based priority (objects >10% of frame = critical)
- Expanded color vocabulary: 30+ shades including browns, violets, rust, olive, teal, maroon, burgundy
- Color region fallback when YOLO detects nothing

### Proxy Backend (Next.js)
- Routes requests between mobile and Python service
- Handles API integration with optional services (Gemini AI, ElevenLabs)

## Challenges we ran into

**Color detection accuracy:** HSV color space behaves differently under various lighting conditions. We had to expand our color ranges significantly (from 7 to 30+ distinct colors) and implement a fallback system that always detects something - either YOLO objects or color regions.

**Real-time performance:** Balancing detection accuracy with mobile frame rate required careful optimization. We implemented transport mode-aware intervals: 5 seconds for walking (detailed environment awareness) down to 1.5 seconds for driving (fast hazard detection).

**Adaptive UI for all vision types:** Designing a UI that works for 9 different types of colorblindness meant we couldn't rely on any single color scheme. We built a complete adaptive color system that never uses colors the user can't distinguish.

**Low vision accessibility:** Initially focused on color-based alerts, we realized low vision users need proximity-based prioritization instead. Objects are now ranked by size relative to the frame - a car taking up 10% of the screen gets a "Warning! car very close ahead" alert regardless of its color.

## Accomplishments that we're proud of

- Built a complete end-to-end solution with mobile app, backend proxy, and ML detection service
- Expanded color detection from basic red/green/blue to 30+ distinct shades including subtle browns, violets, and teal
- Created transport mode-aware detection that adapts sensitivity: detailed when walking, focused on critical hazards when driving
- Implemented low vision mode with proximity-based voice alerts and scene description
- Built Ishihara color vision test directly into the app for automatic profile configuration
- Achieved offline functionality with Expo Speech (ElevenLabs and Gemini are optional enhancements)
- Designed animated targeting brackets that lock onto moving objects across frames

## What we learned

- The colorblind community has been largely overlooked in assistive technology - most solutions are expensive glasses rather than accessible software
- HSV color space is far more reliable than RGB for color classification in varying lighting
- Real-time mobile ML is achievable with careful architecture choices (YOLOv3-tiny at 10% confidence)
- Low vision users need fundamentally different prioritization - proximity and urgency matter more than color
- "Always detect something" is critical - using YOLO with color region fallback ensures users always get feedback

## What's next for TrueLight

- **Apple CarPlay / Android Auto integration** for hands-free navigation while driving
- **Offline mode** with on-device ML models (currently requires Wi-Fi between phone and computer)
- **Brake light detection** with specific red-region analysis for following distance
- **Stop sign detection** using octagonal shape recognition
- **Emergency vehicle detection** for flashing light patterns
- **Haptic feedback** for critical alerts (vibration patterns by urgency)
- **Community calibration** - users can report missed detections to improve color ranges
- **Partnership with driving schools** to help colorblind students pass tests
- **Multi-language support** for global accessibility

## Built With

react-native, expo, typescript, python, fastapi, opencv, yolov3, nextjs, zustand, expo-speech, elevenlabs, google-gemini
