import { prisma } from "@/lib/prisma";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

function getTomorrowDate() {
  const now = new Date();

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  const currentDate = new Date(
    `${year}-${month}-${day}T12:00:00`
  );

  currentDate.setDate(currentDate.getDate() + 1);

  const tomorrowParts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(currentDate);

  const tomorrowYear = tomorrowParts.find(
    (part) => part.type === "year"
  )?.value;

  const tomorrowMonth = tomorrowParts.find(
    (part) => part.type === "month"
  )?.value;

  const tomorrowDay = tomorrowParts.find(
    (part) => part.type === "day"
  )?.value;

  return `${tomorrowYear}-${tomorrowMonth}-${tomorrowDay}`;
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Chicago",
  }).format(new Date(`${date}T12:00:00`));
}

export async function GET(request: Request) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    const authorization = request.headers.get("authorization");

    if (
      cronSecret &&
      authorization !== `Bearer ${cronSecret}`
    ) {
      return Response.json(
        {
          error: "No autorizado.",
        },
        {
          status: 401,
        }
      );
    }

    if (!process.env.RESEND_API_KEY) {
      return Response.json(
        {
          error: "Falta RESEND_API_KEY.",
        },
        {
          status: 500,
        }
      );
    }

    const tomorrow = getTomorrowDate();

    console.log(
      `🔔 Buscando citas para mañana: ${tomorrow}`
    );

    const appointments =
      await prisma.appointment.findMany({
        where: {
          date: tomorrow,
          reminderSentAt: null,
        },
        include: {
          clientRef: true,
          business: true,
        },
        orderBy: {
          time: "asc",
        },
      });

    console.log(
      `📅 Recordatorios pendientes encontrados: ${appointments.length}`
    );

    let sent = 0;
    let skipped = 0;
    let failed = 0;

    for (const appointment of appointments) {
      const clientEmail = appointment.clientRef?.email;

      const clientName =
        appointment.clientRef?.name ||
        appointment.client ||
        "Cliente";

      const businessName =
        appointment.business?.name ||
        "tu barbería";

      if (!clientEmail) {
        console.log(
          `ℹ️ Sin email: ${clientName}`
        );

        skipped++;
        continue;
      }

      try {
        const formattedDate = formatDate(
          appointment.date
        );

        const { data, error } =
          await resend.emails.send({
            from:
              "BarberAI <onboarding@resend.dev>",
            to: [clientEmail],
            subject:
              `Recordatorio de tu cita mañana en ${businessName}`,
            text: [
              `Hola ${clientName},`,
              "",
              `Te recordamos que tienes una cita mañana en ${businessName}.`,
              "",
              `Servicio: ${appointment.service}`,
              `Fecha: ${formattedDate}`,
              `Hora: ${appointment.time}`,
              "",
              "Te esperamos. ✂️",
              "",
              "Este correo fue enviado automáticamente por BarberAI.",
            ].join("\n"),
            html: `
              <div style="
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #111;
              ">
                <h2>🔔 Recordatorio de tu cita</h2>

                <p>
                  Hola ${clientName},
                </p>

                <p>
                  Te recordamos que tienes una cita
                  <strong>mañana</strong> en
                  <strong>${businessName}</strong>.
                </p>

                <div style="
                  margin: 24px 0;
                  padding: 20px;
                  border: 1px solid #e5e5e5;
                  border-radius: 12px;
                ">
                  <p>
                    <strong>Servicio:</strong>
                    ${appointment.service}
                  </p>

                  <p>
                    <strong>Fecha:</strong>
                    ${formattedDate}
                  </p>

                  <p>
                    <strong>Hora:</strong>
                    ${appointment.time}
                  </p>
                </div>

                <p>
                  Te esperamos. ✂️
                </p>

                <p style="
                  color: #777;
                  font-size: 12px;
                ">
                  Este correo fue enviado automáticamente por BarberAI.
                </p>
              </div>
            `,
          });

        if (error) {
          console.error(
            `❌ Error enviando recordatorio a ${clientEmail}:`,
            error
          );

          failed++;
          continue;
        }

        await prisma.appointment.update({
          where: {
            id: appointment.id,
          },
          data: {
            reminderSentAt: new Date(),
          },
        });

        console.log(
          `📧 Recordatorio enviado a ${clientEmail}:`,
          data?.id
        );

        console.log(
          `✅ Cita ${appointment.id} marcada como recordatorio enviado.`
        );

        sent++;
      } catch (error) {
        console.error(
          `❌ Error procesando ${clientEmail}:`,
          error
        );

        failed++;
      }
    }

    return Response.json({
      success: true,
      date: tomorrow,
      appointmentsFound: appointments.length,
      remindersSent: sent,
      skipped,
      failed,
    });
  } catch (error) {
    console.error(
      "❌ Error en recordatorios:",
      error
    );

    return Response.json(
      {
        error:
          "No se pudieron procesar los recordatorios.",
      },
      {
        status: 500,
      }
    );
  }
}