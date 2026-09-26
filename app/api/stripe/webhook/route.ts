import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";

const stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY!
);

const PRICE_IDS = {
  PRO: "price_1UJ26eQjL8AFOBqDckHpdjq8",
  BUSINESS: "price_1UJ2BgQjL8AFOBqDZhEF1ebb",
};

function getPlanFromPrice(
  priceId: string
): "PRO" | "BUSINESS" | null {
  if (priceId === PRICE_IDS.PRO) {
    return "PRO";
  }

  if (priceId === PRICE_IDS.BUSINESS) {
    return "BUSINESS";
  }

  return null;
}

function getSubscriptionStatus(
  status: Stripe.Subscription.Status
):
  | "ACTIVE"
  | "TRIALING"
  | "CANCELED"
  | "EXPIRED" {
  switch (status) {
    case "active":
      return "ACTIVE";

    case "trialing":
      return "TRIALING";

    case "canceled":
      return "CANCELED";

    case "incomplete_expired":
      return "EXPIRED";

    /*
     * Estados como:
     *
     * past_due
     * unpaid
     * incomplete
     *
     * No cancelamos inmediatamente el acceso.
     *
     * Stripe puede reintentar el cobro.
     */
    default:
      return "ACTIVE";
  }
}

function getSubscriptionEndDate(
  subscription: Stripe.Subscription
): Date | null {
  /*
   * Si Stripe indica que la suscripción se cancelará
   * al final del período, guardamos esa fecha.
   */
  if (
    subscription.cancel_at_period_end &&
    subscription.cancel_at
  ) {
    return new Date(
      subscription.cancel_at * 1000
    );
  }

  /*
   * Si existe una fecha explícita de cancelación,
   * también la guardamos.
   */
  if (subscription.cancel_at) {
    return new Date(
      subscription.cancel_at * 1000
    );
  }

  return null;
}

function isValidPlan(
  value: unknown
): value is "PRO" | "BUSINESS" {
  return (
    value === "PRO" ||
    value === "BUSINESS"
  );
}

