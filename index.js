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

      var verts = geometry.attributes.position;

      /**
       * Adjust each vertex in the plane to correspond to the height value in the DEM file.
       * vi = The index of the current vertex's Z position in the plane geometry's position attribute array.
       * di = The index of the current data value.
       * tv = The total number of vertices in the plane geometry.
       */
      for (var vi = 2, di = 0, tv = verts.count*3; vi < tv; vi+=3, di++) {
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
        var wireGeometry = new THREE.WireframeGeometry(geometry);
        var wireMaterial = new THREE.LineBasicMaterial({color: 0x4caf50, linewidth: 2});
        var wireMesh = new THREE.LineSegments(wireGeometry, wireMaterial);
        surface.add(wireMesh);
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
