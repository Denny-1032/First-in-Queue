import { describe, it, expect } from "vitest";
import { renderMarkdown } from "./markdown";

describe("renderMarkdown — XSS resistance", () => {
  it("escapes raw HTML instead of rendering it", () => {
    const out = renderMarkdown('<img src=x onerror="alert(1)">');
    expect(out).not.toContain("<img");
    expect(out).toContain("&lt;img");
  });

  it("escapes script tags", () => {
    const out = renderMarkdown("<script>alert('xss')</script>");
    expect(out).not.toContain("<script");
    expect(out).toContain("&lt;script&gt;");
  });

  it("blocks javascript: links", () => {
    const out = renderMarkdown("[click](javascript:alert(1))");
    expect(out).not.toContain("javascript:");
    expect(out).not.toContain("<a ");
    expect(out).toContain("click");
  });

  it("blocks data: and vbscript: links", () => {
    expect(renderMarkdown("[x](data:text/html;base64,PHN2Zz4=)")).not.toContain("<a ");
    expect(renderMarkdown("[x](vbscript:msgbox)")).not.toContain("<a ");
  });

  it("does not let an escaped quote break out of the href attribute", () => {
    const out = renderMarkdown('[x](https://a.com"onmouseover="alert(1))');
    expect(out).not.toContain('onmouseover="alert');
  });

  it("neutralises event handlers written as plain text", () => {
    const out = renderMarkdown('" onload="alert(1)');
    expect(out).not.toContain('onload="alert(1)"');
    expect(out).toContain("&quot;");
  });
});

describe("renderMarkdown — formatting", () => {
  it("renders http(s) links with hardened rel and target", () => {
    const out = renderMarkdown("[FIQ](https://firstinqueue.com)");
    expect(out).toContain('href="https://firstinqueue.com"');
    expect(out).toContain('target="_blank"');
    expect(out).toContain('rel="noopener noreferrer nofollow"');
  });

  it("autolinks bare urls", () => {
    expect(renderMarkdown("see https://example.com now")).toContain('<a href="https://example.com"');
  });

  it("renders bold, italic and inline code", () => {
    expect(renderMarkdown("**bold**")).toContain("<strong>bold</strong>");
    expect(renderMarkdown("*it*")).toContain("<em>it</em>");
    expect(renderMarkdown("`code`")).toContain("<code>code</code>");
  });

  it("does not interpret markdown inside code spans", () => {
    expect(renderMarkdown("`**not bold**`")).toContain("<code>**not bold**</code>");
  });

  it("renders bullet lists", () => {
    const out = renderMarkdown("- one\n- two");
    expect(out).toContain("<ul>");
    expect(out).toContain("<li>one</li>");
  });

  it("wraps paragraphs and converts single newlines to breaks", () => {
    const out = renderMarkdown("line one\nline two\n\nsecond para");
    expect(out).toContain("<br />");
    expect(out.match(/<p>/g)?.length).toBe(2);
  });

  it("returns empty string for empty input", () => {
    expect(renderMarkdown("")).toBe("");
  });
});
