export interface DiagramNode {
  id: string;
  label: string;
  x?: number;
  y?: number;
  /** 圆点填充色，如 #1677ff。空则用默认蓝。 */
  color?: string;
  /** 圆点图片，压缩后的 data URL。 */
  image?: string;
}

export interface DiagramEdge {
  id: string;
  source: string;
  target: string;
  /** 连线名称，画在曲线中点。 */
  label?: string;
  /** 连线颜色。空则用默认灰。 */
  color?: string;
}

export interface RelationModel {
  layout: "force" | "hierarchy" | string;
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

export const nextDiagramId = (prefix: string): string =>
  `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
