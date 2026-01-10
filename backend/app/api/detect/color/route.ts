import { NextRequest, NextResponse } from 'next/server';
import { analyzeTrafficLightColor } from '@/lib/detection';

/**
 * POST /api/detect/color
 *
 * Analyzes a traffic light's color state (red/yellow/green) within a bounding box.
 *
 * Request body:
 * {
 *   "image": "base64-encoded-image-data",
 *   "bbox": { "x": 0.5, "y": 0.3, "width": 0.1, "height": 0.2 },
 *   "analysisType": "traffic_light"  // Optional
 * }
 *
 * Response:
 * {
 *   "state": "red" | "yellow" | "green" | "unknown",
 *   "confidence": 0.85,
 *   "debug": {
 *     "topBrightness": 150,
 *     "middleBrightness": 50,
 *     "bottomBrightness": 30
 *   }
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

    if (!body.bbox) {
      return NextResponse.json(
        { error: 'Missing required field: bbox' },
        { status: 400 }
      );
    }

    const startTime = Date.now();

    const result = await analyzeTrafficLightColor(body.image, body.bbox);

    const processingTime = Date.now() - startTime;

    return NextResponse.json({
      ...result,
      processingTimeMs: processingTime,
    });
  } catch (error) {
    console.error('Color analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze color' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: '/api/detect/color',
    method: 'POST',
    description: 'Analyze traffic light color state within a bounding box',
    requiredFields: ['image', 'bbox'],
    bboxFormat: {
      x: 'Center x (normalized 0-1)',
      y: 'Center y (normalized 0-1)',
      width: 'Width (normalized 0-1)',
      height: 'Height (normalized 0-1)',
    },
  });
}
