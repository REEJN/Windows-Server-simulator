// Simulated Web Browser and TP-Link Router Web Management Interface

export function renderBrowser(options) {
  const {
    state,
    url = 'http://192.168.1.1',
    tab = 'status',
    esc,
    icon,
    source = 'server' // 'server' or 'mobile'
  } = options;

  const isConnected = source === 'server'
    ? state.ethernet
    : (state.networkEntities?.mobile?.wifi?.associatedSsid && state.networkEntities?.mobile?.wifi?.ip);

  const cleanUrl = (url || '').trim().toLowerCase();
  const isRouterUrl = cleanUrl === '192.168.1.1' ||
    cleanUrl === 'http://192.168.1.1' ||
    cleanUrl === 'http://192.168.1.1/' ||
    cleanUrl === 'tplinkwifi.net' ||
    cleanUrl === 'http://tplinkwifi.net';

  return `
    <div class="browser-app">
      <div class="browser-toolbar">
        <button type="button" class="win-btn b-btn" data-action="os-browser-back" title="Back">←</button>
        <button type="button" class="win-btn b-btn" data-action="os-browser-forward" title="Forward">→</button>
        <button type="button" class="win-btn b-btn" data-action="os-browser-refresh" title="Refresh">↻</button>
        <form id="browser-address-form" class="browser-url-form" data-form="browser-navigate">
          <input type="text" name="url" value="${esc(url)}" aria-label="Address bar" spellcheck="false">
          <button type="submit" class="win-btn b-go">Go</button>
        </form>
        <button type="button" class="win-btn b-btn" data-action="os-browser-home" title="Home">⌂</button>
      </div>
      <div class="browser-viewport">
        ${renderBrowserContent(state, isRouterUrl, isConnected, tab, esc, icon, source)}
      </div>
    </div>
  `;
}

function renderBrowserContent(state, isRouterUrl, isConnected, tab, esc, icon, source) {
  if (isRouterUrl) {
    if (!isConnected) {
      return `
        <div class="browser-error">
          <h2>This page can’t be displayed</h2>
          <ul>
            <li>Make sure the web address <b>http://192.168.1.1</b> is correct.</li>
            <li>Look for the page with your search engine.</li>
            <li>Refresh the page in a few minutes.</li>
            <li><b>Diagnostics:</b> ${source === 'server' ? 'Ethernet cable is unplugged. Connect the Ethernet cable.' : 'Mobile device is not connected to Wi-Fi.'}</li>
          </ul>
        </div>
      `;
    }

    const router = state.networkEntities?.router || {};
    if (!router.admin?.loggedIn) {
      return renderTpLinkLogin(router, esc, source);
    }

    return renderTpLinkRouter(state, tab, esc, icon, source);
  }

  if (state.networkEntities?.router?.wan?.connected) {
    return `
      <div class="browser-page external-page">
        <div class="google-mock">
          <h1><span>G</span><span>o</span><span>o</span><span>g</span><span>l</span><span>e</span></h1>
          <div class="search-box">
            <input type="text" placeholder="Search the web (Simulated WAN Uplink active)" disabled>
          </div>
          <p class="wan-note">✓ Internet connectivity active via Router Mobile Data Uplink (WAN IP: ${esc(state.networkEntities.router.wan.ip)}).</p>
        </div>
      </div>
    `;
  }

  return `
    <div class="browser-error">
      <h2>This site can’t be reached</h2>
      <p>The webpage at <b>http://${esc(tab)}</b> might be temporarily down or it may have moved permanently to a new web address.</p>
      <p>ERR_NAME_NOT_RESOLVED</p>
    </div>
  `;
}

function getTpLinkTabTitle(tabId) {
  for (const entry of TP_LINK_NAV) {
    if (entry.id === tabId) return entry.label;
    if (entry.items) {
      const found = entry.items.find(i => i.id === tabId);
      if (found) return `${entry.group} > ${found.label}`;
    }
  }
  return 'Status';
}

