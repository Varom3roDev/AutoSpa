import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/lib/auth/auth-context";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "AutoSpa | Lavado a Domicilio",
    template: "%s | AutoSpa",
  },
  description:
    "Lavado profesional de vehículos a domicilio en Caracas. Reserva en línea, elige tu servicio y recibe atención donde estés.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "AutoSpa",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0B0E11",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`dark ${geistSans.variable} ${geistMono.variable}`} style={{ colorScheme: "dark" }}>
      <body className="min-h-dvh bg-background text-foreground antialiased selection:bg-primary selection:text-primary-foreground">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
