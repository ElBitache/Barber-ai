"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type Business = {
  id: number;
  name: string;
  description: string;
  services: string;
  hours: string;
};

export default function Chat() {
  const router = useRouter();

  const [business, setBusiness] =
    useState<Business | null>(null);

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "¡Hola! 👋 Soy el empleado de IA de tu negocio. ¿En qué puedo ayudarte?",
    },
  ]);

  useEffect(() => {
    async function loadBusiness() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch("/api/me", {
          cache: "no-store",
        });

        if (!response.ok) {
          router.push("/login");
          return;
        }

        const data = await response.json();

        if (!data.authenticated) {
          router.push("/login");
          return;
        }

        if (!data.business) {
          setError(
            "Todavía no tienes un negocio configurado."
          );
          return;
        }

        setBusiness(data.business);
      } catch (error) {
        console.error(
          "Error cargando negocio:",
          error
        );

        setError(
          "No se pudo cargar la información del negocio."
        );
      } finally {
        setLoading(false);
      }
    }

    loadBusiness();
  }, [router]);

  async function sendMessage() {
    if (!message.trim() || sending) {
      return;
    }

    const userMessage = message.trim();

    const updatedMessages: Message[] = [
      ...messages,
      {
        role: "user",
        content: userMessage,
      },
    ];

    setMessage("");
    setMessages(updatedMessages);
    setSending(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage,
          business,
          conversation: updatedMessages,
        }),
      });

      let data: {
        response?: string;
        error?: string;
        confirmReservation?: boolean;
      };

      try {
        data = await response.json();
      } catch {
        throw new Error(
          `El servidor respondió con un error (${response.status}).`
        );
      }

      if (!response.ok) {
        throw new Error(
          data.error ||
            `Error del servidor (${response.status}).`
        );
      }

      if (!data.response) {
        throw new Error(
          "La IA no devolvió ninguna respuesta."
        );
      }

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: data.response as string,
        },
      ]);
    } catch (error) {
      console.error(
        "Error enviando mensaje:",
        error
      );

      const errorMessage =
        error instanceof Error
          ? error.message
          : "No se pudo completar la solicitud.";

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: `⚠️ ${errorMessage}`,
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white">
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-gray-400">
            Cargando empleado de IA...
          </p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-black text-white">
        <div className="flex min-h-screen items-center justify-center px-6">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-2xl text-black">
              🤖
            </div>

            <h1 className="mt-5 text-2xl font-bold">
              Empleado IA
            </h1>

            <p className="mt-3 text-gray-400">
              {error}
            </p>

            <button
              onClick={() =>
                router.push("/dashboard")
              }
              className="mt-6 rounded-xl bg-white px-6 py-3 font-semibold text-black transition hover:bg-gray-200"
            >
              Volver al Dashboard
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="flex min-h-screen flex-col">

        {/* HEADER */}

        <header className="border-b border-white/10 bg-black">
          <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4">

            <div className="flex items-center gap-4">

              <button
                onClick={() =>
                  router.push("/dashboard")
                }
                className="rounded-xl border border-white/10 px-3 py-2 text-sm text-gray-400 transition hover:bg-white/5 hover:text-white"
              >
                ←
              </button>

              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-xl text-black">
                🤖
              </div>

              <div>
                <h1 className="font-bold">
                  Empleado IA
                </h1>

                <p className="text-sm text-gray-500">
                  {business?.name || "Tu negocio"}
                </p>
              </div>

            </div>

            <div className="hidden items-center gap-2 sm:flex">
              <span className="h-2 w-2 rounded-full bg-green-500" />

              <span className="text-sm text-gray-500">
                En línea
              </span>
            </div>

          </div>
        </header>

        {/* CHAT */}

        <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col">

          <div className="flex-1 space-y-4 overflow-y-auto px-6 py-8">

            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex ${
                  msg.role === "user"
                    ? "justify-end"
                    : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[80%] whitespace-pre-line rounded-2xl px-5 py-4 ${
                    msg.role === "user"
                      ? "bg-white text-black"
                      : "border border-white/10 bg-white/5 text-gray-200"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {sending && (
              <div className="flex justify-start">
                <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-gray-400">
                  🤖 Escribiendo...
                </div>
              </div>
            )}

          </div>

          {/* INPUT */}

          <div className="border-t border-white/10 p-6">

            <div className="flex gap-3">

              <input
                type="text"
                value={message}
                onChange={(event) =>
                  setMessage(event.target.value)
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    void sendMessage();
                  }
                }}
                disabled={sending}
                placeholder="Escribe un mensaje..."
                className="flex-1 rounded-xl border border-white/10 bg-white/5 px-5 py-4 text-white outline-none placeholder:text-gray-600 focus:border-white/30 disabled:opacity-50"
              />

              <button
                type="button"
                onClick={() =>
                  void sendMessage()
                }
                disabled={sending}
                className="rounded-xl bg-white px-6 py-4 font-semibold text-black transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {sending ? "..." : "Enviar"}
              </button>

            </div>

            <p className="mt-3 text-center text-xs text-gray-600">
              El Empleado IA puede gestionar citas,
              clientes y consultas de tu negocio.
            </p>

          </div>

        </div>

      </div>
    </main>
  );
}