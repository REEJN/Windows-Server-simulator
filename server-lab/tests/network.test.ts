import { describe, expect, it } from 'vitest'
import { createLab, createOS, connected, getObjectives, getSharedFiles, ping, reduceLab, restoreLab, validIP, validMask, type LabCommand, type LabState } from '../src/core/index'

const apply = (state: LabState, ...commands: LabCommand[]) => commands.reduce(reduceLab, state)
const lastWarning = (state: LabState) => state.events.at(-1)?.level === 'warning'

function wiredLab(): LabState {
  return apply(createLab(),
    { type: 'CONNECT', source: 'pc-1', target: 'switch-1' },
    { type: 'CONNECT', source: 'server-1', target: 'switch-1' },
    { type: 'CONNECT', source: 'router-1', target: 'switch-1' },
    { type: 'INSERT_BOOT_MEDIA', id: 'server-1' },
    { type: 'POWER', id: 'server-1' },
    { type: 'POWER', id: 'pc-1' },
  )
}

function domainLab(): LabState {
  const state = wiredLab()
  return apply(state,
    { type: 'OS_SYNC', id: 'server-1', os: { ...state.devices['server-1'].os, screen: 'desktop', installed: true, adminSet: true, biosVisited: true, ventoyBooted: true, roles: ['AD DS', 'DNS'], promoted: true, restarted: true, domain: 'lab.local' } },
    { type: 'OS_SYNC', id: 'pc-1', os: { ...state.devices['pc-1'].os, screen: 'desktop', installed: true, adminSet: true } },
  )
}

describe('topology commands', () => {
  it('creates an untouched, disconnected starter lab', () => {
    const state = createLab()
    expect(Object.keys(state.devices)).toHaveLength(4)
    expect(Object.keys(state.links)).toHaveLength(0)
    expect(getObjectives(state).filter(o => o.done)).toHaveLength(0)
    expect(state.devices['switch-1'].power).toBe(true)
    expect(state.devices['server-1'].power).toBe(false)
    expect(state.devices['server-1'].bootMedia).toBe('available')
    expect(state.devices['pc-1'].os).toMatchObject({ installed: true, adminSet: true, screen: 'desktop' })
    expect(lastWarning(reduceLab(state, { type: 'ADD_DEVICE', kind: 'usb', x: 0, y: 0 }))).toBe(true)
  })

  it('does not mutate state and preserves unrelated device identity while moving', () => {
    const state = createLab(), server = state.devices['server-1']
    const next = reduceLab(state, { type: 'MOVE_DEVICE', id: 'pc-1', x: 123, y: 456 })
    expect(state.devices['pc-1'].x).toBe(80)
    expect(next.devices['pc-1'].x).toBe(123)
    expect(next.devices['server-1']).toBe(server)
    expect(next.events).toBe(state.events)
  })

  it('rejects self links, repeated cables, occupied ports, and incompatible USB links', () => {
    const fresh = createLab()
    expect(lastWarning(reduceLab(fresh, { type: 'CONNECT', source: 'pc-1', target: 'pc-1' }))).toBe(true)
    expect(lastWarning(reduceLab(fresh, { type: 'CONNECT', source: 'usb-1', target: 'switch-1' }))).toBe(true)
    const state = reduceLab(fresh, { type: 'CONNECT', source: 'pc-1', target: 'switch-1', sourcePort: 'eth-1', targetPort: 'eth-2' })
    for (const command of [
      { type: 'CONNECT', source: 'switch-1', target: 'pc-1' },
      { type: 'CONNECT', source: 'pc-1', target: 'server-1' },
      { type: 'CONNECT', source: 'server-1', target: 'switch-1', targetPort: 'eth-2' },
      { type: 'CONNECT', source: 'router-1', target: 'switch-1', targetPort: 'eth-99' },
    ] as LabCommand[]) {
      const rejected = reduceLab(state, command)
      expect(lastWarning(rejected)).toBe(true)
      expect(rejected.links).toBe(state.links)
    }
    const freed = reduceLab(state, { type: 'DISCONNECT', id: 'link-1' })
    expect(Object.keys(reduceLab(freed, { type: 'CONNECT', source: 'pc-1', target: 'server-1' }).links)).toHaveLength(1)
  })

  it('derives OS hardware from cables and releases connections when a device is removed', () => {
    const state = wiredLab()
    expect(connected(state, 'server-1', 'usb')).toBe(true)
    expect(state.devices['server-1'].os.ethernet).toBe(true)
    const unplugged = reduceLab(state, { type: 'EJECT_BOOT_MEDIA', id: 'server-1' })
    expect(unplugged.devices['server-1'].os.usb).toBe(false)
    const spoofed = reduceLab(unplugged, { type: 'OS_SYNC', id: 'server-1', os: { ...unplugged.devices['server-1'].os, usb: true, ethernet: false } })
    expect(spoofed.devices['server-1'].os.usb).toBe(false)
    expect(spoofed.devices['server-1'].os.ethernet).toBe(true)
    expect(spoofed.links).toBe(unplugged.links)
  })
})

