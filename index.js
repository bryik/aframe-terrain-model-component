/* global AFRAME, THREE */

if (typeof AFRAME === 'undefined') {
  throw new Error('Component attempted to register before AFRAME was available.');
}

require('./lib/terrainloader.js');

/**
 * Terrain model component for A-Frame.
 */
AFRAME.registerComponent('terrain-model', {
  schema: {
    DEM: {
      type: 'src'
    },
    texture: {
      type: 'src'
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
    // If true, enable wireframe
    debug: { default: false }
  },

  /**
   * Set if component needs multiple instancing.
   */
  multiple: false,

  /**
   * Called when component is attached and when component data changes.
   * Generally modifies the entity based on the data.
   */
  update: function (oldData) {
    var el = this.el;
    var data = this.data;
    var debug = data.debug;
    var surface;

    // Texture and terrain URLs
    var terrainURL = data.DEM;
    var textureURL = data.texture;

    // Utility to load the DEM data
    var terrainLoader = new THREE.TerrainLoader();

    // Create the plane geometry
    var geometry = new THREE.PlaneGeometry(data.planeWidth, data.planeHeight, data.segmentsWidth, data.segmentsHeight);

    // z-scaling factor
    var zPosition = data.zPosition;

    // The terrainLoader loads the DEM file and defines a function to be called when the file is successfully downloaded.
    terrainLoader.load(terrainURL, function (data) {
      // Adjust each vertex in the plane to correspond to the height value in the DEM file.
      for (var i = 0, l = geometry.vertices.length; i < l; i++) {
        geometry.vertices[i].z = data[i] / 65535 * zPosition;
      }

      // Load texture, apply maximum anisotropy
      var textureLoader = new THREE.TextureLoader();
      var texture = textureLoader.load(textureURL);
      texture.anisotropy = 16;

      // Create material
      var material = new THREE.MeshLambertMaterial({
        map: texture
      });

      // Create the surface mesh and register it under entity's object3DMap
      surface = new THREE.Mesh(geometry, material);
      surface.rotation.x = -90 * Math.PI / 180;
      el.setObject3D('terrain', surface);

      // Wireframe debug mode
      if (debug) {
        wireframe = new THREE.WireframeHelper( surface, 0x4caf50 );
        el.setObject3D('terrain-wireframe', wireframe);
      }
    });
  },

  /**
   * Called when a component is removed (e.g., via removeAttribute).
   * Generally undoes all modifications to the entity.
   */
  remove: function () {
    this.el.removeObject3D('terrain-wireframe');
    this.el.removeObject3D('terrain');
  }
});
