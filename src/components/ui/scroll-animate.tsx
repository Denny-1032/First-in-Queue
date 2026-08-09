"use client";

import { useEffect, useRef, type ReactNode } from "react";

interface ScrollAnimateProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  animation?: "fade-up" | "fade-left" | "fade-right" | "fade-in" | "scale-in";
}

export function ScrollAnimate({
  children,
  className = "",
  delay = 0,
  animation = "fade-up",
}: ScrollAnimateProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // The CSS already forces these elements visible under reduced motion, but
    // skipping the observer means no stray timer fires either.
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      el.classList.add("scroll-animate-visible");
      return;
    }

    // IntersectionObserver only fires on a change, so an element already in
    // view at mount reports as intersecting on the first callback - that is
    // what reveals content above the fold on a deep link or a refresh
    // part-way down the page.
    let timer: ReturnType<typeof setTimeout>;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          timer = setTimeout(() => {
            el.classList.add("scroll-animate-visible");
          }, delay);
          observer.unobserve(el);
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );

    observer.observe(el);
    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [delay]);

  return (
    <div ref={ref} className={`scroll-animate scroll-animate-${animation} ${className}`}>
      {children}
    </div>
  );
}
