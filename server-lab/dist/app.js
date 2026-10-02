import {initialState,cleanState,phases,checks,progress,validDomain,validPassword,validIP,allLabs,getPhasesForLab} from './engine.js';
import {createSimulator} from './os.js';
import {renderMobileDevice} from './mobile.js';
import {connectMobileWifi,disconnectMobileWifi,simulatePing,rebootRouter,logoutRouter,loginRouter,updateRouterLan,updateRouterWan,updateRouterWlan,updateRouterDhcp} from './network.js';

const $ = (s,r=document)=>r.querySelector(s);
const esc = s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const paths={
  server:'M4 3h16v7H4z M4 14h16v7H4z M7 6.5h1 M7 17.5h1 M12 6.5h5 M12 17.5h5',
  power:'M12 2v10 M5.5 5.5a9 9 0 1 0 13 0',
  usb:'M12 3v15a3 3 0 1 1-3-3h3 M9 6l3-3 3 3 M12 12l5-4V5 M12 10L7 7V5 M5 3h4v2H5z M16 2h2v3h-2z',
  network:'M8 3h8v6H8z M3 15h6v6H3z M15 15h6v6h-6z M12 9v3 M6 15v-3h12v3',
  monitor:'M3 4h18v13H3z M12 17v4 M8 21h8',
  check:'M5 12l4 4L19 6',
  chevron:'M9 5l7 7-7 7',
  down:'M5 9l7 7 7-7',
  book:'M3 4h7l2 2 2-2h7v15h-7l-2 2-2-2H3z M12 6v15',
  reset:'M3 11a9 9 0 1 1 2 7 M3 4v7h7',
  expand:'M8 3H3v5 M16 3h5v5 M21 16v5h-5 M8 21H3v-5',
  help:'M9 8a3 3 0 1 1 5 2c-2 1-2 2-2 4 M12 18h.01 M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',
  shield:'M12 2L3 6v6c0 5 9 10 9 10s9-5 9-10V6z M8 12l3 3 5-6',
  clock:'M12 7v5l3 2 M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',
  arrow:'M4 12h16 M14 6l6 6-6 6',
  close:'M6 6l12 12 M6 18L18 6',
  folder:'M3 5h7l2 3h9v12H3z',
  user:'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M4 21v-3a8 6 0 0 1 16 0v3',
  terminal:'M3 4h18v16H3z M6 8l4 4-4 4 M13 16h5',
  settings:'M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8 M8 3h8l1 4 4 1v8l-4 1-1 4H8l-1-4-4-1V8l4-1z',
  flag:'M5 22V3 M5 3c5-4 9 4 15 0v11c-6 4-10-4-15 0',
  disk:'M4 3h16v18H4z M8 7h8 M9 16a3 3 0 1 0 6 0 3 3 0 0 0-6 0',
  windows:'M3 4l8-1v8H3z M13 3l8-1v9h-8z M3 13h8v8l-8-1z M13 13h8v9l-8-1z',
  trash:'M3 6h18 M9 6V3h6v3 M6 6l1 15h10l1-15 M10 10v7 M14 10v7',
  save:'M4 3h13l4 4v14H3V3z M7 3v6h10V3 M7 21v-8h10v8',
  mobile:'M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z M12 18h.01'
};

function icon(name,cls=''){
  return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name]||paths.server}"/></svg>`;
}

let state;
try {
  state = cleanState(JSON.parse(localStorage.getItem('serverlab-save')));
} catch {
  state = initialState();
}

let expanded = progress(state, state.activeLab || 'lab1').phase;
let fullscreen = false, guideOpen = false, resetOpen = false;
let mobileOpen = false, mobileView = 'home', mobileRouterTab = 'status', mobileRouterUrl = 'http://192.168.1.1', mobilePingOutput = '', mobileWifiModal = false, mobileRdpConnected = false, mobileRdpError = '';

const sim = createSimulator({
  get: () => state,
  icon,
  esc,
  toast,
  render,
  commit: (changes, message) => {
    const curLab = state.activeLab || 'lab1';
    const before = progress(state, curLab).done;
    Object.assign(state, changes);
    if (message) event(message);
    else save();
    if (progress(state, curLab).done > before) expanded = progress(state, curLab).phase;
    render();
  }
});

