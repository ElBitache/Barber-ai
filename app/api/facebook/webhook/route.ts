import { NextRequest, NextResponse } from "next/server";

const VERIFY_TOKEN = process.env.FACEBOOK_VERIFY_TOKEN;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  console.log("📘 Facebook webhook verification:", {
    mode,
    tokenReceived: !!token,
  });

  if (
    mode === "subscribe" &&
    token &&
    VERIFY_TOKEN &&
    token === VERIFY_TOKEN
  ) {
    console.log("✅ Facebook Webhook verificado");

    return new NextResponse(challenge ?? "", {
      status: 200,
      headers: {
        "Content-Type": "text/plain",
      },
    });
  }

  console.log("❌ Facebook Webhook verification failed");

  return new NextResponse("Forbidden", {
    status: 403,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    console.log(
      "📩 Facebook Webhook:",
      JSON.stringify(body, null, 2)
    );

    return NextResponse.json(
      {
        received: true,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error("❌ Facebook webhook error:", error);

    return NextResponse.json(
      {
        received: false,
      },
      {
        status: 200,
      }
    );
  }
}