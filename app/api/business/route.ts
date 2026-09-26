import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import { NextResponse } from "next/server";

const TRIAL_DAYS = 14;

const MAX_NAME_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 2000;
const MAX_SERVICES_LENGTH = 5000;
const MAX_HOURS_LENGTH = 5000;
const MAX_AI_NAME_LENGTH = 100;
const MAX_AI_PERSONALITY_LENGTH = 100;
const MAX_AI_WELCOME_LENGTH = 1000;

const DEFAULT_AI_NAME = "Empleado IA";

const DEFAULT_AI_PERSONALITY =
  "amigable";

const DEFAULT_AI_WELCOME =
  "¡Hola! 👋 Soy el empleado de IA de tu negocio. ¿En qué puedo ayudarte?";

function cleanText(
  value: unknown
) {
  return String(value ?? "").trim();
}

function isTooLong(
  value: string,
  maxLength: number
) {
  return value.length > maxLength;
}

// =====================================================
// GET — OBTENER NEGOCIO
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

          name: true,

          description: true,

          services: true,

          hours: true,

          createdAt: true,

          plan: true,

          subscriptionStatus:
            true,

          trialStartedAt:
            true,

          trialEndsAt:
            true,

          subscriptionStartedAt:
            true,

          subscriptionEndsAt:
            true,

          aiName: true,

          aiPersonality:
            true,

          aiWelcome:
            true,

          aiCanBook:
            true,

          aiCanCancel:
            true,

          aiCanReschedule:
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

    /*
     * No enviamos:
     *
     * stripeCustomerId
     * stripeSubscriptionId
     *
     * al navegador.
     *
     * Son datos internos del servidor.
     */

    return NextResponse.json({
      business,
    });
  } catch (error) {
    console.error(
      "❌ Error obteniendo negocio:",
      error
    );

    return NextResponse.json(
      {
        error:
          "No se pudo obtener el negocio.",
      },
      {
        status: 500,
      }
    );
  }
}

