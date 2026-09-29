import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

if (!accountSid || !authToken || !twilioPhoneNumber) {
  throw new Error("Faltan las variables de Twilio.");
}

const client = twilio(accountSid, authToken);

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { to, message } = body;

    if (!to || !message) {
      return Response.json(
        { error: "Faltan el número de teléfono o el mensaje." },
        { status: 400 }
      );
    }

    const sms = await client.messages.create({
      body: message,
      from: twilioPhoneNumber,
      to,
    });

    return Response.json({
      success: true,
      message: "SMS enviado correctamente",
      sid: sms.sid,
    });
  } catch (error) {
    console.error("Error enviando SMS:", error);

    return Response.json(
      {
        error: "No se pudo enviar el SMS.",
      },
      { status: 500 }
    );
  }
}