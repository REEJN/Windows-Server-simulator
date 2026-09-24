import { useEffect, useRef, useState } from 'react';
import {
  ArrowClockwise, ArrowLeft, ArrowRight, ArrowsIn, ArrowsOut, CheckCircle,
  Desktop, FileText, FloppyDisk, FolderOpen, GearSix, Globe, HardDrives,
  House, ListChecks, Minus, Network, Plus, Power, ShareNetwork,
  TerminalWindow, Trash, WarningCircle, WindowsLogo, X,
} from '@phosphor-icons/react';
import { useLab } from './store';
import { getObjectives, getSharedFiles, ping, type Device } from './core';
import { RouterPanel } from './RouterPanel';
import './workstation.css';

const applications = {
  browser: { title: 'Lab Browser', icon: Globe, color: 'browser' },
  terminal: { title: 'Command Prompt', icon: TerminalWindow, color: 'terminal' },
  control: { title: 'Control Panel', icon: GearSix, color: 'control' },
  files: { title: 'File Explorer', icon: FolderOpen, color: 'files' },
  mission: { title: 'Mission Center', icon: ListChecks, color: 'mission' },
};
type AppId = keyof typeof applications;
const appIds = Object.keys(applications) as AppId[];
const message = () => useLab.getState().lab.events.at(-1)?.message || '';

function CommandPrompt({ device, active }: { device: Device; active: boolean }) {
  const lab = useLab(s => s.lab);
  const [command, setCommand] = useState('');
  const [lines, setLines] = useState(['Serverlab Windows Workstation [Simulated environment]', 'Type help to see available commands.', '']);
  const [history, setHistory] = useState<string[]>([]);
  const historyPosition = useRef(0);
  const input = useRef<HTMLInputElement>(null);
  const output = useRef<HTMLDivElement>(null);
  useEffect(() => { if (active) input.current?.focus(); }, [active]);
  useEffect(() => { output.current?.scrollTo(0, output.current.scrollHeight); }, [lines]);
  const run = () => {
    const value = command.trim();
    if (!value) return;
    const [raw, ...args] = value.split(/\s+/);
    const cmd = raw.toLowerCase();
    setHistory(previous => [...previous.slice(-49), value]);
    historyPosition.current = Math.min(history.length + 1, 50);
    setCommand('');
    if (cmd === 'cls' || cmd === 'clear') { setLines([]); return; }
    let result = '';
    if (cmd === 'help') result = 'help                 Show available commands\nipconfig [/all]      Show network configuration\nping <IP or host>    Test the lab network\nhostname             Show this computer name\nwhoami               Show the current user\ndir                  List local text files\ntype <filename>      Read a local text file\ncls                  Clear the screen';
    else if (cmd === 'ipconfig') result = `Windows IP Configuration\n\nEthernet adapter Ethernet:\n   Host name . . . . . . . : ${device.name}\n   IPv4 address . . . . . : ${device.ip || 'Not configured'}\n   Subnet mask . . . . .  : ${device.mask}\n   Default gateway . . . : ${device.gateway || 'Not configured'}\n   DNS server . . . . .  : ${device.dns || 'Not configured'}`;
    else if (cmd === 'ping') result = ping(lab, device.id, args.join(' ')).message;
    else if (cmd === 'hostname') result = device.name;
    else if (cmd === 'whoami') result = `${device.joinedDomain || device.name}\\Student`;
    else if (cmd === 'dir') result = `Directory of C:\\Users\\Student\\Documents\n\n${(device.files || []).map(file => `${file.content.length.toString().padStart(7)}  ${file.name}`).join('\n') || 'No files found.'}`;
    else if (cmd === 'type') { const file = device.files?.find(f => f.name.toLowerCase() === args.join(' ').replace(/^"|"$/g, '').toLowerCase()); result = file ? file.content : 'The system cannot find the file specified.'; }
    else result = `'${raw}' is not a supported simulated command. Type help.`;
    setLines(previous => [...previous.slice(-150), `C:\\Users\\Student> ${value}`, result, '']);
  };
  return <div className="pc-command" ref={output} onClick={() => input.current?.focus()}><pre>{lines.join('\n')}</pre><form onSubmit={event => { event.preventDefault(); run(); }}><label htmlFor={`command-${device.id}`}>C:\Users\Student&gt;</label><input ref={input} id={`command-${device.id}`} aria-label="Command Prompt command" value={command} autoComplete="off" spellCheck={false} onChange={event => setCommand(event.target.value)} onKeyDown={event => {
    if (event.key === 'ArrowUp') { event.preventDefault(); historyPosition.current = Math.max(0, historyPosition.current - 1); setCommand(history[historyPosition.current] || ''); }
    if (event.key === 'ArrowDown') { event.preventDefault(); historyPosition.current = Math.min(history.length, historyPosition.current + 1); setCommand(history[historyPosition.current] || ''); }
  }} /><button type="submit" aria-label="Run command"><ArrowRight size={17} /></button></form></div>;
}