export async function POST(
  request: Request
) {
  try {
    // =====================================================
    // LEER REQUEST
    // =====================================================

    const body = await request.text();

    const signature =
      request.headers.get(
        "stripe-signature"
      );

    if (!signature) {
      console.error(
        "❌ Falta la firma de Stripe."
      );

      return NextResponse.json(
        {
          error:
            "Falta la firma de Stripe.",
        },
        {
          status: 400,
        }
      );
    }

    // =====================================================
    // WEBHOOK SECRET
    // =====================================================

    const webhookSecret =
      process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error(
        "❌ STRIPE_WEBHOOK_SECRET no está configurada."
      );

      return NextResponse.json(
        {
          error:
            "Webhook de Stripe no configurado.",
        },
        {
          status: 500,
        }
      );
    }

    // =====================================================
    // VERIFICAR FIRMA DE STRIPE
    // =====================================================

    const event =
      stripe.webhooks.constructEvent(
        body,
        signature,
        webhookSecret
      );

    console.log(
      "📩 Stripe Webhook:",
      event.type,
      "|",
      event.id
    );

    // =====================================================
    // CHECKOUT COMPLETADO
    // =====================================================

    if (
      event.type ===
      "checkout.session.completed"
    ) {
      const session =
        event.data.object as Stripe.Checkout.Session;

      /*
       * Solo aceptamos Checkout de suscripciones.
       */
      if (session.mode !== "subscription") {
        console.log(
          "ℹ️ Checkout ignorado porque no es una suscripción."
        );

        return NextResponse.json({
          received: true,
        });
      }

      const userId = Number(
        session.metadata?.userId ||
          session.client_reference_id
      );

      const businessId = Number(
        session.metadata?.businessId
      );

      const plan =
        session.metadata?.plan;

      if (
        !userId ||
        !businessId ||
        !isValidPlan(plan)
      ) {
        console.error(
          "❌ Metadata de Stripe incompleta:",
          {
            userId,
            businessId,
            plan,
          }
        );

        return NextResponse.json(
          {
            error:
              "Metadata de Stripe incompleta.",
          },
          {
            status: 400,
          }
        );
      }

      // ===================================================
      // VERIFICAR NEGOCIO
      // ===================================================

      const business =
        await prisma.business.findFirst({
          where: {
            id: businessId,
            userId,
          },
        });

      if (!business) {
        console.error(
          "❌ No se encontró el negocio correspondiente al usuario:",
          {
            businessId,
            userId,
          }
        );

        return NextResponse.json(
          {
            error:
              "Negocio no encontrado.",
          },
          {
            status: 404,
          }
        );
      }

      const subscriptionId =
        typeof session.subscription ===
        "string"
          ? session.subscription
          : session.subscription?.id;

      const customerId =
        typeof session.customer ===
        "string"
          ? session.customer
          : session.customer?.id;

      if (!subscriptionId) {
        console.error(
          "❌ Checkout completado sin subscriptionId."
        );

        return NextResponse.json(
          {
            error:
              "No se encontró la suscripción.",
          },
          {
            status: 400,
          }
        );
      }

      // ===================================================
      // ACTUALIZAR NEGOCIO
      // ===================================================

      await prisma.business.update({
        where: {
          id: business.id,
        },
        data: {
          plan,

          subscriptionStatus:
            "ACTIVE",

          subscriptionStartedAt:
            business.subscriptionStartedAt ??
            new Date(),

          subscriptionEndsAt:
            null,

          stripeCustomerId:
            customerId ||
            business.stripeCustomerId,

          stripeSubscriptionId:
            subscriptionId,
        },
      });

      console.log(
        "✅ Checkout completado correctamente:",
        {
          businessId: business.id,
          userId,
          plan,
          subscriptionId,
          customerId,
        }
      );
    }

    // =====================================================
    // SUSCRIPCIÓN ACTUALIZADA
    // =====================================================

    if (
      event.type ===
      "customer.subscription.updated"
    ) {
      const subscription =
        event.data.object as Stripe.Subscription;

      const priceId =
        subscription.items.data[0]
          ?.price?.id;

      const plan =
        priceId
          ? getPlanFromPrice(priceId)
          : null;

      const metadataBusinessId =
        Number(
          subscription.metadata?.businessId
        );

      let business = null;

      // ===================================================
      // BUSCAR POR BUSINESS ID
      // ===================================================

      if (metadataBusinessId) {
        business =
          await prisma.business.findUnique({
            where: {
              id: metadataBusinessId,
            },
          });
      }

      // ===================================================
      // BUSCAR POR SUBSCRIPTION ID
      // ===================================================

      if (!business) {
        business =
          await prisma.business.findUnique({
            where: {
              stripeSubscriptionId:
                subscription.id,
            },
          });
      }

      if (!business) {
        console.error(
          "⚠️ No se encontró negocio para la suscripción:",
          subscription.id
        );
      } else {
        const status =
          getSubscriptionStatus(
            subscription.status
          );

        const cancelAtPeriodEnd =
          subscription.cancel_at_period_end;

        const subscriptionEndsAt =
          getSubscriptionEndDate(
            subscription
          );

        const finalPlan =
          plan || business.plan;

        await prisma.business.update({
          where: {
            id: business.id,
          },
          data: {
            plan:
              finalPlan,

            subscriptionStatus:
              status,

            subscriptionEndsAt,

            stripeSubscriptionId:
              subscription.id,
          },
        });

        console.log(
          "🔄 Suscripción sincronizada:",
          {
            businessId:
              business.id,

            plan:
              finalPlan,

            status,

            cancelAtPeriodEnd,

            subscriptionEndsAt,

            subscriptionId:
              subscription.id,
          }
        );
      }
    }

    // =====================================================
    // SUSCRIPCIÓN ELIMINADA
    // =====================================================

    if (
      event.type ===
      "customer.subscription.deleted"
    ) {
      const subscription =
        event.data.object as Stripe.Subscription;

      const business =
        await prisma.business.findUnique({
          where: {
            stripeSubscriptionId:
              subscription.id,
          },
        });

      if (business) {
        await prisma.business.update({
          where: {
            id: business.id,
          },
          data: {
            /*
             * La suscripción realmente terminó.
             *
             * Volvemos a FREE.
             */
            plan: "FREE",

            subscriptionStatus:
              "CANCELED",

            subscriptionEndsAt:
              new Date(),

            stripeSubscriptionId:
              null,
          },
        });

        console.log(
          "🔄 Suscripción terminada. Negocio volvió a FREE:",
          {
            businessId:
              business.id,

            subscriptionId:
              subscription.id,
          }
        );
      } else {
        console.log(
          "⚠️ No se encontró negocio para la suscripción eliminada:",
          subscription.id
        );
      }
    }

    // =====================================================
    // PAGO COMPLETADO
    // =====================================================

    if (
      event.type ===
      "invoice.paid"
    ) {
      const invoice =
        event.data.object as Stripe.Invoice;

      console.log(
        "💰 Pago recibido correctamente:",
        invoice.id
      );
    }

    // =====================================================
    // PAGO FALLIDO
    // =====================================================

    if (
      event.type ===
      "invoice.payment_failed"
    ) {
      const invoice =
        event.data.object as Stripe.Invoice;

      console.warn(
        "⚠️ Pago fallido:",
        invoice.id
      );

      /*
       * No quitamos PRO/BUSINESS inmediatamente.
       *
       * Stripe puede volver a intentar cobrar.
       *
       * Si finalmente la suscripción termina,
       * recibiremos:
       *
       * customer.subscription.deleted
       *
       * y ahí volveremos el negocio a FREE.
       */
    }

    // =====================================================
    // RESPUESTA
    // =====================================================

    return NextResponse.json({
      received: true,
    });
  } catch (error) {
    console.error(
      "❌ Error en Stripe Webhook:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Webhook inválido.",
      },
      {
        status: 400,
      }
    );
  }
}