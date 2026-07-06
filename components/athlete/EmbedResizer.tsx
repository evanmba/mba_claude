"use client";

import { useEffect } from "react";

/**
 * When the check-in page is rendered inside an iframe (e.g. embedded on a
 * GoHighLevel site), report the content height to the parent window via
 * postMessage so the host page can size the iframe with no inner scrollbar.
 * Inert when not embedded (parent === self).
 */
export function EmbedResizer() {
  useEffect(() => {
    if (window.parent === window) return; // not embedded — do nothing

    const el =
      document.querySelector<HTMLElement>("[data-embed-content]") ?? document.body;

    const post = () => {
      const height = Math.ceil(el.getBoundingClientRect().bottom + 24);
      window.parent.postMessage({ type: "mba-checkin-height", height }, "*");
    };

    post();
    const ro = new ResizeObserver(post);
    ro.observe(el);
    window.addEventListener("load", post);
    // A few nudges to catch late layout (fonts, async chart render).
    const timers = [150, 500, 1200].map((ms) => window.setTimeout(post, ms));

    return () => {
      ro.disconnect();
      window.removeEventListener("load", post);
      timers.forEach(clearTimeout);
    };
  }, []);

  return null;
}
