import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { renderTextWithLinks } from "./render-links";

const html = (text: string) => renderToStaticMarkup(renderTextWithLinks(text));

describe("renderTextWithLinks", () => {
  it("renders a markdown link with the label as the anchor text", () => {
    const out = html(
      "You can find these forms at [PACRA's website](https://www.pacra.org.zm/fees-and-forms). Once you have them..."
    );
    expect(out).toContain('href="https://www.pacra.org.zm/fees-and-forms"');
    expect(out).toContain(">PACRA&#x27;s website</a>");
    // The bug: the closing paren and full stop used to end up inside the href.
    expect(out).not.toContain("fees-and-forms)");
    expect(out).toContain(". Once you have them...");
  });

  it("links a bare url without swallowing the sentence's full stop", () => {
    const out = html("See https://example.com/page.");
    expect(out).toContain('href="https://example.com/page"');
    expect(out).not.toContain('href="https://example.com/page."');
  });

  it("keeps parentheses that belong to the url", () => {
    const out = html("https://en.wikipedia.org/wiki/Zambia_(country)");
    expect(out).toContain('href="https://en.wikipedia.org/wiki/Zambia_(country)"');
  });

  it("handles several links in one message", () => {
    const out = html("[a](https://a.com) and [b](https://b.com) plus https://c.com!");
    expect(out).toContain('href="https://a.com"');
    expect(out).toContain('href="https://b.com"');
    expect(out).toContain('href="https://c.com"');
    expect(out).toContain("!");
  });

  it("leaves plain text untouched", () => {
    expect(html("no links here")).toContain("no links here");
    expect(html("no links here")).not.toContain("<a ");
  });

  it("opens links in a new tab with a hardened rel", () => {
    const out = html("https://a.com");
    expect(out).toContain('target="_blank"');
    expect(out).toContain('rel="noopener noreferrer"');
  });
});
