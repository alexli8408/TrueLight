import { NextRequest, NextResponse } from 'next/server';
import { detectEmergencyLights } from '@/lib/detection';

/**
 * POST /api/detect/emergency-lights
 *
 * Detects if emergency vehicle lights (red/blue flashing) are present.
 *
 * Request body:
 * {
 *   "image": "base64-encoded-image-data",
 *   "bbox": { "x": 0.5, "y": 0.5, "width": 0.3, "height": 0.2 }
 * }
 *
 * Response:
 * {
 *   "isEmergency": true,
 *   "confidence": 0.85
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

    const result = await detectEmergencyLights(body.image, body.bbox);

    const processingTime = Date.now() - startTime;

    return NextResponse.json({
      ...result,
      processingTimeMs: processingTime,
    });
  } catch (error) {
    console.error('Emergency light detection error:', error);
    return NextResponse.json(
      { error: 'Failed to detect emergency lights' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: '/api/detect/emergency-lights',
    method: 'POST',
    description: 'Detect emergency vehicle lights (red/blue flashing)',
    requiredFields: ['image', 'bbox'],
  });
}
