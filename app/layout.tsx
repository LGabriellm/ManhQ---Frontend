import type { Metadata, Viewport } from "next";
import { Manrope, Space_Grotesk } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { QueryProvider } from "@/contexts/QueryProvider";
import { AuthProvider } from "@/contexts/AuthContext";
import { LayoutWrapper } from "@/components/LayoutWrapper";
import { Toaster } from "react-hot-toast";

const GTM_ID = "GTM-TZ335BQZ";

const GTM_SCRIPT = `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_ID}');`;

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
      <head>
        <Script id="google-tag-manager" strategy="beforeInteractive">
          {GTM_SCRIPT}
        </Script>
      </head>
      <body
        className={`${manrope.variable} ${spaceGrotesk.variable} bg-background font-sans text-textMain antialiased`}
      >
        <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
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
