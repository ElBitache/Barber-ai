import { NextRequest, NextResponse } from "next/server";

const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  console.log("📡 Solicitud de verificación de Instagram");

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✅ Instagram Webhook verificado correctamente");

    return new NextResponse(challenge, {
      status: 200,
    });
  }

  console.log("❌ Verificación de Instagram rechazada");

  return NextResponse.json(
    {
      error: "Token de verificación incorrecto",
    },
    {
      status: 403,
    }
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    console.log("====================================");
    console.log("📩 INSTAGRAM WEBHOOK RECIBIDO");
    console.log("====================================");

    console.log(JSON.stringify(body, null, 2));

    const entry = body.entry?.[0];

    if (!entry) {
      console.log("⚠️ No se encontró entry");
      return NextResponse.json({ success: true });
    }

    const changes = entry.changes ?? [];

    console.log(`📦 Cambios recibidos: ${changes.length}`);

    for (const change of changes) {
      console.log("🔔 Campo recibido:", change.field);

      if (change.field === "messages") {
        const value = change.value;

        const senderId = value?.sender?.id;
        const messageText = value?.message?.text;

        console.log("👤 Sender ID:", senderId);
        console.log("💬 Mensaje:", messageText);

        if (senderId && messageText) {
          console.log("✅ MENSAJE REAL DE INSTAGRAM RECIBIDO");
        }
      }
    }

    return NextResponse.json(
      {
        success: true,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error("❌ Error procesando webhook:", error);

    return NextResponse.json(
      {
        error: "Error procesando webhook",
      },
      {
        status: 500,
      }
    );
  }
}