function renderTpLinkRouter(state, tab, esc, icon, source) {
  const router = state.networkEntities?.router || {};
  const currentTab = tab || 'status';
  const currentTitle = getTpLinkTabTitle(currentTab);

  if (source === 'mobile') {
    return `
      <div class="tplink-frame tplink-mobile-frame">
        <header class="tplink-header tplink-mobile-header">
          <div class="tplink-brand">
            <span class="tplink-logo">TP-LINK</span>
            <span class="tplink-model">TL-WR841N</span>
          </div>
          <div class="tplink-actions">
            <button type="button" class="tplink-link-btn" data-action="mobile-router-logout">Logout</button>
          </div>
        </header>

        <details class="tplink-mobile-nav-toggle">
          <summary class="tplink-mobile-nav-summary">
            <span>☰ Navigation: <b>${esc(currentTitle)}</b></span>
            <span class="nav-arrow">▾</span>
          </summary>
          <nav class="tplink-nav">
            ${renderTpLinkNav(currentTab, source)}
          </nav>
        </details>

        <div class="tplink-body tplink-mobile-body">
          <main class="tplink-content">
            ${renderTpLinkPage(router, currentTab, esc, source)}
          </main>
        </div>

        <details class="tplink-mobile-help-toggle">
          <summary class="tplink-mobile-help-summary">
            <span>❓ Help &amp; Descriptions</span>
            <span class="help-arrow">▾</span>
          </summary>
          <aside class="tplink-help">
            <div class="tplink-help-title">Help: ${esc(currentTitle)}</div>
            <div class="tplink-help-body">
              ${renderTpLinkHelp(currentTab)}
            </div>
          </aside>
        </details>
      </div>
    `;
  }

  return `
    <div class="tplink-frame">
      <header class="tplink-header">
        <div class="tplink-brand">
          <span class="tplink-logo">TP-LINK</span>
          <span class="tplink-model">300Mbps Wireless N Router &nbsp;·&nbsp; Model No. TL-WR841N</span>
        </div>
        <div class="tplink-actions">
          <span>Firmware Version: 3.16.9 Build 150310 Rel.35231n</span>
          <button type="button" class="tplink-link-btn" data-action="os-router-logout">Logout</button>
        </div>
      </header>
      <div class="tplink-body">
        <nav class="tplink-nav">
          ${renderTpLinkNav(currentTab, source)}
        </nav>
        <main class="tplink-content">
          ${renderTpLinkPage(router, currentTab, esc, source)}
        </main>
        <aside class="tplink-help">
          <div class="tplink-help-title">Help</div>
          <div class="tplink-help-body">
            ${renderTpLinkHelp(currentTab)}
          </div>
        </aside>
      </div>
    </div>
  `;
}