function ControlPanel({ device }: { device: Device }) {
  const dispatch = useLab(s => s.dispatch);
  const [network, setNetwork] = useState({ ip: device.ip, mask: device.mask, gateway: device.gateway, dns: device.dns });
  const [domain, setDomain] = useState(device.joinedDomain || '');
  const [notice, setNotice] = useState('');
  useEffect(() => setNetwork({ ip: device.ip, mask: device.mask, gateway: device.gateway, dns: device.dns }), [device.ip, device.mask, device.gateway, device.dns]);
  const labels = { ip: 'IP address', mask: 'Subnet mask', gateway: 'Default gateway', dns: 'Preferred DNS server' };
  return <div className="pc-control"><div className="pc-page-heading"><Desktop size={34} /><div><h2>System and Network</h2><p>{device.name} · Windows Workstation</p></div></div><div className="pc-control-columns"><section><h3><Network size={18} />Ethernet properties</h3><p>Configure this computer’s IPv4 adapter.</p><form onSubmit={event => { event.preventDefault(); dispatch({ type: 'UPDATE_NETWORK', id: device.id, ...network }); setNotice(message()); }}>{(Object.keys(labels) as (keyof typeof labels)[]).map(key => <label key={key}>{labels[key]}<input value={network[key]} onChange={event => setNetwork({ ...network, [key]: event.target.value })} placeholder={key === 'mask' ? '255.255.255.0' : '192.168.1.10'} inputMode="decimal" spellCheck={false} required={key === 'ip' || key === 'mask'} /></label>)}<button className="pc-primary" type="submit">Apply network settings</button></form></section><section><h3><Desktop size={18} />Computer identity</h3><dl><dt>Computer name</dt><dd>{device.name}</dd><dt>Operating system</dt><dd>Windows Workstation</dd><dt>Domain / workgroup</dt><dd>{device.joinedDomain || 'WORKGROUP'}</dd></dl><form onSubmit={event => { event.preventDefault(); dispatch({ type: 'JOIN_DOMAIN', id: device.id, domain }); setNotice(message()); }}><label>Join a domain<input value={domain} onChange={event => setDomain(event.target.value)} placeholder="school.local" required /></label><p>Set preferred DNS to your domain controller before joining.</p><button className="pc-secondary" type="submit">Join domain</button></form><button className="pc-power-control" onClick={() => dispatch({ type: 'POWER', id: device.id })}><Power size={16} />Shut down this computer</button></section></div>{notice && <p className="pc-notice" role="status">{notice}</p>}</div>;
}

