"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Onboarding() {
  const router = useRouter();

  const [businessName, setBusinessName] = useState("");
  const [description, setDescription] = useState("");
  const [services, setServices] = useState("");

  const [hours, setHours] = useState({
    lunes: { open: "09:00", close: "19:00", closed: false },
    martes: { open: "09:00", close: "19:00", closed: false },
    miercoles: { open: "09:00", close: "19:00", closed: false },
    jueves: { open: "09:00", close: "19:00", closed: false },
    viernes: { open: "09:00", close: "19:00", closed: false },
    sabado: { open: "09:00", close: "17:00", closed: false },
    domingo: { open: "09:00", close: "17:00", closed: true },
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function updateDay(
    day: keyof typeof hours,
    field: "open" | "close" | "closed",
    value: string | boolean
  ) {
    setHours((current) => ({
      ...current,
      [day]: {
        ...current[day],
        [field]: value,
      },
    }));
  }

  function formatHours() {
    const days = [
      ["lunes", "Lunes"],
      ["martes", "Martes"],
      ["miercoles", "Miércoles"],
      ["jueves", "Jueves"],
      ["viernes", "Viernes"],
      ["sabado", "Sábado"],
      ["domingo", "Domingo"],
    ] as const;

    return days
      .map(([key, label]) => {
        const day = hours[key];

        if (day.closed) {
          return `${label}: Cerrado`;
        }

        return `${label}: ${day.open} - ${day.close}`;
      })
      .join("\n");
  }

  async function saveBusiness() {
    setError("");

    if (!businessName.trim()) {
      setError("Escribe el nombre de tu negocio.");
      return;
    }

    if (!description.trim()) {
      setError("Escribe una descripción de tu negocio.");
      return;
    }

    if (!services.trim()) {
      setError("Agrega al menos un servicio.");
      return;
    }

    setSaving(true);

    const business = {
      businessName: businessName.trim(),
      description: description.trim(),
      services: services.trim(),
      hours: formatHours(),
    };

    try {
      const response = await fetch("/api/business", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: business.businessName,
          description: business.description,
          services: business.services,
          hours: business.hours,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "No se pudo guardar el negocio."
        );
      }

      localStorage.setItem(
        "barberai_business",
        JSON.stringify(business)
      );

      router.push("/dashboard");
    } catch (error) {
      console.error("Error guardando negocio:", error);

      setError(
        error instanceof Error
          ? error.message
          : "No se pudo guardar el negocio."
      );
    } finally {
      setSaving(false);
    }
  }

  const days = [
    ["lunes", "Lunes"],
    ["martes", "Martes"],
    ["miercoles", "Miércoles"],
    ["jueves", "Jueves"],
    ["viernes", "Viernes"],
    ["sabado", "Sábado"],
    ["domingo", "Domingo"],
  ] as const;

  return (
    <main className="min-h-screen bg-black px-6 py-12 text-white">
      <div className="mx-auto max-w-2xl">

        <div className="mb-8">
          <p className="text-sm text-gray-500">
            PASO 1 DE 3
          </p>

          <h1 className="mt-2 text-4xl font-bold">
            Cuéntanos sobre tu negocio
          </h1>

          <p className="mt-3 text-gray-400">
            Esta información ayudará a tu empleado de IA a conocer tu negocio.
          </p>
        </div>

        <div className="space-y-6">

          <div>
            <label className="mb-2 block text-sm font-medium">
              Nombre del negocio
            </label>

            <input
              type="text"
              placeholder="Ej. Barbería El Rockstar"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-4 outline-none placeholder:text-gray-600 focus:border-white/30"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              ¿Qué hace tu negocio?
            </label>

            <textarea
              placeholder="Ej. Somos una barbería especializada en cortes modernos..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-4 outline-none placeholder:text-gray-600 focus:border-white/30"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Servicios y precios
            </label>

            <textarea
              placeholder={"Ej.\nCorte - $25\nCorte + barba - $35\nBarba - $15"}
              value={services}
              onChange={(e) => setServices(e.target.value)}
              rows={5}
              className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-4 outline-none placeholder:text-gray-600"
            />
          </div>

          <div>
            <label className="mb-3 block text-sm font-medium">
              Horario del negocio
            </label>

            <div className="space-y-3">
              {days.map(([key, label]) => {
                const day = hours[key];

                return (
                  <div
                    key={key}
                    className="rounded-xl border border-white/10 bg-white/5 p-4"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                      <div className="w-28 font-medium">
                        {label}
                      </div>

                      {day.closed ? (
                        <div className="flex flex-1 items-center justify-between gap-3">
                          <span className="text-gray-500">
                            Cerrado
                          </span>

                          <button
                            type="button"
                            onClick={() =>
                              updateDay(key, "closed", false)
                            }
                            className="rounded-lg border border-white/10 px-3 py-2 text-sm transition hover:bg-white/10"
                          >
                            Abrir
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">

                          <input
                            type="time"
                            value={day.open}
                            onChange={(e) =>
                              updateDay(key, "open", e.target.value)
                            }
                            className="rounded-lg border border-white/10 bg-black px-3 py-2 text-white outline-none"
                          />

                          <span className="text-gray-500">
                            hasta
                          </span>

                          <input
                            type="time"
                            value={day.close}
                            onChange={(e) =>
                              updateDay(key, "close", e.target.value)
                            }
                            className="rounded-lg border border-white/10 bg-black px-3 py-2 text-white outline-none"
                          />

                          <button
                            type="button"
                            onClick={() =>
                              updateDay(key, "closed", true)
                            }
                            className="rounded-lg border border-white/10 px-3 py-2 text-sm text-gray-400 transition hover:bg-white/10"
                          >
                            Cerrado
                          </button>

                        </div>
                      )}

                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={saveBusiness}
            disabled={saving}
            className="w-full rounded-xl bg-white py-4 font-semibold text-black transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Guardando negocio..." : "Continuar →"}
          </button>

        </div>
      </div>
    </main>
  );
}