import {createInitialNetworkState} from './network.js';

export const SAVE_SCHEMA_VERSION = 2;
export const VERSION = SAVE_SCHEMA_VERSION;

export const DEFAULT_WINDOWS_SERVICES = [
  { name: 'ADWS', displayName: 'Active Directory Web Services', status: 'Running', startup: 'Automatic' },
  { name: 'NTDS', displayName: 'Active Directory Domain Services', status: 'Running', startup: 'Automatic' },
  { name: 'DNS', displayName: 'DNS Server', status: 'Running', startup: 'Automatic' },
  { name: 'DHCPServer', displayName: 'DHCP Server', status: 'Running', startup: 'Automatic' },
  { name: 'TermService', displayName: 'Remote Desktop Services', status: 'Running', startup: 'Manual' },
  { name: 'LanmanServer', displayName: 'Server', status: 'Running', startup: 'Automatic' },
  { name: 'LanmanWorkstation', displayName: 'Workstation', status: 'Running', startup: 'Automatic' },
  { name: 'MpsSvc', displayName: 'Windows Firewall', status: 'Stopped', startup: 'Disabled' },
  { name: 'Spooler', displayName: 'Print Spooler', status: 'Running', startup: 'Automatic' },
  { name: 'W32Time', displayName: 'Windows Time', status: 'Running', startup: 'Automatic' }
];

export function initialState() {
  return {
    version: SAVE_SCHEMA_VERSION,
    saveSchemaVersion: SAVE_SCHEMA_VERSION,
    activeLab: 'lab1',
    power: false,
    screen: 'off',
    usb: false,
    ethernet: false,
    bootDevice: 'disk',
    biosVisited: false,
    ventoyBooted: false,
    installed: false,
    adminSet: false,
    roles: [],
    domain: '',
    promoted: false,
    restarted: false,
    functionalLevel: 'Windows Server 2012 R2',
    ous: [],
    users: [],
    groups: [],
    folders: [],
    securityVisited: false,
    network: {
      dhcp: true,
      ip: '192.168.1.10',
      mask: '255.255.255.0',
      gateway: '192.168.1.1',
      dns: '127.0.0.1'
    },
    firewall: {
      enabled: false,
      domain: false,
      private: false,
      public: false
    },
    remoteDesktop: {
      enabled: false,
      nla: true,
      allowedUsers: ['Administrator']
    },
    services: structuredClone(DEFAULT_WINDOWS_SERVICES),
    networkEntities: createInitialNetworkState(),
    verifiedChecks: {
      mobile_ping_gw: false,
      mobile_ping_server: false,
      mobile_browse: false,
      rdp_tested: false,
      monitor_proc: false,
      monitor_svc: false
    },
    computerName: 'WIN-SERVER',
    events: [],
    startedAt: Date.now()
  };
}

// Lab 01: System Administration (Domain & AD DS) - 16 tasks
export const phases = [
  {title:'Connect & boot',subtitle:'Get your server ready',items:[['usb','Insert the Ventoy USB drive'],['ethernet','Connect the Ethernet cable'],['bios','Enter BIOS setup'],['ventoy','Boot from Ventoy']]},
  {title:'Install Windows Server',subtitle:'Build your operating system',items:[['installed','Install Windows Server 2012 R2'],['admin','Set the Administrator password']]},
  {title:'Create your domain',subtitle:'Configure Active Directory',items:[['role','Add the AD DS server role'],['domain','Promote: add a new forest'],['restart','Restart the domain controller']]},
  {title:'Organize & add users',subtitle:'Give your domain a structure',items:[['ou','Create an unprotected organizational unit'],['user','Create a user in that OU'],['password','Configure the user password options']]},
  {title:'Create a shared folder',subtitle:'Prepare for folder redirection',items:[['folder','Create a folder'],['share','Enable advanced sharing'],['full','Allow Full Control in share permissions'],['security','Open the folder Security tab']]}
];

