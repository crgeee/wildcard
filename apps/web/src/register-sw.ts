/**
 * Service worker registration for WildCard.
 * Only registers in production builds to avoid interfering with Vite HMR.
 */
export function registerServiceWorker(): void {
  if (!import.meta.env.PROD) return;

  if (!("serviceWorker" in navigator)) {
    console.warn("[SW] Service workers are not supported in this browser.");
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        console.log("[SW] Registered:", registration.scope);

        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (newWorker) {
            console.log("[SW] Update found, installing new version...");
            newWorker.addEventListener("statechange", () => {
              if (newWorker.state === "activated") {
                console.log("[SW] New version activated.");
              }
            });
          }
        });
      })
      .catch((error) => {
        console.error("[SW] Registration failed:", error);
      });
  });
}
