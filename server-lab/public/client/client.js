import {initialState, cleanState, phases, checks, progress} from './engine.js';
import {createSimulator} from './os.js';

const $ = (selector) => document.querySelector(selector);
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
const paths = {
  server:'M4 3h16v7H4z M4 14h16v7H4z M7 6.5h1 M7 17.5h1 M12 6.5h5 M12 17.5h5',
  power:'M12 2v10 M5.5 5.5a9 9 0 1 0 13 0',
  network:'M8 3h8v6H8z M3 15h6v6H3z M15 15h6v6h-6z M12 9v3 M6 15v-3h12v3',
  monitor:'M3 4h18v13H3z M12 17v4 M8 21h8',
  check:'M5 12l4 4L19 6', book:'M3 4h7l2 2 2-2h7v15h-7l-2 2-2-2H3z M12 6v15',
  folder:'M3 5h7l2 3h9v12H3z', user:'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M4 21v-3a8 6 0 0 1 16 0v3',
  terminal:'M3 4h18v16H3z M6 8l4 4-4 4 M13 16h5',
  settings:'M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8 M8 3h8l1 4 4 1v8l-4 1-1 4H8l-1-4-4-1V8l4-1z',
  flag:'M5 22V3 M5 3c5-4 9 4 15 0v11c-6 4-10-4-15 0',
  disk:'M4 3h16v18H4z M8 7h8 M9 16a3 3 0 1 0 6 0 3 3 0 0 0-6 0',
  windows:'M3 4l8-1v8H3z M13 3l8-1v9h-8z M3 13h8v8l-8-1z M13 13h8v9l-8-1z',
  trash:'M3 6h18 M9 6V3h6v3 M6 6l1 15h10l1-15 M10 10v7 M14 10v7',
};
const icon = (name) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name] || paths.server}"/></svg>`;

const hints = [
  'In this server’s Config panel, click Insert bootable device. Connect Ethernet to a powered switch. Power on, enter BIOS, open Boot, select UEFI: Ventoy USB, then Save & Exit. Select the ISO and Boot in normal mode. The media is consumed after one completed installation.',
  'Choose Server with a GUI, accept the simulated license, choose Custom, and install on Drive 0. After restarting, set a fictional Administrator password with at least 8 characters and 3 character types.',
  'In Server Manager, use Manage → Add Roles and Features → Active Directory Domain Services. Then AD DS → More → Promote this server → Add a new forest. Use Windows Server 2012 R2 functional levels, set a DSRM password, install, and restart.',
  'Open Tools → Active Directory Users and Computers. Right-click the domain → New → Organizational Unit, then clear protection from accidental deletion. Create a user in that OU; clear User must change password and select Password never expires.',
  'Create a desktop folder, open its Properties → Sharing → Advanced Sharing, and enable Share this folder. In Permissions, allow Full Control, confirm both dialogs, then open the Security tab.',
];

let state = initialState();
let deviceId = null;
let missionOpen = false;
let initialized = false;
let readyTimer;
let toastTimer;
let readableDisplay = typeof window.matchMedia === 'function' && window.matchMedia('(max-width:650px)').matches;
const pendingPings = new Map();

function send(message) {
  if (window.parent !== window) window.parent.postMessage(message, location.origin);
}

function publish() {
  if (initialized) send({type:'serverlab:state', deviceId, os:state});
}

function toast(message) {
  const element = $('#toast');
  element.textContent = message;
  element.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => element.classList.remove('show'), 4000);
}

function ping(target) {
  return new Promise((resolve) => {
    const requestId = crypto.randomUUID();
    const timer = setTimeout(() => {
      pendingPings.delete(requestId);
      resolve({ok:false, message:'The lab did not respond to this ping. Try again.'});
    }, 5000);
    pendingPings.set(requestId, {resolve, timer});
    send({type:'serverlab:ping', deviceId, requestId, target});
  });
}

const sim = createSimulator({
  get:() => state, icon, esc, toast, render, ping,
  commit(changes, message) {
    // Reinstalling erases the simulated disk, while the lab still owns the NIC and chassis name.
    if (changes.installed === true && changes.screen === 'installing') {
      changes = {...changes, network:state.network, computerName:state.computerName};
    }
    Object.assign(state, changes);
    if (message) state.events = [{message, time:new Date().toLocaleTimeString()}, ...state.events].slice(0, 50);
    publish();
    render();
  },
});

