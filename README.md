<p align="center">
  <img src="truelight%20logo.png" alt="TrueLight Logo" width="120"/>
</p>

<h1 align="center">TrueLight</h1>

<p align="center">
  <strong>Real-time assistive vision for colorblind &amp; low-vision users</strong><br/>
  Hackathon Winner &bull; <a href="https://devpost.com/software/truelight">View on Devpost</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React_Native-0.81-61DAFB?logo=react" alt="React Native"/>
  <img src="https://img.shields.io/badge/Expo-54-000020?logo=expo" alt="Expo"/>
  <img src="https://img.shields.io/badge/Next.js-15-000000?logo=nextdotjs" alt="Next.js"/>
  <img src="https://img.shields.io/badge/FastAPI-0.100+-009688?logo=fastapi" alt="FastAPI"/>
  <img src="https://img.shields.io/badge/YOLOv3--tiny-OpenCV-5C3EE8?logo=opencv" alt="YOLO"/>
</p>

---

## What It Does

TrueLight turns your phone into an intelligent camera that **detects objects, analyzes their colors, and alerts you** when something in your environment may be hard to distinguish given your specific type of color vision deficiency.

- 🎯 **Real-time object detection** — YOLOv3-tiny identifies objects in your camera feed
- 🎨 **Personalized color analysis** — Flags colors you specifically struggle with (protanopia, deuteranopia, tritanopia)
- 🔊 **Audio alerts** — Natural ElevenLabs voice (or built-in TTS) announces hazards hands-free
- 🗣️ **Voice commands** — Say *"Hey TrueLight, what do you see?"* for instant scene descriptions
- 🧪 **Built-in Ishihara test** — Determines your color vision type during onboarding
- ♿ **Low Vision mode** — Prioritizes alerts by proximity instead of color
- 🤖 **AI Assistant** — Gemini-powered conversational Q&A about your surroundings
- 🎨 **Adaptive UI** — Interface colors automatically adjust so they're always visible to you

---

## Architecture

Three decoupled services, each with a single responsibility:

```
┌─────────────────┐     REST     ┌──────────────┐     REST     ┌─────────────────────┐
│  Mobile App     │ ──────────▶  │  Next.js API │ ──────────▶  │  Python Detection   │
│  React Native   │ ◀──────────  │  Gateway     │ ◀──────────  │  FastAPI + YOLO     │
│  Expo           │              │  Auth / DB   │              │  OpenCV HSV         │
└─────────────────┘              └──────────────┘              └─────────────────────┘
```

| Layer | Tech | Role |
|-------|------|------|
| **Mobile** | React Native, Expo, TypeScript, Zustand | Camera capture, bounding box rendering, TTS, voice commands |
| **Backend** | Next.js 15, SQLite, JWT, bcrypt | Auth, API proxy, Roboflow fallback, telemetry |
| **Detection** | Python, FastAPI, OpenCV, YOLOv3-tiny | Object detection, HSV color analysis, priority heuristics |

---

## Features In Depth

### 🎯 Object Detection & Color Analysis
The Python service runs YOLOv3-tiny inference in under 80ms on CPU. Detected regions are passed through an HSV color analyzer that maps pixel distributions against your CVD profile. Red detection uses dual-range masking (0-10° and 170-180° on the hue wheel) to handle the HSV wraparound.

### 🔊 Dual TTS Engine
- **ElevenLabs** — Natural-sounding voice for a premium experience
- **Expo Speech** — Offline fallback that works without internet
- Priority-based debouncing ensures critical alerts are spoken first

### 🗣️ Voice Commands
Hands-free interaction powered by wake word detection:
| Command | Action |
|---------|--------|
| *"What do you see?"* | Describe current scene |
| *"What color is the light?"* | Check traffic signal state |
| *"Can I cross?"* | Traffic safety assessment |
| *"Help me navigate"* | Navigation assistance |
| *"Stop"* / *"Quiet"* | Silence current speech |

### 🧪 Color Vision Test
Built-in Ishihara plate test with enhanced plates to determine your specific CVD type during onboarding — no external diagnosis needed.

### ♿ Adaptive Modes
| Mode | Behavior |
|------|----------|
| **Walking** | Low detection thresholds — catches small objects early |
| **Driving** | High thresholds — only road-relevant objects, no false positives |
| **Low Vision** | Ignores color entirely — alerts based on object proximity (bounding box area / frame area) |

---

## Getting Started

> **Prerequisites:** Node.js 18+, Python 3.8+, [Expo Go](https://expo.dev/go) on your phone. Computer and phone must be on the **same Wi-Fi network**.

### 1. Python Detection Service
```bash
cd python-detection
pip install -r requirements.txt
python main.py
# Runs on localhost:8000
```

### 2. Next.js Backend
```bash
cd backend
cp .env.example .env    # Fill in API keys
npm install
npm run dev
# Runs on localhost:3000
```

### 3. Mobile App
```bash
cd mobile
cp .env.example .env    # Fill in API keys and backend URL
npm install
npx expo start
# Scan QR code with Expo Go
```

### Environment Variables

**`mobile/.env`**
| Variable | Description |
|----------|-------------|
| `EXPO_PUBLIC_ROBOFLOW_API_KEY` | Roboflow API key (10k free calls/month) |
| `EXPO_PUBLIC_GEMINI_API_KEY` | Google Gemini API key for AI assistant |
| `EXPO_PUBLIC_ELEVENLABS_API_KEY` | ElevenLabs API key for natural TTS |
| `EXPO_PUBLIC_BACKEND_URL` | Backend URL (`http://YOUR_IP:3000`) |

**`backend/.env`**
| Variable | Description |
|----------|-------------|
| `ROBOFLOW_API_KEY` | Roboflow API key |
| `GEMINI_API_KEY` | Gemini API key (optional backup) |
| `ELEVENLABS_API_KEY` | ElevenLabs API key for TTS endpoint |

---

## Project Structure

```
TrueLight/
├── mobile/                     # React Native (Expo) app
│   ├── app/                    # Screens (home, camera, settings, login, onboarding)
│   ├── components/             # CameraView, BoundingBoxOverlay, ColorTestPlate
│   ├── constants/              # Accessibility colors, color profiles, Ishihara plates
│   ├── contexts/               # Auth context provider
│   ├── services/               # API, speech, voice commands, audio alerts,
│   │                           # motion tracking, speed detection, screen recording
│   └── store/                  # Zustand state management
├── backend/                    # Next.js API gateway
│   ├── app/api/                # REST endpoints (detect, auth, health, TTS)
│   └── lib/                    # Auth (JWT), DB (SQLite), Roboflow detection
└── python-detection/           # FastAPI computer vision service
    ├── main.py                 # Server + dynamic sensitivity configs
    ├── detector.py             # YOLOv3-tiny + NMS + fallback color regions
    ├── color_analyzer.py       # HSV color mapping + CVD problematic detection
    └── models/                 # YOLO weights and config files
```

---

## License

MIT
