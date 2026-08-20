import { describe, it, expect } from "vitest";
import { splitTrailingPunctuation } from "./links";

describe("splitTrailingPunctuation", () => {
  it("leaves a clean url alone", () => {
    expect(splitTrailingPunctuation("https://www.pacra.org.zm/fees-and-forms")).toEqual([
      "https://www.pacra.org.zm/fees-and-forms",
      "",
    ]);
  });

  it("strips the markdown paren and full stop that produced the 404", () => {
    expect(splitTrailingPunctuation("https://www.pacra.org.zm/fees-and-forms).")).toEqual([
      "https://www.pacra.org.zm/fees-and-forms",
      ").",
    ]);
  });

  it("keeps a closing paren the url opened itself", () => {
    expect(splitTrailingPunctuation("https://en.wikipedia.org/wiki/Zambia_(country)")).toEqual([
      "https://en.wikipedia.org/wiki/Zambia_(country)",
      "",
    ]);
  });

  it("strips commas and question marks at the end of a sentence", () => {
    expect(splitTrailingPunctuation("https://x.com/a,")).toEqual(["https://x.com/a", ","]);
    expect(splitTrailingPunctuation("https://x.com/a?")).toEqual(["https://x.com/a", "?"]);
  });

  it("keeps a query string intact", () => {
    expect(splitTrailingPunctuation("https://x.com/a?b=1&c=2")).toEqual(["https://x.com/a?b=1&c=2", ""]);
  });

  it("never trims a semicolon - it terminates html entities", () => {
    expect(splitTrailingPunctuation("https://x.com/a&#39;")).toEqual(["https://x.com/a&#39;", ""]);
  });
});
