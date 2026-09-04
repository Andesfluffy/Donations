"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Menu, X } from "lucide-react";

import { ButtonLink } from "@/components/ui/button";
import { NAV_LINKS } from "@/components/site-header";

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("keydown", onKeyDown);
    // Stop the page behind the overlay from scrolling.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  // This overlay MUST be portalled out of <header>. The header carries
  // `backdrop-blur-md`, and an element with a backdrop-filter becomes the
  // containing block for its fixed-position descendants — so rendering the
  // overlay in place made `fixed inset-0` resolve to the 64px header strip
  // rather than the viewport: the panel painted no background below that
  // strip, `mt-auto` had no height to push against, and the scrim never
  // covered the page. Portalling to <body> restores the viewport as the
  // containing block, and escapes the header's z-40 stacking context too.
  const overlay = (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button
        type="button"
        aria-label="Close menu"
        onClick={() => setOpen(false)}
        className="absolute inset-0 h-full w-full cursor-default bg-scrim backdrop-blur-sm"
      />

      <div
        id="mobile-nav-panel"
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Site menu"
        className="absolute inset-y-0 right-0 flex w-full max-w-sm flex-col overflow-y-auto border-l border-line bg-bg shadow-lg outline-none"
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-line px-5">
          <span className="font-serif text-lg font-semibold">Menu</span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="inline-flex h-10 w-10 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <nav aria-label="Mobile" className="flex flex-col gap-1 p-4">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="rounded-md px-3 py-3 text-lg text-ink transition-colors hover:bg-surface-sunken"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="mt-auto shrink-0 border-t border-line p-4">
          <ButtonLink href="/give" size="lg" block onClick={() => setOpen(false)}>
            Give now
          </ButtonLink>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        aria-expanded={open}
        aria-controls="mobile-nav-panel"
        className="inline-flex h-10 w-10 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink lg:hidden"
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </button>

      {/* No mounted-state guard is needed: `open` starts false and can only be
          set by a click, so document.body is guaranteed to exist by the time
          this renders. */}
      {open ? createPortal(overlay, document.body) : null}
    </>
  );
}
