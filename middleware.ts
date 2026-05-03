import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// S3_UPLOAD_ORIGIN is read at request time (runtime env var, no rebuild needed).
// Set to the S3 bucket origin used for presigned PUT uploads, e.g.:
//   https://my-bucket.s3.sa-east-1.amazonaws.com
function buildCsp(): string {
  const s3Origin = process.env.S3_UPLOAD_ORIGIN?.trim() ?? "";

  const connectSrc = [
    "'self'",
    "https://www.google-analytics.com",
    "https://analytics.google.com",
    "https://www.facebook.com",
    "https://connect.facebook.net",
    s3Origin,
  ]
    .filter(Boolean)
    .join(" ");

  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://connect.facebook.net https://www.google-analytics.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: http: blob:",
    `connect-src ${connectSrc}`,
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  response.headers.set("Content-Security-Policy", buildCsp());
  return response;
}

export const config = {
  // Apply to all routes except Next.js internals and static files
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|ttf|otf)).*)",
  ],
};
