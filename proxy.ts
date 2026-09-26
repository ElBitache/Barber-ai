import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const secret = process.env.SESSION_SECRET;

const protectedRoutes = [
  "/dashboard",
  "/appointments",
  "/chat",
  "/clients",
  "/settings",
];

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  if (!isProtectedRoute) {
    return NextResponse.next();
  }

  if (!secret) {
    console.error("SESSION_SECRET no está configurada.");

    return NextResponse.redirect(
      new URL("/login", request.url)
    );
  }

  const token = request.cookies.get("barberai_session")?.value;

  if (!token) {
    return NextResponse.redirect(
      new URL("/login", request.url)
    );
  }

  try {
    const secretKey = new TextEncoder().encode(secret);

    await jwtVerify(token, secretKey);

    return NextResponse.next();
  } catch (error) {
    console.error("Sesión inválida:", error);

    const response = NextResponse.redirect(
      new URL("/login", request.url)
    );

    response.cookies.delete("barberai_session");

    return response;
  }
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/appointments/:path*",
    "/chat/:path*",
    "/clients/:path*",
    "/settings/:path*",
  ],
};