function renderTpLinkPage(router, tab, esc, source) {
  const formPrefix = source === 'mobile' ? 'mobile-router' : 'router';

  switch (tab) {
    case 'status':
      return `
        <h2>Status</h2>
        <div class="tplink-section">
          <h3>LAN</h3>
          <table class="tplink-table">
            <tr><td width="200">MAC Address:</td><td><b>00-0A-EB-13-7B-00</b></td></tr>
            <tr><td>IP Address:</td><td><b>${esc(router.lan?.ip || '192.168.1.1')}</b></td></tr>
            <tr><td>Subnet Mask:</td><td><b>${esc(router.lan?.mask || '255.255.255.0')}</b></td></tr>
          </table>
        </div>
        <div class="tplink-section">
          <h3>Wireless</h3>
          <table class="tplink-table">
            <tr><td width="200">Wireless Radio:</td><td><b class="${router.wlan?.enabled ? 'green-text' : 'red-text'}">${router.wlan?.enabled ? 'Enabled' : 'Disabled'}</b></td></tr>
            <tr><td>Name (SSID):</td><td><b>${esc(router.wlan?.ssid || 'SERVERLAB-WIFI')}</b></td></tr>
            <tr><td>Channel:</td><td><b>${router.wlan?.channel || 6}</b></td></tr>
            <tr><td>Security:</td><td><b>${esc(router.wlan?.security || 'WPA2-PSK')}</b></td></tr>
          </table>
        </div>
        <div class="tplink-section">
          <h3>WAN</h3>
          <table class="tplink-table">
            <tr><td width="200">Connection Type:</td><td><b>Mobile Data Uplink (Cellular)</b></td></tr>
            <tr><td>Status:</td><td><b class="${router.wan?.connected ? 'green-text' : 'red-text'}">${router.wan?.connected ? 'Connected' : 'Disconnected'}</b></td></tr>
            <tr><td>IP Address:</td><td><b>${esc(router.wan?.ip || '10.120.45.67')}</b></td></tr>
            <tr><td>Subnet Mask:</td><td><b>${esc(router.wan?.mask || '255.255.255.0')}</b></td></tr>
            <tr><td>Default Gateway:</td><td><b>${esc(router.wan?.gateway || '10.120.45.1')}</b></td></tr>
            <tr><td>DNS Server:</td><td><b>${esc(router.wan?.dns || '8.8.8.8')}</b></td></tr>
          </table>
        </div>
        <div class="tplink-section">
          <h3>Traffic Statistics</h3>
          <table class="tplink-table">
            <tr><td width="200">Sent (Bytes):</td><td><b>142,520</b></td></tr>
            <tr><td>Received (Bytes):</td><td><b>983,110</b></td></tr>
            <tr><td>System Up Time:</td><td><b>0 days 01:24:18</b></td></tr>
          </table>
        </div>
      `;

    case 'wan':
      return `
        <h2>WAN Setup</h2>
        <form data-form="${formPrefix}-wan" class="tplink-form">
          <label class="tplink-field">
            <span>WAN Connection Type:</span>
            <select name="type">
              <option value="mobile-data" selected>Mobile Data Uplink (Cellular Hotspot)</option>
              <option value="dynamic-ip">Dynamic IP</option>
              <option value="static-ip">Static IP</option>
            </select>
          </label>
          <label class="tplink-field">
            <span>Uplink Status:</span>
            <input type="text" value="${router.wan?.connected ? 'Connected (Signal 94%)' : 'Disconnected'}" disabled>
          </label>
          <label class="tplink-field">
            <span>IP Address:</span>
            <input type="text" name="ip" value="${esc(router.wan?.ip || '10.120.45.67')}">
          </label>
          <label class="tplink-field">
            <span>Subnet Mask:</span>
            <input type="text" name="mask" value="${esc(router.wan?.mask || '255.255.255.0')}">
          </label>
          <label class="tplink-field">
            <span>Default Gateway:</span>
            <input type="text" name="gateway" value="${esc(router.wan?.gateway || '10.120.45.1')}">
          </label>
          <label class="tplink-field">
            <span>Primary DNS:</span>
            <input type="text" name="dns" value="${esc(router.wan?.dns || '8.8.8.8')}">
          </label>
          <div class="tplink-form-footer">
            <button type="submit" class="tplink-btn">Save</button>
          </div>
        </form>
      `;

    case 'lan':
      return `
        <h2>LAN Settings</h2>
        <form data-form="${formPrefix}-lan" class="tplink-form">
          <label class="tplink-field">
            <span>MAC Address:</span>
            <input type="text" value="00-0A-EB-13-7B-00" disabled>
          </label>
          <label class="tplink-field">
            <span>IP Address:</span>
            <input type="text" name="ip" value="${esc(router.lan?.ip || '192.168.1.1')}" required>
          </label>
          <label class="tplink-field">
            <span>Subnet Mask:</span>
            <select name="mask">
              <option ${router.lan?.mask === '255.255.255.0' ? 'selected' : ''}>255.255.255.0</option>
              <option ${router.lan?.mask === '255.255.0.0' ? 'selected' : ''}>255.255.0.0</option>
            </select>
          </label>
          <p class="tplink-tip">Note: Changing the LAN IP address requires reconnecting devices on the network.</p>
          <div class="tplink-form-footer">
            <button type="submit" class="tplink-btn">Save</button>
          </div>
        </form>
      `;

    case 'wireless':
      return `
        <h2>Wireless Settings</h2>
        <form data-form="${formPrefix}-wireless" class="tplink-form">
          <label class="tplink-field">
            <span>Wireless Radio:</span>
            <label><input type="checkbox" name="enabled" ${router.wlan?.enabled ? 'checked' : ''}> Enable Wireless Router Radio</label>
          </label>
          <label class="tplink-field">
            <span>Wireless Network Name (SSID):</span>
            <input type="text" name="ssid" value="${esc(router.wlan?.ssid || 'SERVERLAB-WIFI')}" required maxlength="32">
          </label>
          <label class="tplink-field">
            <span>Channel:</span>
            <select name="channel">
              ${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(ch => `
                <option value="${ch}" ${router.wlan?.channel === ch ? 'selected' : ''}>Channel ${ch}</option>
              `).join('')}
            </select>
          </label>
          <label class="tplink-field">
            <span>Mode:</span>
            <select name="mode">
              <option>11bgn mixed</option>
              <option>11n only</option>
            </select>
          </label>
          <div class="tplink-form-footer">
            <button type="submit" class="tplink-btn">Save</button>
          </div>
        </form>
      `;

    case 'security':
      return `
        <h2>Wireless Security</h2>
        <form data-form="${formPrefix}-security" class="tplink-form">
          <div class="tplink-radio-block">
            <label><input type="radio" name="security" value="none" ${router.wlan?.security === 'none' ? 'checked' : ''}> Disable Security</label>
          </div>
          <div class="tplink-radio-block selected">
            <label><input type="radio" name="security" value="WPA2-PSK" ${router.wlan?.security === 'WPA2-PSK' ? 'checked' : ''}> WPA/WPA2 - Personal (Recommended)</label>
            <div class="tplink-sub-fields">
              <label class="tplink-field">
                <span>Version:</span>
                <select name="version">
                  <option selected>WPA2-PSK</option>
                  <option>Automatic</option>
                </select>
              </label>
              <label class="tplink-field">
                <span>Encryption:</span>
                <select name="encryption">
                  <option selected>AES</option>
                  <option>TKIP</option>
                </select>
              </label>
              <label class="tplink-field">
                <span>Wireless Password:</span>
                <input type="text" name="passphrase" value="${esc(router.wlan?.passphrase || 'Password123!')}" required minlength="8">
              </label>
              <p class="tplink-tip">You can enter 8 to 63 ASCII characters or 8 to 64 Hexadecimal characters.</p>
            </div>
          </div>
          <div class="tplink-form-footer">
            <button type="submit" class="tplink-btn">Save</button>
          </div>
        </form>
      `;

    case 'dhcp':
      return `
        <h2>DHCP Settings</h2>
        <form data-form="${formPrefix}-dhcp" class="tplink-form">
          <label class="tplink-field">
            <span>DHCP Server:</span>
            <label><input type="radio" name="enabled" value="true" ${router.dhcp?.enabled ? 'checked' : ''}> Enable</label>
            <label><input type="radio" name="enabled" value="false" ${router.dhcp?.enabled ? '' : 'checked'}> Disable</label>
          </label>
          <label class="tplink-field">
            <span>Start IP Address:</span>
            <input type="text" name="start" value="${esc(router.dhcp?.start || '192.168.1.100')}" required>
          </label>
          <label class="tplink-field">
            <span>End IP Address:</span>
            <input type="text" name="end" value="${esc(router.dhcp?.end || '192.168.1.199')}" required>
          </label>
          <label class="tplink-field">
            <span>Address Lease Time:</span>
            <input type="number" name="leaseTimeMinutes" value="${router.dhcp?.leaseTimeMinutes || 120}"> minutes (1–2880)
          </label>
          <label class="tplink-field">
            <span>Default Gateway:</span>
            <input type="text" name="gateway" value="${esc(router.dhcp?.gateway || router.lan?.ip || '192.168.1.1')}">
          </label>
          <label class="tplink-field">
            <span>Primary DNS:</span>
            <input type="text" name="dns" value="${esc(router.dhcp?.dns || router.lan?.ip || '192.168.1.1')}">
          </label>
          <div class="tplink-form-footer">
            <button type="submit" class="tplink-btn">Save</button>
          </div>
        </form>
      `;

    case 'leases':
      const leases = router.dhcp?.leases || [];
      return `
        <h2>DHCP Clients List</h2>
        <p>This table displays all currently active DHCP leases assigned by the router.</p>
        <table class="tplink-table bordered">
          <thead>
            <tr>
              <th>ID</th>
              <th>Client Name</th>
              <th>MAC Address</th>
              <th>Assigned IP</th>
              <th>Lease Status</th>
            </tr>
          </thead>
          <tbody>
            ${leases.length ? leases.map((l, i) => `
              <tr>
                <td>${i + 1}</td>
                <td><b>${esc(l.hostname)}</b></td>
                <td>${esc(l.mac)}</td>
                <td><b class="green-text">${esc(l.ip)}</b></td>
                <td>Permanent / Active</td>
              </tr>
            `).join('') : `
              <tr>
                <td colspan="5" style="text-align:center;color:#888;padding:15px;">No active DHCP clients. Connect the mobile device to view its lease.</td>
              </tr>
            `}
          </tbody>
        </table>
      `;

    case 'reboot':
      return `
        <h2>Reboot Router</h2>
        <p>Click the button below to restart the router. All wireless connections and active leases will briefly refresh.</p>
        <div class="tplink-form-footer" style="text-align:left;">
          <button type="button" class="tplink-btn" data-action="${source === 'mobile' ? 'mobile-router-reboot' : 'os-router-reboot'}">Reboot</button>
        </div>
      `;

    case 'password':
      return `
        <h2>System Password</h2>
        <form data-form="${formPrefix}-password" class="tplink-form">
          <label class="tplink-field">
            <span>Old User Name:</span>
            <input type="text" name="oldUser" value="admin" required>
          </label>
          <label class="tplink-field">
            <span>Old Password:</span>
            <input type="password" name="oldPass" required>
          </label>
          <label class="tplink-field">
            <span>New User Name:</span>
            <input type="text" name="newUser" required>
          </label>
          <label class="tplink-field">
            <span>New Password:</span>
            <input type="password" name="newPass" required>
          </label>
          <label class="tplink-field">
            <span>Confirm New Password:</span>
            <input type="password" name="confirmPass" required>
          </label>
          <div class="tplink-form-footer">
            <button type="submit" class="tplink-btn">Save</button>
          </div>
        </form>
      `;

    case 'quick-setup':
      return `
        <h2>Quick Setup</h2>
        <p>The Quick Setup wizard guides you through basic network configuration steps.</p>
        <div class="tplink-section">
          <p>Current operation mode: <b>Standard Wireless Router Mode</b></p>
          <p>To configure individual parameters, use the left menu to navigate to <b>Network</b>, <b>Wireless</b>, or <b>DHCP</b>.</p>
        </div>
      `;

    case 'mac-clone':
      return `
        <h2>MAC Clone</h2>
        <form data-form="${formPrefix}-mac" class="tplink-form">
          <label class="tplink-field">
            <span>WAN MAC Address:</span>
            <input type="text" value="00-0A-EB-13-7B-01">
          </label>
          <label class="tplink-field">
            <span>Your PC's MAC Address:</span>
            <input type="text" value="00-15-5D-01-A4-0B" disabled>
          </label>
          <div class="tplink-form-footer">
            <button type="button" class="tplink-btn">Clone MAC Address</button>
            <button type="button" class="tplink-btn">Restore Factory MAC</button>
          </div>
        </form>
      `;

    case 'wmac':
      return `
        <h2>Wireless MAC Filtering</h2>
        <p>Wireless MAC Filtering allows you to control which wireless stations can access the network.</p>
        <div class="tplink-section">
          <p>Wireless MAC Filtering Status: <b>Disabled</b></p>
          <button type="button" class="tplink-btn">Enable</button>
        </div>
      `;

    case 'reservation':
      return `
        <h2>Address Reservation</h2>
        <p>When you specify a reserved IP address for a PC on the LAN, that PC will always receive the same IP address each time it requests a DHCP lease.</p>
        <table class="tplink-table bordered">
          <thead>
            <tr><th>ID</th><th>MAC Address</th><th>Reserved IP Address</th><th>Status</th></tr>
          </thead>
          <tbody>
            <tr><td colspan="4" style="text-align:center;color:#888;padding:12px;">No reserved addresses configured.</td></tr>
          </tbody>
        </table>
      `;

    default:
      return `
        <h2>${tab ? tab.toUpperCase() : 'Configuration'}</h2>
        <div class="tplink-section">
          <p>Section <b>${esc(tab)}</b> is active and operating normally.</p>
          <p>Review the contextual information in the <b>Help</b> pane on the right for parameter definitions and recommended options.</p>
        </div>
      `;
  }
}

