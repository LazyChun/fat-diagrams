/**
 * 思维导图 — simple-mind-map（思绪）。
 * 节点树、结构、主题和视图写回 options.mind。
 * https://github.com/wanglin2/mind-map
 */
import React, { useEffect, useRef, useState } from "react";
import { Button, Select } from "antd";
import { useIntl } from "react-intl";
import { useDispatch, useStore } from "react-redux";
import type { BlockActionShowParams, BlockTimeContext } from "fat-notes-sdk";
import MindMap from "simple-mind-map";
import type { MindMapInstance } from "simple-mind-map";
import Drag from "simple-mind-map/src/plugins/Drag.js";
import KeyboardNavigation from "simple-mind-map/src/plugins/KeyboardNavigation.js";
import Themes from "simple-mind-map-plugin-themes";
import { saveBlockOptions } from "../../diagram/saveBlock";
import {
  cloneMind,
  MIND_CARD_THEME_CONFIG,
  MIND_LAYOUTS,
  mindStructureKey,
  readMind,
  stableStringify,
  type MindModel,
} from "../../diagram/mindData";
import styles from "./MindDiagram.less";

Themes.init(MindMap);
MindMap.usePlugin(Drag);
MindMap.usePlugin(KeyboardNavigation);

interface MindDiagramProps {
  config?: unknown;
  item: Block.Item;
  inConfig?: boolean;
  time?: BlockTimeContext;
  chartId?: string;
  actionsVisible?: boolean;
  onShowActions?: (params: BlockActionShowParams) => void;
}

const SAVE_DELAY = 400;

interface InsertText {
  branch: string;
  sub: string;
}

const canUseShortcut = (event: KeyboardEvent): boolean => {
  const target = event.target as HTMLElement | null;
  if (!target || target === document.body) {
    return true;
  }
  if (target.classList?.contains("smm-node-edit-wrap")) {
    return true;
  }
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable) {
    return false;
  }
  return true;
};

const modelFromInstance = (
  data: ReturnType<MindMapInstance["getData"]>,
  fallback: MindModel,
): MindModel | null => {
  if (!data?.root?.data) {
    return null;
  }
  return {
    layout: data.layout || fallback.layout,
    theme: data.theme?.template || fallback.theme,
    root: data.root,
    view: data.view?.state ? data.view : fallback.view,
  };
};

