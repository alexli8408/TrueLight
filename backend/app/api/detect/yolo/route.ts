import { NextRequest, NextResponse } from 'next/server';
import { detectYOLO, COCO_CLASSES, getClassName } from '@/lib/detection';

/**
 * POST /api/detect/yolo
 *
 * YOLO-based object detection endpoint.
 * Returns bounding boxes for all detected objects.
 *
 * Request body:
 * {
 *   "image": "base64-encoded-image-data",
 *   "confidenceThreshold": 0.5,  // Optional, default 0.5
 *   "classes": [2, 7, 9, 11]     // Optional, filter to specific COCO class IDs
 * }
 *
 * Response:
 * {
 *   "detections": [
 *     {
 *       "classId": 9,
 *       "className": "traffic light",
 *       "confidence": 0.85,
 *       "bbox": { "x": 0.5, "y": 0.3, "width": 0.1, "height": 0.2 }
 *     }
 *   ],
 *   "processingTimeMs": 45,
 *   "imageWidth": 640,
 *   "imageHeight": 480
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

    // Run YOLO detection
    let detections = await detectYOLO(body.image);

    // Filter by confidence threshold if provided
    const confidenceThreshold = body.confidenceThreshold || 0.5;
    detections = detections.filter(d => d.confidence >= confidenceThreshold);

    // Filter by class IDs if provided
    if (body.classes && Array.isArray(body.classes)) {
      detections = detections.filter(d => body.classes.includes(d.classId));
    }

    const processingTime = Date.now() - startTime;

    return NextResponse.json({
      detections,
      processingTimeMs: processingTime,
      imageWidth: 640,  // Assumed for now
      imageHeight: 480,
    });
  } catch (error) {
    console.error('YOLO detection error:', error);
    return NextResponse.json(
      { error: 'Failed to process image' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: '/api/detect/yolo',
    method: 'POST',
    description: 'YOLO-based object detection for traffic hazards',
    supportedClasses: Object.entries(COCO_CLASSES).map(([name, id]) => ({
      id,
      name: getClassName(id),
    })),
  });
}
