// Simulated Mobile Client Device Interface
import { renderBrowser } from './browser.js';
import { simulatePing, connectMobileWifi, disconnectMobileWifi } from './network.js';

const svgWifi = `<svg viewBox="0 0 24 24" width="14" height="14"><path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z" fill="currentColor"/></svg>`;
const svgCell = `<svg viewBox="0 0 24 24" width="14" height="14"><path d="M2 22h3V9H2v13zm5 0h3V7H7v15zm5 0h3V4h-3v18zm5 0h3V2h-3v20z" fill="currentColor"/></svg>`;
const svgBatt = `<svg viewBox="0 0 24 24" width="14" height="14"><path d="M15.67 4H14V2h-4v2H8.33C7.6 4 7 4.6 7 5.33v15.33C7 21.4 7.6 22 8.33 22h7.33c.74 0 1.34-.6 1.34-1.33V5.33C17 4.6 16.4 4 15.67 4z" fill="currentColor"/></svg>`;

const svgGear = `<svg viewBox="0 0 24 24" width="22" height="22"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.49.49 0 00-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.48.48 0 00-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.49.49 0 00-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6A3.6 3.6 0 1115.6 12 3.6 3.6 0 0112 15.6z" fill="currentColor"/></svg>`;
const svgGlobe = `<svg viewBox="0 0 24 24" width="22" height="22"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" fill="currentColor"/></svg>`;
const svgTerm = `<svg viewBox="0 0 24 24" width="22" height="22"><path d="M20 4H4c-1.11 0-2 .89-2 2v12c0 1.1.89 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.11-.9-2-2-2zm0 14H4V8h16v10zm-2-1h-6v-2h6v2zM5.5 9.5l-1.4 1.4L6.7 13l-2.6 2.1 1.4 1.4L9.5 13 5.5 9.5z" fill="currentColor"/></svg>`;
const svgMonitor = `<svg viewBox="0 0 24 24" width="22" height="22"><path d="M21 2H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h7v2H8v2h8v-2h-2v-2h7c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H3V4h18v12z" fill="currentColor"/></svg>`;
const svgSearch = `<svg viewBox="0 0 24 24" width="22" height="22"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" fill="currentColor"/></svg>`;
const svgFolder = `<svg viewBox="0 0 24 24" width="22" height="22"><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" fill="currentColor"/></svg>`;
const svgPhone = `<svg viewBox="0 0 24 24" width="24" height="24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" fill="currentColor"/></svg>`;
const svgMsg = `<svg viewBox="0 0 24 24" width="24" height="24"><path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z" fill="currentColor"/></svg>`;

export function renderMobileDevice({
  state,
  view = 'home', // 'home', 'settings', 'browser', 'ping', 'rdp'
  routerTab = 'status',
  routerUrl = 'http://192.168.1.1',
  pingOutput = '',
  wifiModal = false,
  rdpSession = false,
  rdpError = '',
  esc,
  icon
}) {
  const mobile = state.networkEntities?.mobile || {};
  const isWifiConnected = !!(mobile.wifi?.associatedSsid && mobile.wifi?.ip);

  return `
    <div class="mobile-device-frame">
      <div class="mobile-notch">
        <div class="mobile-dynamic-island"></div>
      </div>
      <div class="mobile-screen">
        <header class="mobile-status-bar">
          <span class="mobile-time">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          <div class="mobile-indicators">
            <span class="mobile-icon ${!isWifiConnected ? 'dim' : ''}" style="${!isWifiConnected ? 'opacity: 0.35;' : ''}" title="${isWifiConnected ? 'Wi-Fi Connected' : 'Wi-Fi Off'}">${svgWifi}</span>
            <span class="mobile-icon" title="4G LTE">${svgCell}</span>
            <span class="mobile-icon" title="Battery 100%">${svgBatt}</span>
          </div>
        </header>

        <main class="mobile-content-area ${view === 'home' ? 'mobile-wallpaper' : ''}">
          ${renderMobileScreenContent(state, view, routerTab, routerUrl, pingOutput, wifiModal, rdpSession, rdpError, esc, icon)}
        </main>
      </div>
      <div class="mobile-home-indicator" data-action="mobile-home" title="Tap to return to Home Screen">
        <div class="home-pill"></div>
      </div>
    </div>
  `;
}

