import { useEffect, useId, useState, type FormEvent } from 'react';
import { ArrowClockwise, CheckCircle, GearSix, Globe, Info, PlugsConnected, Power, WifiHigh } from '@phosphor-icons/react';
import { deviceCatalog, validIP, validMask, type Device } from './core';
import { useLab } from './store';
import './router.css';

type Section = 'Status' | 'Internet' | 'Wireless' | 'LAN' | 'System';
type WirelessConfig = { ssid: string; wirelessEnabled: boolean; security: 'WPA2-Personal' | 'Open'; password: string };
type RouterDevice = Device & { router?: WirelessConfig };
type Feedback = { error: boolean; text: string };
const sections = [
  { name: 'Status', icon: Info },
  { name: 'Internet', icon: Globe },
  { name: 'Wireless', icon: WifiHigh },
  { name: 'LAN', icon: PlugsConnected },
  { name: 'System', icon: GearSix },
] as const;

function wirelessDefaults(device: RouterDevice): WirelessConfig {
  return device.router ?? { ssid: `Serverlab-${device.name}`, wirelessEnabled: true, security: 'WPA2-Personal', password: 'serverlab123' };
}

export function RouterPanel({ deviceId, embedded = false }: { deviceId: string; embedded?: boolean }) {
  const device = useLab(s => s.lab.devices[deviceId]);
  if (!device || device.kind !== 'router') return <div className="router-panel router-unavailable">This router is no longer available in the lab.</div>;
  return <RouterContents key={deviceId} device={device} embedded={embedded} />;
}