function renderTpLinkLogin(router, esc, source) {
  const formPrefix = source === 'mobile' ? 'mobile-router' : 'router';
  return `
    <div class="tplink-login-viewport">
      <div class="tplink-login-panel">
        <div class="tplink-login-top">
          <div class="tplink-logo">TP-LINK</div>
          <div class="tplink-login-model">300Mbps Wireless N Router &nbsp;·&nbsp; Model No. TL-WR841N</div>
        </div>
        <div class="tplink-login-card">
          <div class="tplink-login-card-head">
            <span class="tplink-lock-icon">🔒</span>
            <span>Authentication Required</span>
          </div>
          <p class="tplink-login-desc">Enter your user name and password to access the Web-based management page.</p>
          <form data-form="${formPrefix}-login" class="tplink-login-form">
            <div class="tplink-login-row">
              <label for="${formPrefix}-username">User Name:</label>
              <input type="text" id="${formPrefix}-username" name="username" value="admin" autocomplete="username" required>
            </div>
            <div class="tplink-login-row">
              <label for="${formPrefix}-password">Password:</label>
              <input type="password" id="${formPrefix}-password" name="password" value="admin" autocomplete="current-password" required>
            </div>
            <div class="tplink-login-actions">
              <button type="submit" class="tplink-btn tplink-login-submit">Login</button>
            </div>
          </form>
          <div class="tplink-login-tips">
            <small>Default credentials: <b>admin</b> / <b>admin</b></small>
          </div>
        </div>
        <div class="tplink-login-bottom">
          Firmware Version: 3.16.9 Build 150310 Rel.35231n &nbsp;·&nbsp; Hardware Version: WR841N v9 00000000
        </div>
      </div>
    </div>
  `;
}

