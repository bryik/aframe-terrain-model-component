/* global AFRAME, THREE */

if (typeof AFRAME === "undefined") {
  throw new Error(
    "Component attempted to register before AFRAME was available."
  );
}

require("./lib/terrainloader.js");
// const d3 = require("d3");
// // Because I don't know how to get Webpack to work with glslify.
// const vertexShader = require("./shaders/vertex.js");
// const fragmentShader = require("./shaders/fragment.js");

// TODO:
// - Add color option

/**
 * Terrain model component.
 */
AFRAME.registerComponent("terrain-model", {
  schema: {
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
    dem: {
      type: "asset",
    },
    map: {
      type: "asset",
    },
    alphaMap: {
      type: "asset",
    },
    wireframe: {
      type: "boolean",
      default: false,
    },
  },

  init: function () {
    const el = this.el;
    const data = this.data;

    this.heightData = null;
    this.terrainLoader = new THREE.TerrainLoader();
    this.textureLoader = new THREE.TextureLoader();
    this._updatePositionBuffer = this._updatePositionBuffer.bind(this);
    this._toggleWireframe = this._toggleWireframe.bind(this);

    // Setup geometry.
    const { planeWidth, planeHeight, segmentsHeight, segmentsWidth } = data;
    this.geometry = new THREE.PlaneBufferGeometry(
      planeWidth,
      planeHeight,
      segmentsWidth,
      segmentsHeight
    );

    // Setup material.
    this.material = new THREE.MeshLambertMaterial();
    // TODO: For some reason these dummy textures refuse to be replaced by loaded textures...
    // this.material.map = new THREE.Texture();
    // this.material.alphaMap = new THREE.Texture();

    // Create the terrain mesh; rotate it to be parallel with the ground.
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.rotation.x = -90 * (Math.PI / 180);
    el.setObject3D("terrain", this.mesh);
  },

  update: function (oldData) {
    const data = this.data;
    const dem = data.dem;
    const map = data.map;
    const alphaMap = data.alphaMap;
    const zPosition = data.zPosition;
    const wireframe = data.wireframe;

    /**
     * Callback for THREE.TerrainLoader().
     * Sets the z-component of every vector in the position attribute buffer
     * to the (adjusted) height value from the DEM.
     *  positionBuffer.count === the number of vertices in the plane
     * @param {number[]} heightData
     */
    function onTerrainLoad(heightData) {
      this.heightData = heightData;
      this._updatePositionBuffer();
    }

    // Curried onTextureLoad callback.
    // materialProp is either:
    //   - 'map'      (for this.material.map)
    //   - 'alphaMap' (for this.material.alphaMap)
    const partialOnTextureLoad = (materialProp) => {
      return (loadedTexture) => {
        if (materialProp === "map" && this.data.map !== map) {
          // The texture took too long to load. The entity now has a different
          // map, so the map that was loaded cannot be used.
          loadedTexture.dispose();
          return;
        }
        if (materialProp === "alphaMap" && this.data.alphaMap !== alphaMap) {
          // Same idea as above, except the loaded texture is an alphaMap.
          loadedTexture.dispose();
          return;
        }
        loadedTexture.anisotropy = 16;
        const oldTexture = this.material[materialProp];
        this.material[materialProp] = loadedTexture;
        this.material.needsUpdate = true;
        if (oldTexture) {
          oldTexture.dispose();
        }
      };
    };

    if (dem !== oldData.dem) {
      // DEM has updated, so load the new one.
      this.terrainLoader.load(dem, onTerrainLoad.bind(this));
    }

    if (map !== oldData.map) {
      // Texture has updated, so load the new one.
      this.textureLoader.load(map, partialOnTextureLoad("map"));
    }

    if (alphaMap !== oldData.alphaMap) {
      // Alpha map has updated, so load the new one.
      // Also turn on material transparency.
      // TODO: Investigate how to turn this off if an alphaMap is removed.
      this.material.transparent = true;
      this.textureLoader.load(alphaMap, partialOnTextureLoad("alphaMap"));
    }

    if (zPosition !== oldData.zPosition) {
      // zPosition has changed, so re-calculate buffer positions.
      this._updatePositionBuffer();
    }

    if (wireframe !== oldData.wireframe) {
      // wire mode has either been activated or disactivated.
      this._toggleWireframe();
    }
  },

  _updatePositionBuffer: function () {
    if (!this.heightData) {
      return;
    }

    let positionBuffer = this.geometry.getAttribute("position");
    for (let i = 0; i < positionBuffer.count; i++) {
      let heightValue = (this.heightData[i] / 65535) * this.data.zPosition;
      positionBuffer.setZ(i, heightValue);
    }
    positionBuffer.needsUpdate = true;
  },

  _toggleWireframe: function () {
    // TODO: Consider creating wireframe on init and hiding/revealing rather
    // than creating the wireframe mesh on demand. Cons: wastes resources for
    // people who don't care about wireframe. Pros: less lag when wireframe is
    // turned on.

    if (this.data.wireframe) {
      // Add wireframe.
      const wireGeometry = new THREE.WireframeGeometry(this.geometry);
      const wireMaterial = new THREE.LineBasicMaterial({
        color: 0x808080,
        linewidth: 1,
      });
      let wireMesh = new THREE.LineSegments(wireGeometry, wireMaterial);
      wireMesh.name = "terrain-wireframe";
      wireMesh.material.opacity = 0.3;
      wireMesh.material.transparent = true;
      this.mesh.add(wireMesh);
      return;
    }

    // Remove wireframe
    let oldWireMesh = this.mesh.getObjectByName("terrain-wireframe");
    if (!oldWireMesh) {
      return;
    }
    oldWireMesh.geometry.dispose();
    oldWireMesh.material.dispose();
    this.mesh.remove(oldWireMesh);
  },

  remove: function () {
    this.geometry.dispose();
    this.material.map.dispose();
    this.material.alphaMap.dispose();
    this.material.dispose();
    this.el.removeObject3D("terrain");
  },
});
