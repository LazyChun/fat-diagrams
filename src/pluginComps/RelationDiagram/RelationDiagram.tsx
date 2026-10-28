/**
 * 关系图 — AntV G6。
 * 双击空白添加节点，从圆点拖出连线（拖到空白处会新建节点），悬停删除。
 * 结果写回卡片 options.relation。
 */
import React, { useEffect, useId, useRef, useState } from "react";
import { Input } from "antd";
import { Graph } from "@antv/g6";
import type { Graph as G6Graph } from "@antv/g6";
import { useIntl } from "react-intl";
import { useDispatch, useStore } from "react-redux";
import type { BlockActionShowParams, BlockTimeContext } from "fat-notes-sdk";
import {
  DEFAULT_RELATION,
  nextDiagramId,
  type DiagramEdge,
  type DiagramNode,
  type RelationModel,
} from "../../diagram/types";
import { saveBlockOptions } from "../../diagram/saveBlock";
import styles from "./RelationDiagram.less";

interface RelationDiagramProps {
  config?: unknown;
  item: Block.Item;
  inConfig?: boolean;
  time?: BlockTimeContext;
  chartId?: string;
  actionsVisible?: boolean;
  onShowActions?: (params: BlockActionShowParams) => void;
}

interface LabelEditorState {
  id: string;
  x: number;
  y: number;
  value: string;
}

interface NodeChrome {
  kind: "node";
  id: string;
  x: number;
  y: number;
  r: number;
}

interface EdgeChrome {
  kind: "edge";
  id: string;
  x: number;
  y: number;
}

type Chrome = NodeChrome | EdgeChrome;

interface LinkDrag {
  sourceId: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  targetId: string | null;
  pulled: boolean;
  ghost: number;
}

const NODE_SIZE = 36;
const CURVE_OFFSET = 30;
const PULL_DISTANCE = 28;

const readRelation = (item: Block.Item): RelationModel => {
  const relation = item.options?.relation;
  return {
    layout: relation?.layout || DEFAULT_RELATION.layout,
    nodes:
      relation?.nodes && relation.nodes.length
        ? relation.nodes.map((node) => ({ ...node }))
        : DEFAULT_RELATION.nodes.map((node) => ({ ...node })),
    edges: (relation?.edges || DEFAULT_RELATION.edges).map((edge) => ({
      ...edge,
    })),
  };
};

const modelKey = (model: RelationModel): string =>
  JSON.stringify({
    layout: model.layout,
    nodes: model.nodes,
    edges: model.edges,
  });

const toG6Data = (model: RelationModel) => ({
  nodes: model.nodes.map((node) => ({
    id: node.id,
    data: { label: node.label },
    style:
      node.x == null || node.y == null
        ? undefined
        : { x: node.x, y: node.y },
  })),
  edges: model.edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
  })),
});

const readGraph = (graph: G6Graph): Pick<RelationModel, "nodes" | "edges"> => {
  const nodes: DiagramNode[] = graph.getNodeData().map((node) => ({
    id: String(node.id),
    label: String(node.data?.label ?? ""),
    x: typeof node.style?.x === "number" ? node.style.x : undefined,
    y: typeof node.style?.y === "number" ? node.style.y : undefined,
  }));
  const edges: DiagramEdge[] = graph
    .getEdgeData()
    .filter((edge) => edge.source && edge.target && edge.source !== edge.target)
    .map((edge) => ({
      id: String(edge.id || nextDiagramId("e")),
      source: String(edge.source),
      target: String(edge.target),
    }));
  return { nodes, edges };
};

const layoutOptions = (layout: string) =>
  layout === "hierarchy"
    ? {
        type: "antv-dagre" as const,
        rankdir: "TB" as const,
        nodesep: 40,
        ranksep: 56,
      }
    : {
        type: "force" as const,
        preventOverlap: true,
        nodeSize: 48,
        linkDistance: 140,
      };

type CanvasLayerName = "background" | "main" | "label" | "transient";

// 卡片从 0 尺寸撑开时，G6 resize 会把镜头留在原点。
// 力导向把节点放在画布坐标中心，原点正对视口中心时，整张图就出现在右下角。
// translateTo([0, 0]) 读到的中心也是原点，拉不回来。这里直接让镜头对准节点。
const focusNodes = (graph: G6Graph) => {
  const nodes = graph.getNodeData();
  if (!nodes.length) {
    return;
  }
  let sumX = 0;
  let sumY = 0;
  nodes.forEach((node) => {
    const [x, y] = graph.getElementPosition(node.id);
    sumX += x;
    sumY += y;
  });
  const cx = sumX / nodes.length;
  const cy = sumY / nodes.length;
  const canvas = graph.getCanvas();
  Object.keys(canvas.getLayers()).forEach((layer) => {
    const camera = canvas.getCamera(layer as CanvasLayerName);
    const [, , z = 500] = camera.getPosition();
    camera.setZoom(1);
    camera.setPosition(cx, cy, z);
    camera.setFocalPoint(cx, cy, 0);
  });
};

