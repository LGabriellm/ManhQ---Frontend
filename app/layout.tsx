import type { Metadata, Viewport } from "next";
import { Manrope, Space_Grotesk } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { QueryProvider } from "@/contexts/QueryProvider";
import { AuthProvider } from "@/contexts/AuthContext";
import { LayoutWrapper } from "@/components/LayoutWrapper";
import { Toaster } from "react-hot-toast";

const GOOGLE_TAG_ID = "G-Q9GSKB1KXP";
const FACEBOOK_PIXEL_ID = "916347841169736";
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
const metadataBase = (() => {
  if (!siteUrl) return undefined;

  try {
    return new URL(siteUrl);
  } catch {
    return undefined;
  }
})();
const GOOGLE_TAG_INIT_SCRIPT = `
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '${GOOGLE_TAG_ID}');
`;
const FACEBOOK_PIXEL_INIT_SCRIPT = `
  !function(f,b,e,v,n,t,s)
  {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};
  if(!f._fbq)f._fbq=n;
  n.push=n;
  n.loaded=!0;
  n.version='2.0';
  n.queue=[];
  t=b.createElement(e);
  t.async=!0;
  t.src=v;
  s=b.getElementsByTagName(e)[0];
  s.parentNode.insertBefore(t,s)}
  (window, document,'script','https://connect.facebook.net/en_US/fbevents.js');
  fbq('init', '${FACEBOOK_PIXEL_ID}');
  fbq('track', 'PageView');
`;

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
  themeColor: "#0f0f0f",
};

export const metadata: Metadata = {
  metadataBase,
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
        <Script
          id="google-tag-loader"
          src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_TAG_ID}`}
          strategy="afterInteractive"
        />
        <Script id="google-tag-init" strategy="afterInteractive">
          {GOOGLE_TAG_INIT_SCRIPT}
        </Script>
        <Script id="facebook-pixel-init" strategy="afterInteractive">
          {FACEBOOK_PIXEL_INIT_SCRIPT}
        </Script>
      </head>
      <body
        className={`${manrope.variable} ${spaceGrotesk.variable} bg-background font-sans text-textMain antialiased`}
      >
        <a href="#main-content" className="skip-link">
          Pular para o conteúdo principal
        </a>
        <noscript>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            height={1}
            width={1}
            alt=""
            style={{ display: "none" }}
            src={`https://www.facebook.com/tr?id=${FACEBOOK_PIXEL_ID}&ev=PageView&noscript=1`}
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
