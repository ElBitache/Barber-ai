import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import { askAI } from "@/lib/ai/router";
import { cookies } from "next/headers";
import { checkBusinessTrial } from "@/lib/subscription";
import {
  createHmac,
  timingSafeEqual,
} from "crypto";

type ConversationMessage = {
  role: "user" | "assistant";
  content: string;
};

type PendingAction = {
  action: "cancel" | "change";
  appointmentId?: number;
  client: string;
  currentDate: string;
  currentTime: string;
  newDate?: string;
  newTime?: string;
  newService?: string;
};

const PENDING_ACTION_COOKIE =
  "barberai_pending_action";

const PENDING_ACTION_MAX_AGE =
  60 * 10;

const MAX_MESSAGE_LENGTH = 2000;
const MAX_CONVERSATION_MESSAGES = 20;
const MAX_CONVERSATION_CONTENT_LENGTH = 2000;

// ==================================================
// LÍMITES DE CLIENTES
// ==================================================

function getClientLimit(
  plan: "FREE" | "PRO" | "BUSINESS"
) {
  switch (plan) {
    case "PRO":
      return 500;

    case "BUSINESS":
      return null;

    case "FREE":
    default:
      return 50;
  }
}

// ==================================================
// SEGURIDAD DE COOKIE
// ==================================================

function getPendingActionSecret() {
  const secret =
    process.env.SESSION_SECRET;

  if (!secret) {
    throw new Error(
      "SESSION_SECRET no está configurada."
    );
  }

  return secret;
}

function signPendingAction(
  payload: string
) {
  return createHmac(
    "sha256",
    getPendingActionSecret()
  )
    .update(payload)
    .digest("base64url");
}

function createSignedPendingValue(
  action: PendingAction
) {
  const payload =
    Buffer.from(
      JSON.stringify(action),
      "utf8"
    ).toString("base64url");

  const signature =
    signPendingAction(payload);

  return `${payload}.${signature}`;
}

function verifySignedPendingValue(
  value: string
): PendingAction | null {
  try {
    const parts =
      value.split(".");

    if (
      parts.length !== 2
    ) {
      return null;
    }

    const [
      payload,
      receivedSignature,
    ] = parts;

    if (
      !payload ||
      !receivedSignature
    ) {
      return null;
    }

    const expectedSignature =
      signPendingAction(payload);

    const receivedBuffer =
      Buffer.from(
        receivedSignature,
        "base64url"
      );

    const expectedBuffer =
      Buffer.from(
        expectedSignature,
        "base64url"
      );

    if (
      receivedBuffer.length !==
      expectedBuffer.length
    ) {
      return null;
    }

    if (
      !timingSafeEqual(
        receivedBuffer,
        expectedBuffer
      )
    ) {
      return null;
    }

    const decoded =
      Buffer.from(
        payload,
        "base64url"
      ).toString("utf8");

    const parsed =
      JSON.parse(decoded);

    if (
      !parsed ||
      typeof parsed !== "object"
    ) {
      return null;
    }

    if (
      parsed.action !== "cancel" &&
      parsed.action !== "change"
    ) {
      return null;
    }

    if (
      typeof parsed.client !==
      "string"
    ) {
      return null;
    }

    if (
      typeof parsed.currentDate !==
      "string"
    ) {
      return null;
    }

    if (
      typeof parsed.currentTime !==
      "string"
    ) {
      return null;
    }

    if (
      parsed.appointmentId !==
        undefined &&
      (
        typeof parsed.appointmentId !==
          "number" ||
        !Number.isInteger(
          parsed.appointmentId
        ) ||
        parsed.appointmentId <= 0
      )
    ) {
      return null;
    }

    if (
      parsed.action === "change"
    ) {
      if (
        parsed.newDate !==
          undefined &&
        typeof parsed.newDate !==
          "string"
      ) {
        return null;
      }

      if (
        parsed.newTime !==
          undefined &&
        typeof parsed.newTime !==
          "string"
      ) {
        return null;
      }

      if (
        parsed.newService !==
          undefined &&
        typeof parsed.newService !==
          "string"
      ) {
        return null;
      }
    }

    return parsed as PendingAction;
  } catch {
    return null;
  }
}

// ==================================================
// LÍMITES DE IA POR PLAN
// ==================================================

function getAIMonthlyLimit(
  plan: "FREE" | "PRO" | "BUSINESS"
) {
  switch (plan) {
    case "PRO":
      return 2000;

    case "BUSINESS":
      return 10000;

    case "FREE":
    default:
      return 100;
  }
}

function getCurrentUsageMonth() {
  const now = new Date();

  const year =
    now.getFullYear();

  const month =
    String(
      now.getMonth() + 1
    ).padStart(2, "0");

  return `${year}-${month}`;
}

async function reserveAIMessage(
  businessId: number,
  plan: "FREE" | "PRO" | "BUSINESS"
) {
  const month =
    getCurrentUsageMonth();

  const limit =
    getAIMonthlyLimit(plan);

  const usage =
    await prisma.monthlyUsage.upsert({
      where: {
        businessId_month: {
          businessId,
          month,
        },
      },
      create: {
        businessId,
        month,
        aiMessagesUsed: 0,
      },
      update: {},
    });

  const updated =
    await prisma.monthlyUsage.updateMany({
      where: {
        id: usage.id,
        aiMessagesUsed: {
          lt: limit,
        },
      },
      data: {
        aiMessagesUsed: {
          increment: 1,
        },
      },
    });

  if (
    updated.count === 0
  ) {
    return {
      allowed: false,
      used:
        usage.aiMessagesUsed,
      limit,
      month,
    };
  }

  return {
    allowed: true,
    used:
      usage.aiMessagesUsed + 1,
    limit,
    month,
  };
}

// ==================================================
// UTILIDADES GENERALES
// ==================================================

function normalizeText(
  text: string
) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .replace(
      /[¿?¡!.,;:]/g,
      " "
    )
    .replace(
      /\s+/g,
      " "
    )
    .trim();
}

