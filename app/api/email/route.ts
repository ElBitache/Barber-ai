import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { to, subject, message } = body;

    if (!to || !subject || !message) {
      return Response.json(
        { error: "Faltan datos del correo" },
        { status: 400 }
      );
    }

    const { data, error } = await resend.emails.send({
      from: "BarberAI <onboarding@resend.dev>",
      to: [to],
      subject,
      text: message,
    });

    if (error) {
      console.error("Error de Resend:", error);

      return Response.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return Response.json({
      success: true,
      message: "Correo enviado correctamente",
      data,
    });
  } catch (error) {
    console.error("Error enviando correo:", error);

    return Response.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}