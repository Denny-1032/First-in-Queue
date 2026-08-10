"use client";

import { useCallback, useEffect, useSyncExternalStore, type ReactNode } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { DemoBooking } from "@/components/landing/demo-booking";

// The demo form moved out of the hero to make room for the live widget, so it
// needs a way to be opened from anywhere on the page - including from a server
// component, which cannot hold the state.
//
// Hence a module-level store rather than props or context: the trigger buttons
// and the dialog are separate subtrees, and this is the whole of what they
// share. It also lets an inbound #book-demo link (ads, email) open the form,
// which was the anchor's only remaining job.
//
// The hash CANNOT be the source of truth here: next/link routes a hash change
// through the History API, which fires no hashchange event, so a link-driven
// store never heard the first click.

const HASH = "#book-demo";

let isOpen = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function setOpen(next: boolean) {
  if (isOpen === next) return;
  isOpen = next;
  emit();
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

/**
 * Opens the demo form. Safe to render from a server component.
 *
 * `onClick` runs alongside opening, for callers that also need to tidy up -
 * the mobile nav has to close its own sheet or the dialog opens behind it.
 */
export function BookDemoButton({
  className,
  children,
  onClick,
}: {
  className?: string;
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        onClick?.();
        setOpen(true);
      }}
    >
      {children}
    </button>
  );
}

export function DemoBookingDialog() {
  const open = useSyncExternalStore(
    subscribe,
    () => isOpen,
    () => false
  );

  // An inbound link still lands on #book-demo, and that should open the form.
  // Two paths, because the dialog lives in the root layout: a cold arrival from
  // an ad or email is caught by the mount read, while a same-document hash
  // change (back/forward, a bare anchor) never remounts anything and is caught
  // by the event.
  useEffect(() => {
    const openIfHashed = () => {
      if (window.location.hash === HASH) setOpen(true);
    };
    openIfHashed();
    window.addEventListener("hashchange", openIfHashed);
    return () => window.removeEventListener("hashchange", openIfHashed);
  }, []);

  const onOpenChange = useCallback((next: boolean) => {
    setOpen(next);
    // Don't leave the hash behind: a reload would reopen the form over a page
    // the visitor had already dismissed it on.
    if (!next && window.location.hash === HASH) {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl">
        {/* The form draws its own heading; this one is for screen readers, and
            Radix warns without it. */}
        <DialogTitle className="sr-only">Book a free demo</DialogTitle>
        <DemoBooking bare />
      </DialogContent>
    </Dialog>
  );
}
