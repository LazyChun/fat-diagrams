/**
 * fat-diagrams 插件入口 — Module Federation expose "./plugin"
 *
 * 向宿主注册两种图卡片：关系图（AntV G6）、流程图（draw.io）。
 *
 * 标题按当前 locale 解析成文本再注册。插件 key 不在宿主消息目录里，
 * 宿主添加卡片菜单对 name 调用 intl.formatMessage 时会原样显示。
 * 语言切换时 dispose 旧注册并按新 locale 重新注册。
 *
 * 图标由插件自己提供（iconUrl），不写入宿主图标表。
 * 分类 structure 由插件注册，标题随语言切换，排在过滤下面。
 */
import React from "react";
import type {
  BlockRenderProps,
  Disposable,
  FatNotesPluginSDK,
} from "fat-notes-sdk";
import { InitSdk } from "components";
import {
  RelationDiagram,
  FlowDiagram,
  RelationDisplayConfig,
  FlowDisplayConfig,
} from "pluginComps";
import cn from "./locales/zh_CN";
import en from "./locales/en_US";
import { DEFAULT_RELATION } from "./diagram/types";
import { DEFAULT_FLOW } from "./diagram/flowXml";
import relationIcon from "./assets/relation.svg";
import flowIcon from "./assets/flow.svg";

const LOCALE_MESSAGES: Record<string, Record<string, string>> = {
  zh_CN: cn,
  en_US: en,
};

const DEFAULT_LOCALE = "zh_CN";

const normalizeLocale = (locale?: string): string => {
  if (!locale) {
    return DEFAULT_LOCALE;
  }
  const normalized = locale.replace("-", "_");
  if (normalized.startsWith("zh")) {
    return "zh_CN";
  }
  if (normalized.startsWith("en")) {
    return "en_US";
  }
  return DEFAULT_LOCALE;
};

const translateTitle = (locale: string, key: string): string =>
  LOCALE_MESSAGES[locale]?.[key] || (cn as Record<string, string>)[key] || key;

interface DiagramComponentProps {
  config?: unknown;
  item: Block.Item;
  inConfig?: boolean;
  time?: BlockRenderProps["time"];
  chartId?: string;
  actionsVisible?: boolean;
  onShowActions?: BlockRenderProps["onShowActions"];
}

interface DiagramCardDef {
  type: string;
  titleKey: string;
  iconUrl: string;
  index: number;
  defaultSize: { w: number; h: number; minW?: number; minH?: number };
  defaultOptions: Record<string, unknown>;
  component: React.FC<DiagramComponentProps>;
  configComponent: React.FC;
}

const STRUCTURE_CATEGORY = "structure";

const DIAGRAM_CARDS: DiagramCardDef[] = [
  {
    type: "fat-diagrams.relation",
    titleKey: "fat-diagrams.relation",
    iconUrl: relationIcon,
    index: 0,
    defaultSize: { w: 12, h: 80 },
    defaultOptions: {
      relation: DEFAULT_RELATION,
    },
    component: RelationDiagram,
    configComponent: RelationDisplayConfig,
  },
  {
    type: "fat-diagrams.flow",
    titleKey: "fat-diagrams.flow",
    iconUrl: flowIcon,
    index: 1,
    defaultSize: { w: 24, h: 80, minW: 8, minH: 40 },
    defaultOptions: {
      flow: DEFAULT_FLOW,
    },
    component: FlowDiagram,
    configComponent: FlowDisplayConfig,
  },
];

let sdkRef: FatNotesPluginSDK | undefined;
let cardDisposables: Disposable[] = [];

const createFallbackItem = (type: string): Block.Item => ({
  id: "",
  type,
  boardId: "",
  reqParams: { queries: [] },
});

const disposeCardRegistrations = (): void => {
  while (cardDisposables.length) {
    try {
      cardDisposables.pop()?.dispose();
    } catch (e) {
      console.warn("[fat-diagrams] dispose error", e);
    }
  }
};

const registerDiagramCards = (locale: string): void => {
  const sdk = sdkRef;
  if (!sdk) {
    return;
  }
  cardDisposables.push(
    sdk.contributions.registerBlockCategory({
      id: STRUCTURE_CATEGORY,
      title: translateTitle(locale, "fat-diagrams.category.structure"),
      after: "filter",
    }),
  );

  for (const card of DIAGRAM_CARDS) {
    const component = card.component;
    const configComponent = card.configComponent;
    const cardType = card.type;

    cardDisposables.push(
      sdk.contributions.registerBlockType({
        type: cardType,
        title: translateTitle(locale, card.titleKey),
        iconUrl: card.iconUrl,
        category: STRUCTURE_CATEGORY,
        index: card.index,
        defaultSize: {
          minW: 4,
          minH: 8,
          ...card.defaultSize,
        },
        defaultOptions: card.defaultOptions,
        // 图还没有绑定查询，先隐藏数据配置区
        dataConfig: false,
        actionIds: ["relate", "linkTo"],
        triggers: ["onClick"],
        render: (props: BlockRenderProps) =>
          React.createElement(
            InitSdk,
            { sdk },
            React.createElement(component, {
              config: props.config,
              item:
                (props.item as unknown as Block.Item | undefined) ||
                createFallbackItem(cardType),
              inConfig: props.inConfig,
              time: props.time,
              chartId: props.chartId,
              actionsVisible: props.actionsVisible,
              onShowActions: props.onShowActions,
            }),
          ),
      }),
    );

    cardDisposables.push(
      sdk.contributions.registerBlockDisplayConfig({
        id: `${cardType}.config`,
        blockType: cardType,
        render: () =>
          React.createElement(
            InitSdk,
            { sdk },
            React.createElement(configComponent),
          ),
      }),
    );
  }
};

let localeListener: Disposable | undefined;

export function activate(sdk: FatNotesPluginSDK): void {
  sdkRef = sdk;
  registerDiagramCards(normalizeLocale(sdk.ui.i18n.locale));
  localeListener = sdk.ui.i18n.onChange((nextLocale) => {
    disposeCardRegistrations();
    registerDiagramCards(normalizeLocale(nextLocale));
  });
}

export function deactivate(): void {
  try {
    localeListener?.dispose();
  } catch (e) {
    console.warn("[fat-diagrams] locale listener dispose error", e);
  }
  localeListener = undefined;
  disposeCardRegistrations();
  sdkRef = undefined;
}
