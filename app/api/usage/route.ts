import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import { NextResponse } from "next/server";

const AI_MONTHLY_LIMITS = {
  FREE: 100,
  PRO: 2000,
  BUSINESS: 10000,
} as const;

function getAIMonthlyLimit(
  plan: "FREE" | "PRO" | "BUSINESS"
) {
  return AI_MONTHLY_LIMITS[plan];
}

function getCurrentUsageMonth() {
  const now = new Date();

  const year = now.getFullYear();

  const month = String(
    now.getMonth() + 1
  ).padStart(2, "0");

  return `${year}-${month}`;
}

export async function GET() {
  try {
    // =====================================================
    // AUTENTICACIÓN
    // =====================================================

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

    // =====================================================
    // BUSCAR NEGOCIO DEL USUARIO
    // =====================================================

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

    // =====================================================
    // USO DEL MES ACTUAL
    // =====================================================

    const month =
      getCurrentUsageMonth();

    const limit =
      getAIMonthlyLimit(
        business.plan
      );

    const usage =
      await prisma.monthlyUsage.findUnique({
        where: {
          businessId_month: {
            businessId:
              business.id,

            month,
          },
        },
        select: {
          aiMessagesUsed: true,
        },
      });

    // =====================================================
    // CALCULAR ESTADÍSTICAS
    // =====================================================

    const used = Math.max(
      usage?.aiMessagesUsed ?? 0,
      0
    );

    const remaining =
      Math.max(
        limit - used,
        0
      );

    const percentage =
      Math.min(
        Math.round(
          (used / limit) * 100
        ),
        100
      );

    // =====================================================
    // RESPUESTA
    // =====================================================

    return NextResponse.json({
      plan:
        business.plan,

      used,

      limit,

      remaining,

      month,

      percentage,
    });
  } catch (error) {
    console.error(
      "❌ Error obteniendo uso de IA:",
      error
    );

    return NextResponse.json(
      {
        error:
          "No se pudo obtener el uso de IA.",
      },
      {
        status: 500,
      }
    );
  }
}