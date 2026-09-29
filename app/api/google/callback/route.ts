import { google } from "googleapis";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    // 1. Comprobar que el usuario sigue conectado
    const userId = await getSessionUserId();

    if (!userId) {
      return NextResponse.json(
        {
          error: "No hay una sesión activa.",
        },
        { status: 401 }
      );
    }

    // 2. Obtener el código enviado por Google
    const url = new URL(req.url);
    const code = url.searchParams.get("code");

    if (!code) {
      return NextResponse.json(
        {
          error: "No se recibió el código de autorización de Google.",
        },
        { status: 400 }
      );
    }

    // 3. Comprobar variables de Google
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

    const redirectUri =
      "http://localhost:3000/api/google/callback";

    // 4. Crear cliente OAuth
    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );

    // 5. Intercambiar código por tokens
    const { tokens } = await oauth2Client.getToken(code);

    // 6. Buscar el negocio del usuario
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      include: {
        business: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          error: "Usuario no encontrado.",
        },
        { status: 401 }
      );
    }

    if (!user.business) {
      return NextResponse.json(
        {
          error: "El usuario no tiene un negocio configurado.",
        },
        { status: 400 }
      );
    }

    // 7. Preparar los datos para guardar
    const updateData: any = {
      googleCalendarConnected: true,
    };

    // Solo guardamos el refresh token si Google lo devuelve
    if (tokens.refresh_token) {
      updateData.googleCalendarRefreshToken =
        tokens.refresh_token;
    }

    // 8. Guardar la conexión en el Business correcto
    await prisma.business.update({
      where: {
        id: user.business.id,
      },
      data: updateData,
    });

    console.log(
      "Google Calendar conectado para Business:",
      user.business.id
    );

    // 9. Volver al dashboard
    return NextResponse.redirect(
      new URL(
        "/dashboard?googleCalendar=connected",
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