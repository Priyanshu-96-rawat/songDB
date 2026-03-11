"use client";

import { useEffect } from "react";
import { useLibraryStore } from "@/store/library";

export function LibraryStoreHydrator() {
    const hydrateFromStorage = useLibraryStore((state) => state.hydrateFromStorage);

    useEffect(() => {
        hydrateFromStorage();
    }, [hydrateFromStorage]);

    return null;
}
