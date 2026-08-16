import { describe, it, expect } from "vitest";
import { DEMO_DECKS, canonicalDeckPath, findDeck } from "./decks";

describe("canonicalDeckPath", () => {
  it("resolves a deck typed in any casing to its canonical path", () => {
    expect(canonicalDeckPath("ZRA")).toBe("zra");
    expect(canonicalDeckPath("Zra")).toBe("zra");
    expect(canonicalDeckPath("zra")).toBe("zra");
  });

  it("does not resolve a segment that is not a deck", () => {
    expect(canonicalDeckPath("pricing")).toBeUndefined();
    expect(canonicalDeckPath("")).toBeUndefined();
    expect(canonicalDeckPath("zra-tax")).toBeUndefined();
  });

  it("agrees with findDeck on every configured deck", () => {
    for (const deck of DEMO_DECKS) {
      expect(canonicalDeckPath(deck.path.toUpperCase())).toBe(deck.path);
      expect(findDeck(deck.path)).toBe(deck);
    }
  });

  it("keeps every deck path lowercase, so the canonical form is reachable", () => {
    // A deck added with an uppercase path would redirect to a route that
    // generateStaticParams never prerenders, turning the fix into a 404 loop.
    for (const deck of DEMO_DECKS) {
      expect(deck.path).toBe(deck.path.toLowerCase());
    }
  });
});