function save() {
  try {
    localStorage.setItem('serverlab-save', JSON.stringify(state));
  } catch {
    toast('Your browser could not save progress. Keep this tab open.');
  }
}

function event(message) {
  state.events.unshift({ message, time: new Date().toLocaleTimeString() });
  state.events = state.events.slice(0, 50);
  save();
}

function toast(message) {
  const el = $('#toast');
  if (!el) return;
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove('show'), 3800);
}

const labDetails = {
  lab1: {
    eyebrow: 'LAB 01 / SYSTEM ADMINISTRATION',
    title: 'Build your first domain.',
    desc: 'From a blank server to a connected organization. You’re in control.'
  },
  lab2: {
    eyebrow: 'LAB 02 / NETWORK & ROUTER LAB',
    title: 'Connect your network infrastructure.',
    desc: 'Configure TP-Link router, WAN uplink, DHCP pool, and mobile client Wi-Fi.'
  },
  lab3: {
    eyebrow: 'LAB 03 / SECURITY & MONITORING',
    title: 'Harden and monitor Windows Server.',
    desc: 'Manage security groups, configure firewall, enable RDP, and inspect services.'
  }
};

function render() {
  const curLab = state.activeLab || 'lab1';
  const p = progress(state, curLab);
  const detail = labDetails[curLab] || labDetails.lab1;

  document.body.classList.toggle('fullscreen', fullscreen);

  const mobileClient = state.networkEntities?.mobile || {};
  const isMobileConnected = !!(mobileClient.wifi?.connected && mobileClient.wifi?.ip);
  const router = state.networkEntities?.router || {};

  $('#app').innerHTML = `
    <div class="shell">
      <header class="topbar">
        <div class="brand">
          <span class="brand-mark">${icon('server')}</span>
          <div>SERVERLAB<small>VIRTUAL TRAINING LAB</small></div>
        </div>
        <nav class="nav" aria-label="Main navigation">
          <button class="active" data-action="lab">Workspace</button>
          <button data-action="toggle-mobile">${icon('mobile')} Client Device</button>
          <button data-action="guide">Field guide ${icon('book')}</button>
          <a href="./about.html">About</a>
        </nav>
        <div class="top-meta">
          <span>Learning by doing.</span>
          <span class="tag">SANDBOX</span>
          <div class="avatar">IT</div>
        </div>
      </header>

      <section class="intro">
        <div>
          <div class="lab-switcher" role="tablist" aria-label="Curriculum Labs">
            ${allLabs.map(l => `
              <button type="button" class="lab-tab ${curLab === l.id ? 'active' : ''}" data-action="switch-lab" data-lab="${l.id}" role="tab" aria-selected="${curLab === l.id}">
                <span class="lab-tab-badge">${l.id.toUpperCase()}</span>
                <span class="lab-tab-title">${esc(l.title)}</span>
              </button>
            `).join('')}
          </div>
          <div class="eyebrow" style="margin-top: 14px;">${detail.eyebrow}</div>
          <h1>${detail.title}</h1>
          <p>${detail.desc}</p>
        </div>
        <button class="outline-btn" data-action="reset">${icon('reset')} Reset lab</button>
      </section>

      <main class="workspace">
        <section class="workstation" aria-label="Virtual computer">
          <div class="station-bar">
            <div class="station-label">${icon('monitor')} Workstation 01 &nbsp;·&nbsp; ${esc(state.computerName)}</div>
            <div class="station-right">
              <span><i class="status-dot ${state.power ? 'on' : ''}"></i>${state.power ? 'POWERED ON' : 'POWERED OFF'}</span>
              <button class="icon-btn" data-action="fullscreen" aria-label="${fullscreen ? 'Exit' : 'Enter'} focus mode" title="Focus mode">${icon('expand')}</button>
            </div>
          </div>

          <div class="monitor">
            <div class="viewport" id="viewport">
              <div class="screen" id="screen" tabindex="0" aria-label="Simulated computer display">${renderScreen()}</div>
            </div>
            <div class="monitor-chin">SERVERLAB <i class="${state.power ? 'on' : ''}"></i></div>
          </div>

          <div class="console-note">
            ${icon('help')} ${state.screen === 'off' ? 'Connect your devices below, then power on the workstation.' : 'Click inside the display to interact. BIOS: F2 / Delete · Boot menu: F12.'}
          </div>

          <div class="hardware-header">
            <span>HARDWARE &amp; NETWORK INFRASTRUCTURE</span>
            <span>Click to configure or connect</span>
          </div>

          <div class="hardware-grid">
            <button class="hardware ${state.usb ? 'connected' : ''}" data-action="usb" aria-pressed="${state.usb}">
              <span class="hardware-visual">${icon('usb')}</span>
              <div>
                <h3>Ventoy USB drive</h3>
                <p>${state.usb ? 'Connected · USB 3.0' : '32 GB · Not connected'}</p>
              </div>
              <span class="connection-action">${state.usb ? '−' : '+'}</span>
            </button>

            <button class="hardware ${state.ethernet ? 'connected' : ''}" data-action="ethernet" aria-pressed="${state.ethernet}">
              <span class="hardware-visual">${icon('network')}</span>
              <div>
                <h3>Ethernet cable</h3>
                <p>${state.ethernet ? 'Connected · 1 Gbps' : 'RJ45 · Disconnected'}</p>
              </div>
              <span class="connection-action">${state.ethernet ? '−' : '+'}</span>
            </button>

            <button class="hardware router-card ${state.ethernet ? 'connected' : ''}" data-action="os-open" data-app="browser" title="Click to open Router Admin UI">
              <span class="hardware-visual">${icon('settings')}</span>
              <div>
                <h3>TP-Link TL-WR841N</h3>
                <p>${esc(router.lan?.ip || '192.168.1.1')} · ${router.wlan?.enabled ? esc(router.wlan?.ssid || 'WLAN') : 'WLAN Off'}</p>
              </div>
              <span class="connection-action">🌐</span>
            </button>

            <button class="hardware mobile-card ${isMobileConnected ? 'connected' : ''}" data-action="toggle-mobile" aria-pressed="${mobileOpen}" title="Click to open client mobile device">
              <span class="hardware-visual">${icon('mobile')}</span>
              <div>
                <h3>Mobile Client Handset</h3>
                <p>${isMobileConnected ? `Wi-Fi: ${esc(mobileClient.wifi.associatedSsid)}` : (mobileClient.wifi?.enabled ? 'Wi-Fi: Scanning' : 'Radio Off')}</p>
              </div>
              <span class="connection-action">${mobileOpen ? '▲' : '▼'}</span>
            </button>

            <button class="hardware power ${state.power ? 'connected' : ''}" data-action="power" aria-pressed="${state.power}">
              <span class="hardware-visual">${icon('power')}</span>
              <div>
                <h3>${state.power ? 'Power off' : 'Power on'}</h3>
                <p>${state.power ? 'Server is running' : 'Server is off'}</p>
              </div>
              <span class="connection-action">${icon('arrow')}</span>
            </button>
          </div>

          <div class="connection-caption">
            ${icon('shield')} Isolated simulation. Zero external network requests; all DHCP, DNS, and HTTP run in-memory.
          </div>

          ${p.done === p.total ? `
            <div class="complete-banner">
              ✓ ${curLab.toUpperCase()} complete! All ${p.total} tasks verified. Advance to the next lab or keep practicing.
            </div>
          ` : ''}
        </section>

        <aside class="mission" aria-label="Mission checklist">
          <div class="mission-heading">
            <div class="mission-kicker">${icon('flag')} ${curLab.toUpperCase()} MISSION</div>
            <h2>${esc(allLabs.find(l => l.id === curLab)?.title || 'Curriculum')}</h2>
            <p>${esc(allLabs.find(l => l.id === curLab)?.description || '')}</p>
            <div class="progress-meta">
              <span>${p.done} of ${p.total} tasks completed</span>
              <strong>${p.percent}%</strong>
            </div>
            <div class="progress-track" role="progressbar" aria-label="Mission progress" aria-valuenow="${p.percent}" aria-valuemin="0" aria-valuemax="100">
              <div style="width:${p.percent}%"></div>
            </div>
          </div>
          ${renderPhases()}
          <div class="mission-help">
            ${icon('help')} Need assistance?
            <button data-action="hint">Get a hint ${icon('arrow')}</button>
          </div>
        </aside>
      </main>

      <footer class="bottom-bar">
        <span>${icon('save')} Progress saved automatically on this device</span>
        <span>Windows Server 2012 R2 <span>·</span> TP-Link TL-WR841N <span>·</span> Mobile Client</span>
        <span>${icon('clock')} Go at your own pace</span>
      </footer>
    </div>

    ${mobileOpen ? renderMobileDrawer() : ''}
    ${guideOpen ? renderGuide() : ''}
  `;

  fitScreen();
}

