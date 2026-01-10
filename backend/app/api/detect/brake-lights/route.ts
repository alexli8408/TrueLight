import { NextRequest, NextResponse } from 'next/server';
import { detectBrakeLights } from '@/lib/detection';

/**
 * POST /api/detect/brake-lights
 *
 * Detects if brake lights are illuminated on a vehicle within a bounding box.
 *
 * Request body:
 * {
 *   "image": "base64-encoded-image-data",
 *   "bbox": { "x": 0.5, "y": 0.5, "width": 0.3, "height": 0.2 }
 * }
 *
 * Response:
 * {
 *   "isBraking": true,
 *   "confidence": 0.75
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

    const result = await detectBrakeLights(body.image, body.bbox);

    const processingTime = Date.now() - startTime;

    return NextResponse.json({
      ...result,
      processingTimeMs: processingTime,
    });
  } catch (error) {
    console.error('Brake light detection error:', error);
    return NextResponse.json(
      { error: 'Failed to detect brake lights' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: '/api/detect/brake-lights',
    method: 'POST',
    description: 'Detect if brake lights are illuminated on a vehicle',
    requiredFields: ['image', 'bbox'],
  });
}
