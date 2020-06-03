const path = require("path");

module.exports = {
  mode: "production",
  entry: "./index.js",
  output: {
    filename: "aframe-terrain-model-component.min.js",
    path: path.resolve(__dirname, "dist"),
  },
};
