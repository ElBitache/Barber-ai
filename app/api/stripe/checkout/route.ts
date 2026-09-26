import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY!
);

const PRICE_IDS = {
  PRO: "price_1UJ26eQjL8AFOBqDckHpdjq8",
  BUSINESS: "price_1UJ2BgQjL8AFOBqDZhEF1ebb",
};

export async function POST(
  request: Request
) {
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
    // LEER PLAN
    // =====================================================

    const body =
      await request.json();

    const plan =
      String(body.plan || "")
        .trim()
        .toUpperCase();

    if (
      plan !== "PRO" &&
      plan !== "BUSINESS"
    ) {
      return NextResponse.json(
        {
          error:
            "Plan no válido.",
        },
        {
          status: 400,
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
    // EVITAR SUSCRIPCIONES DUPLICADAS
    // =====================================================

    const hasActiveSubscription =
      Boolean(
        business.stripeSubscriptionId &&
          (
            business.subscriptionStatus ===
              "ACTIVE" ||
            business.subscriptionStatus ===
              "TRIALING"
          )
      );

    if (hasActiveSubscription) {
      /*
       * Si ya tiene exactamente el mismo plan,
       * no creamos otro Checkout.
       */
      if (business.plan === plan) {
        return NextResponse.json(
          {
            error:
              `Ya tienes el plan ${plan} activo.`,
            alreadySubscribed: true,
          },
          {
            status: 409,
          }
        );
      }

      /*
       * Si quiere cambiar de PRO a BUSINESS
       * o de BUSINESS a PRO, no creamos una
       * segunda suscripción.
       *
       * El cambio de plan se hará mediante
       * Customer Portal.
       */
      return NextResponse.json(
        {
          error:
            "Ya tienes una suscripción activa. Para cambiar de plan, usa el portal de facturación.",
          hasActiveSubscription: true,
          currentPlan:
            business.plan,
        },
        {
          status: 409,
        }
      );
    }

    // =====================================================
    // PRICE ID
    // =====================================================

    const priceId =
      PRICE_IDS[
        plan as "PRO" | "BUSINESS"
      ];

    // =====================================================
    // ORIGIN
    // =====================================================

    const origin =
      request.headers.get(
        "origin"
      ) ||
      "http://localhost:3000";

    // =====================================================
    // CREAR CHECKOUT
    // =====================================================

    const session =
      await stripe.checkout.sessions.create(
        {
          mode: "subscription",

          line_items: [
            {
              price: priceId,
              quantity: 1,
            },
          ],

          success_url:
            `${origin}/dashboard?payment=success`,

          cancel_url:
            `${origin}/pricing?payment=cancelled`,

          client_reference_id:
            String(userId),

          metadata: {
            userId:
              String(userId),

            businessId:
              String(business.id),

            plan,
          },

          subscription_data: {
            metadata: {
              userId:
                String(userId),

              businessId:
                String(business.id),

              plan,
            },
          },
        }
      );

    // =====================================================
    // VERIFICAR URL
    // =====================================================

    if (!session.url) {
      console.error(
        "❌ Stripe no devolvió una URL de Checkout."
      );

      return NextResponse.json(
        {
          error:
            "Stripe no generó el Checkout correctamente.",
        },
        {
          status: 500,
        }
      );
    }

    console.log(
      "✅ Checkout creado:",
      {
        userId,
        businessId:
          business.id,
        plan,
        sessionId:
          session.id,
      }
    );

    return NextResponse.json({
      url: session.url,
    });
  } catch (error) {
    console.error(
      "❌ Error creando Checkout de Stripe:",
      error
    );

    return NextResponse.json(
      {
        error:
          "No se pudo crear el Checkout de Stripe.",
      },
      {
        status: 500,
      }
    );
  }
}