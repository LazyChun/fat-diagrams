export interface DiagramNode {
  id: string;
  label: string;
  x?: number;
  y?: number;
}

export interface DiagramEdge {
  id: string;
  source: string;
  target: string;
}

export interface RelationModel {
  layout: "force" | "hierarchy" | string;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
}

export interface FlowModel {
  direction: "horizontal" | "vertical" | string;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
}

export const DEFAULT_RELATION: RelationModel = {
  layout: "force",
  nodes: [
    { id: "n1", label: "A" },
    { id: "n2", label: "B" },
    { id: "n3", label: "C" },
  ],
  edges: [
    { id: "e1", source: "n1", target: "n2" },
    { id: "e2", source: "n1", target: "n3" },
  ],
};

export const DEFAULT_FLOW: FlowModel = {
  direction: "horizontal",
  nodes: [
    { id: "n1", label: "Start", x: 24, y: 48 },
    { id: "n2", label: "Process", x: 200, y: 48 },
    { id: "n3", label: "End", x: 376, y: 48 },
  ],
  edges: [
    { id: "e1", source: "n1", target: "n2" },
    { id: "e2", source: "n2", target: "n3" },
  ],
};

export const nextDiagramId = (prefix: string): string =>
  `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
