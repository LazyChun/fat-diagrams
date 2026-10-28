/**
 * fat-diagrams 全局类型 — 卡片模型只保留关系图 / 流程图 / 思维导图初始化所需字段。
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

  export interface MindTree {
    data: {
      text?: string;
      uid?: string;
      expand?: boolean;
      [key: string]: unknown;
    };
    children?: MindTree[];
  }

  export interface MindView {
    transform?: Record<string, unknown>;
    state?: {
      scale?: number;
      x?: number;
      y?: number;
      sx?: number;
      sy?: number;
    };
  }

  export interface MindOptions {
    layout?: string;
    theme?: string;
    root?: MindTree;
    view?: MindView | null;
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
      mind?: MindOptions;
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

declare module "simple-mind-map" {
  export interface MindMapFullData {
    layout?: string;
    root?: Block.MindTree;
    theme?: { template?: string };
    view?: Block.MindView | null;
  }

  export interface MindNodeRef {
    isRoot?: boolean;
  }

  export interface MindMapInstance {
    opt: {
      defaultInsertSecondLevelNodeText: string;
      defaultInsertBelowSecondLevelNodeText: string;
    };
    renderer: {
      root: MindNodeRef | null;
      activeNodeList: MindNodeRef[];
      setRootNodeCenter: () => void;
      moveNodeToCenter: (node: MindNodeRef | null, resetScale?: boolean) => void;
    };
    view: {
      fit: () => void;
    };
    getData: (withConfig?: boolean) => MindMapFullData | null;
    setData: (data: Block.MindTree) => void;
    setLayout: (layout: string, notRender?: boolean) => void;
    setTheme: (theme: string, notRender?: boolean) => void;
    setThemeConfig: (config: Record<string, unknown>, notRender?: boolean) => void;
    execCommand: (name: string, ...args: unknown[]) => void;
    on: (event: string, fn: () => void) => void;
    resize: () => void;
    destroy: () => void;
  }

  interface MindMapConstructor {
    new (options: Record<string, unknown>): MindMapInstance;
    usePlugin: (plugin: unknown, opt?: unknown) => MindMapConstructor;
    defineTheme: (name: string, config?: Record<string, unknown>) => void;
  }

  const MindMap: MindMapConstructor;
  export default MindMap;
}

declare module "simple-mind-map/src/plugins/Drag.js" {
  const plugin: new (opt: { mindMap: unknown }) => unknown;
  export default plugin;
}

declare module "simple-mind-map/src/plugins/KeyboardNavigation.js" {
  const plugin: new (opt: { mindMap: unknown }) => unknown;
  export default plugin;
}

declare module "simple-mind-map-plugin-themes" {
  interface ThemesApi {
    init: (mindMap: {
      defineTheme: (name: string, config?: Record<string, unknown>) => void;
    }) => void;
  }
  const Themes: ThemesApi;
  export default Themes;
}
