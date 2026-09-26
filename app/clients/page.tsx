"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Client = {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  createdAt: string;
  appointments: {
    id: number;
    service: string;
    date: string;
    time: string;
  }[];
};

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [selectedClient, setSelectedClient] =
    useState<Client | null>(null);

  const [search, setSearch] = useState("");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function loadClients() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/clients", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        setError(
          data.error ||
            "No se pudieron cargar los clientes."
        );
        return;
      }

      setClients(
        Array.isArray(data.clients)
          ? data.clients
          : []
      );
    } catch (error) {
      console.error(error);

      setError(
        "Ocurrió un error cargando los clientes."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadClients();
  }, []);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");

    const cleanName = name.trim();
    const cleanPhone = phone.trim();
    const cleanEmail = email.trim();

    if (!cleanName) {
      setError(
        "El nombre del cliente es obligatorio."
      );
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(
        "/api/clients",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: cleanName,
            phone: cleanPhone,
            email: cleanEmail,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(
          data.error ||
            "No se pudo crear el cliente."
        );
        return;
      }

      setName("");
      setPhone("");
      setEmail("");
      setShowForm(false);

      await loadClients();
    } catch (error) {
      console.error(error);

      setError(
        "Ocurrió un error creando el cliente."
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteClient(id: number) {
    const confirmed = window.confirm(
      "¿Seguro que quieres eliminar este cliente?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");

      const response = await fetch(
        "/api/clients",
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(
          data.error ||
            "No se pudo eliminar el cliente."
        );
        return;
      }

      setSelectedClient(null);

      setClients((currentClients) =>
        currentClients.filter(
          (client) => client.id !== id
        )
      );
    } catch (error) {
      console.error(error);

      setError(
        "Ocurrió un error eliminando el cliente."
      );
    }
  }

  function openClient(client: Client) {
    setError("");
    setSelectedClient(client);
  }

  function closeClient() {
    setSelectedClient(null);
  }

  function closeForm() {
    if (saving) {
      return;
    }

    setName("");
    setPhone("");
    setEmail("");
    setShowForm(false);
    setError("");
  }

  const filteredClients = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return clients;
    }

    return clients.filter((client) => {
      const clientName =
        client.name.toLowerCase();

      const clientPhone =
        (client.phone || "").toLowerCase();

      const clientEmail =
        (client.email || "").toLowerCase();

      return (
        clientName.includes(query) ||
        clientPhone.includes(query) ||
        clientEmail.includes(query)
      );
    });
  }, [clients, search]);

  const totalAppointments = useMemo(() => {
    return clients.reduce(
      (total, client) =>
        total + client.appointments.length,
      0
    );
  }, [clients]);

  const topClient = useMemo(() => {
    if (clients.length === 0) {
      return null;
    }

    return clients.reduce(
      (currentTop, client) => {
        if (!currentTop) {
          return client;
        }

        return client.appointments.length >
          currentTop.appointments.length
          ? client
          : currentTop;
      },
      clients[0]
    );
  }, [clients]);

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-6 lg:px-10">

        <header className="flex flex-col justify-between gap-6 border-b border-white/10 pb-8 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-semibold tracking-[0.2em] text-gray-500">
              BARBERAI
            </p>

            <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
              Clientes
            </h1>

            <p className="mt-2 max-w-xl text-gray-400">
              Administra tus clientes, revisa su
              historial y mantén organizada la
              información de tu negocio.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              if (showForm) {
                closeForm();
              } else {
                setError("");
                setSelectedClient(null);
                setShowForm(true);
              }
            }}
            className="rounded-xl bg-white px-6 py-3 font-bold text-black transition hover:bg-gray-200"
          >
            {showForm
              ? "Cancelar"
              : "+ Agregar cliente"}
          </button>
        </header>

        {error && (
          <div className="mt-6 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <section className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-sm text-gray-500">
              Total de clientes
            </p>

            <p className="mt-3 text-3xl font-bold">
              {clients.length}
            </p>

            <p className="mt-2 text-xs text-gray-600">
              Clientes registrados
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-sm text-gray-500">
              Citas registradas
            </p>

            <p className="mt-3 text-3xl font-bold">
              {totalAppointments}
            </p>

            <p className="mt-2 text-xs text-gray-600">
              En el historial de clientes
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-sm text-gray-500">
              Cliente frecuente
            </p>

            <p className="mt-3 truncate text-xl font-bold">
              {topClient
                ? topClient.name
                : "—"}
            </p>

            <p className="mt-2 text-xs text-gray-600">
              {topClient
                ? `${topClient.appointments.length} ${
                    topClient.appointments.length === 1
                      ? "cita"
                      : "citas"
                  }`
                : "Sin datos todavía"}
            </p>
          </div>
        </section>

        {showForm && (
          <section className="mt-8 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
            <div className="border-b border-white/10 p-6">
              <p className="text-sm text-gray-500">
                Nuevo cliente
              </p>

              <h2 className="mt-1 text-2xl font-bold">
                Agregar cliente
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Guarda la información básica para
                tenerla disponible después.
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="p-6"
            >
              <div className="grid gap-5 md:grid-cols-3">

                <div>
                  <label
                    htmlFor="client-name"
                    className="mb-2 block text-sm font-semibold text-gray-300"
                  >
                    Nombre *
                  </label>

                  <input
                    id="client-name"
                    type="text"
                    value={name}
                    onChange={(event) =>
                      setName(event.target.value)
                    }
                    placeholder="Ej. Carlos"
                    autoComplete="name"
                    required
                    className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none placeholder:text-gray-600 focus:border-white/30"
                  />
                </div>

                <div>
                  <label
                    htmlFor="client-phone"
                    className="mb-2 block text-sm font-semibold text-gray-300"
                  >
                    Teléfono
                  </label>

                  <input
                    id="client-phone"
                    type="tel"
                    value={phone}
                    onChange={(event) =>
                      setPhone(event.target.value)
                    }
                    placeholder="Ej. 555-123-4567"
                    autoComplete="tel"
                    className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none placeholder:text-gray-600 focus:border-white/30"
                  />
                </div>

                <div>
                  <label
                    htmlFor="client-email"
                    className="mb-2 block text-sm font-semibold text-gray-300"
                  >
                    Email
                  </label>

                  <input
                    id="client-email"
                    type="email"
                    value={email}
                    onChange={(event) =>
                      setEmail(event.target.value)
                    }
                    placeholder="cliente@email.com"
                    autoComplete="email"
                    className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none placeholder:text-gray-600 focus:border-white/30"
                  />
                </div>

              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-white px-6 py-3 font-bold text-black transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? "Guardando..."
                    : "Guardar cliente"}
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
            </form>
          </section>
        )}

        <section className="mt-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

            <div>
              <h2 className="text-xl font-bold">
                Lista de clientes
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                {filteredClients.length} de{" "}
                {clients.length} clientes
              </p>
            </div>

            <div className="relative w-full sm:max-w-sm">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-600">
                🔎
              </span>

              <input
                type="search"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Buscar cliente..."
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-3 pl-11 pr-4 text-white outline-none placeholder:text-gray-600 focus:border-white/30"
              />
            </div>
          </div>
        </section>

        <section className="mt-5">
          {loading ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-10 text-center">
              <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-white/20 border-t-white" />

              <p className="mt-3 text-sm text-gray-500">
                Cargando clientes...
              </p>
            </div>
          ) : clients.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-10 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-black text-3xl">
                👤
              </div>

              <h2 className="mt-5 text-xl font-semibold">
                Todavía no tienes clientes
              </h2>

              <p className="mt-2 text-gray-500">
                Agrega tu primer cliente para
                empezar.
              </p>

              <button
                type="button"
                onClick={() =>
                  setShowForm(true)
                }
                className="mt-5 rounded-xl bg-white px-5 py-3 font-semibold text-black transition hover:bg-gray-200"
              >
                + Agregar cliente
              </button>
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-10 text-center">
              <div className="text-3xl">
                🔎
              </div>

              <h2 className="mt-4 text-lg font-semibold">
                No encontramos clientes
              </h2>

              <p className="mt-2 text-sm text-gray-500">
                Prueba con otro nombre, teléfono
                o email.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-white/10">
              <div className="divide-y divide-white/10">
                {filteredClients.map((client) => (
                  <div
                    key={client.id}
                    className="flex flex-col gap-5 bg-white/[0.02] p-5 transition hover:bg-white/[0.04] md:flex-row md:items-center md:justify-between"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        openClient(client)
                      }
                      className="flex min-w-0 items-center gap-4 text-left"
                    >
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/10 bg-black text-lg font-semibold">
                        {client.name
                          .charAt(0)
                          .toUpperCase()}
                      </div>

                      <div className="min-w-0">
                        <h3 className="truncate font-semibold">
                          {client.name}
                        </h3>

                        <div className="mt-1 flex flex-col gap-1 text-sm text-gray-500 sm:flex-row sm:gap-4">
                          {client.phone && (
                            <span>
                              📞 {client.phone}
                            </span>
                          )}

                          {client.email && (
                            <span className="truncate">
                              ✉️ {client.email}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>

                    <div className="flex flex-wrap items-center gap-3">
                      <div className="rounded-full border border-white/10 px-3 py-1.5 text-sm text-gray-400">
                        {client.appointments.length}{" "}
                        {client.appointments.length === 1
                          ? "cita"
                          : "citas"}
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          openClient(client)
                        }
                        className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-gray-300 transition hover:bg-white/5 hover:text-white"
                      >
                        Ver perfil
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          void deleteClient(client.id)
                        }
                        className="rounded-xl border border-red-500/20 px-4 py-2.5 text-sm font-semibold text-red-400 transition hover:bg-red-500/10"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {selectedClient && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 py-6 backdrop-blur-sm">
            <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/10 bg-black shadow-2xl">

              <div className="flex items-start justify-between border-b border-white/10 p-6">
                <div className="flex min-w-0 items-center gap-4">

                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-xl font-semibold">
                    {selectedClient.name
                      .charAt(0)
                      .toUpperCase()}
                  </div>

                  <div className="min-w-0">
                    <h2 className="truncate text-2xl font-bold">
                      {selectedClient.name}
                    </h2>

                    <p className="mt-1 text-sm text-gray-500">
                      Cliente de BarberAI
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={closeClient}
                  className="rounded-lg border border-white/10 px-3 py-2 text-gray-400 transition hover:bg-white/5 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="grid gap-4 p-6 sm:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-sm text-gray-500">
                    Teléfono
                  </p>

                  <p className="mt-2 font-medium">
                    {selectedClient.phone ||
                      "No agregado"}
                  </p>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-sm text-gray-500">
                    Email
                  </p>

                  <p className="mt-2 break-all font-medium">
                    {selectedClient.email ||
                      "No agregado"}
                  </p>
                </div>
              </div>

              <div className="grid gap-4 px-6 pb-6 sm:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-sm text-gray-500">
                    Total de citas
                  </p>

                  <p className="mt-2 text-2xl font-bold">
                    {
                      selectedClient
                        .appointments.length
                    }
                  </p>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-sm text-gray-500">
                    Cliente desde
                  </p>

                  <p className="mt-2 font-medium">
                    {new Date(
                      selectedClient.createdAt
                    ).toLocaleDateString(
                      "es-MX"
                    )}
                  </p>
                </div>
              </div>

              <div className="border-t border-white/10 p-6">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <div>
                    <h3 className="text-xl font-semibold">
                      Historial de citas
                    </h3>

                    <p className="mt-1 text-sm text-gray-500">
                      Todas las citas de este
                      cliente.
                    </p>
                  </div>

                  <div className="rounded-full border border-white/10 px-3 py-1 text-sm text-gray-400">
                    {
                      selectedClient
                        .appointments.length
                    }{" "}
                    {selectedClient
                      .appointments.length === 1
                      ? "cita"
                      : "citas"}
                  </div>
                </div>

                {selectedClient.appointments.length ===
                0 ? (
                  <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] p-8 text-center">
                    <div className="text-3xl">
                      📅
                    </div>

                    <p className="mt-3 font-medium">
                      Todavía no tiene citas
                    </p>

                    <p className="mt-1 text-sm text-gray-500">
                      Cuando tenga una reserva
                      aparecerá aquí.
                    </p>
                  </div>
                ) : (
                  <div className="mt-6 space-y-3">
                    {selectedClient.appointments.map(
                      (appointment) => (
                        <div
                          key={appointment.id}
                          className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div>
                            <p className="font-semibold">
                              {appointment.service}
                            </p>

                            <p className="mt-1 text-sm text-gray-500">
                              {appointment.date}
                            </p>
                          </div>

                          <div className="rounded-lg border border-white/10 px-3 py-2 text-sm text-gray-300">
                            🕐 {appointment.time}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>

              <div className="border-t border-white/10 p-6">
                <button
                  type="button"
                  onClick={() =>
                    void deleteClient(
                      selectedClient.id
                    )
                  }
                  className="rounded-xl border border-red-500/20 px-4 py-3 text-sm font-semibold text-red-400 transition hover:bg-red-500/10"
                >
                  Eliminar cliente
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </main>
  );
}