function renderPhases() {
  const curLab = state.activeLab || 'lab1';
  const curPhases = getPhasesForLab(curLab);
  const c = checks(state, curLab);

  return curPhases.map((p, i) => {
    const done = p.items.filter(([k]) => c[k]).length;
    return `
      <section class="phase ${i === expanded ? 'active' : ''} ${done === p.items.length ? 'complete' : ''}">
        <button class="phase-button" data-action="phase" data-id="${i}" aria-expanded="${expanded === i}">
          <span class="phase-num">${done === p.items.length ? icon('check') : String(i + 1).padStart(2, '0')}</span>
          <span class="phase-title">${p.title}<small>${p.subtitle}</small></span>
          <span class="phase-count">${done}/${p.items.length}</span>
          ${icon(i === expanded ? 'down' : 'chevron')}
        </button>
        ${i === expanded ? `
          <div class="tasks">
            ${p.items.map(([k, label]) => `
              <div class="task ${c[k] ? 'done' : ''}">
                <i>${c[k] ? icon('check') : ''}</i>
                <span>${label}</span>
              </div>
            `).join('')}
          </div>
        ` : ''}
      </section>
    `;
  }).join('');
}

function renderScreen() {
  return sim.screen() || `
    <div class="screen-off">
      <div class="off-icon">${icon('power')}</div>
      <div class="off-label">WORKSTATION 01 / STANDBY</div>
      <h2>A blank machine. A fresh start.</h2>
      <p>Your Windows Server journey begins here.<br>Connect your USB drive and Ethernet cable, then power on.</p>
      <button class="green-btn" data-action="power">${icon('power')} Power on workstation</button>
      <div class="off-footer">
        <span>${icon('server')} 4 vCPU</span>
        <span>${icon('disk')} 8 GB RAM</span>
        <span>${icon('disk')} 120 GB SSD</span>
        <span>UEFI BIOS</span>
      </div>
    </div>
  `;
}

