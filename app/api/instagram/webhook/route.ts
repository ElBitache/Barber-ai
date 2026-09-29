import { NextRequest, NextResponse } from "next/server";

const VERIFY_TOKEN = process.env.INSTAGRAM_VERIFY_TOKEN;
const INSTAGRAM_ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN;
const INSTAGRAM_ACCOUNT_ID = process.env.INSTAGRAM_ACCOUNT_ID;

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

async function sendInstagramMessage(
  recipientId: string,
  message: string
) {
  if (!INSTAGRAM_ACCESS_TOKEN || !INSTAGRAM_ACCOUNT_ID) {
    console.error("❌ Faltan las variables de Instagram");
    return;
  }

  const response = await fetch(
    `https://graph.facebook.com/v26.0/${INSTAGRAM_ACCOUNT_ID}/messages`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${INSTAGRAM_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        recipient: {
          id: recipientId,
        },
        message: {
          text: message,
        },
      }),
    }
  );

  const data = await response.json();

  console.log("📤 Respuesta enviada a Instagram:", data);

  if (!response.ok) {
    console.error("❌ Instagram rechazó el mensaje:", data);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    console.log("📩 Evento recibido de Instagram:");
    console.log(JSON.stringify(body, null, 2));

    const entry = body.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;

    if (change?.field === "messages") {
      const senderId = value?.sender?.id;
      const messageText = value?.message?.text;

      console.log("👤 Usuario de Instagram:", senderId);
      console.log("💬 Mensaje:", messageText);

      if (senderId && messageText) {
        await sendInstagramMessage(
          senderId,
          "🤖 ¡Hola! Soy el asistente de BarberAI. Gracias por escribirnos."
        );
      }
    }

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