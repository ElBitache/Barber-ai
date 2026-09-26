import { destroySession } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    await destroySession();

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("Error cerrando sesión:", error);

    return NextResponse.json(
      {
        error: "No se pudo cerrar la sesión.",
      },
      { status: 500 }
    );
  }
}