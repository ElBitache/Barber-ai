
"use client";

import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-black text-white">

      {/* NAVBAR */}
      <nav className="border-b border-white/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div className="text-xl font-bold tracking-tight">
            BarberAI
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/login")}
              className="rounded-lg px-4 py-2 text-sm text-gray-300 transition hover:bg-white/10 hover:text-white"
            >
              Iniciar sesión
            </button>

            <button
              onClick={() => router.push("/register")}
              className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-gray-200"
            >
              Empezar gratis
            </button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="px-6">
        <div className="mx-auto flex min-h-[700px] max-w-6xl flex-col items-center justify-center text-center">

          <div className="mb-7 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-gray-300">
            🤖 Tu nuevo empleado de IA
          </div>

          <h1 className="max-w-5xl text-5xl font-bold tracking-tight sm:text-7xl">
            Tu negocio trabaja.
            <br />
            <span className="text-gray-400">
              Tu IA también.
            </span>
          </h1>

          <p className="mt-7 max-w-2xl text-lg leading-8 text-gray-400 sm:text-xl">
            BarberAI atiende a tus clientes, responde preguntas,
            gestiona citas y mantiene tu negocio organizado,
            incluso cuando tú estás ocupado.
          </p>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row">

            <button
              onClick={() => router.push("/register")}
              className="rounded-xl bg-white px-8 py-4 font-semibold text-black transition hover:bg-gray-200"
            >
              Empezar gratis →
            </button>

            <button
              onClick={() => router.push("/login")}
              className="rounded-xl border border-white/15 px-8 py-4 font-semibold text-white transition hover:bg-white/10"
            >
              Ya tengo una cuenta
            </button>

          </div>

          <p className="mt-6 text-sm text-gray-500">
            Sin complicaciones. Configura tu empleado de IA en minutos.
          </p>
        </div>
      </section>

      {/* FEATURES */}
      <section className="border-t border-white/10 px-6 py-24">
        <div className="mx-auto max-w-6xl">

          <div className="max-w-2xl">
            <p className="text-sm font-medium uppercase tracking-widest text-gray-500">
              Todo en un solo lugar
            </p>

            <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-5xl">
              Menos trabajo manual.
              <br />
              Más tiempo para tu negocio.
            </h2>

            <p className="mt-5 text-lg text-gray-400">
              BarberAI se encarga de las tareas repetitivas para que
              puedas concentrarte en tus clientes.
            </p>
          </div>

          <div className="mt-16 grid gap-5 md:grid-cols-2">

            <Feature
              number="01"
              title="Atención con IA"
              description="Responde automáticamente las preguntas de tus clientes utilizando la información de tu negocio."
            />

            <Feature
              number="02"
              title="Gestión de citas"
              description="Tu empleado de IA puede ayudarte a reservar, cancelar y gestionar citas."
            />

            <Feature
              number="03"
              title="Clientes organizados"
              description="Mantén la información de tus clientes y su historial de citas en un solo lugar."
            />

            <Feature
              number="04"
              title="Disponible 24/7"
              description="Tu negocio puede seguir atendiendo preguntas incluso cuando tú no estás disponible."
            />

          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="border-t border-white/10 px-6 py-24">
        <div className="mx-auto max-w-6xl">

          <div className="text-center">
            <p className="text-sm font-medium uppercase tracking-widest text-gray-500">
              Cómo funciona
            </p>

            <h2 className="mt-4 text-3xl font-bold sm:text-5xl">
              Empieza en minutos.
            </h2>
          </div>

          <div className="mt-16 grid gap-12 md:grid-cols-3">

            <Step
              number="01"
              title="Crea tu negocio"
              description="Registra tu negocio y agrega la información que tus clientes necesitan."
            />

            <Step
              number="02"
              title="Configura tu IA"
              description="Elige el nombre, personalidad y capacidades de tu empleado de IA."
            />

            <Step
              number="03"
              title="Déjalo trabajar"
              description="Tu empleado de IA comienza a ayudarte a atender y organizar tu negocio."
            />

          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-white/10 px-6 py-28">
        <div className="mx-auto max-w-4xl text-center">

          <h2 className="text-4xl font-bold tracking-tight sm:text-6xl">
            Dale a tu negocio
            <br />
            un empleado de IA.
          </h2>

          <p className="mx-auto mt-6 max-w-xl text-lg text-gray-400">
            Configura BarberAI y empieza a automatizar las tareas
            que consumen tu tiempo.
          </p>

          <button
            onClick={() => router.push("/register")}
            className="mt-10 rounded-xl bg-white px-8 py-4 font-semibold text-black transition hover:bg-gray-200"
          >
            Crear mi negocio gratis →
          </button>

        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/10 px-6 py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-sm text-gray-500 sm:flex-row">

          <p>© 2026 BarberAI. Todos los derechos reservados.</p>

          <p>
            Tu empleado de IA para tu negocio.
          </p>

        </div>
      </footer>

    </main>
  );
}

function Feature({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 p-8 transition hover:border-white/20">
      <p className="text-sm text-gray-600">{number}</p>

      <h3 className="mt-6 text-xl font-semibold">
        {title}
      </h3>

      <p className="mt-3 leading-7 text-gray-400">
        {description}
      </p>
    </div>
  );
}

function Step({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div>
      <p className="text-sm text-gray-500">{number}</p>

      <h3 className="mt-4 text-xl font-semibold">
        {title}
      </h3>

      <p className="mt-3 leading-7 text-gray-400">
        {description}
      </p>
    </div>
  );
}