const resizeKeepingCamera = (graph: G6Graph, width: number, height: number) => {
  const canvas = graph.getCanvas();
  const shots = Object.keys(canvas.getLayers()).map((layer) => {
    const camera = canvas.getCamera(layer as CanvasLayerName);
    const [x, y, z = 0] = camera.getPosition();
    const [fx, fy, fz = 0] = camera.getFocalPoint();
    return {
      layer: layer as CanvasLayerName,
      x,
      y,
      z,
      fx,
      fy,
      fz,
      zoom: camera.getZoom(),
    };
  });
  graph.setSize(width, height);
  shots.forEach((shot) => {
    const camera = canvas.getCamera(shot.layer);
    camera.setZoom(shot.zoom);
    camera.setPosition(shot.x, shot.y, shot.z);
    camera.setFocalPoint(shot.fx, shot.fy, shot.fz);
  });
};

const placeChrome = (
  graph: G6Graph,
  kind: "node" | "edge",
  id: string,
): Chrome | null => {
  if (kind === "node") {
    const node = graph.getNodeData().find((item) => String(item.id) === id);
    if (!node) {
      return null;
    }
    const [x, y] = graph.getElementPosition(id);
    const [vx, vy] = graph.getViewportByCanvas([x, y]);
    const zoom = graph.getZoom() || 1;
    return { kind: "node", id, x: vx, y: vy, r: (NODE_SIZE / 2) * zoom };
  }
  const edge = graph.getEdgeData().find((item) => String(item.id) === id);
  if (!edge?.source || !edge.target) {
    return null;
  }
  const source = graph.getNodeData().find((item) => String(item.id) === String(edge.source));
  const target = graph.getNodeData().find((item) => String(item.id) === String(edge.target));
  if (!source || !target) {
    return null;
  }
  const [x1, y1] = graph.getElementPosition(String(edge.source));
  const [x2, y2] = graph.getElementPosition(String(edge.target));
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  // 二次曲线在 t=0.5 处，位于弦中点朝控制点方向偏移 curveOffset 的一半。
  const [vx, vy] = graph.getViewportByCanvas([
    mx + (dy / len) * (CURVE_OFFSET / 2),
    my + (-dx / len) * (CURVE_OFFSET / 2),
  ]);
  return { kind: "edge", id, x: vx, y: vy };
};

const pointOnCurve = (
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  t: number,
) => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const cpx = (x1 + x2) / 2 + (dy / len) * CURVE_OFFSET;
  const cpy = (y1 + y2) / 2 + (-dx / len) * CURVE_OFFSET;
  const mt = 1 - t;
  return {
    x: mt * mt * x1 + 2 * mt * t * cpx + t * t * x2,
    y: mt * mt * y1 + 2 * mt * t * cpy + t * t * y2,
  };
};

const hitEdge = (graph: G6Graph, vx: number, vy: number): string | null => {
  const [cx, cy] = graph.getCanvasByViewport([vx, vy]);
  const zoom = graph.getZoom() || 1;
  // 曲线相对弦中点偏 15px，阈值要盖住这条弧，缩放后屏幕上至少约 16px。
  const limit = Math.max(24, 16 / zoom);
  let bestId: string | null = null;
  let bestDist = Number.POSITIVE_INFINITY;
  graph.getEdgeData().forEach((edge) => {
    if (!edge.id || !edge.source || !edge.target) {
      return;
    }
    const source = graph.getNodeData().find((node) => String(node.id) === String(edge.source));
    const target = graph.getNodeData().find((node) => String(node.id) === String(edge.target));
    if (!source || !target) {
      return;
    }
    const [x1, y1] = graph.getElementPosition(String(edge.source));
    const [x2, y2] = graph.getElementPosition(String(edge.target));
    for (let step = 1; step < 8; step += 1) {
      const point = pointOnCurve(x1, y1, x2, y2, step / 8);
      const dist = Math.hypot(point.x - cx, point.y - cy);
      if (dist <= limit && dist < bestDist) {
        bestDist = dist;
        bestId = String(edge.id);
      }
    }
  });
  return bestId;
};

