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
      type: 'asset'
    },
    texture: {
      type: 'asset'
    },
    alphaMap: {
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
    transparent: {
      type: 'boolean',
      default: false
    },
    // If true, enable wireframe
    debug: { default: false }
  },

  /**
   * Set if component needs multiple instancing.
   * Dan Moran changed this to "true" 10-May-2017. Not sure why it was "false" before.
   */
  multiple: true,

  /**
   * Called when component is attached and when component data changes.
   * Generally modifies the entity based on the data.
   */
  update: function (oldData) {
    var el = this.el;
    var data = this.data;
    var debug = data.debug;
    var transparentMaterial = data.transparent;
    var surface;

    // Texture and terrain URLs
    var terrainURL = data.DEM;
    var textureURL = data.texture;
    var alphaMapURL = data.alphaMap;

    // Utility to load the DEM data
    var terrainLoader = new THREE.TerrainLoader();

    // Create the plane geometry
    var geometry = new THREE.PlaneBufferGeometry(data.planeWidth, data.planeHeight, data.segmentsWidth, data.segmentsHeight);

    // z-scaling factor
    var zPosition = data.zPosition;

    // The terrainLoader loads the DEM file and defines a function to be called when the file is successfully downloaded.
    terrainLoader.load(terrainURL, function (data) {
      // Adjust each vertex in the plane to correspond to the height value in the DEM file.
      var verts = geometry.attributes.position;
      for (var vi = 2, di=0, l = verts.count*3; vi < l; vi+=3, di++) {
        verts.array[vi] = data[di] / 65535 * zPosition;
      }
      geometry.attributes.position.needsUpdate = true;

      // Load texture, apply maximum anisotropy
      var textureLoader = new THREE.TextureLoader();
      var texture = textureLoader.load(textureURL);
      texture.anisotropy = 16;

      // Load alphaMap
      var alphaMap = alphaMapURL==="" ? null : new THREE.TextureLoader().load(alphaMapURL);

      // Create material
      var material = new THREE.MeshLambertMaterial({
          map: texture,
          alphaMap: alphaMap,
          transparent: transparentMaterial || (alphaMap!=null)
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
