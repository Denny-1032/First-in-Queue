/**
 * First in Queue - Web Call Widget SDK
 * 
 * Embeddable voice call widget for any website.
 * Usage: <script src="https://yourdomain.com/widget.js" data-tenant-id="xxx" data-agent-id="yyy"></script>
 * 
 * Mobile apps: Use WebView with the iframe URL directly.
 */
(function() {
  'use strict';

  // Get script attributes
  const script = document.currentScript;
  if (!script) {
    console.error('[FiQ Widget] Must be loaded via <script> tag');
    return;
  }

  const config = {
    tenantId: script.dataset.tenantId,
    agentId: script.dataset.agentId,
    theme: script.dataset.theme || 'default',
    primaryColor: script.dataset.primaryColor || '#3b82f6',
    backgroundColor: script.dataset.backgroundColor || '#ffffff',
    textColor: script.dataset.textColor || '#1f2937',
    title: script.dataset.title || 'Need Help?',
    subtitle: script.dataset.subtitle || 'Talk to our AI assistant',
    showBranding: script.dataset.showBranding !== 'false',
    position: script.dataset.position || 'bottom-right', // bottom-right, bottom-left, top-right, top-left
  };

  if (!config.tenantId || !config.agentId) {
    console.error('[FiQ Widget] Missing required data-tenant-id or data-agent-id');
    return;
  }

  // Detect mobile
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  // Build iframe URL
  const baseUrl = script.src.replace('/widget.js', '');
  const params = new URLSearchParams({
    tenantId: config.tenantId,
    agentId: config.agentId,
    theme: config.theme,
    primaryColor: config.primaryColor,
    backgroundColor: config.backgroundColor,
    textColor: config.textColor,
    title: config.title,
    subtitle: config.subtitle,
    showBranding: config.showBranding,
    mobile: isMobile ? 'true' : 'false',
  });
  const iframeUrl = `${baseUrl}/widget/iframe?${params.toString()}`;

  // Create styles
  const styles = document.createElement('style');
  styles.textContent = `
    .fiq-widget-container {
      position: fixed;
      z-index: 9999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    .fiq-widget-container.bottom-right { bottom: 20px; right: 20px; }
    .fiq-widget-container.bottom-left { bottom: 20px; left: 20px; }
    .fiq-widget-container.top-right { top: 20px; right: 20px; }
    .fiq-widget-container.top-left { top: 20px; left: 20px; }
    
    .fiq-widget-button {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: ${config.primaryColor};
      color: white;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .fiq-widget-button:hover {
      transform: scale(1.05);
      box-shadow: 0 6px 20px rgba(0,0,0,0.2);
    }
    .fiq-widget-button svg {
      width: 28px;
      height: 28px;
    }
    
    .fiq-widget-popup {
      position: absolute;
      ${config.position.includes('bottom') ? 'bottom: 80px' : 'top: 80px'};
      ${config.position.includes('right') ? 'right: 0' : 'left: 0'};
      width: 320px;
      height: 500px;
      background: ${config.backgroundColor};
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.15);
      overflow: hidden;
      display: none;
    }
    .fiq-widget-popup.active {
      display: block;
      animation: fiq-widget-fade-in 0.2s ease-out;
    }
    
    .fiq-widget-iframe {
      width: 100%;
      height: 100%;
      border: none;
    }
    
    .fiq-widget-close {
      position: absolute;
      top: 8px;
      ${config.position.includes('right') ? 'right: 8px' : 'left: 8px'};
      width: 28px;
      height: 28px;
      background: rgba(0,0,0,0.1);
      border: none;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      color: ${config.textColor};
      z-index: 10;
    }
    .fiq-widget-close:hover {
      background: rgba(0,0,0,0.2);
    }
    
    @keyframes fiq-widget-fade-in {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    /* Mobile optimizations */
    @media (max-width: 480px) {
      .fiq-widget-popup {
        position: fixed;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        border-radius: 0 !important;
        z-index: 10000;
      }
      .fiq-widget-button {
        width: 56px;
        height: 56px;
      }
    }
  `;
  document.head.appendChild(styles);

  // Create widget container
  const container = document.createElement('div');
  container.className = `fiq-widget-container ${config.position}`;
  container.innerHTML = `
    <button class="fiq-widget-button" aria-label="Start voice call">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
      </svg>
    </button>
    <div class="fiq-widget-popup">
      <button class="fiq-widget-close" aria-label="Close">&times;</button>
      <iframe class="fiq-widget-iframe" src="${iframeUrl}" allow="microphone" title="Voice Call Widget"></iframe>
    </div>
    ${config.showBranding ? `<div style="position: absolute; ${config.position.includes('bottom') ? 'bottom: -20px' : 'top: -20px'}; ${config.position.includes('right') ? 'right: 0' : 'left: 0'}; font-size: 10px; color: #999; text-align: ${config.position.includes('right') ? 'right' : 'left'};">Powered by First in Queue</div>` : ''}
  `;
  document.body.appendChild(container);

  // Event handlers
  const button = container.querySelector('.fiq-widget-button');
  const popup = container.querySelector('.fiq-widget-popup');
  const closeBtn = container.querySelector('.fiq-widget-close');
  const iframe = container.querySelector('.fiq-widget-iframe');

  let isOpen = false;

  function openWidget() {
    popup.classList.add('active');
    isOpen = true;
    // Focus the iframe for accessibility
    setTimeout(() => iframe.focus(), 100);
  }

  function closeWidget() {
    popup.classList.remove('active');
    isOpen = false;
  }

  button.addEventListener('click', openWidget);
  closeBtn.addEventListener('click', closeWidget);

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen) {
      closeWidget();
    }
  });

  // Listen for messages from iframe (call events)
  window.addEventListener('message', (e) => {
    if (e.data && e.data.type && e.data.type.startsWith('fiq-widget-')) {
      console.log('[FiQ Widget] Received:', e.data);
      
      // Dispatch custom event for website integration
      window.dispatchEvent(new CustomEvent('fiq-widget-event', { detail: e.data }));
      
      // Auto-close on call end (optional - can be disabled)
      if (e.data.type === 'fiq-widget-call-ended' && isMobile) {
        setTimeout(closeWidget, 2000);
      }
    }
  });

  // Expose API for programmatic control
  window.FiQWidget = {
    open: openWidget,
    close: closeWidget,
    toggle: () => isOpen ? closeWidget() : openWidget(),
    isOpen: () => isOpen,
    config: config,
    iframeUrl: iframeUrl,
  };

  console.log('[FiQ Widget] Initialized', config);
})();