describe('network model', () => {
  it('validates IPv4 host addresses, contiguous masks, gateways, and duplicates', () => {
    expect(validIP('192.168.1.20')).toBe(true)
    for (const value of ['256.1.1.1', '1.2.3', '01.2.3.4', 'x.2.3.4']) expect(validIP(value)).toBe(false)
    expect(validMask('255.255.252.0')).toBe(true)
    for (const value of ['255.0.255.0', '0.0.0.0', '255.255.255.255']) expect(validMask(value)).toBe(false)
    const state = createLab()
    for (const config of [
      { ip: '192.168.1.256' }, { ip: '192.168.1.0' }, { ip: '192.168.1.255' },
      { ip: '192.168.1.10' }, { ip: '127.0.0.1' }, { mask: '255.0.255.0' },
      { gateway: '10.0.0.1' }, { dns: '224.0.0.1' },
    ]) {
      const rejected = reduceLab(state, { type: 'UPDATE_NETWORK', id: 'pc-1', ip: '192.168.1.20', mask: '255.255.255.0', gateway: '192.168.1.1', dns: '192.168.1.10', ...config })
      expect(lastWarning(rejected)).toBe(true)
      expect(rejected.devices).toBe(state.devices)
    }
  })

  it('forwards through powered switches without requiring a management IP', () => {
    const state = wiredLab()
    expect(state.devices['switch-1'].ip).toBe('')
    expect(ping(state, 'pc-1', '192.168.1.10')).toMatchObject({ ok: true, path: ['pc-1', 'switch-1', 'server-1'] })
    const off = reduceLab(state, { type: 'POWER', id: 'switch-1' })
    expect(ping(off, 'pc-1', '192.168.1.10').ok).toBe(false)
    const cable = Object.values(state.links).find(l => l.source === 'server-1')!
    expect(ping(reduceLab(state, { type: 'DISCONNECT', id: cable.id }), 'pc-1', '192.168.1.10').ok).toBe(false)
    expect(ping(state, 'pc-1', '192.168.1.999').ok).toBe(false)
  })

  it('does not let a server forward packets like a switch', () => {
    const state = apply(createLab(),
      { type: 'CONNECT', source: 'pc-1', target: 'server-1' },
      { type: 'CONNECT', source: 'server-1', target: 'router-1' },
      { type: 'POWER', id: 'server-1' }, { type: 'POWER', id: 'pc-1' },
    )
    expect(ping(state, 'pc-1', '192.168.1.1').ok).toBe(false)
  })

  it('requires both configured gateways for communication across subnets', () => {
    let state = wiredLab()
    state = reduceLab(state, { type: 'UPDATE_NETWORK', id: 'server-1', ip: '10.0.0.10', mask: '255.255.255.0', gateway: '10.0.0.1', dns: '10.0.0.10' })
    expect(ping(state, 'pc-1', '10.0.0.10').ok).toBe(false)
    const serverCable = Object.values(state.links).find(l => l.source === 'server-1')!
    state = apply(state,
      { type: 'DISCONNECT', id: serverCable.id },
      { type: 'ADD_DEVICE', kind: 'router', x: 900, y: 100 },
      { type: 'UPDATE_NETWORK', id: 'router-2', ip: '10.0.0.1', mask: '255.255.255.0', gateway: '', dns: '' },
      { type: 'CONNECT', source: 'router-1', target: 'router-2' },
      { type: 'CONNECT', source: 'router-2', target: 'server-1' },
    )
    expect(ping(state, 'pc-1', '10.0.0.10')).toMatchObject({ ok: true, path: ['pc-1', 'switch-1', 'router-1', 'router-2', 'server-1'] })
    const noReturnRoute = reduceLab(state, { type: 'UPDATE_NETWORK', id: 'server-1', ip: '10.0.0.10', mask: '255.255.255.0', gateway: '', dns: '10.0.0.10' })
    expect(ping(noReturnRoute, 'pc-1', '10.0.0.10').ok).toBe(false)
  })

  it('requires a reachable, restarted DNS server for name lookup', () => {
    const state = domainLab()
    expect(ping(state, 'pc-1', 'lab.local').ok).toBe(true)
    expect(ping(state, 'pc-1', 'DC-01').ok).toBe(true)
    expect(ping(wiredLab(), 'pc-1', 'DC-01').ok).toBe(false)
    const wrongDns = reduceLab(state, { type: 'UPDATE_NETWORK', id: 'pc-1', ip: '192.168.1.20', mask: '255.255.255.0', gateway: '192.168.1.1', dns: '8.8.8.8' })
    expect(ping(wrongDns, 'pc-1', 'lab.local').ok).toBe(false)
    expect(ping(wrongDns, 'pc-1', '192.168.1.10').ok).toBe(true)
  })
})

