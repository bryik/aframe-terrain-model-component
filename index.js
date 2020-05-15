/* global AFRAME, THREE */

if (typeof AFRAME === "undefined") {
  throw new Error(
    "Component attempted to register before AFRAME was available."
  );
}

require("./lib/terrainloader.js");
const d3 = require("d3");
// Because I don't know how to get Webpack to work with glslify.
const vertexShader = require("./shaders/vertex.js");
const fragmentShader = require("./shaders/fragment.js");

/**
 * Terrain model component geared towards textures.
 */
AFRAME.registerComponent("terrain-model", {
  schema: {
    DEM: {
      type: "asset",
    },
    planeHeight: {
      type: "number",
    },
    planeWidth: {
      type: "number",
    },
    segmentsHeight: {
      type: "number",
      default: 199,
    },
    segmentsWidth: {
      type: "number",
      default: 199,
    },
    zPosition: {
      type: "number",
      default: 1.5,
    },
    texture: {
      type: "asset",
    },
    alphaMap: {
      type: "asset",
    },
    transparent: {
      type: "boolean",
      default: false,
    },
    wireframe: {
      type: "boolean",
      default: false,
    },
  },

  /**
   * Set if component needs multiple instancing.
   */
  multiple: false,

  /**
   * Called when component is attached and when component data changes.
   * Generally modifies the entity based on the data.
   *
   * Textures are not handled gracefully. There is some confusion over how they get loaded (async?) and how to interface with
   * asset system
   */
  update: function (oldData) {
    // "self" is a reference to the component
    var self = this;
    var el = self.el;
    var data = self.data;

    var terrainLoader = new THREE.TerrainLoader();

    /*
     * terrainLoader loads the DEM file and triggers a callback.
     * "heightData" is a Uint16Array containing elevation values scaled to 0-65535 (i.e full 16-bit range)
     */
    terrainLoader.load(data.DEM, function (heightData) {
      var geometry = new THREE.PlaneBufferGeometry(
        data.planeWidth,
        data.planeHeight,
        data.segmentsWidth,
        data.segmentsHeight
      );

      // The position attribute buffer
      var pAB = geometry.getAttribute("position");

      /**
       * Set the z-component of every vector in the position attribute buffer to the (adjusted) height value from the DEM.
       * pAB.count = the number of vertices in the plane
       */
      for (let i = 0; i < pAB.count; i++) {
        let heightValue = (heightData[i] / 65535) * data.zPosition;
        pAB.setZ(i, heightValue);
      }

      /**
       * So begins a rather complicated dance to deal with loading multiple textures and handling the case where alphaMap is
       * not used.
       * 1) filter out textures without URLs
       * 2) Promisify the remaining textures
       * 3) When all textures have loaded, finish building the terrain.
       */
      var textures = [data.texture, data.alphaMap];
      textures = textures.filter(function removeUnused(val) {
        return val !== "";
      });

      textures = textures.map(function convertToPromises(val) {
        return self.loadTexture(val);
      });

      var promiseTextures = Promise.all(textures);
      promiseTextures.then(function finishSetup(loadedTextures) {
        var material = new THREE.MeshLambertMaterial();

        var texture = loadedTextures[0];
        texture.anisotropy = 16;
        material.map = texture;

        if (data.alphaMap !== "") {
          material.alphaMap = loadedTextures[1];
          material.transparent = true;
        }

        // Create the surface mesh and register it under entity's object3DMap
        var surface = new THREE.Mesh(geometry, material);
        surface.rotation.x = (-90 * Math.PI) / 180;
        el.setObject3D("terrain", surface);

        // Wireframe
        if (data.wireframe) {
          let wireGeometry = new THREE.WireframeGeometry(geometry);
          let wireMaterial = new THREE.LineBasicMaterial({
            color: 0x808080,
            linewidth: 1,
          });
          let wireMesh = new THREE.LineSegments(wireGeometry, wireMaterial);
          wireMesh.material.opacity = 0.3;
          wireMesh.material.transparent = true;
          surface.add(wireMesh);
        }
      });
    });
  },

  /**
   * Loads a texture with a promise.
   * Based on: https://github.com/aframevr/aframe/blob/master/src/components/text.js#L371
   */
  loadTexture: function (src) {
    return new Promise(function (resolve, reject) {
      new THREE.TextureLoader().load(src, function (texture) {
        resolve(texture);
      });
    });
  },

  /**
   * Called when a component is removed (e.g., via removeAttribute).
   * Generally undoes all modifications to the entity.
   */
  remove: function () {
    this.el.removeObject3D("terrain");
  },
});

