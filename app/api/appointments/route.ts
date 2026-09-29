import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import { NextResponse } from "next/server";
import { google } from "googleapis";
import { Resend } from "resend";

const resend = new Resend(
  process.env.RESEND_API_KEY
);

type BusinessService = {
  name: string;
  price?: string | number;
};

type BusinessDay = {
  open?: string;
  close?: string;
  closed?: boolean;
};

type BusinessHours = Record<string, BusinessDay>;

const CLIENT_LIMITS = {
  FREE: 50,
  PRO: 500,
  BUSINESS: null,
} as const;

function parseServices(
  servicesText: string
): BusinessService[] {
  const text = String(servicesText || "").trim();

  if (!text) {
    return [];
  }

  try {
    const parsed = JSON.parse(text);

    if (Array.isArray(parsed)) {
      return parsed
        .map((item) => ({
          name: String(item?.name || "").trim(),
          price: String(item?.price || "").trim(),
        }))
        .filter((item) => item.name.length > 0);
    }
  } catch {
    // Continuamos con texto normal.
  }

  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      let name = line;
      let price = "";

      if (line.includes("–")) {
        const parts = line.split("–");

        name = parts[0]?.trim() || "";
        price = parts.slice(1).join("–").trim();
      } else if (line.includes(" - ")) {
        const parts = line.split(" - ");

        name = parts[0]?.trim() || "";
        price = parts.slice(1).join(" - ").trim();
      } else if (line.includes(":")) {
        const parts = line.split(":");

        name = parts[0]?.trim() || "";
        price = parts.slice(1).join(":").trim();
      }

      return {
        name,
        price,
      };
    })
    .filter((item) => item.name.length > 0);
}

function normalizeText(value: string) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function parseHours(
  hoursText: string
): BusinessHours | null {
  const text = String(hoursText || "").trim();

  if (!text) {
    return null;
  }

  try {
    const parsed = JSON.parse(text);

    if (
      parsed &&
      typeof parsed === "object" &&
      !Array.isArray(parsed)
    ) {
      return normalizeHoursObject(parsed);
    }
  } catch {
    // No era JSON.
  }

  const result: BusinessHours = {};

  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  for (const line of lines) {
    const parts = line.split(":");

    if (parts.length < 2) {
      continue;
    }

    const rawDay = parts[0].trim().toLowerCase();

    const rawHours = parts
      .slice(1)
      .join(":")
      .trim()
      .toLowerCase();

    const day = translateDay(rawDay);

    if (!day) {
      continue;
    }

    if (
      rawHours.includes("cerrado") ||
      rawHours.includes("closed")
    ) {
      result[day] = {
        closed: true,
      };

      continue;
    }

    const timeMatch = rawHours.match(
      /(\d{1,2}:\d{2})\s*(?:-|–|a|to)\s*(\d{1,2}:\d{2})/
    );

    if (timeMatch) {
      result[day] = {
        open: timeMatch[1],
        close: timeMatch[2],
        closed: false,
      };
    }
  }

  if (Object.keys(result).length === 0) {
    return null;
  }

  return result;
}

function normalizeHoursObject(
  value: Record<string, unknown>
): BusinessHours | null {
  const result: BusinessHours = {};

  const dayNames = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  for (const day of dayNames) {
    const possibleKeys = [
      day,
      day.toLowerCase(),
      translateDayToSpanish(day),
    ];

    let rawDay: unknown | undefined = undefined;

    for (const key of possibleKeys) {
      if (value[key] !== undefined) {
        rawDay = value[key];
        break;
      }
    }

    if (
      !rawDay ||
      typeof rawDay !== "object"
    ) {
      continue;
    }

    const dayObject = rawDay as Record<
      string,
      unknown
    >;

    const open = String(
      dayObject.open || ""
    ).trim();

    const close = String(
      dayObject.close || ""
    ).trim();

    const closed =
      dayObject.closed === true ||
      dayObject.closed === "true";

    result[day] = {
      open,
      close,
      closed,
    };
  }

  if (Object.keys(result).length === 0) {
    return null;
  }

  return result;
}

function translateDay(
  day: string
): string | null {
  const days: Record<string, string> = {
    sunday: "Sunday",
    domingo: "Sunday",

    monday: "Monday",
    lunes: "Monday",

    tuesday: "Tuesday",
    martes: "Tuesday",

    wednesday: "Wednesday",
    miércoles: "Wednesday",
    miercoles: "Wednesday",

    thursday: "Thursday",
    jueves: "Thursday",

    friday: "Friday",
    viernes: "Friday",

    saturday: "Saturday",
    sábado: "Saturday",
    sabado: "Saturday",
  };

  return days[day] || null;
}

