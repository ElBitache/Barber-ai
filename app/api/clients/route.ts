import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import { NextResponse } from "next/server";

const CLIENT_LIMITS = {
  FREE: 50,
  PRO: 500,
  BUSINESS: null,
} as const;

function getClientLimit(
  plan: "FREE" | "PRO" | "BUSINESS"
) {
  return CLIENT_LIMITS[plan];
}

function normalizeOptionalValue(
  value: unknown
) {
  const normalized =
    String(value ?? "").trim();

  return normalized || null;
}

function isValidEmail(
  email: string
) {
  if (!email) {
    return true;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    email
  );
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
    (error as { code?: unknown }).code ===
      "P2002"
  );
}

// =====================================================
// GET — OBTENER CLIENTES
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

    const clients =
      await prisma.client.findMany({
        where: {
          businessId:
            business.id,
        },

        orderBy: {
          createdAt: "desc",
        },

        include: {
          appointments: {
            orderBy: {
              createdAt: "desc",
            },
          },
        },
      });

    return NextResponse.json({
      success: true,
      clients,
    });
  } catch (error) {
    console.error(
      "❌ Error obteniendo clientes:",
      error
    );

    return NextResponse.json(
      {
        error:
          "No se pudieron obtener los clientes.",
      },
      {
        status: 500,
      }
    );
  }
}

// =====================================================
// POST — CREAR CLIENTE
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
          plan: true,
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

    const name =
      String(
        body.name ?? ""
      ).trim();

    const phone =
      normalizeOptionalValue(
        body.phone
      );

    const email =
      normalizeOptionalValue(
        body.email
      );

    // ===================================================
    // VALIDAR NOMBRE
    // ===================================================

    if (!name) {
      return NextResponse.json(
        {
          error:
            "El nombre del cliente es obligatorio.",
        },
        {
          status: 400,
        }
      );
    }

    if (name.length > 100) {
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

    // ===================================================
    // VALIDAR TELÉFONO
    // ===================================================

    if (
      phone &&
      phone.length > 30
    ) {
      return NextResponse.json(
        {
          error:
            "El teléfono no puede superar los 30 caracteres.",
        },
        {
          status: 400,
        }
      );
    }

    // ===================================================
    // VALIDAR EMAIL
    // ===================================================

    if (
      email &&
      email.length > 150
    ) {
      return NextResponse.json(
        {
          error:
            "El email no puede superar los 150 caracteres.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      email &&
      !isValidEmail(email)
    ) {
      return NextResponse.json(
        {
          error:
            "El email no tiene un formato válido.",
        },
        {
          status: 400,
        }
      );
    }

    // ===================================================
    // COMPROBAR LÍMITE
    // ===================================================

    const clientLimit =
      getClientLimit(
        business.plan
      );

    if (clientLimit !== null) {
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
        const planName =
          business.plan === "FREE"
            ? "Free"
            : "Pro";

        console.log(
          "🚫 Límite de clientes alcanzado:",
          {
            businessId:
              business.id,

            plan:
              business.plan,

            used:
              clientCount,

            limit:
              clientLimit,
          }
        );

        return NextResponse.json(
          {
            error:
              `Has alcanzado el límite de ${clientLimit} clientes de tu plan ${planName}.`,

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

    // ===================================================
    // CREAR CLIENTE
    // ===================================================

    const client =
      await prisma.client.create({
        data: {
          name,

          phone,

          email,

          businessId:
            business.id,
        },
      });

    console.log(
      "👤 Cliente creado:",
      {
        businessId:
          business.id,

        clientId:
          client.id,

        plan:
          business.plan,
      }
    );

    return NextResponse.json(
      {
        success: true,
        client,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "❌ Error creando cliente:",
      error
    );

    if (
      isPrismaUniqueConstraintError(
        error
      )
    ) {
      return NextResponse.json(
        {
          error:
            "No se pudo crear el cliente porque existe un registro duplicado.",
          code:
            "DUPLICATE_CLIENT",
        },
        {
          status: 409,
        }
      );
    }

    return NextResponse.json(
      {
        error:
          "No se pudo crear el cliente.",
      },
      {
        status: 500,
      }
    );
  }
}

// =====================================================
// DELETE — ELIMINAR CLIENTE
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

    // ===================================================
    // LEER ID
    // ===================================================

    const body =
      await request.json();

    const clientId =
      Number(body.id);

    if (
      !Number.isSafeInteger(
        clientId
      ) ||
      clientId <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "ID de cliente inválido.",
        },
        {
          status: 400,
        }
      );
    }

    // ===================================================
    // COMPROBAR PROPIEDAD
    // ===================================================

    const client =
      await prisma.client.findFirst({
        where: {
          id: clientId,

          businessId:
            business.id,
        },

        select: {
          id: true,
        },
      });

    if (!client) {
      return NextResponse.json(
        {
          error:
            "Cliente no encontrado.",
        },
        {
          status: 404,
        }
      );
    }

    // ===================================================
    // ELIMINAR
    // ===================================================

    await prisma.client.delete({
      where: {
        id: client.id,
      },
    });

    console.log(
      "🗑️ Cliente eliminado:",
      {
        businessId:
          business.id,

        clientId:
          client.id,
      }
    );

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "❌ Error eliminando cliente:",
      error
    );

    return NextResponse.json(
      {
        error:
          "No se pudo eliminar el cliente.",
      },
      {
        status: 500,
      }
    );
  }
}