/**
 * 流程图 — 插件自带的 draw.io 编辑器（dist/drawio）。
 * 图以 XML 写回 options.flow.xml。
 * 协议见 https://www.drawio.com/docs/reference/embed-mode/
 */
import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { Button, Spin } from "antd";
import { useIntl } from "react-intl";
import { useDispatch, useStore } from "react-redux";
import type { BlockActionShowParams, BlockTimeContext } from "fat-notes-sdk";
import { SdkContext } from "contexts";
import { drawioIndexUrl } from "../../diagram/drawioUrl";
import { readFlowXml } from "../../diagram/flowXml";
import { saveBlockOptions } from "../../diagram/saveBlock";
import styles from "./FlowDiagram.less";

interface FlowDiagramProps {
  config?: unknown;
  item: Block.Item;
  inConfig?: boolean;
  time?: BlockTimeContext;
  chartId?: string;
  actionsVisible?: boolean;
  onShowActions?: (params: BlockActionShowParams) => void;
}

const SAVE_DELAY = 500;

interface DrawioMessage {
  event?: string;
  xml?: string;
}

const parseMessage = (data: unknown): DrawioMessage | null => {
  if (typeof data === "string") {
    if (!data) {
      return null;
    }
    try {
      return JSON.parse(data) as DrawioMessage;
    } catch {
      return null;
    }
  }
  if (data && typeof data === "object") {
    return data as DrawioMessage;
  }
  return null;
};

const drawioDark = (theme: string): string => {
  if (theme === "dark") {
    return "1";
  }
  if (theme === "light") {
    return "0";
  }
  return "auto";
};