function translateDayToSpanish(
  day: string
): string {
  const days: Record<string, string> = {
    Sunday: "domingo",
    Monday: "lunes",
    Tuesday: "martes",
    Wednesday: "miércoles",
    Thursday: "jueves",
    Friday: "viernes",
    Saturday: "sábado",
  };

  return days[day] || day;
}

function getDayName(date: string) {
  const parsedDate = new Date(
    `${date}T12:00:00`
  );

  if (
    Number.isNaN(
      parsedDate.getTime()
    )
  ) {
    return null;
  }

  const day = parsedDate.getDay();

  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  return days[day];
}

function isValidDateFormat(
  date: string
) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date)
  ) {
    return false;
  }

  const parsed = new Date(
    `${date}T12:00:00`
  );

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    return false;
  }

  const [
    year,
    month,
    day,
  ] = date.split("-").map(Number);

  return (
    parsed.getFullYear() === year &&
    parsed.getMonth() + 1 === month &&
    parsed.getDate() === day
  );
}

function isValidTimeFormat(
  time: string
) {
  if (
    !/^\d{2}:\d{2}$/.test(time)
  ) {
    return false;
  }

  const [
    hour,
    minute,
  ] = time.split(":").map(Number);

  return (
    hour >= 0 &&
    hour <= 23 &&
    minute >= 0 &&
    minute <= 59
  );
}

function timeToMinutes(
  time: string
) {
  const [
    hour,
    minute,
  ] = time.split(":").map(Number);

  return hour * 60 + minute;
}

function isPrismaUniqueConstraintError(
  error: unknown
) {
  if (
    typeof error !== "object" ||
    error === null
  ) {
    return false;
  }

  return (
    "code" in error &&
    (
      error as {
        code?: unknown;
      }
    ).code === "P2002"
  );
}

function isValidEmail(
  email: string
) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    email
  );
}

// =====================================================
// GET — OBTENER CITAS
// =====================================================

export async function GET() {
  try {
    const userId =
      await getSessionUserId();

    if (!userId) {
      return NextResponse.json(
        {
          error:
            "No hay una sesión activa.",
        },
        {
          status: 401,
        }
      );
    }

    const business =
      await prisma.business.findUnique({
        where: {
          userId,
        },

        select: {
          id: true,
        },
      });

    if (!business) {
      return NextResponse.json(
        {
          error:
            "No tienes un negocio configurado.",
        },
        {
          status: 404,
        }
      );
    }

    const appointments =
      await prisma.appointment.findMany({
        where: {
          businessId:
            business.id,
        },

        include: {
          clientRef: true,
        },

        orderBy: [
          {
            date: "asc",
          },
          {
            time: "asc",
          },
        ],
      });

    return NextResponse.json({
      appointments,
    });
  } catch (error) {
    console.error(
      "❌ Error obteniendo citas:",
      error
    );

    return NextResponse.json(
      {
        error:
          "No se pudieron obtener las citas.",
      },
      {
        status: 500,
      }
    );
  }
}

// =====================================================
// POST — CREAR CITA
// =====================================================

