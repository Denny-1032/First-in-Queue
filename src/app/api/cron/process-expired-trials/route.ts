import { NextRequest, NextResponse } from "next/server";
import { processExpiredTrials } from "@/lib/trial-helpers";

/**
 * Cron Job Endpoint - Process Expired Trials
 * This endpoint should be called daily to process trials that have ended
 * and initiate billing for the next period.
 * 
 * Example cron schedule: 0 2 * * * (runs daily at 2 AM)
 * 
 * Security: In production, protect this endpoint with a secret key
 */
export async function POST(request: NextRequest) {
  try {
    // Optional: Verify cron secret for security
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
      const authHeader = request.headers.get("authorization");
      if (!authHeader || !authHeader.includes(cronSecret)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    console.log("[Cron] Starting expired trials processing...");
    
    await processExpiredTrials();
    
    console.log("[Cron] Expired trials processing completed");
    
    return NextResponse.json({ 
      success: true, 
      message: "Expired trials processed successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Cron] Error processing expired trials:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({ 
    status: "Cron endpoint is active",
    endpoint: "/api/cron/process-expired-trials",
    method: "POST",
    schedule: "Recommended: 0 2 * * * (daily at 2 AM)",
  });
}