function LabBrowser({ device, onOpenControl }: { device: Device; onOpenControl: () => void }) {
  const lab = useLab(s => s.lab);
  const [address, setAddress] = useState('http://localhost');
  const [history, setHistory] = useState(['http://localhost']);
  const [index, setIndex] = useState(0);
  const [reload, setReload] = useState(0);
  const [visitedRouters, setVisitedRouters] = useState<Record<string, string>>({});
  const current = history[index];
  let host = '';
  try { host = new URL(current.includes('://') ? current : `http://${current}`).hostname; } catch { /* Invalid text remains visible as a browser error. */ }
  const local = ['localhost', '127.0.0.1'].includes(host);
  const router = Object.values(lab.devices).find(candidate => candidate.kind === 'router' && candidate.ip && candidate.ip === host);
  const reachability = router ? ping(lab, device.id, router.ip) : null;
  useEffect(() => {
    if (router && reachability?.ok) setVisitedRouters(previous => previous[current] === router.id ? previous : { ...previous, [current]: router.id });
  }, [current, router?.id, reachability?.ok]);
  const previousRouter = !router && visitedRouters[current] ? lab.devices[visitedRouters[current]] : undefined;
  const movedRouter = previousRouter?.kind === 'router' && previousRouter.ip && previousRouter.ip !== host ? previousRouter : undefined;
  const navigate = (value: string) => {
    const destination = value.trim() || 'http://localhost';
    const next = [...history.slice(0, index + 1), destination];
    setHistory(next); setIndex(next.length - 1); setAddress(destination);
  };
  const move = (offset: number) => { const next = index + offset; if (next < 0 || next >= history.length) return; setIndex(next); setAddress(history[next]); };
  return <div className="pc-browser"><form className="pc-address-bar" onSubmit={event => { event.preventDefault(); navigate(address); }}><button type="button" aria-label="Back" disabled={index === 0} onClick={() => move(-1)}><ArrowLeft size={17} /></button><button type="button" aria-label="Forward" disabled={index === history.length - 1} onClick={() => move(1)}><ArrowRight size={17} /></button><button type="button" aria-label="Reload page" onClick={() => setReload(value => value + 1)}><ArrowClockwise size={17} /></button><button type="button" aria-label="Browser home" onClick={() => navigate('http://localhost')}><House size={17} /></button><label><Globe size={15} /><input aria-label="Browser address" value={address} onChange={event => setAddress(event.target.value)} autoComplete="off" spellCheck={false} placeholder="Enter a router IP address" /></label><button type="submit" aria-label="Go to address"><ArrowRight size={17} /></button></form><div className="pc-browser-page">{local ? <div className="pc-browser-home"><Globe size={43} weight="duotone" /><span>YOUR LOCAL LAB</span><h2>Welcome to {device.name}</h2><p>Open a router’s IP address to configure your network. Everything here belongs to your simulated lab.</p><div className="pc-browser-links">{Object.values(lab.devices).filter(candidate => candidate.kind === 'router' && candidate.ip).map(candidate => <button key={candidate.id} onClick={() => navigate(`http://${candidate.ip}`)}><Network size={22} /><strong>{candidate.name}</strong><small>{candidate.ip}</small><ArrowRight size={16} /></button>)}<button onClick={onOpenControl}><GearSix size={22} /><strong>Network settings</strong><small>IP address, gateway, and DNS</small><ArrowRight size={16} /></button></div></div> : router && reachability?.ok ? <div className="pc-router-page" key={`${router.id}-${reload}`}><RouterPanel deviceId={router.id} embedded /></div> : <div className="pc-browser-error"><WarningCircle size={43} /><h2>{router ? 'This device can’t be reached' : movedRouter ? 'The router address changed' : 'This page isn’t in your lab'}</h2><p>{router ? reachability?.message : movedRouter ? `${movedRouter.name} now uses ${movedRouter.ip}. Open the new address; your workstation must still have a valid network path to it.` : 'Enter localhost or the IP address of a router in this workspace. This simulated browser does not access the public internet.'}</p><code>{current}</code>{movedRouter && <button className="pc-primary" onClick={() => navigate(`http://${movedRouter.ip}`)}>Open {movedRouter.ip}</button>}<button className="pc-secondary" onClick={onOpenControl}>Open network settings</button></div>}</div><footer><span>Simulated intranet</span><span>No internet requests</span></footer></div>;
}

