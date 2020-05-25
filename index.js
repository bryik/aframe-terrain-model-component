/* global AFRAME, THREE */

if (typeof AFRAME === "undefined") {
  throw new Error(
    "Component attempted to register before AFRAME was available."
  );
}

require("./lib/terrainloader.js");

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
    this._replaceTexture = this._replaceTexture.bind(this);
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
     * @param {number[]} heightData
     */
    function onTerrainLoad(heightData) {
      this.heightData = heightData;
      this._updatePositionBuffer();
      this.el.emit("demLoaded", { dem });
    }

    /**
     * This is a curried function that returns a callback to pass to THREE.TextureLoader.load()
     * This callback updates the terrain material as necessary. 'map' and 'alphaMap'
     * texture loads are handled almost identically.
     * @param {string} materialProp either 'map' (for this.material.map) or 'alphaMap' (for this.material.alphaMap)
     * @returns {function}
     */
    const curriedOnTextureLoad = (materialProp) => {
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
        this._replaceTexture(materialProp, loadedTexture);
        this.el.emit("textureLoaded", { type: materialProp });
      };
    };

    if (dem !== oldData.dem) {
      // DEM has updated, so load the new one.
      this.terrainLoader.load(dem, onTerrainLoad.bind(this));
    }

    if (map !== oldData.map) {
      // When map is not set, it defaults to ""
      if (!map) {
        this._replaceTexture("map", null);
      } else {
        // Texture has updated, so load the new one.
        this.textureLoader.load(map, curriedOnTextureLoad("map"));
      }
    }

    if (alphaMap !== oldData.alphaMap) {
      // When alphaMap is not set, it defaults to ""
      if (!alphaMap) {
        this._replaceTexture("alphaMap", null);
      } else {
        // Alpha map has updated, so load the new one.
        // Also turn on material transparency.
        this.material.transparent = true;
        this.textureLoader.load(alphaMap, curriedOnTextureLoad("alphaMap"));
      }
    }

    if (zPosition !== oldData.zPosition) {
      // zPosition has changed, so re-scale the mesh.
      this.mesh.scale.set(1, 1, zPosition);
    }

    if (wireframe !== oldData.wireframe) {
      // wire mode has either been activated or disactivated.
      this._toggleWireframe();
    }
  },

  /**
   * A helper for swapping out a material texture.
   * Ensures the old texture is disposed.
   * @param {string} materialProp e.g. 'map' or 'alphaMap'
   * @param {(THREE.Texture|null)} newTexture
   */
  _replaceTexture: function (materialProp, newTexture) {
    const oldTexture = this.material[materialProp];
    this.material[materialProp] = newTexture;
    this.material.needsUpdate = true;
    if (oldTexture) {
      oldTexture.dispose();
    }
  },

  /**
   * Sets the z-component of every vector in the position attribute buffer
   * to the (adjusted) height value from the DEM. Also adjusts the wireframe.
   * Note:
   *  positionBuffer.count === the number of vertices in the plane
   */
  _updatePositionBuffer: function () {
    if (!this.heightData) {
      return;
    }

    let positionBuffer = this.geometry.getAttribute("position");
    for (let i = 0; i < positionBuffer.count; i++) {
      let heightValue = this.heightData[i] / 65535;
      positionBuffer.setZ(i, heightValue);
    }
    positionBuffer.needsUpdate = true;

    // Update wireframe
    let oldWireMesh = this.mesh.getObjectByName("terrain-wireframe");
    if (oldWireMesh) {
      oldWireMesh.geometry.dispose();
      const wireGeometry = new THREE.WireframeGeometry(this.geometry);
      oldWireMesh.geometry = wireGeometry;
    }
    this.el.emit("positionBufferUpdated");
  },

  /**
   * Creates or destroys a terrain wireframe mesh.
   * A wireframe can be useful for debugging or for visualizing a terrain DEM
   * without a texture.
   */
  _toggleWireframe: function () {
    // TODO: Consider creating wireframe on init and hiding/revealing rather
    // than creating the wireframe mesh on demand. Cons: wastes resources for
    // people who don't care about wireframe. Pros: less lag when wireframe is
    // turned on.

    let oldWireMesh = this.mesh.getObjectByName("terrain-wireframe");
    if (!oldWireMesh) {
      // This is a somewhat inelegant way to prevent adding a wireframe when the
      // component initializes.
      if (!this.data.wireframe) {
        return;
      }
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
    oldWireMesh.geometry.dispose();
    oldWireMesh.material.dispose();
    this.mesh.remove(oldWireMesh);
  },

  remove: function () {
    this.geometry.dispose();
    this.material.map.dispose();
    this.material.alphaMap.dispose();
    this.material.dispose();
    if (this.data.wireframe) {
      this._toggleWireframe();
    }
    this.el.removeObject3D("terrain");
  },
});