function renderMobileScreenContent(state, view, routerTab, routerUrl, pingOutput, wifiModal, rdpSession, rdpError, esc, icon) {
  const mobile = state.networkEntities?.mobile || {};
  const router = state.networkEntities?.router || {};
  const isConnected = !!(mobile.wifi?.associatedSsid && mobile.wifi?.ip);

  // Home Screen with Widgets & App Icons
  if (view === 'home') {
    return `
      <div class="mobile-home-view">
        <div class="mobile-clock-widget">
          <div class="widget-time" style="font-size: 48px; font-weight: 200;">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
          <div class="widget-date" style="font-size: 12px;">${new Date().toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}</div>
        </div>

        <div class="mobile-status-widget ${isConnected ? 'connected' : 'disconnected'}" data-action="mobile-open-app" data-app="settings">
          <div class="widget-net-badge ${isConnected ? 'connected' : 'disconnected'}">${isConnected ? svgWifi : '⚠️'}</div>
          <div class="widget-net-info">
            <div class="widget-net-ssid">${isConnected ? esc(mobile.wifi.associatedSsid) : 'Wi-Fi Disconnected'}</div>
            <div class="widget-net-sub">${isConnected ? ('IP: ' + esc(mobile.wifi.ip) + ' · 95% Signal') : 'Tap to scan and connect'}</div>
          </div>
          <span class="net-widget-chevron">›</span>
        </div>

        <div class="mobile-app-grid">
          <button type="button" class="mobile-app-icon" data-action="mobile-open-app" data-app="settings">
            <span class="app-icon-badge settings-badge">${svgGear}</span>
            <span class="app-icon-label">Settings</span>
          </button>

          <button type="button" class="mobile-app-icon" data-action="mobile-open-app" data-app="browser">
            <span class="app-icon-badge browser-badge">${svgGlobe}</span>
            <span class="app-icon-label">Browser</span>
          </button>

          <button type="button" class="mobile-app-icon" data-action="mobile-open-app" data-app="ping">
            <span class="app-icon-badge ping-badge">${svgTerm}</span>
            <span class="app-icon-label">Ping Tool</span>
          </button>

          <button type="button" class="mobile-app-icon" data-action="mobile-open-app" data-app="rdp">
            <span class="app-icon-badge rdp-badge">${svgMonitor}</span>
            <span class="app-icon-label">RD Client</span>
          </button>

          <button type="button" class="mobile-app-icon" data-action="mobile-quick-ping" data-host="192.168.1.1">
            <span class="app-icon-badge diag-badge">${svgSearch}</span>
            <span class="app-icon-label">Gateway</span>
          </button>

          <button type="button" class="mobile-app-icon" data-action="mobile-open-app" data-app="files">
            <span class="app-icon-badge files-badge">${svgFolder}</span>
            <span class="app-icon-label">Files</span>
          </button>
        </div>

        <div class="mobile-dock">
          <button type="button" class="dock-app" data-action="mobile-open-app" data-app="phone">${svgPhone}</button>
          <button type="button" class="dock-app" data-action="mobile-open-app" data-app="messages">${svgMsg}</button>
          <button type="button" class="dock-app" data-action="mobile-open-app" data-app="browser">${svgGlobe}</button>
          <button type="button" class="dock-app" data-action="mobile-open-app" data-app="settings">${svgGear}</button>
        </div>
      </div>
    `;
  }

  // Common Header for opened apps
  const appTitles = {
    settings: 'Wi-Fi & Networks',
    browser: 'Web Browser',
    ping: 'Ping Diagnostics',
    rdp: 'Remote Desktop',
    files: 'Local Storage',
    phone: 'Phone',
    messages: 'Messages'
  };

  const currentTitle = appTitles[view] || 'Application';

  return `
    <div class="mobile-app-view">
      <div class="mobile-app-header">
        <button type="button" class="mobile-back-btn" data-action="mobile-home">←</button>
        <span class="mobile-app-title">${currentTitle}</span>
        <span style="width:28px; text-align:center;">⋮</span>
      </div>

      <div class="mobile-app-body">
        ${view === 'settings' ? renderSettingsApp(state, mobile, router, isConnected, wifiModal, esc) : ''}
        ${view === 'browser' ? renderBrowserApp(state, routerTab, routerUrl, esc, icon) : ''}
        ${view === 'ping' ? renderPingApp(pingOutput, esc) : ''}
        ${view === 'rdp' ? renderRdpApp(state, rdpSession, rdpError, esc) : ''}
        ${view === 'files' ? renderFilesApp() : ''}
        ${view === 'phone' || view === 'messages' ? '<div class="mobile-empty"><p>No messages or calls in this training scenario.</p></div>' : ''}
      </div>
    </div>
  `;
}

