/**
 * fat-diagrams 全局类型 — 卡片模型只保留关系图 / 流程图初始化所需字段。
 */

declare namespace Block {
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

  export interface RelationOptions {
    // force-力导向 hierarchy-层级
    layout: "force" | "hierarchy" | string;
    nodes?: DiagramNode[];
    edges?: DiagramEdge[];
  }

  export interface FlowOptions {
    // draw.io mxGraph XML。旧数据可能只有 nodes/edges，打开时会转成 xml。
    xml?: string;
    direction?: "horizontal" | "vertical" | string;
    nodes?: DiagramNode[];
    edges?: DiagramEdge[];
  }

  export interface Item {
    id: string;
    type: string;
    title?: string;
    boardId: string;
    reqParams?: {
      queries?: unknown[];
    };
    commonOptions?: Record<string, unknown>;
    options?: {
      relation?: RelationOptions;
      flow?: FlowOptions;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  }
}

declare module "*.less" {
  const classes: { readonly [key: string]: string };
  export default classes;
}

declare module "*.css";

declare module "*.svg" {
  const src: string;
  export default src;
}
