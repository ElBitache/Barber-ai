import { prisma } from "@/lib/prisma";

export async function checkBusinessTrial(
  businessId: number
) {
  const business = await prisma.business.findUnique({
    where: {
      id: businessId,
    },
    select: {
      id: true,
      plan: true,
      subscriptionStatus: true,
      trialStartedAt: true,
      trialEndsAt: true,
    },
  });

  if (!business) {
    return {
      exists: false,
      active: false,
      expired: false,
    };
  }

  /*
   * PLANES DE PAGO
   *
   * PRO y BUSINESS solamente tienen acceso
   * mientras Stripe los mantenga ACTIVE o TRIALING.
   *
   * Si están CANCELED o EXPIRED, se bloquean.
   */
  if (
    business.plan === "PRO" ||
    business.plan === "BUSINESS"
  ) {
    const subscriptionActive =
      business.subscriptionStatus === "ACTIVE" ||
      business.subscriptionStatus === "TRIALING";

    if (subscriptionActive) {
      return {
        exists: true,
        active: true,
        expired: false,
        business,
      };
    }

    return {
      exists: true,
      active: false,
      expired: true,
      business,
    };
  }

  /*
   * PLAN FREE
   *
   * El acceso depende exclusivamente
   * del período de prueba de 14 días.
   */

  if (
    business.subscriptionStatus !== "TRIALING"
  ) {
    return {
      exists: true,
      active: false,
      expired: true,
      business,
    };
  }

  if (!business.trialEndsAt) {
    return {
      exists: true,
      active: false,
      expired: true,
      business,
    };
  }

  const now = new Date();

  const trialExpired =
    now >= business.trialEndsAt;

  if (trialExpired) {
    const updatedBusiness =
      await prisma.business.update({
        where: {
          id: business.id,
        },
        data: {
          subscriptionStatus: "EXPIRED",
        },
        select: {
          id: true,
          plan: true,
          subscriptionStatus: true,
          trialStartedAt: true,
          trialEndsAt: true,
        },
      });

    return {
      exists: true,
      active: false,
      expired: true,
      business: updatedBusiness,
    };
  }

  return {
    exists: true,
    active: true,
    expired: false,
    business,
  };
}