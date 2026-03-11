"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistration() {
    useEffect(() => {
        if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
            window.addEventListener("load", () => {
                navigator.serviceWorker
                    .register("/sw.js")
                    .then((reg) => {
                        console.log("[SW] Registered:", reg.scope);
                    })
                    .catch((err) => {
                        console.error("[SW] Registration failed:", err);
                    });
            });
        }
    }, []);

    return null;
}
