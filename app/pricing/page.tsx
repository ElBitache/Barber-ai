"use client";

import { useRouter } from "next/navigation";

type PlanCardProps = {
  name: string;
  price: string;
  period?: string;
  description: string;
  features: string[];
  button: string;
  featured?: boolean;
  onClick: () => void;
};

type FaqProps = {
  question: string;
  answer: string;
};

export default function PricingPage() {
  const router = useRouter();

  const goToRegister = () => {
    router.push("/register");
  };

  const goToLogin = () => {
    router.push("/login");
  };

  const goHome = () => {
    router.push("/");
  };

  const startCheckout = async (
    plan: "PRO" | "BUSINESS"
  ) => {
    try {
      const response = await fetch(
        "/api/stripe/checkout",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            plan,
          }),
        }
      );

      const data =
        await response.json();

      if (
        response.status === 401
      ) {
        router.push("/login");
        return;
      }

      if (
        !response.ok
      ) {
        alert(
          data.error ||
            "No se pudo iniciar el pago."
        );
        return;
      }

      if (!data.url) {
        alert(
          "Stripe no devolvió una URL de pago."
        );
        return;
      }

      window.location.href =
        data.url;
    } catch (error) {
      console.error(
        "Error iniciando Checkout:",
        error
      );

      alert(
        "No se pudo conectar con Stripe."
      );
    }
  };

  return (
    <main className="min-h-screen bg-black text-white">
      <nav className="border-b border-white/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <button
            type="button"
            onClick={goHome}
            className="text-xl font-bold tracking-tight"
          >
            BarberAI
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={goToLogin}
              className="rounded-lg px-4 py-2 text-sm text-gray-300 transition hover:bg-white/10 hover:text-white"
            >
              Iniciar sesión
            </button>

            <button
              type="button"
              onClick={goToRegister}
              className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-gray-200"
            >
              Empezar gratis
            </button>
          </div>
        </div>
      </nav>

      <section className="px-6 pb-16 pt-24 text-center">
        <p className="text-sm font-medium uppercase tracking-[0.25em] text-gray-500">
          Precios
        </p>

        <h1 className="mx-auto mt-5 max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">
          Elige el plan para tu negocio.
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-gray-400">
          Empieza gratis y actualiza cuando necesites más automatización para
          tu negocio.
        </p>
      </section>

      <section className="px-6 pb-24">
        <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-3">
          <PlanCard
            name="Free"
            price="$0"
            description="Para comenzar a probar BarberAI."
            features={[
              "Empleado de IA",
              "Gestión de clientes",
              "Gestión de citas",
              "Configuración del negocio",
            ]}
            button="Empezar gratis"
            onClick={goToRegister}
          />

          <PlanCard
            name="Pro"
            price="$29"
            period="/mes"
            description="Para negocios que quieren automatizar más."
            features={[
              "Todo lo incluido en Free",
              "Automatizaciones avanzadas",
              "Funciones avanzadas de IA",
              "WhatsApp",
              "SMS",
              "Email",
            ]}
            button="Elegir Pro"
            featured={true}
            onClick={() =>
              startCheckout("PRO")
            }
          />

          <PlanCard
            name="Business"
            price="$79"
            period="/mes"
            description="Para negocios con necesidades más avanzadas."
            features={[
              "Todo lo incluido en Pro",
              "Mayor capacidad de IA",
              "Múltiples sucursales",
              "Funciones avanzadas",
              "Soporte prioritario",
              "Preparado para equipos",
            ]}
            button="Elegir Business"
            onClick={() =>
              startCheckout("BUSINESS")
            }
          />
        </div>
      </section>

      <section className="border-t border-white/10 px-6 py-24">
        <div className="mx-auto max-w-3xl">
          <div className="text-center">
            <p className="text-sm uppercase tracking-[0.25em] text-gray-500">
              Preguntas frecuentes
            </p>

            <h2 className="mt-4 text-3xl font-bold sm:text-4xl">
              ¿Tienes dudas?
            </h2>
          </div>

          <div className="mt-12 divide-y divide-white/10 border-y border-white/10">
            <Faq
              question="¿Puedo empezar gratis?"
              answer="Sí. Puedes comenzar con el plan Free y conocer BarberAI antes de actualizar."
            />

            <Faq
              question="¿Puedo cambiar de plan?"
              answer="Sí. Puedes actualizar tu plan cuando necesites más capacidad y funciones."
            />

            <Faq
              question="¿Necesito configurar algo complicado?"
              answer="No. La idea de BarberAI es que puedas configurar tu negocio y tu empleado de IA de forma sencilla."
            />

            <Faq
              question="¿Cómo funcionan los pagos?"
              answer="Los planes Pro y Business utilizan Stripe para gestionar las suscripciones mensuales de forma segura."
            />
          </div>
        </div>
      </section>

      <section className="border-t border-white/10 px-6 py-28">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Empieza a automatizar tu negocio.
          </h2>

          <p className="mx-auto mt-5 max-w-xl text-gray-400">
            Crea tu cuenta y configura tu empleado de IA en pocos minutos.
          </p>

          <button
            type="button"
            onClick={goToRegister}
            className="mt-9 rounded-xl bg-white px-8 py-4 font-semibold text-black transition hover:bg-gray-200"
          >
            Empezar gratis →
          </button>
        </div>
      </section>

      <footer className="border-t border-white/10 px-6 py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-sm text-gray-500 sm:flex-row">
          <p>
            © 2026 BarberAI. Todos los derechos reservados.
          </p>

          <button
            type="button"
            onClick={goHome}
            className="transition hover:text-white"
          >
            Volver al inicio
          </button>
        </div>
      </footer>
    </main>
  );
}

function PlanCard({
  name,
  price,
  period,
  description,
  features,
  button,
  featured = false,
  onClick,
}: PlanCardProps) {
  return (
    <div
      className={`relative flex flex-col rounded-2xl border p-8 ${
        featured
          ? "border-white/40 bg-white/[0.04]"
          : "border-white/10"
      }`}
    >
      {featured && (
        <div className="absolute -top-3 left-6 rounded-full border border-white/20 bg-black px-3 py-1 text-xs font-medium text-gray-300">
          Más popular
        </div>
      )}

      <h3 className="text-xl font-semibold">
        {name}
      </h3>

      <p className="mt-3 min-h-[48px] text-sm leading-6 text-gray-400">
        {description}
      </p>

      <div className="mt-8 flex items-end gap-1">
        <span className="text-4xl font-bold">
          {price}
        </span>

        {period && (
          <span className="pb-1 text-sm text-gray-500">
            {period}
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={onClick}
        className={`mt-8 rounded-xl px-5 py-3 font-semibold transition ${
          featured
            ? "bg-white text-black hover:bg-gray-200"
            : "border border-white/15 hover:bg-white/10"
        }`}
      >
        {button}
      </button>

      <div className="my-8 border-t border-white/10" />

      <p className="text-sm font-medium text-gray-300">
        Incluye:
      </p>

      <ul className="mt-5 space-y-3">
        {features.map((feature) => (
          <li
            key={feature}
            className="flex gap-3 text-sm text-gray-400"
          >
            <span className="text-white">
              ✓
            </span>

            <span>
              {feature}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Faq({
  question,
  answer,
}: FaqProps) {
  return (
    <div className="py-6">
      <h3 className="font-semibold">
        {question}
      </h3>

      <p className="mt-3 text-sm leading-6 text-gray-400">
        {answer}
      </p>
    </div>
  );
}