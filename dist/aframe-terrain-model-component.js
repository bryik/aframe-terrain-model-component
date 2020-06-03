/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, { enumerable: true, get: getter });
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// create a fake namespace object
/******/ 	// mode & 1: value is a module id, require it
/******/ 	// mode & 2: merge all properties of value into the ns
/******/ 	// mode & 4: return value when already ns object
/******/ 	// mode & 8|1: behave like require
/******/ 	__webpack_require__.t = function(value, mode) {
/******/ 		if(mode & 1) value = __webpack_require__(value);
/******/ 		if(mode & 8) return value;
/******/ 		if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
/******/ 		var ns = Object.create(null);
/******/ 		__webpack_require__.r(ns);
/******/ 		Object.defineProperty(ns, 'default', { enumerable: true, value: value });
/******/ 		if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
/******/ 		return ns;
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = "./index.js");
/******/ })
/************************************************************************/
/******/ ({

/***/ "./index.js":
/*!******************!*\
  !*** ./index.js ***!
  \******************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

eval("/* global AFRAME, THREE */\n\nif (typeof AFRAME === \"undefined\") {\n  throw new Error(\n    \"Component attempted to register before AFRAME was available.\"\n  );\n}\n\n__webpack_require__(/*! ./lib/terrainloader.js */ \"./lib/terrainloader.js\");\n\n/**\n * Terrain model component.\n */\nAFRAME.registerComponent(\"terrain-model\", {\n  schema: {\n    planeHeight: {\n      type: \"number\",\n      default: 346,\n    },\n    planeWidth: {\n      type: \"number\",\n      default: 346,\n    },\n    segmentsHeight: {\n      type: \"number\",\n      default: 199,\n    },\n    segmentsWidth: {\n      type: \"number\",\n      default: 199,\n    },\n    zPosition: {\n      type: \"number\",\n      default: 1.5,\n    },\n    dem: {\n      type: \"asset\",\n    },\n    map: {\n      type: \"asset\",\n    },\n    alphaMap: {\n      type: \"asset\",\n    },\n    wireframe: {\n      type: \"boolean\",\n      default: false,\n    },\n  },\n\n  init: function () {\n    const el = this.el;\n    const data = this.data;\n\n    this.heightData = null;\n    this.terrainLoader = new THREE.TerrainLoader();\n    this.textureLoader = new THREE.TextureLoader();\n    this._replaceTexture = this._replaceTexture.bind(this);\n    this._updatePositionBuffer = this._updatePositionBuffer.bind(this);\n    this._toggleWireframe = this._toggleWireframe.bind(this);\n\n    // Setup geometry.\n    const { planeWidth, planeHeight, segmentsHeight, segmentsWidth } = data;\n    this.geometry = new THREE.PlaneBufferGeometry(\n      planeWidth,\n      planeHeight,\n      segmentsWidth,\n      segmentsHeight\n    );\n\n    // Setup material.\n    this.material = new THREE.MeshLambertMaterial();\n\n    // Create the terrain mesh; rotate it to be parallel with the ground.\n    this.mesh = new THREE.Mesh(this.geometry, this.material);\n    this.mesh.rotation.x = -90 * (Math.PI / 180);\n    el.setObject3D(\"terrain\", this.mesh);\n  },\n\n  update: function (oldData) {\n    const data = this.data;\n    const dem = data.dem;\n    const map = data.map;\n    const alphaMap = data.alphaMap;\n    const zPosition = data.zPosition;\n    const wireframe = data.wireframe;\n\n    /**\n     * Callback for THREE.TerrainLoader().\n     * @param {number[]} heightData\n     */\n    function onTerrainLoad(heightData) {\n      this.heightData = heightData;\n      this._updatePositionBuffer();\n      this.el.emit(\"demLoaded\", { dem });\n    }\n\n    /**\n     * This is a curried function that returns a callback to pass to THREE.TextureLoader.load()\n     * This callback updates the terrain material as necessary. 'map' and 'alphaMap'\n     * texture loads are handled almost identically.\n     * @param {string} materialProp either 'map' (for this.material.map) or 'alphaMap' (for this.material.alphaMap)\n     * @returns {function}\n     */\n    const curriedOnTextureLoad = (materialProp) => {\n      return (loadedTexture) => {\n        if (materialProp === \"map\" && this.data.map !== map) {\n          // The texture took too long to load. The entity now has a different\n          // map, so the map that was loaded cannot be used.\n          loadedTexture.dispose();\n          return;\n        }\n        if (materialProp === \"alphaMap\" && this.data.alphaMap !== alphaMap) {\n          // Same idea as above, except the loaded texture is an alphaMap.\n          loadedTexture.dispose();\n          return;\n        }\n        loadedTexture.anisotropy = 16;\n        this._replaceTexture(materialProp, loadedTexture);\n        this.el.emit(\"textureLoaded\", { type: materialProp });\n      };\n    };\n\n    if (dem !== oldData.dem) {\n      // DEM has updated, so load the new one.\n      this.terrainLoader.load(dem, onTerrainLoad.bind(this));\n    }\n\n    if (map !== oldData.map) {\n      // When map is not set, it defaults to \"\"\n      if (!map) {\n        this._replaceTexture(\"map\", null);\n      } else {\n        // Texture has updated, so load the new one.\n        this.textureLoader.load(map, curriedOnTextureLoad(\"map\"));\n      }\n    }\n\n    if (alphaMap !== oldData.alphaMap) {\n      // When alphaMap is not set, it defaults to \"\"\n      if (!alphaMap) {\n        this._replaceTexture(\"alphaMap\", null);\n      } else {\n        // Alpha map has updated, so load the new one.\n        // Also turn on material transparency.\n        this.material.transparent = true;\n        this.textureLoader.load(alphaMap, curriedOnTextureLoad(\"alphaMap\"));\n      }\n    }\n\n    if (zPosition !== oldData.zPosition) {\n      // zPosition has changed, so re-scale the mesh.\n      this.mesh.scale.set(1, 1, zPosition);\n    }\n\n    if (wireframe !== oldData.wireframe) {\n      // wire mode has either been activated or disactivated.\n      this._toggleWireframe();\n    }\n  },\n\n  /**\n   * A helper for swapping out a material texture.\n   * Ensures the old texture is disposed.\n   * @param {string} materialProp e.g. 'map' or 'alphaMap'\n   * @param {(THREE.Texture|null)} newTexture\n   */\n  _replaceTexture: function (materialProp, newTexture) {\n    const oldTexture = this.material[materialProp];\n    this.material[materialProp] = newTexture;\n    this.material.needsUpdate = true;\n    if (oldTexture) {\n      oldTexture.dispose();\n    }\n  },\n\n  /**\n   * Sets the z-component of every vector in the position attribute buffer\n   * to the (adjusted) height value from the DEM. Also adjusts the wireframe.\n   * Note:\n   *  positionBuffer.count === the number of vertices in the plane\n   */\n  _updatePositionBuffer: function () {\n    if (!this.heightData) {\n      return;\n    }\n\n    let positionBuffer = this.geometry.getAttribute(\"position\");\n    for (let i = 0; i < positionBuffer.count; i++) {\n      let heightValue = this.heightData[i] / 65535;\n      positionBuffer.setZ(i, heightValue);\n    }\n    positionBuffer.needsUpdate = true;\n\n    // Update wireframe\n    let oldWireMesh = this.mesh.getObjectByName(\"terrain-wireframe\");\n    if (oldWireMesh) {\n      oldWireMesh.geometry.dispose();\n      const wireGeometry = new THREE.WireframeGeometry(this.geometry);\n      oldWireMesh.geometry = wireGeometry;\n    }\n    this.el.emit(\"positionBufferUpdated\");\n  },\n\n  /**\n   * Creates or destroys a terrain wireframe mesh.\n   * A wireframe can be useful for debugging or for visualizing a terrain DEM\n   * without a texture.\n   */\n  _toggleWireframe: function () {\n    // TODO: Consider creating wireframe on init and hiding/revealing rather\n    // than creating the wireframe mesh on demand. Cons: wastes resources for\n    // people who don't care about wireframe. Pros: less lag when wireframe is\n    // turned on.\n\n    let oldWireMesh = this.mesh.getObjectByName(\"terrain-wireframe\");\n    if (!oldWireMesh) {\n      // This is a somewhat inelegant way to prevent adding a wireframe when the\n      // component initializes.\n      if (!this.data.wireframe) {\n        return;\n      }\n      // Add wireframe.\n      const wireGeometry = new THREE.WireframeGeometry(this.geometry);\n      const wireMaterial = new THREE.LineBasicMaterial({\n        color: 0x808080,\n        linewidth: 1,\n      });\n      let wireMesh = new THREE.LineSegments(wireGeometry, wireMaterial);\n      wireMesh.name = \"terrain-wireframe\";\n      wireMesh.material.opacity = 0.3;\n      wireMesh.material.transparent = true;\n      this.mesh.add(wireMesh);\n      return;\n    }\n\n    // Remove wireframe\n    oldWireMesh.geometry.dispose();\n    oldWireMesh.material.dispose();\n    this.mesh.remove(oldWireMesh);\n  },\n\n  remove: function () {\n    this.geometry.dispose();\n    this.material.map.dispose();\n    this.material.alphaMap.dispose();\n    this.material.dispose();\n    if (this.data.wireframe) {\n      this._toggleWireframe();\n    }\n    this.el.removeObject3D(\"terrain\");\n  },\n});\n\n\n//# sourceURL=webpack:///./index.js?");

/***/ }),

