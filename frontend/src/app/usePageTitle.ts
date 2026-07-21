import { useEffect } from "react";

const BRAND = "Resumatch";

/**
 * Sets the document title per route. The previous build left the Vite template
 * title ("Vite + React + TS") on every page.
 */
export function usePageTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} · ${BRAND}` : BRAND;
  }, [title]);
}
