"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function Home() {
  const router = useRouter();
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const faqs = [
    {
      question: "¿Qué es BizStaffIA?",
      answer:
        "BizStaffIA es una plataforma diseñada para ayudar a los negocios a organizar sus tareas, gestionar clientes y aprovechar herramientas de inteligencia artificial.",
    },
    {
      question: "¿Para qué tipos de negocios sirve?",
      answer:
        "BizStaffIA está pensado para distintos negocios de servicios, como barberías, restaurantes, plomería y otros profesionales. Las herramientas disponibles pueden variar según la configuración de cada negocio.",
    },
    {
      question: "¿Necesito conocimientos técnicos?",
      answer:
        "No necesitas ser programador para comenzar. Puedes crear tu cuenta y seguir los pasos disponibles en la plataforma para configurar tu negocio.",
    },
    {
      question: "¿Cómo puedo comenzar?",
      answer:
        "Puedes crear una cuenta desde el botón Empezar. Después, inicia sesión y utiliza las opciones disponibles en tu cuenta para configurar tu negocio.",
    },
    {
      question: "¿BizStaffIA sustituye a todos mis empleados?",
      answer:
        "No. BizStaffIA está pensado para ayudar con determinadas tareas y complementar el trabajo de tu equipo. No todas las tareas pueden automatizarse y las funciones dependen de las herramientas que tengas disponibles.",
    },
  ];

  return (
    <main className="min-h-screen overflow-hidden bg-black text-white">
      {/* NAVEGACIÓN */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/90 backdrop-blur-xl">
        <nav
          aria-label="Navegación principal"
          className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8"
        >
          <a href="#inicio" className="flex shrink-0 items-center gap-3">
            <Image
              src="/bizstaffia-logo.png"
              alt="Logotipo de BizStaffIA"
              width={46}
              height={46}
              priority
              className="h-11 w-11 rounded-lg object-contain"
            />
            <span className="text-lg font-bold tracking-tight sm:text-xl">
              BizStaffIA
            </span>
          </a>

          <div className="hidden items-center gap-7 text-sm text-gray-400 lg:flex">
            <a href="#funciones" className="transition hover:text-white">
              Funciones
            </a>
            <a href="#negocios" className="transition hover:text-white">
              Para negocios
            </a>
            <a href="#como-funciona" className="transition hover:text-white">
              Cómo funciona
            </a>
            <a href="#preguntas" className="transition hover:text-white">
              Preguntas frecuentes
            </a>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <button
              onClick={() => router.push("/login")}
              className="rounded-lg px-3 py-2 text-sm text-gray-300 transition hover:bg-white/10 hover:text-white sm:px-4"
            >
              Iniciar sesión
            </button>

            <button
              onClick={() => router.push("/register")}
              className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-black transition hover:bg-gray-200 sm:px-5"
            >
              Empezar
            </button>
          </div>
        </nav>
      </header>

      {/* PRESENTACIÓN PRINCIPAL */}
      <section id="inicio" className="relative px-5 sm:px-8">
        <div className="pointer-events-none absolute left-1/2 top-24 h-80 w-80 -translate-x-1/2 rounded-full bg-white/[0.035] blur-[110px]" />

        <div className="relative mx-auto flex min-h-[650px] max-w-6xl flex-col items-center justify-center py-24 text-center sm:min-h-[720px]">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-gray-300">
            <span className="h-2 w-2 rounded-full bg-white" />
            Inteligencia artificial para negocios
          </div>

          <h1 className="max-w-5xl text-5xl font-semibold leading-[1.08] tracking-tight sm:text-7xl lg:text-8xl">
            Tu negocio,
            <br />
            <span className="text-gray-500">un paso adelante.</span>
          </h1>

          <p className="mt-8 max-w-2xl text-base leading-8 text-gray-400 sm:text-xl">
            Conoce una nueva forma de organizar tu negocio. BizStaffIA reúne
            herramientas para gestionar clientes, organizar tareas y aprovechar
            la inteligencia artificial desde un mismo lugar.
          </p>

          <div className="mt-10 flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row">
            <button
              onClick={() => router.push("/register")}
              className="rounded-xl bg-white px-8 py-4 font-semibold text-black transition hover:bg-gray-200"
            >
              Crear mi cuenta →
            </button>

            <a
              href="#funciones"
              className="rounded-xl border border-white/15 px-8 py-4 font-semibold text-white transition hover:border-white/30 hover:bg-white/[0.05]"
            >
              Descubrir la plataforma
            </a>
          </div>

          <p className="mt-6 text-sm text-gray-500">
            Tecnología para trabajar de forma más organizada.
          </p>

          <div className="mt-16 grid w-full max-w-3xl grid-cols-1 gap-3 sm:grid-cols-3">
            <Highlight title="Un solo lugar" text="Herramientas organizadas" />
            <Highlight title="IA aplicada" text="Asistencia inteligente" />
            <Highlight title="Multinegocio" text="Distintos sectores" />
          </div>
        </div>
      </section>

      {/* FUNCIONES */}
      <section
        id="funciones"
        className="scroll-mt-24 border-t border-white/10 px-5 py-24 sm:px-8 sm:py-32"
      >
        <div className="mx-auto max-w-7xl">
          <SectionHeading
            eyebrow="La plataforma"
            title={
              <>
                Menos desorden.
                <br />
                <span className="text-gray-500">Más claridad.</span>
              </>
            }
            description="Organiza aspectos importantes de tu negocio con herramientas diseñadas para simplificar el trabajo diario."
          />

          <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Feature
              number="01"
              title="Asistencia con IA"
              description="Utiliza las herramientas de inteligencia artificial disponibles para ayudarte a responder preguntas relacionadas con tu negocio."
              tag="Inteligencia artificial"
            />

            <Feature
              number="02"
              title="Gestión de clientes"
              description="Mantén la información de tus clientes organizada para facilitar el seguimiento y la administración."
              tag="Organización"
            />

            <Feature
              number="03"
              title="Gestión de citas"
              description="Consulta y organiza las citas mediante las herramientas de gestión disponibles en tu cuenta."
              tag="Planificación"
            />

            <Feature
              number="04"
              title="Información centralizada"
              description="Accede a las herramientas de tu negocio desde una plataforma diseñada para mantener todo más organizado."
              tag="Productividad"
            />
          </div>
        </div>
      </section>

      {/* SECTORES */}
      <section
        id="negocios"
        className="scroll-mt-24 border-t border-white/10 px-5 py-24 sm:px-8 sm:py-32"
      >
        <div className="mx-auto max-w-7xl">
          <SectionHeading
            eyebrow="Una plataforma, distintos sectores"
            title={
              <>
                Diseñada para los
                <br />
                <span className="text-gray-500">negocios del mundo real.</span>
              </>
            }
            description="Cada negocio tiene necesidades diferentes. BizStaffIA busca reunir herramientas útiles para organizar el trabajo y mejorar la gestión diaria."
          />

          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Business
              number="01"
              title="Barberías"
              description="Organización de clientes, servicios y citas."
              symbol="✳"
            />

            <Business
              number="02"
              title="Restaurantes"
              description="Herramientas para organizar información y tareas del negocio."
              symbol="◈"
            />

            <Business
              number="03"
              title="Plomería"
              description="Apoyo para organizar clientes y solicitudes de servicio."
              symbol="⌁"
            />

            <Business
              number="04"
              title="Otros servicios"
              description="Una propuesta adaptable a diferentes negocios y profesionales."
              symbol="＋"
            />
          </div>

          <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.025] p-6 sm:p-8">
            <p className="text-sm leading-7 text-gray-400">
              <span className="font-semibold text-white">
                Un objetivo común:
              </span>{" "}
              ayudar a los negocios a organizar mejor su información, aprovechar
              la tecnología y dedicar más atención a sus clientes.
            </p>
          </div>
        </div>
      </section>

      {/* CÓMO FUNCIONA */}
      <section
        id="como-funciona"
        className="scroll-mt-24 border-t border-white/10 px-5 py-24 sm:px-8 sm:py-32"
      >
        <div className="mx-auto max-w-7xl">
          <SectionHeading
            eyebrow="Primeros pasos"
            title={
              <>
                Empieza con una base
                <br />
                <span className="text-gray-500">sencilla.</span>
              </>
            }
            description="Conoce el proceso general para comenzar a utilizar la plataforma."
          />

          <div className="mt-16 grid gap-10 md:grid-cols-3 md:gap-8">
            <Step
              number="01"
              title="Crea tu cuenta"
              description="Regístrate para acceder a tu espacio de trabajo en BizStaffIA."
            />

            <Step
              number="02"
              title="Configura tu negocio"
              description="Completa la información que la plataforma te solicite para organizar tu negocio."
            />

            <Step
              number="03"
              title="Explora tus herramientas"
              description="Accede a las funciones disponibles en tu cuenta y descubre cómo integrarlas en tu trabajo diario."
            />
          </div>
        </div>
      </section>

      {/* PROPUESTA DE VALOR */}
      <section className="border-t border-white/10 px-5 py-24 sm:px-8 sm:py-32">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-gray-500">
              Una forma más inteligente de trabajar
            </p>

            <h2 className="mt-5 text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">
              La tecnología debe
              <br />
              <span className="text-gray-500">ayudarte a avanzar.</span>
            </h2>

            <p className="mt-6 max-w-xl leading-8 text-gray-400">
              Gestionar un negocio exige tiempo, atención y organización.
              BizStaffIA está diseñado para reunir herramientas que te ayuden
              a simplificar determinadas tareas y mantener el control de tu
              trabajo.
            </p>

            <button
              onClick={() => router.push("/register")}
              className="mt-9 rounded-xl bg-white px-7 py-4 font-semibold text-black transition hover:bg-gray-200"
            >
              Conocer BizStaffIA →
            </button>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.025] p-7 sm:p-10">
            <p className="text-sm text-gray-500">BIZSTAFFIA / VISIÓN</p>

            <div className="mt-8 space-y-0">
              <ValueRow
                title="Organización"
                description="Información y herramientas en un espacio centralizado."
              />

              <ValueRow
                title="Inteligencia artificial"
                description="Tecnología para apoyar determinadas tareas."
              />

              <ValueRow
                title="Flexibilidad"
                description="Una propuesta pensada para diferentes tipos de negocio."
              />

              <ValueRow
                title="Evolución"
                description="Una plataforma que puede crecer con las necesidades de sus usuarios."
                last
              />
            </div>
          </div>
        </div>
      </section>

      {/* PREGUNTAS FRECUENTES */}
      <section
        id="preguntas"
        className="scroll-mt-24 border-t border-white/10 px-5 py-24 sm:px-8 sm:py-32"
      >
        <div className="mx-auto max-w-3xl">
          <SectionHeading
            eyebrow="Preguntas frecuentes"
            title={
              <>
                Resolvemos tus
                <br />
                <span className="text-gray-500">dudas principales.</span>
              </>
            }
            description="Lo esencial para conocer BizStaffIA antes de comenzar."
          />

          <div className="mt-12 divide-y divide-white/10 border-y border-white/10">
            {faqs.map((faq, index) => {
              const isOpen = openFaq === index;

              return (
                <div key={faq.question}>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() =>
                      setOpenFaq(isOpen ? null : index)
                    }
                    className="flex w-full items-center justify-between gap-5 py-6 text-left"
                  >
                    <span className="font-medium sm:text-lg">
                      {faq.question}
                    </span>

                    <span className="text-xl text-gray-500" aria-hidden="true">
                      {isOpen ? "−" : "+"}
                    </span>
                  </button>

                  {isOpen && (
                    <p className="max-w-2xl pb-6 leading-7 text-gray-400">
                      {faq.answer}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* LLAMADA FINAL */}
      <section className="border-t border-white/10 px-5 py-28 sm:px-8 sm:py-36">
        <div className="mx-auto max-w-5xl rounded-3xl border border-white/10 bg-white/[0.025] px-6 py-16 text-center sm:px-12 sm:py-24">
          <Image
            src="/bizstaffia-logo.png"
            alt=""
            width={64}
            height={64}
            className="mx-auto h-16 w-16 rounded-xl object-contain"
          />

          <p className="mt-7 text-sm uppercase tracking-[0.2em] text-gray-500">
            El siguiente paso comienza aquí
          </p>

          <h2 className="mt-5 text-4xl font-semibold tracking-tight sm:text-6xl">
            Haz espacio para
            <br />
            <span className="text-gray-500">nuevas posibilidades.</span>
          </h2>

          <p className="mx-auto mt-6 max-w-xl leading-8 text-gray-400">
            Crea tu cuenta y descubre las herramientas disponibles en BizStaffIA
            para organizar mejor tu negocio.
          </p>

          <button
            onClick={() => router.push("/register")}
            className="mt-9 rounded-xl bg-white px-8 py-4 font-semibold text-black transition hover:bg-gray-200"
          >
            Empezar ahora →
          </button>
        </div>
      </section>

      {/* PIE DE PÁGINA */}
      <footer className="border-t border-white/10 px-5 py-10 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
          <a href="#inicio" className="flex items-center gap-3">
            <Image
              src="/bizstaffia-logo.png"
              alt="BizStaffIA"
              width={36}
              height={36}
              className="h-9 w-9 rounded-lg object-contain"
            />

            <div>
              <p className="font-semibold text-white">BizStaffIA</p>
              <p className="mt-1 text-xs text-gray-500">
                Inteligencia artificial para negocios
              </p>
            </div>
          </a>

          <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-gray-500">
            <a href="#funciones" className="transition hover:text-white">
              Funciones
            </a>
            <a href="#negocios" className="transition hover:text-white">
              Negocios
            </a>
            <a href="#preguntas" className="transition hover:text-white">
              Preguntas frecuentes
            </a>
            <button
              onClick={() => router.push("/login")}
              className="transition hover:text-white"
            >
              Iniciar sesión
            </button>
          </div>

          <p className="text-xs text-gray-600">
            © {new Date().getFullYear()} BizStaffIA
          </p>
        </div>
      </footer>
    </main>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: React.ReactNode;
  description: string;
}) {
  return (
    <div className="max-w-3xl">
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-gray-500">
        {eyebrow}
      </p>

      <h2 className="mt-5 text-3xl font-semibold leading-tight tracking-tight sm:text-5xl">
        {title}
      </h2>

      <p className="mt-6 max-w-2xl text-base leading-8 text-gray-400 sm:text-lg">
        {description}
      </p>
    </div>
  );
}

function Highlight({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.025] px-4 py-5">
      <p className="font-semibold">{title}</p>
      <p className="mt-2 text-sm text-gray-500">{text}</p>
    </div>
  );
}

function Feature({
  number,
  title,
  description,
  tag,
}: {
  number: string;
  title: string;
  description: string;
  tag: string;
}) {
  return (
    <article className="group rounded-2xl border border-white/10 bg-white/[0.015] p-7 transition duration-300 hover:border-white/25 hover:bg-white/[0.035] sm:p-8">
      <p className="text-sm tracking-widest text-gray-600">{number}</p>

      <div className="mt-8 flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 text-lg text-gray-300">
        ✳
      </div>

      <h3 className="mt-6 text-xl font-semibold">{title}</h3>

      <p className="mt-3 min-h-[112px] text-sm leading-7 text-gray-400">
        {description}
      </p>

      <div className="mt-5 border-t border-white/10 pt-5">
        <span className="text-xs text-gray-500">{tag}</span>
      </div>
    </article>
  );
}

function Business({
  number,
  title,
  description,
  symbol,
}: {
  number: string;
  title: string;
  description: string;
  symbol: string;
}) {
  return (
    <article className="rounded-2xl border border-white/10 p-7 transition duration-300 hover:border-white/25">
      <div className="flex items-center justify-between">
        <span className="text-xs tracking-widest text-gray-600">{number}</span>
        <span className="text-2xl text-gray-400" aria-hidden="true">
          {symbol}
        </span>
      </div>

      <h3 className="mt-8 text-xl font-semibold">{title}</h3>

      <p className="mt-3 text-sm leading-7 text-gray-400">{description}</p>
    </article>
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
    <article className="border-l border-white/15 pl-6">
      <p className="text-sm tracking-widest text-gray-500">{number}</p>

      <h3 className="mt-5 text-xl font-semibold">{title}</h3>

      <p className="mt-3 leading-7 text-gray-400">{description}</p>
    </article>
  );
}

function ValueRow({
  title,
  description,
  last = false,
}: {
  title: string;
  description: string;
  last?: boolean;
}) {
  return (
    <div
      className={`py-6 ${
        last ? "" : "border-b border-white/10"
      }`}
    >
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-7 text-gray-400">{description}</p>
    </div>
  );
}