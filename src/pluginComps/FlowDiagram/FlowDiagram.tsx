/**
 * 流程图 — AntV X6。可拖拽步骤、从连接点拉线、双击改名、删除，结果写回 options.flow。
 */
import React, { useEffect, useRef } from "react";
import {
  Graph,
  Keyboard,
  Selection,
  Shape,
  Snapline,
  connectionPointRegistry,
  connectorRegistry,
  gridRegistry,
  highlighterRegistry,
  markerRegistry,
  nodeToolRegistry,
  portLayoutRegistry,
  routerRegistry,
} from "@antv/x6";
import type { Graph as X6Graph } from "@antv/x6";

// 生产构建会摇掉只靠副作用注册的内置图形、路由和工具，创建节点时就会报 shape 缺失。
const keepX6Builtins = () => {
  void Shape.Rect;
  void Shape.Edge;
  routerRegistry.get("manhattan");
  routerRegistry.get("orth");
  connectorRegistry.get("rounded");
  markerRegistry.get("block");
  nodeToolRegistry.get("node-editor");
  portLayoutRegistry.get("top");
  gridRegistry.get("dot");
  highlighterRegistry.get("stroke");
  connectionPointRegistry.get("boundary");
};
keepX6Builtins();
import { useIntl } from "react-intl";
import { useDispatch, useStore } from "react-redux";
import type { BlockActionShowParams, BlockTimeContext } from "fat-notes-sdk";
import { DiagramToolbar } from "components";
import {
  DEFAULT_FLOW,
  nextDiagramId,
  type DiagramEdge,
  type DiagramNode,
  type FlowModel,
} from "../../diagram/types";
import { saveBlockOptions } from "../../diagram/saveBlock";
import styles from "./FlowDiagram.less";

interface FlowDiagramProps {
  config?: unknown;
  item: Block.Item;
  inConfig?: boolean;
  time?: BlockTimeContext;
  chartId?: string;
  actionsVisible?: boolean;
  onShowActions?: (params: BlockActionShowParams) => void;
}

interface CellJson {
  id?: string;
  source?: { cell?: string };
  target?: { cell?: string };
  position?: { x?: number; y?: number };
  attrs?: { label?: { text?: string } };
}

const NODE_WIDTH = 120;
const NODE_HEIGHT = 40;

const readFlow = (item: Block.Item): FlowModel => {
  const flow = item.options?.flow;
  return {
    direction: flow?.direction || DEFAULT_FLOW.direction,
    nodes:
      flow?.nodes && flow.nodes.length
        ? flow.nodes.map((node) => ({ ...node }))
        : DEFAULT_FLOW.nodes.map((node) => ({ ...node })),
    edges: (flow?.edges || DEFAULT_FLOW.edges).map((edge) => ({ ...edge })),
  };
};

const modelKey = (model: FlowModel): string => JSON.stringify(model);

const portGroup = (position: string) => ({
  position,
  attrs: {
    circle: {
      r: 4,
      magnet: true,
      stroke: "#1677FF",
      strokeWidth: 1,
      fill: "#fff",
    },
  },
});

const ports = {
  groups: {
    top: portGroup("top"),
    right: portGroup("right"),
    bottom: portGroup("bottom"),
    left: portGroup("left"),
  },
  items: [
    { id: "top", group: "top" },
    { id: "right", group: "right" },
    { id: "bottom", group: "bottom" },
    { id: "left", group: "left" },
  ],
};

const nodeMeta = (node: DiagramNode) => ({
  id: node.id,
  shape: "rect",
  x: node.x ?? 24,
  y: node.y ?? 48,
  width: NODE_WIDTH,
  height: NODE_HEIGHT,
  attrs: {
    body: {
      fill: "#ffffff",
      stroke: "#1677FF",
      rx: 6,
      ry: 6,
    },
    label: {
      text: node.label,
      fill: "#172634",
      fontSize: 13,
    },
  },
  ports,
  tools: {
    items: [
      {
        name: "node-editor",
        args: {
          getText: "label/text",
          setText: "label/text",
        },
      },
    ],
  },
});

const edgeAppearance = (direction: string) => ({
  shape: "edge",
  router: { name: direction === "vertical" ? "orth" : "manhattan" },
  connector: { name: "rounded", args: { radius: 8 } },
  attrs: {
    line: {
      stroke: "#8C8C8C",
      strokeWidth: 1,
      targetMarker: { name: "block", width: 8, height: 6 },
    },
  },
});

const edgeMeta = (edge: DiagramEdge, direction: string) => ({
  id: edge.id,
  source: { cell: edge.source },
  target: { cell: edge.target },
  ...edgeAppearance(direction),
});

const toCells = (model: FlowModel) => [
  ...model.nodes.map((node) => nodeMeta(node)),
  ...model.edges.map((edge) => edgeMeta(edge, model.direction)),
];

const readGraph = (graph: X6Graph): Pick<FlowModel, "nodes" | "edges"> => {
  const cells = graph.toJSON().cells as CellJson[];
  const nodes: DiagramNode[] = [];
  const edges: DiagramEdge[] = [];
  cells.forEach((cell) => {
    if (cell.source?.cell && cell.target?.cell) {
      edges.push({
        id: String(cell.id || nextDiagramId("e")),
        source: cell.source.cell,
        target: cell.target.cell,
      });
      return;
    }
    if (!cell.id) {
      return;
    }
    nodes.push({
      id: cell.id,
      label: String(cell.attrs?.label?.text ?? ""),
      x: cell.position?.x,
      y: cell.position?.y,
    });
  });
  return { nodes, edges };
};