function fitScreen() {
  const viewport = $('#viewport');
  const fit = Math.min(viewport.clientWidth / 1000, viewport.clientHeight / 625);
  const scale = readableDisplay ? Math.max(.85, fit) : fit;
  $('#screen').style.setProperty('--scale', scale);
  $('#screen-surface').style.width = `${1000 * scale}px`;
  $('#screen-surface').style.height = `${625 * scale}px`;
  $('#display-button').textContent = readableDisplay ? 'Fit display' : 'Readable';
  $('#display-button').setAttribute('aria-pressed', String(readableDisplay));
}

function render() {
  if (!initialized) return;
  const mission = progress(state);
  $('#computer-name').textContent = state.computerName;
  $('#power-led').classList.toggle('on', state.power);
  $('#power-status').textContent = state.power ? 'ONLINE' : 'STANDBY';
  $('#power-button').textContent = state.power ? 'Power off' : 'Power on';
  $('#power-button').disabled = false;
  $('#bios-button').disabled = !state.power || !['post','bios','no-boot','boot-menu'].includes(state.screen);
  $('#restart-button').disabled = !state.power;
  $('#mission-percent').textContent = `${mission.percent}%`;
  $('#hardware-status').textContent = `USB ${state.usb ? 'connected' : 'disconnected'}  ·  Ethernet ${state.ethernet ? 'link up' : 'disconnected'}  ·  ${state.network.ip}`;
  $('#screen').innerHTML = sim.screen() || `<div class="screen-off"><div class="off-icon">${icon('power')}</div><div class="off-label">${esc(state.computerName)} / STANDBY</div><h2>Your server is ready to begin.</h2><p>Connect the USB installer and Ethernet in your lab.<br>Power on to enter BIOS and install Windows Server.</p><button class="green-btn" type="button" data-action="power">${icon('power')} Power on server</button><div class="off-footer"><span>4 vCPU</span><span>8 GB RAM</span><span>120 GB SSD</span><span>UEFI BIOS</span></div></div>`;
  fitScreen();
  if (missionOpen) renderMission();
}

function renderMission() {
  const mission = progress(state);
  const completed = checks(state);
  const keepFocus = $('.client-mission')?.contains(document.activeElement);
  const focusedPhase = document.activeElement?.closest('details')?.dataset.phase;
  const openPhases = [...document.querySelectorAll('.client-mission details[open]')].map((element) => Number(element.dataset.phase));
  $('#mission-layer').innerHTML = `<div class="client-mission-backdrop" data-action="mission-backdrop"><section class="client-mission" id="mission-drawer" role="dialog" aria-modal="true" aria-labelledby="mission-title" tabindex="-1"><header><div><div class="mission-label">Your active operation</div><h1 id="mission-title">Build your first domain.</h1></div><button class="mission-close" type="button" data-action="close-mission" aria-label="Close mission">×</button></header><p>Install your server, create an organization, and prepare its shared files. Your lab tracks every step.</p><div class="mission-progress-label"><span>${mission.done} / ${mission.total} objectives complete</span><span>${mission.percent}%</span></div><progress value="${mission.done}" max="${mission.total}" aria-label="Windows Server mission progress"></progress>${phases.map((phase, index) => `<details data-phase="${index}" ${(openPhases.length ? openPhases.includes(index) : index === mission.phase) ? 'open' : ''}><summary><span><span class="phase-number">${String(index + 1).padStart(2, '0')}</span>${phase.title}</span><small>${phase.items.filter(([key]) => completed[key]).length}/${phase.items.length}</small></summary><ul>${phase.items.map(([key, title]) => `<li class="${completed[key] ? 'done' : ''}"><span aria-label="${completed[key] ? 'Complete' : 'Incomplete'}">${completed[key] ? '✓' : '○'}</span><span>${title}</span></li>`).join('')}</ul><div class="mission-hint"><b>Field notes</b><br>${hints[index]}</div></details>`).join('')}${mission.done === mission.total ? '<div class="mission-complete">Mission accomplished. Your domain, users, and shared folder are ready. Return to the lab to connect your client computer.</div>' : ''}<p>Use fictional passwords. This client simulates an operating system; it does not run real Windows software.</p></section></div>`;
  if (keepFocus) {
    const target = focusedPhase === undefined ? $('.mission-close') : document.querySelector(`.client-mission details[data-phase="${focusedPhase}"] summary`);
    target?.focus();
  }
}