type Selection = { deviceId: string; fileId: string } | null;
type EditorFile = { deviceId: string; deviceName: string; fileId: string; name: string; content: string; writable: boolean };
function FileExplorer({ device }: { device: Device }) {
  const lab = useLab(s => s.lab);
  const dispatch = useLab(s => s.dispatch);
  const [view, setView] = useState<'local' | 'network'>('local');
  const [selection, setSelection] = useState<Selection>(null);
  const [cachedFile, setCachedFile] = useState<EditorFile | null>(null);
  const [filename, setFilename] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [dirty, setDirty] = useState(false);
  const [notice, setNotice] = useState('');
  const localFiles = device.files || [];
  const remoteFiles = getSharedFiles(lab, device.id);
  const files = view === 'local' ? localFiles.map(file => ({ ...file, fileId: file.id, deviceId: device.id, deviceName: device.name, writable: true })) : remoteFiles;
  const availableFile = files.find(file => file.deviceId === selection?.deviceId && file.fileId === selection?.fileId);
  const accessLost = view === 'network' && Boolean(selection) && !availableFile;
  const selected = availableFile || (accessLost && cachedFile && selection && cachedFile.deviceId === selection.deviceId && cachedFile.fileId === selection.fileId ? { ...cachedFile, writable: false } : undefined);
  useEffect(() => { if (availableFile) setCachedFile({ ...availableFile }); }, [availableFile?.deviceId, availableFile?.fileId, availableFile?.name, availableFile?.content, availableFile?.writable]);
  useEffect(() => { setDraft(availableFile?.content || ''); setDirty(false); }, [selection?.deviceId, selection?.fileId, view]);
  useEffect(() => { if (!dirty && availableFile) setDraft(availableFile.content); }, [availableFile?.content, dirty]);
  const choose = (next: Selection) => { if (next?.deviceId === selection?.deviceId && next?.fileId === selection?.fileId) return; if (dirty && !window.confirm('Discard the unsaved text changes?')) return; setSelection(next); setNotice(''); };
  const changeView = (next: 'local' | 'network') => { if (next === view) return; if (dirty && !window.confirm('Discard the unsaved text changes?')) return; setView(next); setSelection(null); setNotice(''); };
  const save = () => {
    const selectedFile = selected;
    if (!availableFile || !availableFile.writable || !selectedFile) { setNotice('This file is not currently writable. Check its sharing permission and network connection.'); return; }
    if (selectedFile.deviceId === device.id) dispatch({ type: 'FILE_UPDATE', id: device.id, fileId: selectedFile.fileId, content: draft });
    else dispatch({ type: 'FILE_WRITE_REMOTE', sourceId: device.id, targetId: selectedFile.deviceId, fileId: selectedFile.fileId, content: draft });
    const actual = useLab.getState().lab.devices[selectedFile.deviceId]?.files?.find(file => file.id === selectedFile.fileId);
    if (actual?.content === draft) setDirty(false);
    setNotice(message());
  };
  const legacyFolders = view === 'network' ? Object.values(lab.devices).filter(candidate => candidate.kind === 'server' && candidate.os.domain === device.joinedDomain && ping(lab, device.id, candidate.ip).ok).flatMap(candidate => (candidate.os.folders || []).filter((folder: { shared: boolean }) => folder.shared).map((folder: { id: string; name: string; shareName?: string }) => ({ id: `${candidate.id}-${folder.id}`, path: `\\\\${candidate.name}\\${folder.shareName || folder.name}` }))) : [];
  return <div className="pc-explorer"><div className="pc-explorer-toolbar"><FolderOpen size={19} /><span>{view === 'local' ? `${device.name} › Documents` : 'Network › Shared text files'}</span>{view === 'local' && <button className="pc-secondary" onClick={() => setCreateOpen(value => !value)}><Plus size={14} />New text file</button>}</div>{createOpen && view === 'local' && <form className="pc-create-file" onSubmit={event => { event.preventDefault(); if (dirty && !window.confirm('Discard the unsaved text changes?')) return; const ids = new Set(localFiles.map(file => file.id)); dispatch({ type: 'FILE_CREATE', id: device.id, name: filename, content: '' }); const created = useLab.getState().lab.devices[device.id]?.files?.find(file => !ids.has(file.id)); if (created) { setFilename(''); setCreateOpen(false); setSelection({ deviceId: device.id, fileId: created.id }); } setNotice(message()); }}><label>File name<input aria-label="New text file name" value={filename} onChange={event => setFilename(event.target.value)} placeholder="notes.txt" maxLength={120} required autoFocus /></label><button type="submit" className="pc-primary">Create</button><button type="button" className="pc-secondary" onClick={() => setCreateOpen(false)}>Cancel</button></form>}<div className="pc-explorer-layout"><nav aria-label="File locations"><button className={view === 'local' ? 'selected' : ''} onClick={() => changeView('local')}><HardDrives size={18} /><span>Documents</span></button><button className={view === 'network' ? 'selected' : ''} onClick={() => changeView('network')}><Network size={18} /><span>Network</span></button></nav><div className="pc-files-main"><div className="pc-file-list" aria-label={view === 'local' ? 'Local files' : 'Shared files'}>{files.length ? files.map(file => <button key={`${file.deviceId}-${file.fileId}`} className={selected?.fileId === file.fileId && selected?.deviceId === file.deviceId ? 'selected' : ''} onClick={() => choose({ deviceId: file.deviceId, fileId: file.fileId })}><FileText size={23} /><span><strong>{file.name}</strong><small>{view === 'network' ? `${file.deviceName} · ${file.writable ? 'Read & write' : 'Read only'}` : localFiles.find(local => local.id === file.fileId)?.shared ? 'Shared on the network' : 'Local text file'}</small></span></button>) : <div className="pc-files-empty"><FolderOpen size={29} /><p>{view === 'local' ? 'This folder is empty. Create a text file to get started.' : 'No shared text files are reachable. Share a file from another powered computer and connect their networks.'}</p></div>}{legacyFolders.length > 0 && <div className="pc-legacy-shares"><h3>Server folders</h3>{legacyFolders.map((folder: { id: string; path: string }) => <p key={folder.id}><FolderOpen size={16} />{folder.path}</p>)}<small>Folder entries from Windows Server; text files are listed above.</small></div>}</div>{selected ? <section className="pc-file-editor" aria-label={`${selected.name} editor`}><header><div><strong>{selected.name}</strong><span>{accessLost ? 'Network file unavailable · draft retained' : dirty ? 'Unsaved changes' : selected.writable ? 'Text document' : 'Read-only network file'}</span></div>{selected.deviceId === device.id && <div><button title={localFiles.find(file => file.id === selected.fileId)?.shared ? 'Stop sharing file' : 'Share file'} aria-label={localFiles.find(file => file.id === selected.fileId)?.shared ? 'Stop sharing file' : 'Share file'} className={localFiles.find(file => file.id === selected.fileId)?.shared ? 'is-shared' : ''} onClick={() => { const file = localFiles.find(candidate => candidate.id === selected.fileId); dispatch({ type: 'FILE_SHARE', id: device.id, fileId: selected.fileId, shared: !file?.shared }); setNotice(message()); }}><ShareNetwork size={18} /></button><button aria-label="Delete file" title="Delete file" onClick={() => { dispatch({ type: 'FILE_DELETE', id: device.id, fileId: selected.fileId }); setSelection(null); setNotice(message()); }}><Trash size={18} /></button></div>}</header><textarea aria-label="Text file content" value={draft} readOnly={!selected.writable} onChange={event => { setDraft(event.target.value); setDirty(true); }} spellCheck={false} placeholder="Write your notes here…" /><footer><span>{draft.length} characters</span><button className="pc-primary" disabled={!selected.writable || !dirty} onClick={save}><FloppyDisk size={15} />Save{selected.deviceId !== device.id ? ' to network' : ''}</button></footer></section> : <div className="pc-editor-empty"><FileText size={35} /><p>Select a text file to read or edit it.</p></div>}</div></div>{(accessLost || notice) && <div className="pc-notice" role="status">{accessLost ? 'This file is no longer shared or reachable. Saving is disabled. Your text is retained here while you restore access.' : notice}</div>}</div>;
}