const arrange = (graph: X6Graph, direction: string) => {
  const horizontal = direction !== "vertical";
  const nodes = [...graph.getNodes()].sort((left, right) => {
    const a = left.position();
    const b = right.position();
    return horizontal ? a.y - b.y || a.x - b.x : a.x - b.x || a.y - b.y;
  });
  nodes.forEach((node, index) => {
    if (horizontal) {
      node.position(24 + index * 176, 48);
    } else {
      node.position(80, 24 + index * 100);
    }
  });
  const router = horizontal ? "manhattan" : "orth";
  graph.getEdges().forEach((edge) => {
    edge.setRouter({ name: router });
  });
};

const FlowDiagram: React.FC<FlowDiagramProps> = (props) => {
  const { item, inConfig } = props;
  const intl = useIntl();
  const dispatch = useDispatch();
  const store = useStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<X6Graph | null>(null);
  const itemRef = useRef(item);
  const inConfigRef = useRef(inConfig);
  const writtenRef = useRef("");
  const readyRef = useRef(false);
  const directionRef = useRef(readFlow(item).direction);
  itemRef.current = item;
  inConfigRef.current = inConfig;
  directionRef.current = readFlow(item).direction;

  const persistRef = useRef<() => void>(() => undefined);
  persistRef.current = () => {
    const graph = graphRef.current;
    if (!graph || !readyRef.current) {
      return;
    }
    const current = itemRef.current;
    const model = readFlow(current);
    const drawn = readGraph(graph);
    const nextModel: FlowModel = {
      direction: model.direction,
      nodes: drawn.nodes,
      edges: drawn.edges,
    };
    const key = modelKey(nextModel);
    if (key === writtenRef.current) {
      return;
    }
    writtenRef.current = key;
    const options = { ...current.options, flow: nextModel };
    itemRef.current = { ...current, options };
    void saveBlockOptions(
      dispatch,
      () => store.getState(),
      current,
      inConfigRef.current,
      options,
    );
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) {
      return;
    }
    let graph: X6Graph;
    graph = new Graph({
      container: el,
      autoResize: true,
      background: { color: "transparent" },
      grid: true,
      panning: { enabled: true, eventTypes: ["rightMouseDown"] },
      mousewheel: { enabled: true, modifiers: ["ctrl", "meta"] },
      connecting: {
        snap: true,
        allowBlank: false,
        allowLoop: false,
        allowNode: false,
        highlight: true,
        router: {
          name: directionRef.current === "vertical" ? "orth" : "manhattan",
        },
        connector: { name: "rounded", args: { radius: 8 } },
        createEdge(): ReturnType<X6Graph["createEdge"]> {
          return graph.createEdge(edgeAppearance(directionRef.current));
        },
      },
    });
    graph.use(
      new Selection({
        multiple: true,
        rubberband: true,
        showNodeSelectionBox: true,
        showEdgeSelectionBox: true,
      }),
    );
    graph.use(new Snapline());
    graph.use(new Keyboard());
    graph.bindKey(["delete", "backspace"], () => {
      graph.getSelectedCells().forEach((cell: { remove: () => void }) => {
        cell.remove();
      });
      persistRef.current();
    });
    graphRef.current = graph;
    const model = readFlow(itemRef.current);
    writtenRef.current = modelKey(model);
    graph.fromJSON({ cells: toCells(model) });
    readyRef.current = true;

    const schedule = () => {
      if (readyRef.current) {
        persistRef.current();
      }
    };
    graph.on("node:moved", schedule);
    graph.on("edge:connected", schedule);
    graph.on("cell:removed", schedule);
    graph.on("cell:added", schedule);
    graph.on("node:change:attrs", schedule);

    return () => {
      readyRef.current = false;
      graph.dispose();
      graphRef.current = null;
    };
  }, [item.id]);

  const externalKey = modelKey(readFlow(item));

  useEffect(() => {
    const graph = graphRef.current;
    if (!graph || !readyRef.current || externalKey === writtenRef.current) {
      return;
    }
    const model = readFlow(itemRef.current);
    const previous = writtenRef.current
      ? (JSON.parse(writtenRef.current) as FlowModel)
      : null;
    writtenRef.current = externalKey;
    if (previous && previous.direction !== model.direction) {
      arrange(graph, model.direction);
      persistRef.current();
      return;
    }
    readyRef.current = false;
    graph.fromJSON({ cells: toCells(model) });
    readyRef.current = true;
  }, [externalKey]);

  const addNode = () => {
    const graph = graphRef.current;
    if (!graph) {
      return;
    }
    const nodes = graph.getNodes();
    const last = nodes[nodes.length - 1];
    const pos = last ? last.position() : { x: 24, y: 48 };
    const horizontal = directionRef.current !== "vertical";
    const id = nextDiagramId("n");
    graph.addNode(
      nodeMeta({
        id,
        label: intl.formatMessage({ id: "fat-diagrams.node.new" }),
        x: horizontal ? pos.x + 176 : pos.x,
        y: horizontal ? pos.y : pos.y + 100,
      }),
    );
    persistRef.current();
  };

  return (
    <div className={styles.editor}>
      <DiagramToolbar
        addText={intl.formatMessage({ id: "fat-diagrams.toolbar.add" })}
        deleteText={intl.formatMessage({ id: "fat-diagrams.toolbar.delete" })}
        hint={intl.formatMessage({ id: "fat-diagrams.toolbar.flowHint" })}
        onAdd={addNode}
        onDelete={() => {
          const graph = graphRef.current;
          if (!graph) {
            return;
          }
          graph.getSelectedCells().forEach((cell: { remove: () => void }) => {
        cell.remove();
      });
          persistRef.current();
        }}
      />
      <div
        ref={containerRef}
        className={styles.canvas}
        onMouseDown={(event) => event.stopPropagation()}
      />
    </div>
  );
};

export default FlowDiagram;