function RouterContents({ device, embedded }: { device: RouterDevice; embedded: boolean }) {
  const dispatch = useLab(s => s.dispatch);
  const devices = useLab(s => s.lab.devices);
  const links = useLab(s => s.lab.links);
  const [section, setSection] = useState<Section>('Status');
  const [feedback, setFeedback] = useState<Feedback>();
  const [network, setNetwork] = useState({ ip: device.ip, mask: device.mask, gateway: device.gateway, dns: device.dns });
  const [wireless, setWireless] = useState<WirelessConfig>(() => wirelessDefaults(device));
  const [name, setName] = useState(device.name);
  const [showPassword, setShowPassword] = useState(false);
  const panelId = useId();
  useEffect(() => { setNetwork({ ip: device.ip, mask: device.mask, gateway: device.gateway, dns: device.dns }); }, [device.ip, device.mask, device.gateway, device.dns]);
  useEffect(() => { setWireless(wirelessDefaults(device)); }, [device.router, device.name]);
  useEffect(() => { setName(device.name); }, [device.name]);

  const ports = Array.from({ length: deviceCatalog.router.ports }, (_, index) => {
    const id = `eth-${index + 1}`;
    const link = Object.values(links).find(link => link.kind === 'ethernet' && (link.source === device.id && link.sourcePort === id || link.target === device.id && link.targetPort === id));
    const peer = link && devices[link.source === device.id ? link.target : link.source];
    return { id, number: index + 1, peer, active: Boolean(device.power && peer?.power) };
  });
  const activePorts = ports.filter(port => port.active).length;
  const savedWireless = wirelessDefaults(device);
  const result = (success: boolean, message: string) => {
    const latestEvent = useLab.getState().lab.events.at(-1);
    setFeedback({ error: !success, text: success ? message : latestEvent?.message || 'The configuration could not be saved.' });
  };
  const saveNetwork = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const values = section === 'LAN'
      ? { ip: network.ip.trim(), mask: network.mask.trim(), gateway: device.gateway, dns: device.dns }
      : { ip: device.ip, mask: device.mask, gateway: network.gateway.trim(), dns: network.dns.trim() };
    if (!validIP(values.ip) || !validMask(values.mask)) {
      setFeedback({ error: true, text: 'Enter a valid LAN IPv4 address and subnet mask before saving.' });
      return;
    }
    dispatch({ type: 'UPDATE_NETWORK', id: device.id, ...values });
    const saved = useLab.getState().lab.devices[device.id];
    result(Boolean(saved && Object.entries(values).every(([key, value]) => saved[key as keyof typeof values] === value)), 'Network settings saved. Connected devices now use this configuration.');
  };
  const saveWireless = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const config = { ...wireless, ssid: wireless.ssid.trim(), password: wireless.security === 'Open' ? '' : wireless.password };
    if (!config.ssid || config.ssid.length > 32 || config.security === 'WPA2-Personal' && (config.password.length < 8 || config.password.length > 63)) {
      setFeedback({ error: true, text: 'Use an SSID of 1–32 characters and a WPA2 password of 8–63 characters.' });
      return;
    }
    dispatch({ type: 'ROUTER_CONFIG', id: device.id, config });
    const saved = (useLab.getState().lab.devices[device.id] as RouterDevice | undefined)?.router;
    result(Boolean(saved && Object.entries(config).every(([key, value]) => saved[key as keyof WirelessConfig] === value)), 'Wireless settings saved to this router.');
  };
  const saveName = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    dispatch({ type: 'RENAME', id: device.id, name });
    result(useLab.getState().lab.devices[device.id]?.name === name.trim().toUpperCase(), 'Router name saved.');
  };
  const reboot = () => {
    if (device.power) dispatch({ type: 'POWER', id: device.id });
    dispatch({ type: 'POWER', id: device.id });
    setFeedback({ error: false, text: 'Router restarted. Saved settings have been retained.' });
  };
  const switchSection = (next: Section) => { setSection(next); setFeedback(undefined); };

  return <section className={`router-panel${embedded ? ' router-embedded' : ''}`} aria-label={`${device.name} router administration`}>
    <header className="router-brandbar">
      <div className="router-wordmark">tp-link<span>NETWORK MANAGEMENT</span></div>
      <div className="router-header-device"><strong>{device.name}</strong><span>Wireless Router · Lab edition</span></div>
      <span className={`router-power-label${device.power ? ' is-on' : ''}`}><span />{device.power ? 'Powered on' : 'Powered off'}</span>
    </header>
    <div className="router-shell">
      <nav className="router-nav" aria-label="Router settings">
        {sections.map(({ name: item, icon: Icon }) => <button key={item} type="button" onClick={() => switchSection(item)} aria-current={section === item ? 'page' : undefined} className={section === item ? 'is-active' : ''}><Icon size={19} /><span>{item}</span></button>)}
        <div className="router-nav-caption">{device.ip || 'IP not configured'}</div>
      </nav>
      <main className="router-main" id={`${panelId}-content`}>
        <div className="router-page-title"><div><span className="router-eyebrow">ROUTER CONFIGURATION</span><h2>{section === 'Status' ? 'Network status' : section === 'Internet' ? 'Internet settings' : section === 'Wireless' ? 'Wireless settings' : section === 'LAN' ? 'Local network' : 'System tools'}</h2></div><span className="router-version">Serverlab 2.0</span></div>
        {!device.power && <div className="router-notice router-notice-warning" role="status"><Power size={19} /><span>This router is powered off. Open System to power it on.</span></div>}
        {feedback && <div className={`router-notice${feedback.error ? ' router-notice-warning' : ' router-notice-success'}`} role={feedback.error ? 'alert' : 'status'}>{feedback.error ? <Info size={19} /> : <CheckCircle size={19} />}<span>{feedback.text}</span></div>}

        {section === 'Status' && <>
          <div className="router-status-overview">
            <div><Globe size={31} /><strong>{activePorts ? `${activePorts} active link${activePorts === 1 ? '' : 's'}` : 'No active links'}</strong><span>Ethernet connectivity</span></div>
            <div><WifiHigh size={31} /><strong>{savedWireless.wirelessEnabled && device.power ? savedWireless.ssid : 'Wireless disabled'}</strong><span>{savedWireless.security}</span></div>
          </div>
          <div className="router-info-grid">
            <section className="router-card"><h3>LAN</h3><dl><div><dt>IP address</dt><dd>{device.ip || 'Not configured'}</dd></div><div><dt>Subnet mask</dt><dd>{device.mask || 'Not configured'}</dd></div><div><dt>Address mode</dt><dd>Static IPv4</dd></div></dl><button type="button" className="router-text-button" onClick={() => switchSection('LAN')}>Edit LAN settings →</button></section>
            <section className="router-card"><h3>Upstream network</h3><dl><div><dt>Default gateway</dt><dd>{device.gateway || 'Not configured'}</dd></div><div><dt>DNS server</dt><dd>{device.dns || 'Not configured'}</dd></div><div><dt>Internet access</dt><dd>Local simulation</dd></div></dl><button type="button" className="router-text-button" onClick={() => switchSection('Internet')}>Edit network settings →</button></section>
          </div>
          <section className="router-card router-port-card"><h3>Ethernet ports</h3><div className="router-ports">{ports.map(port => <div key={port.id} className={`router-port${port.active ? ' is-active' : ''}`}><PlugsConnected size={27} /><strong>LAN {port.number}</strong><span>{port.peer ? port.peer.name : 'Empty'}</span><small>{port.active ? 'Link up' : port.peer ? 'Link down' : 'Disconnected'}</small></div>)}</div></section>
        </>}

        {(section === 'Internet' || section === 'LAN') && <form className="router-form" onSubmit={saveNetwork}>
          <section className="router-card">
            <h3>{section === 'LAN' ? 'LAN configuration' : 'Upstream configuration'}</h3>
            <p className="router-description">{section === 'LAN' ? 'Set the router address used by devices on your local network.' : 'Configure the default gateway and DNS server used by this router.'}</p>
            <fieldset disabled={!device.power}>
              {section === 'LAN' ? <><label>IP address<input autoComplete="off" inputMode="decimal" required aria-label="Router LAN IP address" value={network.ip} placeholder="192.168.1.1" onChange={event => setNetwork({ ...network, ip: event.target.value })} /></label><label>Subnet mask<input autoComplete="off" inputMode="decimal" required aria-label="Router subnet mask" value={network.mask} placeholder="255.255.255.0" onChange={event => setNetwork({ ...network, mask: event.target.value })} /></label></> : <><label>Connection type<input readOnly value="Static IPv4" aria-label="Router connection type" /></label><label>Default gateway<input autoComplete="off" inputMode="decimal" aria-label="Router default gateway" value={network.gateway} placeholder="Optional upstream router address" onChange={event => setNetwork({ ...network, gateway: event.target.value })} /></label><label>Primary DNS<input autoComplete="off" inputMode="decimal" aria-label="Router primary DNS" value={network.dns} placeholder="192.168.1.10" onChange={event => setNetwork({ ...network, dns: event.target.value })} /></label></>}
            </fieldset>
            <p className="router-help">{section === 'LAN' ? 'LAN changes apply immediately to the simulated network. Update client gateways if you change this address.' : 'This lab uses static addresses. DHCP leasing and real internet access are not simulated.'}</p>
          </section>
          <div className="router-actions"><button className="router-button-primary" type="submit" disabled={!device.power}>Save settings</button><button className="router-button-secondary" type="button" onClick={() => { setNetwork({ ip: device.ip, mask: device.mask, gateway: device.gateway, dns: device.dns }); setFeedback(undefined); }}>Discard changes</button></div>
        </form>}

        {section === 'Wireless' && <form className="router-form" onSubmit={saveWireless}>
          <section className="router-card"><h3>Wireless network</h3><p className="router-description">Configure your router’s wireless name and security.</p>
            <fieldset disabled={!device.power}>
              <label className="router-checkbox"><input type="checkbox" checked={wireless.wirelessEnabled} onChange={event => setWireless({ ...wireless, wirelessEnabled: event.target.checked })} /><span>Enable wireless radio</span></label>
              <label>Network name (SSID)<input required maxLength={32} autoComplete="off" value={wireless.ssid} onChange={event => setWireless({ ...wireless, ssid: event.target.value })} /></label>
              <label>Security<select value={wireless.security} onChange={event => setWireless({ ...wireless, security: event.target.value as WirelessConfig['security'] })}><option value="WPA2-Personal">WPA2-Personal</option><option value="Open">Open network</option></select></label>
              {wireless.security === 'WPA2-Personal' && <><label>Wireless password<input type={showPassword ? 'text' : 'password'} required minLength={8} maxLength={63} autoComplete="new-password" value={wireless.password} onChange={event => setWireless({ ...wireless, password: event.target.value })} /></label><label className="router-checkbox"><input type="checkbox" checked={showPassword} onChange={event => setShowPassword(event.target.checked)} /><span>Show password</span></label></>}
            </fieldset>
            <p className="router-help">Wireless settings are saved with this lab. Wireless client connections are not simulated.</p>
          </section>
          <div className="router-actions"><button className="router-button-primary" type="submit" disabled={!device.power}>Save settings</button><button className="router-button-secondary" type="button" onClick={() => { setWireless(wirelessDefaults(device)); setFeedback(undefined); }}>Discard changes</button></div>
        </form>}

        {section === 'System' && <div className="router-system">
          <form className="router-form" onSubmit={saveName}><section className="router-card"><h3>Device identity</h3><label>Router name<input required pattern="[A-Za-z0-9][A-Za-z0-9-]{0,14}" maxLength={15} value={name} onChange={event => setName(event.target.value)} /></label><p className="router-help">Use a unique name with up to 15 letters, numbers, or hyphens.</p><button className="router-button-primary" type="submit">Save name</button></section></form>
          <section className="router-card"><h3>Power and maintenance</h3><p className="router-description">Restart the router to cycle its simulated power. Network and wireless settings are retained.</p><div className="router-actions"><button className="router-button-secondary" type="button" disabled={!device.power} onClick={reboot}><ArrowClockwise size={17} />Reboot router</button><button className="router-button-secondary" type="button" onClick={() => { dispatch({ type: 'POWER', id: device.id }); setFeedback({ error: false, text: `Router powered ${device.power ? 'off' : 'on'}.` }); }}><Power size={17} />Power {device.power ? 'off' : 'on'}</button></div></section>
        </div>}
      </main>
    </div>
    <footer className="router-footer"><span>TP-Link-style simulated router</span><span>Part of your Serverlab sandbox</span></footer>
  </section>;
}
