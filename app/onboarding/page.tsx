"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const BUSINESS_TYPES = [
  {
    value: "BARBERSHOP",
    label: "Barbería",
    name: "Ej. Barbería El Rockstar",
    description:
      "Somos una barbería especializada en cortes modernos y cuidado personal.",
    services: "Corte - $25\nCorte + barba - $35\nArreglo de barba - $15",
  },
  {
    value: "BEAUTY_SALON",
    label: "Salón de belleza",
    name: "Ej. Salón Elegance",
    description:
      "Ofrecemos servicios de belleza, cabello y cuidado personal.",
    services: "Corte de cabello\nTinte\nManicura\nTratamientos",
  },
  {
    value: "RESTAURANT",
    label: "Restaurante",
    name: "Ej. Restaurante El Sabor",
    description:
      "Somos un restaurante que ofrece comida y bebidas a nuestros clientes.",
    services: "Desayunos\nAlmuerzos\nCenas\nBebidas",
  },
  {
    value: "PLUMBER",
    label: "Plomería",
    name: "Ej. Plomería Rápida",
    description:
      "Realizamos reparaciones e instalaciones de plomería para hogares y negocios.",
    services: "Reparación de fugas\nDestapes\nInstalación de tuberías",
  },
  {
    value: "ELECTRICIAN",
    label: "Electricista",
    name: "Ej. Servicios Eléctricos López",
    description:
      "Realizamos instalaciones, revisiones y reparaciones eléctricas.",
    services: "Instalación de luces\nReparaciones eléctricas\nDiagnósticos",
  },
  {
    value: "CLEANING",
    label: "Limpieza",
    name: "Ej. Limpieza Brillante",
    description:
      "Ofrecemos servicios de limpieza para hogares, oficinas y negocios.",
    services: "Limpieza profunda\nLimpieza de oficinas\nLimpieza recurrente",
  },
  {
    value: "AUTO_REPAIR",
    label: "Taller mecánico",
    name: "Ej. Taller AutoPro",
    description:
      "Somos un taller especializado en mantenimiento y reparación de vehículos.",
    services: "Cambio de aceite\nRevisión de frenos\nDiagnóstico mecánico",
  },
  {
    value: "HOME_SERVICES",
    label: "Servicios para el hogar",
    name: "Ej. Soluciones del Hogar",
    description:
      "Ayudamos a nuestros clientes con reparaciones y mantenimiento del hogar.",
    services: "Reparaciones generales\nMontaje\nMantenimiento",
  },
  {
    value: "VETERINARY",
    label: "Veterinaria",
    name: "Ej. Clínica Veterinaria Patitas",
    description:
      "Ofrecemos atención veterinaria y servicios para el cuidado de mascotas.",
    services: "Consulta veterinaria\nVacunación\nRevisión general",
  },
  {
    value: "DENTAL_CLINIC",
    label: "Clínica dental",
    name: "Ej. Clínica Dental Sonrisa",
    description:
      "Ofrecemos servicios de revisión y cuidado de la salud dental.",
    services: "Revisión dental\nLimpieza dental\nConsultas",
  },
] as const;

type BusinessType = (typeof BUSINESS_TYPES)[number]["value"];

const DAYS = [
  ["lunes", "Lunes"],
  ["martes", "Martes"],
  ["miercoles", "Miércoles"],
  ["jueves", "Jueves"],
  ["viernes", "Viernes"],
  ["sabado", "Sábado"],
  ["domingo", "Domingo"],
] as const;

type DayKey = (typeof DAYS)[number][0];

type DayHours = {
  open: string;
  close: string;
  closed: boolean;
};

type WeeklyHours = Record<DayKey, DayHours>;