export async function POST(
  request: Request
) {
  try {
    // ===================================================
    // AUTENTICACIÓN
    // ===================================================

    const userId =
      await getSessionUserId();

    if (!userId) {
      return NextResponse.json(
        {
          error:
            "No hay una sesión activa.",
        },
        {
          status: 401,
        }
      );
    }

    // ===================================================
    // BUSCAR NEGOCIO
    // ===================================================

    const business =
      await prisma.business.findUnique({
        where: {
          userId,
        },

        select: {
          id: true,
          name: true,
          services: true,
          hours: true,
          plan: true,

          googleCalendarConnected:
            true,

          googleCalendarRefreshToken:
            true,
        },
      });

    if (!business) {
      return NextResponse.json(
        {
          error:
            "No tienes un negocio configurado.",
        },
        {
          status: 404,
        }
      );
    }

    // ===================================================
    // LEER DATOS
    // ===================================================

    const body =
      await request.json();

    const client =
      String(
        body.client ?? ""
      ).trim();

    const clientEmail =
      String(
        body.clientEmail ?? ""
      ).trim();

    const service =
      String(
        body.service ?? ""
      ).trim();

    const date =
      String(
        body.date ?? ""
      ).trim();

    const time =
      String(
        body.time ?? ""
      ).trim();

    // ===================================================
    // VALIDACIONES BÁSICAS
    // ===================================================

    if (
      !client ||
      !service ||
      !date ||
      !time
    ) {
      return NextResponse.json(
        {
          error:
            "Cliente, servicio, fecha y hora son obligatorios.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      client.length > 100
    ) {
      return NextResponse.json(
        {
          error:
            "El nombre del cliente no puede superar los 100 caracteres.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      clientEmail &&
      !isValidEmail(clientEmail)
    ) {
      return NextResponse.json(
        {
          error:
            "El correo electrónico del cliente no es válido.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      clientEmail.length > 255
    ) {
      return NextResponse.json(
        {
          error:
            "El correo electrónico no puede superar los 255 caracteres.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      service.length > 100
    ) {
      return NextResponse.json(
        {
          error:
            "El servicio no puede superar los 100 caracteres.",
        },
        {
          status: 400,
        }
      );
    }

    // ===================================================
    // VALIDAR FECHA
    // ===================================================

    if (
      !isValidDateFormat(date)
    ) {
      return NextResponse.json(
        {
          error:
            "La fecha seleccionada no es válida.",
        },
        {
          status: 400,
        }
      );
    }

    // ===================================================
    // VALIDAR HORA
    // ===================================================

    if (
      !isValidTimeFormat(time)
    ) {
      return NextResponse.json(
        {
          error:
            "La hora seleccionada no es válida.",
        },
        {
          status: 400,
        }
      );
    }

    // ===================================================
    // SERVICIOS
    // ===================================================

    const services =
      parseServices(
        business.services
      );

    console.log(
      "🛠️ Servicios del negocio:",
      services
    );

    const selectedService =
      services.find(
        (item) =>
          normalizeText(
            item.name
          ) ===
          normalizeText(
            service
          )
      );

    if (!selectedService) {
      return NextResponse.json(
        {
          error:
            "El servicio seleccionado no existe en este negocio.",

          availableServices:
            services.map(
              (item) =>
                item.name
            ),
        },
        {
          status: 400,
        }
      );
    }

    // ===================================================
    // HORARIOS
    // ===================================================

    const hours =
      parseHours(
        business.hours
      );

    if (!hours) {
      console.error(
        "❌ No se pudo interpretar el horario:",
        business.hours
      );

      return NextResponse.json(
        {
          error:
            "El horario guardado del negocio no se puede leer.",
        },
        {
          status: 500,
        }
      );
    }

    const dayName =
      getDayName(date);

    if (!dayName) {
      return NextResponse.json(
        {
          error:
            "La fecha seleccionada no es válida.",
        },
        {
          status: 400,
        }
      );
    }

    const dayHours =
      hours[dayName];

    if (!dayHours) {
      return NextResponse.json(
        {
          error:
            "No hay un horario configurado para ese día.",
        },
        {
          status: 400,
        }
      );
    }

    if (dayHours.closed) {
      return NextResponse.json(
        {
          error:
            "El negocio está cerrado ese día.",
        },
        {
          status: 400,
        }
      );
    }

    const openingTime =
      String(
        dayHours.open || ""
      ).trim();

    const closingTime =
      String(
        dayHours.close || ""
      ).trim();

    if (
      !isValidTimeFormat(
        openingTime
      ) ||
      !isValidTimeFormat(
        closingTime
      )
    ) {
      return NextResponse.json(
        {
          error:
            "El horario de ese día no está configurado correctamente.",
        },
        {
          status: 500,
        }
      );
    }

    const openingMinutes =
      timeToMinutes(
        openingTime
      );

    const closingMinutes =
      timeToMinutes(
        closingTime
      );

    const selectedMinutes =
      timeToMinutes(time);

    if (
      closingMinutes <=
      openingMinutes
    ) {
      return NextResponse.json(
        {
          error:
            "El horario de apertura y cierre del negocio no es válido.",
        },
        {
          status: 500,
        }
      );
    }

    if (
      selectedMinutes <
        openingMinutes ||
      selectedMinutes >=
        closingMinutes
    ) {
      return NextResponse.json(
        {
          error:
            `El horario seleccionado (${time}) está fuera del horario del negocio (${openingTime} - ${closingTime}).`,
        },
        {
          status: 400,
        }
      );
    }

    // ===================================================
    // COMPROBAR CITA EXISTENTE
    // ===================================================

    const existingAppointment =
      await prisma.appointment.findUnique({
        where: {
          businessId_date_time: {
            businessId:
              business.id,

            date,

            time,
          },
        },
      });

    if (existingAppointment) {
      return NextResponse.json(
        {
          error:
            `El horario del ${date} a las ${time} ya está ocupado.`,

          code:
            "APPOINTMENT_SLOT_TAKEN",
        },
        {
          status: 409,
        }
      );
    }

    // ===================================================
    // BUSCAR CLIENTE
    // ===================================================

    let clientRecord =
      await prisma.client.findFirst({
        where: {
          businessId:
            business.id,

          name: {
            equals:
              client,
          },
        },
      });

    // ===================================================
    // CREAR CLIENTE SI NO EXISTE
    // ===================================================

    if (!clientRecord) {
      const clientLimit =
        CLIENT_LIMITS[
          business.plan
        ];

      if (
        clientLimit !== null
      ) {
        const clientCount =
          await prisma.client.count({
            where: {
              businessId:
                business.id,
            },
          });

        if (
          clientCount >=
          clientLimit
        ) {
          return NextResponse.json(
            {
              error:
                `Has alcanzado el límite de ${clientLimit} clientes de tu plan.`,

              code:
                "CLIENT_LIMIT_REACHED",

              usage: {
                used:
                  clientCount,

                limit:
                  clientLimit,

                plan:
                  business.plan,
              },
            },
            {
              status: 403,
            }
          );
        }
      }

      try {
        clientRecord =
          await prisma.client.create({
            data: {
              name:
                client,

              email:
                clientEmail ||
                null,

              businessId:
                business.id,
            },
          });

        console.log(
          "👤 Cliente creado automáticamente:",
          {
            businessId:
              business.id,

            clientId:
              clientRecord.id,

            hasEmail:
              Boolean(
                clientEmail
              ),
          }
        );
      } catch (error) {
        if (
          isPrismaUniqueConstraintError(
            error
          )
        ) {
          clientRecord =
            await prisma.client.findFirst({
              where: {
                businessId:
                  business.id,

                name: {
                  equals:
                    client,
                },
              },
            });
        } else {
          throw error;
        }
      }

      if (!clientRecord) {
        return NextResponse.json(
          {
            error:
              "No se pudo crear o encontrar el cliente.",
          },
          {
            status: 500,
          }
        );
      }
    }

    // ===================================================
    // ACTUALIZAR EMAIL DEL CLIENTE
    // ===================================================

    if (
      clientEmail &&
      clientRecord.email !==
        clientEmail
    ) {
      clientRecord =
        await prisma.client.update({
          where: {
            id:
              clientRecord.id,
          },

          data: {
            email:
              clientEmail,
          },
        });

      console.log(
        "📧 Email del cliente actualizado."
      );
    }

    // ===================================================
    // CREAR CITA
    // ===================================================

    try {
      const appointment =
        await prisma.appointment.create({
          data: {
            client,

            service:
              selectedService.name,

            date,

            time,

            businessId:
              business.id,

            clientId:
              clientRecord.id,
          },

          include: {
            clientRef: true,
          },
        });

      console.log(
        "✅ Cita creada:",
        {
          appointmentId:
            appointment.id,

          businessId:
            business.id,

          date,

          time,
        }
      );

      // ===================================================
      // GOOGLE CALENDAR
      // ===================================================

      if (
        business.googleCalendarConnected &&
        business.googleCalendarRefreshToken
      ) {
        try {
          const clientId =
            process.env.GOOGLE_CLIENT_ID;

          const clientSecret =
            process.env.GOOGLE_CLIENT_SECRET;

          if (
            !clientId ||
            !clientSecret
          ) {
            console.error(
              "❌ Google Calendar: faltan GOOGLE_CLIENT_ID o GOOGLE_CLIENT_SECRET."
            );
          } else {
            const oauth2Client =
              new google.auth.OAuth2(
                clientId,
                clientSecret,
                "http://localhost:3000/api/google/callback"
              );

            oauth2Client.setCredentials({
              refresh_token:
                business.googleCalendarRefreshToken,
            });

            const calendar =
              google.calendar({
                version: "v3",
                auth: oauth2Client,
              });

            const startDateTime =
              `${date}T${time}:00`;

            const start =
              new Date(
                `${startDateTime}-05:00`
              );

            const end =
              new Date(
                start.getTime() +
                  60 * 60 * 1000
              );

            await calendar.events.insert({
              calendarId:
                "primary",

              requestBody: {
                summary:
                  `${selectedService.name} - ${client}`,

                description:
                  `Cita creada desde BarberAI.\n\nCliente: ${client}\nServicio: ${selectedService.name}\nFecha: ${date}\nHora: ${time}`,

                start: {
                  dateTime:
                    start.toISOString(),

                  timeZone:
                    "America/Chicago",
                },

                end: {
                  dateTime:
                    end.toISOString(),

                  timeZone:
                    "America/Chicago",
                },
              },
            });

            console.log(
              "✅ Evento creado en Google Calendar."
            );
          }
        } catch (googleError) {
          console.error(
            "❌ No se pudo crear el evento en Google Calendar:",
            googleError
          );
        }
      } else {
        console.log(
          "ℹ️ Google Calendar no está conectado para este negocio."
        );
      }

      // ===================================================
      // EMAIL DE CONFIRMACIÓN
      // ===================================================

      if (clientRecord.email) {
        try {
          const resendApiKey =
            process.env.RESEND_API_KEY;

          if (!resendApiKey) {
            console.error(
              "❌ Resend: falta RESEND_API_KEY."
            );
          } else {
            const formattedDate =
              new Intl.DateTimeFormat(
                "es-MX",
                {
                  weekday:
                    "long",
                  day:
                    "numeric",
                  month:
                    "long",
                  year:
                    "numeric",
                }
              ).format(
                new Date(
                  `${date}T12:00:00`
                )
              );

            const { data, error } =
              await resend.emails.send({
                from:
                  "BarberAI <onboarding@resend.dev>",

                to: [
                  clientRecord.email,
                ],

                subject:
                  `Confirmación de tu cita en ${business.name}`,

                text:
                  `Hola ${clientRecord.name},

Tu cita ha sido confirmada correctamente.

Negocio: ${business.name}
Servicio: ${selectedService.name}
Fecha: ${formattedDate}
Hora: ${time}

Te esperamos. ✂️

Este correo fue enviado automáticamente por BarberAI.`,

                html: `
                  <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
                    <h2>¡Cita confirmada! ✂️</h2>

                    <p>Hola ${clientRecord.name},</p>

                    <p>
                      Tu cita ha sido confirmada correctamente.
                    </p>

                    <div style="
                      margin: 24px 0;
                      padding: 20px;
                      border: 1px solid #e5e5e5;
                      border-radius: 12px;
                    ">
                      <p>
                        <strong>Negocio:</strong>
                        ${business.name}
                      </p>

                      <p>
                        <strong>Servicio:</strong>
                        ${selectedService.name}
                      </p>

                      <p>
                        <strong>Fecha:</strong>
                        ${formattedDate}
                      </p>

                      <p>
                        <strong>Hora:</strong>
                        ${time}
                      </p>
                    </div>

                    <p>
                      Te esperamos. ✂️
                    </p>

                    <p style="color: #777; font-size: 12px;">
                      Este correo fue enviado automáticamente por BarberAI.
                    </p>
                  </div>
                `,
              });

            if (error) {
              console.error(
                "❌ Error de Resend:",
                error
              );
            } else {
              console.log(
                "📧 Email de confirmación enviado:",
                data?.id
              );
            }
          }
        } catch (emailError) {
          /*
           * IMPORTANTE:
           * Si Resend falla, NO eliminamos
           * la cita.
           */
          console.error(
            "❌ No se pudo enviar el email de confirmación:",
            emailError
          );
        }
      } else {
        console.log(
          "ℹ️ El cliente no tiene email. No se envió confirmación."
        );
      }

      // ===================================================
      // RESPUESTA
      // ===================================================

      return NextResponse.json(
        {
          success: true,
          appointment,
        },
        {
          status: 201,
        }
      );
    } catch (error) {
      if (
        isPrismaUniqueConstraintError(
          error
        )
      ) {
        return NextResponse.json(
          {
            error:
              `El horario del ${date} a las ${time} acaba de ser ocupado por otra cita.`,

            code:
              "APPOINTMENT_SLOT_TAKEN",
          },
          {
            status: 409,
          }
        );
      }

      throw error;
    }
  } catch (error) {
    console.error(
      "❌ Error creando cita:",
      error
    );

    return NextResponse.json(
      {
        error:
          "No se pudo crear la cita.",
      },
      {
        status: 500,
      }
    );
  }
}

// =====================================================
// DELETE — ELIMINAR CITA
// =====================================================

export async function DELETE(
  request: Request
) {
  try {
    // ===================================================
    // AUTENTICACIÓN
    // ===================================================

    const userId = await getSessionUserId();

    if (!userId) {
      return NextResponse.json(
        {
          error: "No hay una sesión activa.",
        },
        {
          status: 401,
        }
      );
    }

    // ===================================================
    // BUSCAR NEGOCIO
    // ===================================================

    const business = await prisma.business.findUnique({
      where: {
        userId,
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (!business) {
      return NextResponse.json(
        {
          error: "No tienes un negocio configurado.",
        },
        {
          status: 404,
        }
      );
    }

    // ===================================================
    // LEER ID
    // ===================================================

    const body = await request.json();

    const id = Number(body.id);

    if (!Number.isSafeInteger(id) || id <= 0) {
      return NextResponse.json(
        {
          error: "ID de cita inválido.",
        },
        {
          status: 400,
        }
      );
    }

    // ===================================================
    // BUSCAR CITA + CLIENTE
    // ===================================================

    const appointment = await prisma.appointment.findFirst({
      where: {
        id,
        businessId: business.id,
      },
      include: {
        clientRef: true,
      },
    });

    if (!appointment) {
      return NextResponse.json(
        {
          error:
            "La cita no existe o no pertenece a tu negocio.",
        },
        {
          status: 404,
        }
      );
    }

    // ===================================================
    // GUARDAR DATOS PARA EL EMAIL
    // ===================================================

    const clientName =
      appointment.clientRef?.name ||
      appointment.client ||
      "Cliente";

    const clientEmail =
      appointment.clientRef?.email || "";

    const appointmentService =
      appointment.service;

    const appointmentDate =
      appointment.date;

    const appointmentTime =
      appointment.time;

    // ===================================================
    // ELIMINAR CITA
    // ===================================================

    await prisma.appointment.delete({
      where: {
        id: appointment.id,
      },
    });

    console.log(
      "🗑️ Cita eliminada:",
      {
        businessId: business.id,
        appointmentId: appointment.id,
      }
    );

    // ===================================================
    // EMAIL DE CANCELACIÓN
    // ===================================================

    if (clientEmail) {
      try {
        const resendApiKey =
          process.env.RESEND_API_KEY;

        if (!resendApiKey) {
          console.error(
            "❌ Resend: falta RESEND_API_KEY."
          );
        } else {
          const formattedDate =
            new Intl.DateTimeFormat(
              "es-MX",
              {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              }
            ).format(
              new Date(
                `${appointmentDate}T12:00:00`
              )
            );

          const { data, error } =
            await resend.emails.send({
              from:
                "BarberAI <onboarding@resend.dev>",

              to: [clientEmail],

              subject:
                `Cancelación de tu cita en ${business.name}`,

              text: [
                `Hola ${clientName},`,
                "",
                `Tu cita en ${business.name} ha sido cancelada.`,
                "",
                `Servicio: ${appointmentService}`,
                `Fecha: ${formattedDate}`,
                `Hora: ${appointmentTime}`,
                "",
                "Si deseas reservar otra cita, puedes hacerlo nuevamente.",
                "",
                "Este correo fue enviado automáticamente por BarberAI.",
              ].join("\n"),

              html: `
                <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
                  <h2>❌ Cita cancelada</h2>

                  <p>
                    Hola ${clientName},
                  </p>

                  <p>
                    Tu cita en <strong>${business.name}</strong> ha sido cancelada.
                  </p>

                  <div style="
                    margin: 24px 0;
                    padding: 20px;
                    border: 1px solid #e5e5e5;
                    border-radius: 12px;
                  ">
                    <p>
                      <strong>Servicio:</strong>
                      ${appointmentService}
                    </p>

                    <p>
                      <strong>Fecha:</strong>
                      ${formattedDate}
                    </p>

                    <p>
                      <strong>Hora:</strong>
                      ${appointmentTime}
                    </p>
                  </div>

                  <p>
                    Si deseas reservar otra cita,
                    puedes hacerlo nuevamente.
                  </p>

                  <p style="color: #777; font-size: 12px;">
                    Este correo fue enviado automáticamente por BarberAI.
                  </p>
                </div>
              `,
            });

          if (error) {
            console.error(
              "❌ Error de Resend al enviar cancelación:",
              error
            );
          } else {
            console.log(
              "📧 Email de cancelación enviado:",
              data?.id
            );
          }
        }
      } catch (emailError) {
        console.error(
          "❌ No se pudo enviar el email de cancelación:",
          emailError
        );
      }
    } else {
      console.log(
        "ℹ️ El cliente no tiene email. No se envió cancelación."
      );
    }

    // ===================================================
    // RESPUESTA
    // ===================================================

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "❌ Error eliminando cita:",
      error
    );

    return NextResponse.json(
      {
        error: "No se pudo eliminar la cita.",
      },
      {
        status: 500,
      }
    );
  }
}
// =====================================================
// PUT — REPROGRAMAR CITA
// =====================================================

export async function PUT(
  request: Request
) {
  try {
    // ===================================================
    // AUTENTICACIÓN
    // ===================================================

    const userId = await getSessionUserId();

    if (!userId) {
      return NextResponse.json(
        { error: "No hay una sesión activa." },
        { status: 401 }
      );
    }

    // ===================================================
    // BUSCAR NEGOCIO
    // ===================================================

    const business = await prisma.business.findUnique({
      where: { userId },
      select: {
        id: true,
        name: true,
        hours: true,
      },
    });

    if (!business) {
      return NextResponse.json(
        { error: "No tienes un negocio configurado." },
        { status: 404 }
      );
    }

    // ===================================================
    // LEER DATOS
    // ===================================================

    const body = await request.json();

    const id = Number(body.id);
    const newDate = String(body.date ?? "").trim();
    const newTime = String(body.time ?? "").trim();

    if (!Number.isSafeInteger(id) || id <= 0) {
      return NextResponse.json(
        { error: "ID de cita inválido." },
        { status: 400 }
      );
    }

    // ===================================================
    // VALIDAR FECHA Y HORA
    // ===================================================

    if (!isValidDateFormat(newDate)) {
      return NextResponse.json(
        { error: "La nueva fecha no es válida." },
        { status: 400 }
      );
    }

    if (!isValidTimeFormat(newTime)) {
      return NextResponse.json(
        { error: "La nueva hora no es válida." },
        { status: 400 }
      );
    }

    // ===================================================
    // BUSCAR CITA + CLIENTE
    // ===================================================

    const appointment = await prisma.appointment.findFirst({
      where: {
        id,
        businessId: business.id,
      },
      include: {
        clientRef: true,
      },
    });

    if (!appointment) {
      return NextResponse.json(
        {
          error:
            "La cita no existe o no pertenece a tu negocio.",
        },
        { status: 404 }
      );
    }

    // ===================================================
    // GUARDAR DATOS ANTERIORES
    // ===================================================

    const oldDate = appointment.date;
    const oldTime = appointment.time;

    const clientName =
      appointment.clientRef?.name ||
      appointment.client ||
      "Cliente";

    const clientEmail =
      appointment.clientRef?.email || "";

    const appointmentService = appointment.service;

    // ===================================================
    // COMPROBAR NUEVO HORARIO DISPONIBLE
    // ===================================================

    const existingAppointment =
      await prisma.appointment.findFirst({
        where: {
          businessId: business.id,
          date: newDate,
          time: newTime,
          NOT: {
            id: appointment.id,
          },
        },
      });

    if (existingAppointment) {
      return NextResponse.json(
        {
          error:
            `El horario del ${newDate} a las ${newTime} ya está ocupado.`,
          code: "APPOINTMENT_SLOT_TAKEN",
        },
        { status: 409 }
      );
    }

    // ===================================================
    // VALIDAR HORARIO DEL NEGOCIO
    // ===================================================

    const hours = parseHours(business.hours);

    if (!hours) {
      return NextResponse.json(
        {
          error:
            "El horario guardado del negocio no se puede leer.",
        },
        { status: 500 }
      );
    }

    const dayName = getDayName(newDate);

    if (!dayName) {
      return NextResponse.json(
        { error: "La nueva fecha no es válida." },
        { status: 400 }
      );
    }

    const dayHours = hours[dayName];

    if (!dayHours) {
      return NextResponse.json(
        {
          error:
            "No hay un horario configurado para ese día.",
        },
        { status: 400 }
      );
    }

    if (dayHours.closed) {
      return NextResponse.json(
        { error: "El negocio está cerrado ese día." },
        { status: 400 }
      );
    }

    const openingTime = String(dayHours.open || "").trim();
    const closingTime = String(dayHours.close || "").trim();

    if (
      !isValidTimeFormat(openingTime) ||
      !isValidTimeFormat(closingTime)
    ) {
      return NextResponse.json(
        {
          error:
            "El horario de ese día no está configurado correctamente.",
        },
        { status: 500 }
      );
    }

    const openingMinutes = timeToMinutes(openingTime);
    const closingMinutes = timeToMinutes(closingTime);
    const newTimeMinutes = timeToMinutes(newTime);

    if (closingMinutes <= openingMinutes) {
      return NextResponse.json(
        {
          error:
            "El horario de apertura y cierre del negocio no es válido.",
        },
        { status: 500 }
      );
    }

    if (
      newTimeMinutes < openingMinutes ||
      newTimeMinutes >= closingMinutes
    ) {
      return NextResponse.json(
        {
          error:
            `El horario seleccionado (${newTime}) está fuera del horario del negocio (${openingTime} - ${closingTime}).`,
        },
        { status: 400 }
      );
    }

    // ===================================================
    // ACTUALIZAR CITA
    // ===================================================

    let updatedAppointment;

    try {
      updatedAppointment = await prisma.appointment.update({
        where: {
          id: appointment.id,
        },
        data: {
          date: newDate,
          time: newTime,
        },
        include: {
          clientRef: true,
        },
      });
    } catch (error) {
      if (isPrismaUniqueConstraintError(error)) {
        return NextResponse.json(
          {
            error:
              `El horario del ${newDate} a las ${newTime} acaba de ser ocupado por otra cita.`,
            code: "APPOINTMENT_SLOT_TAKEN",
          },
          { status: 409 }
        );
      }

      throw error;
    }

    console.log(
      "🔄 Cita reprogramada:",
      {
        businessId: business.id,
        appointmentId: appointment.id,
        oldDate,
        oldTime,
        newDate,
        newTime,
      }
    );

    // ===================================================
    // EMAIL DE REPROGRAMACIÓN
    // ===================================================

    if (clientEmail) {
      try {
        const resendApiKey = process.env.RESEND_API_KEY;

        if (!resendApiKey) {
          console.error(
            "❌ Resend: falta RESEND_API_KEY."
          );
        } else {
          const oldFormattedDate =
            new Intl.DateTimeFormat("es-MX", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            }).format(
              new Date(`${oldDate}T12:00:00`)
            );

          const newFormattedDate =
            new Intl.DateTimeFormat("es-MX", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            }).format(
              new Date(`${newDate}T12:00:00`)
            );

          const { data, error } =
            await resend.emails.send({
              from:
                "BarberAI <onboarding@resend.dev>",

              to: [clientEmail],

              subject:
                `Tu cita fue reprogramada en ${business.name}`,

              text: [
                `Hola ${clientName},`,
                "",
                `Tu cita en ${business.name} ha sido reprogramada.`,
                "",
                `Servicio: ${appointmentService}`,
                "",
                `Fecha anterior: ${oldFormattedDate}`,
                `Hora anterior: ${oldTime}`,
                "",
                `Nueva fecha: ${newFormattedDate}`,
                `Nueva hora: ${newTime}`,
                "",
                "Te esperamos. ✂️",
                "",
                "Este correo fue enviado automáticamente por BarberAI.",
              ].join("\n"),

              html: `
                <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
                  <h2>🔄 Cita reprogramada</h2>

                  <p>
                    Hola ${clientName},
                  </p>

                  <p>
                    Tu cita en <strong>${business.name}</strong>
                    ha sido reprogramada.
                  </p>

                  <div style="
                    margin: 24px 0;
                    padding: 20px;
                    border: 1px solid #e5e5e5;
                    border-radius: 12px;
                  ">
                    <p>
                      <strong>Servicio:</strong>
                      ${appointmentService}
                    </p>

                    <hr style="border: 0; border-top: 1px solid #eee;" />

                    <p>
                      <strong>Fecha anterior:</strong>
                      ${oldFormattedDate}
                    </p>

                    <p>
                      <strong>Hora anterior:</strong>
                      ${oldTime}
                    </p>

                    <hr style="border: 0; border-top: 1px solid #eee;" />

                    <p>
                      <strong>Nueva fecha:</strong>
                      ${newFormattedDate}
                    </p>

                    <p>
                      <strong>Nueva hora:</strong>
                      ${newTime}
                    </p>
                  </div>

                  <p>
                    Te esperamos. ✂️
                  </p>

                  <p style="color: #777; font-size: 12px;">
                    Este correo fue enviado automáticamente por BarberAI.
                  </p>
                </div>
              `,
            });

          if (error) {
            console.error(
              "❌ Error de Resend al enviar reprogramación:",
              error
            );
          } else {
            console.log(
              "📧 Email de reprogramación enviado:",
              data?.id
            );
          }
        }
      } catch (emailError) {
        console.error(
          "❌ No se pudo enviar el email de reprogramación:",
          emailError
        );
      }
    } else {
      console.log(
        "ℹ️ El cliente no tiene email. No se envió reprogramación."
      );
    }

    // ===================================================
    // RESPUESTA
    // ===================================================

    return NextResponse.json({
      success: true,
      appointment: updatedAppointment,
    });
  } catch (error) {
    console.error(
      "❌ Error reprogramando cita:",
      error
    );

    return NextResponse.json(
      {
        error:
          "No se pudo reprogramar la cita.",
      },
      { status: 500 }
    );
  }
}