const readClient = (event: unknown): { x: number; y: number } | null => {
  const pointer = event as {
    client?: { x?: number; y?: number };
    clientX?: number;
    clientY?: number;
  };
  if (typeof pointer.client?.x === "number" && typeof pointer.client?.y === "number") {
    return { x: pointer.client.x, y: pointer.client.y };
  }
  if (typeof pointer.clientX === "number" && typeof pointer.clientY === "number") {
    return { x: pointer.clientX, y: pointer.clientY };
  }
  return null;
};

const hitNode = (
  graph: G6Graph,
  vx: number,
  vy: number,
  ignoreId: string,
): string | null => {
  const [cx, cy] = graph.getCanvasByViewport([vx, vy]);
  const zoom = graph.getZoom() || 1;
  const limit = NODE_SIZE / 2 + 22 / zoom;
  let bestId: string | null = null;
  let bestDist = Number.POSITIVE_INFINITY;
  graph.getNodeData().forEach((node) => {
    const id = String(node.id);
    if (id === ignoreId) {
      return;
    }
    const [x, y] = graph.getElementPosition(id);
    const dist = Math.hypot(x - cx, y - cy);
    if (dist <= limit && dist < bestDist) {
      bestId = id;
      bestDist = dist;
    }
  });
  return bestId;
};

const nodePort = (graph: G6Graph, id: string) => {
  const placed = placeChrome(graph, "node", id);
  if (!placed || placed.kind !== "node") {
    return { x: 0, y: 0, r: NODE_SIZE / 2 };
  }
  return { x: placed.x + placed.r, y: placed.y, r: placed.r };
};

const rimPoint = (x1: number, y1: number, targetId: string, graph: G6Graph) => {
  const placed = placeChrome(graph, "node", targetId);
  if (!placed || placed.kind !== "node") {
    return { x: x1, y: y1 };
  }
  const dx = placed.x - x1;
  const dy = placed.y - y1;
  const len = Math.hypot(dx, dy) || 1;
  const dist = Math.max(len - placed.r, 0);
  return { x: x1 + (dx / len) * dist, y: y1 + (dy / len) * dist };
};

const pointerLeftToChrome = (event: unknown) => {
  const related = (event as { nativeEvent?: { relatedTarget?: EventTarget | null } })
    .nativeEvent?.relatedTarget;
  return related instanceof Element && !!related.closest("button");
};

const sameChrome = (current: Chrome, next: Chrome) => {
  if (current.kind !== next.kind || current.id !== next.id) {
    return false;
  }
  if (Math.abs(current.x - next.x) >= 0.5 || Math.abs(current.y - next.y) >= 0.5) {
    return false;
  }
  return current.kind !== "node" || next.kind !== "node" || Math.abs(current.r - next.r) < 0.5;
};

