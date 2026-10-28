const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
  mode: "development",
  entry: path.resolve(__dirname, "main.tsx"),
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "preview.js",
    clean: true,
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js", ".jsx"],
    alias: {
      components: path.resolve(__dirname, "../src/components/index"),
      hooks: path.resolve(__dirname, "../src/hooks/index"),
      contexts: path.resolve(__dirname, "../src/contexts/index"),
      pluginComps: path.resolve(__dirname, "../src/pluginComps/index"),
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
                auto: (resourcePath) => resourcePath.endsWith(".less"),
                namedExport: false,
                localIdentName: "[local]_[hash:base64:5]",
              },
            },
          },
          "less-loader",
        ],
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, "index.html"),
    }),
  ],
  devtool: "source-map",
};
