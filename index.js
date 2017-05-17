/* global AFRAME, THREE */

if (typeof AFRAME === 'undefined') {
  throw new Error('Component attempted to register before AFRAME was available.');
}

require('./lib/terrainloader.js');
var d3 = require('d3');

/**
 * Terrain model component for A-Frame.
 */
AFRAME.registerComponent('terrain-model', {
  schema: {
    DEM: {
      type: 'asset'
    },
    planeHeight: {
      type: 'number'
    },
    planeWidth: {
      type: 'number'
    },
    segmentsHeight: {
      type: 'number',
      default: 199
    },
    segmentsWidth: {
      type: 'number',
      default: 199
    },
    zPosition: {
      type: 'number',
      default: 1.5
    },
    colorScheme: {
      type: 'string',
      default: 'viridis'
    },
    wireframe: {
      type: 'boolean',
      default: false
    }
  },

  /**
   * Set if component needs multiple instancing.
   */
  multiple: true,

  /**
   * Called when component is attached and when component data changes.
   * Generally modifies the entity based on the data.
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

      var geometry = new THREE.PlaneBufferGeometry(data.planeWidth, data.planeHeight, data.segmentsWidth, data.segmentsHeight);

      // The position attribute buffer
      var pAB = geometry.getAttribute('position');

      // Formula for size of new buffer attribute array is: numVertices * itemSize
      // https://threejs.org/docs/index.html#api/core/BufferAttribute
      var colorArray = new Uint8Array(pAB.count * 3);
      var cBA = new THREE.BufferAttribute(colorArray, 3, true);
      var colorScale = self.getColorScale(data.colorScheme);

      /**
       * Set the z-component of every vector in the position attribute buffer to the (adjusted) height value from the DEM.
       * pAB.count = the number of vertices in the plane
       * Also sets vertex color.
       */
      for (let i = 0; i < pAB.count; i++) {
        let heightValue = heightData[i] / 65535 * data.zPosition;
        pAB.setZ(i, heightValue);

        let colorValue = d3.color(colorScale(heightData[i]));
        cBA.setXYZ(i, colorValue.r, colorValue.g, colorValue.b);
      }

      geometry.addAttribute('color', cBA);

      var material = new THREE.MeshLambertMaterial({
          vertexColors: THREE.VertexColors
        });

      // Create the surface mesh and register it under entity's object3DMap
      var surface = new THREE.Mesh(geometry, material);
      surface.rotation.x = -90 * Math.PI / 180;
      el.setObject3D('terrain', surface);

      // Wireframe
      if (data.wireframe) {
        let wireGeometry = new THREE.WireframeGeometry(geometry);
        let wireMaterial = new THREE.LineBasicMaterial({color: 0x808080, linewidth: 1});
        let wireMesh = new THREE.LineSegments(wireGeometry, wireMaterial);
        wireMesh.material.opacity = 0.30;
        wireMesh.material.transparent = true;
        surface.add(wireMesh);
      }
    });
  },

  /**
   * Called when a component is removed (e.g., via removeAttribute).
   * Generally undoes all modifications to the entity.
   */
  remove: function () {
    this.el.removeObject3D('terrain');
  },

  /**
   * Returns a sequential scale with chosen interpolater
   * Defaults to Viridis if unknown colorScheme is asked for (also logs error)
   */
  getColorScale: function(colorScheme) {

    switch(colorScheme) {
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
        return d3.scaleSequential(d3.interpolateCubehelixDefault).domain([0, 65535]);
      default:
        console.log("terrain-model error: " + colorScheme + "is not a color scheme. Default color loaded instead.");
        return d3.scaleSequential(d3.interpolateViridis).domain([0, 65535]);
    }

  }
});


/**
 * Variant of terrain model component geared towards textures.
 */
AFRAME.registerComponent('textured-terrain-model', {
  schema: {
    DEM: {
      type: 'asset'
    },
    planeHeight: {
      type: 'number'
    },
    planeWidth: {
      type: 'number'
    },
    segmentsHeight: {
      type: 'number',
      default: 199
    },
    segmentsWidth: {
      type: 'number',
      default: 199
    },
    zPosition: {
      type: 'number',
      default: 1.5
    },
    texture: {
      type: 'asset'
    },
    alphaMap: {
      type: 'asset'
    },
    transparent: {
      type: 'boolean',
      default: false
    },
    wireframe: {
      type: 'boolean',
      default: false
    }
  },

  /**
   * Set if component needs multiple instancing.
   */
  multiple: true,

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

      var geometry = new THREE.PlaneBufferGeometry(data.planeWidth, data.planeHeight, data.segmentsWidth, data.segmentsHeight);

      // The position attribute buffer
      var pAB = geometry.getAttribute('position');

      /**
       * Set the z-component of every vector in the position attribute buffer to the (adjusted) height value from the DEM.
       * pAB.count = the number of vertices in the plane
       */
      for (let i = 0; i < pAB.count; i++) {
        let heightValue = heightData[i] / 65535 * data.zPosition;
        pAB.setZ(i, heightValue);
      }

      // Load textures and alphaMap (if applicable), apply maximum anisotropy
      var textureLoader = new THREE.TextureLoader();
      var texture = (data.texture === "") ? null : textureLoader.load(data.texture);
      //texture.anisotropy = 16;
      var alphaMap = (data.alphaMap === "") ? null : textureLoader.load(data.alphaMap);

      var material = new THREE.MeshLambertMaterial({
          map: texture,
          alphaMap: alphaMap,
          transparent: data.transparent || (alphaMap!=null)
        });

      // Create the surface mesh and register it under entity's object3DMap
      var surface = new THREE.Mesh(geometry, material);
      surface.rotation.x = -90 * Math.PI / 180;
      el.setObject3D('terrain', surface);

      // Wireframe
      if (data.wireframe) {
        let wireGeometry = new THREE.WireframeGeometry(geometry);
        let wireMaterial = new THREE.LineBasicMaterial({color: 0x808080, linewidth: 1});
        let wireMesh = new THREE.LineSegments(wireGeometry, wireMaterial);
        wireMesh.material.opacity = 0.30;
        wireMesh.material.transparent = true;
        surface.add(wireMesh);
      }
    });
  },

  /**
   * Called when a component is removed (e.g., via removeAttribute).
   * Generally undoes all modifications to the entity.
   */
  remove: function () {
    this.el.removeObject3D('terrain');
  }

});
