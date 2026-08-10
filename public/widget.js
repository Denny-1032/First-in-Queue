/**
 * First in Queue — Web Widget Loader (v2)
 *
 * Text chat:  <script src="https://app.firstinqueue.com/widget.js" data-key="fiq_live_xxx" async></script>
 *
 * One attribute. Branding, greeting, position and suggested messages are
 * fetched from /api/widget/config, so the customer can restyle from the
 * dashboard without editing their site again. data-* overrides still win.
 *
 * Legacy voice embeds using data-tenant-id + data-agent-id keep working
 * unchanged — see legacyVoiceWidget() at the bottom.
 */
(function () {
  'use strict';

  var script = document.currentScript;
  if (!script) {
    console.error('[FiQ] widget.js must be loaded via a <script> tag');
    return;
  }

  var baseUrl = script.src.replace(/\/widget\.js.*$/, '');
  var key = script.dataset.key;

  if (!key) return legacyVoiceWidget(script, baseUrl);

  // ---------------------------------------------------------------- config

  var d = script.dataset;
  var overrides = {};
  if (d.primaryColor) overrides.primary_color = d.primaryColor;
  if (d.position) overrides.position = d.position;
  if (d.title) overrides.title = d.title;
  if (d.welcomeMessage) overrides.welcome_message = d.welcomeMessage;
  if (d.showBranding === 'false') overrides.show_branding = false;

  var cfg = {
    primary_color: '#03A84E',
    text_color: '#ffffff',
    position: 'bottom-right',
    title: 'Chat with us',
    show_branding: true,
    launcher: 'bubble'
  };

  var isOpen = false;
  var unread = 0;
  var listeners = {};
  var root, wrap, panel, iframe, launcher, badge;

  var isMobile = window.matchMedia('(max-width: 480px)').matches;

  // ---------------------------------------------------------------- boot

  fetch(baseUrl + '/api/widget/config?key=' + encodeURIComponent(key), {
    credentials: 'omit'
  })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (data) {
      if (data && data.branding) merge(cfg, data.branding);
      merge(cfg, overrides);
      build();
      heartbeat();
    })
    .catch(function () {
      // Render with defaults rather than showing nothing.
      merge(cfg, overrides);
      build();
    });

  function merge(target, src) {
    for (var k in src) if (Object.prototype.hasOwnProperty.call(src, k)) target[k] = src[k];
    return target;
  }

  // ---------------------------------------------------------------- ui

  /**
   * The launcher mounts on document.body, which does not exist yet if the
   * snippet sits in <head> and the config fetch comes back from cache before
   * the parser reaches <body>. Waiting for DOMContentLoaded in that case is
   * what makes the snippet safe to paste ANYWHERE on the page, rather than
   * only just before </body>.
   */
  function build() {
    if (!document.body) {
      document.addEventListener('DOMContentLoaded', build, { once: true });
      return;
    }
    root = document.createElement('div');
    root.setAttribute('data-fiq-root', '');
    // Shadow DOM keeps the host page's CSS from leaking into the launcher
    // (and ours from leaking out).
    var shadow = root.attachShadow ? root.attachShadow({ mode: 'open' }) : root;

    var bottom = cfg.position.indexOf('bottom') === 0 || cfg.position.indexOf('bottom') > -1;
    var right = cfg.position.indexOf('right') > -1;
    var side = right ? 'right' : 'left';
    // The pill sits beside the launcher, outside the panel — so it reads as
    // ours, not the customer's. On mobile the panel is fullscreen and there is
    // nowhere to put it, so the iframe renders its own instead.
    var hostBrand = cfg.show_branding !== false && !isMobile;

    var style = document.createElement('style');
    style.textContent = [
      ':host{all:initial}',
      '*{box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}',
      '.wrap{position:fixed;z-index:2147483000;' + (bottom ? 'bottom:20px;' : 'top:20px;') + side + ':20px}',
      '.launcher{position:relative;width:60px;height:60px;border-radius:50%;border:none;cursor:pointer;',
      'background:' + cfg.primary_color + ';color:' + cfg.text_color + ';',
      'display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,.15);',
      'transition:transform .2s}',
      '.launcher:hover{transform:scale(1.05)}',
      '.launcher:focus-visible{outline:3px solid #111;outline-offset:3px}',
      '.launcher svg{width:28px;height:28px;pointer-events:none}',
      '.badge{position:absolute;top:-2px;' + side + ':-2px;min-width:20px;height:20px;border-radius:10px;',
      'background:#e24b4a;color:#fff;font-size:12px;line-height:20px;text-align:center;padding:0 6px;display:none}',
      '.panel{position:absolute;' + (bottom ? 'bottom:76px;' : 'top:76px;') + side + ':0;',
      'width:380px;height:560px;max-height:calc(100vh - 120px);border-radius:14px;overflow:hidden;',
      'box-shadow:0 12px 40px rgba(0,0,0,.18);background:#fff;display:none}',
      '.panel.open{display:block}',
      '.panel iframe{width:100%;height:100%;border:none;display:block}',
      '.brand{position:absolute;' + (bottom ? 'bottom:18px;' : 'top:18px;') + side + ':70px;',
      'display:none;align-items:center;gap:6px;white-space:nowrap;',
      'padding:5px 12px 5px 8px;border-radius:999px;background:#fff;border:1px solid #e5e7eb;',
      'box-shadow:0 2px 8px rgba(0,0,0,.12);font-size:11px;line-height:1;color:#6b7280;',
      'text-decoration:none;transition:box-shadow .15s,transform .15s}',
      '.wrap.open .brand{display:inline-flex}',
      '.brand:hover{box-shadow:0 4px 14px rgba(0,0,0,.16);transform:translateY(-1px)}',
      '.brand:focus-visible{outline:3px solid #111;outline-offset:2px}',
      '.brand strong{color:#03A84E;font-weight:700}',
      '.brand img{width:14px;height:14px;object-fit:contain;display:block}',
      '@media (max-width:480px){',
      '.panel{position:fixed;inset:0;width:100vw;height:100vh;height:100dvh;max-height:none;border-radius:0}',
      '.wrap{' + (bottom ? 'bottom:16px;' : 'top:16px;') + side + ':16px}',
      '.wrap.open .brand{display:none}',
      '}',
      '@media (prefers-reduced-motion:reduce){.launcher{transition:none}}'
    ].join('');

    wrap = document.createElement('div');
    wrap.className = 'wrap';

    launcher = document.createElement('button');
    launcher.className = 'launcher';
    launcher.type = 'button';
    launcher.setAttribute('aria-label', cfg.title || 'Chat with us');
    launcher.setAttribute('aria-expanded', 'false');
    launcher.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">' +
      '<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>';

    badge = document.createElement('span');
    badge.className = 'badge';
    badge.setAttribute('aria-live', 'polite');
    launcher.appendChild(badge);

    panel = document.createElement('div');
    panel.className = 'panel';

    iframe = document.createElement('iframe');
    iframe.title = cfg.title || 'Chat';
    // The host page must delegate the mic for widget voice calls to work; the
    // page's own Permissions-Policy can still withhold it.
    iframe.setAttribute('allow', 'microphone; autoplay');
    // Separate route from the legacy voice iframe, so existing voice embeds
    // are untouched by anything the chat UI does.
    iframe.src =
      baseUrl + '/widget/chat?key=' + encodeURIComponent(key) +
      (isMobile ? '&mobile=1' : '') + (hostBrand ? '&brandhost=1' : '');
    panel.appendChild(iframe);

    wrap.appendChild(panel);
    wrap.appendChild(launcher);

    if (hostBrand) {
      var brand = document.createElement('a');
      brand.className = 'brand';
      brand.href = 'https://firstinqueue.com?utm_source=widget&utm_medium=branding';
      brand.target = '_blank';
      brand.rel = 'noopener noreferrer';
      brand.innerHTML =
        '<img src="' + baseUrl + '/fiq-mark.png" alt="" />' +
        '<span>Powered by <strong>First in Queue</strong></span>';
      wrap.appendChild(brand);
    }

    shadow.appendChild(style);
    shadow.appendChild(wrap);
    document.body.appendChild(root);

    launcher.addEventListener('click', toggle);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isOpen) { close(); launcher.focus(); }
    });

    window.addEventListener('message', onFrameMessage);
  }

  // ---------------------------------------------------------------- bridge

  function post(type, payload) {
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage({ source: 'fiq-host', type: type, payload: payload }, baseUrl);
    }
  }

  function onFrameMessage(e) {
    // Only trust messages from our own iframe origin.
    if (e.origin !== baseUrl) return;
    var msg = e.data;
    if (!msg || msg.source !== 'fiq-widget') return;

    if (msg.type === 'unread') {
      unread = msg.payload && msg.payload.count ? msg.payload.count : 0;
      renderBadge();
    } else if (msg.type === 'close') {
      close();
    } else if (msg.type === 'ready') {
      post('host-info', { url: location.href, title: document.title });
    }

    emit(msg.type, msg.payload);
    window.dispatchEvent(new CustomEvent('fiq-widget-event', { detail: msg }));
  }

  function renderBadge() {
    if (!badge) return;
    if (unread > 0 && !isOpen) {
      badge.textContent = unread > 9 ? '9+' : String(unread);
      badge.style.display = 'block';
    } else {
      badge.style.display = 'none';
    }
  }

  function emit(type, payload) {
    (listeners[type] || []).forEach(function (fn) {
      try { fn(payload); } catch (err) { console.error('[FiQ] listener error', err); }
    });
  }

  // ---------------------------------------------------------------- actions

  function open() {
    if (!panel) return;
    panel.classList.add('open');
    if (wrap) wrap.classList.add('open');
    isOpen = true;
    unread = 0;
    renderBadge();
    launcher.setAttribute('aria-expanded', 'true');
    post('open');
    setTimeout(function () { if (iframe) iframe.focus(); }, 50);
    emit('open');
  }

  function close() {
    if (!panel) return;
    panel.classList.remove('open');
    if (wrap) wrap.classList.remove('open');
    isOpen = false;
    launcher.setAttribute('aria-expanded', 'false');
    post('close');
    emit('close');
  }

  function toggle() { isOpen ? close() : open(); }

  function heartbeat() {
    try {
      fetch(baseUrl + '/api/widget/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'omit',
        body: JSON.stringify({ key: key, page_url: location.href })
      }).catch(function () {});
    } catch (e) { /* never block the widget on telemetry */ }
  }

  // ---------------------------------------------------------------- api

  window.FiQWidget = {
    open: open,
    close: close,
    toggle: toggle,
    isOpen: function () { return isOpen; },
    identify: function (traits) { post('identify', traits || {}); },
    setLanguage: function (code) { post('set-language', { code: code }); },
    on: function (event, cb) {
      if (typeof cb !== 'function') return;
      (listeners[event] = listeners[event] || []).push(cb);
    }
  };

  // ================================================================
  // Legacy voice widget — data-tenant-id + data-agent-id.
  // Preserved so existing installs in the wild keep working.
  // ================================================================
  function legacyVoiceWidget(script, baseUrl) {
    var c = {
      tenantId: script.dataset.tenantId,
      agentId: script.dataset.agentId,
      theme: script.dataset.theme || 'default',
      primaryColor: script.dataset.primaryColor || '#3b82f6',
      backgroundColor: script.dataset.backgroundColor || '#ffffff',
      textColor: script.dataset.textColor || '#1f2937',
      title: script.dataset.title || 'Need Help?',
      subtitle: script.dataset.subtitle || 'Talk to our AI assistant',
      showBranding: script.dataset.showBranding !== 'false',
      position: script.dataset.position || 'bottom-right'
    };

    if (!c.tenantId || !c.agentId) {
      console.error('[FiQ Widget] Missing data-key (or legacy data-tenant-id + data-agent-id)');
      return;
    }

    var isMob = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    var params = new URLSearchParams({
      tenantId: c.tenantId, agentId: c.agentId, theme: c.theme,
      primaryColor: c.primaryColor, backgroundColor: c.backgroundColor,
      textColor: c.textColor, title: c.title, subtitle: c.subtitle,
      showBranding: c.showBranding, mobile: isMob ? 'true' : 'false'
    });
    var iframeUrl = baseUrl + '/widget/iframe?' + params.toString();

    var styles = document.createElement('style');
    styles.textContent =
      '.fiq-widget-container{position:fixed;z-index:9999;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}' +
      '.fiq-widget-container.bottom-right{bottom:20px;right:20px}.fiq-widget-container.bottom-left{bottom:20px;left:20px}' +
      '.fiq-widget-container.top-right{top:20px;right:20px}.fiq-widget-container.top-left{top:20px;left:20px}' +
      '.fiq-widget-button{width:60px;height:60px;border-radius:50%;background:' + c.primaryColor + ';color:#fff;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,.15);transition:transform .2s,box-shadow .2s}' +
      '.fiq-widget-button:hover{transform:scale(1.05);box-shadow:0 6px 20px rgba(0,0,0,.2)}' +
      '.fiq-widget-button svg{width:28px;height:28px}' +
      '.fiq-widget-popup{position:absolute;' + (c.position.indexOf('bottom') > -1 ? 'bottom:80px' : 'top:80px') + ';' + (c.position.indexOf('right') > -1 ? 'right:0' : 'left:0') + ';width:320px;height:500px;background:' + c.backgroundColor + ';border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,.15);overflow:hidden;display:none}' +
      '.fiq-widget-popup.active{display:block;animation:fiq-widget-fade-in .2s ease-out}' +
      '.fiq-widget-iframe{width:100%;height:100%;border:none}' +
      '.fiq-widget-close{position:absolute;top:8px;' + (c.position.indexOf('right') > -1 ? 'right:8px' : 'left:8px') + ';width:28px;height:28px;background:rgba(0,0,0,.1);border:none;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:18px;color:' + c.textColor + ';z-index:10}' +
      '.fiq-widget-close:hover{background:rgba(0,0,0,.2)}' +
      '@keyframes fiq-widget-fade-in{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}' +
      '@media (max-width:480px){.fiq-widget-popup{position:fixed;top:0!important;left:0!important;right:0!important;bottom:0!important;width:100vw!important;height:100vh!important;border-radius:0!important;z-index:10000}.fiq-widget-button{width:56px;height:56px}}';
    document.head.appendChild(styles);

    var container = document.createElement('div');
    container.className = 'fiq-widget-container ' + c.position;
    container.innerHTML =
      '<button class="fiq-widget-button" aria-label="Start voice call">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
      '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg></button>' +
      '<div class="fiq-widget-popup"><button class="fiq-widget-close" aria-label="Close">&times;</button>' +
      '<iframe class="fiq-widget-iframe" src="' + iframeUrl + '" allow="microphone" title="Voice Call Widget"></iframe></div>' +
      (c.showBranding
        ? '<a href="https://firstinqueue.com?utm_source=widget&utm_medium=branding" target="_blank" rel="noopener noreferrer" ' +
          'style="position:absolute;' + (c.position.indexOf('bottom') > -1 ? 'bottom:18px' : 'top:18px') + ';' + (c.position.indexOf('right') > -1 ? 'right:70px' : 'left:70px') + ';' +
          'display:inline-flex;align-items:center;gap:6px;white-space:nowrap;padding:5px 12px 5px 8px;border-radius:999px;' +
          'background:#fff;border:1px solid #e5e7eb;box-shadow:0 2px 8px rgba(0,0,0,.12);font-size:11px;line-height:1;color:#6b7280;text-decoration:none">' +
          '<img src="' + baseUrl + '/fiq-mark.png" alt="" style="width:14px;height:14px;object-fit:contain;display:block" />' +
          '<span>Powered by <strong style="color:#03A84E;font-weight:700">First in Queue</strong></span></a>'
        : '');
    document.body.appendChild(container);

    var button = container.querySelector('.fiq-widget-button');
    var popup = container.querySelector('.fiq-widget-popup');
    var closeBtn = container.querySelector('.fiq-widget-close');
    var frame = container.querySelector('.fiq-widget-iframe');
    var open = false;

    function openW() { popup.classList.add('active'); open = true; setTimeout(function () { frame.focus(); }, 100); }
    function closeW() { popup.classList.remove('active'); open = false; }

    button.addEventListener('click', openW);
    closeBtn.addEventListener('click', closeW);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && open) closeW(); });

    window.addEventListener('message', function (e) {
      if (e.data && e.data.type && String(e.data.type).indexOf('fiq-widget-') === 0) {
        window.dispatchEvent(new CustomEvent('fiq-widget-event', { detail: e.data }));
        if (e.data.type === 'fiq-widget-call-ended' && isMob) setTimeout(closeW, 2000);
      }
    });

    window.FiQWidget = {
      open: openW, close: closeW,
      toggle: function () { open ? closeW() : openW(); },
      isOpen: function () { return open; },
      config: c, iframeUrl: iframeUrl
    };
  }
})();
