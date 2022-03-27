/**
 * outputDir: 指定打包目录
 * publicPath: 判断环境 切换访问域名
 */
const IS_PROD = ["production", "prod"].includes(process.env.NODE_ENV);
module.exports = {
  publicPath: "./",
  indexPath: "index.html",
  outputDir: process.env.outputDir || "dist",
  assetsDir: "static",
  lintOnSave: false,
  runtimeCompiler: true,
  productionSourceMap: !IS_PROD,
  parallel: require("os").cpus().length > 1,
  pwa: {},
  configureWebpack: {
    plugins: [],
  },
};
