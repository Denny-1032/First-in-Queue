# Web Call Widget Integration Guide

First in Queue provides an embeddable web call widget that allows customers to have voice conversations with your AI assistant directly from any website or mobile app.

## Website Integration

### Option 1: JavaScript SDK (Recommended)

Add this single line to your website's HTML:

```html
<script 
  src="https://app.firstinqueue.com/widget.js" 
  data-tenant-id="YOUR_TENANT_ID" 
  data-agent-id="YOUR_AGENT_ID"
  data-theme="default"
  data-position="bottom-right"
></script>
```

**Available Attributes:**

| Attribute | Required | Default | Description |
|-----------|----------|---------|-------------|
| `data-tenant-id` | Yes | - | Your tenant ID |
| `data-agent-id` | Yes | - | Voice agent ID to use |
| `data-theme` | No | `default` | `default`, `dark`, `minimal`, `custom` |
| `data-position` | No | `bottom-right` | `bottom-right`, `bottom-left`, `top-right`, `top-left` |
| `data-primary-color` | No | `#3b82f6` | Primary brand color (hex) |
| `data-background-color` | No | `#ffffff` | Widget background (hex) |
| `data-text-color` | No | `#1f2937` | Text color (hex) |
| `data-title` | No | `Need Help?` | Widget title |
| `data-subtitle` | No | `Talk to our AI assistant` | Widget subtitle |
| `data-show-branding` | No | `true` | Show "Powered by First in Queue" |

### Option 2: Iframe Embed

For more control or if JavaScript is restricted:

```html
<iframe 
  src="https://app.firstinqueue.com/widget/iframe?tenantId=XXX&agentId=YYY&theme=default"
  width="320" 
  height="500" 
  frameborder="0"
  style="position: fixed; bottom: 20px; right: 20px; z-index: 9999; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);"
  allow="microphone">
</iframe>
```

### Option 3: Direct Link

For email campaigns, SMS, or QR codes:

```
https://app.firstinqueue.com/widget/iframe?tenantId=XXX&agentId=YYY
```

Customers click the link and the widget opens in their browser.

## Mobile App Integration

### Android (Kotlin/Java)

**Option A: WebView (Recommended for quick integration)**

```kotlin
// In your Activity or Fragment
val webView = findViewById<WebView>(R.id.webview)
webView.settings.javaScriptEnabled = true
webView.settings.mediaPlaybackRequiresUserGesture = false

// Load the widget
val widgetUrl = "https://app.firstinqueue.com/widget/iframe?" +
    "tenantId=YOUR_TENANT_ID&" +
    "agentId=YOUR_AGENT_ID&" +
    "mobile=true"
webView.loadUrl(widgetUrl)

// Request microphone permission
ActivityCompat.requestPermissions(this, 
    arrayOf(Manifest.permission.RECORD_AUDIO), 
    REQUEST_CODE)
```

**Option B: Chrome Custom Tabs (Better UX, no permissions needed in app)**

```kotlin
val url = "https://app.firstinqueue.com/widget/iframe?tenantId=XXX&agentId=YYY&mobile=true"
val customTabsIntent = CustomTabsIntent.Builder().build()
customTabsIntent.launchUrl(this, Uri.parse(url))
```

### iOS (Swift)

**Option A: WKWebView**

```swift
import WebKit

class VoiceCallViewController: UIViewController {
    var webView: WKWebView!
    
    override func viewDidLoad() {
        super.viewDidLoad()
        
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []
        
        webView = WKWebView(frame: view.bounds, configuration: config)
        view.addSubview(webView)
        
        let urlString = "https://app.firstinqueue.com/widget/iframe?tenantId=XXX&agentId=YYY&mobile=true"
        if let url = URL(string: urlString) {
            webView.load(URLRequest(url: url))
        }
    }
}

// Add to Info.plist:
// <key>NSMicrophoneUsageDescription</key>
// <string>This app needs microphone access for voice calls with our AI assistant</string>
```

**Option B: SFSafariViewController (System browser, best UX)**

```swift
import SafariServices

let urlString = "https://app.firstinqueue.com/widget/iframe?tenantId=XXX&agentId=YYY&mobile=true"
if let url = URL(string: urlString) {
    let safariVC = SFSafariViewController(url: url)
    present(safariVC, animated: true)
}
```

### React Native

```javascript
import { WebView } from 'react-native-webview';

// Request microphone permissions first
// android/app/src/main/AndroidManifest.xml: <uses-permission android:name="android.permission.RECORD_AUDIO" />
// ios/YourApp/Info.plist: NSMicrophoneUsageDescription

<WebView
  source={{ 
    uri: 'https://app.firstinqueue.com/widget/iframe?tenantId=XXX&agentId=YYY&mobile=true' 
  }}
  allowsInlineMediaPlayback={true}
  mediaPlaybackRequiresUserAction={false}
  javaScriptEnabled={true}
/>
```

### Flutter

```dart
import 'package:webview_flutter/webview_flutter.dart';

WebView(
  initialUrl: 'https://app.firstinqueue.com/widget/iframe?tenantId=XXX&agentId=YYY&mobile=true',
  javascriptMode: JavascriptMode.unrestricted,
  // Add microphone permission in AndroidManifest.xml and Info.plist
)
```

## API: Get Embed Code Programmatically

```bash
curl "https://app.firstinqueue.com/api/widget/embed?tenantId=XXX&agentId=YYY&theme=custom&primaryColor=%23ff0000"
```

Response:
```json
{
  "success": true,
  "embedCode": "<script src=...></script>",
  "iframeCode": "<iframe src=...></iframe>",
  "iframeUrl": "https://app.firstinqueue.com/widget/iframe?tenantId=XXX&agentId=YYY",
  "config": {
    "primaryColor": "#ff0000",
    "title": "Need Help?"
  }
}
```

## JavaScript API (For Advanced Integration)

When using the JavaScript SDK, you can control the widget programmatically:

```javascript
// Open the widget
window.FiQWidget.open();

// Close the widget
window.FiQWidget.close();

// Toggle open/closed
window.FiQWidget.toggle();

// Check if open
console.log(window.FiQWidget.isOpen());

// Listen for call events
window.addEventListener('fiq-widget-event', (e) => {
  console.log('Widget event:', e.data);
  // e.data.type can be:
  // - 'fiq-widget-call-started'
  // - 'fiq-widget-call-ended'
});
```

## Mobile-Specific Considerations

### Permissions

**Android** (`AndroidManifest.xml`):
```xml
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
<uses-permission android:name="android.permission.INTERNET" />
```

**iOS** (`Info.plist`):
```xml
<key>NSMicrophoneUsageDescription</key>
<string>This app uses the microphone for voice conversations with our AI assistant</string>
```

### Best Practices

1. **Use Chrome Custom Tabs / SFSafariViewController** when possible — users already trust their browser with microphone permissions
2. **Pre-warm the connection** — Load the widget URL before the user taps to reduce connection time
3. **Handle rotation** — The widget is fully responsive, but test your WebView container handles rotation
4. **Show loading state** — WebRTC connection takes 1-3 seconds; show a loading indicator

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Microphone access denied" | Check permissions in AndroidManifest.xml / Info.plist |
| Widget not loading | Verify tenantId and agentId are correct and active |
| Call won't connect | Ensure HTTPS is used (WebRTC requires secure context) |
| Poor audio quality | Check network connection; use WiFi when possible |
| iOS no audio | Ensure `allowsInlineMediaPlayback` is set on WKWebView |

## Support

For integration support, contact: support@codarti.com
