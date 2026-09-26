import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY!
);

export async function POST(request: Request) {
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
    // BUSCAR NEGOCIO
    // =====================================================

    const business =
      await prisma.business.findUnique({
        where: {
          userId,
        },
        select: {
          id: true,
          name: true,
          stripeCustomerId: true,
          stripeSubscriptionId: true,
          plan: true,
          subscriptionStatus: true,
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
    // COMPROBAR CLIENTE DE STRIPE
    // =====================================================

    if (!business.stripeCustomerId) {
      return NextResponse.json(
        {
          error:
            "Este negocio todavía no tiene un cliente de Stripe.",
        },
        {
          status: 400,
        }
      );
    }

    // =====================================================
    // ORIGIN
    // =====================================================

    const origin =
      request.headers.get("origin") ||
      "http://localhost:3000";

    // =====================================================
    // CREAR PORTAL
    // =====================================================

    const portalSession =
      await stripe.billingPortal.sessions.create({
        customer:
          business.stripeCustomerId,

        return_url:
          `${origin}/settings`,
      });

    // =====================================================
    // COMPROBAR URL
    // =====================================================

    if (!portalSession.url) {
      console.error(
        "❌ Stripe no devolvió una URL del Customer Portal."
      );

      return NextResponse.json(
        {
          error:
            "Stripe no pudo generar el portal.",
        },
        {
          status: 500,
        }
      );
    }

    console.log(
      "✅ Portal de Stripe creado:",
      {
        businessId:
          business.id,

        plan:
          business.plan,

        subscriptionStatus:
          business.subscriptionStatus,
      }
    );

    return NextResponse.json({
      url: portalSession.url,
    });
  } catch (error) {
    console.error(
      "❌ Error creando Portal de Stripe:",
      error
    );

    return NextResponse.json(
      {
        error:
          "No se pudo abrir el portal de Stripe.",
      },
      {
        status: 500,
      }
    );
  }
}