/**
 * Terrain model component with vertex colors. No textures.
 */
AFRAME.registerComponent("color-terrain-model", {
  schema: {
    DEM: {
      type: "asset",
      default:
        "https://cdn.rawgit.com/bryik/aframe-terrain-model-component/401c00af/docs/Noctis/data/noctis-3500-clip-envi.bin",
    },
    planeHeight: {
      type: "number",
      default: 346,
    },
    planeWidth: {
      type: "number",
      default: 346,
    },
    segmentsHeight: {
      type: "number",
      default: 199,
    },
    segmentsWidth: {
      type: "number",
      default: 199,
    },
    zPosition: {
      type: "number",
      default: 1.5,
    },
    colorScheme: {
      type: "string",
      default: "viridis",
      oneOf: [
        "viridis",
        "inferno",
        "magma",
        "plasma",
        "warm",
        "cool",
        "rainbow",
        "cubehelix",
      ],
    },
    wireframe: {
      type: "boolean",
      default: false,
    },
  },

  /**
   * Set if component needs multiple instancing.
   */
  multiple: false,

  /**
   * Called when component is attached and when component data changes.
   * Generally modifies the entity based on the data.
   *
   * Detects what properties have changed, and then delegates update task accordingly.
   */
  update: function (oldData) {
    var data = this.data;
    var changedData = AFRAME.utils.diff(oldData, data);

    if (this.loaded) {
      // Update
      if (this.hardUpdateNeeded(changedData)) {
        this.remove();
        this.buildTerrain();
      } else {
        this.softUpdate(changedData);
      }
    } else {
      // Create terrain for the first time.
      this.buildTerrain();
    }
  },

  /**
   * Called when a component is removed (e.g., via removeAttribute).
   * Generally undoes all modifications to the entity.
   *
   * I've tested this and it seems geometry and material must be disposed manually,
   * "this.el.removeObject3D('terrain');" is not enough.
   */
  remove: function () {
    this.geometry.dispose();
    this.material.dispose();
    this.el.removeObject3D("terrain");
  },

  /* HELPERS */

  /**
   * Returns "true" if hard update is needed. Otherwise returns "false".
   *
   * zPosition can be updated instantly because it only requires a change in uniform.
   * colorScheme can be updated quickly, because it only requires recomputing the color buffer.
   *
   * All other properties require a hard update (mesh rebuild).
   */
  hardUpdateNeeded: function (changedData) {
    var hardProps = [
      "DEM",
      "planeHeight",
      "planeWidth",
      "segmentsHeight",
      "segmentsWidth",
    ];

    return hardProps.some(function (prop) {
      return prop in changedData;
    });
  },

  /**
   * Updates zPosition, colorScheme, and wireframe properties (if they have changed).
   */
  softUpdate: function (changedData) {
    if ("zPosition" in changedData) {
      this.material.uniforms.zPos.value = this.data.zPosition;
    }

    if ("wireframe" in changedData) {
      this.material.wireframe = changedData.wireframe;
    }

    if ("colorScheme" in changedData) {
      this.updateColors();
    }
  },

  /**
   * Changes color scheme.
   *  1. Update this.colorScale
   *  2. Recompute color buffer attribute
   */
  updateColors: function () {
    var data = this.data;
    var heightData = this.heightData;

    var colorScale = this.getColorScale(data.colorScheme);

    for (let i = 0; i < this.cAB.count; i++) {
      let colorValue = d3.color(colorScale(heightData[i]));
      this.cAB.setXYZ(i, colorValue.r, colorValue.g, colorValue.b);
    }

    this.cAB.needsUpdate = true;
  },

  /**
   * Loads terrain with a promise.
   */
  loadTerrain: function (src) {
    return new Promise(function (resolve, reject) {
      new THREE.TerrainLoader().load(src, function (heightData) {
        resolve(heightData);
      });
    });
  },

  /**
   * Loads the terrain data, then constructs the terrain mesh.
   */
  buildTerrain: function () {
    var self = this;
    var data = this.data;

    var terrain = this.loadTerrain(data.DEM);

    terrain.then(function finishSetup(heightData) {
      // Setup geometry and attribute buffers (position and color)
      var geometry = new THREE.PlaneBufferGeometry(
        data.planeWidth,
        data.planeHeight,
        data.segmentsWidth,
        data.segmentsHeight
      );
      var pAB = geometry.getAttribute("position");

      // Formula for size of new buffer attribute array is: numVertices * itemSize
      var colorArray = new Uint8Array(pAB.count * 3);
      var cAB = new THREE.BufferAttribute(colorArray, 3, true);
      var colorScale = self.getColorScale(data.colorScheme);

      /**
       * Set the z-component of every vector in the position attribute buffer to the (adjusted) height value from the DEM.
       * pAB.count = the number of vertices in the plane
       * Also sets vertex color.
       */
      for (let i = 0; i < pAB.count; i++) {
        let heightValue = heightData[i] / 65535;
        pAB.setZ(i, heightValue);

        let colorValue = d3.color(colorScale(heightData[i]));
        cAB.setXYZ(i, colorValue.r, colorValue.g, colorValue.b);
      }

      geometry.addAttribute("color", cAB);

      // Setup material (zPosition uniform, wireframe option).
      // Note: originally I used RawShaderMaterial. This worked everywhere except Safari.
      // Switching to ShaderMaterial, adding "vertexColors", and modifying the shaders seems to make it work...
      var material = new THREE.ShaderMaterial({
        uniforms: {
          zPos: { value: data.zPosition },
        },
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
        wireframe: data.wireframe,
        vertexColors: THREE.VertexColors,
      });

      // Create the surface mesh and register it under entity's object3DMap
      var surface = new THREE.Mesh(geometry, material);
      surface.rotation.x = (-90 * Math.PI) / 180;
      self.el.setObject3D("terrain", surface);

      // Save various properties for...
      self.geometry = geometry; // terrain removal (dispose geometry)
      self.material = material; // zPosition and wireframe updates
      self.heightData = heightData; // colorScheme updates
      self.cAB = cAB;
      self.loaded = true;
    });
  },

  /**
   * Returns a sequential scale with chosen interpolater.
   * Defaults to Viridis if unknown colorScheme is asked for (also logs error).
   */
  getColorScale: function (colorScheme) {
    switch (colorScheme) {
      case "viridis":
        return d3.scaleSequential(d3.interpolateViridis).domain([0, 65535]);
      case "inferno":
        return d3.scaleSequential(d3.interpolateInferno).domain([0, 65535]);
      case "magma":
        return d3.scaleSequential(d3.interpolateMagma).domain([0, 65535]);
      case "plasma":
        return d3.scaleSequential(d3.interpolatePlasma).domain([0, 65535]);
      case "warm":
        return d3.scaleSequential(d3.interpolateWarm).domain([0, 65535]);
      case "cool":
        return d3.scaleSequential(d3.interpolateCool).domain([0, 65535]);
      case "rainbow":
        return d3.scaleSequential(d3.interpolateRainbow).domain([0, 65535]);
      case "cubehelix":
        return d3
          .scaleSequential(d3.interpolateCubehelixDefault)
          .domain([0, 65535]);
      default:
        console.log(
          "terrain-model error: " +
            colorScheme +
            "is not a color scheme. Default color loaded instead."
        );
        return d3.scaleSequential(d3.interpolateViridis).domain([0, 65535]);
    }
  },
});
