import { google } from "googleapis";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const userId = await getSessionUserId();

    if (!userId) {
      return NextResponse.json(
        { error: "No hay una sesión activa." },
        { status: 401 }
      );
    }

    const url = new URL(req.url);
    const code = url.searchParams.get("code");

    if (!code) {
      return NextResponse.json(
        {
          error:
            "No se recibió el código de autorización de Google.",
        },
        { status: 400 }
      );
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        {
          error:
            "Faltan GOOGLE_CLIENT_ID o GOOGLE_CLIENT_SECRET en las variables de entorno.",
        },
        { status: 500 }
      );
    }

    // Debe ser exactamente la misma URL usada al iniciar OAuth
    const redirectUri = new URL(
      "/api/google/callback",
      req.url
    ).toString();

    console.log(
      "🔐 Google OAuth callback redirect URI:",
      redirectUri
    );

    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );

    const { tokens } = await oauth2Client.getToken(code);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { business: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Usuario no encontrado." },
        { status: 401 }
      );
    }

    if (!user.business) {
      return NextResponse.json(
        {
          error:
            "El usuario no tiene un negocio configurado.",
        },
        { status: 400 }
      );
    }

    const updateData: {
      googleCalendarConnected: boolean;
      googleCalendarRefreshToken?: string;
    } = {
      googleCalendarConnected: true,
    };

    if (tokens.refresh_token) {
      updateData.googleCalendarRefreshToken =
        tokens.refresh_token;
    }

    if (
      !tokens.refresh_token &&
      !user.business.googleCalendarRefreshToken
    ) {
      return NextResponse.json(
        {
          error:
            "Google no devolvió un refresh token. Vuelve a intentar la conexión.",
        },
        { status: 400 }
      );
    }

    await prisma.business.update({
      where: { id: user.business.id },
      data: updateData,
    });

    console.log(
      "✅ Google Calendar conectado para Business:",
      user.business.id
    );

    return NextResponse.redirect(
      new URL(
        "/settings?googleCalendar=connected",
        req.url
      )
    );
  } catch (error) {
    console.error(
      "Error en Google OAuth callback:",
      error
    );

    return NextResponse.json(
      {
        error:
          "No se pudo completar la conexión con Google Calendar.",
      },
      { status: 500 }
    );
  }
}