const RelationDiagram: React.FC<RelationDiagramProps> = (props) => {
  const { item, inConfig } = props;
  const intl = useIntl();
  const dispatch = useDispatch();
  const store = useStore();
  const markerId = `relation-arrow-${useId().replace(/:/g, "")}`;
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<G6Graph | null>(null);
  const itemRef = useRef(item);
  const inConfigRef = useRef(inConfig);
  const writtenRef = useRef("");
  const newLabelRef = useRef("");
  const linkDragRef = useRef<LinkDrag | null>(null);
  const targetRef = useRef<string | null>(null);
  const hideTimerRef = useRef<number | null>(null);
  const dragListenersRef = useRef<{
    move: (event: MouseEvent) => void;
    up: (event: MouseEvent) => void;
  } | null>(null);
  const [chrome, setChrome] = useState<Chrome | null>(null);
  const chromeRef = useRef<Chrome | null>(null);
  const [linkDrag, setLinkDrag] = useState<LinkDrag | null>(null);
  const [movingNode, setMovingNode] = useState(false);
  const [editor, setEditor] = useState<LabelEditorState | null>(null);
  const editorRef = useRef<LabelEditorState | null>(null);
  itemRef.current = item;
  inConfigRef.current = inConfig;
  linkDragRef.current = linkDrag;
  editorRef.current = editor;
  chromeRef.current = chrome;
  newLabelRef.current = intl.formatMessage({ id: "fat-diagrams.node.new" });

  const persistRef = useRef<() => void>(() => undefined);
  persistRef.current = () => {
    const graph = graphRef.current;
    if (!graph || graph.destroyed) {
      return;
    }
    const current = itemRef.current;
    const model = readRelation(current);
    const drawn = readGraph(graph);
    const nextModel: RelationModel = {
      layout: model.layout,
      nodes: drawn.nodes,
      edges: drawn.edges,
    };
    const key = modelKey(nextModel);
    if (key === writtenRef.current) {
      return;
    }
    writtenRef.current = key;
    const options = {
      ...current.options,
      relation: nextModel,
    };
    itemRef.current = { ...current, options };
    void saveBlockOptions(
      dispatch,
      () => store.getState(),
      current,
      inConfigRef.current,
      options,
    );
  };

  const setCanvasCursor = (cursor: string) => {
    const el = containerRef.current;
    if (!el) {
      return;
    }
    el.style.cursor = cursor;
    el.querySelectorAll("canvas").forEach((canvas) => {
      canvas.style.cursor = cursor;
    });
  };

  const paintTarget = (id: string | null) => {
    const graph = graphRef.current;
    if (!graph || graph.destroyed) {
      return;
    }
    const prev = targetRef.current;
    if (prev === id) {
      return;
    }
    const apply = (nodeId: string, active: boolean) => {
      if (!graph.getNodeData().some((node) => String(node.id) === nodeId)) {
        return;
      }
      const states = graph
        .getElementState(nodeId)
        .filter((state) => state !== "link-target");
      if (active) {
        states.push("link-target");
      }
      void graph.setElementState(nodeId, states, false);
    };
    if (prev) {
      apply(prev, false);
    }
    if (id) {
      apply(id, true);
    }
    targetRef.current = id;
  };

  const insertNode = (canvasX: number, canvasY: number, sourceId?: string) => {
    const graph = graphRef.current;
    if (!graph || graph.destroyed) {
      return;
    }
    const id = nextDiagramId("n");
    const label = newLabelRef.current;
    graph.addNodeData([
      {
        id,
        data: { label },
        style: { x: canvasX, y: canvasY },
      },
    ]);
    if (sourceId) {
      graph.addEdgeData([
        { id: nextDiagramId("e"), source: sourceId, target: id },
      ]);
    }
    void graph.draw().then(() => {
      if (graph.destroyed) {
        return;
      }
      persistRef.current();
      const [x, y] = graph.getElementPosition(id);
      const [vx, vy] = graph.getViewportByCanvas([x, y]);
      openEditorRef.current({ id, x: vx, y: vy, value: label });
      setChrome(placeChrome(graph, "node", id));
    });
  };

  const connectNodes = (source: string, target: string) => {
    const graph = graphRef.current;
    if (!graph || graph.destroyed || source === target) {
      return;
    }
    const duplicated = graph.getEdgeData().some(
      (edge) => String(edge.source) === source && String(edge.target) === target,
    );
    if (duplicated) {
      return;
    }
    graph.addEdgeData([{ id: nextDiagramId("e"), source, target }]);
    void graph.draw().then(() => persistRef.current());
  };

  const removeNodeById = (id: string) => {
    const graph = graphRef.current;
    if (!graph || graph.destroyed) {
      return;
    }
    const edgeIds = graph
      .getEdgeData()
      .filter(
        (edge) => String(edge.source) === id || String(edge.target) === id,
      )
      .map((edge) => String(edge.id || ""))
      .filter(Boolean);
    if (edgeIds.length) {
      graph.removeEdgeData(edgeIds);
    }
    graph.removeNodeData([id]);
    setChrome((current) => (current?.id === id ? null : current));
    setEditor((current) => (current?.id === id ? null : current));
    void graph.draw().then(() => persistRef.current());
  };

  const removeEdgeById = (id: string) => {
    const graph = graphRef.current;
    if (!graph || graph.destroyed) {
      return;
    }
    graph.removeEdgeData([id]);
    setChrome((current) => (current?.id === id ? null : current));
    void graph.draw().then(() => persistRef.current());
  };

  const actionsRef = useRef({
    insertNode,
    connectNodes,
    paintTarget,
  });
  actionsRef.current = { insertNode, connectNodes, paintTarget };

  const cancelHide = () => {
    if (hideTimerRef.current != null) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  };

  const hideSoon = () => {
    if (linkDragRef.current || !chromeRef.current) {
      return;
    }
    cancelHide();
    hideTimerRef.current = window.setTimeout(() => {
      const graph = graphRef.current;
      if (!graph || graph.destroyed) {
        setChrome(null);
        return;
      }
      const selectedNode = graph.getElementDataByState("node", "selected")[0];
      const selectedEdge = selectedNode
        ? undefined
        : graph.getElementDataByState("edge", "selected")[0];
      if (selectedNode) {
        setChrome(placeChrome(graph, "node", String(selectedNode.id)));
        return;
      }
      if (selectedEdge) {
        setChrome(placeChrome(graph, "edge", String(selectedEdge.id)));
        return;
      }
      setChrome(null);
    }, 220);
  };

  const showChrome = (kind: "node" | "edge", id: string) => {
    if (linkDragRef.current) {
      return;
    }
    cancelHide();
    const graph = graphRef.current;
    if (!graph || graph.destroyed) {
      return;
    }
    const next = placeChrome(graph, kind, id);
    if (!next) {
      return;
    }
    setChrome((current) => (current && sameChrome(current, next) ? current : next));
  };

  const openEditorRef = useRef<(next: LabelEditorState) => void>(() => undefined);
  openEditorRef.current = (next) => {
    const current = editorRef.current;
    if (current && current.id !== next.id) {
      const graph = graphRef.current;
      const node =
        graph && !graph.destroyed
          ? graph.getNodeData().find((entry) => String(entry.id) === current.id)
          : undefined;
      if (graph && !graph.destroyed && node && String(node.data?.label ?? "") !== current.value) {
        graph.updateNodeData([
          {
            id: current.id,
            data: { ...node.data, label: current.value },
          },
        ]);
        void graph.draw().then(() => persistRef.current());
      }
    }
    setEditor(current?.id === next.id ? { ...current, x: next.x, y: next.y } : next);
  };

  const uiRef = useRef({
    showChrome,
    hideSoon,
    insertNode,
    openEditor: openEditorRef.current,
    setMovingNode,
  });
  uiRef.current = {
    showChrome,
    hideSoon,
    insertNode,
    openEditor: openEditorRef.current,
    setMovingNode,
  };

  const stopDragListeners = () => {
    const listeners = dragListenersRef.current;
    if (!listeners) {
      return;
    }
    window.removeEventListener("mousemove", listeners.move);
    window.removeEventListener("mouseup", listeners.up);
    dragListenersRef.current = null;
    setCanvasCursor("");
  };

  const startLink = (event: React.MouseEvent) => {
    event.preventDefault();
    const current = chrome;
    const el = containerRef.current;
    const graph = graphRef.current;
    if (!current || current.kind !== "node" || !el || !graph || graph.destroyed) {
      return;
    }
    cancelHide();
    stopDragListeners();
    const rect = el.getBoundingClientRect();
    const next: LinkDrag = {
      sourceId: current.id,
      x1: current.x + current.r,
      y1: current.y,
      x2: event.clientX - rect.left,
      y2: event.clientY - rect.top,
      targetId: null,
      pulled: false,
      ghost: current.r * 2,
    };
    linkDragRef.current = next;
    setLinkDrag(next);
    setCanvasCursor("crosshair");

    const move = (pointer: MouseEvent) => {
      const box = containerRef.current?.getBoundingClientRect();
      const live = graphRef.current;
      const drag = linkDragRef.current;
      if (!box || !live || live.destroyed || !drag) {
        return;
      }
      const vx = pointer.clientX - box.left;
      const vy = pointer.clientY - box.top;
      const port = nodePort(live, drag.sourceId);
      const targetId = hitNode(live, vx, vy, drag.sourceId);
      const pulled = Math.hypot(vx - port.x, vy - port.y) >= PULL_DISTANCE;
      const end = targetId ? rimPoint(port.x, port.y, targetId, live) : { x: vx, y: vy };
      actionsRef.current.paintTarget(targetId);
      setCanvasCursor("crosshair");
      const updated: LinkDrag = {
        ...drag,
        x1: port.x,
        y1: port.y,
        x2: end.x,
        y2: end.y,
        targetId,
        pulled,
        ghost: NODE_SIZE * (live.getZoom() || 1),
      };
      linkDragRef.current = updated;
      setLinkDrag(updated);
    };

    const up = () => {
      const live = graphRef.current;
      const drag = linkDragRef.current;
      stopDragListeners();
      actionsRef.current.paintTarget(null);
      linkDragRef.current = null;
      setLinkDrag(null);
      if (!live || live.destroyed || !drag) {
        return;
      }
      if (drag.targetId) {
        actionsRef.current.connectNodes(drag.sourceId, drag.targetId);
        return;
      }
      if (!drag.pulled) {
        return;
      }
      const [x, y] = live.getCanvasByViewport([drag.x2, drag.y2]);
      const [sx, sy] = live.getElementPosition(drag.sourceId);
      if (Math.hypot(x - sx, y - sy) < NODE_SIZE) {
        return;
      }
      actionsRef.current.insertNode(x, y, drag.sourceId);
    };

    const listeners = { move, up };
    dragListenersRef.current = listeners;
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  useEffect(() => {
    return () => {
      if (hideTimerRef.current != null) {
        window.clearTimeout(hideTimerRef.current);
      }
      const listeners = dragListenersRef.current;
      if (listeners) {
        window.removeEventListener("mousemove", listeners.move);
        window.removeEventListener("mouseup", listeners.up);
      }
    };
  }, []);

  useEffect(() => {
    if (!chrome || linkDrag) {
      return;
    }
    let frame = 0;
    const tick = () => {
      const graph = graphRef.current;
      if (graph && !graph.destroyed) {
        setChrome((current) => {
          if (!current || linkDragRef.current) {
            return current;
          }
          const next = placeChrome(graph, current.kind, current.id);
          if (!next) {
            return null;
          }
          return sameChrome(current, next) ? current : next;
        });
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [chrome?.id, chrome?.kind, Boolean(linkDrag)]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) {
      return;
    }
    const graph = new Graph({
      container: el,
      animation: false,
      data: toG6Data(readRelation(itemRef.current)),
      node: {
        type: "circle",
        style: {
          size: NODE_SIZE,
          fill: "#1677FF",
          stroke: "#0958D9",
          lineWidth: 1,
          labelText: (datum) => String(datum.data?.label ?? ""),
          labelFill: "#172634",
          labelFontSize: 12,
          labelPlacement: "bottom",
          labelOffsetY: 6,
          cursor: "grab",
        },
        state: {
          selected: {
            lineWidth: 3,
            stroke: "#0958D9",
          },
          "link-target": {
            lineWidth: 3,
            stroke: "#69B1FF",
          },
        },
      },
      edge: {
        type: "quadratic",
        style: {
          stroke: "#8C8C8C",
          lineWidth: 1.5,
          endArrow: true,
          cursor: "pointer",
          increasedLineWidthForHitTesting: 18,
        },
        state: {
          selected: {
            stroke: "#1677FF",
            lineWidth: 2,
          },
        },
      },
      behaviors: ["drag-canvas", "zoom-canvas", "drag-element", "click-select"],
    });
    graphRef.current = graph;
    let disposed = false;
    let starting = false;
    let placed = false;

    const boot = async () => {
      if (disposed || placed || starting || graph.destroyed) {
        return;
      }
      const width = el.clientWidth;
      const height = el.clientHeight;
      // 卡片刚挂上时容器经常还是 0。用 320×240 做布局会把中心算在左上角，再被存进卡片。
      if (width < 2 || height < 2) {
        return;
      }
      starting = true;
      try {
        graph.setSize(width, height);
        await graph.render();
        if (disposed || graph.destroyed) {
          return;
        }
        const model = readRelation(itemRef.current);
        const missingPosition = model.nodes.some(
          (node) => node.x == null || node.y == null,
        );
        if (missingPosition) {
          await graph.layout(layoutOptions(model.layout));
          graph.stopLayout();
          if (disposed || graph.destroyed) {
            return;
          }
          persistRef.current();
        }
        focusNodes(graph);
        placed = true;
      } finally {
        starting = false;
      }
    };
    writtenRef.current = modelKey(readRelation(itemRef.current));
    void boot();

    graph.on("node:dragstart", () => uiRef.current.setMovingNode(true));
    graph.on("node:dragend", (event) => {
      uiRef.current.setMovingNode(false);
      persistRef.current();
      const id = (event as { target?: { id?: string } }).target?.id;
      if (id) {
        uiRef.current.showChrome("node", String(id));
      }
    });
    graph.on("node:pointerenter", (event) => {
      const id = (event as { target?: { id?: string } }).target?.id;
      if (id) {
        uiRef.current.showChrome("node", String(id));
      }
    });
    graph.on("node:pointerleave", (event) => {
      if (!pointerLeftToChrome(event)) {
        uiRef.current.hideSoon();
      }
    });
    graph.on("node:click", (event) => {
      const id = (event as { target?: { id?: string } }).target?.id;
      if (id) {
        uiRef.current.showChrome("node", String(id));
      }
    });
    graph.on("edge:pointerenter", (event) => {
      const id = (event as { target?: { id?: string } }).target?.id;
      if (id) {
        uiRef.current.showChrome("edge", String(id));
      }
    });
    graph.on("edge:pointerleave", (event) => {
      if (!pointerLeftToChrome(event)) {
        uiRef.current.hideSoon();
      }
    });
    graph.on("edge:click", (event) => {
      const id = (event as { target?: { id?: string } }).target?.id;
      if (id) {
        uiRef.current.showChrome("edge", String(id));
      }
    });
    graph.on("pointermove", (event) => {
      if (linkDragRef.current) {
        return;
      }
      const client = readClient(event);
      const live = graphRef.current;
      const box = containerRef.current?.getBoundingClientRect();
      if (!client || !live || live.destroyed || !box) {
        return;
      }
      const vx = client.x - box.left;
      const vy = client.y - box.top;
      const nodeId = hitNode(live, vx, vy, "");
      if (nodeId) {
        uiRef.current.showChrome("node", nodeId);
        return;
      }
      const edgeId = hitEdge(live, vx, vy);
      if (edgeId) {
        uiRef.current.showChrome("edge", edgeId);
        return;
      }
      uiRef.current.hideSoon();
    });
    graph.on("canvas:click", () => {
      if (!linkDragRef.current) {
        setChrome(null);
      }
    });
    graph.on("canvas:dblclick", (event) => {
      const client = (event as { client?: { x?: number; y?: number } }).client;
      const graphLive = graphRef.current;
      if (!graphLive || graphLive.destroyed || client?.x == null || client.y == null) {
        return;
      }
      const [x, y] = graphLive.getCanvasByClient([client.x, client.y]);
      uiRef.current.insertNode(x, y);
    });
    graph.on("node:dblclick", (event) => {
      const id = (event as { target?: { id?: string } }).target?.id;
      if (!id) {
        return;
      }
      const node = graph.getNodeData().find((item) => String(item.id) === id);
      if (!node) {
        return;
      }
      const [x, y] = graph.getElementPosition(id);
      const [vx, vy] = graph.getViewportByCanvas([x, y]);
      uiRef.current.openEditor({
        id,
        x: vx,
        y: vy,
        value: String(node.data?.label ?? ""),
      });
    });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Delete" && event.key !== "Backspace") {
        return;
      }
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      event.preventDefault();
      void removeSelected(graph).then((removed) => {
        if (!removed) {
          return;
        }
        setChrome(null);
        setEditor(null);
        persistRef.current();
      });
    };
    el.tabIndex = 0;
    el.addEventListener("keydown", onKeyDown);

    const observer = new ResizeObserver(() => {
      const width = el.clientWidth;
      const height = el.clientHeight;
      if (width < 2 || height < 2 || graph.destroyed) {
        return;
      }
      if (!placed) {
        void boot();
        return;
      }
      resizeKeepingCamera(graph, width, height);
    });
    observer.observe(el);

    return () => {
      disposed = true;
      observer.disconnect();
      el.removeEventListener("keydown", onKeyDown);
      graph.destroy();
      graphRef.current = null;
    };
    // 图实例跟卡片走，数据变化通过 writtenRef 同步
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id]);

  const externalKey = modelKey(readRelation(item));

  useEffect(() => {
    const graph = graphRef.current;
    if (!graph || graph.destroyed || externalKey === writtenRef.current) {
      return;
    }
    const model = readRelation(itemRef.current);
    const previous = writtenRef.current
      ? (JSON.parse(writtenRef.current) as RelationModel)
      : null;
    writtenRef.current = externalKey;
    let cancelled = false;
    const sync = async () => {
      graph.setData(toG6Data(model));
      await graph.draw();
      if (cancelled || graph.destroyed) {
        return;
      }
      const relayout = !previous || previous.layout !== model.layout;
      const missingPosition = model.nodes.some(
        (node) => node.x == null || node.y == null,
      );
      if (relayout || missingPosition) {
        await graph.layout(layoutOptions(model.layout));
        graph.stopLayout();
        if (!cancelled && !graph.destroyed) {
          focusNodes(graph);
          persistRef.current();
        }
      }
    };
    void sync();
    return () => {
      cancelled = true;
    };
  }, [externalKey]);

  const commitLabel = (id: string, value: string) => {
    setEditor((current) => (current?.id === id ? null : current));
    const graph = graphRef.current;
    if (!graph || graph.destroyed) {
      return;
    }
    const node = graph.getNodeData().find((entry) => String(entry.id) === id);
    if (!node) {
      return;
    }
    graph.updateNodeData([
      {
        id,
        data: { ...node.data, label: value },
      },
    ]);
    void graph.draw().then(() => persistRef.current());
  };

  const linkTitle = intl.formatMessage({ id: "fat-diagrams.relation.link" });
  const deleteNodeTitle = intl.formatMessage({
    id: "fat-diagrams.relation.deleteNode",
  });
  const deleteEdgeTitle = intl.formatMessage({
    id: "fat-diagrams.relation.deleteEdge",
  });

  return (
    <div className={styles.editor}>
      <div className={styles.hint}>
        {intl.formatMessage({ id: "fat-diagrams.toolbar.relationHint" })}
      </div>
      <div
        ref={containerRef}
        className={styles.canvas}
        onMouseDown={(event) => {
          event.stopPropagation();
          const target = event.target as HTMLElement;
          if (target.closest("input, textarea, button")) {
            return;
          }
          event.currentTarget.focus();
        }}
        onDoubleClick={(event) => event.stopPropagation()}
      >
        {linkDrag ? (
          <svg className={styles.draft} aria-hidden="true">
            <defs>
              <marker
                id={markerId}
                markerWidth="8"
                markerHeight="8"
                refX="6"
                refY="3"
                orient="auto"
              >
                <path d="M0,0 L7,3 L0,6 Z" fill="context-stroke" />
              </marker>
            </defs>
            <line
              x1={linkDrag.x1}
              y1={linkDrag.y1}
              x2={linkDrag.x2}
              y2={linkDrag.y2}
              stroke={linkDrag.targetId ? "#1677FF" : "#8C8C8C"}
              strokeWidth="1.5"
              markerEnd={`url(#${markerId})`}
            />
          </svg>
        ) : null}
        {linkDrag && linkDrag.pulled && !linkDrag.targetId ? (
          <div
            className={styles.ghost}
            style={{
              left: linkDrag.x2,
              top: linkDrag.y2,
              width: linkDrag.ghost,
              height: linkDrag.ghost,
            }}
          />
        ) : null}
        {chrome && !linkDrag && !movingNode ? (
          <>
            {chrome.kind === "node" ? (
              <button
                type="button"
                className={`${styles.spot} ${styles.port}`}
                style={{ left: chrome.x + chrome.r, top: chrome.y }}
                title={linkTitle}
                aria-label={linkTitle}
                onMouseEnter={cancelHide}
                onMouseLeave={hideSoon}
                onMouseDown={startLink}
              />
            ) : null}
            <button
              type="button"
              className={`${styles.spot} ${styles.remove}`}
              style={
                chrome.kind === "node"
                  ? { left: chrome.x, top: chrome.y - chrome.r - 10 }
                  : { left: chrome.x, top: chrome.y }
              }
              title={chrome.kind === "node" ? deleteNodeTitle : deleteEdgeTitle}
              aria-label={chrome.kind === "node" ? deleteNodeTitle : deleteEdgeTitle}
              onMouseEnter={cancelHide}
              onMouseLeave={hideSoon}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                if (chrome.kind === "node") {
                  removeNodeById(chrome.id);
                  return;
                }
                removeEdgeById(chrome.id);
              }}
            >
              ×
            </button>
          </>
        ) : null}
        {editor ? (
          <Input
            className={styles.labelInput}
            style={{ left: editor.x, top: editor.y }}
            size="small"
            autoFocus
            value={editor.value}
            onChange={(event) =>
              setEditor({ ...editor, value: event.target.value })
            }
            onBlur={() => commitLabel(editor.id, editor.value)}
            onPressEnter={() => commitLabel(editor.id, editor.value)}
          />
        ) : null}
      </div>
    </div>
  );
};

const removeSelected = async (graph: G6Graph): Promise<boolean> => {
  const nodes = graph.getElementDataByState("node", "selected");
  const edges = graph.getElementDataByState("edge", "selected");
  const nodeIds = new Set(nodes.map((node) => String(node.id)));
  const related = graph
    .getEdgeData()
    .filter(
      (edge) =>
        nodeIds.has(String(edge.source)) || nodeIds.has(String(edge.target)),
    );
  const edgeIds = Array.from(
    new Set(
      [...edges, ...related]
        .map((edge) => (edge.id ? String(edge.id) : ""))
        .filter(Boolean),
    ),
  );
  if (edgeIds.length) {
    graph.removeEdgeData(edgeIds);
  }
  if (nodeIds.size) {
    graph.removeNodeData(Array.from(nodeIds));
  }
  if (!edgeIds.length && !nodeIds.size) {
    return false;
  }
  await graph.draw();
  return true;
};

export default RelationDiagram;
