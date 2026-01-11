import { NextRequest, NextResponse } from "next/server";

const PYTHON_SERVICE_URL = process.env.PYTHON_DETECTION_URL || "http://localhost:8000";

/**
 * POST /api/detect/objects
 *
 * General object detection with color analysis for colorblind users.
 * Proxies requests to the Python detection microservice.
 *
 * Request body:
 * {
 *   "image": "base64-encoded-image-data",
 *   "colorblindness_type": "deuteranopia" | "protanopia" | etc.,
 *   "min_confidence": 0.5 (optional)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.image) {
      return NextResponse.json(
        { error: "Missing required field: image" },
        { status: 400 }
      );
    }

    // Forward request to Python detection service
    const response = await fetch(`${PYTHON_SERVICE_URL}/detect`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image: body.image,
        colorblindness_type: body.colorblindness_type || "normal",
        min_confidence: body.min_confidence || 0.5,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Python detection service error:", error);
      return NextResponse.json(
        { error: "Detection service error", details: error },
        { status: response.status }
      );
    }

    const result = await response.json();
    return NextResponse.json(result);

  } catch (error) {
    console.error("Object detection endpoint error:", error);
    
    // Check if it's a connection error
    if (error instanceof Error && error.message.includes("ECONNREFUSED")) {
      return NextResponse.json(
        { 
          error: "Detection service unavailable",
          message: "Python detection microservice is not running. Start it with: cd python-detection && start.bat"
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: "Failed to process detection request" },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Check if Python service is available
  try {
    const response = await fetch(`${PYTHON_SERVICE_URL}/health`);
    const health = await response.json();
    
    return NextResponse.json({
      endpoint: "/api/detect/objects",
      method: "POST",
      description: "General object detection with colorblind-aware color analysis",
      python_service: health
    });
  } catch {
    return NextResponse.json({
      endpoint: "/api/detect/objects",
      method: "POST",
      description: "General object detection with colorblind-aware color analysis",
      python_service: { status: "unavailable" }
    });
  }
}