function renderMobileDrawer() {
  return `
    <div class="mobile-drawer-overlay" role="dialog" aria-modal="true" aria-label="Simulated Mobile Client">
      <div class="mobile-drawer-container">
        <div class="mobile-drawer-header">
          <span>${icon('mobile')} CLIENT SMARTPHONE HANDSET</span>
          <button type="button" class="icon-btn close-mobile" data-action="toggle-mobile" aria-label="Close client handset">
            ${icon('close')}
          </button>
        </div>
        ${renderMobileDevice({
          state,
          view: mobileView,
          routerTab: mobileRouterTab,
          routerUrl: mobileRouterUrl,
          pingOutput: mobilePingOutput,
          wifiModal: mobileWifiModal,
          rdpSession: mobileRdpConnected,
          rdpError: mobileRdpError,
          esc,
          icon
        })}
      </div>
    </div>
  `;
}

function renderGuide() {
  if (resetOpen) {
    return `
      <div class="outer-overlay" role="dialog" aria-modal="true" aria-label="Reset lab">
        <article class="guide">
          <h2>Start with a blank lab?</h2>
          <p>This clears all simulated servers, domains, users, router configurations, and checklist progress in this browser.</p>
          <button class="outline-btn" data-action="close-guide">Keep my lab</button>
          <button class="green-btn" data-action="confirm-reset">Reset lab</button>
        </article>
      </div>
    `;
  }

  const curLab = state.activeLab || 'lab1';

  return `
    <div class="outer-overlay" role="dialog" aria-modal="true" aria-label="Field guide">
      <article class="guide">
        <button class="icon-btn close-guide" data-action="close-guide" aria-label="Close guide">${icon('close')}</button>
        <div class="eyebrow">SERVERLAB / FIELD GUIDE</div>
        <h2>Hands-on Curriculum Walkthrough</h2>

        <div class="guide-tabs">
          <button type="button" class="guide-tab-btn ${curLab === 'lab1' ? 'active' : ''}" data-action="switch-lab" data-lab="lab1">Lab 01: AD DS</button>
          <button type="button" class="guide-tab-btn ${curLab === 'lab2' ? 'active' : ''}" data-action="switch-lab" data-lab="lab2">Lab 02: Router &amp; Network</button>
          <button type="button" class="guide-tab-btn ${curLab === 'lab3' ? 'active' : ''}" data-action="switch-lab" data-lab="lab3">Lab 03: Security &amp; Monitoring</button>
        </div>

        ${curLab === 'lab1' ? `
          <h3>Lab 01 — System Administration &amp; AD DS</h3>
          <p>Follow your Windows Server 2012 R2 assignment. Use fictional passwords; values are verified deterministically.</p>
          <h4>01 — Connect &amp; Boot</h4>
          <p>Connect the Ventoy USB drive and Ethernet cable below the monitor. Power on, then press <kbd>F2</kbd> to enter BIOS. Set <b>UEFI: Ventoy USB</b> as Boot Option #1. Save &amp; Exit with <kbd>F10</kbd>. Select the ISO and choose Boot in normal mode.</p>
          <h4>02 — Install Windows Server</h4>
          <p>Select your language, choose <b>Windows Server 2012 R2 Standard (Server with a GUI)</b>, accept license terms, choose Custom, and install on Drive 0. After restart, set a fictional Administrator password (8+ chars, 3 types).</p>
          <h4>03 — Create Active Directory Domain</h4>
          <p>In Server Manager, click <b>Manage → Add Roles and Features</b>. Select Active Directory Domain Services and complete installation. Click <b>AD DS → More → Promote this server to a domain controller</b>. Add a new forest (e.g. <b>css.com</b>), set functional levels to Windows Server 2012 R2, supply a DSRM password, and finish promotion.</p>
          <h4>04 — OUs, Users &amp; Sharing</h4>
          <p>In <b>Tools → Active Directory Users and Computers</b>, right-click the domain → New → Organizational Unit. Uncheck accidental deletion protection. Right-click the OU → New → User. Set password with Password never expires. Create a desktop folder, configure Advanced Sharing with Full Control for Everyone, and view the Security tab.</p>
        ` : curLab === 'lab2' ? `
          <h3>Lab 02 — Network &amp; Router Configuration</h3>
          <p>Connect and configure the TP-Link TL-WR841N wireless router, mobile data WAN uplink, and client smartphone.</p>
          <h4>01 — Access Router Web Admin</h4>
          <p>Open <b>Internet Explorer</b> on the server desktop or click the TP-Link router hardware card. Navigate to <b>http://192.168.1.1</b>. View the router Status page.</p>
          <h4>02 — Mobile Data WAN Uplink</h4>
          <p>Go to <b>Network ▸ WAN</b>. Confirm connection type is Dynamic IP and the simulated Mobile Data WAN uplink has obtained an IP (e.g. <code>10.0.0.15</code>).</p>
          <h4>03 — LAN &amp; DHCP Configuration</h4>
          <p>Verify LAN IP is <code>192.168.1.1</code> with subnet mask <code>255.255.255.0</code>. Go to <b>DHCP ▸ Settings</b>, enable DHCP Server, and configure pool range <code>192.168.1.100</code> to <code>192.168.1.199</code>.</p>
          <h4>04 — WLAN &amp; Security</h4>
          <p>In <b>Wireless ▸ Settings</b>, ensure Wireless Radio is Enabled and SSID is set to <b>SERVERLAB-WIFI</b>. In <b>Wireless ▸ Security</b>, select WPA2-PSK (AES) and verify the passphrase.</p>
          <h4>05 — Client Mobile Handset Testing</h4>
          <p>Open the <b>Client Device</b> handset. In the Wi-Fi tab, turn on Wi-Fi, select <b>SERVERLAB-WIFI</b>, and enter the passphrase. Confirm the client receives a DHCP lease. In the <b>Ping Test</b> tab, ping the router gateway (<code>192.168.1.1</code>) and the server (<code>192.168.1.10</code>).</p>
        ` : `
          <h3>Lab 03 — Security &amp; Monitoring</h3>
          <p>Configure advanced Windows Server security settings, Active Directory groups, remote administration, and diagnostic tools.</p>
          <h4>01 — Computer Name &amp; Static IP</h4>
          <p>In Server Manager → Local Server, click Computer Name or open System Properties to rename your server. In Network and Sharing Center, click Ethernet → IPv4 Properties to assign a static IP (e.g. <code>192.168.1.10</code>) and DNS.</p>
          <h4>02 — Windows Firewall</h4>
          <p>Open <b>Windows Firewall with Advanced Security</b>. Turn Windows Firewall Off across Domain, Private, and Public profiles per the classroom exercise requirements.</p>
          <h4>03 — AD DS Security Groups</h4>
          <p>In Active Directory Users and Computers, right-click your OU → New → Group. Create a <b>Security Group</b> with <b>Global</b> scope. Open Group Properties → Members and add a domain user.</p>
          <h4>04 — Remote Desktop Configuration</h4>
          <p>In System Properties → <b>Remote</b> tab, select <b>Allow remote connections to this computer</b> and enable Network Level Authentication (NLA). Test by opening <b>mstsc</b> (Remote Desktop Connection) and connecting to <code>192.168.1.10</code>.</p>
          <h4>05 — Process &amp; System Monitoring</h4>
          <p>Open <b>Task Manager</b> and inspect active server processes (such as <code>ntds.exe</code>, <code>dns.exe</code>, <code>lsass.exe</code>). View Performance tab metrics. Open the <b>Services</b> management console to verify required server services are running.</p>
        `}

        <footer>
          Educational simulation; all networking and system actions are deterministic.
          <a href="https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/deploy/install-a-new-windows-server-2012-active-directory-forest--level-200-" target="_blank" rel="noreferrer">Microsoft AD DS Reference</a>
        </footer>
      </article>
    </div>
  `;
}

