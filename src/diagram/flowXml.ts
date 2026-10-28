/**
 * 流程图存 draw.io 的 mxGraph XML。
 * 旧卡片只有 nodes/edges，第一次打开时转成 XML，避免原图丢了。
 */
import type { DiagramEdge, DiagramNode } from "./types";

export interface FlowXmlModel {
  xml: string;
}

interface LegacyFlow {
  xml?: string;
  direction?: string;
  nodes?: DiagramNode[];
  edges?: DiagramEdge[];
}

const escapeXml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const cellId = (id: string, fallback: string): string => {
  const cleaned = id.replace(/[^A-Za-z0-9_-]/g, "") || fallback;
  if (cleaned === "0" || cleaned === "1") {
    return `c-${cleaned}`;
  }
  return cleaned;
};

const coord = (value: number | undefined, fallback: number): number =>
  typeof value === "number" && Number.isFinite(value)
    ? Math.round(value)
    : fallback;

const modelXml = (cells: string): string =>
  `<mxGraphModel dx="1200" dy="800" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1169" pageHeight="827" math="0" shadow="0"><root>${cells}</root></mxGraphModel>`;

export const DEFAULT_FLOW_XML = modelXml(
  [
    '<mxCell id="0"/>',
    '<mxCell id="1" parent="0"/>',
    '<mxCell id="start" value="开始" style="ellipse;whiteSpace=wrap;html=1;fillColor=#d5e8d4;strokeColor=#82b366;" vertex="1" parent="1"><mxGeometry x="80" y="160" width="100" height="50" as="geometry"/></mxCell>',
    '<mxCell id="process" value="处理" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;" vertex="1" parent="1"><mxGeometry x="280" y="165" width="120" height="40" as="geometry"/></mxCell>',
    '<mxCell id="end" value="结束" style="ellipse;whiteSpace=wrap;html=1;fillColor=#f8cecc;strokeColor=#b85450;" vertex="1" parent="1"><mxGeometry x="500" y="160" width="100" height="50" as="geometry"/></mxCell>',
    '<mxCell id="e-start" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;endArrow=classic;" edge="1" parent="1" source="start" target="process"><mxGeometry relative="1" as="geometry"/></mxCell>',
    '<mxCell id="e-end" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;endArrow=classic;" edge="1" parent="1" source="process" target="end"><mxGeometry relative="1" as="geometry"/></mxCell>',
  ].join(""),
);

export const DEFAULT_FLOW: FlowXmlModel = {
  xml: DEFAULT_FLOW_XML,
};

const legacyToXml = (flow: LegacyFlow): string => {
  const horizontal = flow.direction !== "vertical";
  const nodes = flow.nodes || [];
  const idMap = new Map<string, string>();
  nodes.forEach((node, index) => {
    idMap.set(node.id, cellId(node.id, `n${index + 2}`));
  });
  const cells = ['<mxCell id="0"/>', '<mxCell id="1" parent="0"/>'];
  nodes.forEach((node, index) => {
    const id = idMap.get(node.id) || `n${index + 2}`;
    const x = coord(node.x, horizontal ? 40 + index * 180 : 160);
    const y = coord(node.y, horizontal ? 80 : 40 + index * 110);
    cells.push(
      `<mxCell id="${escapeXml(id)}" value="${escapeXml(node.label || "")}" style="rounded=1;whiteSpace=wrap;html=1;" vertex="1" parent="1"><mxGeometry x="${x}" y="${y}" width="120" height="40" as="geometry"/></mxCell>`,
    );
  });
  (flow.edges || []).forEach((edge, index) => {
    const source = idMap.get(edge.source);
    const target = idMap.get(edge.target);
    if (!source || !target) {
      return;
    }
    const id = cellId(edge.id, `e${index + 2}`);
    cells.push(
      `<mxCell id="${escapeXml(id)}" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;endArrow=classic;" edge="1" parent="1" source="${escapeXml(source)}" target="${escapeXml(target)}"><mxGeometry relative="1" as="geometry"/></mxCell>`,
    );
  });
  return modelXml(cells.join(""));
};

export const readFlowXml = (item: Block.Item): string => {
  const flow = item.options?.flow as LegacyFlow | undefined;
  if (flow?.xml && flow.xml.trim()) {
    return flow.xml;
  }
  if (flow?.nodes && flow.nodes.length) {
    return legacyToXml(flow);
  }
  return DEFAULT_FLOW_XML;
};
