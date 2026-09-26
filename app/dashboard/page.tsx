"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Appointment = {
  id: number;
  client: string;
  service: string;
  date: string;
  time: string;
};

type Client = {
  id: number;
  name: string;
  phone?: string | null;
  email?: string | null;
  createdAt: string;
};

type Business = {
  id: number;
  name: string;
  description: string;
  services: string;
  hours: string;
  aiName: string;
  aiPersonality: string;
  plan: "FREE" | "PRO" | "BUSINESS";
  trialStartedAt: string | null;
  trialEndsAt: string | null;
  subscriptionStatus:
    | "ACTIVE"
    | "TRIALING"
    | "CANCELED"
    | "EXPIRED";
};

type AIUsage = {
  plan: "FREE" | "PRO" | "BUSINESS";
  used: number;
  limit: number;
  remaining: number;
  month: string;
  percentage: number;
};

export default function Dashboard() {
  const router = useRouter();

  const [business, setBusiness] =
    useState<Business | null>(null);

  const [appointments, setAppointments] =
    useState<Appointment[]>([]);

  const [clients, setClients] =
    useState<Client[]>([]);

  const [aiUsage, setAIUsage] =
    useState<AIUsage | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [loggingOut, setLoggingOut] =
    useState(false);

  useEffect(() => {
    async function loadDashboard() {
      try {
        setLoading(true);
        setError("");

        const meResponse = await fetch("/api/me", {
          cache: "no-store",
        });

        if (!meResponse.ok) {
          router.push("/login");
          return;
        }

        const meData =
          await meResponse.json();

        if (!meData.authenticated) {
          router.push("/login");
          return;
        }

        setBusiness(
          meData.business || null
        );

        const [
          appointmentsResponse,
          clientsResponse,
          usageResponse,
        ] = await Promise.all([
          fetch("/api/appointments", {
            cache: "no-store",
          }),

          fetch("/api/clients", {
            cache: "no-store",
          }),

          fetch("/api/usage", {
            cache: "no-store",
          }),
        ]);

        const appointmentsData =
          await appointmentsResponse.json();

        const clientsData =
          await clientsResponse.json();

        const usageData =
          await usageResponse.json();

        if (!appointmentsResponse.ok) {
          setError(
            appointmentsData.error ||
              "No se pudieron cargar las citas."
          );

          return;
        }

        if (!clientsResponse.ok) {
          setError(
            clientsData.error ||
              "No se pudieron cargar los clientes."
          );

          return;
        }

        setAppointments(
          Array.isArray(
            appointmentsData.appointments
          )
            ? appointmentsData.appointments
            : []
        );

        setClients(
          Array.isArray(
            clientsData.clients
          )
            ? clientsData.clients
            : []
        );

        if (usageResponse.ok) {
          setAIUsage(usageData);
        }
      } catch (error) {
        console.error(
          "Error cargando dashboard:",
          error
        );

        setError(
          "No se pudo cargar el dashboard."
        );
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, [router]);

  async function handleLogout() {
    try {
      setLoggingOut(true);

      const response =
        await fetch("/api/logout", {
          method: "POST",
        });

      if (!response.ok) {
        throw new Error(
          "No se pudo cerrar la sesión."
        );
      }

      router.push("/login");
      router.refresh();
    } catch (error) {
      console.error(
        "Error cerrando sesión:",
        error
      );

      setError(
        "No se pudo cerrar la sesión. Inténtalo nuevamente."
      );

      setLoggingOut(false);
    }
  }

  function getToday() {
    const now = new Date();

    const year =
      now.getFullYear();

    const month =
      String(
        now.getMonth() + 1
      ).padStart(2, "0");

    const day =
      String(
        now.getDate()
      ).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  function getGreeting() {
    const hour =
      new Date().getHours();

    if (hour < 12) {
      return "Buenos días";
    }

    if (hour < 19) {
      return "Buenas tardes";
    }

    return "Buenas noches";
  }

  function getFormattedToday() {
    return new Intl.DateTimeFormat(
      "es-MX",
      {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }
    ).format(new Date());
  }

  function formatDate(
    date: string
  ) {
    const parsed =
      new Date(
        `${date}T12:00:00`
      );

    if (
      Number.isNaN(
        parsed.getTime()
      )
    ) {
      return date;
    }

    return new Intl.DateTimeFormat(
      "es-MX",
      {
        weekday: "short",
        day: "numeric",
        month: "short",
      }
    ).format(parsed);
  }

  function getPlanLabel(
    plan: Business["plan"]
  ) {
    if (plan === "PRO") {
      return "Pro";
    }

    if (plan === "BUSINESS") {
      return "Business";
    }

    return "Free";
  }

  function getStatusLabel(
    status: Business["subscriptionStatus"]
  ) {
    if (status === "ACTIVE") {
      return "Activo";
    }

    if (status === "TRIALING") {
      return "Prueba";
    }

    if (status === "CANCELED") {
      return "Cancelado";
    }

    return "Expirado";
  }

  function getTrialDaysRemaining() {
    if (
      !business?.trialEndsAt ||
      business.subscriptionStatus !== "TRIALING"
    ) {
      return null;
    }

    const now = new Date();
    const trialEnds = new Date(
      business.trialEndsAt
    );

    const difference =
      trialEnds.getTime() - now.getTime();

    if (difference <= 0) {
      return 0;
    }

    return Math.ceil(
      difference / (1000 * 60 * 60 * 24)
    );
  }

  const today = getToday();

  const todayAppointments =
    useMemo(() => {
      return appointments
        .filter(
          (appointment) =>
            appointment.date ===
            today
        )
        .sort((a, b) =>
          a.time.localeCompare(
            b.time
          )
        );
    }, [
      appointments,
      today,
    ]);

  const upcomingAppointments =
    useMemo(() => {
      return appointments
        .filter(
          (appointment) =>
            appointment.date >=
            today
        )
        .sort((a, b) => {
          const dateA =
            `${a.date} ${a.time}`;

          const dateB =
            `${b.date} ${b.time}`;

          return dateA.localeCompare(
            dateB
          );
        });
    }, [
      appointments,
      today,
    ]);

  const nextAppointments =
    upcomingAppointments.slice(
      0,
      4
    );

  const greeting =
    getGreeting();

  const formattedToday =
    getFormattedToday();

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white">
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />

            <p className="mt-4 text-sm text-gray-400">
              Cargando tu dashboard...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-black text-white">
        <div className="flex min-h-screen items-center justify-center px-6">
          <div className="w-full max-w-lg rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center">
            <h1 className="text-2xl font-bold">
              Ocurrió un problema
            </h1>

            <p className="mt-3 text-red-300">
              {error}
            </p>

            <button
              type="button"
              onClick={() =>
                window.location.reload()
              }
              className="mt-6 rounded-xl bg-white px-6 py-3 font-semibold text-black transition hover:bg-gray-200"
            >
              Intentar nuevamente
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="flex min-h-screen">

        {/* SIDEBAR */}

        <aside className="hidden w-64 shrink-0 border-r border-white/10 bg-black lg:flex lg:flex-col">

          <div className="flex h-20 items-center border-b border-white/10 px-6">
            <div className="flex items-center gap-3">

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-black">
                ✂️
              </div>

              <div>
                <p className="font-bold tracking-wide">
                  BARBERAI
                </p>

                <p className="text-xs text-gray-500">
                  AI Employee
                </p>
              </div>

            </div>
          </div>

          <nav className="flex-1 px-4 py-6">

            <p className="px-3 text-xs font-semibold uppercase tracking-wider text-gray-600">
              Menú
            </p>

            <div className="mt-3 space-y-1">

              <button
                type="button"
                onClick={() =>
                  router.push(
                    "/dashboard"
                  )
                }
                className="flex w-full items-center gap-3 rounded-xl bg-white/10 px-3 py-3 text-left text-sm font-medium text-white"
              >
                <span>🏠</span>
                Inicio
              </button>

              <button
                type="button"
                onClick={() =>
                  router.push(
                    "/appointments"
                  )
                }
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-gray-400 transition hover:bg-white/5 hover:text-white"
              >
                <span>📅</span>
                Citas
              </button>

              <button
                type="button"
                onClick={() =>
                  router.push(
                    "/clients"
                  )
                }
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-gray-400 transition hover:bg-white/5 hover:text-white"
              >
                <span>👥</span>
                Clientes
              </button>

              <button
                type="button"
                onClick={() =>
                  router.push(
                    "/chat"
                  )
                }
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-gray-400 transition hover:bg-white/5 hover:text-white"
              >
                <span>🤖</span>
                Empleado IA
              </button>

            </div>

            <p className="mt-8 px-3 text-xs font-semibold uppercase tracking-wider text-gray-600">
              Sistema
            </p>

            <div className="mt-3">

              <button
                type="button"
                onClick={() =>
                  router.push(
                    "/settings"
                  )
                }
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-gray-400 transition hover:bg-white/5 hover:text-white"
              >
                <span>⚙️</span>
                Configuración
              </button>

            </div>

          </nav>

          <div className="border-t border-white/10 p-4">

            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-gray-400 transition hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span>🚪</span>

              {loggingOut
                ? "Cerrando sesión..."
                : "Cerrar sesión"}
            </button>

          </div>

        </aside>

        {/* CONTENIDO */}

        <div className="min-w-0 flex-1">

          {/* HEADER */}

          <header className="border-b border-white/10">

            <div className="flex min-h-20 items-center justify-between px-6 lg:px-10">

              <div className="lg:hidden">

                <div className="flex items-center gap-3">

                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-black">
                    ✂️
                  </div>

                  <span className="text-sm font-bold tracking-wider">
                    BARBERAI
                  </span>

                </div>

              </div>

              <div className="hidden lg:block">

                <p className="text-sm text-gray-500">
                  Panel de control
                </p>

                <p className="font-semibold">
                  {business?.name ||
                    "Tu negocio"}
                </p>

              </div>

              <div className="flex items-center gap-3">

                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      "/chat"
                    )
                  }
                  className="hidden rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-gray-300 transition hover:bg-white/5 hover:text-white sm:block"
                >
                  🤖 Hablar con IA
                </button>

                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      "/appointments"
                    )
                  }
                  className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-gray-200"
                >
                  + Nueva cita
                </button>

              </div>

            </div>

          </header>

          {/* MAIN */}

          <div className="mx-auto max-w-7xl px-6 py-8 lg:px-10">

            {/* SALUDO */}

            <div>

              <p className="text-sm capitalize text-gray-500">
                {formattedToday}
              </p>

              <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
                {greeting} 👋
              </h1>

              <p className="mt-2 text-gray-400">
                Aquí tienes el resumen de lo que está pasando en tu negocio.
              </p>

            </div>

            {/* NEGOCIO NO CONFIGURADO */}

            {!business && (
              <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6">

                <p className="text-gray-300">
                  Todavía no tienes un negocio configurado.
                </p>

                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      "/onboarding"
                    )
                  }
                  className="mt-4 rounded-xl bg-white px-5 py-2.5 font-semibold text-black transition hover:bg-gray-200"
                >
                  Configurar negocio
                </button>

              </div>
            )}

            {/* PLAN ACTUAL */}

            {business && (
              <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6">

                <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">

                  <div>

                    <p className="text-sm text-gray-500">
                      Plan actual
                    </p>

                    <div className="mt-2 flex flex-wrap items-center gap-3">

                      <h2 className="text-2xl font-bold">
                        {getPlanLabel(
                          business.plan
                        )}
                      </h2>

                      <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-gray-400">
                        {getStatusLabel(
                          business.subscriptionStatus
                        )}
                      </span>

                    </div>

                    <div className="mt-2 space-y-2">
                      <p className="text-sm text-gray-500">
                        Tu negocio está utilizando este plan de BarberAI.
                      </p>

                      {business.subscriptionStatus === "TRIALING" &&
                        business.trialEndsAt && (
                          <p className="text-sm text-gray-300">
                            🎁 Te quedan{" "}
                            <span className="font-semibold text-white">
                              {getTrialDaysRemaining()} días
                            </span>{" "}
                            de prueba gratis.
                          </p>
                        )}
                    </div>

                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      router.push(
                        "/pricing"
                      )
                    }
                    className="rounded-xl border border-white/10 px-5 py-2.5 text-sm font-semibold text-gray-300 transition hover:bg-white/5 hover:text-white"
                  >
                    Ver planes →
                  </button>

                </div>

              </div>
            )}

            {/* USO DE IA */}

            {business && aiUsage && (
              <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-6">

                <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">

                  <div className="min-w-0">

                    <div className="flex flex-wrap items-center gap-3">

                      <p className="text-sm text-gray-500">
                        Uso de IA
                      </p>

                      <span className="rounded-full border border-white/10 px-2.5 py-1 text-xs text-gray-400">
                        {getPlanLabel(
                          aiUsage.plan
                        )}
                      </span>

                    </div>

                    <div className="mt-2 flex flex-wrap items-baseline gap-2">

                      <span className="text-3xl font-bold">
                        {aiUsage.used}
                      </span>

                      <span className="text-gray-500">
                        / {aiUsage.limit} mensajes
                      </span>

                    </div>

                    <p className="mt-2 text-sm text-gray-500">
                      Te quedan{" "}
                      <span className="font-medium text-gray-300">
                        {aiUsage.remaining}
                      </span>{" "}
                      mensajes de IA este mes.
                    </p>

                  </div>

                  <div className="w-full sm:max-w-xs">

                    <div className="mb-2 flex items-center justify-between text-xs">

                      <span className="text-gray-500">
                        {aiUsage.percentage}% utilizado
                      </span>

                      <span className="text-gray-600">
                        {aiUsage.month}
                      </span>

                    </div>

                    <div className="h-2 overflow-hidden rounded-full bg-white/10">

                      <div
                        className="h-full rounded-full bg-white transition-all duration-500"
                        style={{
                          width: `${aiUsage.percentage}%`,
                        }}
                      />

                    </div>

                    {aiUsage.percentage >=
                      80 &&
                      aiUsage.percentage <
                        100 && (
                        <p className="mt-3 text-xs text-gray-400">
                          Estás cerca del límite mensual de tu plan.
                        </p>
                      )}

                    {aiUsage.percentage >=
                      100 && (
                      <div className="mt-3">

                        <p className="text-xs text-gray-400">
                          Has alcanzado el límite mensual de IA.
                        </p>

                        <button
                          type="button"
                          onClick={() =>
                            router.push(
                              "/pricing"
                            )
                          }
                          className="mt-2 text-xs font-medium text-white underline underline-offset-4"
                        >
                          Ver planes →
                        </button>

                      </div>
                    )}

                  </div>

                </div>

              </div>
            )}

            {/* ESTADÍSTICAS */}

            <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-white/20">

                <div className="flex items-start justify-between">

                  <p className="text-sm text-gray-500">
                    Total de citas
                  </p>

                  <span className="text-lg">
                    📅
                  </span>

                </div>

                <p className="mt-4 text-3xl font-bold">
                  {appointments.length}
                </p>

                <p className="mt-2 text-xs text-gray-600">
                  Todas las citas registradas
                </p>

              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-white/20">

                <div className="flex items-start justify-between">

                  <p className="text-sm text-gray-500">
                    Citas hoy
                  </p>

                  <span className="text-lg">
                    🕐
                  </span>

                </div>

                <p className="mt-4 text-3xl font-bold">
                  {todayAppointments.length}
                </p>

                <p className="mt-2 text-xs text-gray-600">
                  Reservas para hoy
                </p>

              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-white/20">

                <div className="flex items-start justify-between">

                  <p className="text-sm text-gray-500">
                    Próximas
                  </p>

                  <span className="text-lg">
                    ⚡
                  </span>

                </div>

                <p className="mt-4 text-3xl font-bold">
                  {upcomingAppointments.length}
                </p>

                <p className="mt-2 text-xs text-gray-600">
                  Citas pendientes
                </p>

              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-white/20">

                <div className="flex items-start justify-between">

                  <p className="text-sm text-gray-500">
                    Clientes
                  </p>

                  <span className="text-lg">
                    👥
                  </span>

                </div>

                <p className="mt-4 text-3xl font-bold">
                  {clients.length}
                </p>

                <p className="mt-2 text-xs text-gray-600">
                  Clientes registrados
                </p>

              </div>

            </div>

            {/* EMPLEADO IA */}

            <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-6">

              <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">

                <div>

                  <div className="flex flex-wrap items-center gap-3">

                    <p className="text-sm text-gray-500">
                      Empleado IA
                    </p>

                    <span className="flex items-center gap-1.5 rounded-full border border-white/10 px-2.5 py-1 text-xs text-gray-400">

                      <span className="h-1.5 w-1.5 rounded-full bg-white" />

                      Activo

                    </span>

                  </div>

                  <p className="mt-2 text-xl font-semibold">
                    {business?.aiName ||
                      "Empleado IA"}
                  </p>

                  <p className="mt-1 text-sm text-gray-500">
                    Personalidad:{" "}
                    {business?.aiPersonality ||
                      "amigable"}
                  </p>

                  <p className="mt-2 text-sm text-gray-500">
                    Disponible para atender conversaciones y gestionar citas.
                  </p>

                </div>

                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      "/chat"
                    )
                  }
                  className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-gray-300 transition hover:bg-white/5 hover:text-white"
                >
                  Hablar con IA →
                </button>

              </div>

            </div>

            {/* CITAS DE HOY */}

            <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03]">

              <div className="flex flex-col justify-between gap-3 border-b border-white/10 p-6 sm:flex-row sm:items-center">

                <div>

                  <h2 className="text-xl font-bold">
                    Citas de hoy
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">

                    {todayAppointments.length ===
                    0
                      ? "No tienes citas programadas para hoy."
                      : `${todayAppointments.length} cita${
                          todayAppointments.length ===
                          1
                            ? ""
                            : "s"
                        } programada${
                          todayAppointments.length ===
                          1
                            ? ""
                            : "s"
                        } para hoy.`}

                  </p>

                </div>

                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      "/appointments"
                    )
                  }
                  className="text-sm font-medium text-gray-400 transition hover:text-white"
                >
                  Ver agenda →
                </button>

              </div>

              {todayAppointments.length >
              0 ? (
                <div className="divide-y divide-white/10">

                  {todayAppointments
                    .slice(0, 5)
                    .map(
                      (
                        appointment
                      ) => (
                        <div
                          key={
                            appointment.id
                          }
                          className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center"
                        >

                          <div className="flex items-center gap-4">

                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-sm font-bold">
                              {
                                appointment.time
                              }
                            </div>

                            <div>

                              <p className="font-semibold">
                                {
                                  appointment.client
                                }
                              </p>

                              <p className="mt-1 text-sm text-gray-500">
                                {
                                  appointment.service
                                }
                              </p>

                            </div>

                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              router.push(
                                "/appointments"
                              )
                            }
                            className="rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-gray-400 transition hover:bg-white/5 hover:text-white"
                          >
                            Ver cita
                          </button>

                        </div>
                      )
                    )}

                </div>
              ) : (
                <div className="p-6">

                  <p className="text-sm text-gray-500">
                    Tu agenda está libre por ahora.
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      router.push(
                        "/appointments"
                      )
                    }
                    className="mt-4 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-gray-200"
                  >
                    Crear una cita
                  </button>

                </div>
              )}

            </div>

            {/* PRÓXIMAS CITAS */}

            <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03]">

              <div className="flex flex-col justify-between gap-3 border-b border-white/10 p-6 sm:flex-row sm:items-center">

                <div>

                  <h2 className="text-xl font-bold">
                    Próximas citas
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    Las siguientes reservas de tu agenda.
                  </p>

                </div>

                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      "/appointments"
                    )
                  }
                  className="text-sm font-medium text-gray-400 transition hover:text-white"
                >
                  Ver todas →
                </button>

              </div>

              {nextAppointments.length >
              0 ? (
                <div className="divide-y divide-white/10">

                  {nextAppointments.map(
                    (
                      appointment
                    ) => (
                      <div
                        key={
                          appointment.id
                        }
                        className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center"
                      >

                        <div>

                          <p className="font-semibold">
                            {
                              appointment.client
                            }
                          </p>

                          <p className="mt-1 text-sm text-gray-500">
                            {
                              appointment.service
                            }
                          </p>

                        </div>

                        <div className="text-left sm:text-right">

                          <p className="font-semibold">
                            {
                              appointment.time
                            }
                          </p>

                          <p className="mt-1 text-sm capitalize text-gray-500">
                            {formatDate(
                              appointment.date
                            )}
                          </p>

                        </div>

                      </div>
                    )
                  )}

                </div>
              ) : (
                <div className="p-6">

                  <p className="text-sm text-gray-500">
                    No tienes próximas citas.
                  </p>

                </div>
              )}

            </div>

            {/* ACCIONES RÁPIDAS */}

            <div className="mt-8">

              <div>

                <h2 className="text-xl font-bold">
                  Acciones rápidas
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Accede rápidamente a las funciones principales.
                </p>

              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-3">

                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      "/appointments"
                    )
                  }
                  className="group rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-left transition hover:border-white/20 hover:bg-white/[0.06]"
                >

                  <div className="text-2xl">
                    📅
                  </div>

                  <h3 className="mt-4 font-semibold">
                    Nueva cita
                  </h3>

                  <p className="mt-2 text-sm text-gray-500">
                    Crea y administra las citas de tu negocio.
                  </p>

                  <p className="mt-4 text-sm text-gray-400 transition group-hover:text-white">
                    Abrir agenda →
                  </p>

                </button>

                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      "/chat"
                    )
                  }
                  className="group rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-left transition hover:border-white/20 hover:bg-white/[0.06]"
                >

                  <div className="text-2xl">
                    🤖
                  </div>

                  <h3 className="mt-4 font-semibold">
                    {business?.aiName ||
                      "Empleado IA"}
                  </h3>

                  <p className="mt-2 text-sm text-gray-500">
                    Habla con tu empleado de IA y prueba cómo atiende.
                  </p>

                  <p className="mt-4 text-sm text-gray-400 transition group-hover:text-white">
                    Abrir chat →
                  </p>

                </button>

                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      "/clients"
                    )
                  }
                  className="group rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-left transition hover:border-white/20 hover:bg-white/[0.06]"
                >

                  <div className="text-2xl">
                    👥
                  </div>

                  <h3 className="mt-4 font-semibold">
                    Clientes
                  </h3>

                  <p className="mt-2 text-sm text-gray-500">
                    Consulta y administra tus clientes.
                  </p>

                  <p className="mt-4 text-sm text-gray-400 transition group-hover:text-white">
                    Ver clientes →
                  </p>

                </button>

              </div>

            </div>

            {/* INFORMACIÓN DEL NEGOCIO */}

            {business && (
              <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6">

                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">

                  <div>

                    <p className="text-sm text-gray-500">
                      Tu negocio
                    </p>

                    <h2 className="mt-1 text-xl font-bold">
                      {business.name}
                    </h2>

                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      router.push(
                        "/settings"
                      )
                    }
                    className="rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-gray-300 transition hover:bg-white/5 hover:text-white"
                  >
                    ⚙️ Configuración
                  </button>

                </div>

                <p className="mt-5 max-w-3xl text-gray-400">
                  {business.description ||
                    "Todavía no has añadido una descripción para tu negocio."}
                </p>

              </div>
            )}

          </div>

        </div>

      </div>
    </main>
  );
}