function fitScreen() {
  const vp = $('#viewport');
  if (vp) $('#screen').style.setProperty('--scale', vp.clientWidth / 1000);
}

window.addEventListener('resize', fitScreen);

document.addEventListener('click', e => {
  const b = e.target.closest('[data-action]');
  if (!b) return;
  const a = b.dataset.action;

  if (a === 'usb' || a === 'ethernet') {
    state[a] = !state[a];
    save();
    render();
    toast(`${a === 'usb' ? 'Ventoy USB drive' : 'Ethernet cable'} ${state[a] ? 'connected' : 'disconnected'}.`);
  }

  if (a === 'power') sim.power();

  if (a === 'switch-lab') {
    const labId = b.dataset.lab;
    if (labId && ['lab1', 'lab2', 'lab3'].includes(labId)) {
      state.activeLab = labId;
      expanded = progress(state, labId).phase;
      save();
      render();
    }
  }

  if (a === 'phase') {
    expanded = +b.dataset.id;
    render();
  }

  if (a === 'toggle-mobile') {
    mobileOpen = !mobileOpen;
    render();
  }

  if (a === 'mobile-open-app' || a === 'mobile-view') {
    mobileView = b.dataset.app || b.dataset.view || 'home';
    mobileRdpError = '';
    if (mobileView === 'browser') {
      state.verifiedChecks.mobile_browse = true;
      save();
    }
    render();
  }

  if (a === 'mobile-home') {
    mobileView = 'home';
    render();
  }

  if (a === 'mobile-rdp-disconnect') {
    mobileRdpConnected = false;
    mobileRdpError = '';
    toast('Remote Desktop disconnected.');
    render();
  }

  if (a === 'mobile-enable-rdp') {
    state.remoteDesktop.enabled = true;
    state.remoteDesktop.nla = true;
    mobileRdpError = '';
    save();
    toast('Remote Desktop enabled on Windows Server.');
    render();
  }

  if (a === 'mobile-wifi-prompt') {
    mobileWifiModal = true;
    render();
  }

  if (a === 'mobile-wifi-cancel') {
    mobileWifiModal = false;
    render();
  }

  if (a === 'mobile-wifi-disconnect') {
    const m = state.networkEntities?.mobile;
    const r = state.networkEntities?.router;
    if (m && r) {
      disconnectMobileWifi(m, r);
      mobileRdpConnected = false;
      save();
      toast('Mobile Wi-Fi disconnected.');
      render();
    }
  }

  if (a === 'mobile-quick-ping') {
    const host = b.dataset.host;
    if (host) {
      const res = simulatePing('mobile', host, state);
      mobilePingOutput = res.output;
      if (host === '192.168.1.1' && state.networkEntities?.mobile?.wifi?.connected) {
        state.verifiedChecks.mobile_ping_gw = true;
      }
      if ((host === '192.168.1.10' || host === state.network?.ip) && state.networkEntities?.mobile?.wifi?.connected) {
        state.verifiedChecks.mobile_ping_server = true;
        state.verifiedChecks.mobile_ping_srv = true;
      }
      save();
      render();
    }
  }

  if (a === 'mobile-router-tab') {
    mobileRouterTab = b.dataset.tab || 'status';
    render();
  }

  if (a === 'mobile-router-logout') {
    logoutRouter(state.networkEntities?.router);
    toast('Logged out of router on mobile.');
    render();
  }

  if (a === 'mobile-router-reboot') {
    rebootRouter(state.networkEntities?.router);
    toast('Router rebooted successfully.');
    render();
  }

  if (a === 'guide' || a === 'hint') {
    guideOpen = true;
    resetOpen = false;
    render();
  }

  if (a === 'close-guide' || a === 'lab') {
    guideOpen = false;
    resetOpen = false;
    render();
  }

  if (a === 'fullscreen') {
    fullscreen = !fullscreen;
    render();
  }

  if (a === 'reset') {
    guideOpen = true;
    resetOpen = true;
    render();
  }

  if (a === 'confirm-reset') {
    sim.clear();
    state = initialState();
    expanded = 0;
    guideOpen = resetOpen = false;
    mobileOpen = false;
    save();
    render();
    toast('Your lab has been reset for a fresh start.');
  }

  if (a.startsWith('os-')) {
    sim.action(a.slice(3), b, e);
  }
});