const TP_LINK_NAV = [
  { id: 'status', label: 'Status' },
  { id: 'quick-setup', label: 'Quick Setup' },
  {
    group: 'Network',
    items: [
      { id: 'wan', label: 'WAN' },
      { id: 'lan', label: 'LAN' },
      { id: 'mac-clone', label: 'MAC Clone' }
    ]
  },
  {
    group: 'Wireless',
    items: [
      { id: 'wireless', label: 'Wireless Settings' },
      { id: 'security', label: 'Wireless Security' },
      { id: 'wmac', label: 'Wireless MAC Filtering' }
    ]
  },
  {
    group: 'DHCP',
    items: [
      { id: 'dhcp', label: 'DHCP Settings' },
      { id: 'leases', label: 'DHCP Clients List' },
      { id: 'reservation', label: 'Address Reservation' }
    ]
  },
  { id: 'forwarding', label: 'Forwarding' },
  { id: 'sec-settings', label: 'Security' },
  { id: 'parental', label: 'Parental Control' },
  { id: 'access', label: 'Access Control' },
  { id: 'bandwidth', label: 'Bandwidth Control' },
  { id: 'binding', label: 'IP & MAC Binding' },
  { id: 'ddns', label: 'Dynamic DNS' },
  {
    group: 'System Tools',
    items: [
      { id: 'time', label: 'Time Settings' },
      { id: 'diag', label: 'Diagnostic' },
      { id: 'firmware', label: 'Firmware Upgrade' },
      { id: 'defaults', label: 'Factory Defaults' },
      { id: 'backup', label: 'Backup & Restore' },
      { id: 'reboot', label: 'Reboot' },
      { id: 'password', label: 'Password' },
      { id: 'syslog', label: 'System Log' }
    ]
  }
];

