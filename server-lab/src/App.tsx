import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Cube,
  SquaresFour,
  Flag,
  BookOpen,
  Trophy,
  GearSix,
  MagnifyingGlass,
  Plus,
  PlugsConnected,
  CaretRight,
  Check,
  Lightbulb,
  TerminalWindow,
  Broadcast,
  FloppyDisk,
  X,
  Power,
  ArrowSquareOut,
  Trash,
  DownloadSimple,
  UploadSimple,
  ArrowCounterClockwise,
  Info,
  ListChecks,
  Network,
  Play,
  Desktop,
} from "@phosphor-icons/react";
import { hydrateLab, useLab } from "./store";
import {
  deviceCatalog,
  getObjectives,
  ping,
  restoreLab,
  createLab,
  type Device,
  type DeviceKind,
} from "./core";
const Topology = lazy(() => import("./Topology"));
const Console = lazy(() => import("./Console"));
const RouterPanel = lazy(() => import('./RouterPanel').then(module => ({ default: module.RouterPanel })));
const kinds = (Object.keys(deviceCatalog) as DeviceKind[]).filter(kind => kind !== 'usb');
const navigation = [
  { id: "Lab", icon: SquaresFour },
  { id: "Challenges", icon: Flag },
  { id: "Learn", icon: BookOpen },
  { id: "Achievements", icon: Trophy },
  { id: "Settings", icon: GearSix },
];