describe('missions and services', () => {
  it('consumes server boot media only after setup reaches the configured desktop', () => {
    let state = wiredLab()
    expect(state.devices['server-1'].bootMedia).toBe('inserted')
    state = reduceLab(state, { type: 'OS_SYNC', id: 'server-1', os: { ...state.devices['server-1'].os, installed: true, adminSet: false, ventoyBooted: true, bootDevice: 'usb', screen: 'installing' } })
    expect(state.devices['server-1'].bootMedia).toBe('inserted')
    expect(state.devices['server-1'].os.usb).toBe(true)
    state = reduceLab(state, { type: 'OS_SYNC', id: 'server-1', os: { ...state.devices['server-1'].os, adminSet: true, screen: 'desktop' } })
    expect(state.devices['server-1'].bootMedia).toBe('used')
    expect(state.devices['server-1'].os.usb).toBe(false)
    expect(state.devices['server-1'].os.bootDevice).toBe('disk')
    expect(lastWarning(reduceLab(state, { type: 'INSERT_BOOT_MEDIA', id: 'server-1' }))).toBe(true)
    expect(lastWarning(reduceLab(state, { type: 'INSERT_BOOT_MEDIA', id: 'pc-1' }))).toBe(true)
    const oldSave = structuredClone(state)
    oldSave.devices['server-1'].os.bootDevice = 'usb'
    const reloaded = restoreLab(oldSave)
    expect(reloaded.devices['server-1'].bootMedia).toBe('used')
    expect(reloaded.devices['server-1'].os.bootDevice).toBe('disk')
    expect(lastWarning(reduceLab(reloaded, { type: 'INSERT_BOOT_MEDIA', id: 'server-1' }))).toBe(true)
  })

  it('can eject and retry server media before setup is complete', () => {
    const inserted = reduceLab(createLab(), { type: 'INSERT_BOOT_MEDIA', id: 'server-1' })
    const ejected = reduceLab(inserted, { type: 'EJECT_BOOT_MEDIA', id: 'server-1' })
    expect(ejected.devices['server-1'].bootMedia).toBe('available')
    expect(connected(ejected, 'server-1', 'usb')).toBe(false)
    expect(reduceLab(ejected, { type: 'INSERT_BOOT_MEDIA', id: 'server-1' }).devices['server-1'].bootMedia).toBe('inserted')
  })

  it('requires Ethernet for topology while server boot media remains local to the console', () => {
    const initial = wiredLab()
    const unplugged = reduceLab(initial, { type: 'EJECT_BOOT_MEDIA', id: 'server-1' })
    expect(getObjectives(unplugged).find(o => o.id === 'topology')?.done).toBe(true)
    const installed = domainLab()
    expect(connected(installed, 'server-1', 'usb')).toBe(false)
    expect(connected(installed, 'pc-1', 'usb')).toBe(false)
    expect(getObjectives(installed).find(o => o.id === 'topology')?.done).toBe(true)
    const ethernet = Object.values(installed.links).find(link => link.source === 'server-1')!
    const noNetwork = reduceLab(installed, { type: 'DISCONNECT', id: ethernet.id })
    expect(getObjectives(noNetwork).find(o => o.id === 'topology')?.done).toBe(false)
  })

  it('requires an installed client, correct DNS, and a live domain controller to join', () => {
    const state = domainLab()
    expect(reduceLab(state, { type: 'JOIN_DOMAIN', id: 'pc-1', domain: 'lab.local' }).devices['pc-1'].joinedDomain).toBe('lab.local')
    for (const unavailable of [
      reduceLab(state, { type: 'POWER', id: 'server-1' }),
      reduceLab(state, { type: 'OS_SYNC', id: 'pc-1', os: { ...state.devices['pc-1'].os, installed: false } }),
      reduceLab(state, { type: 'OS_SYNC', id: 'server-1', os: { ...state.devices['server-1'].os, restarted: false } }),
      reduceLab(state, { type: 'UPDATE_NETWORK', id: 'pc-1', ip: '192.168.1.20', mask: '255.255.255.0', gateway: '192.168.1.1', dns: '127.0.0.1' }),
    ]) {
      const rejected = reduceLab(unavailable, { type: 'JOIN_DOMAIN', id: 'pc-1', domain: 'lab.local' })
      expect(lastWarning(rejected)).toBe(true)
      expect(rejected.devices['pc-1'].joinedDomain).toBeUndefined()
    }
  })

  it('ties each objective to the primary devices and coherent OU/user/folder records', () => {
    let state = domainLab()
    const os = state.devices['server-1'].os
    state = reduceLab(state, { type: 'OS_SYNC', id: 'server-1', os: { ...os,
      ous: [{ id: 'ou-1', name: 'Students', protected: false }, { id: 'ou-2', name: 'Protected', protected: true }],
      users: [{ id: 'user-1', name: 'Alex', logon: 'alex', ou: 'ou-2', passwordSet: true, mustChange: false, neverExpires: true }],
      folders: [{ id: 'folder-1', name: 'Share', shared: true, fullControl: true, securityVisited: false }, { id: 'folder-2', name: 'Other', shared: false, fullControl: false, securityVisited: true }],
    } })
    expect(getObjectives(state).find(o => o.id === 'directory')?.done).toBe(false)
    expect(getObjectives(state).find(o => o.id === 'sharing')?.done).toBe(false)
    const fixed = state.devices['server-1'].os
    state = apply(state,
      { type: 'OS_SYNC', id: 'server-1', os: { ...fixed, users: [{ ...fixed.users[0], ou: 'ou-1' }], folders: [{ ...fixed.folders[0], securityVisited: true }] } },
      { type: 'JOIN_DOMAIN', id: 'pc-1', domain: 'lab.local' },
    )
    expect(getObjectives(state).every(o => o.done)).toBe(true)
    const extra = reduceLab(state, { type: 'ADD_DEVICE', kind: 'server', x: 1, y: 1 })
    const emptied = reduceLab(extra, { type: 'OS_SYNC', id: 'server-1', os: createOS('DC-01') })
    const otherProgress = reduceLab(emptied, { type: 'OS_SYNC', id: 'server-2', os: state.devices['server-1'].os })
    expect(getObjectives(otherProgress).find(o => o.id === 'directory')?.done).toBe(false)
  })
})

