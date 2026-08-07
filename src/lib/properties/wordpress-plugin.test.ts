import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { generateWidgetKey, isWidgetKeyShaped } from "./keys";
import { buildEmbedSnippet } from "./input";

// =============================================
// The WordPress plugin (spec §8) duplicates two contracts in PHP that live in
// TypeScript here: the widget-key shape and the loader snippet. PHP can't be
// exercised from this test runner, but drift between the two copies is exactly
// the failure that would ship a plugin rejecting real keys or emitting a
// snippet the loader can't use. These tests pin the PHP literals to the TS
// source of truth so a change on either side breaks the build.
// =============================================

const PLUGIN = fs.readFileSync(
  path.join(process.cwd(), "wordpress-plugin", "first-in-queue", "first-in-queue.php"),
  "utf8"
);

/** Pull a single-quoted PHP literal out of `preg_match( '/.../' , ... )`. */
function phpKeyRegex(): RegExp {
  const m = PLUGIN.match(/preg_match\(\s*'\/(.+?)\/'/);
  if (!m) throw new Error("no key regex found in plugin");
  return new RegExp(m[1]);
}

describe("wordpress plugin ↔ app contracts", () => {
  it("accepts and rejects exactly the keys isWidgetKeyShaped does", () => {
    const re = phpKeyRegex();
    const cases = [
      generateWidgetKey(),
      generateWidgetKey(),
      "fiq_live_short",
      "fiq_live_" + "a".repeat(31),
      "fiq_live_" + "a".repeat(33),
      "fiq_live_" + "-".repeat(32),
      "fiq_test_" + "a".repeat(32),
      "nope_" + "a".repeat(32),
      "",
    ];
    for (const c of cases) {
      expect(re.test(c), `plugin regex disagrees on "${c}"`).toBe(isWidgetKeyShaped(c));
    }
  });

  it("emits byte-identical markup to buildEmbedSnippet", () => {
    const m = PLUGIN.match(/'(<script src="%s"[^']*)'/);
    expect(m, "no snippet printf template found in plugin").toBeTruthy();

    const host = "https://app.firstinqueue.com";
    const key = generateWidgetKey();
    const rendered = m![1].replace("%s", `${host}/widget.js`).replace("%s", key);

    expect(rendered).toBe(buildEmbedSnippet(host, key));
  });

  it("defaults the widget host to the app origin that actually serves widget.js", () => {
    const m = PLUGIN.match(/define\(\s*'FIQ_DEFAULT_HOST',\s*'([^']+)'/);
    expect(m, "FIQ_DEFAULT_HOST not found").toBeTruthy();
    const host = m![1];

    expect(host).toMatch(/^https:\/\//);
    expect(host).not.toMatch(/\/$/);
    // Must match the deployed app origin — the loader is served from the Next
    // app, not the marketing site. Bump both together if the app moves.
    expect(host).toBe("https://app.firstinqueue.com");
  });

  it("never emits the snippet without a well-formed key", () => {
    // The footer hook must bail on an unshaped key; a site with an empty or
    // typo'd setting has to render nothing rather than a broken <script>.
    const fn = PLUGIN.slice(PLUGIN.indexOf("function fiq_render_widget_snippet"));
    expect(fn).toMatch(/if\s*\(\s*!\s*fiq_is_key_shaped\([^)]*\)\s*\)\s*\{\s*return;/);
  });

  it("keeps the stored key when a malformed one is submitted", () => {
    // Regression guard: a typo on a live site must not take the widget offline.
    const fn = PLUGIN.slice(
      PLUGIN.indexOf("function fiq_sanitize_options"),
      PLUGIN.indexOf("function fiq_render_settings_page")
    );
    expect(fn).toContain("$current = fiq_get_options();");
    // The rejection branch reports the error without assigning widget_key.
    const rejectBranch = fn.slice(fn.indexOf("} else {"), fn.indexOf("fiq_bad_key"));
    expect(rejectBranch).not.toContain("$out['widget_key']");
  });

  it("ships an uninstall handler that clears the stored option", () => {
    const uninstall = fs.readFileSync(
      path.join(process.cwd(), "wordpress-plugin", "first-in-queue", "uninstall.php"),
      "utf8"
    );
    expect(uninstall).toContain("WP_UNINSTALL_PLUGIN");
    expect(uninstall).toContain("delete_option( 'fiq_options' )");
  });

  it("keeps the readme stable tag in step with the plugin header version", () => {
    const header = PLUGIN.match(/^\s*\*\s*Version:\s*(\S+)/m);
    const readme = fs
      .readFileSync(path.join(process.cwd(), "wordpress-plugin", "first-in-queue", "readme.txt"), "utf8")
      .match(/^Stable tag:\s*(\S+)/m);
    expect(header?.[1]).toBe(readme?.[1]);
  });
});
