import { useEffect, useRef, useState } from 'react';
import { ArrowsOut, ArrowsIn, X } from '@phosphor-icons/react';
import { useLab } from './store';
import { connected, ping, type Device } from './core';
import Workstation from './Workstation';

function hardwareMessage(device: Device) {
  const lab = useLab.getState().lab;
  return {
    type: 'serverlab:hardware', deviceId: device.id,
    hardware: { usb: connected(lab, device.id, 'usb'), ethernet: connected(lab, device.id), power: device.power },
    network: { ip: device.ip, mask: device.mask, gateway: device.gateway, dns: device.dns },
    name: device.name,
  };
}
function ServerFrame({ device }: { device: Device }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const ready = useRef(false);
  useEffect(() => {
    ready.current = false;
    const receive = (event: MessageEvent) => {
      if (event.origin !== location.origin || event.source !== frame.current?.contentWindow || !event.data || typeof event.data !== 'object') return;
      const current = useLab.getState();
      const active = current.lab.devices[device.id];
      if (!active) return;
      if (event.data.type === 'serverlab:ready') {
        ready.current = true;
        frame.current?.contentWindow?.postMessage({ ...hardwareMessage(active), type: 'serverlab:init', os: active.os }, location.origin);
      } else if (event.data.type === 'serverlab:state' && event.data.deviceId === active.id) {
        current.dispatch({ type: 'OS_SYNC', id: active.id, os: event.data.os });
      } else if (event.data.type === 'serverlab:ping' && event.data.deviceId === active.id && typeof event.data.target === 'string') {
        const result = ping(current.lab, active.id, event.data.target);
        frame.current?.contentWindow?.postMessage({ type: 'serverlab:ping-result', requestId: event.data.requestId, ...result }, location.origin);
      }
    };
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, [device.id]);
  useEffect(() => {
    if (ready.current) frame.current?.contentWindow?.postMessage(hardwareMessage(device), location.origin);
  }, [device]);
  return <iframe ref={frame} src="/client/index.html" title={`${device.name} Windows Server console`} className="server-frame" />;
}
export default function Console({ id, onClose }: { id: string; onClose: () => void }) {
  const device = useLab(s => s.lab.devices[id]);
  const [full, setFull] = useState(() => window.matchMedia('(max-width: 760px)').matches);
  if (!device) return null;
  return <section className={`console-window ${full ? 'maximized' : ''}`} aria-label={`${device.name} console`}>
    <header><i className={`status-dot ${device.power ? 'on' : ''}`} /><strong>{device.name}</strong>
      <span>{device.kind === 'server' ? 'Windows Server · Virtual console' : 'Windows PC · Virtual console'}</span><div className="spacer" />
      <button onClick={() => setFull(!full)} aria-label={full ? 'Restore console' : 'Maximize console'}>{full ? <ArrowsIn size={17} /> : <ArrowsOut size={17} />}</button>
      <button onClick={onClose} aria-label="Close console"><X size={19} /></button>
    </header>
    {device.kind === 'server' ? <ServerFrame key={id} device={device} /> : <Workstation key={id} device={device} />}
  </section>;
}
