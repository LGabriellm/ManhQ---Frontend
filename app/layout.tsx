import type { Metadata, Viewport } from "next";
import { Manrope, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/contexts/QueryProvider";
import { AuthProvider } from "@/contexts/AuthContext";
import { LayoutWrapper } from "@/components/LayoutWrapper";
import { Toaster } from "react-hot-toast";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0f0f0f",
};

export const metadata: Metadata = {
  title: "ManHQ - Leitor de Mangás e HQ Comics",
  description:
    "Leia seus mangás e HQ comics favoritos online. Mobile-first, rápido e gratuito.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ManHQ",
  },
  other: {
    "facebook-domain-verification": "5kgekx1ihoq2osx68idi5eunp0hzj8",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body
        className={`${manrope.variable} ${spaceGrotesk.variable} bg-background font-sans text-textMain antialiased`}
      >
        <QueryProvider>
          <AuthProvider>
            <LayoutWrapper>{children}</LayoutWrapper>
            <Toaster
              position="bottom-center"
              toastOptions={{
                duration: 3000,
                style: {
                  background: "#1f1f1f",
                  color: "#fff",
                  borderRadius: "12px",
                  padding: "12px 16px",
                },
              }}
            />
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
