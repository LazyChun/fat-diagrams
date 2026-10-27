/**
 * 关系图 — AntV G6。可拖拽节点、连线、改名、删除，结果写回卡片 options.relation。
 */
import React, { useEffect, useRef, useState } from "react";
import { Input } from "antd";
import { Graph } from "@antv/g6";
import type { Graph as G6Graph } from "@antv/g6";
import { useIntl } from "react-intl";
import { useDispatch, useStore } from "react-redux";
import type { BlockActionShowParams, BlockTimeContext } from "fat-notes-sdk";
import { DiagramToolbar } from "components";
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

const RelationDiagram: React.FC<RelationDiagramProps> = (props) => {
  const { item, inConfig } = props;
  const intl = useIntl();
  const dispatch = useDispatch();
  const store = useStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<G6Graph | null>(null);
  const itemRef = useRef(item);
  const inConfigRef = useRef(inConfig);
  const writtenRef = useRef("");
  const linkingRef = useRef(false);
  const [linking, setLinking] = useState(false);
  const [editor, setEditor] = useState<LabelEditorState | null>(null);
  itemRef.current = item;
  inConfigRef.current = inConfig;
  linkingRef.current = linking;

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

  const behaviors = (linkEnabled: boolean) => {
    const base = ["drag-canvas", "zoom-canvas", "drag-element", "click-select"];
    if (!linkEnabled) {
      return base;
    }
    return [
      ...base,
      {
        type: "create-edge" as const,
        key: "create-edge",
        trigger: "click" as const,
        style: { stroke: "#8C8C8C", lineWidth: 1 },
        onCreate: (edge: { id?: string; source?: string; target?: string }) => {
          if (!edge.source || !edge.target || edge.source === edge.target) {
            return undefined;
          }
          return { ...edge, id: edge.id || nextDiagramId("e") };
        },
        onFinish: () => persistRef.current(),
      },
    ];
  };

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
          size: 36,
          fill: "#1677FF",
          stroke: "#0958D9",
          lineWidth: 1,
          labelText: (datum) => String(datum.data?.label ?? ""),
          labelFill: "#172634",
          labelFontSize: 12,
          labelPlacement: "bottom",
          labelOffsetY: 6,
        },
      },
      edge: {
        type: "quadratic",
        style: {
          stroke: "#8C8C8C",
          lineWidth: 1,
          endArrow: true,
        },
      },
      behaviors: behaviors(false),
    });
    graphRef.current = graph;
    let disposed = false;

    const boot = async () => {
      const width = el.clientWidth || 320;
      const height = el.clientHeight || 240;
      graph.setSize(width, height);
      await graph.render();
      if (disposed) {
        return;
      }
      const model = readRelation(itemRef.current);
      const missingPosition = model.nodes.some(
        (node) => node.x == null || node.y == null,
      );
      if (missingPosition) {
        await graph.layout(layoutOptions(model.layout));
        graph.stopLayout();
        if (!disposed) {
          await graph.fitView();
          persistRef.current();
        }
      }
    };
    writtenRef.current = modelKey(readRelation(itemRef.current));
    void boot();

    graph.on("node:dragend", () => persistRef.current());
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
      setEditor({
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
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) {
        return;
      }
      event.preventDefault();
      void removeSelected(graph);
    };
    el.tabIndex = 0;
    el.addEventListener("keydown", onKeyDown);

    const observer = new ResizeObserver(() => {
      const width = el.clientWidth;
      const height = el.clientHeight;
      if (width > 0 && height > 0 && !graph.destroyed) {
        graph.setSize(width, height);
      }
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
        if (!cancelled) {
          await graph.fitView();
          persistRef.current();
        }
      }
    };
    void sync();
    return () => {
      cancelled = true;
    };
  }, [externalKey]);

  useEffect(() => {
    const graph = graphRef.current;
    if (!graph || graph.destroyed) {
      return;
    }
    graph.setBehaviors(behaviors(linking));
  }, [linking]);

  const commitLabel = (value: string) => {
    const graph = graphRef.current;
    const current = editor;
    setEditor(null);
    if (!graph || graph.destroyed || !current) {
      return;
    }
    const node = graph.getNodeData().find((item) => String(item.id) === current.id);
    if (!node) {
      return;
    }
    graph.updateNodeData([
      {
        id: current.id,
        data: { ...node.data, label: value },
      },
    ]);
    void graph.draw().then(() => persistRef.current());
  };

  const addNode = () => {
    const graph = graphRef.current;
    const el = containerRef.current;
    if (!graph || graph.destroyed || !el) {
      return;
    }
    const id = nextDiagramId("n");
    graph.addNodeData([
      {
        id,
        data: {
          label: intl.formatMessage({ id: "fat-diagrams.node.new" }),
        },
        style: {
          x: (el.clientWidth || 240) / 2,
          y: (el.clientHeight || 180) / 2,
        },
      },
    ]);
    void graph.draw().then(() => persistRef.current());
  };

  return (
    <div className={styles.editor}>
      <DiagramToolbar
        addText={intl.formatMessage({ id: "fat-diagrams.toolbar.add" })}
        linkText={intl.formatMessage({ id: "fat-diagrams.toolbar.link" })}
        deleteText={intl.formatMessage({ id: "fat-diagrams.toolbar.delete" })}
        hint={intl.formatMessage({ id: "fat-diagrams.toolbar.relationHint" })}
        linking={linking}
        onAdd={addNode}
        onToggleLink={() => setLinking((value) => !value)}
        onDelete={() => {
          const graph = graphRef.current;
          if (graph && !graph.destroyed) {
            void removeSelected(graph).then(() => persistRef.current());
          }
        }}
      />
      <div
        ref={containerRef}
        className={styles.canvas}
        onMouseDown={(event) => event.stopPropagation()}
      >
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
            onBlur={() => commitLabel(editor.value)}
            onPressEnter={() => commitLabel(editor.value)}
          />
        ) : null}
      </div>
    </div>
  );
};

const removeSelected = async (graph: G6Graph) => {
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
  if (edgeIds.length || nodeIds.size) {
    await graph.draw();
  }
};

export default RelationDiagram;
