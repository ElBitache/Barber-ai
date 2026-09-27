import { NextRequest, NextResponse } from "next/server";

const VERIFY_TOKEN = process.env.INSTAGRAM_VERIFY_TOKEN;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✅ Instagram Webhook verificado");

    return new NextResponse(challenge, {
      status: 200,
    });
  }

  console.log("❌ Verificación de Instagram rechazada");

  return NextResponse.json(
    { error: "Token de verificación incorrecto" },
    { status: 403 }
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    console.log("📩 Evento recibido de Instagram:");
    console.log(JSON.stringify(body, null, 2));

    return NextResponse.json(
      { success: true },
      { status: 200 }
    );
  } catch (error) {
    console.error("❌ Error procesando webhook:", error);

    return NextResponse.json(
      { error: "Error procesando webhook" },
      { status: 500 }
    );
  }
}