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
  "Descubre BizStaffIA, la plataforma de inteligencia artificial para negocios. Organiza citas, gestiona clientes y mejora la atención al cliente desde un solo lugar.";

const siteUrl = "https://barber-ai-one.vercel.app";

export const metadata: Metadata = {
  applicationName: siteName,

  title: {
    default: "BizStaffIA | Empleados de IA para negocios",
    template: "%s | BizStaffIA",
  },

  description: siteDescription,

  keywords: [
    "BizStaffIA",
    "inteligencia artificial para negocios",
    "empleados virtuales con IA",
    "asistente virtual para empresas",
    "atención al cliente con inteligencia artificial",
    "gestión de citas para negocios",
    "gestión de clientes",
    "automatización empresarial",
    "software para barberías",
    "software para restaurantes",
    "IA para empresas de servicios",
    "software empresarial",
  ],

  category: "technology",

  metadataBase: new URL(siteUrl),

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
    images: [
      {
        url: "/bizstaffia-logo.png",
        alt: "BizStaffIA, inteligencia artificial para negocios",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "BizStaffIA | Empleados de IA para negocios",
    description: siteDescription,
    images: ["/bizstaffia-logo.png"],
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
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