// =====================================================
// POST — CREAR / ACTUALIZAR NEGOCIO
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
    // LEER REQUEST
    // ===================================================

    let body: unknown;

    try {
      body =
        await request.json();
    } catch {
      return NextResponse.json(
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
      return NextResponse.json(
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
      body as Record<
        string,
        unknown
      >;

    // ===================================================
    // DATOS DEL NEGOCIO
    // ===================================================

    const name =
      cleanText(data.name);

    const description =
      cleanText(
        data.description
      );

    const services =
      cleanText(
        data.services
      );

    const hours =
      cleanText(
        data.hours
      );

    // ===================================================
    // DATOS DEL EMPLEADO IA
    // ===================================================

    const aiName =
      cleanText(
        data.aiName
      ) || DEFAULT_AI_NAME;

    const aiPersonality =
      cleanText(
        data.aiPersonality
      ) ||
      DEFAULT_AI_PERSONALITY;

    const aiWelcome =
      cleanText(
        data.aiWelcome
      ) ||
      DEFAULT_AI_WELCOME;

    const aiCanBook =
      typeof data.aiCanBook ===
      "boolean"
        ? data.aiCanBook
        : true;

    const aiCanCancel =
      typeof data.aiCanCancel ===
      "boolean"
        ? data.aiCanCancel
        : true;

    const aiCanReschedule =
      typeof data.aiCanReschedule ===
      "boolean"
        ? data.aiCanReschedule
        : true;

    // ===================================================
    // CAMPOS OBLIGATORIOS
    // ===================================================

    if (
      !name ||
      !description ||
      !services ||
      !hours
    ) {
      return NextResponse.json(
        {
          error:
            "Nombre, descripción, servicios y horarios son obligatorios.",
        },
        {
          status: 400,
        }
      );
    }

    // ===================================================
    // LÍMITES DE TEXTO
    // ===================================================

    if (
      isTooLong(
        name,
        MAX_NAME_LENGTH
      )
    ) {
      return NextResponse.json(
        {
          error:
            `El nombre del negocio no puede superar los ${MAX_NAME_LENGTH} caracteres.`,
        },
        {
          status: 400,
        }
      );
    }

    if (
      isTooLong(
        description,
        MAX_DESCRIPTION_LENGTH
      )
    ) {
      return NextResponse.json(
        {
          error:
            `La descripción no puede superar los ${MAX_DESCRIPTION_LENGTH} caracteres.`,
        },
        {
          status: 400,
        }
      );
    }

    if (
      isTooLong(
        services,
        MAX_SERVICES_LENGTH
      )
    ) {
      return NextResponse.json(
        {
          error:
            `Los servicios no pueden superar los ${MAX_SERVICES_LENGTH} caracteres.`,
        },
        {
          status: 400,
        }
      );
    }

    if (
      isTooLong(
        hours,
        MAX_HOURS_LENGTH
      )
    ) {
      return NextResponse.json(
        {
          error:
            `Los horarios no pueden superar los ${MAX_HOURS_LENGTH} caracteres.`,
        },
        {
          status: 400,
        }
      );
    }

    if (
      isTooLong(
        aiName,
        MAX_AI_NAME_LENGTH
      )
    ) {
      return NextResponse.json(
        {
          error:
            `El nombre del empleado IA no puede superar los ${MAX_AI_NAME_LENGTH} caracteres.`,
        },
        {
          status: 400,
        }
      );
    }

    if (
      isTooLong(
        aiPersonality,
        MAX_AI_PERSONALITY_LENGTH
      )
    ) {
      return NextResponse.json(
        {
          error:
            `La personalidad de la IA no puede superar los ${MAX_AI_PERSONALITY_LENGTH} caracteres.`,
        },
        {
          status: 400,
        }
      );
    }

    if (
      isTooLong(
        aiWelcome,
        MAX_AI_WELCOME_LENGTH
      )
    ) {
      return NextResponse.json(
        {
          error:
            `El mensaje de bienvenida no puede superar los ${MAX_AI_WELCOME_LENGTH} caracteres.`,
        },
        {
          status: 400,
        }
      );
    }

    // ===================================================
    // BUSCAR NEGOCIO
    // ===================================================

    const existingBusiness =
      await prisma.business.findUnique({
        where: {
          userId,
        },
      });

    // ===================================================
    // ACTUALIZAR NEGOCIO EXISTENTE
    // ===================================================

    if (existingBusiness) {
      const business =
        await prisma.business.update({
          where: {
            id: existingBusiness.id,
          },

          data: {
            name,

            description,

            services,

            hours,

            aiName,

            aiPersonality,

            aiWelcome,

            aiCanBook,

            aiCanCancel,

            aiCanReschedule,
          },

          select: {
            id: true,

            name: true,

            description: true,

            services: true,

            hours: true,

            createdAt: true,

            plan: true,

            subscriptionStatus:
              true,

            trialStartedAt:
              true,

            trialEndsAt:
              true,

            subscriptionStartedAt:
              true,

            subscriptionEndsAt:
              true,

            aiName: true,

            aiPersonality:
              true,

            aiWelcome:
              true,

            aiCanBook:
              true,

            aiCanCancel:
              true,

            aiCanReschedule:
              true,
          },
        });

      console.log(
        "✅ Negocio actualizado:",
        {
          businessId:
            business.id,

          userId,
        }
      );

      return NextResponse.json({
        success: true,

        business,
      });
    }

    // ===================================================
    // CREAR TRIAL DE 14 DÍAS
    // ===================================================

    const trialStartedAt =
      new Date();

    const trialEndsAt =
      new Date(
        trialStartedAt
      );

    trialEndsAt.setDate(
      trialEndsAt.getDate() +
        TRIAL_DAYS
    );

    // ===================================================
    // CREAR NEGOCIO
    // ===================================================

    const business =
      await prisma.business.create(
        {
          data: {
            name,

            description,

            services,

            hours,

            userId,

            plan: "FREE",

            subscriptionStatus:
              "TRIALING",

            trialStartedAt,

            trialEndsAt,

            aiName,

            aiPersonality,

            aiWelcome,

            aiCanBook,

            aiCanCancel,

            aiCanReschedule,
          },

          select: {
            id: true,

            name: true,

            description: true,

            services: true,

            hours: true,

            createdAt: true,

            plan: true,

            subscriptionStatus:
              true,

            trialStartedAt:
              true,

            trialEndsAt:
              true,

            subscriptionStartedAt:
              true,

            subscriptionEndsAt:
              true,

            aiName: true,

            aiPersonality:
              true,

            aiWelcome:
              true,

            aiCanBook:
              true,

            aiCanCancel:
              true,

            aiCanReschedule:
              true,
          },
        }
      );

    console.log(
      "🎁 Trial creado:",
      {
        businessId:
          business.id,

        userId,

        trialStartedAt,

        trialEndsAt,

        days: TRIAL_DAYS,
      }
    );

    return NextResponse.json({
      success: true,

      business,
    });
  } catch (error) {
    console.error(
      "❌ Error guardando negocio:",
      error
    );

    return NextResponse.json(
      {
        error:
          "No se pudo guardar el negocio.",
      },
      {
        status: 500,
      }
    );
  }
}