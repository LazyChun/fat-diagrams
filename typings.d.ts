/**
 * fat-diagrams 全局类型 — 卡片模型只保留关系图 / 流程图初始化所需字段。
 */

declare namespace Block {
  export interface RelationOptions {
    // force-力导向 hierarchy-层级
    layout: "force" | "hierarchy" | string;
  }

  export interface FlowOptions {
    // horizontal-从左到右 vertical-从上到下
    direction: "horizontal" | "vertical" | string;
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