function renderTpLinkNav(currentTab, source) {
  const action = source === 'mobile' ? 'mobile-router-tab' : 'os-router-tab';
  return TP_LINK_NAV.map(entry => {
    if (entry.group) {
      const isGroupActive = entry.items.some(i => i.id === currentTab);
      return `
        <div class="tplink-nav-group ${isGroupActive ? 'group-active' : ''}">
          <div class="tplink-nav-group-title">${entry.group}</div>
          <div class="tplink-nav-group-items">
            ${entry.items.map(item => `
              <button type="button"
                class="tplink-nav-item sub-item ${currentTab === item.id ? 'active' : ''}"
                data-action="${action}"
                data-tab="${item.id}">
                ${item.label}
              </button>
            `).join('')}
          </div>
        </div>
      `;
    }
    return `
      <button type="button"
        class="tplink-nav-item ${currentTab === entry.id ? 'active' : ''}"
        data-action="${action}"
        data-tab="${entry.id}">
        ${entry.label}
      </button>
    `;
  }).join('');
}

function renderTpLinkHelp(tab) {
  switch (tab) {
    case 'status':
      return `
        <p>The <b>Status</b> page displays the Router's current status and configuration. All information is read-only.</p>
        <p><b>LAN:</b> Displays the MAC Address, IP Address, and Subnet Mask of the local area network interface.</p>
        <p><b>Wireless:</b> Displays the current operating status of the wireless radio, SSID network name, channel, and security settings.</p>
        <p><b>WAN:</b> Displays the current WAN connection parameters including IP address, subnet mask, default gateway, and DNS servers.</p>
        <p><b>Traffic Statistics:</b> Displays the total sent and received byte counters and system uptime.</p>
      `;
    case 'wan':
      return `
        <p>The <b>WAN</b> page allows you to configure parameters for the WAN interface connected to the upstream network.</p>
        <p><b>WAN Connection Type:</b> Supports Mobile Data Uplink (Cellular Hotspot), Dynamic IP, and Static IP.</p>
        <p><b>IP Address:</b> Displays or sets the WAN IP address provided by the service provider.</p>
        <p><b>Subnet Mask:</b> The subnet mask for the WAN network.</p>
        <p><b>Default Gateway:</b> The upstream gateway IP address for Internet routing.</p>
        <p><b>Primary DNS:</b> The primary Domain Name System server address used for hostname resolution.</p>
      `;
    case 'lan':
      return `
        <p>The <b>LAN</b> page allows you to configure the IP parameters of the Local Area Network.</p>
        <p><b>MAC Address:</b> The physical hardware address of the router's LAN interface.</p>
        <p><b>IP Address:</b> The IP address of the Router (Default: <code>192.168.1.1</code>). If you change this address, you must use the new IP to access the web utility.</p>
        <p><b>Subnet Mask:</b> Determines the network and host portions of the IP address (typically <code>255.255.255.0</code>).</p>
      `;
    case 'wireless':
      return `
        <p>The <b>Wireless Settings</b> page configures fundamental parameters for your Wi-Fi network.</p>
        <p><b>Wireless Radio:</b> Turns the 2.4GHz Wi-Fi transmitter On or Off.</p>
        <p><b>SSID:</b> The Service Set Identifier (network name) broadcasted to wireless clients (up to 32 characters).</p>
        <p><b>Channel:</b> Determines the 2.4GHz operating frequency channel (1–11). Channel 6 is the standard default.</p>
        <p><b>Mode:</b> Select <code>11bgn mixed</code> for broad compatibility with 802.11b, 802.11g, and 802.11n devices.</p>
      `;
    case 'security':
      return `
        <p>The <b>Wireless Security</b> page protects your wireless transmissions from unauthorized eavesdropping and access.</p>
        <p><b>WPA/WPA2 - Personal (Recommended):</b> Industry-standard robust security for home and small business networks.</p>
        <p><b>Version & Encryption:</b> WPA2-PSK with AES encryption delivers maximum security and high 802.11n data throughput.</p>
        <p><b>Wireless Password:</b> Pre-Shared Key (PSK) between 8 and 63 ASCII characters. All connecting wireless clients must provide this passphrase.</p>
      `;
    case 'dhcp':
      return `
        <p>The <b>DHCP Settings</b> page configures the built-in DHCP server which automatically assigns IP addresses to connected clients.</p>
        <p><b>DHCP Server:</b> Choose <b>Enable</b> to have the router automatically assign IP configurations to LAN and Wi-Fi clients.</p>
        <p><b>Start IP Address:</b> The starting IP address in the assignable pool (e.g., <code>192.168.1.100</code>).</p>
        <p><b>End IP Address:</b> The ending IP address in the assignable pool (e.g., <code>192.168.1.199</code>).</p>
        <p><b>Address Lease Time:</b> How long a leased IP address remains valid for a client before renewal.</p>
        <p><b>Default Gateway & DNS:</b> Handed out to clients to direct outbound traffic and DNS queries.</p>
      `;
    case 'leases':
      return `
        <p>The <b>DHCP Clients List</b> page displays all dynamic IP address assignments actively leased to clients.</p>
        <p><b>Client Name:</b> Hostname reported by the client operating system.</p>
        <p><b>MAC Address:</b> Physical NIC address of the client.</p>
        <p><b>Assigned IP:</b> The specific IP address leased from the DHCP pool.</p>
      `;
    case 'reboot':
      return `
        <p>The <b>Reboot</b> utility restarts the router's operating system.</p>
        <p>Clicking <b>Reboot</b> safely refreshes all routing tables, wireless associations, and active DHCP leases.</p>
      `;
    case 'password':
      return `
        <p>The <b>Password</b> page allows changing the factory management credentials.</p>
        <p>Default credentials are <b>admin / admin</b>. Changing these credentials secures the router against unauthorized configuration alterations.</p>
      `;
    default:
      return `
        <p><b>Help:</b> Select any section from the navigation menu on the left to configure or inspect the corresponding router service.</p>
        <p>All changes made in configuration forms take effect immediately after clicking <b>Save</b>.</p>
      `;
  }
}