function renderSettingsApp(state, mobile, router, isConnected, wifiModal, esc) {
  return `
    <div class="mobile-wifi-view">
      <div class="mobile-section-header">
        <div>
          <h3>Wi-Fi</h3>
          <p class="section-sub">${mobile.wifi?.enabled ? 'Scanning for available networks' : 'Turn on to connect to wireless networks'}</p>
        </div>
        <label class="mobile-switch">
          <input type="checkbox" data-action="mobile-toggle-wifi" ${mobile.wifi?.enabled ? 'checked' : ''}>
          <span class="slider"></span>
        </label>
      </div>

      ${!mobile.wifi?.enabled ? `
        <div class="mobile-empty">
          <div class="empty-icon">📵</div>
          <p>Wi-Fi is turned off.</p>
        </div>
      ` : `
        ${isConnected ? `
          <div class="mobile-connected-card">
            <div class="connected-row">
              <span class="wifi-badge">✓</span>
              <div>
                <h4>${esc(mobile.wifi.associatedSsid)}</h4>
                <p class="green-text">Connected · Signal Excellent (95%)</p>
              </div>
              <button type="button" class="mobile-btn-danger" data-action="mobile-wifi-disconnect">Disconnect</button>
            </div>
            <div class="mobile-lease-info">
              <div><span>IP Address:</span> <b>${esc(mobile.wifi.ip)}</b></div>
              <div><span>Subnet Mask:</span> <b>${esc(mobile.wifi.mask || '255.255.255.0')}</b></div>
              <div><span>Router Gateway:</span> <b>${esc(mobile.wifi.gateway || '192.168.1.1')}</b></div>
              <div><span>DNS Server:</span> <b>${esc(mobile.wifi.dns || '192.168.1.1')}</b></div>
            </div>
          </div>
        ` : `
          <div class="mobile-network-list">
            <div class="list-label">AVAILABLE NETWORKS</div>
            ${router.wlan?.enabled ? `
              <button type="button" class="mobile-network-item" data-action="mobile-wifi-prompt" data-ssid="${esc(router.wlan.ssid)}">
                <span class="wifi-icon">📶</span>
                <div class="network-meta">
                  <b>${esc(router.wlan.ssid)}</b>
                  <small>Secured with WPA2-PSK (Signal 95%)</small>
                </div>
                <span class="lock-icon">🔒</span>
              </button>
            ` : `
              <p class="mobile-empty-note">No wireless networks in range. Ensure Router WLAN radio is enabled.</p>
            `}
          </div>
        `}
      `}

      ${wifiModal ? `
        <div class="mobile-modal-overlay">
          <div class="mobile-modal">
            <h4>Connect to "${esc(router.wlan?.ssid || 'SERVERLAB-WIFI')}"</h4>
            <p class="modal-sub">WPA2-PSK Protected Network</p>
            <form data-form="mobile-connect-form">
              <label>
                <span>Enter Passphrase:</span>
                <input type="password" name="passphrase" placeholder="e.g. Password123!" required autofocus>
              </label>
              <div class="mobile-modal-actions">
                <button type="button" class="mobile-btn-secondary" data-action="mobile-wifi-cancel">Cancel</button>
                <button type="submit" class="mobile-btn-primary">Connect</button>
              </div>
            </form>
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

function renderBrowserApp(state, routerTab, routerUrl, esc, icon) {
  if (state.verifiedChecks) state.verifiedChecks.mobile_browse = true;
  return `
    <div class="mobile-browser-view">
      ${renderBrowser({
        state,
        url: routerUrl,
        tab: routerTab,
        esc,
        icon,
        source: 'mobile'
      })}
    </div>
  `;
}

function renderPingApp(pingOutput, esc) {
  return `
    <div class="mobile-ping-view">
      <div class="ping-controls">
        <div class="ping-quick-buttons">
          <button type="button" class="mobile-quick-btn" data-action="mobile-quick-ping" data-host="192.168.1.1">
            Ping Router (192.168.1.1)
          </button>
          <button type="button" class="mobile-quick-btn" data-action="mobile-quick-ping" data-host="192.168.1.10">
            Ping Server (192.168.1.10)
          </button>
        </div>
        <form data-form="mobile-ping-form" class="mobile-ping-form">
          <input type="text" name="host" placeholder="Host or IP (e.g. 192.168.1.1)" value="192.168.1.1" required>
          <button type="submit" class="mobile-btn-primary">Send Ping</button>
        </form>
      </div>
      <div class="mobile-terminal-output">
        <pre>${esc(pingOutput || '# Mobile Network Diagnostics\\n# Ready to ping local and network endpoints.')}</pre>
      </div>
    </div>
  `;
}

function renderRdpApp(state, rdpSession, rdpError, esc) {
  const isWifiConnected = !!(state.networkEntities?.mobile?.wifi?.associatedSsid && state.networkEntities?.mobile?.wifi?.ip);

  if (rdpSession) {
    if (state.verifiedChecks) {
      state.verifiedChecks.rdp_tested = true;
      state.verifiedChecks.mobile_rdp_tested = true;
    }
    return `
      <div class="mobile-rdp-active">
        <div class="mobile-rdp-bar">
          <span>🖥 WIN-SERVER (${esc(state.network?.ip || '192.168.1.10')})</span>
          <button type="button" class="mobile-btn-danger sm" data-action="mobile-rdp-disconnect">Disconnect</button>
        </div>
        <div class="mobile-rdp-viewport">
          <div class="remote-screen-card">
            <h4>Connected to Windows Server 2012 R2</h4>
            <p>Session: <b>Administrator@${esc(state.domain || 'WORKGROUP')}</b></p>
            <div class="remote-desktop-stat">
              <div>Display: <b>1024x768 (32-bit)</b></div>
              <div>Encryption: <b>CredSSP / NLA</b></div>
              <div>Latency: <b>2 ms (Local Wi-Fi)</b></div>
            </div>
            <div class="remote-control-panel">
              <p class="green-text">✓ Remote Desktop is active and accepting connections.</p>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  return `
    <div class="mobile-rdp-connect-view">
      <div class="rdp-header-card">
        <div class="rdp-app-logo">🖥️</div>
        <h3>Remote Desktop</h3>
        <p>Connect to Windows Server workstations over Wi-Fi</p>
      </div>

      <form data-form="mobile-rdp-connect" class="mobile-rdp-form">
        <label>
          <span>PC Name / IP Address:</span>
          <input type="text" name="computer" value="${esc(state.network?.ip || '192.168.1.10')}" required>
        </label>

        <label>
          <span>User Name:</span>
          <input type="text" name="username" value="Administrator" required>
        </label>

        <label>
          <span>Password:</span>
          <input type="password" name="password" placeholder="Administrator password" value="admin123">
        </label>

        ${!isWifiConnected ? `
          <div class="mobile-alert warning">
            ⚠️ Client phone must be connected to Wi-Fi to reach the server.
            <div style="margin-top: 6px;">
              <button type="button" class="win-btn sm" data-action="mobile-open-app" data-app="settings" style="width: 100%; font-size: 11px;">Go to Wi-Fi Settings</button>
            </div>
          </div>
        ` : ''}

        ${rdpError ? `
          <div class="mobile-alert error">
            ${esc(rdpError)}
            ${!state.remoteDesktop?.enabled ? `
              <div style="margin-top: 8px;">
                <button type="button" class="win-btn sm" data-action="mobile-enable-rdp" style="width: 100%; font-size: 11px; padding: 6px 10px; background: #2e7d32; color: #fff; border: 0; border-radius: 3px;">
                  Enable Remote Desktop on Server Now
                </button>
              </div>
            ` : ''}
          </div>
        ` : ''}

        <button type="submit" class="mobile-btn-primary full-width" ${!isWifiConnected ? 'disabled' : ''}>
          Connect
        </button>
      </form>
    </div>
  `;
}

function renderFilesApp() {
  return `
    <div class="mobile-files-view">
      <div class="file-item"><span>📁 Documents</span><small>0 items</small></div>
      <div class="file-item"><span>📁 Downloads</span><small>0 items</small></div>
      <div class="file-item"><span>📁 Pictures</span><small>0 items</small></div>
    </div>
  `;
}
