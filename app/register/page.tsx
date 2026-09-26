"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(
          data.error || "No se pudo crear la cuenta."
        );
        return;
      }

      // Iniciar sesión automáticamente
      // después de crear la cuenta.
      const loginResponse = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const loginData = await loginResponse.json();

      if (!loginResponse.ok) {
        setError(
          loginData.error ||
            "La cuenta fue creada, pero no se pudo iniciar sesión."
        );
        return;
      }

      // Después del registro vamos a configurar
      // el negocio del usuario.
      router.push("/onboarding");
      router.refresh();
    } catch (error) {
      console.error(
        "Error creando cuenta:",
        error
      );

      setError(
        "Ocurrió un error al crear la cuenta."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto flex min-h-screen max-w-md items-center px-6 py-10">
        <div className="w-full">

          {/* HEADER */}

          <div className="mb-8 text-center">
            <div className="mb-4 inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-gray-300">
              🤖 BarberAI
            </div>

            <h1 className="text-4xl font-bold tracking-tight">
              Crear cuenta
            </h1>

            <p className="mt-3 text-gray-400">
              Crea tu cuenta y configura tu negocio.
            </p>
          </div>

          {/* FORMULARIO */}

          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-6"
          >

            {/* NOMBRE */}

            <div>
              <label
                htmlFor="name"
                className="mb-2 block text-sm font-medium text-gray-300"
              >
                Nombre
              </label>

              <input
                id="name"
                type="text"
                value={name}
                onChange={(event) =>
                  setName(event.target.value)
                }
                placeholder="Tu nombre"
                required
                className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition placeholder:text-gray-600 focus:border-white/30"
              />
            </div>

            {/* EMAIL */}

            <div className="mt-5">
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium text-gray-300"
              >
                Email
              </label>

              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                placeholder="tu@email.com"
                required
                className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition placeholder:text-gray-600 focus:border-white/30"
              />
            </div>

            {/* CONTRASEÑA */}

            <div className="mt-5">
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium text-gray-300"
              >
                Contraseña
              </label>

              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                placeholder="Mínimo 6 caracteres"
                required
                minLength={6}
                className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition placeholder:text-gray-600 focus:border-white/30"
              />
            </div>

            {/* ERROR */}

            {error && (
              <div className="mt-5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

            {/* BOTÓN */}

            <button
              type="submit"
              disabled={loading}
              className="mt-6 w-full rounded-xl bg-white px-4 py-3 font-semibold text-black transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? "Creando cuenta..."
                : "Crear cuenta"}
            </button>

            {/* LOGIN */}

            <p className="mt-6 text-center text-sm text-gray-500">
              ¿Ya tienes una cuenta?{" "}

              <button
                type="button"
                onClick={() =>
                  router.push("/login")
                }
                className="text-white underline underline-offset-4 hover:text-gray-300"
              >
                Iniciar sesión
              </button>
            </p>

          </form>
        </div>
      </div>
    </main>
  );
}