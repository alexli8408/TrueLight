# TrueLight

**Award-Winning Accessibility Tech**<br/>
[View on Devpost](https://devpost.com/software/truelight)

TrueLight is a mobile dashcam and spatial awareness app designed to assist individuals with Color Vision Deficiency (CVD) and Low Vision. By leveraging edge-capable computer vision, TrueLight analyzes real-time camera feeds, isolates problematic color wavelengths based on a user's specific CVD profile, and provides concurrent audio alerts to ensure safe physical navigation.

![TrueLight Logo](truelight%20logo.png)

---

## 🏗️ Architecture

TrueLight utilizes a highly decoupled, tripartite microservice architecture to isolate OS rendering, network resilience, and heavy mathematical computation.

For an extensive, deep-dive breakdown of the heuristics, YOLO math, React Native state management, and future WebRTC scaling roadmaps, please read the [Comprehensive Developer Log (`devlog.md`)](./devlog.md).

### The Three Pillars

1. **Mobile Experience (React Native / Expo):**
   Handles the user session, OS-level camera throttling (debouncing to 640x480 frames to prevent device overheating), absolute scalar coordinate math to map Python bounding boxes onto varying screen sizes, and asynchronous Text-to-Speech (TTS) alert threading.
2. **API Gateway Proxy (Next.js / Node.js):**
   Acts as the unified routing security layer. It catches `ECONNREFUSED` exceptions if the local Python service crashes under load, transforming them into graceful `503` UI fallbacks while injecting telemetry latency timestamps.
3. **Computer Vision Microservice (Python FastAPI / OpenCV):**
   The core computational engine. It decodes Base64 payloads into NumPy arrays directly in memory.
   - **Object Detection:** Runs a quantized `YOLOv3-tiny` model via `cv2.dnn` (dropping inference latency to under 80ms) and utilizes Non-Maximum Suppression (NMS) to clear overlapping anchors.
   - **Color Isolation:** Maps mathematical HSV arrays (Hue, Saturation, Value) instead of RGB to maintain detection integrity across diverse physical lighting conditions (e.g. tungsten street lamps vs harsh sunlight).
   - **Proximity Heuristics:** In "Low Vision" mode, the model completely discards color awareness and calculates relative bounding-box geometry (`w*h/frame_area > 0.10`), elevating alerts based purely on physical collision danger rather than semantic coloring.

---

## 🛠️ Tech Stack

- **Frontend App:** Expo, React Native, TypeScript, `expo-camera`, `expo-speech`
- **Backend API:** Next.js (App Router), REST HTTP Proxies
- **Compute Service:** Python 3.10+, FastAPI, Uvicorn, OpenCV (`cv2.dnn`), Numpy, YOLOv3-tiny
- **Audio Synthesis:** ElevenLabs SDK (Primary), On-device TTS (Fallback)

---

## 🚀 Setup & Installation

TrueLight requires all three microservices to run concurrently.
**Prerequisites:** Node.js 18+, Python 3.8+, Expo Go installed on your smartphone, and both your computer and phone connected to the **same Wi-Fi network**.

### 1. The Python Detection Service
This must run first to load the YOLO model weights into memory.
```bash
cd python-detection
pip install -r requirements.txt
python main.py
```
*(The service will automatically spin up on `localhost:8000`)*

### 2. The Next.js API Proxy
Handles routing for the mobile app.
```bash
cd backend
npm install
npm run dev
```
*(The Vercel-compatible node server spins up on `localhost:3000`)*

### 3. The React Native Mobile App
Before running, you must route the app to your computer's local network IP.

Create a `.env` file in the `mobile` directory:
```bash
EXPO_PUBLIC_API_URL=http://YOUR_LOCAL_NETWORK_IP:3000
EXPO_PUBLIC_ELEVENLABS_API_KEY=your_elevenlabs_key_here
```

Start the bundler:
```bash
cd mobile
npm install
npx expo start
```
Scan the generated QR code using the Expo Go app on your phone to launch TrueLight.

---

## 📝 License

This project is licensed under the MIT License.
