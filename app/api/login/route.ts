import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createSession } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");

    if (!email || !password) {
      return NextResponse.json(
        {
          error: "Email y contraseña son obligatorios.",
        },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: {
        email,
      },
      include: {
        business: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          error: "Email o contraseña incorrectos.",
        },
        { status: 401 }
      );
    }

    const passwordCorrect = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordCorrect) {
      return NextResponse.json(
        {
          error: "Email o contraseña incorrectos.",
        },
        { status: 401 }
      );
    }

    await createSession(user.id);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      business: user.business,
    });
  } catch (error) {
    console.error("Error iniciando sesión:", error);

    return NextResponse.json(
      {
        error: "No se pudo iniciar sesión.",
      },
      { status: 500 }
    );
  }
}