/**
 * 流程图编辑器放在插件 dist/drawio，地址跟着 remoteEntry.js 走。
 */
declare let __webpack_public_path__: string;

const PLUGIN_ID = "f3b8c1d4-6a27-4e95-8c0d-1e7a9b2f4d63";

export const drawioPublicBase = (): string => {
  const scripts = document.getElementsByTagName("script");
  for (let index = scripts.length - 1; index >= 0; index -= 1) {
    const src = scripts[index].src || "";
    if (src.includes(PLUGIN_ID) && src.includes("remoteEntry.js")) {
      return src.slice(0, src.lastIndexOf("/") + 1);
    }
  }
  try {
    if (
      typeof __webpack_public_path__ === "string" &&
      __webpack_public_path__ &&
      __webpack_public_path__ !== "auto"
    ) {
      return __webpack_public_path__.endsWith("/")
        ? __webpack_public_path__
        : `${__webpack_public_path__}/`;
    }
  } catch {
    return "";
  }
  return "";
};

export const drawioIndexUrl = (): string => {
  const base = drawioPublicBase();
  if (!base) {
    return "";
  }
  return new URL("drawio/index.html", base).href;
};
