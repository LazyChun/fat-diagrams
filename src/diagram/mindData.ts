/**
 * 思维导图数据。节点树、结构和主题存在卡片 options.mind 里。
 * 结构见 https://wanglin2.github.io/mind-map-docs/course/course18.html
 */

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

export interface MindModel {
  layout: string;
  theme: string;
  root: MindTree;
  view: MindView | null;
}

export const MIND_LAYOUTS = [
  "logicalStructure",
  "logicalStructureLeft",
  "mindMap",
  "organizationStructure",
  "catalogOrganization",
  "timeline",
  "verticalTimeline",
  "fishbone",
] as const;

export const MIND_THEMES = [
  "default",
  "classic",
  "mint",
  "skyGreen",
  "classicBlue",
  "minions",
  "simpleBlack",
  "dark",
  "dark2",
  "coffee",
] as const;

export const DEFAULT_MIND_LAYOUT = "mindMap";
export const DEFAULT_MIND_THEME = "default";

// 卡片底色由宿主决定，导图画布不再铺一层主题背景
export const MIND_CARD_THEME_CONFIG: Record<string, unknown> = {
  backgroundColor: "transparent",
  backgroundImage: "none",
};

const TEXT: Record<string, { center: string; branch: string; child: string }> = {
  zh_CN: { center: "中心主题", branch: "分支主题", child: "子主题" },
  en_US: { center: "Central topic", branch: "Branch", child: "Subtopic" },
};

const textOf = (locale?: string) => {
  if (locale && locale.toLowerCase().startsWith("en")) {
    return TEXT.en_US;
  }
  return TEXT.zh_CN;
};

export const createDefaultMind = (locale?: string): MindModel => {
  const text = textOf(locale);
  return {
    layout: DEFAULT_MIND_LAYOUT,
    theme: DEFAULT_MIND_THEME,
    view: null,
    root: {
      data: { text: text.center },
      children: [
        {
          data: { text: text.branch },
          children: [
            { data: { text: text.child }, children: [] },
            { data: { text: text.child }, children: [] },
          ],
        },
        {
          data: { text: text.branch },
          children: [{ data: { text: text.child }, children: [] }],
        },
      ],
    },
  };
};

const themeName = (theme: unknown): string => {
  if (typeof theme === "string" && theme) {
    return theme;
  }
  if (theme && typeof theme === "object" && "template" in theme) {
    const template = (theme as { template?: unknown }).template;
    if (typeof template === "string" && template) {
      return template;
    }
  }
  return DEFAULT_MIND_THEME;
};

const readView = (view: unknown): MindView | null => {
  if (!view || typeof view !== "object") {
    return null;
  }
  const state = (view as MindView).state;
  if (!state || typeof state.scale !== "number") {
    return null;
  }
  return view as MindView;
};

export const readMind = (item: Block.Item): MindModel => {
  const mind = item.options?.mind;
  const fallback = createDefaultMind();
  if (!mind?.root?.data) {
    return fallback;
  }
  return {
    layout: mind.layout || DEFAULT_MIND_LAYOUT,
    theme: themeName(mind.theme),
    root: mind.root,
    view: readView(mind.view),
  };
};

export const stableStringify = (value: unknown): string => {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record).sort();
    return `{${keys
      .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
};

export const mindStructureKey = (model: Pick<MindModel, "layout" | "theme" | "root">): string =>
  stableStringify({
    layout: model.layout,
    theme: model.theme,
    root: model.root,
  });

export const cloneMind = <T>(value: T): T =>
  JSON.parse(JSON.stringify(value)) as T;
