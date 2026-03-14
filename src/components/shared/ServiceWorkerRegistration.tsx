"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistration() {
    useEffect(() => {
        if ("serviceWorker" in navigator) {
            window.addEventListener("load", () => {
                if (process.env.NODE_ENV === "development") {
                    navigator.serviceWorker.getRegistrations().then((registrations) => {
                        for (let registration of registrations) {
                            registration.unregister();
                        }
                    });
                    return;
                }

                navigator.serviceWorker
                    .register("/sw.js")
                    .then((registration) => {
                        // Check for SW updates periodically
                        registration.addEventListener("updatefound", () => {
                            const newWorker = registration.installing;
                            if (!newWorker) return;

                            newWorker.addEventListener("statechange", () => {
                                if (
                                    newWorker.state === "activated" &&
                                    navigator.serviceWorker.controller
                                ) {
                                    // New service worker activated — could show an update toast
                                }
                            });
                        });
                    })
                    .catch((err) => {
                        // Silent fail
                    });
            });
        }
    }, []);

    return null;
}