describe('save recovery and scale', () => {
  it('absorbs old USB topology into server boot media and upgrades old blank PCs', () => {
    const old: any = structuredClone(createLab())
    old.devices['usb-1'] = { ...old.devices['router-1'], id: 'usb-1', kind: 'usb', name: 'USB-01' }
    delete old.devices['server-1'].bootMedia
    old.devices['pc-1'].os.installed = false
    old.devices['pc-1'].os.adminSet = false
    old.links['usb-link'] = { id: 'usb-link', source: 'usb-1', target: 'server-1', sourcePort: 'usb-1', targetPort: 'usb-1', kind: 'usb' }
    const restored = restoreLab(old)
    expect(Object.values(restored.devices).some(d => d.kind === 'usb')).toBe(false)
    expect(Object.values(restored.links).some(l => l.kind === 'usb')).toBe(false)
    expect(restored.devices['server-1'].bootMedia).toBe('inserted')
    expect(restored.devices['server-1'].os.usb).toBe(true)
    expect(restored.devices['pc-1'].os).toMatchObject({ installed: true, adminSet: true })
    old.devices['server-1'].os.installed = true; old.devices['server-1'].os.adminSet = true
    expect(restoreLab(old).devices['server-1'].bootMedia).toBe('used')
  })

  it('migrates v1 progress without mutating the original or losing directory records', () => {
    const legacy = { ...createOS('OLD-SERVER'), power: true, screen: 'restarting', installed: true, adminSet: true, usb: true, bootDevice: 'usb', ethernet: true, roles: ['AD DS', 'DNS'], domain: 'school.local', promoted: true, restarted: false,
      ous: [{ id: 'ou-1', name: 'Students', protected: false }],
      users: [{ id: 'u-1', name: 'Alex', logon: 'alex', ou: 'ou-1', passwordSet: true, mustChange: false, neverExpires: true }],
      folders: [{ id: 'f-1', name: 'Shared', shared: true, fullControl: true, securityVisited: true }],
    }
    const original = structuredClone(legacy), migrated = restoreLab(null, legacy)
    expect(legacy).toEqual(original)
    expect(migrated.devices['server-1'].os).toMatchObject({ screen: 'desktop', restarted: true, users: legacy.users, ous: legacy.ous, folders: legacy.folders })
    expect(connected(migrated, 'server-1', 'usb')).toBe(false)
    expect(migrated.devices['server-1'].bootMedia).toBe('used')
    expect(migrated.devices['server-1'].os.bootDevice).toBe('disk')
    expect(connected(migrated, 'server-1')).toBe(true)
    expect(migrated.devices['pc-1'].os.installed).toBe(true)
  })

  it('recovers transient installation and safely drops damaged saved entities', () => {
    expect(restoreLab(null, { ...createOS('DC-01'), power: true, screen: 'installing' }).devices['server-1'].os.screen).toBe('off')
    const saved: any = structuredClone(domainLab())
    saved.devices.bad = { id: 'bad', kind: 'not-a-device', x: 0, y: 0 }
    saved.devices['server-1'].os.users = [null, 'bad', { id: 'x' }]
    saved.links.broken = { id: 'broken', source: 'pc-1', target: 'missing', sourcePort: 'eth-1', targetPort: 'eth-1', kind: 'ethernet' }
    const restored = restoreLab(saved)
    expect(restored.devices.bad).toBeUndefined()
    expect(restored.links.broken).toBeUndefined()
    expect(restored.devices['server-1'].os.users).toEqual([])
    expect(ping(restored, 'pc-1', 'lab.local').ok).toBe(true)
    expect(restoreLab({ schemaVersion: 9 }).schemaVersion).toBe(2)
  })

  it('handles 100 devices, caps event history, and keeps deterministic command results', () => {
    let state = wiredLab()
    for (let i = 0; i < 100; i++) state = reduceLab(state, { type: 'ADD_DEVICE', kind: 'computer', x: i * 20, y: 600 })
    expect(Object.keys(state.devices)).toHaveLength(104)
    const command: LabCommand = { type: 'ADD_DEVICE', kind: 'switch', x: 300, y: 900 }
    expect(reduceLab(state, command)).toEqual(reduceLab(state, command))
    for (let i = 0; i < 100; i++) state = reduceLab(state, { type: 'SET_MODE', mode: i % 2 ? 'guided' : 'sandbox' })
    expect(state.events).toHaveLength(120)
    expect(ping(state, 'pc-1', '192.168.1.10').ok).toBe(true)
    expect(Object.keys(restoreLab(structuredClone(state)).devices)).toHaveLength(104)
  })

  it('rejects inherited entity IDs and prevents string flags from earning mission progress', () => {
    const state = domainLab()
    const invalid = reduceLab(state, { type: 'POWER', id: 'constructor' })
    expect(invalid.devices).toBe(state.devices)
    expect(lastWarning(invalid)).toBe(true)
    expect(ping(state, 'constructor', '127.0.0.1').ok).toBe(false)
    const saved: any = structuredClone(state)
    saved.devices['server-1'].os.folders = [{ id: 'f-1', name: 'Share', shared: 'true', fullControl: 'true', securityVisited: 'true' }]
    const restored = restoreLab(saved)
    expect(getObjectives(restored).find(o => o.id === 'sharing')?.done).toBe(false)
  })
})

