/** The simulation owns no DOM, storage, timers, or network requests. */
export type DeviceKind = 'computer' | 'server' | 'switch' | 'router' | 'firewall' | 'usb'
export type LinkKind = 'ethernet' | 'usb'
export type LabFile = { id: string; name: string; content: string; shared: boolean; shareName?: string; fullControl?: boolean }
export type SharedFile = { deviceId: string; deviceName: string; fileId: string; name: string; shareName: string; content: string; writable: boolean }
export type RouterConfig = { ssid: string; wirelessEnabled: boolean; security: 'WPA2-Personal' | 'Open'; password: string }
export type Device = {
  id: string
  kind: DeviceKind
  name: string
  x: number
  y: number
  power: boolean
  ip: string
  mask: string
  gateway: string
  dns: string
  os: Record<string, any>
  joinedDomain?: string
  bootMedia?: 'available' | 'inserted' | 'used'
  files?: LabFile[]
  router?: RouterConfig
}
export type Link = { id: string; source: string; target: string; sourcePort: string; targetPort: string; kind: LinkKind }
export type LabEvent = { id: string; time: number; message: string; level: 'info' | 'success' | 'warning' }
export type LabState = {
  schemaVersion: 2
  devices: Record<string, Device>
  links: Record<string, Link>
  events: LabEvent[]
  mode: 'guided' | 'sandbox'
  createdAt: number
}
export type LabCommand =
  | { type: 'ADD_DEVICE'; kind: DeviceKind; x: number; y: number }
  | { type: 'MOVE_DEVICE'; id: string; x: number; y: number }
  | { type: 'REMOVE_DEVICE'; id: string }
  | { type: 'CONNECT'; source: string; target: string; sourcePort?: string; targetPort?: string }
  | { type: 'DISCONNECT'; id: string }
  | { type: 'POWER'; id: string }
  | { type: 'INSERT_BOOT_MEDIA'; id: string }
  | { type: 'EJECT_BOOT_MEDIA'; id: string }
  | { type: 'UPDATE_NETWORK'; id: string; ip: string; mask: string; gateway: string; dns: string }
  | { type: 'OS_SYNC'; id: string; os: Record<string, any> }
  | { type: 'RENAME'; id: string; name: string }
  | { type: 'JOIN_DOMAIN'; id: string; domain: string }
  | { type: 'FILE_CREATE'; id: string; name: string; content: string }
  | { type: 'FILE_UPDATE'; id: string; fileId: string; content: string }
  | { type: 'FILE_DELETE'; id: string; fileId: string }
  | { type: 'FILE_SHARE'; id: string; fileId: string; shared: boolean }
  | { type: 'FILE_WRITE_REMOTE'; sourceId: string; targetId: string; fileId: string; content: string }
  | { type: 'ROUTER_CONFIG'; id: string; config: RouterConfig }
  | { type: 'SET_MODE'; mode: LabState['mode'] }
  | { type: 'RESET' }
export type Command = LabCommand
export type Objective = { id: string; title: string; detail: string; done: boolean; hint: string }
export type PingResult = { ok: boolean; message: string; path: string[] }

export const deviceCatalog: Record<DeviceKind, { label: string; description: string; prefix: string; ports: number }> = {
  computer: { label: 'Workstation', description: 'A ready-to-use PC for files, networking, and your domain.', prefix: 'PC', ports: 1 },
  server: { label: 'Server', description: 'Build a Windows Server domain controller.', prefix: 'DC', ports: 2 },
  switch: { label: 'Switch', description: 'Connect up to 8 Ethernet devices.', prefix: 'SW', ports: 8 },
  router: { label: 'Router', description: 'Route traffic between network segments.', prefix: 'R', ports: 4 },
  firewall: { label: 'Firewall', description: 'A routed network boundary; permits lab traffic.', prefix: 'FW', ports: 4 },
  usb: { label: 'Ventoy USB', description: 'Bootable Windows Server installation media.', prefix: 'USB', ports: 1 },
}

