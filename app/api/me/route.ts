import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import { NextResponse } from "next/server";

const TRIAL_DAYS = 14;

export async function GET() {
  try {
    const userId = await getSessionUserId();

    if (!userId) {
      return NextResponse.json(
        {
          authenticated: false,
          error: "No hay una sesión activa.",
        },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      include: {
        business: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          authenticated: false,
          error: "Usuario no encontrado.",
        },
        { status: 401 }
      );
    }

    let business = user.business;

    // Si el negocio está en periodo de prueba pero
    // todavía no tiene fecha de finalización,
    // creamos el trial de 14 días.
    if (
      business &&
      business.subscriptionStatus === "TRIALING" &&
      !business.trialEndsAt
    ) {
      const trialStartedAt =
        business.trialStartedAt || new Date();

      const trialEndsAt = new Date(
        trialStartedAt
      );

      trialEndsAt.setDate(
        trialEndsAt.getDate() + TRIAL_DAYS
      );

      business = await prisma.business.update({
        where: {
          id: business.id,
        },
        data: {
          trialStartedAt,
          trialEndsAt,
        },
      });

      console.log("🎁 Trial configurado:", {
        businessId: business.id,
        trialStartedAt,
        trialEndsAt,
        days: TRIAL_DAYS,
      });
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      business,
    });
  } catch (error) {
    console.error(
      "Error obteniendo sesión:",
      error
    );

    return NextResponse.json(
      {
        error:
          "No se pudo comprobar la sesión.",
      },
      { status: 500 }
    );
  }
}