"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Business = {
  id: number;
  name: string;
  description: string;
  services: string;
  hours: string;

  plan?: "FREE" | "PRO" | "BUSINESS";
  subscriptionStatus?:
    | "ACTIVE"
    | "TRIALING"
    | "CANCELED"
    | "EXPIRED";

  stripeCustomerId?: string | null;

  aiName: string;
  aiPersonality: string;
  aiWelcome: string;
  aiCanBook: boolean;
  aiCanCancel: boolean;
  aiCanReschedule: boolean;

  googleCalendarConnected?: boolean;
};

const planNames = {
  FREE: "Free",
  PRO: "Pro",
  BUSINESS: "Business",
};

export default function SettingsPage() {
  const router = useRouter();

  const [business, setBusiness] =
    useState<Business | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [services, setServices] = useState("");
  const [hours, setHours] = useState("");

  const [aiName, setAiName] =
    useState("Empleado IA");

  const [aiPersonality, setAiPersonality] =
    useState("amigable");

  const [aiWelcome, setAiWelcome] = useState(
    "¡Hola! 👋 Soy el empleado de IA de tu negocio. ¿En qué puedo ayudarte?"
  );

  const [aiCanBook, setAiCanBook] =
    useState(true);

  const [aiCanCancel, setAiCanCancel] =
    useState(true);

  const [aiCanReschedule, setAiCanReschedule] =
    useState(true);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [openingPortal, setOpeningPortal] =
    useState(false);

  const [connectingGoogle, setConnectingGoogle] =
    useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadBusiness() {
      try {
        const response = await fetch(
          "/api/business",
          {
            cache: "no-store",
          }
        );

        const data = await response.json();

        if (!response.ok) {
          setError(
            data.error ||
              "No se pudo cargar el negocio."
          );
          return;
        }

        const loadedBusiness =
          data.business as Business;

        setBusiness(loadedBusiness);

        setName(loadedBusiness.name || "");
        setDescription(
          loadedBusiness.description || ""
        );
        setServices(
          loadedBusiness.services || ""
        );
        setHours(
          loadedBusiness.hours || ""
        );

        setAiName(
          loadedBusiness.aiName ||
            "Empleado IA"
        );

        setAiPersonality(
          loadedBusiness.aiPersonality ||
            "amigable"
        );

        setAiWelcome(
          loadedBusiness.aiWelcome ||
            "¡Hola! 👋 Soy el empleado de IA de tu negocio. ¿En qué puedo ayudarte?"
        );

        setAiCanBook(
          loadedBusiness.aiCanBook ?? true
        );

        setAiCanCancel(
          loadedBusiness.aiCanCancel ?? true
        );

        setAiCanReschedule(
          loadedBusiness.aiCanReschedule ??
            true
        );
      } catch (error) {
        console.error(error);

        setError(
          "Ocurrió un error al cargar la configuración."
        );
      } finally {
        setLoading(false);
      }
    }

    loadBusiness();
  }, []);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setMessage("");
    setSaving(true);

    try {
      const response = await fetch(
        "/api/business",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name,
            description,
            services,
            hours,
            aiName,
            aiPersonality,
            aiWelcome,
            aiCanBook,
            aiCanCancel,
            aiCanReschedule,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(
          data.error ||
            "No se pudieron guardar los cambios."
        );
        return;
      }

      setBusiness(data.business);

      setMessage(
        "Cambios guardados correctamente."
      );
    } catch (error) {
      console.error(error);

      setError(
        "Ocurrió un error al guardar los cambios."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleManageSubscription() {
    setError("");
    setMessage("");
    setOpeningPortal(true);

    try {
      const response = await fetch(
        "/api/stripe/portal",
        {
          method: "POST",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(
          data.error ||
            "No se pudo abrir el portal de Stripe."
        );
        return;
      }

      if (!data.url) {
        setError(
          "Stripe no devolvió una dirección para el portal."
        );
        return;
      }

      window.location.href = data.url;
    } catch (error) {
      console.error(error);

      setError(
        "Ocurrió un error al abrir el portal de Stripe."
      );
    } finally {
      setOpeningPortal(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white">
        <div className="mx-auto max-w-4xl px-6 py-12">
          <p className="text-gray-400">
            Cargando configuración...
          </p>
        </div>
      </main>
    );
  }

  const currentPlan =
    business?.plan || "FREE";

  const currentStatus =
    business?.subscriptionStatus ||
    "TRIALING";

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-4xl px-6 py-10">

        <div className="mb-10">
          <button
            onClick={() =>
              router.push("/dashboard")
            }
            className="mb-6 text-sm text-gray-500 transition hover:text-white"
          >
            ← Volver al dashboard
          </button>

          <h1 className="text-4xl font-bold tracking-tight">
            Configuración
          </h1>

          <p className="mt-3 text-gray-400">
            Administra tu negocio y personaliza
            cómo trabaja tu Empleado IA.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-6"
        >

          {/* NEGOCIO */}

          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold">
                Información del negocio
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Esta información será utilizada
                por tu Empleado IA.
              </p>
            </div>

            <div>
              <label
                htmlFor="name"
                className="mb-2 block text-sm font-medium text-gray-300"
              >
                Nombre del negocio
              </label>

              <input
                id="name"
                type="text"
                value={name}
                onChange={(event) =>
                  setName(event.target.value)
                }
                required
                className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition placeholder:text-gray-600 focus:border-white/30"
              />
            </div>

            <div className="mt-5">
              <label
                htmlFor="description"
                className="mb-2 block text-sm font-medium text-gray-300"
              >
                Descripción
              </label>

              <textarea
                id="description"
                value={description}
                onChange={(event) =>
                  setDescription(
                    event.target.value
                  )
                }
                required
                rows={4}
                className="w-full resize-none rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition placeholder:text-gray-600 focus:border-white/30"
              />
            </div>
          </section>

          {/* SERVICIOS */}

          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold">
                Servicios
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Escribe los servicios y precios
                que ofrece tu negocio.
              </p>
            </div>

            <textarea
              value={services}
              onChange={(event) =>
                setServices(
                  event.target.value
                )
              }
              required
              rows={8}
              placeholder={`Corte Normal - $20
Corte Moderno - $25
Corte Escolar - $15`}
              className="w-full resize-none rounded-xl border border-white/10 bg-black px-4 py-3 font-mono text-sm text-white outline-none transition placeholder:text-gray-700 focus:border-white/30"
            />

            <p className="mt-3 text-xs text-gray-600">
              Ejemplo: Corte Moderno - $25
            </p>
          </section>

          {/* HORARIOS */}

          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold">
                Horarios
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Define los días y horarios de
                atención.
              </p>
            </div>

            <textarea
              value={hours}
              onChange={(event) =>
                setHours(
                  event.target.value
                )
              }
              required
              rows={8}
              placeholder={`Lunes: 09:00-19:00
Martes: 09:00-19:00
Miércoles: 09:00-19:00
Jueves: 09:00-19:00
Viernes: 09:00-19:00
Sábado: 09:00-17:00
Domingo: cerrado`}
              className="w-full resize-none rounded-xl border border-white/10 bg-black px-4 py-3 font-mono text-sm text-white outline-none transition placeholder:text-gray-700 focus:border-white/30"
            />
          </section>

          {/* EMPLEADO IA */}

          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">

            <div className="mb-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-xl text-black">
                  🤖
                </div>

                <div>
                  <h2 className="text-xl font-semibold">
                    Empleado IA
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    Personaliza cómo trabaja tu
                    asistente.
                  </p>
                </div>
              </div>
            </div>

            {/* NOMBRE */}

            <div>
              <label
                htmlFor="aiName"
                className="mb-2 block text-sm font-medium text-gray-300"
              >
                Nombre del Empleado IA
              </label>

              <input
                id="aiName"
                type="text"
                value={aiName}
                onChange={(event) =>
                  setAiName(event.target.value)
                }
                placeholder="Ej. Alex"
                className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition placeholder:text-gray-600 focus:border-white/30"
              />

              <p className="mt-2 text-xs text-gray-600">
                Este será el nombre que utilizará
                tu asistente al hablar con clientes.
              </p>
            </div>

            {/* PERSONALIDAD */}

            <div className="mt-6">
              <label
                htmlFor="aiPersonality"
                className="mb-2 block text-sm font-medium text-gray-300"
              >
                Personalidad
              </label>

              <select
                id="aiPersonality"
                value={aiPersonality}
                onChange={(event) =>
                  setAiPersonality(
                    event.target.value
                  )
                }
                className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition focus:border-white/30"
              >
                <option value="amigable">
                  Amigable
                </option>

                <option value="profesional">
                  Profesional
                </option>

                <option value="casual">
                  Casual
                </option>

                <option value="entusiasta">
                  Entusiasta
                </option>

                <option value="directa">
                  Directa
                </option>
              </select>
            </div>

            {/* BIENVENIDA */}

            <div className="mt-6">
              <label
                htmlFor="aiWelcome"
                className="mb-2 block text-sm font-medium text-gray-300"
              >
                Mensaje de bienvenida
              </label>

              <textarea
                id="aiWelcome"
                value={aiWelcome}
                onChange={(event) =>
                  setAiWelcome(
                    event.target.value
                  )
                }
                rows={4}
                className="w-full resize-none rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition placeholder:text-gray-600 focus:border-white/30"
              />
            </div>

            {/* PERMISOS */}

            <div className="mt-8">
              <h3 className="text-sm font-medium text-gray-300">
                Permisos del Empleado IA
              </h3>

              <p className="mt-1 text-xs text-gray-600">
                Decide qué acciones puede realizar
                automáticamente.
              </p>

              <div className="mt-5 space-y-3">

                <label className="flex cursor-pointer items-center justify-between rounded-xl border border-white/10 bg-black px-4 py-4 transition hover:bg-white/[0.03]">

                  <div>
                    <p className="font-medium">
                      Reservar citas
                    </p>

                    <p className="mt-1 text-sm text-gray-500">
                      Permitir que la IA cree
                      nuevas citas.
                    </p>
                  </div>

                  <input
                    type="checkbox"
                    checked={aiCanBook}
                    onChange={(event) =>
                      setAiCanBook(
                        event.target.checked
                      )
                    }
                    className="h-5 w-5"
                  />

                </label>

                <label className="flex cursor-pointer items-center justify-between rounded-xl border border-white/10 bg-black px-4 py-4 transition hover:bg-white/[0.03]">

                  <div>
                    <p className="font-medium">
                      Cancelar citas
                    </p>

                    <p className="mt-1 text-sm text-gray-500">
                      Permitir que la IA cancele
                      citas existentes.
                    </p>
                  </div>

                  <input
                    type="checkbox"
                    checked={aiCanCancel}
                    onChange={(event) =>
                      setAiCanCancel(
                        event.target.checked
                      )
                    }
                    className="h-5 w-5"
                  />

                </label>

                <label className="flex cursor-pointer items-center justify-between rounded-xl border border-white/10 bg-black px-4 py-4 transition hover:bg-white/[0.03]">

                  <div>
                    <p className="font-medium">
                      Cambiar citas
                    </p>

                    <p className="mt-1 text-sm text-gray-500">
                      Permitir que la IA cambie
                      fecha u hora de una cita.
                    </p>
                  </div>

                  <input
                    type="checkbox"
                    checked={aiCanReschedule}
                    onChange={(event) =>
                      setAiCanReschedule(
                        event.target.checked
                      )
                    }
                    className="h-5 w-5"
                  />

                </label>

              </div>
            </div>

          </section>

          {/* MENSAJES */}

          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          {message && (
            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-gray-300">
              ✓ {message}
            </div>
          )}

          {/* GUARDAR */}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-white px-7 py-3 font-semibold text-black transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving
                ? "Guardando..."
                : "Guardar cambios"}
            </button>
          </div>

        </form>

        {/* GOOGLE CALENDAR */}

        {business && (
          <section className="mt-10 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold">
                  📅 Google Calendar
                </h2>

                <p className="mt-2 max-w-xl text-sm text-gray-500">
                  Sincroniza automáticamente las citas de BarberAI
                  con tu Google Calendar.
                </p>

                <div className="mt-4">
                  {business.googleCalendarConnected ? (
                    <span className="inline-flex items-center rounded-full border border-green-500/20 bg-green-500/10 px-3 py-1 text-sm text-green-400">
                      🟢 Google Calendar conectado
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full border border-white/10 bg-black px-3 py-1 text-sm text-gray-400">
                      ⚪ Google Calendar no conectado
                    </span>
                  )}
                </div>
              </div>

              <button
                type="button"
                disabled={connectingGoogle}
                onClick={() => {
                  setConnectingGoogle(true);
                  window.location.href = "/api/google/auth";
                }}
                className="shrink-0 rounded-xl bg-white px-6 py-3 font-semibold text-black transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {connectingGoogle
                  ? "Conectando..."
                  : business.googleCalendarConnected
                    ? "Volver a conectar"
                    : "Conectar Google Calendar"}
              </button>
            </div>
          </section>
        )}

        {/* SUSCRIPCIÓN */}

        {business && (
          <section className="mt-10 rounded-2xl border border-white/10 bg-white/[0.03] p-6">

            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">

              <div>
                <p className="text-sm text-gray-500">
                  Suscripción
                </p>

                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <h2 className="text-2xl font-semibold">
                    Plan{" "}
                    {planNames[currentPlan]}
                  </h2>

                  <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs font-medium text-gray-300">
                    {currentStatus ===
                    "ACTIVE"
                      ? "Activo"
                      : currentStatus ===
                        "TRIALING"
                      ? "Prueba"
                      : currentStatus ===
                        "CANCELED"
                      ? "Cancelado"
                      : "Expirado"}
                  </span>
                </div>

                <p className="mt-2 max-w-xl text-sm text-gray-500">
                  Administra tu suscripción,
                  pagos y facturación desde
                  Stripe.
                </p>
              </div>

              <button
                type="button"
                onClick={
                  handleManageSubscription
                }
                disabled={
                  openingPortal ||
                  !business.stripeCustomerId
                }
                className="shrink-0 rounded-xl bg-white px-6 py-3 font-semibold text-black transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {openingPortal
                  ? "Abriendo..."
                  : "Administrar suscripción"}
              </button>

            </div>

            {!business.stripeCustomerId && (
              <p className="mt-5 rounded-xl border border-white/10 bg-black px-4 py-3 text-sm text-gray-500">
                El portal estará disponible
                después de completar una
                suscripción de pago.
              </p>
            )}

          </section>
        )}

        {business && (
          <p className="mt-8 text-center text-xs text-gray-700">
            ID del negocio: {business.id}
          </p>
        )}

      </div>
    </main>
  );
}