const host = (d: Device) => d.kind === 'server' || d.kind === 'computer'
const router = (d: Device) => d.kind === 'router' || d.kind === 'firewall'
const record = (value: unknown): value is Record<string, any> => value !== null && typeof value === 'object' && !Array.isArray(value)
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)
const safeId = (value: unknown): value is string => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(value) && !['__proto__', 'constructor', 'prototype'].includes(value)
const text = (value: unknown, fallback = '', length = 120) => typeof value === 'string' ? value.slice(0, length) : fallback
const validName = (value: string) => /^[A-Za-z0-9][A-Za-z0-9-]{0,14}$/.test(value)
const validDomain = (value: string) => /^(?=.{3,253}$)([a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,63}$/.test(value)
const ownDevice = (state: LabState, id: string): Device | undefined => Object.hasOwn(state.devices, id) ? state.devices[id] : undefined
const validFileName = (name: unknown): name is string => typeof name === 'string' && name.length > 0 && name.length <= 120 && name === name.trim() && !/[\\/:*?"<>|\u0000-\u001f]/.test(name) && !/[. ]$/.test(name) && !/^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)/i.test(name)
const validContent = (content: unknown): content is string => typeof content === 'string' && content.length <= 65536 && new TextEncoder().encode(content).byteLength <= 65536
const defaultRouter = (): RouterConfig => ({ ssid: 'Serverlab-WiFi', wirelessEnabled: true, security: 'WPA2-Personal', password: 'LabNetwork123' })
function cleanRouter(value: unknown): RouterConfig | undefined {
  if (!record(value) || typeof value.ssid !== 'string' || value.ssid.trim().length < 1 || value.ssid.length > 32 || /[\u0000-\u001f]/.test(value.ssid) || typeof value.wirelessEnabled !== 'boolean' || !['WPA2-Personal', 'Open'].includes(value.security) || typeof value.password !== 'string') return
  if (value.security === 'WPA2-Personal' && (value.password.length < 8 || value.password.length > 63)) return
  return { ssid: value.ssid, wirelessEnabled: value.wirelessEnabled, security: value.security, password: value.security === 'Open' ? '' : value.password }
}
function cleanFiles(value: unknown): LabFile[] {
  if (!Array.isArray(value)) return []
  const ids = new Set<string>(), names = new Set<string>()
  return value.slice(0, 250).filter((file: unknown) => {
    if (!record(file) || !safeId(file.id) || !validFileName(file.name) || !validContent(file.content) || ids.has(file.id) || names.has(file.name.toLowerCase())) return false
    ids.add(file.id); names.add(file.name.toLowerCase()); return true
  }).map((file: LabFile) => ({ id: file.id, name: file.name, content: file.content, shared: file.shared === true, shareName: validFileName(file.shareName) ? file.shareName : file.name, fullControl: file.fullControl === true }))
}

export function validIP(value: string): boolean {
  return /^(0|[1-9]\d{0,2})(\.(0|[1-9]\d{0,2})){3}$/.test(value) && value.split('.').every(part => Number(part) <= 255)
}

function ipNumber(ip: string): number {
  return ip.split('.').reduce((n, part) => (n * 256 + Number(part)) >>> 0, 0)
}

export function validMask(mask: string): boolean {
  if (!validIP(mask)) return false
  const inverted = (~ipNumber(mask)) >>> 0
  // This lab uses ordinary host networks, /1 through /30.
  return inverted >= 3 && inverted < 0x80000000 && ((inverted & (inverted + 1)) >>> 0) === 0
}

function usableAddress(ip: string, mask: string): boolean {
  if (!validIP(ip) || !validMask(mask)) return false
  const first = Number(ip.split('.')[0])
  if (first === 0 || first === 127 || first >= 224) return false
  const hostBits = (ipNumber(ip) & ~ipNumber(mask)) >>> 0
  return hostBits !== 0 && hostBits !== ((~ipNumber(mask)) >>> 0)
}

function sameSubnet(a: Pick<Device, 'ip' | 'mask'>, b: Pick<Device, 'ip' | 'mask'>): boolean {
  return usableAddress(a.ip, a.mask) && usableAddress(b.ip, b.mask)
    && (ipNumber(a.ip) & ipNumber(a.mask)) === (ipNumber(b.ip) & ipNumber(a.mask))
    && (ipNumber(a.ip) & ipNumber(b.mask)) === (ipNumber(b.ip) & ipNumber(b.mask))
}

function networkError(config: Pick<Device, 'ip' | 'mask' | 'gateway' | 'dns'>): string | undefined {
  if (!usableAddress(config.ip, config.mask)) return 'Use a valid host IPv4 address and contiguous subnet mask (/1–/30).'
  if (config.gateway && (!usableAddress(config.gateway, config.mask) || config.gateway === config.ip || !sameSubnet(config, { ip: config.gateway, mask: config.mask }))) return 'The gateway must be a different usable address in this subnet.'
  if (config.dns && (!validIP(config.dns) || config.dns === '0.0.0.0' || Number(config.dns.split('.')[0]) >= 224)) return 'Use a valid unicast DNS server address.'
  return undefined
}

export function createOS(name: string, ip = '192.168.1.10'): Record<string, any> {
  return {
    version: 1, power: false, screen: 'off', usb: false, ethernet: false,
    bootDevice: 'disk', biosVisited: false, ventoyBooted: false, installed: false,
    adminSet: false, roles: [], domain: '', promoted: false, restarted: false,
    functionalLevel: 'Windows Server 2012 R2', ous: [], users: [], folders: [],
    securityVisited: false, network: { dhcp: false, ip, mask: '255.255.255.0', gateway: '192.168.1.1', dns: '192.168.1.10' },
    computerName: name, events: [], startedAt: 0,
  }
}

function makeDevice(id: string, kind: DeviceKind, name: string, x: number, y: number, ip: string): Device {
  const power = kind !== 'computer' && kind !== 'server' && kind !== 'usb'
  const os = createOS(name, ip)
  os.power = power
  if (kind === 'computer') Object.assign(os, { installed: true, adminSet: true, screen: 'desktop' })
  // Routers do not point their own default gateway at themselves.
  const gateway = router({ kind } as Device) || kind === 'switch' || kind === 'usb' ? '' : '192.168.1.1'
  os.network.gateway = gateway
  return { id, kind, name, x, y, power, ip, mask: '255.255.255.0', gateway, dns: '192.168.1.10', os, ...(kind === 'server' ? { bootMedia: 'available' as const, files: [] } : {}), ...(kind === 'computer' ? { files: [] } : {}), ...(kind === 'router' ? { router: defaultRouter() } : {}) }
}

export function createLab(): LabState {
  const createdAt = Date.now()
  const devices = [
    makeDevice('pc-1', 'computer', 'PC-01', 80, 270, '192.168.1.20'),
    makeDevice('server-1', 'server', 'DC-01', 420, 75, '192.168.1.10'),
    makeDevice('switch-1', 'switch', 'SW-01', 415, 290, ''),
    makeDevice('router-1', 'router', 'R-01', 740, 290, '192.168.1.1'),
  ]
  return {
    schemaVersion: 2, devices: Object.fromEntries(devices.map(d => [d.id, d])), links: {},
    mode: 'guided', createdAt,
    events: [{ id: 'event-1', time: createdAt, message: 'Lab ready. Connect your hardware and build your first domain.', level: 'info' }],
  }
}

function event(state: LabState, message: string, level: LabEvent['level'] = 'info'): LabState {
  const last = state.events.at(-1)
  const count = Number(last?.id.match(/\d+$/)?.[0] || 0) + 1
  return { ...state, events: [...state.events.slice(-119), { id: `event-${count}`, time: Math.max(last?.time || 0, state.createdAt) + 1, message, level }] }
}

export function connected(state: LabState, id: string, kind: LinkKind = 'ethernet'): boolean {
  if (kind === 'usb') return ownDevice(state, id)?.bootMedia === 'inserted'
  return Object.values(state.links).some(link => link.kind === kind && (link.source === id || link.target === id))
}

/** Hardware flags are derived, never accepted from a client or saved OS snapshot. */
function syncHardware(state: LabState): LabState {
  const devices = { ...state.devices }
  const ethernet = new Set<string>()
  for (const link of Object.values(state.links)) {
    if (link.kind === 'ethernet') { ethernet.add(link.source); ethernet.add(link.target) }
  }
  for (const d of Object.values(devices)) {
    const wired = ethernet.has(d.id), inserted = d.bootMedia === 'inserted'
    if (d.os.ethernet !== wired || d.os.usb !== inserted) devices[d.id] = { ...d, os: { ...d.os, ethernet: wired, usb: inserted } }
  }
  return { ...state, devices }
}

function freePort(state: LabState, device: Device, kind: LinkKind, requested?: string): string | undefined {
  const total = kind === 'ethernet' ? deviceCatalog[device.kind].ports : device.kind === 'usb' ? 1 : 2
  const prefix = kind === 'ethernet' ? 'eth' : 'usb'
  const used = new Set(Object.values(state.links).flatMap(link => link.source === device.id ? [link.sourcePort] : link.target === device.id ? [link.targetPort] : []))
  if (requested !== undefined) {
    const canonical = /^\d+$/.test(requested) ? `${prefix}-${requested}` : requested
    const index = Number(canonical.slice(prefix.length + 1))
    return canonical === `${prefix}-${index}` && Number.isInteger(index) && index >= 1 && index <= total && !used.has(canonical) ? canonical : undefined
  }
  for (let i = 1; i <= total; i++) if (!used.has(`${prefix}-${i}`)) return `${prefix}-${i}`
  return undefined
}

function nextId(keys: Record<string, unknown>, prefix: string): string {
  let n = 1
  while (Object.hasOwn(keys, `${prefix}-${n}`)) n++
  return `${prefix}-${n}`
}

function setDevice(state: LabState, device: Device): LabState {
  return { ...state, devices: { ...state.devices, [device.id]: device } }
}

/** Sanitizes reloads while preserving supported OS progress and discarding malformed records. */
function cleanOS(raw: unknown, fallback: Record<string, any>, recoverTransient = false): Record<string, any> {
  if (!record(raw)) return { ...fallback }
  const result = { ...fallback }
  for (const key of ['power', 'usb', 'ethernet', 'biosVisited', 'ventoyBooted', 'installed', 'adminSet', 'promoted', 'restarted', 'securityVisited']) {
    if (typeof raw[key] === 'boolean') result[key] = raw[key]
  }
  for (const key of ['domain', 'functionalLevel', 'computerName', 'netbios']) if (typeof raw[key] === 'string') result[key] = text(raw[key], '', 253)
  const screens = ['off', 'post', 'bios', 'boot-menu', 'no-boot', 'ventoy', 'setup', 'installing', 'password', 'restarting', 'login', 'desktop']
  if (screens.includes(raw.screen)) result.screen = raw.screen
  if (raw.bootDevice === 'usb' || raw.bootDevice === 'disk') result.bootDevice = raw.bootDevice
  if (Array.isArray(raw.roles)) result.roles = raw.roles.filter((v: unknown) => typeof v === 'string').slice(0, 30)
  // Existing OS windows expect each record to have string IDs and names.
  for (const key of ['ous', 'users', 'folders']) {
    if (Array.isArray(raw[key])) result[key] = raw[key].filter((value: unknown) => record(value) && typeof value.id === 'string' && typeof value.name === 'string').slice(0, 1000).map((value: Record<string, any>) => {
      const clean: Record<string, any> = { id: text(value.id), name: text(value.name) }
      for (const [field, fieldValue] of Object.entries(value)) {
        if (['__proto__', 'constructor', 'prototype', 'password', 'confirm'].includes(field)) continue
        if (typeof fieldValue === 'boolean' || typeof fieldValue === 'number') clean[field] = fieldValue
        if (typeof fieldValue === 'string') clean[field] = fieldValue.slice(0, 512)
      }
      if (key === 'users') {
        clean.logon = text(clean.logon)
        clean.ou = text(clean.ou)
        clean.passwordSet = value.passwordSet === true
        clean.mustChange = value.mustChange !== false
        clean.neverExpires = value.neverExpires === true
      }
      if (key === 'ous') clean.protected = value.protected !== false
      if (key === 'folders') for (const flag of ['shared', 'fullControl', 'securityVisited', 'allowFull', 'allowChange', 'allowRead', 'denyFull', 'denyChange', 'denyRead', 'change', 'read']) {
        if (flag in value || ['shared', 'fullControl', 'securityVisited'].includes(flag)) clean[flag] = value[flag] === true
      }
      return clean
    })
  }
  if (Array.isArray(raw.events)) result.events = raw.events.filter((v: unknown) => record(v) && typeof v.message === 'string').slice(0, 100).map((v: Record<string, any>) => ({ message: text(v.message, '', 1000), time: text(v.time) }))
  if (finite(raw.startedAt)) result.startedAt = raw.startedAt
  if (record(raw.network)) {
    result.network = { ...fallback.network }
    for (const key of ['ip', 'mask', 'gateway', 'dns']) if (typeof raw.network[key] === 'string') result.network[key] = raw.network[key].slice(0, 15)
    if (typeof raw.network.dhcp === 'boolean') result.network.dhcp = raw.network.dhcp
  }
  if (recoverTransient && ['installing', 'restarting', 'post'].includes(result.screen)) {
    if (result.screen === 'restarting' && result.adminSet && result.promoted) result.restarted = true
    result.screen = result.adminSet ? 'desktop' : result.installed ? 'password' : 'off'
    result.power = result.screen !== 'off'
  }
  if (!result.power) result.screen = 'off'
  return result
}

export function reduceLab(state: LabState, command: LabCommand): LabState {
  if (!record(command) || typeof command.type !== 'string') return event(state, 'Unknown simulation command.', 'warning')
  if (command.type === 'RESET') return createLab()
  if (command.type === 'SET_MODE') {
    if (command.mode !== 'guided' && command.mode !== 'sandbox') return event(state, 'Unknown lab mode.', 'warning')
    return event({ ...state, mode: command.mode }, `${command.mode === 'guided' ? 'Guided mission' : 'Free sandbox'} enabled.`)
  }
  if (command.type === 'ADD_DEVICE') {
    if (!Object.hasOwn(deviceCatalog, command.kind) || !finite(command.x) || !finite(command.y)) return event(state, 'Choose a valid device and position.', 'warning')
    if (command.kind === 'usb') return event(state, 'Boot media is available inside each server console.', 'warning')
    const prefix = command.kind === 'computer' ? 'pc' : command.kind
    const id = nextId(state.devices, prefix)
    let number = Number(id.split('-').at(-1))
    let name = `${deviceCatalog[command.kind].prefix}-${String(number).padStart(2, '0')}`
    while (Object.values(state.devices).some(d => d.name === name)) name = `${deviceCatalog[command.kind].prefix}-${String(++number).padStart(2, '0')}`
    // New devices are unconfigured: duplicates must never silently enter a network.
    const device = makeDevice(id, command.kind, name, command.x, command.y, '')
    device.gateway = ''; device.dns = ''; device.os.network = { ...device.os.network, gateway: '', dns: '' }
    return event(setDevice(state, device), `${name} added to the lab.`, 'success')
  }
  if (command.type === 'CONNECT') {
    const source = ownDevice(state, command.source), target = ownDevice(state, command.target)
    if (!source || !target || source.id === target.id) return event(state, 'Connect two different devices.', 'warning')
    if (source.kind === 'usb' || target.kind === 'usb') return event(state, 'Insert boot media inside the server console.', 'warning')
    const kind: LinkKind = 'ethernet'
    if (Object.values(state.links).some(l => l.kind === kind && (l.source === source.id && l.target === target.id || l.source === target.id && l.target === source.id))) return event(state, 'These devices are already connected.', 'warning')
    const sourcePort = freePort(state, source, kind, command.sourcePort), targetPort = freePort(state, target, kind, command.targetPort)
    if (!sourcePort || !targetPort) return event(state, 'A selected port is unavailable or all compatible ports are occupied.', 'warning')
    const id = nextId(state.links, 'link')
    return event(syncHardware({ ...state, links: { ...state.links, [id]: { id, source: source.id, target: target.id, sourcePort, targetPort, kind } } }), `${source.name} connected to ${target.name} (Ethernet).`, 'success')
  }
  if (command.type === 'DISCONNECT') {
    const link = Object.hasOwn(state.links, command.id) ? state.links[command.id] : undefined
    if (!link) return event(state, 'This connection no longer exists.', 'warning')
    const links = { ...state.links }; delete links[link.id]
    return event(syncHardware({ ...state, links }), 'Cable disconnected.')
  }
  if (command.type === 'FILE_WRITE_REMOTE') {
    const source = ownDevice(state, command.sourceId), target = ownDevice(state, command.targetId)
    const file = target?.files?.find(f => f.id === command.fileId)
    if (!source || !target || !host(source) || !host(target) || !source.os.installed || !target.os.installed || !source.power || !target.power || !file?.shared || !file.fullControl || !ping(state, source.id, target.ip).ok) return event(state, 'Shared file unavailable or write permission denied. Check sharing, power, and network connectivity.', 'warning')
    if (!validContent(command.content)) return event(state, 'File contents must contain at most 64 KiB of text.', 'warning')
    return event(setDevice(state, { ...target, files: target.files!.map(f => f.id === file.id ? { ...f, content: command.content } : f) }), `${source.name} saved ${file.name} on ${target.name}.`, 'success')
  }
  const device = 'id' in command ? ownDevice(state, command.id) : undefined
  if (!device) return event(state, 'This device no longer exists.', 'warning')
  switch (command.type) {
    case 'MOVE_DEVICE':
      if (!finite(command.x) || !finite(command.y)) return event(state, 'Choose a valid position.', 'warning')
      return setDevice(state, { ...device, x: command.x, y: command.y })
    case 'REMOVE_DEVICE': {
      const devices = { ...state.devices }; delete devices[device.id]
      const links = Object.fromEntries(Object.entries(state.links).filter(([, l]) => l.source !== device.id && l.target !== device.id))
      return event(syncHardware({ ...state, devices, links }), `${device.name} removed.`)
    }
    case 'POWER': {
      if (device.kind === 'usb') return event(state, 'A USB drive receives power from its host.', 'warning')
      const power = !device.power
      return event(setDevice(state, { ...device, power, os: { ...device.os, power, screen: power ? device.kind === 'computer' ? 'desktop' : 'post' : 'off' } }), `${device.name} powered ${power ? 'on' : 'off'}.`)
    }
    case 'INSERT_BOOT_MEDIA':
      if (device.kind !== 'server' || device.bootMedia !== 'available') return event(state, device.bootMedia === 'used' ? 'This server has completed its one-time installation. Boot from the installed disk.' : 'Boot media is unavailable for this device.', 'warning')
      return event(setDevice(state, { ...device, bootMedia: 'inserted', os: { ...device.os, usb: true } }), `${device.name}: Ventoy installation media inserted.`, 'success')
    case 'EJECT_BOOT_MEDIA':
      if (device.kind !== 'server' || device.bootMedia !== 'inserted') return event(state, 'No installation media is inserted.', 'warning')
      return event(setDevice(state, { ...device, bootMedia: 'available', os: { ...device.os, usb: false } }), `${device.name}: installation media ejected.`)
    case 'ROUTER_CONFIG': {
      const config = cleanRouter(command.config)
      if (device.kind !== 'router' || !config) return event(state, 'Choose a router, an SSID of 1–32 characters, and a WPA2 password of 8–63 characters.', 'warning')
      return event(setDevice(state, { ...device, router: config }), `${device.name}: wireless settings saved.`, 'success')
    }
    case 'FILE_CREATE':
    case 'FILE_UPDATE':
    case 'FILE_DELETE':
    case 'FILE_SHARE': {
      if (!host(device) || !device.power || !device.os.installed) return event(state, 'Power on an installed computer or server to manage files.', 'warning')
      const files = device.files || []
      if (command.type === 'FILE_CREATE') {
        if (!validFileName(command.name) || !validContent(command.content) || files.length >= 250 || files.some(f => f.name.toLowerCase() === command.name.toLowerCase())) return event(state, 'Use a unique filename without paths or reserved characters, at most 64 KiB of text, and fewer than 250 files.', 'warning')
        const id = nextId(Object.fromEntries(files.map(f => [f.id, f])), 'file')
        return event(setDevice(state, { ...device, files: [...files, { id, name: command.name, content: command.content, shared: false, shareName: command.name, fullControl: true }] }), `${device.name}: created ${command.name}.`, 'success')
      }
      const file = files.find(f => f.id === command.fileId)
      if (!file) return event(state, 'This file no longer exists.', 'warning')
      if (command.type === 'FILE_DELETE') return event(setDevice(state, { ...device, files: files.filter(f => f.id !== file.id) }), `${device.name}: deleted ${file.name}.`)
      if (command.type === 'FILE_SHARE') {
        if (typeof command.shared !== 'boolean') return event(state, 'Choose whether to share this file.', 'warning')
        return event(setDevice(state, { ...device, files: files.map(f => f.id === file.id ? { ...f, shared: command.shared, fullControl: f.fullControl ?? true } : f) }), `${device.name}: ${file.name} ${command.shared ? 'shared on the network' : 'is no longer shared'}.`, 'success')
      }
      if (!validContent(command.content)) return event(state, 'File contents must contain at most 64 KiB of text.', 'warning')
      return event(setDevice(state, { ...device, files: files.map(f => f.id === file.id ? { ...f, content: command.content } : f) }), `${device.name}: saved ${file.name}.`, 'success')
    }
    case 'RENAME': {
      const name = text(command.name).trim().toUpperCase()
      if (!validName(name) || Object.values(state.devices).some(d => d.id !== device.id && d.name.toUpperCase() === name)) return event(state, 'Choose a unique name of 1–15 letters, numbers, or hyphens.', 'warning')
      return event(setDevice(state, { ...device, name, os: { ...device.os, computerName: name } }), `${device.name} renamed to ${name}.`)
    }
    case 'UPDATE_NETWORK': {
      if (device.kind === 'usb') return event(state, 'USB drives do not have network adapters.', 'warning')
      const { ip, mask, gateway, dns } = command
      const error = networkError(command)
      if (error) return event(state, error, 'warning')
      if (Object.values(state.devices).some(d => d.id !== device.id && d.ip === ip)) return event(state, 'Another device already uses this IPv4 address.', 'warning')
      return event(setDevice(state, { ...device, ip, mask, gateway, dns, os: { ...device.os, network: { ...device.os.network, ip, mask, gateway, dns, dhcp: false } } }), `${device.name}: IPv4 configuration saved.`, 'success')
    }
    case 'OS_SYNC': {
      if (!host(device) || !record(command.os)) return event(state, 'This device does not run a desktop operating system.', 'warning')
      const os = cleanOS(command.os, device.os)
      const config = os.network
      const configChanged = ['ip', 'mask', 'gateway', 'dns'].some(k => config[k] !== device[k as keyof Device])
      const error = configChanged && (networkError(config) || Object.values(state.devices).some(d => d.id !== device.id && d.ip && d.ip === config.ip) && 'Another device already uses this IPv4 address.')
      if (error) os.network = { ...device.os.network, ip: device.ip, mask: device.mask, gateway: device.gateway, dns: device.dns }
      const candidateName = text(os.computerName, device.name).toUpperCase()
      const name = validName(candidateName) && !Object.values(state.devices).some(d => d.id !== device.id && d.name === candidateName) ? candidateName : device.name
      os.computerName = name
      const bootMedia = device.kind === 'server' && os.installed && os.adminSet && os.ventoyBooted && ['desktop', 'login'].includes(os.screen) ? 'used' : device.bootMedia
      if (bootMedia === 'used') os.bootDevice = 'disk'
      os.usb = bootMedia === 'inserted'; os.ethernet = connected(state, device.id)
      const updated = setDevice(state, { ...device, bootMedia, name, power: os.power, ip: os.network.ip, mask: os.network.mask, gateway: os.network.gateway, dns: os.network.dns, os })
      const keyChange = ['installed', 'adminSet', 'promoted', 'restarted'].find(key => os[key] && !device.os[key])
      if (error) return event(updated, String(error), 'warning')
      return keyChange ? event(updated, `${name}: ${({ installed: 'operating system installed', adminSet: 'Administrator configured', promoted: 'domain controller promoted', restarted: 'domain controller restarted' } as Record<string, string>)[keyChange]}.`, 'success') : updated
    }
    case 'JOIN_DOMAIN': {
      const domain = text(command.domain, '', 253).trim().toLowerCase()
      if (device.kind !== 'computer' || !device.os.installed || !device.power) return event(state, 'Power on a ready-to-use workstation first.', 'warning')
      if (!validDomain(domain)) return event(state, 'Enter a domain name such as lab.local.', 'warning')
      const dc = Object.values(state.devices).find(d => d.kind === 'server' && d.os.domain?.toLowerCase() === domain && d.os.installed && d.os.adminSet && d.os.roles.includes('AD DS') && d.os.promoted && d.os.restarted)
      if (!dc) return event(state, 'No promoted and restarted domain controller serves this domain.', 'warning')
      if (device.dns !== dc.ip) return event(state, `Set the client's DNS server to the domain controller (${dc.ip || 'unconfigured'}).`, 'warning')
      const probe = ping(state, device.id, domain)
      if (!probe.ok) return event(state, `Domain join failed: ${probe.message}`, 'warning')
      return event(setDevice(state, { ...device, joinedDomain: domain, os: { ...device.os, domain, netbios: text(dc.os.netbios, domain.split('.')[0].toUpperCase()) } }), `${device.name} joined ${domain}.`, 'success')
    }
  }
  return event(state, 'Unknown simulation command.', 'warning')
}

type Graph = Map<string, string[]>
function networkGraph(state: LabState): Graph {
  const graph: Graph = new Map()
  for (const d of Object.values(state.devices)) if (d.power && d.kind !== 'usb') graph.set(d.id, [])
  for (const l of Object.values(state.links)) {
    if (l.kind !== 'ethernet' || !graph.has(l.source) || !graph.has(l.target)) continue
    graph.get(l.source)!.push(l.target); graph.get(l.target)!.push(l.source)
  }
  return graph
}

function pathBetween(graph: Graph, source: string, target: string, canForward: (id: string) => boolean): string[] {
  if (!graph.has(source) || !graph.has(target)) return []
  const queue = [source], previous = new Map<string, string | null>([[source, null]])
  for (let i = 0; i < queue.length; i++) {
    const current = queue[i]
    if (current === target) {
      const path: string[] = []
      let cursor: string | null = current
      while (cursor !== null) { path.push(cursor); cursor = previous.get(cursor) ?? null }
      return path.reverse()
    }
    if (current !== source && !canForward(current)) continue
    for (const next of graph.get(current) || []) if (!previous.has(next)) { previous.set(next, current); queue.push(next) }
  }
  return []
}

function pingAddress(state: LabState, graph: Graph, source: Device, destination: Device): PingResult {
  const fail = (message: string): PingResult => ({ ok: false, message, path: [] })
  if (!destination.power) return fail(`${destination.name} is powered off.`)
  if (!usableAddress(source.ip, source.mask) || !usableAddress(destination.ip, destination.mask)) return fail('Configure valid host addresses and subnet masks on both devices.')
  if (Object.values(state.devices).some(d => d.id !== source.id && d.ip === source.ip || d.id !== destination.id && d.ip === destination.ip)) return fail('An IPv4 address conflict prevents reliable communication.')
  if (source.id === destination.id) return { ok: true, message: `Reply from ${destination.ip}: local interface is ready.`, path: [source.id] }
  const switchOnly = (id: string) => state.devices[id].kind === 'switch'
  let path: string[] = []
  if (sameSubnet(source, destination)) path = pathBetween(graph, source.id, destination.id, switchOnly)
  else {
    const startGateway = router(source) ? source : Object.values(state.devices).find(d => router(d) && d.ip === source.gateway && sameSubnet(source, d))
    const endGateway = router(destination) ? destination : Object.values(state.devices).find(d => router(d) && d.ip === destination.gateway && sameSubnet(destination, d))
    if (!startGateway || !endGateway) return fail('Different subnets require configured gateways and a router path in both directions.')
    const start = pathBetween(graph, source.id, startGateway.id, switchOnly)
    const transit = pathBetween(graph, startGateway.id, endGateway.id, id => router(state.devices[id]) && usableAddress(state.devices[id].ip, state.devices[id].mask) || switchOnly(id))
    const end = pathBetween(graph, endGateway.id, destination.id, switchOnly)
    if (start.length && transit.length && end.length) path = [...start, ...transit.slice(1), ...end.slice(1)]
  }
  return path.length ? { ok: true, message: `Reply from ${destination.ip}: bytes=32 time<1ms TTL=${Math.max(1, 128 - path.length + 1)} (simulated)`, path } : fail('Destination unreachable. Check cables, powered switches, subnet masks, and gateways.')
}

export function ping(state: LabState, sourceId: string, target: string): PingResult {
  const fail = (message: string): PingResult => ({ ok: false, message, path: [] })
  const source = ownDevice(state, sourceId)
  if (!source || !source.power || source.kind === 'usb') return fail('Power on a network device before testing connectivity.')
  const query = target.trim().toLowerCase()
  if (query === '127.0.0.1' || query === 'localhost') return { ok: true, message: 'Reply from 127.0.0.1: local loopback is ready.', path: [sourceId] }
  if (!query) return fail('Enter an IPv4 address or configured host name.')
  const graph = networkGraph(state)
  let destination: Device | undefined
  if (validIP(query)) destination = Object.values(state.devices).find(d => d.ip === query)
  else {
    if (/^[\d.]+$/.test(query)) return fail('The destination IPv4 address is invalid.')
    const dns = Object.values(state.devices).find(d => d.ip === source.dns || source.dns === '127.0.0.1' && d.id === source.id)
    if (!dns || !dns.os.installed || !dns.os.promoted || !dns.os.restarted || !dns.os.roles.includes('DNS') || !pingAddress(state, graph, source, dns).ok) return fail('DNS resolution failed. Use a reachable domain controller as this device’s DNS server.')
    destination = Object.values(state.devices).find(d => d.name.toLowerCase() === query || host(d) && d.os.computerName?.toLowerCase() === query || d.kind === 'server' && d.os.promoted && d.os.domain?.toLowerCase() === query || host(d) && `${d.name}.${d.joinedDomain || d.os.domain}`.toLowerCase() === query)
  }
  if (!destination) return fail(`No device in this lab answers ${query}.`)
  return pingAddress(state, graph, source, destination)
}

/** Discovers simulated shares by reachability; workgroup PCs do not require a domain. */
export function getSharedFiles(state: LabState, clientId: string): SharedFile[] {
  const client = ownDevice(state, clientId)
  if (!client || !host(client) || !client.power || !client.os.installed) return []
  const graph = networkGraph(state)
  return Object.values(state.devices).filter(device => device.id !== clientId && host(device) && device.power && device.os.installed && device.files?.some(file => file.shared) && pingAddress(state, graph, client, device).ok).flatMap(device => (device.files || []).filter(file => file.shared).map(file => ({ deviceId: device.id, deviceName: device.name, fileId: file.id, name: file.name, shareName: file.shareName || file.name, content: file.content, writable: file.fullControl === true })))
}

export function getObjectives(state: LabState): Objective[] {
  // Stable mission roles: extra devices cannot combine partial, unrelated progress.
  const server = state.devices['server-1'], client = state.devices['pc-1']
  const os = server?.os
  const wiring = !!server && !!client && connected(state, server.id) && connected(state, client.id)
    && pathBetween(networkGraph({ ...state, devices: Object.fromEntries(Object.entries(state.devices).map(([id, d]) => [id, { ...d, power: true }])) }), server.id, client.id, id => state.devices[id].kind === 'switch').length > 0
  const installed = !!os?.installed && !!os?.adminSet
  const network = !!server && !!client && !networkError(server) && !networkError(client) && client.dns === server.ip && ping(state, client.id, server.ip).ok
  const promoted = installed && !!os?.roles.includes('AD DS') && !!os?.promoted && !!os?.restarted && validDomain(os?.domain || '')
  const directory = promoted && os.users.some((user: Record<string, any>) => os.ous.some((ou: Record<string, any>) => ou.id === user.ou && ou.protected === false) && user.passwordSet && user.mustChange === false && user.neverExpires === true)
  const sharing = installed && os.folders.some((folder: Record<string, any>) => folder.shared && folder.fullControl && folder.securityVisited)
  const joined = promoted && !!client?.joinedDomain && client.joinedDomain === os.domain && network && ping(state, client.id, os.domain).ok
  return [
    { id: 'topology', title: 'Connect the lab', detail: 'Connect PC-01 and DC-01 through a switch using Ethernet cables.', done: wiring, hint: 'Choose the cable tool and connect PC-01 and DC-01 to SW-01.' },
    { id: 'install', title: 'Install Windows Server', detail: 'Use DC-01’s one-time boot media, enter BIOS, install the OS, and set Administrator credentials.', done: installed && !!os?.biosVisited && !!os?.ventoyBooted, hint: 'Open DC-01, insert its boot media, power on, enter BIOS (F2), select Ventoy, and follow Windows Setup.' },
    { id: 'network', title: 'Bring the network online', detail: 'Power on both computers. Configure valid IPv4 addresses and point client DNS to DC-01.', done: network, hint: 'Use DC-01: 192.168.1.10 and PC-01: 192.168.1.20 with mask 255.255.255.0. Client DNS: 192.168.1.10.' },
    { id: 'domain', title: 'Create your domain', detail: 'Install AD DS on DC-01, add a new forest, and restart the domain controller.', done: promoted, hint: 'In Server Manager, add AD DS, promote to a new forest such as lab.local, then restart.' },
    { id: 'directory', title: 'Build your organization', detail: 'Create an unprotected OU and a user with a password that never expires.', done: directory, hint: 'Open AD Users and Computers. Add an OU with protection unchecked, then a user; clear must change password and enable never expires.' },
    { id: 'sharing', title: 'Share team resources', detail: 'Share one folder with Full Control, then inspect its Security tab.', done: sharing, hint: 'Create a desktop folder. Properties → Sharing → Advanced Sharing → Permissions → Full Control, then Security.' },
    { id: 'join', title: 'Connect your first client', detail: 'Power on the ready-to-use PC-01 and join it to the domain served by DC-01.', done: joined, hint: 'Set PC-01’s DNS to DC-01 and use Join domain in the workstation’s System tab.' },
  ]
}

/** Restore validates every entity. Old localStorage is read by the caller and never overwritten here. */
export function restoreLab(raw: unknown, legacy?: unknown): LabState {
  if (!record(raw) || raw.schemaVersion !== 2 || !record(raw.devices) || !record(raw.links)) return migrateLegacy(legacy)
  const fresh = createLab()
  let state: LabState = { ...fresh, devices: {}, links: {}, events: [], mode: raw.mode === 'sandbox' ? 'sandbox' : 'guided', createdAt: finite(raw.createdAt) ? raw.createdAt : fresh.createdAt }
  const legacyMediaServers = new Set<string>()
  for (const link of Object.values(raw.links).slice(0, 2000)) {
    if (!record(link) || link.kind !== 'usb' || !safeId(link.source) || !safeId(link.target)) continue
    const source = raw.devices[link.source], target = raw.devices[link.target]
    if (record(source) && record(target)) {
      if (source.kind === 'usb' && target.kind === 'server') legacyMediaServers.add(link.target)
      if (target.kind === 'usb' && source.kind === 'server') legacyMediaServers.add(link.source)
    }
  }
  for (const [id, value] of Object.entries(raw.devices).slice(0, 500)) {
    if (!safeId(id) || !record(value) || value.id !== id || !Object.hasOwn(deviceCatalog, value.kind) || !finite(value.x) || !finite(value.y)) continue
    const kind = value.kind as DeviceKind
    if (kind === 'usb') continue
    const name = validName(text(value.name)) ? value.name : `${deviceCatalog[kind].prefix}-${Object.keys(state.devices).length + 1}`
    const device = makeDevice(id, kind, name, value.x, value.y, '')
    const os = cleanOS(value.os, device.os, true)
    if (kind === 'computer') Object.assign(os, { installed: true, adminSet: true, screen: os.power ? 'desktop' : 'off' })
    if (kind === 'server') device.bootMedia = os.installed && os.adminSet || value.bootMedia === 'used' ? 'used' : value.bootMedia === 'inserted' || legacyMediaServers.has(id) ? 'inserted' : 'available'
    if (device.bootMedia === 'used') os.bootDevice = 'disk'
    if (host(device)) device.files = cleanFiles(value.files)
    if (kind === 'router') device.router = cleanRouter(value.router) || defaultRouter()
    for (const field of ['ip', 'mask', 'gateway', 'dns'] as const) device[field] = text(value[field], device[field], 15)
    if (device.ip && !usableAddress(device.ip, device.mask)) device.ip = ''
    if (!validMask(device.mask)) device.mask = '255.255.255.0'
    if (device.gateway && !validIP(device.gateway)) device.gateway = ''
    if (device.dns && !validIP(device.dns)) device.dns = ''
    device.power = host(device) ? os.power : value.power === true
    os.power = device.power; os.computerName = name
    os.network = { ...os.network, ip: device.ip, mask: device.mask, gateway: device.gateway, dns: device.dns }
    if (!device.power) os.screen = 'off'
    device.os = os
    if (typeof value.joinedDomain === 'string' && validDomain(value.joinedDomain)) device.joinedDomain = value.joinedDomain.toLowerCase()
    state.devices[id] = device
  }
  if (!Object.keys(state.devices).length && Object.keys(raw.devices).length) return event(migrateLegacy(legacy), 'The saved lab was damaged. A usable lab has been recovered.', 'warning')
  for (const [id, value] of Object.entries(raw.links).slice(0, 2000)) {
    if (!safeId(id) || !record(value) || value.kind !== 'ethernet' || value.id !== id || !safeId(value.source) || !safeId(value.target) || typeof value.sourcePort !== 'string' || typeof value.targetPort !== 'string') continue
    const before = state.links
    const result = reduceLab(state, { type: 'CONNECT', source: value.source, target: value.target, sourcePort: value.sourcePort, targetPort: value.targetPort })
    if (result.links !== before) {
      const newLink = Object.values(result.links).find(link => !before[link.id])!
      if (newLink.kind !== value.kind) continue
      const links = { ...result.links }; delete links[newLink.id]; links[id] = { ...newLink, id }
      state = { ...result, links }
    }
  }
  const events = Array.isArray(raw.events) ? raw.events.filter((value: unknown) => record(value) && safeId(value.id) && finite(value.time) && typeof value.message === 'string' && ['info', 'success', 'warning'].includes(value.level)).slice(-120).map((value: LabEvent) => ({ id: value.id, time: value.time, message: value.message.slice(0, 1000), level: value.level })) : []
  return syncHardware({ ...state, events })
}

function migrateLegacy(raw: unknown): LabState {
  let state = createLab()
  if (!record(raw) || raw.version !== 1) return state
  const original = state.devices['server-1']
  const os = cleanOS(raw, original.os, true)
  const name = validName(os.computerName) ? os.computerName : original.name
  const device: Device = { ...original, name, power: os.power, os, ip: os.network.ip, mask: os.network.mask, gateway: os.network.gateway, dns: os.network.dns, bootMedia: os.installed && os.adminSet ? 'used' : raw.usb === true ? 'inserted' : 'available' }
  if (device.bootMedia === 'used') os.bootDevice = 'disk'
  if (!usableAddress(device.ip, device.mask)) {
    Object.assign(device, { ip: original.ip, mask: original.mask, gateway: original.gateway, dns: original.dns })
    os.network = { ...original.os.network }
  }
  state = setDevice(state, device)
  if (raw.ethernet === true) state = reduceLab(state, { type: 'CONNECT', source: 'server-1', target: 'switch-1' })
  return event(syncHardware(state), 'Your original Windows Server progress has been imported. The original save remains available in the classic lab.', 'success')
}
