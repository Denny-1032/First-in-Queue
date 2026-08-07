=== First in Queue Chat ===
Contributors: firstinqueue
Tags: live chat, chatbot, ai chat, customer support, whatsapp
Requires at least: 5.8
Tested up to: 6.6
Requires PHP: 7.2
Stable tag: 1.0.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Add your First in Queue AI chat widget to WordPress. Paste your property key and the chat bubble appears on every page automatically.

== Description ==

First in Queue is an AI customer-care assistant that answers your customers instantly on your website. This plugin adds the chat widget to your WordPress site — no code, no theme editing.

You will need a First in Queue account and a property key (it starts with `fiq_live_`). Create one for free at [firstinqueue.com](https://firstinqueue.com).

**How it works**

1. Sign up at firstinqueue.com and set up your assistant (about five minutes).
2. Copy your property key from Dashboard → Websites.
3. Install this plugin, paste the key in Settings → First in Queue Chat, and save.

That's it. The widget loads on every page. All the assistant's behaviour, branding, and knowledge are managed in your First in Queue dashboard — this plugin only injects the loader.

**Privacy**

This plugin stores only your property key and the widget host on your own site. The chat widget script is loaded from First in Queue; see the [privacy policy](https://firstinqueue.com/privacy) for how conversations are handled.

== Installation ==

1. Upload the plugin to `/wp-content/plugins/first-in-queue/`, or install it from the WordPress plugin directory.
2. Activate it through the "Plugins" menu.
3. Go to Settings → First in Queue Chat and paste your property key.
4. Save. The chat widget now appears on your site.

== Frequently Asked Questions ==

= Where do I find my property key? =

In your First in Queue dashboard, open Websites and copy the key that starts with `fiq_live_`.

= The widget isn't showing =

Make sure your key is saved (it must start with `fiq_live_`) and that your theme calls `wp_footer()` — almost all themes do. Also confirm the site's domain is on your property's allowed-domains list in the dashboard.

= Does this slow down my site? =

No. The loader is a single small async script; it does not block page rendering.

== Changelog ==

= 1.0.0 =
* Initial release: property-key setting and automatic widget injection in the footer.
