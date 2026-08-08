"use client";

import { useEffect } from "react";

export default function PWARegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const register = () => {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
        // PWA support is progressive; the web app remains usable if registration fails.
      });
    };
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
    const flush = () => navigator.serviceWorker.controller?.postMessage({ type: "tripclaim-flush-uploads" });
    const receive = (event: MessageEvent) => {
      if (event.data?.type === "tripclaim-upload-saved") window.dispatchEvent(new CustomEvent("tripclaim:upload-saved"));
      if (event.data?.type === "tripclaim-upload-synced") window.dispatchEvent(new CustomEvent("tripclaim:data-changed"));
    };
    window.addEventListener("online", flush);
    navigator.serviceWorker.addEventListener("message", receive);
    return () => {window.removeEventListener("load", register);window.removeEventListener("online", flush);navigator.serviceWorker.removeEventListener("message", receive)};
  }, []);

  return null;
}
