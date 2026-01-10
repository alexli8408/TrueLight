import { NextRequest, NextResponse } from 'next/server';
import { detectSignal, DetectionResult } from '@/lib/detection';

/**
 * POST /api/detect
 *
 * Accepts a base64-encoded image and returns traffic signal detection results.
 * Optionally includes full hazard detection with YOLO.
 *
 * Request body:
 * {
 *   "image": "base64-encoded-image-data",
 *   "debug": boolean (optional) - include debug info in response
 *   "detectHazards": boolean (optional) - include full hazard detection
 * }
 *
 * Response:
 * {
 *   "state": "red" | "yellow" | "green" | "flashing" | "unknown",
 *   "confidence": 0-1,
 *   "message": "Human-readable message for TTS",
 *   "hazards": [...] (if detectHazards=true),
 *   "debug": { ... } (if debug=true)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.image) {
      return NextResponse.json(
        { error: 'Missing required field: image' },
        { status: 400 }
      );
    }

    const startTime = Date.now();
    const result = await detectSignal(body.image, {
      detectHazards: body.detectHazards || false,
    });
    const processingTime = Date.now() - startTime;

    // Build response
    const response: DetectionResult & { processingTimeMs?: number } = {
      state: result.state,
      confidence: result.confidence,
      message: result.message,
      processingTimeMs: processingTime,
    };

    // Include hazards if requested and present
    if (body.detectHazards && result.hazards) {
      response.hazards = result.hazards;
    }

    // Include bounding box if available
    if (result.bbox) {
      response.bbox = result.bbox;
    }

    // Include debug info if requested
    if (body.debug) {
      response.debug = result.debug;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Detection endpoint error:', error);
    return NextResponse.json(
      { error: 'Failed to process image' },
      { status: 500 }
    );
  }
}

// Health check via GET (convenience)
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/detect',
    method: 'POST',
    description: 'Send a base64-encoded image to detect traffic signal state',
    options: {
      debug: 'Include debug information in response',
      detectHazards: 'Include full YOLO-based hazard detection',
    },
    relatedEndpoints: [
      '/api/detect/yolo - YOLO object detection',
      '/api/detect/color - Traffic light color analysis',
      '/api/detect/brake-lights - Brake light detection',
      '/api/detect/emergency-lights - Emergency vehicle detection',
    ],
  });
}