// Lab 02: Network & Router Lab (TP-Link Administration & Mobile Client)
export const lab2Phases = [
  {title:'Router LAN & WAN Setup',subtitle:'Configure gateway and mobile data uplink',items:[['router_lan','Verify router LAN IP is 192.168.1.1'],['router_wan','Verify WAN uplink using mobile data']]},
  {title:'DHCP Server Configuration',subtitle:'Set up the router address pool',items:[['router_dhcp','Enable DHCP with pool 192.168.1.100-199']]},
  {title:'Wireless LAN (WLAN) Setup',subtitle:'Broadcast your wireless network',items:[['router_wlan','Configure WLAN SSID SERVERLAB-WIFI'],['router_security','Configure WPA2-PSK security passphrase']]},
  {title:'Client Connectivity',subtitle:'Connect mobile device to WLAN',items:[['mobile_connect','Connect mobile client to SERVERLAB-WIFI'],['mobile_lease','Verify mobile client DHCP lease']]},
  {title:'Verification & Testing',subtitle:'Confirm end-to-end data communication',items:[['mobile_ping_gw','Ping router gateway (192.168.1.1) from mobile'],['mobile_ping_server','Ping Windows Server (192.168.1.10) from mobile'],['mobile_browse','Access router management page from mobile browser']]}
];

// Lab 03: Security & Monitoring (Groups, Firewall, Remote Desktop & Tasks)
export const lab3Phases = [
  {title:'Initial OS & Network',subtitle:'Harden configuration for domain server',items:[['server_name','Configure computer name'],['server_ip','Configure static IPv4 & 127.0.0.1 DNS'],['firewall_off','Configure Windows Firewall per classroom instructions']]},
  {title:'User, Group & File Management',subtitle:'Active Directory group security',items:[['sec_group','Create an AD DS Security Group'],['group_member','Add a domain user to the Security Group']]},
  {title:'Remote Desktop Configuration',subtitle:'Enable remote management',items:[['rdp_enabled','Enable Remote Desktop on this server'],['rdp_tested','Test Remote Desktop connection']]},
  {title:'Process & System Monitoring',subtitle:'Inspect system health and services',items:[['monitor_proc','Open Task Manager and inspect running processes'],['monitor_svc','Inspect Windows Server services']]}
];

export const allLabs = [
  { id: 'lab1', num: '01', title: 'Lab 01: System Administration', subtitle: 'Build your first domain & Active Directory', phases: phases },
  { id: 'lab2', num: '02', title: 'Lab 02: Network & Router Lab', subtitle: 'Wi-Fi router, mobile client & DHCP/WLAN', phases: lab2Phases },
  { id: 'lab3', num: '03', title: 'Lab 03: Security & Monitoring', subtitle: 'Firewall, groups, Remote Desktop & processes', phases: lab3Phases }
];

export function getPhasesForLab(labId = 'lab1') {
  if (labId === 'lab2') return lab2Phases;
  if (labId === 'lab3') return lab3Phases;
  return phases;
}

export function checks(s, labId = s?.activeLab || 'lab1') {
  if (labId === 'lab2') {
    const r = s.networkEntities?.router;
    const m = s.networkEntities?.mobile;
    const vc = s.verifiedChecks || {};
    return {
      router_lan: r?.lan?.ip === '192.168.1.1',
      router_wan: !!r?.wan?.connected,
      router_dhcp: !!r?.dhcp?.enabled && r?.dhcp?.start === '192.168.1.100',
      router_wlan: !!r?.wlan?.enabled && r?.wlan?.ssid === 'SERVERLAB-WIFI',
      router_security: r?.wlan?.security === 'WPA2-PSK' && !!r?.wlan?.passphrase,
      mobile_connect: m?.wifi?.associatedSsid === 'SERVERLAB-WIFI',
      mobile_lease: !!m?.wifi?.ip && m?.wifi?.ip.startsWith('192.168.1.'),
      mobile_ping_gw: !!vc.mobile_ping_gw,
      mobile_ping_server: !!vc.mobile_ping_server,
      mobile_browse: !!vc.mobile_browse
    };
  }

  if (labId === 'lab3') {
    const vc = s.verifiedChecks || {};
    const hasGroup = (s.groups || []).length > 0;
    const hasMember = (s.groups || []).some(g => (g.members || []).length > 0);
    return {
      server_name: !!s.computerName && s.computerName.length > 0,
      server_ip: !s.network.dhcp && s.network.ip === '192.168.1.10' && s.network.dns === '127.0.0.1',
      firewall_off: s.firewall?.enabled === false,
      sec_group: hasGroup,
      group_member: hasMember,
      rdp_enabled: !!s.remoteDesktop?.enabled,
      rdp_tested: !!vc.rdp_tested,
      monitor_proc: !!vc.monitor_proc,
      monitor_svc: !!vc.monitor_svc
    };
  }

  // Default: Lab 01 (16 tasks)
  const ou = s.ous.find(o => !o.protected);
  const user = s.users.find(u => s.ous.some(o => o.id === u.ou && !o.protected));
  const shares = s.folders.filter(f => f.shared);
  return {
    usb: s.usb,
    ethernet: s.ethernet,
    bios: s.biosVisited,
    ventoy: s.ventoyBooted,
    installed: s.installed,
    admin: s.adminSet,
    role: s.roles.includes('AD DS'),
    domain: s.promoted,
    restart: s.restarted,
    ou: !!ou,
    user: !!user,
    password: s.users.some(u => s.ous.some(o => o.id === u.ou && !o.protected) && !u.mustChange && u.neverExpires),
    folder: s.folders.length > 0,
    share: shares.length > 0,
    full: shares.some(f => f.fullControl),
    security: shares.some(f => f.fullControl && f.securityVisited)
  };
}

