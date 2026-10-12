import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteName = "BizStaffIA";

const siteDescription =
  "BizStaffIA ayuda a los negocios a gestionar la atención al cliente, responder consultas, organizar citas y administrar la información de su negocio desde una sola plataforma.";

export const metadata: Metadata = {
  applicationName: siteName,

  title: {
    default: "BizStaffIA | Inteligencia artificial para tu negocio",
    template: "%s | BizStaffIA",
  },

  description: siteDescription,

  keywords: [
    "BizStaffIA",
    "inteligencia artificial para negocios",
    "automatización de negocios",
    "atención al cliente con IA",
    "asistente virtual para empresas",
    "gestión de citas",
    "gestión de clientes",
    "software para barberías",
    "software para restaurantes",
    "automatización para profesionales",
    "SaaS para empresas",
  ],

  category: "technology",

  metadataBase: new URL("https://barber-ai-one.vercel.app"),

  alternates: {
    canonical: "/",
  },

  openGraph: {
    type: "website",
    locale: "es_ES",
    siteName,
    title: "BizStaffIA | Tu negocio, más inteligente",
    description: siteDescription,
    url: "/",
  },

  twitter: {
    card: "summary_large_image",
    title: "BizStaffIA | Inteligencia artificial para tu negocio",
    description: siteDescription,
  },

  robots: {
    index: true,
    follow: true,
  },

  appleWebApp: {
    capable: true,
    title: siteName,
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}