export default function Onboarding() {
  const router = useRouter();

  const [businessType, setBusinessType] =
    useState<BusinessType>("BARBERSHOP");

  const [businessName, setBusinessName] = useState("");
  const [description, setDescription] = useState("");
  const [services, setServices] = useState("");

  const [hours, setHours] = useState<WeeklyHours>({
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

  const selectedType =
    BUSINESS_TYPES.find((type) => type.value === businessType) ??
    BUSINESS_TYPES[0];

  function handleBusinessTypeChange(value: BusinessType) {
    setBusinessType(value);
    setError("");
  }

  function updateDay(
    day: DayKey,
    field: keyof DayHours,
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
    return DAYS.map(([key, label]) => {
      const day = hours[key];

      if (day.closed) {
        return `${label}: Cerrado`;
      }

      return `${label}: ${day.open} - ${day.close}`;
    }).join("\n");
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
      setError("Agrega al menos un servicio o producto.");
      return;
    }

    setSaving(true);

    const business = {
      businessType,
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
          businessType: business.businessType,
          name: business.businessName,
          description: business.description,
          services: business.services,
          hours: business.hours,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "No se pudo guardar el negocio.");
      }

      localStorage.setItem("barberai_business", JSON.stringify(business));

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

  return (
    <main className="min-h-screen bg-black px-6 py-12 text-white">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8">
          <p className="text-sm text-gray-500">PASO 1 DE 3</p>

          <h1 className="mt-2 text-4xl font-bold">
            Cuéntanos sobre tu negocio
          </h1>

          <p className="mt-3 text-gray-400">
            Configura tu negocio para que tu empleado de IA pueda conocerlo.
          </p>
        </div>

        <div className="space-y-6">
          <div>
            <label
              htmlFor="businessType"
              className="mb-2 block text-sm font-medium"
            >
              ¿Qué tipo de negocio tienes?
            </label>

            <select
              id="businessType"
              value={businessType}
              onChange={(event) =>
                handleBusinessTypeChange(event.target.value as BusinessType)
              }
              className="w-full rounded-xl border border-white/10 bg-neutral-950 px-4 py-4 text-white outline-none transition focus:border-white/30"
            >
              {BUSINESS_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>

            <p className="mt-2 text-sm text-gray-500">
              Puedes añadir más categorías en futuras versiones.
            </p>
          </div>

          <div>
            <label
              htmlFor="businessName"
              className="mb-2 block text-sm font-medium"
            >
              Nombre del negocio
            </label>

            <input
              id="businessName"
              type="text"
              placeholder={selectedType.name}
              value={businessName}
              onChange={(event) => setBusinessName(event.target.value)}
              maxLength={100}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-4 outline-none placeholder:text-gray-600 focus:border-white/30"
            />
          </div>

          <div>
            <label
              htmlFor="description"
              className="mb-2 block text-sm font-medium"
            >
              ¿Qué hace tu negocio?
            </label>

            <textarea
              id="description"
              placeholder={selectedType.description}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={2000}
              rows={4}
              className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-4 outline-none placeholder:text-gray-600 focus:border-white/30"
            />
          </div>

          <div>
            <label
              htmlFor="services"
              className="mb-2 block text-sm font-medium"
            >
              Servicios, productos y precios
            </label>

            <textarea
              id="services"
              placeholder={selectedType.services}
              value={services}
              onChange={(event) => setServices(event.target.value)}
              maxLength={5000}
              rows={5}
              className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-4 outline-none placeholder:text-gray-600 focus:border-white/30"
            />
          </div>

          <div>
            <h2 className="mb-2 text-lg font-semibold">
              Horario del negocio
            </h2>

            <p className="mb-4 text-sm text-gray-400">
              Configura los días y horarios en los que atiendes a tus clientes.
            </p>

            <div className="space-y-3">
              {DAYS.map(([key, label]) => {
                const day = hours[key];

                return (
                  <div
                    key={key}
                    className="rounded-xl border border-white/10 bg-white/5 p-4"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="w-28 font-medium">{label}</div>

                      {day.closed ? (
                        <div className="flex flex-1 items-center justify-between gap-3">
                          <span className="text-gray-500">Cerrado</span>

                          <button
                            type="button"
                            onClick={() => updateDay(key, "closed", false)}
                            className="rounded-lg border border-white/10 px-3 py-2 text-sm transition hover:bg-white/10"
                          >
                            Abrir
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
                          <input
                            aria-label={`${label}: hora de apertura`}
                            type="time"
                            value={day.open}
                            onChange={(event) =>
                              updateDay(key, "open", event.target.value)
                            }
                            className="rounded-lg border border-white/10 bg-black px-3 py-2 text-white outline-none"
                          />

                          <span className="text-gray-500">hasta</span>

                          <input
                            aria-label={`${label}: hora de cierre`}
                            type="time"
                            value={day.close}
                            onChange={(event) =>
                              updateDay(key, "close", event.target.value)
                            }
                            className="rounded-lg border border-white/10 bg-black px-3 py-2 text-white outline-none"
                          />

                          <button
                            type="button"
                            onClick={() => updateDay(key, "closed", true)}
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
            <div
              role="alert"
              className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400"
            >
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