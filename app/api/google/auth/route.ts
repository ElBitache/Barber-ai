import { google } from "googleapis";

export async function GET() {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return Response.json(
        {
          error:
            "Faltan GOOGLE_CLIENT_ID o GOOGLE_CLIENT_SECRET en las variables de entorno.",
        },
        { status: 500 }
      );
    }

    const redirectUri =
      "http://localhost:3000/api/google/callback";

    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: [
        "https://www.googleapis.com/auth/calendar",
      ],
    });

    return Response.redirect(authUrl);
  } catch (error) {
    console.error("Error iniciando Google OAuth:", error);

    return Response.json(
      {
        error: "No se pudo iniciar la conexión con Google Calendar.",
      },
      { status: 500 }
    );
  }
}