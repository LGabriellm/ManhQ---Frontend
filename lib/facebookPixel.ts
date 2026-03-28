declare global {
  interface Window {
    fbq?: (
      action: "init" | "track" | "trackCustom",
      eventName: string,
      parameters?: Record<string, unknown>,
    ) => void;
    _fbq?: Window["fbq"];
  }
}

export function trackFacebookPixel(
  eventName: string,
  parameters?: Record<string, unknown>,
): boolean {
  if (typeof window === "undefined" || typeof window.fbq !== "function") {
    return false;
  }

  window.fbq("track", eventName, parameters);
  return true;
}