function closeMission() {
  missionOpen = false;
  $('#mission-layer').replaceChildren();
  $('.client-shell').inert = false;
  $('#mission-button').setAttribute('aria-expanded', 'false');
  $('#mission-button').focus();
}

function applyHardware(data, initial = false) {
  let changed = initial;
  const hardware = data.hardware || {};
  for (const key of ['usb', 'ethernet']) {
    if (typeof hardware[key] === 'boolean' && state[key] !== hardware[key]) {
      state[key] = hardware[key];
      changed = true;
    }
  }
  if (data.network && typeof data.network === 'object') {
    for (const key of ['ip', 'mask', 'gateway', 'dns']) {
      if (typeof data.network[key] === 'string' && state.network[key] !== data.network[key]) {
        state.network[key] = data.network[key];
        changed = true;
      }
    }
  }
  if (typeof data.name === 'string' && data.name && state.computerName !== data.name) {
    state.computerName = data.name;
    changed = true;
  }
  if (!state.usb && state.screen === 'installing') {
    sim.clear();
    state.screen = 'setup';
    changed = true;
    toast('Installation interrupted: USB media disconnected. Reconnect the drive and retry.');
  }
  if (!state.usb && state.installed && state.adminSet && state.bootDevice === 'usb') {
    state.bootDevice = 'disk';
    changed = true;
  }
  if (typeof hardware.power === 'boolean' && state.power !== hardware.power) {
    sim.power();
    return;
  }
  if (changed) {
    publish();
    render();
  }
}

window.addEventListener('message', (event) => {
  if (event.origin !== location.origin || event.source !== window.parent) return;
  const data = event.data;
  if (!data || typeof data !== 'object') return;
  if (data.type === 'serverlab:init' && typeof data.deviceId === 'string') {
    if (initialized && data.deviceId === deviceId) return;
    sim.clear();
    deviceId = data.deviceId;
    state = cleanState(data.os);
    // POST has no timer or unsaved wizard state, so it can be restored exactly.
    if (data.os?.version === 1 && data.os.screen === 'post') Object.assign(state, {screen:'post', power:true});
    initialized = true;
    clearInterval(readyTimer);
    applyHardware(data, true);
  } else if (data.type === 'serverlab:hardware' && initialized && data.deviceId === deviceId) {
    applyHardware(data);
  } else if (data.type === 'serverlab:ping-result' && typeof data.requestId === 'string') {
    const pending = pendingPings.get(data.requestId);
    if (!pending) return;
    clearTimeout(pending.timer);
    pendingPings.delete(data.requestId);
    pending.resolve({ok:!!data.ok, message:String(data.message ?? 'No reply received.')});
  }
});

document.addEventListener('click', (event) => {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const action = button.dataset.action;
  if (action === 'display') {
    readableDisplay = !readableDisplay;
    fitScreen();
  } else if (action === 'mission') {
    missionOpen = true;
    $('.client-shell').inert = true;
    $('#mission-button').setAttribute('aria-expanded', 'true');
    renderMission();
    $('.mission-close').focus();
  } else if (action === 'close-mission' || (action === 'mission-backdrop' && event.target === button)) {
    closeMission();
  } else if (!initialized || missionOpen) {
    return;
  } else if (action === 'power') {
    sim.power();
  } else if (action === 'bios' && state.power) {
    sim.action('bios');
  } else if (action === 'restart' && state.power) {
    sim.action('restart');
  } else if (action.startsWith('os-')) {
    sim.action(action.slice(3), button, event);
  }
});

document.addEventListener('keydown', (event) => {
  if (!missionOpen) return;
  event.stopImmediatePropagation();
  if (event.key === 'Escape') { event.preventDefault(); closeMission(); }
  if (event.key === 'Tab') {
    const controls = [...document.querySelectorAll('.client-mission button, .client-mission summary')];
    const first = controls[0], last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
}, true);

new ResizeObserver(fitScreen).observe($('#viewport'));
fitScreen();
send({type:'serverlab:ready'});
readyTimer = setInterval(() => {
  if (!initialized) send({type:'serverlab:ready'});
}, 500);
