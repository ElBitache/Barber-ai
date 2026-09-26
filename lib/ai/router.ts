import { GoogleGenAI } from "@google/genai";
import Groq from "groq-sdk";

const geminiApiKey = process.env.GEMINI_API_KEY;
const groqApiKey = process.env.GROQ_API_KEY;

const gemini = geminiApiKey
  ? new GoogleGenAI({
      apiKey: geminiApiKey,
    })
  : null;

const groq = groqApiKey
  ? new Groq({
      apiKey: groqApiKey,
    })
  : null;

export type AIResponse = {
  text: string;
  provider: string;
};

const AI_TIMEOUT = 8000;

// ==================================================
// GEMINI
// ==================================================

async function askGemini(
  prompt: string
): Promise<string> {
  if (!gemini) {
    throw new Error(
      "GEMINI_API_KEY no está configurada."
    );
  }

  const response =
    await gemini.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
    });

  const text =
    response.text?.trim();

  if (!text) {
    throw new Error(
      "Gemini respondió sin texto."
    );
  }

  return text;
}

// ==================================================
// GROQ
// ==================================================

async function askGroq(
  prompt: string
): Promise<string> {
  if (!groq) {
    throw new Error(
      "GROQ_API_KEY no está configurada."
    );
  }

  const response =
    await groq.chat.completions.create({
      model: "openai/gpt-oss-20b",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      include_reasoning: false,
    });

  const text =
    response.choices[0]?.message?.content?.trim();

  if (!text) {
    throw new Error(
      "Groq respondió sin texto."
    );
  }

  return text;
}

// ==================================================
// TIMEOUT
// ==================================================

async function withTimeout<T>(
  promise: Promise<T>,
  milliseconds: number,
  provider: string
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>;

  const timeoutPromise =
    new Promise<T>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(
          new Error(
            `${provider} tardó demasiado en responder.`
          )
        );
      }, milliseconds);
    });

  try {
    return await Promise.race([
      promise,
      timeoutPromise,
    ]);
  } finally {
    clearTimeout(timeoutId!);
  }
}

// ==================================================
// AI ROUTER
// GROQ PRINCIPAL → GEMINI FALLBACK
// ==================================================

export async function askAI(
  prompt: string
): Promise<AIResponse> {
  let groqError: unknown = null;
  let geminiError: unknown = null;

  // ==================================================
  // 1. GROQ PRINCIPAL
  // ==================================================

  try {
    console.log(
      "⚡ AI Router → Intentando Groq..."
    );

    const text = await withTimeout(
      askGroq(prompt),
      AI_TIMEOUT,
      "Groq"
    );

    console.log(
      "✅ AI Router → Groq respondió correctamente."
    );

    return {
      text,
      provider: "groq",
    };
  } catch (error) {
    groqError = error;

    console.error(
      "❌ AI Router → Groq falló."
    );

    console.error(error);

    console.log(
      "🔄 AI Router → Activando fallback a Gemini..."
    );
  }

  // ==================================================
  // 2. GEMINI FALLBACK
  // ==================================================

  try {
    console.log(
      "🤖 AI Router → Intentando Gemini..."
    );

    const text = await withTimeout(
      askGemini(prompt),
      AI_TIMEOUT,
      "Gemini"
    );

    console.log(
      "✅ AI Router → Gemini respondió correctamente."
    );

    return {
      text,
      provider: "gemini",
    };
  } catch (error) {
    geminiError = error;

    console.error(
      "❌ AI Router → Gemini también falló."
    );

    console.error(error);
  }

  // ==================================================
  // 3. AMBOS FALLARON
  // ==================================================

  console.error(
    "🚨 AI Router → Todos los proveedores fallaron."
  );

  console.error(
    "Groq:",
    groqError
  );

  console.error(
    "Gemini:",
    geminiError
  );

  throw new Error(
    "Todos los proveedores de IA disponibles fallaron."
  );
}