describe('simulated shared files', () => {
  function twoPCs() {
    return apply(wiredLab(),
      { type: 'ADD_DEVICE', kind: 'computer', x: 100, y: 500 },
      { type: 'POWER', id: 'pc-2' },
      { type: 'UPDATE_NETWORK', id: 'pc-2', ip: '192.168.1.21', mask: '255.255.255.0', gateway: '192.168.1.1', dns: '192.168.1.10' },
      { type: 'CONNECT', source: 'pc-2', target: 'switch-1' },
      { type: 'FILE_CREATE', id: 'pc-1', name: 'notes.txt', content: 'Hello from PC-01' },
      { type: 'FILE_SHARE', id: 'pc-1', fileId: 'file-1', shared: true },
    )
  }

  it('discovers and edits another PC’s shared file without requiring a domain', () => {
    const state = twoPCs()
    expect(state.devices['pc-2'].os.installed).toBe(true)
    expect(state.devices['pc-2'].joinedDomain).toBeUndefined()
    expect(getSharedFiles(state, 'pc-2')).toEqual([{ deviceId: 'pc-1', deviceName: 'PC-01', fileId: 'file-1', name: 'notes.txt', shareName: 'notes.txt', content: 'Hello from PC-01', writable: true }])
    const edited = reduceLab(state, { type: 'FILE_WRITE_REMOTE', sourceId: 'pc-2', targetId: 'pc-1', fileId: 'file-1', content: 'Updated from PC-02' })
    expect(edited.devices['pc-1'].files?.[0].content).toBe('Updated from PC-02')
    expect(state.devices['pc-1'].files?.[0].content).toBe('Hello from PC-01')
    expect(edited.devices['pc-2'].files).toEqual([])
    expect(restoreLab(structuredClone(edited)).devices['pc-1'].files).toEqual(edited.devices['pc-1'].files)
  })

  it('rejects remote writes when disconnected, powered off, unshared, or read-only', () => {
    const state = twoPCs()
    const cable = Object.values(state.links).find(l => l.source === 'pc-2')!
    for (const unavailable of [
      reduceLab(state, { type: 'DISCONNECT', id: cable.id }),
      reduceLab(state, { type: 'POWER', id: 'pc-1' }),
      reduceLab(state, { type: 'POWER', id: 'pc-2' }),
      reduceLab(state, { type: 'FILE_SHARE', id: 'pc-1', fileId: 'file-1', shared: false }),
    ]) {
      expect(getSharedFiles(unavailable, 'pc-2')).toEqual([])
      const rejected = reduceLab(unavailable, { type: 'FILE_WRITE_REMOTE', sourceId: 'pc-2', targetId: 'pc-1', fileId: 'file-1', content: 'Invalid write' })
      expect(lastWarning(rejected)).toBe(true)
      expect(rejected.devices).toBe(unavailable.devices)
    }
    const saved = structuredClone(state); saved.devices['pc-1'].files![0].fullControl = false
    const readonly = restoreLab(saved)
    expect(getSharedFiles(readonly, 'pc-2')[0].writable).toBe(false)
    expect(lastWarning(reduceLab(readonly, { type: 'FILE_WRITE_REMOTE', sourceId: 'pc-2', targetId: 'pc-1', fileId: 'file-1', content: 'Invalid write' }))).toBe(true)
  })

  it('validates file names and contents and supports local update and delete', () => {
    let state = twoPCs()
    for (const name of ['../secret', '..', 'C:\\file.txt', 'bad/name', 'NUL', 'CON.txt', 'trailing.', '', 'notes.TXT']) {
      const rejected = reduceLab(state, { type: 'FILE_CREATE', id: 'pc-1', name, content: 'text' })
      expect(lastWarning(rejected)).toBe(true)
      expect(rejected.devices).toBe(state.devices)
    }
    expect(lastWarning(reduceLab(state, { type: 'FILE_UPDATE', id: 'pc-1', fileId: 'file-1', content: 'x'.repeat(65537) }))).toBe(true)
    expect(lastWarning(reduceLab(state, { type: 'FILE_UPDATE', id: 'pc-1', fileId: 'file-1', content: '🙂'.repeat(16385) }))).toBe(true)
    state = reduceLab(state, { type: 'FILE_UPDATE', id: 'pc-1', fileId: 'file-1', content: 'Local edit' })
    expect(getSharedFiles(state, 'pc-2')[0].content).toBe('Local edit')
    state = reduceLab(state, { type: 'FILE_DELETE', id: 'pc-1', fileId: 'file-1' })
    expect(getSharedFiles(state, 'pc-2')).toEqual([])
    expect(state.devices['pc-1'].files).toEqual([])
    expect(lastWarning(reduceLab(createLab(), { type: 'FILE_CREATE', id: 'pc-1', name: 'off.txt', content: '' }))).toBe(true)
  })

  it('discovers shared server files separately from legacy shared folders', () => {
    const state = apply(domainLab(),
      { type: 'FILE_CREATE', id: 'server-1', name: 'policy.txt', content: 'Office policy' },
      { type: 'FILE_SHARE', id: 'server-1', fileId: 'file-1', shared: true },
    )
    expect(getSharedFiles(state, 'pc-1')[0]).toMatchObject({ deviceId: 'server-1', name: 'policy.txt' })
    expect(state.devices['pc-1'].joinedDomain).toBeUndefined()
    expect(getObjectives(state).find(o => o.id === 'sharing')?.done).toBe(false)
  })
})