/***/ "./lib/terrainloader.js":
/*!******************************!*\
  !*** ./lib/terrainloader.js ***!
  \******************************/
/*! no static exports found */
/***/ (function(module, exports) {

eval("/**\n * For loading binary data into a 3D terrain model\n * @author Bjorn Sandvik / http://thematicmapping.org/\n */\n\nTHREE.TerrainLoader = function (manager) {\n  this.manager = manager !== undefined ? manager : THREE.DefaultLoadingManager;\n};\n\nTHREE.TerrainLoader.prototype = {\n  constructor: THREE.TerrainLoader,\n  load: function (url, onLoad, onProgress, onError) {\n    var scope = this;\n    var request = new XMLHttpRequest();\n\n    if (onLoad !== undefined) {\n      request.addEventListener(\n        \"load\",\n        function (event) {\n          onLoad(new Uint16Array(event.target.response));\n          scope.manager.itemEnd(url);\n        },\n        false\n      );\n    }\n    if (onProgress !== undefined) {\n      request.addEventListener(\n        \"progress\",\n        function (event) {\n          onProgress(event);\n        },\n        false\n      );\n    }\n    if (onError !== undefined) {\n      request.addEventListener(\n        \"error\",\n        function (event) {\n          onError(event);\n        },\n        false\n      );\n    }\n    if (this.crossOrigin !== undefined) request.crossOrigin = this.crossOrigin;\n    request.open(\"GET\", url, true);\n    request.responseType = \"arraybuffer\";\n    request.send(null);\n    scope.manager.itemStart(url);\n  },\n  setCrossOrigin: function (value) {\n    this.crossOrigin = value;\n  },\n};\n\n\n//# sourceURL=webpack:///./lib/terrainloader.js?");

/***/ })

/******/ });