const FlowDiagram: React.FC<FlowDiagramProps> = (props) => {
  const { item, inConfig } = props;
  const intl = useIntl();
  const sdk = useContext(SdkContext).sdk;
  const dispatch = useDispatch();
  const store = useStore();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const itemRef = useRef(item);
  const inConfigRef = useRef(inConfig);
  const readyRef = useRef(false);
  const writtenRef = useRef("");
  const pendingRef = useRef("");
  const timerRef = useRef<number | undefined>(undefined);
  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");
  const [attempt, setAttempt] = useState(0);
  const [theme, setTheme] = useState(() => sdk?.ui.theme.get() || "light");
  itemRef.current = item;
  inConfigRef.current = inConfig;

  useEffect(() => {
    if (!sdk) {
      return;
    }
    setTheme(sdk.ui.theme.get());
    const subscription = sdk.ui.theme.onChange(setTheme);
    return () => subscription.dispose();
  }, [sdk]);

  const lang = intl.locale.toLowerCase().startsWith("zh") ? "zh" : "en";
  const editorUrl = useMemo(() => {
    const indexUrl = drawioIndexUrl();
    if (!indexUrl) {
      return "";
    }
    const url = new URL(indexUrl);
    const params: Record<string, string> = {
      embed: "1",
      proto: "json",
      spin: "1",
      ui: "simple",
      splash: "0",
      stealth: "1",
      offline: "1",
      libs: "general;flowchart",
      noSaveBtn: "1",
      noExitBtn: "1",
      saveAndExit: "0",
      lang,
      dark: drawioDark(theme),
    };
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
    return url.href;
  }, [lang, theme]);
  const editorOrigin = useMemo(() => {
    if (!editorUrl) {
      return "";
    }
    return new URL(editorUrl).origin;
  }, [editorUrl]);

  const persistRef = useRef<(xml: string) => void>(() => undefined);
  persistRef.current = (xml: string) => {
    if (!xml || xml === writtenRef.current) {
      return;
    }
    writtenRef.current = xml;
    const current = itemRef.current;
    const options = { ...current.options, flow: { xml } };
    itemRef.current = { ...current, options };
    void saveBlockOptions(
      dispatch,
      () => store.getState(),
      current,
      inConfigRef.current,
      options,
    );
  };

  const flushRef = useRef(() => {
    if (timerRef.current !== undefined) {
      window.clearTimeout(timerRef.current);
      timerRef.current = undefined;
    }
    const xml = pendingRef.current;
    pendingRef.current = "";
    if (xml) {
      persistRef.current(xml);
    }
  });

  const reloadRef = useRef<() => void>(() => undefined);
  reloadRef.current = () => setAttempt((value) => value + 1);

  const scheduleRef = useRef<(xml: string) => void>(() => undefined);
  scheduleRef.current = (xml: string) => {
    if (!xml || xml === writtenRef.current) {
      return;
    }
    pendingRef.current = xml;
    if (timerRef.current !== undefined) {
      window.clearTimeout(timerRef.current);
    }
    timerRef.current = window.setTimeout(() => {
      timerRef.current = undefined;
      const next = pendingRef.current;
      pendingRef.current = "";
      persistRef.current(next);
    }, SAVE_DELAY);
  };

  useEffect(() => {
    readyRef.current = false;
    if (!editorUrl || !editorOrigin) {
      setPhase("error");
      return;
    }
    setPhase("loading");
    const timeout = window.setTimeout(() => {
      if (!readyRef.current) {
        setPhase("error");
      }
    }, 20000);

    const post = (message: Record<string, unknown>) => {
      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify(message),
        editorOrigin,
      );
    };
    const loadDiagram = (xml: string) => {
      writtenRef.current = xml;
      post({
        action: "load",
        xml,
        autosave: 1,
        noSaveBtn: 1,
        noExitBtn: 1,
        saveAndExit: 0,
        fit: 1,
        maxFitScale: 1,
      });
    };

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== editorOrigin) {
        return;
      }
      if (event.source !== iframeRef.current?.contentWindow) {
        return;
      }
      const message = parseMessage(event.data);
      if (!message?.event) {
        return;
      }
      if (message.event === "init") {
        readyRef.current = true;
        setPhase("ready");
        loadDiagram(readFlowXml(itemRef.current));
        return;
      }
      if (message.event === "load") {
        post({ action: "status", message: "", modified: false });
        return;
      }
      if (message.event === "autosave" || message.event === "save") {
        if (typeof message.xml === "string") {
          scheduleRef.current(message.xml);
        }
        return;
      }
      if (message.event === "exit") {
        flushRef.current();
        reloadRef.current();
      }
    };

    window.addEventListener("message", onMessage);
    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener("message", onMessage);
      flushRef.current();
      readyRef.current = false;
    };
  }, [editorOrigin, editorUrl, attempt]);

  const externalXml = readFlowXml(item);
  useEffect(() => {
    if (!readyRef.current) {
      return;
    }
    if (
      externalXml === writtenRef.current ||
      externalXml === pendingRef.current
    ) {
      return;
    }
    const frame = iframeRef.current?.contentWindow;
    if (!frame || !editorOrigin) {
      return;
    }
    writtenRef.current = externalXml;
    pendingRef.current = "";
    frame.postMessage(
      JSON.stringify({
        action: "load",
        xml: externalXml,
        autosave: 1,
        noSaveBtn: 1,
        noExitBtn: 1,
        saveAndExit: 0,
      }),
      editorOrigin,
    );
  }, [editorOrigin, externalXml]);

  return (
    <div
      className={styles.editor}
      data-theme={theme === "dark" ? "dark" : "light"}
      onMouseDown={(event) => event.stopPropagation()}
    >
      {editorUrl ? (
        <iframe
          key={`${editorUrl}:${attempt}`}
          ref={iframeRef}
          className={styles.frame}
          src={editorUrl}
          title={intl.formatMessage({ id: "fat-diagrams.flow" })}
          referrerPolicy="no-referrer"
          allow="clipboard-read; clipboard-write"
        />
      ) : null}
      {phase !== "ready" ? (
        <div className={styles.overlay}>
          {phase === "error" ? (
            <div className={styles.message}>
              <span>
                {intl.formatMessage({ id: "fat-diagrams.flow.error" })}
              </span>
              <Button
                size="small"
                onClick={() => setAttempt((value) => value + 1)}
              >
                {intl.formatMessage({ id: "fat-diagrams.flow.retry" })}
              </Button>
            </div>
          ) : (
            <Spin
              description={intl.formatMessage({
                id: "fat-diagrams.flow.loading",
              })}
            />
          )}
        </div>
      ) : null}
    </div>
  );
};

export default FlowDiagram;