document.addEventListener('change', e => {
  if (e.target.dataset.action === 'mobile-toggle-wifi') {
    const m = state.networkEntities?.mobile;
    const r = state.networkEntities?.router;
    if (m) {
      m.wifi = m.wifi || {};
      m.wifi.enabled = e.target.checked;
      if (!m.wifi.enabled && r) {
        disconnectMobileWifi(m, r);
        mobileRdpConnected = false;
        toast('Mobile Wi-Fi disabled.');
      } else {
        toast('Mobile Wi-Fi enabled.');
      }
      save();
      render();
    }
  }
});

document.addEventListener('submit', e => {
  if (e.target.dataset.form === 'mobile-connect-form') {
    e.preventDefault();
    const pass = new FormData(e.target).get('passphrase') || '';
    const m = state.networkEntities?.mobile;
    const r = state.networkEntities?.router;
    if (m && r) {
      const res = connectMobileWifi(m, r, pass);
      if (!res.success) {
        toast(res.error || 'Failed to connect to wireless network.');
      } else {
        toast(`Connected to ${r.wlan.ssid}. Assigned IP: ${res.ip}`);
        mobileWifiModal = false;
        save();
      }
      render();
    }
  }

  if (e.target.dataset.form === 'mobile-rdp-connect') {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.target));
    const isWifiConnected = !!(state.networkEntities?.mobile?.wifi?.associatedSsid && state.networkEntities?.mobile?.wifi?.ip);
    if (!isWifiConnected) {
      mobileRdpError = 'Error 0x104: Phone must be connected to Wi-Fi to reach the server.';
      render();
      return;
    }
    if (!state.remoteDesktop?.enabled) {
      mobileRdpError = "Error 0x204: Remote Desktop is disabled on host server 'WIN-SERVER'. Enable it in System Properties.";
      toast("Remote Desktop connection failed (0x204): Remote access disabled on server.");
      render();
      return;
    }
    mobileRdpConnected = true;
    mobileRdpError = '';
    state.verifiedChecks.rdp_tested = true;
    state.verifiedChecks.mobile_rdp_tested = true;
    save();
    toast('Remote Desktop connected to WIN-SERVER.');
    render();
    return;
  }

  if (e.target.dataset.form === 'mobile-router-login' || e.target.dataset.form === 'router-login') {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.target));
    const r = state.networkEntities?.router;
    if (r) {
      const res = loginRouter(r, d.username, d.password);
      if (res.success) {
        toast('Logged in to TP-LINK Router.');
        save();
      } else {
        toast('Login failed: Invalid credentials. Default is admin / admin.');
      }
      render();
      return;
    }
  }

  if (e.target.dataset.form === 'mobile-ping-form') {
    e.preventDefault();
    const host = (new FormData(e.target).get('host') || '').trim();
    if (host) {
      const res = simulatePing('mobile', host, state);
      mobilePingOutput = res.output;
      if (host === '192.168.1.1' && state.networkEntities?.mobile?.wifi?.connected) {
        state.verifiedChecks.mobile_ping_gw = true;
      }
      if ((host === '192.168.1.10' || host === state.network?.ip) && state.networkEntities?.mobile?.wifi?.connected) {
        state.verifiedChecks.mobile_ping_server = true;
        state.verifiedChecks.mobile_ping_srv = true;
      }
      save();
      render();
    }
  }

  if (e.target.dataset.form?.startsWith('mobile-router-')) {
    e.preventDefault();
    const formType = e.target.dataset.form.replace('mobile-router-', '');
    const d = Object.fromEntries(new FormData(e.target));
    const r = state.networkEntities?.router;
    if (r) {
      if (formType === 'wan') updateRouterWan(r, d);
      if (formType === 'lan') updateRouterLan(r, d.ip, d.mask);
      if (formType === 'wireless') updateRouterWlan(r, { enabled: d.enabled === 'on', ssid: d.ssid, channel: +d.channel });
      if (formType === 'security') updateRouterWlan(r, { security: d.security, passphrase: d.passphrase });
      if (formType === 'dhcp') updateRouterDhcp(r, { enabled: d.enabled === 'true', start: d.start, end: d.end, leaseTimeMinutes: +d.leaseTimeMinutes, gateway: d.gateway, dns: d.dns });
      save();
      toast(`Router ${formType.toUpperCase()} updated from mobile client.`);
      render();
    }
  }
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (mobileWifiModal) {
      mobileWifiModal = false;
      render();
      return;
    }
    if (guideOpen) {
      guideOpen = resetOpen = false;
      render();
      return;
    }
    if (mobileOpen) {
      mobileOpen = false;
      render();
    }
  }
});

if (document.modelContext?.registerTool) {
  try {
    document.modelContext.registerTool({
      name: 'read_lab_progress',
      title: 'Read server lab progress',
      description: 'Read the simulated machine status, active lab, and checklist progress.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true },
      execute: input => {
        if (!input || typeof input !== 'object' || Object.keys(input).length) throw new Error('Expected an empty object.');
        const curLab = state.activeLab || 'lab1';
        return {
          screen: state.screen,
          poweredOn: state.power,
          activeLab: curLab,
          domain: state.domain || null,
          progress: progress(state, curLab),
          checks: checks(state, curLab),
          router: state.networkEntities?.router ? {
            lan: state.networkEntities.router.lan,
            wlan: state.networkEntities.router.wlan,
            dhcp: state.networkEntities.router.dhcp
          } : null,
          mobile: state.networkEntities?.mobile ? {
            connected: state.networkEntities.mobile.wifi?.connected,
            ip: state.networkEntities.mobile.wifi?.ip
          } : null
        };
      }
    });
  } catch {}
}

render();