function getTodayLocal() {
  const now = new Date();

  const year =
    now.getFullYear();

  const month =
    String(
      now.getMonth() + 1
    ).padStart(2, "0");

  const day =
    String(
      now.getDate()
    ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function addDays(
  dateString: string,
  days: number
) {
  const date =
    new Date(
      `${dateString}T12:00:00`
    );

  date.setDate(
    date.getDate() + days
  );

  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1
    ).padStart(2, "0");

  const day =
    String(
      date.getDate()
    ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getDayName(
  date: string
) {
  const days = [
    "Domingo",
    "Lunes",
    "Martes",
    "Miércoles",
    "Jueves",
    "Viernes",
    "Sábado",
  ];

  const selectedDate =
    new Date(
      `${date}T12:00:00`
    );

  return days[
    selectedDate.getDay()
  ];
}

function getWeekdayIndex(
  weekday: string
) {
  const normalized =
    normalizeText(weekday);

  const weekdays = [
    "domingo",
    "lunes",
    "martes",
    "miercoles",
    "jueves",
    "viernes",
    "sabado",
  ];

  return weekdays.indexOf(
    normalized
  );
}

function resolveDateFromMessage(
  message: string,
  today: string
) {
  const normalized =
    normalizeText(message);

  if (
    normalized.includes(
      "pasado manana"
    )
  ) {
    return addDays(
      today,
      2
    );
  }

  if (
    normalized.includes(
      "manana"
    )
  ) {
    return addDays(
      today,
      1
    );
  }

  if (
    normalized.includes(
      "hoy"
    )
  ) {
    return today;
  }

  const weekdays = [
    "domingo",
    "lunes",
    "martes",
    "miercoles",
    "jueves",
    "viernes",
    "sabado",
  ];

  for (
    let index = 0;
    index < weekdays.length;
    index++
  ) {
    const weekday =
      weekdays[index];

    const regex =
      new RegExp(
        `\\b(?:el\\s+)?(?:proximo\\s+|este\\s+)?${weekday}\\b`,
        "i"
      );

    if (
      regex.test(normalized)
    ) {
      const target =
        getWeekdayIndex(
          weekday
        );

      if (
        target < 0
      ) {
        return null;
      }

      const currentDate =
        new Date(
          `${today}T12:00:00`
        );

      const currentDay =
        currentDate.getDay();

      let difference =
        target - currentDay;

      if (
        difference < 0
      ) {
        difference += 7;
      }

      if (
        normalized.includes(
          `proximo ${weekday}`
        )
      ) {
        if (
          difference === 0
        ) {
          difference = 7;
        }
      }

      return addDays(
        today,
        difference
      );
    }
  }

  return null;
}

// ==================================================
// VALIDACIONES DE FECHA Y HORA
// ==================================================

function isValidDate(
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

  return (
    !Number.isNaN(
      parsed.getTime()
    ) &&
    parsed
      .toISOString()
      .slice(0, 10) ===
      date
  );
}

function isValidTime(
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
    hours,
    minutes,
  ] = time
    .split(":")
    .map(Number);

  return (
    hours >= 0 &&
    hours <= 23 &&
    minutes >= 0 &&
    minutes <= 59
  );
}

function isPastDateTime(
  date: string,
  time: string,
  today: string
) {
  if (
    date < today
  ) {
    return true;
  }

  if (
    date > today
  ) {
    return false;
  }

  const now =
    new Date();

  const currentTime =
    now
      .toTimeString()
      .slice(0, 5);

  return time < currentTime;
}

// ==================================================
// HORARIOS
// ==================================================

function getDayHours(
  hoursText: string,
  dayName: string
) {
  const lines =
    hoursText
      .split("\n")
      .map((line) =>
        line.trim()
      )
      .filter(Boolean);

  const normalizedDay =
    normalizeText(
      dayName
    );

  const line =
    lines.find(
      (item) =>
        normalizeText(
          item
        ).startsWith(
          normalizedDay
        )
    );

  if (!line) {
    return null;
  }

  const normalizedLine =
    normalizeText(
      line
    );

  if (
    normalizedLine.includes(
      "cerrado"
    )
  ) {
    return {
      closed: true,
      open: "",
      close: "",
    };
  }

  const match =
    line.match(
      /(\d{1,2}:\d{2})\s*[-–—]\s*(\d{1,2}:\d{2})/
    );

  if (!match) {
    return null;
  }

  const open =
    normalizeTime(
      match[1]
    );

  const close =
    normalizeTime(
      match[2]
    );

  if (
    !open ||
    !close
  ) {
    return null;
  }

  return {
    closed: false,
    open,
    close,
  };
}

function normalizeTime(
  time: string
) {
  const cleaned =
    time.trim();

  const match =
    cleaned.match(
      /^(\d{1,2}):(\d{2})$/
    );

  if (!match) {
    return null;
  }

  const hours =
    Number(match[1]);

  const minutes =
    Number(match[2]);

  if (
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  return (
    String(hours).padStart(
      2,
      "0"
    ) +
    ":" +
    String(minutes).padStart(
      2,
      "0"
    )
  );
}

function isTimeWithinHours(
  time: string,
  open: string,
  close: string
) {
  return (
    time >= open &&
    time <= close
  );
}

// ==================================================
// SERVICIOS
// ==================================================

function extractServiceName(
  line: string
) {
  const separators = [
    ":",
    "–",
    "—",
    " - ",
  ];

  let result =
    line.trim();

  for (
    const separator of separators
  ) {
    if (
      result.includes(
        separator
      )
    ) {
      result =
        result
          .split(separator)[0]
          .trim();

      break;
    }
  }

  return result;
}

function getConfiguredServiceName(
  requestedService: string,
  servicesText: string
) {
  const requested =
    normalizeText(
      requestedService
    );

  const lines =
    servicesText
      .split("\n")
      .map((line) =>
        line.trim()
      )
      .filter(Boolean);

  const matchingLine =
    lines.find(
      (line) => {
        const serviceName =
          normalizeText(
            extractServiceName(
              line
            )
          );

        return (
          serviceName ===
            requested ||
          serviceName.includes(
            requested
          ) ||
          requested.includes(
            serviceName
          )
        );
      }
    );

  if (!matchingLine) {
    return requestedService;
  }

  return extractServiceName(
    matchingLine
  );
}

function isServiceAvailable(
  requestedService: string,
  servicesText: string
) {
  const requested =
    normalizeText(
      requestedService
    );

  if (!requested) {
    return false;
  }

  const lines =
    servicesText
      .split("\n")
      .map((line) =>
        line.trim()
      )
      .filter(Boolean);

  return lines.some(
    (line) => {
      const serviceName =
        normalizeText(
          extractServiceName(
            line
          )
        );

      return (
        serviceName ===
          requested ||
        serviceName.includes(
          requested
        ) ||
        requested.includes(
          serviceName
        )
      );
    }
  );
}

// ==================================================
// CONFIRMACIONES
// ==================================================

function isConfirmationMessage(
  message: string
) {
  const normalized =
    normalizeText(
      message
    );

  const confirmations = [
    "si",
    "confirmo",
    "esa",
    "esa misma",
    "esa cita",
    "si esa",
    "si esa misma",
    "correcto",
    "correcta",
    "exacto",
    "exacta",
    "adelante",
    "hazlo",
    "dale",
    "si hazlo",
    "si por favor",
    "si porfa",
    "confirmado",
    "cancelala",
    "cancelala por favor",
    "si cancelala",
    "si cancelala por favor",
  ];

  return confirmations.some(
    (confirmation) =>
      normalizeText(
        confirmation
      ) === normalized
  );
}

// ==================================================
// COOKIE DE ACCIÓN PENDIENTE
// ==================================================

async function getPendingAction(): Promise<PendingAction | null> {
  const cookieStore =
    await cookies();

  const value =
    cookieStore.get(
      PENDING_ACTION_COOKIE
    )?.value;

  if (!value) {
    return null;
  }

  const action =
    verifySignedPendingValue(
      value
    );

  if (!action) {
    console.warn(
      "⚠️ Cookie de acción pendiente inválida o manipulada."
    );

    await clearPendingAction();

    return null;
  }

  return action;
}

async function savePendingAction(
  action: PendingAction
) {
  const cookieStore =
    await cookies();

  const value =
    createSignedPendingValue(
      action
    );

  cookieStore.set(
    PENDING_ACTION_COOKIE,
    value,
    {
      httpOnly: true,
      secure:
        process.env.NODE_ENV ===
        "production",
      sameSite: "lax",
      path: "/",
      maxAge:
        PENDING_ACTION_MAX_AGE,
    }
  );

  console.log(
    "⏳ Acción pendiente guardada:",
    {
      action:
        action.action,
      appointmentId:
        action.appointmentId,
    }
  );
}

async function clearPendingAction() {
  const cookieStore =
    await cookies();

  cookieStore.delete(
    PENDING_ACTION_COOKIE
  );

  console.log(
    "🧹 Acción pendiente eliminada."
  );
}

// ==================================================
// ERRORES DE PRISMA
// ==================================================

function isPrismaUniqueError(
  error: unknown
) {
  return (
    typeof error ===
      "object" &&
    error !== null &&
    "code" in error &&
    (
      error as {
        code?: string;
      }
    ).code ===
      "P2002"
  );
}

// ==================================================
// RANGOS
// ==================================================

function getWeekRange(
  dateString: string
) {
  const date =
    new Date(
      `${dateString}T12:00:00`
    );

  const day =
    date.getDay();

  const diffToMonday =
    day === 0
      ? -6
      : 1 - day;

  const monday =
    new Date(date);

  monday.setDate(
    date.getDate() +
      diffToMonday
  );

  const sunday =
    new Date(monday);

  sunday.setDate(
    monday.getDate() + 6
  );

  const formatDate = (
    value: Date
  ) => {
    const year =
      value.getFullYear();

    const month =
      String(
        value.getMonth() + 1
      ).padStart(
        2,
        "0"
      );

    const dayNumber =
      String(
        value.getDate()
      ).padStart(
        2,
        "0"
      );

    return `${year}-${month}-${dayNumber}`;
  };

  return {
    start:
      formatDate(monday),
    end:
      formatDate(sunday),
  };
}

function getMonthPrefix(
  dateString: string
) {
  return dateString.slice(
    0,
    7
  );
}

// ==================================================
// LIMPIAR RESPUESTAS IA
// ==================================================

function cleanAIJson(
  text: string
) {
  return text
    .replace(
      /```json/gi,
      ""
    )
    .replace(
      /```/g,
      ""
    )
    .trim();
}

function removeActionTags(
  text: string
) {
  return text
    .replace(
      /\[CONFIRMAR_RESERVA\]/gi,
      ""
    )
    .replace(
      /\[CANCELAR_CITA(?:\|[^\]]+)?\]/gi,
      ""
    )
    .replace(
      /\[CONFIRMAR_CANCELACION\]/gi,
      ""
    )
    .replace(
      /\[CAMBIAR_CITA\]/gi,
      ""
    )
    .replace(
      /\[CONFIRMAR_CAMBIO\]/gi,
      ""
    )
    .replace(
      /\[CONSULTAR_NEGOCIO\]/gi,
      ""
    )
    .replace(
      /\n{3,}/g,
      "\n\n"
    )
    .trim();
}
    // ==================================================
export async function POST(
  request: Request
) {
  try {
    // ==================================================
    // SESIÓN
    // ==================================================

    const userId =
      await getSessionUserId();

    if (!userId) {
      return Response.json(
        {
          error:
            "No hay una sesión activa. Inicia sesión para utilizar la IA.",
        },
        {
          status: 401,
        }
      );
    }

    // ==================================================
    // BODY
    // ==================================================

    let body: unknown;

    try {
      body =
        await request.json();
    } catch {
      return Response.json(
        {
          error:
            "El cuerpo de la solicitud no es válido.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !body ||
      typeof body !== "object"
    ) {
      return Response.json(
        {
          error:
            "Los datos enviados no son válidos.",
        },
        {
          status: 400,
        }
      );
    }

    const data =
      body as {
        message?: unknown;
        conversation?: unknown;
      };

    const message =
      typeof data.message ===
      "string"
        ? data.message.trim()
        : "";

    if (!message) {
      return Response.json(
        {
          error:
            "No se recibió ningún mensaje.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      message.length >
      MAX_MESSAGE_LENGTH
    ) {
      return Response.json(
        {
          error:
            "El mensaje es demasiado largo. Máximo 2000 caracteres.",
        },
        {
          status: 400,
        }
      );
    }

    // ==================================================
    // CONVERSACIÓN SEGURA
    // ==================================================

    const rawConversation =
      Array.isArray(
        data.conversation
      )
        ? data.conversation
        : [];

    const conversation:
      ConversationMessage[] =
      rawConversation
        .filter(
          (item) => {
            if (
              !item ||
              typeof item !==
                "object"
            ) {
              return false;
            }

            const value =
              item as {
                role?: unknown;
                content?: unknown;
              };

            return (
              (
                value.role ===
                  "user" ||
                value.role ===
                  "assistant"
              ) &&
              typeof value.content ===
                "string"
            );
          }
        )
        .map(
          (item) => {
            const value =
              item as {
                role:
                  | "user"
                  | "assistant";
                content: string;
              };

            return {
              role:
                value.role,
              content:
                value.content
                  .trim()
                  .slice(
                    0,
                    MAX_CONVERSATION_CONTENT_LENGTH
                  ),
            };
          }
        )
        .filter(
          (item) =>
            item.content.length >
            0
        )
        .slice(
          -MAX_CONVERSATION_MESSAGES
        );

    // ==================================================
    // NEGOCIO
    // ==================================================

    const business =
      await prisma.business.findUnique(
        {
          where: {
            userId,
          },
        }
      );

    if (!business) {
      return Response.json(
        {
          error:
            "No tienes un negocio configurado.",
        },
        {
          status: 400,
        }
      );
    }

    // ==================================================
    // VERIFICAR TRIAL / SUSCRIPCIÓN
    // ==================================================

    const trialStatus =
      await checkBusinessTrial(
        business.id
      );

    const subscriptionIsActive =
      business.subscriptionStatus ===
        "ACTIVE" ||
      business.subscriptionStatus ===
        "TRIALING";

    if (
      !trialStatus.active ||
      !subscriptionIsActive
    ) {
      return Response.json(
        {
          error:
            "Tu acceso a la IA ha terminado. Elige un plan para continuar utilizando BarberAI.",
          code:
            trialStatus.expired
              ? "TRIAL_EXPIRED"
              : "SUBSCRIPTION_INACTIVE",
        },
        {
          status: 403,
        }
      );
    }

    // ==================================================
    // CONFIGURACIÓN IA
    // ==================================================

    const aiName =
      business.aiName ||
      "Empleado IA";

    const aiPersonality =
      business.aiPersonality ||
      "amigable";

    const aiWelcomeMessage =
      business.aiWelcome ||
      "¡Hola! 👋 Soy el empleado de IA de tu negocio. ¿En qué puedo ayudarte?";

    const aiCanBook =
      business.aiCanBook;

    const aiCanCancel =
      business.aiCanCancel;

    const aiCanReschedule =
      business.aiCanReschedule;

    // ==================================================
    // FECHA ACTUAL
    // ==================================================

    const today =
      getTodayLocal();

    const todayName =
      getDayName(
        today
      );

    // ==================================================
    // INFORMACIÓN DEL NEGOCIO
    // ==================================================

    const businessName =
      business.name;

    const description =
      business.description;

    const servicesText =
      business.services;

    const hoursText =
      business.hours;

    const businessContext = `
Nombre del negocio:
${businessName}

Descripción:
${description}

Servicios y precios:
${servicesText}

Horario:
${hoursText}
`;

    // ==================================================
    // CLIENTES
    // ==================================================

    const clients =
      await prisma.client.findMany(
        {
          where: {
            businessId:
              business.id,
          },
          include: {
            appointments: {
              orderBy: [
                {
                  date: "desc",
                },
                {
                  time: "desc",
                },
              ],
            },
          },
          orderBy: {
            createdAt:
              "desc",
          },
        }
      );

    const clientsContext =
      clients.length > 0
        ? clients
            .map(
              (client) => {
                const appointmentCount =
                  client
                    .appointments
                    .length;

                const lastAppointment =
                  client
                    .appointments[0];

                return (
                  `Cliente: ${client.name} | ` +
                  `Teléfono: ${
                    client.phone ||
                    "No registrado"
                  } | ` +
                  `Email: ${
                    client.email ||
                    "No registrado"
                  } | ` +
                  `Citas registradas: ${appointmentCount} | ` +
                  `Última cita: ${
                    lastAppointment
                      ? `${lastAppointment.date} a las ${lastAppointment.time} - ${lastAppointment.service}`
                      : "Ninguna"
                  }`
                );
              }
            )
            .join("\n")
        : "No hay clientes registrados.";

    // ==================================================
    // CITAS
    // ==================================================

    const appointments =
      await prisma.appointment.findMany(
        {
          where: {
            businessId:
              business.id,
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

    const appointmentsContext =
      appointments.length > 0
        ? appointments
            .map(
              (appointment) =>
                `ID: ${appointment.id} | ` +
                `Cliente: ${appointment.client} | ` +
                `Servicio: ${appointment.service} | ` +
                `Fecha: ${appointment.date} | ` +
                `Hora: ${appointment.time}`
            )
            .join("\n")
        : "No hay citas registradas.";

    // CONVERSACIÓN
    // ==================================================

    const conversationContext =
      conversation
        .map(
          (msg) =>
            `${
              msg.role ===
              "user"
                ? "CLIENTE"
                : "ASISTENTE"
            }: ${msg.content}`
        )
        .join("\n");

    // ==================================================
    // ACCIÓN PENDIENTE
    // ==================================================

    const pendingAction =
      await getPendingAction();

    const isConfirmation =
      isConfirmationMessage(
        message
      );

    // ==================================================
    // CONFIRMACIÓN DIRECTA
    // ==================================================

    if (
      pendingAction &&
      isConfirmation
    ) {
      console.log(
        "🔥 CONFIRMACIÓN DE ACCIÓN PENDIENTE"
      );

      // ==================================================
      // CANCELAR
      // ==================================================

      if (
        pendingAction.action ===
        "cancel"
      ) {
        if (
          !aiCanCancel
        ) {
          await clearPendingAction();

          return Response.json({
            response:
              `En este momento no puedo cancelar citas automáticamente. ` +
              `Por favor, contacta directamente con ${businessName}.`,
            confirmReservation:
              false,
          });
        }

        let appointment =
          null;

        if (
          pendingAction.appointmentId
        ) {
          appointment =
            appointments.find(
              (item) =>
                item.id ===
                pendingAction.appointmentId
            ) || null;
        }

        if (!appointment) {
          const normalizedClient =
            normalizeText(
              pendingAction.client
            );

          const matches =
            appointments.filter(
              (item) =>
                normalizeText(
                  item.client
                ) ===
                  normalizedClient &&
                item.date ===
                  pendingAction.currentDate &&
                item.time ===
                  pendingAction.currentTime
            );

          if (
            matches.length ===
            1
          ) {
            appointment =
              matches[0];
          }
        }

        if (!appointment) {
          await clearPendingAction();

          return Response.json({
            response:
              "No encontré la cita que habíamos seleccionado. Es posible que ya haya sido modificada o cancelada.",
            confirmReservation:
              false,
          });
        }

        await prisma.appointment.delete(
          {
            where: {
              id:
                appointment.id,
            },
          }
        );

        await clearPendingAction();

        return Response.json({
          response:
            `Listo, ${appointment.client}. ❌\n\n` +
            `Tu cita ha sido cancelada.\n\n` +
            `✂️ Servicio: ${appointment.service}\n` +
            `📅 Fecha: ${appointment.date}\n` +
            `🕐 Hora: ${appointment.time}`,
          confirmReservation:
            false,
          appointment,
          action:
            "cancelled",
        });
      }

      // ==================================================
      // CAMBIAR
      // ==================================================

      if (
        pendingAction.action ===
        "change"
      ) {
        if (
          !aiCanReschedule
        ) {
          await clearPendingAction();

          return Response.json({
            response:
              `En este momento no puedo cambiar citas automáticamente. ` +
              `Por favor, contacta directamente con ${businessName}.`,
            confirmReservation:
              false,
          });
        }

        let appointment =
          null;

        if (
          pendingAction.appointmentId
        ) {
          appointment =
            appointments.find(
              (item) =>
                item.id ===
                pendingAction.appointmentId
            ) || null;
        }

        if (!appointment) {
          const normalizedClient =
            normalizeText(
              pendingAction.client
            );

          const matches =
            appointments.filter(
              (item) =>
                normalizeText(
                  item.client
                ) ===
                  normalizedClient &&
                item.date ===
                  pendingAction.currentDate &&
                item.time ===
                  pendingAction.currentTime
            );

          if (
            matches.length ===
            1
          ) {
            appointment =
              matches[0];
          }
        }

        if (!appointment) {
          await clearPendingAction();

          return Response.json({
            response:
              "No pude encontrar exactamente la cita que querías cambiar.",
            confirmReservation:
              false,
          });
        }

        const newDate =
          pendingAction.newDate ||
          "";

        const newTime =
          pendingAction.newTime ||
          "";

        if (
          !isValidDate(
            newDate
          ) ||
          !isValidTime(
            newTime
          )
        ) {
          await clearPendingAction();

          return Response.json({
            response:
              "Necesito una nueva fecha y hora válidas para cambiar la cita.",
            confirmReservation:
              false,
          });
        }

        if (
          isPastDateTime(
            newDate,
            newTime,
            today
          )
        ) {
          await clearPendingAction();

          return Response.json({
            response:
              "No puedo cambiar una cita a una fecha u hora que ya pasó.",
            confirmReservation:
              false,
          });
        }

        let finalService =
          appointment.service;

        if (
          pendingAction.newService
        ) {
          if (
            !isServiceAvailable(
              pendingAction.newService,
              servicesText
            )
          ) {
            await clearPendingAction();

            return Response.json({
              response:
                `El servicio "${pendingAction.newService}" no aparece entre los servicios disponibles.`,
              confirmReservation:
                false,
            });
          }

          finalService =
            getConfiguredServiceName(
              pendingAction.newService,
              servicesText
            );
        }

        const newDayName =
          getDayName(
            newDate
          );

        const newDayHours =
          getDayHours(
            hoursText,
            newDayName
          );

        if (
          !newDayHours ||
          newDayHours.closed
        ) {
          await clearPendingAction();

          return Response.json({
            response:
              `Lo siento 😕 el negocio está cerrado el ${newDayName}.`,
            confirmReservation:
              false,
          });
        }

        if (
          !isTimeWithinHours(
            newTime,
            newDayHours.open,
            newDayHours.close
          )
        ) {
          await clearPendingAction();

          return Response.json({
            response:
              `La hora ${newTime} está fuera del horario del negocio. El ${newDayName} el horario es de ${newDayHours.open} a ${newDayHours.close}.`,
            confirmReservation:
              false,
          });
        }

        const occupiedAppointment =
          await prisma.appointment.findFirst(
            {
              where: {
                businessId:
                  business.id,
                date:
                  newDate,
                time:
                  newTime,
                id: {
                  not:
                    appointment.id,
                },
              },
            }
          );

        if (
          occupiedAppointment
        ) {
          return Response.json({
            response:
              `Lo siento 😕 el ${newDate} a las ${newTime} ya está ocupado.`,
            confirmReservation:
              false,
          });
        }

        try {
          const updatedAppointment =
            await prisma.appointment.update(
              {
                where: {
                  id:
                    appointment.id,
                },
                data: {
                  date:
                    newDate,
                  time:
                    newTime,
                  service:
                    finalService,
                },
                include: {
                  clientRef:
                    true,
                },
              }
            );

          await clearPendingAction();

          return Response.json({
            response:
              `¡Listo, ${updatedAppointment.client}! 🔄\n\n` +
              `Tu cita ha sido modificada.\n\n` +
              `✂️ Servicio: ${updatedAppointment.service}\n` +
              `📅 Nueva fecha: ${updatedAppointment.date}\n` +
              `🕐 Nueva hora: ${updatedAppointment.time}`,
            confirmReservation:
              false,
            appointment:
              updatedAppointment,
            action:
              "updated",
          });
        } catch (
          error
        ) {
          if (
            isPrismaUniqueError(
              error
            )
          ) {
            return Response.json({
              response:
                "Lo siento 😕 esa hora acaba de ser ocupada por otra cita. Elige otra fecha u hora.",
              confirmReservation:
                false,
            });
          }

          throw error;
        }
      }
    }

    // ==================================================
    // PERMISOS
    // ==================================================

    const permissionsContext = `
PERMISOS DEL EMPLEADO IA:

Puede reservar citas:
${aiCanBook ? "SÍ" : "NO"}

Puede cancelar citas:
${aiCanCancel ? "SÍ" : "NO"}

Puede cambiar citas:
${aiCanReschedule ? "SÍ" : "NO"}
`;

    // ==================================================
    // PROMPT PRINCIPAL
    // ==================================================

    const prompt = `
Eres ${aiName}, el empleado de IA de ${businessName}.

PERSONALIDAD:
${aiPersonality}

MENSAJE DE BIENVENIDA:
${aiWelcomeMessage}

FECHA ACTUAL:
${today}

DÍA DE HOY:
${todayName}

IMPORTANTE SOBRE FECHAS:

Si el usuario dice "hoy", utiliza:
${today}

Si dice "mañana", utiliza:
${addDays(today, 1)}

Si dice "pasado mañana", utiliza:
${addDays(today, 2)}

Si menciona un día de la semana como
lunes, martes, miércoles, jueves, viernes,
sábado o domingo, calcula correctamente
la fecha correspondiente tomando como referencia
la fecha actual.

Nunca inventes una fecha.

INFORMACIÓN DEL NEGOCIO:

${businessContext}

${permissionsContext}

CLIENTES REGISTRADOS:

${clientsContext}

CITAS ACTUALES:

${appointmentsContext}

CONVERSACIÓN:

${conversationContext}

ACCIÓN PENDIENTE DEL SERVIDOR:

${
  pendingAction
    ? JSON.stringify(
        pendingAction
      )
    : "NINGUNA"
}

MENSAJE ACTUAL:

${message}

REGLAS IMPORTANTES:

1. Responde siempre en español.

2. Sé natural y profesional según la personalidad configurada.

3. Utiliza únicamente los servicios configurados.

4. Nunca inventes servicios.

5. Nunca inventes precios.

6. Nunca inventes horarios.

7. Nunca inventes citas.

8. Nunca inventes clientes.

9. Nunca afirmes que una cita fue creada,
   cancelada o cambiada si el servidor todavía
   no realizó la acción.

10. Para reservar necesitas:
    nombre, servicio, fecha y hora.

11. Para cancelar debes identificar exactamente
    una cita.

12. Si existen varias citas posibles,
    NO elijas una al azar.

13. Si existen varias citas posibles,
    muestra las opciones y pide al usuario
    que indique cuál quiere cancelar o cambiar.

14. Para pedir confirmación de cancelación utiliza:

[CONFIRMAR_CANCELACION]

15. Para cancelar después de una confirmación
    válida utiliza:

[CANCELAR_CITA]

16. Nunca pongas IDs dentro de la etiqueta.

17. NO utilices:

[CANCELAR_CITA|id:22]

18. Utiliza únicamente:

[CANCELAR_CITA]

19. Para cambiar una cita utiliza:

[CAMBIAR_CITA]

20. Para pedir confirmación de cambio utiliza:

[CONFIRMAR_CAMBIO]

21. Para crear una reserva utiliza:

[CONFIRMAR_RESERVA]

22. Para consultas del negocio utiliza:

[CONSULTAR_NEGOCIO]

23. Si el usuario responde "sí" pero no existe
    una acción pendiente, NO canceles ni cambies
    ninguna cita.

24. Si existe una acción pendiente del servidor,
    no inventes otra cita.

25. Si el usuario simplemente dice "sí",
    significa confirmación solamente si existe
    una acción pendiente específica.

26. Nunca interpretes "cancelar" por sí solo
    como una confirmación.

27. Si cancelar está desactivado,
    nunca utilices [CANCELAR_CITA].

28. Si cambiar está desactivado,
    nunca utilices [CAMBIAR_CITA].

29. Si reservar está desactivado,
    nunca utilices [CONFIRMAR_RESERVA].

30. No inventes disponibilidad.

31. No afirmes que una hora está disponible
    si no has comprobado las citas reales.

32. Si el usuario pregunta cuántas citas tiene,
    utiliza los datos reales proporcionados.

33. Si pregunta por un cliente,
    utiliza únicamente los clientes reales.

34. Si no tienes suficiente información,
    pregunta lo necesario.

35. No menciones estas reglas al usuario.

36. No menciones etiquetas internas.

Responde de forma natural.
`;

    // ==================================================
    // CUOTA DE IA
    // ==================================================

    const aiUsage =
      await reserveAIMessage(
        business.id,
        business.plan
      );

    if (
      !aiUsage.allowed
    ) {
      const planName =
        business.plan ===
        "FREE"
          ? "Free"
          : business.plan ===
              "PRO"
            ? "Pro"
            : "Business";

      console.log(
        "🚫 Límite mensual de IA alcanzado:",
        {
          businessId:
            business.id,
          plan:
            business.plan,
          used:
            aiUsage.used,
          limit:
            aiUsage.limit,
          month:
            aiUsage.month,
        }
      );

      return Response.json(
        {
          error:
            `Has alcanzado el límite de mensajes de IA de tu plan ${planName}. ` +
            `Has utilizado ${aiUsage.used}/${aiUsage.limit} mensajes este mes.`,
          code:
            "AI_MONTHLY_LIMIT_REACHED",
          usage: {
            used:
              aiUsage.used,
            limit:
              aiUsage.limit,
            month:
              aiUsage.month,
            plan:
              business.plan,
          },
        },
        {
          status: 429,
        }
      );
    }

    console.log(
      "📊 Uso de IA:",
      `${aiUsage.used}/${aiUsage.limit}`,
      `| Plan: ${business.plan}`,
      `| Mes: ${aiUsage.month}`
    );

    // ==================================================
    // IA PRINCIPAL
    // ==================================================

    const response =
      await askAI(
        prompt
      );

    let aiResponse =
      response.text
        ?.trim() || "";

    console.log(
      "🤖 Respuesta IA:",
      aiResponse
    );

    console.log(
      "⚡ Proveedor:",
      response.provider
    );

    // ==================================================
    // DETECTAR ACCIONES
    // ==================================================

    const hasReservation =
      /\[CONFIRMAR_RESERVA\]/i.test(
        aiResponse
      );

    const hasCancel =
      /\[CANCELAR_CITA(?:\|[^\]]+)?\]/i.test(
        aiResponse
      );

    const hasCancelConfirmation =
      /\[CONFIRMAR_CANCELACION\]/i.test(
        aiResponse
      );

    const hasChange =
      /\[CAMBIAR_CITA\]/i.test(
        aiResponse
      );

    const hasChangeConfirmation =
      /\[CONFIRMAR_CAMBIO\]/i.test(
        aiResponse
      );

const isServiceOrPriceQuestion =
  /(servicio|servicios|precio|precios|cu[aá]nto cuesta|cu[aá]nto vale|tarifa|costo|coste)/i.test(
    message
  );

const hasBusinessQuery =
  /\[CONSULTAR_NEGOCIO\]/i.test(
    aiResponse
  ) &&
  !isServiceOrPriceQuestion;

    // ==================================================
    // SEGURIDAD DE PERMISOS
    // ==================================================

    if (
      hasCancel &&
      !aiCanCancel
    ) {
      return Response.json({
        response:
          `En este momento no puedo cancelar citas automáticamente. Por favor, contacta directamente con ${businessName}.`,
        confirmReservation:
          false,
        provider:
          response.provider,
      });
    }

    if (
      hasChange &&
      !aiCanReschedule
    ) {
      return Response.json({
        response:
          `En este momento no puedo cambiar citas automáticamente. Por favor, contacta directamente con ${businessName}.`,
        confirmReservation:
          false,
        provider:
          response.provider,
      });
    }

    if (
      hasReservation &&
      !aiCanBook
    ) {
      return Response.json({
        response:
          `En este momento no puedo reservar citas automáticamente. Por favor, contacta directamente con ${businessName}.`,
        confirmReservation:
          false,
        provider:
          response.provider,
      });
    }

    // ==================================================
    // GUARDAR CANCELACIÓN PENDIENTE
    // ==================================================

    if (
      hasCancelConfirmation &&
      aiCanCancel
    ) {
      const pendingExtractionPrompt = `
Identifica exactamente qué cita está intentando
cancelar el asistente.

FECHA ACTUAL:
${today}

CITAS REALES:

${appointmentsContext}

CONVERSACIÓN:

${conversationContext}

MENSAJE ACTUAL DEL CLIENTE:

${message}

RESPUESTA DEL ASISTENTE:

${aiResponse}

REGLAS:

- Utiliza únicamente las citas reales.
- Nunca inventes una cita.
- Si hay UNA sola cita claramente identificada,
  devuelve su ID.
- Si hay DOS o más posibilidades,
  devuelve ambiguous=true.
- Nunca elijas una opción al azar.
- Si el mensaje dice "miércoles",
  verifica la fecha real del miércoles.
- Si el asistente se equivocó con una fecha,
  utiliza la cita que realmente corresponde
  al contexto del cliente.
- Si no puedes identificar exactamente una cita,
  devuelve ambiguous=true.

Devuelve ÚNICAMENTE JSON:

{
  "ambiguous": false,
  "appointmentId": 0
}
`;

      const pendingResponse =
        await askAI(
          pendingExtractionPrompt
        );

      const pendingText =
        cleanAIJson(
          pendingResponse.text ||
            ""
        );

      try {
        const pendingData =
          JSON.parse(
            pendingText
          );

        if (
          pendingData.ambiguous ===
          true
        ) {
          return Response.json({
            response:
              removeActionTags(
                aiResponse
              ),
            confirmReservation:
              false,
            provider:
              response.provider,
          });
        }

        const appointmentId =
          Number(
            pendingData.appointmentId
          );

        const appointment =
          appointments.find(
            (item) =>
              item.id ===
                appointmentId &&
              item.businessId ===
                business.id
          );

        if (
          appointment
        ) {
          await savePendingAction(
            {
              action:
                "cancel",
              appointmentId:
                appointment.id,
              client:
                appointment.client,
              currentDate:
                appointment.date,
              currentTime:
                appointment.time,
            }
          );
        }
      } catch (
        error
      ) {
        console.error(
          "❌ Error identificando cancelación pendiente:",
          error
        );
      }

      return Response.json({
        response:
          removeActionTags(
            aiResponse
          ),
        confirmReservation:
          false,
        provider:
          response.provider,
      });
    }

    // ==================================================
    // GUARDAR CAMBIO PENDIENTE
    // ==================================================

    if (
      hasChangeConfirmation &&
      aiCanReschedule
    ) {
      const changePrompt = `
Identifica exactamente la modificación de cita.

FECHA ACTUAL:
${today}

CITAS REALES:

${appointmentsContext}

CONVERSACIÓN:

${conversationContext}

MENSAJE DEL CLIENTE:

${message}

RESPUESTA DEL ASISTENTE:

${aiResponse}

Devuelve ÚNICAMENTE JSON:

{
  "appointmentId": 0,
  "newDate": "YYYY-MM-DD",
  "newTime": "HH:mm",
  "newService": ""
}

Reglas:

- No inventes datos.
- Utiliza únicamente citas reales.
- Si el usuario dice hoy, usa ${today}.
- Si dice mañana, usa ${addDays(today, 1)}.
- Si dice pasado mañana, usa ${addDays(today, 2)}.
- Si menciona un día de la semana,
  calcula la fecha correctamente.
`;

      const changeResponse =
        await askAI(
          changePrompt
        );

      const changeText =
        cleanAIJson(
          changeResponse.text ||
            ""
        );

      try {
        const changeData =
          JSON.parse(
            changeText ||
              "{}"
          );

        const appointmentId =
          Number(
            changeData.appointmentId
          );

        const appointment =
          appointments.find(
            (item) =>
              item.id ===
                appointmentId &&
              item.businessId ===
                business.id
          );

        let newDate =
          String(
            changeData.newDate ||
              ""
          ).trim();

        const newTime =
          String(
            changeData.newTime ||
              ""
          ).trim();

        const newService =
          String(
            changeData.newService ||
              ""
          ).trim();

        const resolvedMessageDate =
          resolveDateFromMessage(
            message,
            today
          );

        if (
          resolvedMessageDate
        ) {
          newDate =
            resolvedMessageDate;
        }

        if (
          appointment &&
          isValidDate(
            newDate
          ) &&
          isValidTime(
            newTime
          )
        ) {
          await savePendingAction(
            {
              action:
                "change",
              appointmentId:
                appointment.id,
              client:
                appointment.client,
              currentDate:
                appointment.date,
              currentTime:
                appointment.time,
              newDate,
              newTime,
              newService,
            }
          );
        }
      } catch (
        error
      ) {
        console.error(
          "❌ No se pudo guardar cambio pendiente:",
          error
        );
      }

      return Response.json({
        response:
          removeActionTags(
            aiResponse
          ),
        confirmReservation:
          false,
        provider:
          response.provider,
      });
    }

    // ==================================================
    // CONSULTAS DEL NEGOCIO
    // ==================================================

    if (
      hasBusinessQuery
    ) {
      const queryPrompt = `
Analiza la pregunta del usuario.

FECHA ACTUAL:
${today}

CLIENTES:

${clientsContext}

CITAS:

${appointmentsContext}

CONVERSACIÓN:

${conversationContext}

MENSAJE:

${message}

Devuelve ÚNICAMENTE JSON:

{
  "queryType": "",
  "client": ""
}

Tipos permitidos:

today_appointments
next_appointment
week_appointments
month_appointments
total_appointments
total_clients
client_appointments

No inventes datos.
`;

      const queryResponse =
        await askAI(
          queryPrompt
        );

      const queryText =
        cleanAIJson(
          queryResponse.text ||
            ""
        );

      try {
        const queryData =
          JSON.parse(
            queryText ||
              "{}"
          );

        const queryType =
          String(
            queryData.queryType ||
              ""
          ).trim();

        const requestedClient =
          String(
            queryData.client ||
              ""
          ).trim();

        if (
          queryType ===
          "today_appointments"
        ) {
          const result =
            appointments.filter(
              (item) =>
                item.date ===
                today
            );

          if (
            result.length ===
            0
          ) {
            return Response.json({
              response:
                "Hoy no tienes citas programadas. 📅",
              confirmReservation:
                false,
              provider:
                queryResponse.provider,
            });
          }

          const list =
            result
              .map(
                (item) =>
                  `• ${item.time} — ${item.client} — ${item.service}`
              )
              .join("\n");

          return Response.json({
            response:
              `Hoy tienes ${result.length} ${
                result.length ===
                1
                  ? "cita"
                  : "citas"
              }:\n\n${list}`,
            confirmReservation:
              false,
            provider:
              queryResponse.provider,
          });
        }

        if (
          queryType ===
          "next_appointment"
        ) {
          const currentTime =
            new Date()
              .toTimeString()
              .slice(0, 5);

          const future =
            appointments
              .filter(
                (item) =>
                  item.date >
                    today ||
                  (
                    item.date ===
                      today &&
                    item.time >=
                      currentTime
                  )
              )
              .sort(
                (a, b) =>
                  `${a.date} ${a.time}`.localeCompare(
                    `${b.date} ${b.time}`
                  )
              );

          const next =
            future[0];

          if (!next) {
            return Response.json({
              response:
                "No tienes próximas citas programadas. 📅",
              confirmReservation:
                false,
              provider:
                queryResponse.provider,
            });
          }

          return Response.json({
            response:
              `Tu próxima cita es:\n\n` +
              `👤 ${next.client}\n` +
              `✂️ ${next.service}\n` +
              `📅 ${next.date}\n` +
              `🕐 ${next.time}`,
            confirmReservation:
              false,
            provider:
              queryResponse.provider,
          });
        }

        if (
          queryType ===
          "week_appointments"
        ) {
          const week =
            getWeekRange(
              today
            );

          const result =
            appointments.filter(
              (item) =>
                item.date >=
                  week.start &&
                item.date <=
                  week.end
            );

          return Response.json({
            response:
              `Esta semana tienes ${result.length} ${
                result.length ===
                1
                  ? "cita"
                  : "citas"
              }. 📅`,
            confirmReservation:
              false,
            provider:
              queryResponse.provider,
          });
        }

        if (
          queryType ===
          "month_appointments"
        ) {
          const prefix =
            getMonthPrefix(
              today
            );

          const result =
            appointments.filter(
              (item) =>
                item.date.startsWith(
                  prefix
                )
            );

          return Response.json({
            response:
              `Este mes tienes ${result.length} ${
                result.length ===
                1
                  ? "cita"
                  : "citas"
              }. 📊`,
            confirmReservation:
              false,
            provider:
              queryResponse.provider,
          });
        }

        if (
          queryType ===
          "total_appointments"
        ) {
          return Response.json({
            response:
              `Actualmente tienes ${appointments.length} ${
                appointments.length ===
                1
                  ? "cita registrada"
                  : "citas registradas"
              }. 📅`,
            confirmReservation:
              false,
            provider:
              queryResponse.provider,
          });
        }

        if (
          queryType ===
          "total_clients"
        ) {
          return Response.json({
            response:
              `Tienes ${clients.length} ${
                clients.length ===
                1
                  ? "cliente registrado"
                  : "clientes registrados"
              }. 👥`,
            confirmReservation:
              false,
            provider:
              queryResponse.provider,
          });
        }

        if (
          queryType ===
          "client_appointments"
        ) {
          const normalized =
            normalizeText(
              requestedClient
            );

          const client =
            clients.find(
              (item) =>
                normalizeText(
                  item.name
                ) ===
                normalized
            );

          if (!client) {
            return Response.json({
              response:
                `No encontré un cliente registrado llamado ${requestedClient}.`,
              confirmReservation:
                false,
              provider:
                queryResponse.provider,
            });
          }

          if (
            client
              .appointments
              .length ===
            0
          ) {
            return Response.json({
              response:
                `${client.name} no tiene citas registradas.`,
              confirmReservation:
                false,
              provider:
                queryResponse.provider,
            });
          }

          const list =
            client
              .appointments
              .map(
                (item) =>
                  `• ${item.date} a las ${item.time} — ${item.service}`
              )
              .join("\n");

          return Response.json({
            response:
              `${client.name} tiene ${client.appointments.length} ${
                client.appointments.length ===
                1
                  ? "cita registrada"
                  : "citas registradas"
              }:\n\n${list}`,
            confirmReservation:
              false,
            provider:
              queryResponse.provider,
          });
        }
      } catch (
        error
      ) {
        console.error(
          "Error interpretando consulta:",
          error
        );

        return Response.json({
          response:
            "No pude interpretar la consulta correctamente.",
          confirmReservation:
            false,
          provider:
            queryResponse.provider,
        });
      }

      return Response.json({
        response:
          "No pude determinar qué información del negocio necesitas.",
        confirmReservation:
          false,
        provider:
          queryResponse.provider,
      });
    }

    // ==================================================
    // CONVERSACIÓN NORMAL
    // ==================================================

    if (
      !hasReservation &&
      !hasCancel &&
      !hasChange
    ) {
      return Response.json({
        response:
          removeActionTags(
            aiResponse
          ),
        confirmReservation:
          false,
        provider:
          response.provider,
      });
    }

    // ==================================================
    // CANCELAR / CAMBIAR
    // ==================================================

    if (
      hasCancel ||
      hasChange
    ) {
      const extractionPrompt = `
Analiza la acción solicitada.

FECHA ACTUAL:
${today}

DÍA ACTUAL:
${todayName}

CITAS REALES:

${appointmentsContext}

CLIENTES REALES:

${clientsContext}

CONVERSACIÓN:

${conversationContext}

MENSAJE ACTUAL:

${message}

RESPUESTA DEL ASISTENTE:

${aiResponse}

ACCIÓN PENDIENTE:

${
  pendingAction
    ? JSON.stringify(
        pendingAction
      )
    : "NINGUNA"
}

REGLAS:

1. Utiliza únicamente datos de CITAS REALES.

2. Nunca inventes una cita.

3. Si existe una acción pendiente,
   utiliza esa acción.

4. Si el usuario dice "sí",
   pero no existe acción pendiente,
   NO ejecutes ninguna acción.

5. Si hay varias citas posibles,
   devuelve appointmentId=0.

6. Si el usuario menciona "miércoles",
   calcula correctamente la fecha desde:
   ${today}

7. Si menciona "hoy":
   ${today}

8. Si menciona "mañana":
   ${addDays(today, 1)}

9. Si menciona "pasado mañana":
   ${addDays(today, 2)}

Para cancelar:

{
  "appointmentId": 0,
  "client": "",
  "currentDate": "",
  "currentTime": ""
}

Para cambiar:

{
  "appointmentId": 0,
  "client": "",
  "currentDate": "",
  "currentTime": "",
  "newDate": "",
  "newTime": "",
  "newService": ""
}

Devuelve únicamente JSON.
`;

      const extractionResponse =
        await askAI(
          extractionPrompt
        );

      const extractionText =
        cleanAIJson(
          extractionResponse.text ||
            ""
        );

      try {
        const extractedData =
          JSON.parse(
            extractionText ||
              "{}"
          );

        let appointment =
          null;

        const appointmentId =
          Number(
            extractedData.appointmentId
          );

        if (
          appointmentId >
          0
        ) {
          appointment =
            appointments.find(
              (item) =>
                item.id ===
                  appointmentId &&
                item.businessId ===
                  business.id
            ) || null;
        }

        if (
          !appointment
        ) {
          const normalizedClient =
            normalizeText(
              String(
                extractedData.client ||
                  ""
              )
            );

          const matches =
            appointments.filter(
              (item) =>
                normalizedClient &&
                normalizeText(
                  item.client
                ) ===
                  normalizedClient &&
                item.date ===
                  String(
                    extractedData.currentDate ||
                      ""
                  ) &&
                item.time ===
                  String(
                    extractedData.currentTime ||
                      ""
                  )
            );

          if (
            matches.length ===
            1
          ) {
            appointment =
              matches[0];
          }

          if (
            matches.length >
            1
          ) {
            return Response.json({
              response:
                "Encontré varias citas que podrían coincidir. Por favor indícame la fecha y hora exactas.",
              confirmReservation:
                false,
              provider:
                extractionResponse.provider,
            });
          }
        }

        if (
          !appointment
        ) {
          return Response.json({
            response:
              "No pude identificar exactamente la cita. Necesito el nombre del cliente y la fecha u hora de la cita.",
            confirmReservation:
              false,
            provider:
              extractionResponse.provider,
          });
        }

        // ==================================================
        // CANCELAR
        // ==================================================

        if (
          hasCancel
        ) {
          if (
            !aiCanCancel
          ) {
            return Response.json({
              response:
                `En este momento no puedo cancelar citas automáticamente. Por favor, contacta directamente con ${businessName}.`,
              confirmReservation:
                false,
              provider:
                extractionResponse.provider,
            });
          }

          await savePendingAction(
            {
              action:
                "cancel",
              appointmentId:
                appointment.id,
              client:
                appointment.client,
              currentDate:
                appointment.date,
              currentTime:
                appointment.time,
            }
          );

          return Response.json({
            response:
              `Encontré esta cita:\n\n` +
              `👤 ${appointment.client}\n` +
              `✂️ ${appointment.service}\n` +
              `📅 ${appointment.date}\n` +
              `🕐 ${appointment.time}\n\n` +
              `¿Quieres que la cancele?`,
            confirmReservation:
              false,
            provider:
              extractionResponse.provider,
          });
        }

        // ==================================================
        // CAMBIAR
        // ==================================================

        if (
          hasChange
        ) {
          if (
            !aiCanReschedule
          ) {
            return Response.json({
              response:
                `En este momento no puedo cambiar citas automáticamente. Por favor, contacta directamente con ${businessName}.`,
              confirmReservation:
                false,
              provider:
                extractionResponse.provider,
            });
          }

          let newDate =
            String(
              extractedData.newDate ||
                ""
            ).trim();

          const newTime =
            String(
              extractedData.newTime ||
                ""
            ).trim();

          const newService =
            String(
              extractedData.newService ||
                ""
            ).trim();

          const resolvedMessageDate =
            resolveDateFromMessage(
              message,
              today
            );

          if (
            resolvedMessageDate
          ) {
            newDate =
              resolvedMessageDate;
          }

          if (
            !isValidDate(
              newDate
            ) ||
            !isValidTime(
              newTime
            )
          ) {
            await savePendingAction(
              {
                action:
                  "change",
                appointmentId:
                  appointment.id,
                client:
                  appointment.client,
                currentDate:
                  appointment.date,
                currentTime:
                  appointment.time,
              }
            );

            return Response.json({
              response:
                `Encontré la cita de ${appointment.client} el ${appointment.date} a las ${appointment.time}.\n\n¿A qué nueva fecha y hora quieres cambiarla?`,
              confirmReservation:
                false,
              provider:
                extractionResponse.provider,
            });
          }

          if (
            isPastDateTime(
              newDate,
              newTime,
              today
            )
          ) {
            return Response.json({
              response:
                "No puedo cambiar la cita a una fecha u hora que ya pasó.",
              confirmReservation:
                false,
              provider:
                extractionResponse.provider,
            });
          }

          let finalService =
            appointment.service;

          if (
            newService
          ) {
            if (
              !isServiceAvailable(
                newService,
                servicesText
              )
            ) {
              return Response.json({
                response:
                  `El servicio "${newService}" no está disponible en ${businessName}.`,
                confirmReservation:
                  false,
                provider:
                  extractionResponse.provider,
              });
            }

            finalService =
              getConfiguredServiceName(
                newService,
                servicesText
              );
          }

          const dayName =
            getDayName(
              newDate
            );

          const dayHours =
            getDayHours(
              hoursText,
              dayName
            );

          if (
            !dayHours ||
            dayHours.closed
          ) {
            return Response.json({
              response:
                `El negocio está cerrado el ${dayName}.`,
              confirmReservation:
                false,
              provider:
                extractionResponse.provider,
            });
          }

          if (
            !isTimeWithinHours(
              newTime,
              dayHours.open,
              dayHours.close
            )
          ) {
            return Response.json({
              response:
                `La hora ${newTime} está fuera del horario del negocio. El ${dayName} el horario es de ${dayHours.open} a ${dayHours.close}.`,
              confirmReservation:
                false,
              provider:
                extractionResponse.provider,
            });
          }

          const occupied =
            await prisma.appointment.findFirst(
              {
                where: {
                  businessId:
                    business.id,
                  date:
                    newDate,
                  time:
                    newTime,
                  id: {
                    not:
                      appointment.id,
                  },
                },
              }
            );

          if (
            occupied
          ) {
            return Response.json({
              response:
                `Lo siento 😕 el ${newDate} a las ${newTime} ya está ocupado.`,
              confirmReservation:
                false,
              provider:
                extractionResponse.provider,
            });
          }

          await savePendingAction(
            {
              action:
                "change",
              appointmentId:
                appointment.id,
              client:
                appointment.client,
              currentDate:
                appointment.date,
              currentTime:
                appointment.time,
              newDate,
              newTime,
              newService:
                finalService,
            }
          );

          return Response.json({
            response:
              `Encontré tu cita:\n\n` +
              `👤 ${appointment.client}\n` +
              `✂️ ${appointment.service}\n` +
              `📅 ${appointment.date}\n` +
              `🕐 ${appointment.time}\n\n` +
              `Quieres cambiarla a:\n\n` +
              `✂️ ${finalService}\n` +
              `📅 ${newDate}\n` +
              `🕐 ${newTime}\n\n` +
              `¿Confirmas el cambio?`,
            confirmReservation:
              false,
            provider:
              extractionResponse.provider,
          });
        }
      } catch (
        error
      ) {
        console.error(
          "❌ Error procesando acción:",
          error
        );

        return Response.json({
          response:
            "No pude interpretar correctamente la acción solicitada.",
          confirmReservation:
            false,
          provider:
            extractionResponse.provider,
        });
      }
    }

    // ==================================================
    // RESERVA
    // ==================================================

    if (
      !aiCanBook
    ) {
      return Response.json({
        response:
          `En este momento no puedo reservar citas automáticamente. Por favor, contacta directamente con ${businessName}.`,
        confirmReservation:
          false,
        provider:
          response.provider,
      });
    }

    const reservationPrompt = `
Extrae los datos de la reserva.

FECHA ACTUAL:
${today}

DÍA ACTUAL:
${todayName}

SERVICIOS DISPONIBLES:

${servicesText}

HORARIO:

${hoursText}

CLIENTES REALES:

${clientsContext}

CONVERSACIÓN:

${conversationContext}

MENSAJE:

${message}

Devuelve ÚNICAMENTE JSON:

{
  "client": "",
  "service": "",
  "date": "YYYY-MM-DD",
  "time": "HH:mm"
}

REGLAS:

- hoy = ${today}
- mañana = ${addDays(today, 1)}
- pasado mañana = ${addDays(today, 2)}
- Si menciona un día de la semana,
  calcula correctamente la fecha.
- Convierte horas a formato 24 horas.
- Utiliza únicamente servicios configurados.
- Si el cliente ya existe,
  utiliza su nombre exacto.
- No inventes datos.
`;

    const reservationResponse =
      await askAI(
        reservationPrompt
      );

    const reservationText =
      cleanAIJson(
        reservationResponse.text ||
          ""
      );

    try {
      const reservation =
        JSON.parse(
          reservationText ||
            "{}"
        );

      const client =
        String(
          reservation.client ||
            ""
        ).trim();

      const service =
        String(
          reservation.service ||
            ""
        ).trim();

      let date =
        String(
          reservation.date ||
            ""
        ).trim();

      const time =
        String(
          reservation.time ||
            ""
        ).trim();

      const resolvedMessageDate =
        resolveDateFromMessage(
          message,
          today
        );

      if (
        resolvedMessageDate
      ) {
        date =
          resolvedMessageDate;

        console.log(
          "📅 Fecha corregida por servidor:",
          date
        );
      }

      if (
        !client ||
        !service ||
        !date ||
        !time
      ) {
        return Response.json({
          response:
            "Para crear la cita necesito tu nombre, el servicio, la fecha y la hora.",
          confirmReservation:
            false,
          provider:
            reservationResponse.provider,
        });
      }

      if (
        !isValidDate(
          date
        ) ||
        !isValidTime(
          time
        )
      ) {
        return Response.json({
          response:
            "La fecha o la hora no tienen un formato válido.",
          confirmReservation:
            false,
          provider:
            reservationResponse.provider,
        });
      }

      if (
        isPastDateTime(
          date,
          time,
          today
        )
      ) {
        return Response.json({
          response:
            `No puedo crear una cita para una fecha u hora que ya pasó. Hoy es ${today}.`,
          confirmReservation:
            false,
          provider:
            reservationResponse.provider,
        });
      }

      if (
        !isServiceAvailable(
          service,
          servicesText
        )
      ) {
        return Response.json({
          response:
            `Lo siento 😕 el servicio "${service}" no está disponible.`,
          confirmReservation:
            false,
          provider:
            reservationResponse.provider,
        });
      }

      const configuredService =
        getConfiguredServiceName(
          service,
          servicesText
        );

      const dayName =
        getDayName(
          date
        );

      const dayHours =
        getDayHours(
          hoursText,
          dayName
        );

      if (
        !dayHours ||
        dayHours.closed
      ) {
        return Response.json({
          response:
            `El negocio está cerrado el ${dayName}.`,
          confirmReservation:
            false,
          provider:
            reservationResponse.provider,
        });
      }

      if (
        !isTimeWithinHours(
          time,
          dayHours.open,
          dayHours.close
        )
      ) {
        return Response.json({
          response:
            `El horario del ${dayName} es de ${dayHours.open} a ${dayHours.close}.`,
          confirmReservation:
            false,
          provider:
            reservationResponse.provider,
        });
      }

      // ==================================================
      // BUSCAR CITA EXISTENTE
      // ==================================================

      const existing =
        await prisma.appointment.findFirst(
          {
            where: {
              businessId:
                business.id,
              date,
              time,
            },
          }
        );

      if (
        existing
      ) {
        return Response.json({
          response:
            `Lo siento 😕 el ${date} a las ${time} ya está ocupado.`,
          confirmReservation:
            false,
          provider:
            reservationResponse.provider,
        });
      }

      // ==================================================
      // BUSCAR CLIENTE
      // ==================================================

      const normalizedClient =
        normalizeText(
          client
        );

      const clientRecord =
        clients.find(
          (item) =>
            normalizeText(
              item.name
            ) ===
            normalizedClient
        ) || null;

      // ==================================================
      // CREAR CLIENTE + CITA DE FORMA SEGURA
      // ==================================================

      try {
        const result =
          await prisma.$transaction(
            async (
              transaction
            ) => {
              let finalClient =
                clientRecord;

              // ------------------------------------------
              // CLIENTE NUEVO
              // ------------------------------------------

              if (
                !finalClient
              ) {
                const clientLimit =
                  getClientLimit(
                    business.plan
                  );

                if (
                  clientLimit !== null
                ) {
                  const clientCount =
                    await transaction.client.count(
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
                    return {
                      limitReached:
                        true as const,
                      clientCount,
                      clientLimit,
                    };
                  }
                }

                finalClient =
  await transaction.client.create(
    {
     data: {
        name:
          client,
        businessId:
          business.id,
      },
      include: {
        appointments: true,
      },
    }
  );
              }

              // ------------------------------------------
              // CREAR CITA
              // ------------------------------------------

              const appointment =
                await transaction.appointment.create(
                  {
                    data: {
                      client:
                        finalClient.name,
                      service:
                        configuredService,
                      date,
                      time,
                      businessId:
                        business.id,
                      clientId:
                        finalClient.id,
                    },
                    include: {
                      clientRef:
                        true,
                    },
                  }
                );

              return {
                limitReached:
                  false as const,
                appointment,
                client:
                  finalClient,
              };
            }
          );

        // ==================================================
        // LÍMITE DE CLIENTES ALCANZADO
        // ==================================================

        if (
          result.limitReached
        ) {
          const planName =
            business.plan ===
            "FREE"
              ? "Free"
              : "Pro";

          return Response.json({
            response:
              `Has alcanzado el límite de ${result.clientLimit} clientes de tu plan ${planName}. Para registrar más clientes, actualiza tu plan.`,
            confirmReservation:
              false,
            provider:
              reservationResponse.provider,
            code:
              "CLIENT_LIMIT_REACHED",
            usage: {
              used:
                result.clientCount,
              limit:
                result.clientLimit,
              plan:
                business.plan,
            },
          });
        }

        console.log(
          "✅ CITA CREADA:",
          result.appointment
        );

        return Response.json({
          response:
            `¡Listo, ${result.appointment.client}! 🎉\n\n` +
            `Tu cita ha quedado confirmada.\n\n` +
            `✂️ Servicio: ${result.appointment.service}\n` +
            `📅 Fecha: ${result.appointment.date}\n` +
            `🕐 Hora: ${result.appointment.time}\n\n` +
            `¡Te esperamos!`,
          confirmReservation:
            true,
          appointment:
            result.appointment,
          provider:
            reservationResponse.provider,
        });
      } catch (
        error
      ) {
        if (
          isPrismaUniqueError(
            error
          )
        ) {
          return Response.json({
            response:
              "Lo siento 😕 esa hora acaba de ser ocupada por otra cita. Elige otra fecha u hora.",
            confirmReservation:
              false,
            provider:
              reservationResponse.provider,
          });
        }

        throw error;
      }
    } catch (
      error
    ) {
      console.error(
        "❌ Error creando reserva:",
        error
      );

      return Response.json({
        response:
          "No pude interpretar correctamente los datos de la reserva.",
        confirmReservation:
          false,
        provider:
          reservationResponse.provider,
      });
    }
  } catch (
    error: any
  ) {
    console.error(
      "❌ ERROR GENERAL EN CHAT:",
      error
    );

    const status =
      Number(
        error?.status
      ) || 500;

    const errorMessage =
      String(
        error?.message ||
          error?.error?.message ||
          ""
      );

    if (
      status === 429
    ) {
      return Response.json(
        {
          error:
            "Los proveedores de IA alcanzaron su límite de uso. Inténtalo nuevamente en unos momentos.",
        },
        {
          status: 429,
        }
      );
    }

    if (
      status === 401 ||
      status === 403
    ) {
      return Response.json(
        {
          error:
            "El proveedor de IA rechazó la autenticación. Revisa la configuración de la API.",
        },
        {
          status,
        }
      );
    }

    return Response.json(
      {
        error:
          errorMessage ||
          "No se pudo completar la solicitud. Inténtalo de nuevo.",
      },
      {
        status: 500,
      }
    );
  }
}