function MissionCenter() {
  const lab = useLab(s => s.lab);
  return <div className="pc-missions"><div className="pc-page-heading"><ListChecks size={34} /><div><h2>Your mission</h2><p>Build your first connected domain.</p></div></div>{getObjectives(lab).map(objective => <details key={objective.id} className={objective.done ? 'complete' : ''}><summary>{objective.done ? <CheckCircle size={20} weight="fill" /> : <span className="pc-objective-circle" />}<span><strong>{objective.title}</strong><small>{objective.detail}</small></span></summary><p>{objective.hint}</p></details>)}</div>;
}

export default function Workstation({ device }: { device: Device }) {
  const dispatch = useLab(s => s.dispatch);
  const [openApps, setOpenApps] = useState<AppId[]>([]);
  const [activeApp, setActiveApp] = useState<AppId | null>(null);
  const [startOpen, setStartOpen] = useState(false);
  const [maximized, setMaximized] = useState<Record<AppId, boolean>>({ browser: true, terminal: true, control: true, files: true, mission: true });
  const startRef = useRef<HTMLDivElement>(null);
  const launch = (app: AppId) => { setOpenApps(previous => previous.includes(app) ? previous : [...previous, app]); setActiveApp(app); setStartOpen(false); };
  const close = (app: AppId) => { const next = openApps.filter(id => id !== app); setOpenApps(next); setActiveApp(next.at(-1) || null); };
  useEffect(() => {
    if (!startOpen) return;
    const handler = (event: PointerEvent) => { if (!startRef.current?.contains(event.target as Node)) setStartOpen(false); };
    document.addEventListener('pointerdown', handler);
    return () => document.removeEventListener('pointerdown', handler);
  }, [startOpen]);
  if (!device.power) return <div className="power-screen pc-power-screen"><Power size={42} /><h2>{device.name} is powered off</h2><p>Your Windows workstation is installed and ready.</p><button className="primary" onClick={() => dispatch({ type: 'POWER', id: device.id })}>Power on</button></div>;
  return <div className="pc-desktop" onKeyDown={event => { if (event.key === 'Escape') setStartOpen(false); }}><div className="pc-wallpaper"><div className="pc-window-mark"><WindowsLogo size={160} weight="fill" /></div><span>{device.name}<small>Windows Workstation</small></span></div><div className="pc-desktop-icons">{appIds.map(id => { const app = applications[id]; return <button key={id} className={`pc-shortcut ${app.color}`} onClick={() => launch(id)}><app.icon size={36} weight="duotone" /><span>{app.title}</span></button>; })}</div>{openApps.map(id => { const app = applications[id]; return <section key={id} className={`pc-app-window ${maximized[id] ? 'expanded' : ''}`} hidden={activeApp !== id} aria-label={app.title}><header className="pc-window-title"><app.icon size={17} /><strong>{app.title}</strong><div /><button onClick={() => setActiveApp(null)} aria-label={`Minimize ${app.title}`}><Minus size={15} /></button><button onClick={() => setMaximized(value => ({ ...value, [id]: !value[id] }))} aria-label={maximized[id] ? 'Restore app window' : 'Maximize app window'}>{maximized[id] ? <ArrowsIn size={14} /> : <ArrowsOut size={14} />}</button><button className="pc-window-close" onClick={() => close(id)} aria-label={`Close ${app.title}`}><X size={17} /></button></header><div className={`pc-window-body pc-body-${id}`}>{id === 'browser' && <LabBrowser device={device} onOpenControl={() => launch('control')} />}{id === 'terminal' && <CommandPrompt device={device} active={activeApp === 'terminal'} />}{id === 'control' && <ControlPanel device={device} />}{id === 'files' && <FileExplorer device={device} />}{id === 'mission' && <MissionCenter />}</div></section>; })}<div className="pc-start-area" ref={startRef}>{startOpen && <div className="pc-start-menu"><header><div>S</div><span>Student<small>{device.name}</small></span></header><p>Applications</p>{appIds.map(id => { const app = applications[id]; return <button key={id} onClick={() => launch(id)}><app.icon size={23} weight="duotone" /><span>{app.title}</span></button>; })}<footer><span>{device.joinedDomain || 'WORKGROUP'}</span><button onClick={() => dispatch({ type: 'POWER', id: device.id })}><Power size={18} />Shut down</button></footer></div>}<button className={`pc-start-button ${startOpen ? 'active' : ''}`} aria-label="Start menu" aria-expanded={startOpen} onClick={() => setStartOpen(value => !value)}><WindowsLogo size={23} weight="fill" /></button></div><div className="pc-taskbar"><div className="pc-taskbar-reserve" />{(['browser', 'files', 'terminal', 'control', 'mission'] as AppId[]).map(id => { const app = applications[id]; return <button key={id} className={`${openApps.includes(id) ? 'running' : ''} ${activeApp === id ? 'active' : ''}`} title={app.title} aria-label={`Open ${app.title}`} onClick={() => activeApp === id ? setActiveApp(null) : launch(id)}><app.icon size={23} weight="duotone" /></button>; })}<div className="pc-taskbar-spacer" /><button title="Network settings" aria-label="Open network settings" onClick={() => launch('control')}><Network size={19} /></button><span className="pc-tray-name">{device.name}<small>{device.joinedDomain || 'WORKGROUP'}</small></span><button className="pc-show-desktop" aria-label="Show desktop" title="Show desktop" onClick={() => { setActiveApp(null); setStartOpen(false); }} /></div></div>;
}
