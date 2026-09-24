import { memo, useCallback, useEffect } from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  Position,
  useNodesState,
  useReactFlow,
  ReactFlowProvider,
  type NodeProps,
  type Node,
  type Connection,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useLab } from "./store";
import { deviceCatalog, type Device, type DeviceKind } from "./core";

type MachineNode = Node<
  { device: Device; open: (id: string) => void; inspect: (id: string) => void },
  "machine"
>;
const Machine = memo(function Machine({
  data,
  selected,
}: NodeProps<MachineNode>) {
  const d = data.device;
  return (
    <div
      className={`machine ${selected ? "selected" : ""} ${d.power ? "powered" : ""}`}
    >
      <Handle
        type="target"
        position={Position.Left}
        id="in"
        aria-label={`${d.name} connection input`}
      />
      <button
        className="machine-image"
        onDoubleClick={() => data.open(d.id)}
        onClick={() => data.inspect(d.id)}
        aria-label={`Inspect ${d.name}`}
      >
        <img
          src={`/assets/${d.kind}.webp`}
          alt={deviceCatalog[d.kind].label}
          draggable={false}
        />
      </button>
      <strong>
        {d.name} <i className={`status-dot ${d.power ? "on" : ""}`} />
      </strong>
      <span>
        {d.kind === "usb" ? "Bootable media" : d.ip || "Layer 2 switch"}
      </span>
      {d.kind === "server" && (
        <small>
          {d.os.promoted
            ? "DOMAIN CONTROLLER"
            : d.os.installed
              ? "WINDOWS SERVER"
              : "NO OS INSTALLED"}
        </small>
      )}
      <Handle
        type="source"
        position={Position.Right}
        id="out"
        aria-label={`${d.name} connection output`}
      />
    </div>
  );
});
const nodeTypes = { machine: Machine };

function Canvas({
  onInspect,
  onOpen,
  trace,
}: {
  onInspect: (id: string) => void;
  onOpen: (id: string) => void;
  trace: string[];
}) {
  const devices = useLab((s) => s.lab.devices);
  const links = useLab((s) => s.lab.links);
  const dispatch = useLab((s) => s.dispatch);
  const [nodes, setNodes, onNodesChange] = useNodesState<MachineNode>([]);
  const flow = useReactFlow();
  useEffect(() => {
    setNodes((previous) =>
      Object.values(devices).map((device) => ({
        id: device.id,
        type: "machine",
        position: { x: device.x, y: device.y },
        selected: previous.find((n) => n.id === device.id)?.selected,
        data: { device, inspect: onInspect, open: onOpen },
      })),
    );
  }, [devices, onInspect, onOpen, setNodes]);
  const connect = useCallback(
    (c: Connection) => {
      if (c.source && c.target)
        dispatch({ type: "CONNECT", source: c.source, target: c.target });
    },
    [dispatch],
  );
  const edges = Object.values(links).map((link) => ({
    id: link.id,
    source: link.source,
    target: link.target,
    sourceHandle: "out",
    targetHandle: "in",
    type: "smoothstep",
    label: link.kind === "usb" ? "USB" : "",
    animated: trace.includes(link.source) && trace.includes(link.target),
    style: {
      stroke: link.kind === "usb" ? "#dfb765" : "#27c4b5",
      strokeWidth: 2,
      opacity:
        devices[link.source]?.power && devices[link.target]?.power ? 1 : 0.55,
    },
  }));
  return (
    <div
      className="topology"
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
      }}
      onDrop={(e) => {
        e.preventDefault();
        const kind = e.dataTransfer.getData(
          "application/serverlab",
        ) as DeviceKind;
        if (kind in deviceCatalog) {
          const p = flow.screenToFlowPosition({ x: e.clientX, y: e.clientY });
          dispatch({ type: "ADD_DEVICE", kind, ...p });
        }
      }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onConnect={connect}
        onNodeDragStop={(_, node) =>
          dispatch({
            type: "MOVE_DEVICE",
            id: node.id,
            x: node.position.x,
            y: node.position.y,
          })
        }
        onNodeDoubleClick={(_, node) => onOpen(node.id)}
        onEdgeDoubleClick={(_, edge) =>
          dispatch({ type: "DISCONNECT", id: edge.id })
        }
        fitView
        fitViewOptions={{ padding: 0.22 }}
        minZoom={0.35}
        maxZoom={1.6}
        deleteKeyCode={null}
        colorMode="dark"
      >
        <Background variant={BackgroundVariant.Lines} color="#29415155" gap={24} lineWidth={1} />
        <Controls showInteractive={false} />
      </ReactFlow>
      {!Object.keys(devices).length && (
        <div className="empty-canvas">
          Your network starts here.
          <span>Add a device from the equipment panel.</span>
        </div>
      )}
      <div className="canvas-help">
        Drag to arrange · Double-click to open · Connect the port dots
      </div>
    </div>
  );
}
export default function Topology(props: Parameters<typeof Canvas>[0]) {
  return (
    <ReactFlowProvider>
      <Canvas {...props} />
    </ReactFlowProvider>
  );
}