function Dialog({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      className={`dialog ${wide ? 'dialog-wide' : ''}`}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <header>
        <h2>{title}</h2>
        <button aria-label="Close dialog" onClick={onClose}>
          <X size={21} />
        </button>
      </header>
      <div className="dialog-body">{children}</div>
    </dialog>
  );
}
function ConnectDialog({
  initial,
  onClose,
}: {
  initial?: string;
  onClose: () => void;
}) {
  const lab = useLab((s) => s.lab);
  const dispatch = useLab((s) => s.dispatch);
  const [source, setSource] = useState(
    initial || Object.keys(lab.devices)[0] || "",
  );
  const [target, setTarget] = useState("");
  const [notice, setNotice] = useState("");
  return (
    <Dialog title="Connect devices" onClose={onClose}>
      <p className="muted">
        Choose two devices. Available Ethernet ports are assigned automatically.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const before = Object.keys(lab.links).length;
          dispatch({ type: "CONNECT", source, target });
          const after = useLab.getState().lab;
          if (Object.keys(after.links).length > before) onClose();
          else
            setNotice(
              after.events.at(-1)?.message || "Connection could not be made.",
            );
        }}
      >
        <label>
          From
          <select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            required
          >
            <option value="">Select device</option>
            {Object.values(lab.devices).map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} · {deviceCatalog[d.kind].label}
              </option>
            ))}
          </select>
        </label>
        <label>
          To
          <select
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            required
          >
            <option value="">Select device</option>
            {Object.values(lab.devices)
              .filter((d) => d.id !== source)
              .map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} · {deviceCatalog[d.kind].label}
                </option>
              ))}
          </select>
        </label>
        {notice && (
          <p className="form-notice" role="alert">
            {notice}
          </p>
        )}
        <button className="primary" disabled={!source || !target}>
          <PlugsConnected size={18} />
          Connect cable
        </button>
      </form>
    </Dialog>
  );
}
function Inspector({
  device,
  onOpen,
  onConnect,
  onClose,
  onSelect,
}: {
  device: Device;
  onOpen: (id: string) => void;
  onConnect: () => void;
  onClose: () => void;
  onSelect: (id: string) => void;
}) {
  const lab = useLab((s) => s.lab);
  const dispatch = useLab((s) => s.dispatch);
  const [notice, setNotice] = useState("");
  const [values, setValues] = useState({
    name: device.name,
    ip: device.ip,
    mask: device.mask,
    gateway: device.gateway,
    dns: device.dns,
  });
  useEffect(
    () =>
      setValues({
        name: device.name,
        ip: device.ip,
        mask: device.mask,
        gateway: device.gateway,
        dns: device.dns,
      }),
    [device.name, device.ip, device.mask, device.gateway, device.dns],
  );
  const host = device.kind === "server" || device.kind === "computer";
  const links = Object.values(lab.links).filter(
    (l) => l.source === device.id || l.target === device.id,
  );
  return (
    <aside className="inspector">
      <header>
        <span className="eyebrow">DEVICE CONFIGURATION</span>
        <button onClick={onClose} aria-label="Close device configuration">
          <X size={18} />
        </button>
      </header>
      <div className="inspector-device">
        <img src={`/assets/${device.kind}.webp`} alt="" />
        <div>
          <h2>{device.name}</h2>
          <span>
            <i className={`status-dot ${device.power ? "on" : ""}`} />
            {device.kind === "usb"
              ? "Installation media"
              : device.power
                ? "Powered on"
                : "Powered off"}
          </span>
        </div>
      </div>
      <label className="device-picker">Selected device<select value={device.id} onChange={event => onSelect(event.target.value)}>{Object.values(lab.devices).map(item => <option key={item.id} value={item.id}>{item.name} · {deviceCatalog[item.kind].label}</option>)}</select></label>
      <div className="button-row">
        {device.kind !== "usb" && (
          <button onClick={() => dispatch({ type: "POWER", id: device.id })}>
            <Power size={16} />
            {device.power ? "Power off" : "Power on"}
          </button>
        )}
        {(host || device.kind === 'router') && (
          <button className="primary" onClick={() => onOpen(device.id)}>
            <ArrowSquareOut size={16} />
            {device.kind === 'router' ? 'Router settings' : 'Open console'}
          </button>
        )}
      </div>
      {device.kind === 'server' && <section className="device-media"><div><img src="/assets/usb.webp" alt="Bootable USB" /><span><strong>Ventoy installation media</strong><small>{device.bootMedia === 'used' ? 'Used · installation complete' : device.bootMedia === 'inserted' ? 'Inserted · select in BIOS' : 'One installation per server'}</small></span></div><button className="secondary" disabled={device.bootMedia === 'used'} onClick={() => dispatch({ type: device.bootMedia === 'inserted' ? 'EJECT_BOOT_MEDIA' : 'INSERT_BOOT_MEDIA', id: device.id })}>{device.bootMedia === 'used' ? 'Bootable device used' : device.bootMedia === 'inserted' ? 'Eject bootable device' : 'Insert bootable device'}</button></section>}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (values.name !== device.name)
            dispatch({ type: "RENAME", id: device.id, name: values.name });
          if (device.kind !== "usb" && device.kind !== "switch")
            dispatch({ type: "UPDATE_NETWORK", id: device.id, ...values });
          setNotice(useLab.getState().lab.events.at(-1)?.message || "Updated.");
        }}
      >
        <label>
          Computer name
          <input
            value={values.name}
            onChange={(e) => setValues({ ...values, name: e.target.value })}
            maxLength={15}
            required
            pattern="[A-Za-z0-9][A-Za-z0-9-]{0,14}"
          />
        </label>
        {device.kind !== "usb" && device.kind !== "switch" && (
          <>
            {(["ip", "mask", "gateway", "dns"] as const).map((key) => (
              <label key={key}>
                {
                  {
                    ip: "IPv4 address",
                    mask: "Subnet mask",
                    gateway: "Default gateway",
                    dns: "DNS server",
                  }[key]
                }
                <input
                  value={values[key]}
                  onChange={(e) =>
                    setValues({ ...values, [key]: e.target.value })
                  }
                  placeholder={
                    key === "mask" ? "255.255.255.0" : "192.168.1.10"
                  }
                />
              </label>
            ))}
          </>
        )}
        <button type="submit" className="secondary">
          <FloppyDisk size={16} />
          Apply configuration
        </button>
        {notice && (
          <p className="form-notice" role="status">
            {notice}
          </p>
        )}
      </form>
      <div className="section-heading">
        <h3>Connections</h3>
        <button onClick={onConnect} aria-label="Add cable connection">
          <Plus size={17} />
        </button>
      </div>
      {links.length ? (
        links.map((l) => (
          <div className="connection-row" key={l.id}>
            <PlugsConnected size={16} />
            <div>
              <strong>
                {
                  lab.devices[l.source === device.id ? l.target : l.source]
                    ?.name
                }
              </strong>
              <small>
                {l.kind.toUpperCase()} ·{" "}
                {l.source === device.id ? l.sourcePort : l.targetPort}
              </small>
            </div>
            <button
              onClick={() => dispatch({ type: "DISCONNECT", id: l.id })}
              aria-label={`Disconnect ${l.kind} cable`}
            >
              <X size={16} />
            </button>
          </div>
        ))
      ) : (
        <p className="muted">No cables connected.</p>
      )}
      <button
        className="text-danger"
        onClick={() => {
          if (window.confirm(`Remove ${device.name} and its saved OS state?`)) {
            dispatch({ type: "REMOVE_DEVICE", id: device.id });
            onClose();
          }
        }}
      >
        <Trash size={16} />
        Remove device
      </button>
    </aside>
  );
}
function Missions() {
  const lab = useLab((s) => s.lab);
  const objectives = getObjectives(lab);
  const completed = objectives.filter((o) => o.done).length;
  const [hint, setHint] = useState<string | null>(null);
  const current = objectives.find((o) => !o.done);
  return (
    <>
      <div className="mission-heading">
        <Flag weight="fill" size={17} />
        <span>ACTIVE MISSION</span>
        <span className="mission-number">01</span>
      </div>
      <div className="mission-intro">
        <span className="eyebrow">
          {lab.mode === "guided"
            ? "GUIDED LAB"
            : "SANDBOX · OPTIONAL CHALLENGE"}
        </span>
        <h1>
          Build your first
          <br />
          domain.
        </h1>
        <p>From bare metal to a connected network. You’re the administrator.</p>
        <div className="progress-label">
          <span>Mission progress</span>
          <strong>
            {completed} / {objectives.length}
          </strong>
        </div>
        <div className="progress-track">
          <div style={{ width: `${(completed / objectives.length) * 100}%` }} />
        </div>
      </div>
      <div className="objectives">
        {objectives.map((o, i) => (
          <button
            className={`objective ${o.done ? "complete" : ""} ${current?.id === o.id ? "current" : ""}`}
            key={o.id}
            onClick={() => setHint(hint === o.id ? null : o.id)}
          >
            <span className="objective-check">
              {o.done ? (
                <Check weight="bold" size={13} />
              ) : (
                String(i + 1).padStart(2, "0")
              )}
            </span>
            <span>
              <strong>{o.title}</strong>
              <small>{o.detail}</small>
              {hint === o.id && <em>{o.hint}</em>}
            </span>
            <CaretRight className="objective-chevron" size={13} />
          </button>
        ))}
      </div>
      <div className="mission-reward">
        <Trophy size={26} />
        <div>
          <span>MISSION REWARD</span>
          <strong>
            {completed === objectives.length
              ? "Domain architect unlocked"
              : "Domain architect badge"}
          </strong>
        </div>
        <b>{completed * 100} XP</b>
      </div>
      <button
        className="hint-button"
        onClick={() =>
          current && setHint(hint === current.id ? null : current.id)
        }
        disabled={!current}
      >
        <Lightbulb size={17} />
        {current ? "Need a hint?" : "Mission complete"}
        <CaretRight size={14} />
      </button>
    </>
  );
}
function Simulation({ onTrace }: { onTrace: (path: string[]) => void }) {
  const lab = useLab((s) => s.lab);
  const [source, setSource] = useState("pc-1");
  const [target, setTarget] = useState("192.168.1.10");
  const [result, setResult] = useState(
    "Select a source and destination to test the actual network path.",
  );
  return (
    <div className="simulation-tools">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const reply = ping(lab, source, target);
          setResult(reply.message);
          onTrace(reply.path);
        }}
      >
        <select
          aria-label="Ping source"
          value={source}
          onChange={(e) => setSource(e.target.value)}
        >
          <option value="">Select source</option>
          {Object.values(lab.devices)
            .filter((d) => d.kind !== "usb" && d.kind !== "switch")
            .map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
        </select>
        <input
          aria-label="Ping destination"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          placeholder="IP address or hostname"
        />
        <button className="primary">
          <Play size={14} weight="fill" />
          Send ping
        </button>
      </form>
      <pre role="status">{result}</pre>
    </div>
  );
}
function App() {
  const { lab, ready, saveStatus, dispatch, replace } = useLab();
  const [panel, setPanel] = useState<string | null>(
    location.pathname === "/about.html" ? "About" : null,
  );
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [consoleId, setConsoleId] = useState<string | null>(null);
  const [routerId, setRouterId] = useState<string | null>(null);
  const [connect, setConnect] = useState(false);
  const [view, setView] = useState("Topology");
  const [trace, setTrace] = useState<string[]>([]);
  const [mobileMission, setMobileMission] = useState(false);
  const [settingNotice, setSettingNotice] = useState("");
  const [motion, setMotion] = useState(() => {
    try { return localStorage.getItem("serverlab-reduced-motion") === "true"; }
    catch { return false; }
  });
  const importFile = useRef<HTMLInputElement>(null);
  useEffect(() => {
    void hydrateLab();
  }, []);
  useEffect(() => {
    document.documentElement.dataset.reducedMotion = String(motion);
    try { localStorage.setItem("serverlab-reduced-motion", String(motion)); } catch { /* Preference remains active for this session. */ }
  }, [motion]);
  const inspect = useCallback((id: string) => {
    setSelected(id);
    setView("Config");
  }, []);
  const openConsole = useCallback(
    (id: string) => {
      const d = useLab.getState().lab.devices[id];
      if (d?.kind === "computer" || d?.kind === "server") {
        setConsoleId(id);
        setSelected(null);
        setView("Topology");
      } else if (d?.kind === 'router') { setRouterId(id); }
      else inspect(id);
    },
    [inspect],
  );
  const add = (kind: DeviceKind) => {
    const count = Object.keys(lab.devices).length;
    dispatch({
      type: "ADD_DEVICE",
      kind,
      x: 160 + (count % 5) * 155,
      y: 100 + (Math.floor(count / 5) % 4) * 150,
    });
  };
  const objectives = getObjectives(lab);
  const completed = objectives.filter((o) => o.done).length;
  const lastEvent = lab.events.at(-1);
  const exportLab = () => {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(lab, null, 2)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "serverlab-v2.json";
    a.click();
    URL.revokeObjectURL(url);
  };
  if (!ready)
    return (
      <div className="loading-screen">
        <Cube size={36} />
        <h1>
          SERVER<span>LAB</span>
        </h1>
        <p>Loading your lab…</p>
      </div>
    );
  return (
    <div className="game-shell">
      <header className="app-header">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setPanel(null);
          }}
        >
          <Cube size={31} weight="duotone" />
          <div>
            <strong>
              SERVER<span>LAB</span>
            </strong>
            <small>NETWORK SANDBOX</small>
          </div>
        </a>
        <nav aria-label="Main navigation">
          {navigation.map((n) => (
            <button
              aria-label={n.id}
              className={
                panel === n.id || (n.id === "Lab" && !panel) ? "active" : ""
              }
              key={n.id}
              onClick={() => setPanel(n.id === "Lab" ? null : n.id)}
            >
              <n.icon size={17} />
              <span>{n.id}</span>
            </button>
          ))}
        </nav>
        <div className="player">
          <div>
            <strong>LEVEL {Math.floor(completed / 3) + 1}</strong>
            <span>{completed * 100} XP</span>
          </div>
          <div className="avatar">JD</div>
        </div>
      </header>
      <main className="workspace">
        <aside className="palette">
          <div className="palette-heading">
            <span className="eyebrow">EQUIPMENT</span>
            <span>{kinds.length}</span>
          </div>
          <label className="device-search">
            <MagnifyingGlass size={16} />
            <input
              aria-label="Search equipment"
              placeholder="Find a device…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <div className="palette-devices">
            {kinds
              .filter((k) =>
                `${deviceCatalog[k].label} ${deviceCatalog[k].description}`
                  .toLowerCase()
                  .includes(query.toLowerCase()),
              )
              .map((kind) => (
                <button
                  draggable
                  key={kind}
                  className="equipment"
                  onDragStart={(e) =>
                    e.dataTransfer.setData("application/serverlab", kind)
                  }
                  onClick={() => add(kind)}
                  title={`Add ${deviceCatalog[kind].label}`}
                >
                  <img src={`/assets/${kind}.webp`} alt="" draggable={false} />
                  <span>
                    <strong>{deviceCatalog[kind].label}</strong>
                    <small>
                      {`${deviceCatalog[kind].ports} Ethernet port${deviceCatalog[kind].ports > 1 ? "s" : ""}`}
                    </small>
                  </span>
                  <Plus size={15} />
                </button>
              ))}
          </div>
          <button className="cable-equipment" aria-label="Connect cable" onClick={() => setConnect(true)}>
            <PlugsConnected size={24} />
            <span>
              <strong>Connect cable</strong>
              <small>Ethernet connection</small>
            </span>
            <Plus size={15} />
          </button>
          <div className="palette-tip">
            <span className="keycap">+</span>
            <p>
              Click to add.
              <br />
              Drag to place anywhere.
            </p>
          </div>
          <div className="palette-bottom">
            <span className="eyebrow">LAB MODE</span>
            <select
              aria-label="Lab mode"
              value={lab.mode}
              onChange={(e) =>
                dispatch({
                  type: "SET_MODE",
                  mode: e.target.value as "guided" | "sandbox",
                })
              }
            >
              <option value="guided">Guided mission</option>
              <option value="sandbox">Free sandbox</option>
            </select>
            <button onClick={() => setPanel("About")}>
              <Info size={15} />
              About Serverlab <span>2.0</span>
            </button>
          </div>
        </aside>
        <section className="center-stage">
          <div className="workspace-toolbar">
            <div className="view-tabs">
              {["Topology", "Config", "Simulation"].map((t) => (
                <button
                  key={t}
                  className={view === t ? "active" : ""}
                  onClick={() => {
                    setView(t);
                    if (t === "Config" && !selected)
                      setSelected(Object.keys(lab.devices)[0] || null);
                  }}
                >
                  {t === "Topology" ? (
                    <Network size={16} />
                  ) : t === "Config" ? (
                    <GearSix size={16} />
                  ) : (
                    <Broadcast size={16} />
                  )}
                  {t}
                </button>
              ))}
            </div>
            <div className="spacer" />
            <span className="lab-live">
              <i className="status-dot on" />
              LOCAL LAB
            </span>
            <button
              className="toolbar-connect"
              onClick={() => setConnect(true)}
              title="Connect devices"
            >
              <PlugsConnected size={17} />
            </button>
            <button
              className="mobile-mission-toggle"
              onClick={() => setMobileMission(!mobileMission)}
              aria-label="Toggle mission"
            >
              <ListChecks size={19} />
            </button>
          </div>
          <div className="canvas-stage">
            <div className="lab-caption">
              <span className="eyebrow">MY WORKSPACE</span>
              <h2>
                {lab.mode === "guided" ? "First domain lab" : "Free sandbox"}
              </h2>
              <span>
                {Object.keys(lab.devices).length} devices ·{" "}
                {Object.keys(lab.links).length} connections
              </span>
            </div>
            <Suspense
              fallback={
                <div className="empty-state">Preparing network canvas…</div>
              }
            >
              <Topology
                onInspect={inspect}
                onOpen={openConsole}
                trace={trace}
              />
            </Suspense>
            {view === "Simulation" && <Simulation onTrace={setTrace} />}
            {view === "Config" && selected && lab.devices[selected] && (
              <Inspector
                key={selected}
                device={lab.devices[selected]}
                onOpen={openConsole}
                onSelect={inspect}
                onConnect={() => setConnect(true)}
                onClose={() => {
                  setSelected(null);
                  setView("Topology");
                }}
              />
            )}
            {consoleId && (
              <Suspense fallback={null}>
                <Console key={consoleId} id={consoleId} onClose={() => setConsoleId(null)} />
              </Suspense>
            )}
          </div>
          <section className="event-log" aria-label="Event log">
            <header>
              <TerminalWindow size={15} />
              <strong>EVENT LOG</strong>
              <span>{lab.events.length} events</span>
              <div className="spacer" />
              <span className="event-latest" role="status">
                {lastEvent?.level === "warning"
                  ? "Action needs attention"
                  : "Simulation ready"}
              </span>
            </header>
            <div className="event-entries">
              {lab.events
                .slice(-4)
                .reverse()
                .map((e) => (
                  <div className={`event ${e.level}`} key={e.id}>
                    <time>
                      {new Date(e.time).toLocaleTimeString([], {
                        hour12: false,
                      })}
                    </time>
                    <span className="event-indicator" />
                    <p>{e.message}</p>
                  </div>
                ))}
            </div>
          </section>
        </section>
        <aside
          className={`mission-panel ${mobileMission ? "mobile-open" : ""}`}
        >
          <button className="mission-close-mobile" aria-label="Close mission panel" onClick={() => setMobileMission(false)}><X size={20} /></button>
          <Missions />
        </aside>
      </main>
      <footer className="status-bar">
        <span>
          <i className="status-dot on" />
          Simulation engine ready
        </span>
        <span className="status-save">
          <FloppyDisk size={12} />
          {saveStatus}
        </span>
        <div className="spacer" />
        <span>
          {Object.values(lab.devices).filter((d) => d.power).length} online
        </span>
        <span>
          Serverlab <b>v2.0.0</b>
        </span>
      </footer>
      {connect && (
        <ConnectDialog
          initial={selected || undefined}
          onClose={() => setConnect(false)}
        />
      )}
      {routerId && <Dialog title={`${lab.devices[routerId]?.name || 'Router'} · Router configuration`} wide onClose={() => setRouterId(null)}><Suspense fallback={<p>Opening router settings…</p>}><RouterPanel deviceId={routerId} /></Suspense></Dialog>}
      {panel && (
        <Dialog
          title={panel === "About" ? "About Serverlab" : panel}
          onClose={() => setPanel(null)}
        >
          {panel === "About" && (
            <div className="about-content">
              <Cube size={48} weight="duotone" />
              <h2>Build it. Break it. Understand it.</h2>
              <p>
                Serverlab combines operating systems and data communications in
                a hands-on network sandbox.
              </p>
              <p>
                Created by <strong>Jenree Dandan</strong>.
              </p>
              <a
                className="primary"
                href="https://reejn.dev"
                target="_blank"
                rel="noreferrer"
              >
                reejn.dev <ArrowSquareOut size={16} />
              </a>
              <small>
                Version 2.0.0 · Independent educational simulator.
                <br />
                Windows and Windows Server are trademarks of Microsoft.
                Serverlab is not affiliated with Microsoft.
              </small>
            </div>
          )}
          {panel === "Challenges" && (
            <>
              <p className="muted">
                Learn by building. Your current lab and progress stay with you
                when switching modes.
              </p>
              <button
                className="challenge-card"
                onClick={() => {
                  dispatch({ type: "SET_MODE", mode: "guided" });
                  setPanel(null);
                }}
              >
                <Flag size={30} />
                <div>
                  <span className="eyebrow">MISSION 01 · OS + NETWORKING</span>
                  <h3>Build your first domain</h3>
                  <p>
                    Install Windows Server, create a directory, share a folder,
                    and bring a client online.
                  </p>
                  <strong>{completed} of 7 objectives complete</strong>
                </div>
                <CaretRight size={20} />
              </button>
              <button
                className="challenge-card"
                onClick={() => {
                  dispatch({ type: "SET_MODE", mode: "sandbox" });
                  setPanel(null);
                }}
              >
                <Cube size={30} />
                <div>
                  <span className="eyebrow">OPEN EXPLORATION</span>
                  <h3>Free sandbox</h3>
                  <p>
                    Add devices, change addresses, connect networks, and
                    experiment at your own pace.
                  </p>
                </div>
                <CaretRight size={20} />
              </button>
            </>
          )}
          {panel === "Learn" && (
            <div className="learning-list">
              {[
                {
                  title: "01 / Wire the lab",
                  text: "Connect PC-01, DC-01 and R-01 to SW-01 with Ethernet. Use Connect cable or drag between device port dots. PCs already have Windows installed.",
                },
                {
                  title: "02 / Boot from Ventoy",
                  text: "Select DC-01, open Config, and click Insert bootable device. Open its console, power on, and enter BIOS. Select Ventoy USB and install Windows Server. The media is consumed after one completed installation.",
                },
                {
                  title: "03 / Build Active Directory",
                  text: "In Server Manager, add the AD DS role. Promote the server with a new forest, choose Windows Server 2012 R2 functional level, set a practice DSRM password, and restart.",
                },
                {
                  title: "04 / Create users and shares",
                  text: "Open Active Directory Users and Computers to add an organizational unit and user. Create a folder, enable Advanced Sharing and Full Control, and inspect Security.",
                },
                {
                  title: "05 / Connect your client",
                  text: "Power on PC-01 and open Control Panel to set its DNS to DC-01’s IP and join your domain. Use Command Prompt to test ping. In File Explorer, create and share a text file, then open it from another connected PC.",
                },
                {
                  title: "06 / Configure your router",
                  text: "Select a router and choose Router settings in Config. The TP-Link-style panel configures LAN addressing, gateway, DNS and wireless settings. You can also open the router’s IP in a connected PC’s simulated browser.",
                },
              ].map((item) => (
                <article key={item.title}>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </article>
              ))}
              <p className="muted">
                This is a state-based educational simulation, not a virtual
                machine. PCs include a browser, Command Prompt, Control Panel and shared text files. Routing is simplified; firewall devices currently forward lab traffic, and wireless settings do not create radio links.
              </p>
            </div>
          )}
          {panel === "Achievements" && (
            <div className="achievement-list">
              {objectives.map((o) => (
                <div className={o.done ? "earned" : ""} key={o.id}>
                  <Trophy size={24} weight={o.done ? "fill" : "regular"} />
                  <div>
                    <strong>{o.title}</strong>
                    <p>{o.done ? "Unlocked · 100 XP" : o.detail}</p>
                  </div>
                  {o.done && <Check size={18} />}
                </div>
              ))}
            </div>
          )}
          {panel === "Settings" && (
            <div className="settings-content">
              <div className="setting-row">
                <div>
                  <strong>Reduce motion</strong>
                  <p>Disable animated network paths.</p>
                </div>
                <input
                  type="checkbox"
                  aria-label="Reduce motion"
                  checked={motion}
                  onChange={(e) => setMotion(e.target.checked)}
                />
              </div>
              <div className="setting-row">
                <div>
                  <strong>Your lab is saved on this device</strong>
                  <p>
                    Export a backup to move your progress to another browser.
                  </p>
                </div>
              </div>
              <div className="button-row">
                <button onClick={exportLab}>
                  <DownloadSimple size={18} />
                  Export lab
                </button>
                <button onClick={() => importFile.current?.click()}>
                  <UploadSimple size={18} />
                  Import lab
                </button>
              </div>
              <input
                hidden
                ref={importFile}
                type="file"
                accept="application/json,.json"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  try {
                    if (file.size > 2_000_000)
                      throw new Error("Choose a lab file smaller than 2 MB.");
                    const parsed = JSON.parse(await file.text());
                    if (
                      parsed.schemaVersion !== 2 ||
                      !parsed.devices ||
                      !parsed.links ||
                      Array.isArray(parsed.devices)
                    )
                      throw new Error("This is not a Serverlab v2 save file.");
                    if (
                      window.confirm(
                        "Replace the current lab with this imported save?",
                      )
                    ) {
                      replace(restoreLab(parsed));
                      setConsoleId(null);
                      setSelected(null);
                      setSettingNotice("Lab imported successfully.");
                    }
                  } catch (error) {
                    setSettingNotice(
                      error instanceof Error
                        ? error.message
                        : "Could not import this file.",
                    );
                  }
                  e.target.value = "";
                }}
              />
              {settingNotice && <p role="status">{settingNotice}</p>}
              <hr />
              <button
                className="text-danger"
                onClick={() => {
                  if (
                    window.confirm(
                      "Reset all devices, operating systems, and mission progress? Export your lab first if you want a backup.",
                    )
                  ) {
                    replace(createLab());
                    setConsoleId(null);
                    setSelected(null);
                    setPanel(null);
                  }
                }}
              >
                <ArrowCounterClockwise size={17} />
                Reset lab
              </button>
              <p className="muted">
                Version 2.0.0 · Built by{" "}
                <a href="https://reejn.dev" target="_blank" rel="noreferrer">
                  Jenree Dandan
                </a>
              </p>
            </div>
          )}
        </Dialog>
      )}
    </div>
  );
}
export default App;
