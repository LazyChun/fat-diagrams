/*
 * Module Federation build for the FatNotes bespoke plugin `fat-diagrams`.
 *
 * IMPORTANT — Module Federation name alignment:
 * When FatNotes registers a bespoke plugin, the host assigns it a UUID and
 * expects the MF remote name to equal `plugin_<uuid_with_underscores>`
 * (unless `mfName` is overridden in the host-side manifest or plugin.json).
 * If the names don't match you'll get:
 *   "[ Federation Runtime ]: remoteEntryExports is undefined"
 *
 * Resolution priority for the MF name used at build time:
 *   1. `PLUGIN_MF_NAME` env var (highest)
 *   2. `plugin.json` -> `mfName` field.
 *   3. `plugin.json` -> `container` field.
 *
 * After installing this plugin in FatNotes, copy the UUID shown in the host
 * plugin list into `plugin.json` as the `mfName` field, then rebuild.
 *
 * All `shared` entries MUST be singleton and version-aligned with the host
 * (fat-notes) to avoid hook mismatches.
 */
const path = require("path");
const {
  ModuleFederationPlugin,
} = require("@module-federation/enhanced/webpack");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const manifest = require("./plugin.json");

const MF_NAME =
  process.env.PLUGIN_MF_NAME ||
  manifest.mfName ||
  manifest.container ||
  "plugin_f3b8c1d4_6a27_4e95_8c0d_1e7a9b2f4d63";

module.exports = (_, argv) => {
  const isProd = argv && argv.mode === "production";
  // eslint-disable-next-line no-console
  console.log(`[fat-diagrams] building remoteEntry as MF name: "${MF_NAME}"`);
  return {
    entry: "./src/bootstrap.ts",
    output: {
      path: path.resolve(__dirname, "dist"),
      filename: "[name].[contenthash:8].js",
      // 开发态使用稳定 chunk 名，避免 watch 重编译后旧运行时请求已清理的内容哈希文件
      chunkFilename: isProd ? "[name].[contenthash:8].js" : "[name].js",
      publicPath: "auto",
      clean: true,
    },
    resolve: {
      extensions: [".ts", ".tsx", ".js", ".jsx"],
      alias: {
        components: path.resolve(__dirname, "src/components/index"),
        hooks: path.resolve(__dirname, "src/hooks/index"),
        contexts: path.resolve(__dirname, "src/contexts/index"),
        pluginComps: path.resolve(__dirname, "src/pluginComps/index"),
      },
    },
    module: {
      rules: [
        {
          test: /\.(ts|tsx)$/,
          use: {
            loader: "ts-loader",
            options: { transpileOnly: true },
          },
          exclude: /node_modules/,
        },
        {
          test: /\.(css|less)$/,
          use: [
            "style-loader",
            {
              loader: "css-loader",
              options: {
                modules: {
                  // 让普通 .less 也支持 `import styles from "./xxx.less"`
                  auto: (resourcePath) => resourcePath.endsWith(".less"),
                  namedExport: false,
                  localIdentName: "[local]_[hash:base64:5]",
                },
              },
            },
            "less-loader",
          ],
        },
        {
          test: /\.(png|jpe?g|gif|svg)$/i,
          type: "asset/resource",
        },
      ],
    },
    plugins: [
      new ModuleFederationPlugin({
        name: MF_NAME,
        filename: "remoteEntry.js",
        // 宿主按 remoteEntry 加载，不消费联邦类型包
        dts: false,
        // Force the runtime container to be assigned on the global (window)
        // scope so the host's @module-federation/runtime can resolve exports.
        library: { type: "global", name: MF_NAME },
        exposes: {
          "./plugin": "./src/index.tsx",
        },
        shared: {
          react: { singleton: true, requiredVersion: "18.2.0", eager: false },
          "react-dom": {
            singleton: true,
            requiredVersion: "18.2.0",
            eager: false,
          },
          "react/jsx-runtime": {
            singleton: true,
            requiredVersion: "18.2.0",
            eager: false,
          },
          "react-redux": {
            singleton: true,
            requiredVersion: "9.1.2",
            eager: false,
          },
          "react-intl": {
            singleton: true,
            requiredVersion: "6.8.4",
            eager: false,
          },
          antd: { singleton: true, requiredVersion: "6.3.1", eager: false },
        },
      }),
      new HtmlWebpackPlugin({ template: "./public/index.html" }),
    ],
    devtool: isProd ? false : "source-map",
    optimization: { minimize: isProd },
  };
};
