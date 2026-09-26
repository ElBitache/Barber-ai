import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import { NextResponse } from "next/server";

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
  const text =
    String(servicesText || "").trim();

  if (!text) {
    return [];
  }

  try {
    const parsed =
      JSON.parse(text);

    if (Array.isArray(parsed)) {
      return parsed
        .map((item) => ({
          name: String(
            item?.name || ""
          ).trim(),

          price: String(
            item?.price || ""
          ).trim(),
        }))
        .filter(
          (item) =>
            item.name.length > 0
        );
    }
  } catch {
    // Continuamos con texto normal.
  }

  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(
      (line) => line.length > 0
    )
    .map((line) => {
      let name = line;
      let price = "";

      if (line.includes("–")) {
        const parts =
          line.split("–");

        name =
          parts[0]?.trim() || "";

        price =
          parts
            .slice(1)
            .join("–")
            .trim();
      } else if (
        line.includes(" - ")
      ) {
        const parts =
          line.split(" - ");

        name =
          parts[0]?.trim() || "";

        price =
          parts
            .slice(1)
            .join(" - ")
            .trim();
      } else if (
        line.includes(":")
      ) {
        const parts =
          line.split(":");

        name =
          parts[0]?.trim() || "";

        price =
          parts
            .slice(1)
            .join(":")
            .trim();
      }

      return {
        name,
        price,
      };
    })
    .filter(
      (item) =>
        item.name.length > 0
    );
}

function normalizeText(
  value: string
) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function parseHours(
  hoursText: string
): BusinessHours | null {
  const text =
    String(hoursText || "").trim();

  if (!text) {
    return null;
  }

  try {
    const parsed =
      JSON.parse(text);

    if (
      parsed &&
      typeof parsed === "object" &&
      !Array.isArray(parsed)
    ) {
      return normalizeHoursObject(
        parsed
      );
    }
  } catch {
    // No era JSON.
  }

  const result: BusinessHours = {};

  const lines =
    text
      .split(/\r?\n/)
      .map((line) =>
        line.trim()
      )
      .filter(
        (line) =>
          line.length > 0
      );

  for (const line of lines) {
    const parts =
      line.split(":");

    if (parts.length < 2) {
      continue;
    }

    const rawDay =
      parts[0]
        .trim()
        .toLowerCase();

    const rawHours =
      parts
        .slice(1)
        .join(":")
        .trim()
        .toLowerCase();

    const day =
      translateDay(rawDay);

    if (!day) {
      continue;
    }

    if (
      rawHours.includes(
        "cerrado"
      ) ||
      rawHours.includes(
        "closed"
      )
    ) {
      result[day] = {
        closed: true,
      };

      continue;
    }

    const timeMatch =
      rawHours.match(
        /(\d{1,2}:\d{2})\s*(?:-|–|a|to)\s*(\d{1,2}:\d{2})/
      );

    if (timeMatch) {
      result[day] = {
        open:
          timeMatch[1],
        close:
          timeMatch[2],
        closed: false,
      };
    }
  }

  if (
    Object.keys(result)
      .length === 0
  ) {
    return null;
  }

  return result;
}

function normalizeHoursObject(
  value: Record<
    string,
    unknown
  >
): BusinessHours | null {
  const result: BusinessHours =
    {};

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

    let rawDay:
      | unknown
      | undefined =
      undefined;

    for (const key of possibleKeys) {
      if (
        value[key] !==
        undefined
      ) {
        rawDay =
          value[key];

        break;
      }
    }

    if (
      !rawDay ||
      typeof rawDay !==
        "object"
    ) {
      continue;
    }

    const dayObject =
      rawDay as Record<
        string,
        unknown
      >;

    const open =
      String(
        dayObject.open || ""
      ).trim();

    const close =
      String(
        dayObject.close || ""
      ).trim();

    const closed =
      dayObject.closed ===
        true ||
      dayObject.closed ===
        "true";

    result[day] = {
      open,
      close,
      closed,
    };
  }

  if (
    Object.keys(result)
      .length === 0
  ) {
    return null;
  }

  return result;
}

