import React from "react";
import { createRoot } from "react-dom/client";
import { IntlProvider } from "react-intl";
import { Provider } from "react-redux";
import RelationDiagram from "../src/pluginComps/RelationDiagram/RelationDiagram";
import messages from "../src/locales/zh_CN";

const store = {
  getState: () => ({ board: { dirtyBoardIds: [] as string[] } }),
  dispatch: (action: unknown) => action,
  subscribe: () => () => undefined,
};

const item: Block.Item = {
  id: "preview-block",
  type: "fat-diagrams.relation",
  title: "关系图",
  boardId: "preview-board",
  options: {
    relation: {
      layout: "force",
      nodes: [
        { id: "n1", label: "A", x: 220, y: 260 },
        { id: "n2", label: "B", x: 360, y: 120 },
        { id: "n3", label: "C", x: 500, y: 260 },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n1", target: "n3" },
      ],
    },
  },
};

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(
    <Provider store={store as never}>
      <IntlProvider locale="zh" messages={messages}>
        <div style={{ width: 880, height: 520, border: "1px solid #f0f0f0" }}>
          <RelationDiagram item={item} />
        </div>
      </IntlProvider>
    </Provider>,
  );
}
