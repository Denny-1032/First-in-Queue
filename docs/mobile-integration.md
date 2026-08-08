# Mobile app integration (Android & iOS)

The chat widget is a web document, so a mobile app embeds it by loading one URL
in a WebView. There is no SDK to install and no API keys to ship in the binary —
the widget key is the same public `fiq_live_…` key used on the website.

```
https://app.firstinqueue.com/widget/chat?key=fiq_live_xxx&embed=native
```

| Parameter | Purpose |
|---|---|
| `key` | The property's widget key (public — it is in every website's HTML). |
| `embed=native` | Hides the ✕ close button (there is no parent frame to close) and pads the composer past the home indicator. Use this in a WebView; leave it off for a browser tab. |
| `mobile=1` | Optional. Hints the mobile layout, same as the web loader passes. |

## Why no allowed-domains entry is needed

WebView requests to `/api/widget/*` are **first-party** — the document and the
API share our origin. `isFirstPartyWidgetRequest()` in
`src/lib/properties/guard.ts` recognises them three ways: `Origin` on our host
(same-origin POST), `Sec-Fetch-Site: same-origin` (modern WebViews), and a
`Referer` on our host (WKWebView before iOS 16.4, which sends neither of the
first two). Nothing is added to `allowed_domains` — that list still governs
which *websites* may embed the widget.

## Android

```kotlin
val webView = findViewById<WebView>(R.id.chatWebView)

webView.settings.apply {
    javaScriptEnabled = true
    domStorageEnabled = true          // required: the visitor id lives in localStorage
    mediaPlaybackRequiresUserGesture = false   // voice calls only
}

// Voice calls only — hand the page the mic the user already granted the app.
webView.webChromeClient = object : WebChromeClient() {
    override fun onPermissionRequest(request: PermissionRequest) {
        if (request.resources.contains(PermissionRequest.RESOURCE_AUDIO_CAPTURE)) {
            request.grant(request.resources)
        } else {
            request.deny()
        }
    }
}

webView.loadUrl("https://app.firstinqueue.com/widget/chat?key=fiq_live_xxx&embed=native")
```

`AndroidManifest.xml` (voice only):

```xml
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
```

Request `RECORD_AUDIO` at runtime **before** the user presses call — `grant()`
above cannot create a permission the app itself does not hold.

Do not use Chrome Custom Tabs if you want conversation continuity: the visitor
id lives in the WebView's localStorage, and a Custom Tab has its own store.

## iOS

```swift
let config = WKWebViewConfiguration()
config.allowsInlineMediaPlayback = true
config.mediaTypesRequiringUserActionForPlayback = []
// Default (non-ephemeral) data store — an ephemeral one starts a new
// conversation on every launch.
config.websiteDataStore = .default()

let webView = WKWebView(frame: view.bounds, configuration: config)
let url = URL(string: "https://app.firstinqueue.com/widget/chat?key=fiq_live_xxx&embed=native")!
webView.load(URLRequest(url: url))
```

`Info.plist` (voice only):

```xml
<key>NSMicrophoneUsageDescription</key>
<string>Used when you talk to our assistant.</string>
```

Voice needs iOS 14.3+ (`getUserMedia` in WKWebView). On iOS 15 and later,
implement `webView(_:requestMediaCapturePermissionFor:initiatedByFrame:type:decisionHandler:)`
and answer `.grant` for `.microphone`.

`SFSafariViewController` also works and needs no permission plumbing, but it
looks like a browser, not part of the app, and keeps its own storage.

## What the WebView does not get

| | Status |
|---|---|
| Chat, history, quick replies, branding | Works |
| Voice call (if the property has it on) | Works, with the mic permissions above |
| Conversation resumed across launches | Works — keep a persistent data store |
| Push notification for a reply while the app is closed | **Not available.** Replies are polled while the view is open. |
| Native dismiss / back handling | The app's own chrome — that is what `embed=native` assumes |
| File upload from the visitor | Not implemented in the widget yet |

If push notifications matter, the REST surface the widget itself uses
(`POST /api/widget/session`, `POST /api/widget/message`, `GET /api/widget/history`,
all bearer-token authorized) is what a native SDK would be built on. That is a
larger piece of work than the WebView embed and should wait for a customer who
needs it.

## Testing locally

`localhost` is allowed as a property domain, so a debug build pointed at
`http://10.0.2.2:3000/widget/chat?key=…` (Android emulator) works. Voice needs
HTTPS or `localhost`; a LAN IP over plain HTTP will not get microphone access.
