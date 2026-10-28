# fat-diagrams

fat-notes 关系与流程图插件。关系图用 [AntV G6](https://g6.antv.antgroup.com/)，流程图用 [draw.io](https://github.com/jgraph/drawio) 的嵌入编辑器。两张卡片都在添加组件的「结构绘制」分类里。

流程图使用随插件发布的 draw.io 编辑器（`vendor/drawio`，构建后在 `dist/drawio`），不访问 draw.io 的网站。图的 XML 存在卡片 `options.flow.xml` 里。以前用节点和连线存的旧图，第一次打开时会转成 draw.io 的图。

编辑器版本写在 `vendor/drawio/VERSION`。要换版本，下载对应的 `draw.war` 后执行：

```
python scripts/extract_drawio.py path\to\draw.war
```

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
