# fat-diagrams

fat-notes 关系与流程图插件。注册两种画布卡片：关系图、流程图。

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