describe('router settings', () => {
  it('validates and persists wireless configuration without inventing wireless connectivity', () => {
    const state = createLab()
    const config = { ssid: 'Classroom WiFi', wirelessEnabled: true, security: 'WPA2-Personal' as const, password: 'Classroom123' }
    const changed = reduceLab(state, { type: 'ROUTER_CONFIG', id: 'router-1', config })
    expect(changed.devices['router-1'].router).toEqual(config)
    expect(restoreLab(structuredClone(changed)).devices['router-1'].router).toEqual(config)
    expect(Object.keys(changed.links)).toHaveLength(0)
    for (const bad of [{ ...config, password: 'short' }, { ...config, ssid: '' }, { ...config, ssid: 'x'.repeat(33) }]) {
      const rejected = reduceLab(state, { type: 'ROUTER_CONFIG', id: 'router-1', config: bad })
      expect(lastWarning(rejected)).toBe(true)
      expect(rejected.devices).toBe(state.devices)
    }
    expect(lastWarning(reduceLab(state, { type: 'ROUTER_CONFIG', id: 'pc-1', config }))).toBe(true)
    const open = reduceLab(state, { type: 'ROUTER_CONFIG', id: 'router-1', config: { ...config, security: 'Open', password: 'ignored' } })
    expect(open.devices['router-1'].router?.password).toBe('')
  })
})
