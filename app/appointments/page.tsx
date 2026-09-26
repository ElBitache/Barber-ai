"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Appointment = {
  id: number;
  client: string;
  service: string;
  date: string;
  time: string;
  createdAt: string;
  businessId?: number | null;
};

type Service = {
  name: string;
  price: string;
};

type Business = {
  name: string;
  services: string;
};

function parseServices(servicesText: string): Service[] {
  const text = String(servicesText || "").trim();

  if (!text) {
    return [];
  }

  try {
    const parsed = JSON.parse(text);

    if (Array.isArray(parsed)) {
      return parsed
        .map((item) => ({
          name: String(item?.name || "").trim(),
          price: String(item?.price || "").trim(),
        }))
        .filter((item) => item.name.length > 0);
    }
  } catch {
    // Continuamos con formato de texto.
  }

  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      let name = line;
      let price = "";

      if (line.includes("–")) {
        const parts = line.split("–");

        name = parts[0]?.trim() || "";
        price = parts.slice(1).join("–").trim();
      } else if (line.includes(" - ")) {
        const parts = line.split(" - ");

        name = parts[0]?.trim() || "";
        price = parts.slice(1).join(" - ").trim();
      } else if (line.includes(":")) {
        const parts = line.split(":");

        name = parts[0]?.trim() || "";
        price = parts.slice(1).join(":").trim();
      }

      return {
        name,
        price,
      };
    })
    .filter((item) => item.name.length > 0);
}