const MindDiagram: React.FC<MindDiagramProps> = (props) => {
  const { item, inConfig } = props;
  const intl = useIntl();
  const dispatch = useDispatch();
  const store = useStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const mindMapRef = useRef<MindMapInstance | null>(null);
  const itemRef = useRef(item);
  const inConfigRef = useRef(inConfig);
  const writtenRef = useRef("");
  const savedRef = useRef("");
  const insertTextRef = useRef<InsertText>({ branch: "", sub: "" });
  itemRef.current = item;
  inConfigRef.current = inConfig;
  const branchText = intl.formatMessage({ id: "fat-diagrams.mind.branch" });
  const subText = intl.formatMessage({ id: "fat-diagrams.mind.subtopic" });
  insertTextRef.current = { branch: branchText, sub: subText };

  const structureKey = mindStructureKey(readMind(item));
  const [layout, setLayout] = useState(() => readMind(item).layout);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) {
      return;
    }
    let disposed = false;
    let mindMap: MindMapInstance | null = null;
    let timer: number | undefined;
    let didCenter = false;

    const persist = () => {
      if (disposed || !mindMap) {
        return;
      }
      const current = itemRef.current;
      const fallback = readMind(current);
      const model = modelFromInstance(mindMap.getData(true), fallback);
      if (!model) {
        return;
      }
      const fullKey = stableStringify(model);
      if (fullKey === savedRef.current) {
        return;
      }
      savedRef.current = fullKey;
      writtenRef.current = mindStructureKey(model);
      const options = { ...current.options, mind: model };
      itemRef.current = { ...current, options };
      void saveBlockOptions(
        dispatch,
        () => store.getState(),
        current,
        inConfigRef.current,
        options,
      );
    };
    const schedule = () => {
      if (disposed) {
        return;
      }
      if (timer !== undefined) {
        window.clearTimeout(timer);
      }
      timer = window.setTimeout(() => {
        timer = undefined;
        persist();
      }, SAVE_DELAY);
    };

    const flush = () => {
      if (timer !== undefined) {
        window.clearTimeout(timer);
        timer = undefined;
        persist();
      }
    };
    // view.fit() 用的是屏幕坐标。卡片不在页面左上角时，算出来的偏移会把节点推出可视区域。
    // 布局本身会把根节点放在画布中心，渲染完后再按节点坐标校正一次。
    const centerRoot = () => {
      if (didCenter || disposed || !mindMap?.renderer.root) {
        return;
      }
      if (el.clientWidth < 40 || el.clientHeight < 40) {
        return;
      }
      didCenter = true;
      mindMap.renderer.setRootNodeCenter();
    };

    const boot = () => {
      if (disposed || mindMap) {
        return;
      }
      if (el.clientWidth < 2 || el.clientHeight < 2) {
        return;
      }
      const initial = readMind(itemRef.current);
      writtenRef.current = mindStructureKey(initial);
      savedRef.current = stableStringify(initial);
      mindMap = new MindMap({
        el,
        data: cloneMind(initial.root),
        layout: initial.layout,
        theme: initial.theme,
        themeConfig: MIND_CARD_THEME_CONFIG,
        initRootNodePosition: ["center", "center"],
        fitPadding: 20,
        mousewheelAction: "zoom",
        defaultInsertSecondLevelNodeText: insertTextRef.current.branch,
        defaultInsertBelowSecondLevelNodeText: insertTextRef.current.sub,
        customCheckEnableShortcut: canUseShortcut,
        errorHandler: (code: string, error: Error) => {
          console.warn("[fat-diagrams] mind map", code, error);
        },
      });
      mindMapRef.current = mindMap;
      mindMap.on("data_change", schedule);
      mindMap.on("view_data_change", schedule);
      mindMap.on("layout_change", schedule);
      mindMap.on("view_theme_change", schedule);
      mindMap.on("node_tree_render_end", centerRoot);
    };

    boot();
    const observer = new ResizeObserver(() => {
      if (!mindMap) {
        boot();
        return;
      }
      if (el.clientWidth < 2 || el.clientHeight < 2) {
        return;
      }
      mindMap.resize();
    });
    observer.observe(el);

    return () => {
      disposed = true;
      observer.disconnect();
      flush();
      mindMap?.destroy();
      mindMap = null;
      mindMapRef.current = null;
    };
    // 实例跟卡片走，外部数据通过 structureKey 同步
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id]);

  useEffect(() => {
    const mindMap = mindMapRef.current;
    if (!mindMap) {
      return;
    }
    mindMap.opt.defaultInsertSecondLevelNodeText = branchText;
    mindMap.opt.defaultInsertBelowSecondLevelNodeText = subText;
  }, [branchText, subText]);

  useEffect(() => {
    setLayout(readMind(itemRef.current).layout);
  }, [structureKey]);

  useEffect(() => {
    const mindMap = mindMapRef.current;
    if (!mindMap || structureKey === writtenRef.current) {
      return;
    }
    const external = readMind(itemRef.current);
    const previous = writtenRef.current
      ? (JSON.parse(writtenRef.current) as Pick<MindModel, "layout" | "theme" | "root">)
      : null;
    writtenRef.current = structureKey;
    const rootChanged =
      !previous || stableStringify(previous.root) !== stableStringify(external.root);
    const layoutChanged = !previous || previous.layout !== external.layout;
    const themeChanged = !previous || previous.theme !== external.theme;
    if (rootChanged) {
      if (layoutChanged) {
        mindMap.setLayout(external.layout, true);
      }
      mindMap.setData(cloneMind(external.root));
    } else if (layoutChanged) {
      mindMap.setLayout(external.layout);
    }
    if (themeChanged) {
      mindMap.setThemeConfig(MIND_CARD_THEME_CONFIG, true);
      mindMap.setTheme(external.theme);
    }
  }, [structureKey]);

  const layoutOptions = MIND_LAYOUTS.map((value) => ({
    value,
    label: intl.formatMessage({ id: `fat-diagrams.mind.layout.${value}` }),
  }));

  const addChild = () => {
    const mindMap = mindMapRef.current;
    if (!mindMap) {
      return;
    }
    const active = mindMap.renderer.activeNodeList;
    const nodes = active.length
      ? active
      : mindMap.renderer.root
        ? [mindMap.renderer.root]
        : [];
    if (!nodes.length) {
      return;
    }
    mindMap.execCommand("INSERT_CHILD_NODE", true, nodes);
  };

  const addSibling = () => {
    const mindMap = mindMapRef.current;
    if (!mindMap) {
      return;
    }
    const nodes = mindMap.renderer.activeNodeList.filter((node) => !node.isRoot);
    if (!nodes.length) {
      return;
    }
    mindMap.execCommand("INSERT_NODE", true, nodes);
  };

  return (
    <div className={styles.editor} onMouseDown={(event) => event.stopPropagation()}>
      <div className={styles.toolbar}>
        <Button size="small" onClick={addChild}>
          {intl.formatMessage({ id: "fat-diagrams.mind.child" })}
        </Button>
        <Button size="small" onClick={addSibling}>
          {intl.formatMessage({ id: "fat-diagrams.mind.sibling" })}
        </Button>
        <Button
          size="small"
          onClick={() => mindMapRef.current?.execCommand("REMOVE_NODE")}
        >
          {intl.formatMessage({ id: "fat-diagrams.toolbar.delete" })}
        </Button>
        <Button
          size="small"
          onClick={() => {
            const mindMap = mindMapRef.current;
            if (!mindMap) {
              return;
            }
            mindMap.resize();
            const root = mindMap.renderer.root;
            if (root) {
              mindMap.renderer.moveNodeToCenter(root, true);
            }
          }}
        >
          {intl.formatMessage({ id: "fat-diagrams.mind.fit" })}
        </Button>
        <Select
          size="small"
          style={{ minWidth: 120 }}
          value={layout}
          options={layoutOptions}
          onSelect={(value) => {
            setLayout(value);
            mindMapRef.current?.setLayout(value);
          }}
        />
        <span className={styles.hint}>
          {intl.formatMessage({ id: "fat-diagrams.toolbar.mindHint" })}
        </span>
      </div>
      <div ref={containerRef} className={styles.canvas} />
    </div>
  );
};

export default MindDiagram;
