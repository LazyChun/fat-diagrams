# fat-diagrams

fat-notes 关系与流程图插件。关系图用 [AntV G6](https://g6.antv.antgroup.com/)，流程图用 [AntV X6](https://x6.antv.vision/)。两张卡片都在添加组件的「结构绘制」分类里，可以手动改节点、连线和文字。

## 开发

```
npm install
npm run dev
```

生产构建：

```
npm run build
```

产物在 `dist/`（含 `remoteEntry.js`）。在 FatNotes 的自定义插件里把开发目录指到这个 `dist/`。`plugin.json` 的 `id` 必须与 `funcs.json` 一致，`mfName` 为 `plugin_<uuid 下划线>`。