function translateDay(
  day: string
): string | null {
  const days: Record<
    string,
    string
  > = {
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

  return (
    days[day] || null
  );
}

function translateDayToSpanish(
  day: string
): string {
  const days: Record<
    string,
    string
  > = {
    Sunday: "domingo",
    Monday: "lunes",
    Tuesday: "martes",
    Wednesday: "miércoles",
    Thursday: "jueves",
    Friday: "viernes",
    Saturday: "sábado",
  };

  return (
    days[day] || day
  );
}

function getDayName(
  date: string
) {
  const parsedDate =
    new Date(
      `${date}T12:00:00`
    );

  if (
    Number.isNaN(
      parsedDate.getTime()
    )
  ) {
    return null;
  }

  const day =
    parsedDate.getDay();

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
    !/^\d{4}-\d{2}-\d{2}$/.test(
      date
    )
  ) {
    return false;
  }

  const parsed =
    new Date(
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
  ] = date
    .split("-")
    .map(Number);

  return (
    parsed.getFullYear() ===
      year &&
    parsed.getMonth() + 1 ===
      month &&
    parsed.getDate() ===
      day
  );
}

function isValidTimeFormat(
  time: string
) {
  if (
    !/^\d{2}:\d{2}$/.test(
      time
    )
  ) {
    return false;
  }

  const [
    hour,
    minute,
  ] = time
    .split(":")
    .map(Number);

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
  ] = time
    .split(":")
    .map(Number);

  return (
    hour * 60 + minute
  );
}

function isPrismaUniqueConstraintError(
  error: unknown
) {
  if (
    typeof error !==
      "object" ||
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
    ).code ===
      "P2002"
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
      await prisma.business.findUnique(
        {
          where: {
            userId,
          },

          select: {
            id: true,
          },
        }
      );

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
      await prisma.appointment.findMany(
        {
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
        }
      );

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
      await prisma.business.findUnique(
        {
          where: {
            userId,
          },

          select: {
            id: true,
            name: true,
            services: true,
            hours: true,
            plan: true,
          },
        }
      );

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
      !isValidDateFormat(
        date
      )
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
      !isValidTimeFormat(
        time
      )
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

    if (
      dayHours.closed
    ) {
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
          error: `El horario seleccionado (${time}) está fuera del horario del negocio (${openingTime} - ${closingTime}).`,
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
      await prisma.appointment.findUnique(
        {
          where: {
            businessId_date_time: {
              businessId:
                business.id,

              date,

              time,
            },
          },
        }
      );

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
      await prisma.client.findFirst(
        {
          where: {
            businessId:
              business.id,

            name: {
              equals:
                client,
            },
          },
        }
      );

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
          await prisma.client.count(
            {
              where: {
                businessId:
                  business.id,
              },
            }
          );

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
          await prisma.client.create(
            {
              data: {
                name:
                  client,

                businessId:
                  business.id,
              },
            }
          );

        console.log(
          "👤 Cliente creado automáticamente:",
          {
            businessId:
              business.id,

            clientId:
              clientRecord.id,
          }
        );
      } catch (error) {
        /*
         * Otra solicitud pudo haber creado
         * el cliente al mismo tiempo.
         *
         * En ese caso lo buscamos nuevamente.
         */
        if (
          isPrismaUniqueConstraintError(
            error
          )
        ) {
          clientRecord =
            await prisma.client.findFirst(
              {
                where: {
                  businessId:
                    business.id,

                  name: {
                    equals:
                      client,
                  },
                },
              }
            );
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
    // CREAR CITA
    // ===================================================

    try {
      const appointment =
        await prisma.appointment.create(
          {
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
          }
        );

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
      /*
       * La restricción única de Prisma es
       * la protección definitiva contra dos
       * reservas simultáneas en el mismo horario.
       */
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
      await prisma.business.findUnique(
        {
          where: {
            userId,
          },

          select: {
            id: true,
          },
        }
      );

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
    // LEER ID
    // ===================================================

    const body =
      await request.json();

    const id =
      Number(body.id);

    if (
      !Number.isSafeInteger(
        id
      ) ||
      id <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "ID de cita inválido.",
        },
        {
          status: 400,
        }
      );
    }

    // ===================================================
    // COMPROBAR PROPIEDAD
    // ===================================================

    const appointment =
      await prisma.appointment.findFirst(
        {
          where: {
            id,

            businessId:
              business.id,
          },

          select: {
            id: true,
          },
        }
      );

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
    // ELIMINAR
    // ===================================================

    await prisma.appointment.delete(
      {
        where: {
          id:
            appointment.id,
        },
      }
    );

    console.log(
      "🗑️ Cita eliminada:",
      {
        businessId:
          business.id,

        appointmentId:
          appointment.id,
      }
    );

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
        error:
          "No se pudo eliminar la cita.",
      },
      {
        status: 500,
      }
    );
  }
}