function getToday() {
  const today = new Date();

  const year = today.getFullYear();

  const month = String(
    today.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    today.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDate(date: string) {
  const parsed = new Date(
    `${date}T12:00:00`
  );

  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return new Intl.DateTimeFormat(
    "es-MX",
    {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }
  ).format(parsed);
}

function formatShortDate(date: string) {
  const parsed = new Date(
    `${date}T12:00:00`
  );

  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return new Intl.DateTimeFormat(
    "es-MX",
    {
      day: "numeric",
      month: "short",
    }
  ).format(parsed);
}

export default function Appointments() {
  const router = useRouter();

  const [appointments, setAppointments] =
    useState<Appointment[]>([]);

  const [availableServices, setAvailableServices] =
    useState<Service[]>([]);

  const [showForm, setShowForm] =
    useState(false);

  const [client, setClient] =
    useState("");

  const [service, setService] =
    useState("");

  const [date, setDate] =
    useState("");

  const [time, setTime] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [loadingBusiness, setLoadingBusiness] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [deletingId, setDeletingId] =
    useState<number | null>(null);

  const today = getToday();

  useEffect(() => {
    void loadAppointments();
    void loadBusiness();
  }, []);

  async function loadAppointments() {
    try {
      setLoading(true);

      const response = await fetch(
        "/api/appointments",
        {
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "No se pudieron cargar las citas."
        );
      }

      setAppointments(
        Array.isArray(data.appointments)
          ? data.appointments
          : []
      );
    } catch (error) {
      console.error(
        "Error cargando citas:",
        error
      );

      if (error instanceof Error) {
        alert(error.message);
      }
    } finally {
      setLoading(false);
    }
  }

  async function loadBusiness() {
    try {
      setLoadingBusiness(true);

      const response = await fetch(
        "/api/business",
        {
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "No se pudo cargar la información del negocio."
        );
      }

      const business =
        data.business as Business | null;

      if (!business) {
        throw new Error(
          "No tienes un negocio configurado."
        );
      }

      const services = parseServices(
        business.services
      );

      setAvailableServices(services);

      if (services.length > 0) {
        setService(services[0].name);
      }
    } catch (error) {
      console.error(
        "Error cargando negocio:",
        error
      );

      if (error instanceof Error) {
        alert(error.message);
      }
    } finally {
      setLoadingBusiness(false);
    }
  }

  function resetForm() {
    setClient("");
    setDate("");
    setTime("");

    if (availableServices.length > 0) {
      setService(
        availableServices[0].name
      );
    } else {
      setService("");
    }
  }

  function openNewAppointment() {
    resetForm();
    setShowForm(true);
  }

  function closeForm() {
    if (saving) {
      return;
    }

    resetForm();
    setShowForm(false);
  }

  async function createAppointment() {
    if (!client.trim()) {
      alert(
        "Escribe el nombre del cliente."
      );
      return;
    }

    if (!service) {
      alert(
        "Selecciona un servicio."
      );
      return;
    }

    if (!date) {
      alert(
        "Selecciona una fecha."
      );
      return;
    }

    if (!time) {
      alert(
        "Selecciona una hora."
      );
      return;
    }

    if (date < today) {
      alert(
        "No puedes crear una cita en una fecha pasada."
      );
      return;
    }

    try {
      setSaving(true);

      const response = await fetch(
        "/api/appointments",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            client: client.trim(),
            service,
            date,
            time,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "No se pudo crear la cita."
        );
      }

      if (!data.appointment) {
        throw new Error(
          "La cita fue creada, pero no se recibieron sus datos."
        );
      }

      setAppointments((current) =>
        [...current, data.appointment].sort(
          (a, b) => {
            const first =
              `${a.date} ${a.time}`;

            const second =
              `${b.date} ${b.time}`;

            return first.localeCompare(
              second
            );
          }
        )
      );

      resetForm();
      setShowForm(false);

      alert(
        "¡Cita creada correctamente! 🚀"
      );
    } catch (error) {
      console.error(
        "Error creando cita:",
        error
      );

      if (error instanceof Error) {
        alert(error.message);
      } else {
        alert(
          "No se pudo crear la cita."
        );
      }
    } finally {
      setSaving(false);
    }
  }

  async function deleteAppointment(
    id: number
  ) {
    const confirmed =
      window.confirm(
        "¿Seguro que quieres eliminar esta cita?"
      );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(id);

      const response = await fetch(
        "/api/appointments",
        {
          method: "DELETE",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            id,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "No se pudo eliminar la cita."
        );
      }

      setAppointments((current) =>
        current.filter(
          (appointment) =>
            appointment.id !== id
        )
      );
    } catch (error) {
      console.error(
        "Error eliminando cita:",
        error
      );

      if (error instanceof Error) {
        alert(error.message);
      } else {
        alert(
          "No se pudo eliminar la cita."
        );
      }
    } finally {
      setDeletingId(null);
    }
  }

  const sortedAppointments =
    useMemo(() => {
      return [...appointments].sort(
        (a, b) => {
          const first =
            `${a.date} ${a.time}`;

          const second =
            `${b.date} ${b.time}`;

          return first.localeCompare(
            second
          );
        }
      );
    }, [appointments]);

  const todayAppointments =
    useMemo(() => {
      return sortedAppointments.filter(
        (appointment) =>
          appointment.date === today
      );
    }, [
      sortedAppointments,
      today,
    ]);

  const upcomingAppointments =
    useMemo(() => {
      return sortedAppointments.filter(
        (appointment) =>
          appointment.date >= today
      );
    }, [
      sortedAppointments,
      today,
    ]);

  const futureAppointments =
    useMemo(() => {
      return upcomingAppointments.filter(
        (appointment) =>
          appointment.date > today
      );
    }, [upcomingAppointments, today]);

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-6 lg:px-10">

        {/* HEADER */}

        <header className="flex flex-col justify-between gap-6 border-b border-white/10 pb-8 sm:flex-row sm:items-end">

          <div>
            <button
              type="button"
              onClick={() =>
                router.push("/dashboard")
              }
              className="flex items-center gap-3"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-black">
                ✂️
              </div>

              <span className="text-sm font-bold tracking-[0.2em] text-gray-300">
                BARBERAI
              </span>
            </button>

            <p className="mt-8 text-sm text-gray-500">
              Administración
            </p>

            <h1 className="mt-1 text-4xl font-bold tracking-tight sm:text-5xl">
              Citas
            </h1>

            <p className="mt-2 max-w-xl text-gray-400">
              Administra las reservas y mantén
              organizada la agenda de tu negocio.
            </p>
          </div>

          <button
            type="button"
            onClick={openNewAppointment}
            className="rounded-xl bg-white px-6 py-3 font-bold text-black transition hover:bg-gray-200"
          >
            + Nueva cita
          </button>

        </header>

        {/* ESTADÍSTICAS */}

        <section className="mt-8 grid gap-4 sm:grid-cols-3">

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-sm text-gray-500">
              Total de citas
            </p>

            <p className="mt-3 text-3xl font-bold">
              {appointments.length}
            </p>

            <p className="mt-2 text-xs text-gray-600">
              Todas las reservas
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-sm text-gray-500">
              Hoy
            </p>

            <p className="mt-3 text-3xl font-bold">
              {todayAppointments.length}
            </p>

            <p className="mt-2 text-xs text-gray-600">
              Citas para hoy
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-sm text-gray-500">
              Próximas
            </p>

            <p className="mt-3 text-3xl font-bold">
              {futureAppointments.length}
            </p>

            <p className="mt-2 text-xs text-gray-600">
              Después de hoy
            </p>
          </div>

        </section>

        {/* FORMULARIO */}

        {showForm && (
          <section className="mt-8 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">

            <div className="flex flex-col justify-between gap-4 border-b border-white/10 p-6 sm:flex-row sm:items-center">

              <div>
                <p className="text-sm text-gray-500">
                  Nueva reserva
                </p>

                <h2 className="mt-1 text-2xl font-bold">
                  Crear una cita
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Añade una reserva directamente
                  desde el panel.
                </p>
              </div>

              <button
                type="button"
                onClick={closeForm}
                disabled={saving}
                className="self-start rounded-lg border border-white/10 px-3 py-2 text-sm text-gray-400 transition hover:bg-white/5 hover:text-white disabled:opacity-50 sm:self-auto"
              >
                ✕ Cerrar
              </button>

            </div>

            <div className="p-6">

              <div className="grid gap-5 sm:grid-cols-2">

                {/* CLIENTE */}

                <div>
                  <label
                    htmlFor="client"
                    className="mb-2 block text-sm font-semibold text-gray-300"
                  >
                    Cliente
                  </label>

                  <input
                    id="client"
                    type="text"
                    value={client}
                    onChange={(event) =>
                      setClient(
                        event.target.value
                      )
                    }
                    placeholder="Ej. Juan Pérez"
                    autoComplete="name"
                    className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none placeholder:text-gray-600 focus:border-white/30"
                  />
                </div>

                {/* SERVICIO */}

                <div>
                  <label
                    htmlFor="service"
                    className="mb-2 block text-sm font-semibold text-gray-300"
                  >
                    Servicio
                  </label>

                  <select
                    id="service"
                    value={service}
                    onChange={(event) =>
                      setService(
                        event.target.value
                      )
                    }
                    disabled={
                      loadingBusiness ||
                      availableServices.length ===
                        0
                    }
                    className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none focus:border-white/30 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">
                      {loadingBusiness
                        ? "Cargando servicios..."
                        : "Selecciona un servicio"}
                    </option>

                    {availableServices.map(
                      (item) => (
                        <option
                          key={item.name}
                          value={item.name}
                        >
                          {item.name}
                          {item.price
                            ? ` — ${item.price}`
                            : ""}
                        </option>
                      )
                    )}
                  </select>

                  {!loadingBusiness &&
                    availableServices.length ===
                      0 && (
                      <p className="mt-2 text-sm text-gray-500">
                        Configura primero los
                        servicios en Configuración.
                      </p>
                    )}
                </div>

                {/* FECHA */}

                <div>
                  <label
                    htmlFor="date"
                    className="mb-2 block text-sm font-semibold text-gray-300"
                  >
                    Fecha
                  </label>

                  <input
                    id="date"
                    type="date"
                    value={date}
                    min={today}
                    onChange={(event) =>
                      setDate(
                        event.target.value
                      )
                    }
                    className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none focus:border-white/30"
                    style={{
                      colorScheme: "dark",
                    }}
                  />

                  {date && (
                    <p className="mt-2 text-xs capitalize text-gray-500">
                      {formatDate(date)}
                    </p>
                  )}
                </div>

                {/* HORA */}

                <div>
                  <label
                    htmlFor="time"
                    className="mb-2 block text-sm font-semibold text-gray-300"
                  >
                    Hora
                  </label>

                  <input
                    id="time"
                    type="time"
                    value={time}
                    onChange={(event) =>
                      setTime(
                        event.target.value
                      )
                    }
                    className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none focus:border-white/30"
                    style={{
                      colorScheme: "dark",
                    }}
                  />
                </div>

              </div>

              {/* RESUMEN */}

              {client &&
                service &&
                date &&
                time && (
                  <div className="mt-6 rounded-xl border border-white/10 bg-black p-5">

                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-600">
                      Resumen
                    </p>

                    <div className="mt-3 grid gap-3 text-sm sm:grid-cols-3">

                      <div>
                        <p className="text-gray-600">
                          Cliente
                        </p>

                        <p className="mt-1 font-medium">
                          {client}
                        </p>
                      </div>

                      <div>
                        <p className="text-gray-600">
                          Servicio
                        </p>

                        <p className="mt-1 font-medium">
                          {service}
                        </p>
                      </div>

                      <div>
                        <p className="text-gray-600">
                          Fecha y hora
                        </p>

                        <p className="mt-1 font-medium">
                          {formatShortDate(date)}{" "}
                          · {time}
                        </p>
                      </div>

                    </div>

                  </div>
                )}

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">

                <button
                  type="button"
                  onClick={() =>
                    void createAppointment()
                  }
                  disabled={
                    saving ||
                    loadingBusiness ||
                    availableServices.length ===
                      0
                  }
                  className="rounded-xl bg-white px-6 py-3 font-bold text-black transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? "Guardando..."
                    : "Crear cita"}
                </button>

                <button
                  type="button"
                  onClick={closeForm}
                  disabled={saving}
                  className="rounded-xl border border-white/10 px-6 py-3 font-semibold text-gray-300 transition hover:bg-white/5 hover:text-white disabled:opacity-50"
                >
                  Cancelar
                </button>

              </div>

            </div>
          </section>
        )}

        {/* CITAS DE HOY */}

        <section className="mt-8 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">

          <div className="border-b border-white/10 p-6">

            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">

              <div>
                <p className="text-sm text-gray-500">
                  Agenda
                </p>

                <h2 className="mt-1 text-xl font-bold">
                  Citas de hoy
                </h2>
              </div>

              <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-semibold text-gray-400">
                {todayAppointments.length}{" "}
                {todayAppointments.length === 1
                  ? "cita"
                  : "citas"}
              </span>

            </div>

          </div>

          {loading ? (
            <div className="px-6 py-12 text-center">
              <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-white/20 border-t-white" />

              <p className="mt-3 text-sm text-gray-500">
                Cargando agenda...
              </p>
            </div>
          ) : todayAppointments.length ===
            0 ? (
            <div className="p-8 text-center">

              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-black text-2xl">
                📅
              </div>

              <p className="mt-4 font-semibold">
                No tienes citas hoy.
              </p>

              <p className="mt-1 text-sm text-gray-500">
                Tu agenda está libre por ahora.
              </p>

              <button
                type="button"
                onClick={openNewAppointment}
                className="mt-5 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-gray-200"
              >
                Crear una cita
              </button>

            </div>
          ) : (
            <div className="divide-y divide-white/10">

              {todayAppointments.map(
                (appointment) => (
                  <article
                    key={appointment.id}
                    className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center"
                  >

                    <div className="flex items-center gap-4">

                      <div className="flex h-12 w-16 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black font-bold">
                        {appointment.time}
                      </div>

                      <div>
                        <h3 className="font-semibold">
                          {appointment.client}
                        </h3>

                        <p className="mt-1 text-sm text-gray-500">
                          ✂️ {appointment.service}
                        </p>
                      </div>

                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        void deleteAppointment(
                          appointment.id
                        )
                      }
                      disabled={
                        deletingId ===
                        appointment.id
                      }
                      className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-gray-400 transition hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {deletingId ===
                      appointment.id
                        ? "Eliminando..."
                        : "Eliminar"}
                    </button>

                  </article>
                )
              )}

            </div>
          )}

        </section>

        {/* PRÓXIMAS CITAS */}

        <section className="mt-8 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">

          <div className="border-b border-white/10 p-6">

            <p className="text-sm text-gray-500">
              Agenda futura
            </p>

            <h2 className="mt-1 text-xl font-bold">
              Próximas citas
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Tus reservas después de hoy.
            </p>

          </div>

          {futureAppointments.length ===
          0 ? (
            <div className="p-8 text-center">

              <p className="font-semibold">
                No tienes citas futuras.
              </p>

              <p className="mt-1 text-sm text-gray-500">
                Las nuevas reservas aparecerán aquí.
              </p>

            </div>
          ) : (
            <div className="divide-y divide-white/10">

              {futureAppointments.map(
                (appointment) => (
                  <article
                    key={appointment.id}
                    className="flex flex-col justify-between gap-5 p-5 sm:flex-row sm:items-center"
                  >

                    <div>
                      <h3 className="font-semibold">
                        {appointment.client}
                      </h3>

                      <p className="mt-1 text-sm text-gray-500">
                        ✂️ {appointment.service}
                      </p>
                    </div>

                    <div className="flex items-center gap-4">

                      <div className="text-left sm:text-right">

                        <p className="font-semibold">
                          {appointment.time}
                        </p>

                        <p className="mt-1 text-sm capitalize text-gray-500">
                          {formatDate(
                            appointment.date
                          )}
                        </p>

                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          void deleteAppointment(
                            appointment.id
                          )
                        }
                        disabled={
                          deletingId ===
                          appointment.id
                        }
                        className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-gray-400 transition hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {deletingId ===
                        appointment.id
                          ? "..."
                          : "Eliminar"}
                      </button>

                    </div>

                  </article>
                )
              )}

            </div>
          )}

        </section>

      </div>
    </main>
  );
}