export function progress(s, labId = s?.activeLab || 'lab1') {
  const currentPhases = getPhasesForLab(labId);
  const c = checks(s, labId);
  const total = currentPhases.reduce((n, p) => n + p.items.length, 0);
  const done = Object.values(c).filter(Boolean).length;
  return {
    done,
    total,
    percent: Math.round(done / total * 100),
    phase: Math.max(0, currentPhases.findIndex(p => p.items.some(([key]) => !c[key])))
  };
}

export function validDomain(value) {
  return /^(?=.{3,253}$)([a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,63}$/.test(value);
}

export function validPassword(value) {
  return value.length >= 8 && [/[A-Z]/,/[a-z]/,/\d/,/[^A-Za-z0-9]/].filter(r => r.test(value)).length >= 3;
}

export function validIP(value) {
  return /^(\d{1,3}\.){3}\d{1,3}$/.test(value) && value.split('.').every(v => Number(v) >= 0 && Number(v) <= 255);
}

export function cleanState(raw) {
  const fresh = initialState();
  if (!raw || (raw.version !== 1 && raw.version !== SAVE_SCHEMA_VERSION && raw.saveSchemaVersion !== SAVE_SCHEMA_VERSION)) {
    return fresh;
  }
  const s = {
    ...fresh,
    ...raw,
    version: SAVE_SCHEMA_VERSION,
    saveSchemaVersion: SAVE_SCHEMA_VERSION,
    activeLab: raw.activeLab || 'lab1'
  };
  s.network = { ...fresh.network, ...(raw.network || {}) };
  s.firewall = { ...fresh.firewall, ...(raw.firewall || {}) };
  s.remoteDesktop = { ...fresh.remoteDesktop, ...(raw.remoteDesktop || {}) };
  s.verifiedChecks = { ...fresh.verifiedChecks, ...(raw.verifiedChecks || {}) };

  if (!raw.networkEntities) {
    s.networkEntities = createInitialNetworkState();
  } else {
    s.networkEntities = {
      router: { ...fresh.networkEntities.router, ...(raw.networkEntities.router || {}) },
      mobile: { ...fresh.networkEntities.mobile, ...(raw.networkEntities.mobile || {}) },
      firewall: { ...fresh.networkEntities.firewall, ...(raw.networkEntities.firewall || {}) }
    };
  }

  for (const k of ['roles', 'ous', 'users', 'groups', 'folders', 'events', 'services']) {
    if (!Array.isArray(s[k])) s[k] = fresh[k] || [];
  }
  if (['installing', 'restarting', 'post'].includes(s.screen)) {
    s.screen = s.adminSet ? 'desktop' : s.installed ? 'password' : 'off';
  }
  if (raw.screen === 'restarting' && s.adminSet && s.promoted) {
    s.restarted = true;
  }
  s.power = s.screen !== 'off';
  return s;
}
