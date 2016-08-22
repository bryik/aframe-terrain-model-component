## aframe-terrain-model-component

<p align="center">
  <img src="http://i.imgur.com/n1uvgZn.png"/>
</p>

A terrain model component for [A-Frame](https://aframe.io). Uses Bjørn Sandvik's [terrain loader](https://github.com/turban/webgl-terrain/blob/master/lib/TerrainLoader.js) and based on code from a tutorial by [the L.A. Times](http://graphics.latimes.com/mars-gale-crater-how-we-did-it/).

The basic idea is to create a large plane with a certain width, height, and number of vertices. Each vertex is then repositioned based on elevation from a digital elevation model (DEM). The DEM must be in ENVI format--see [this blog post](http://blog.thematicmapping.org/2013/10/terrain-building-with-threejs-part-1.html) for conversion details.

### API

|    Property    |                                       Description                                       | Default Value |
|:--------------:|:---------------------------------------------------------------------------------------:|:-------------:|
|       DEM      |                  Path to digital elevation model data in ENVI format.                 |               |
|     texture    |                                     Path to texture.                                    |               |
|   planeHeight  |                                 The height of the plane.                                |               |
|   planeWidth   |                                 The width of the plane.                                 |               |
| segmentsHeight |                            Width of elevation grid minus one.                           |      199      |
|  segmentsWidth |                           Height of elevation grid minus one.                           |      199      |
|    zPosition   | Vertical exaggeration.  Lower values will seem flatter, higher values more mountainous. |      1.5      |
|      debug     |                                     Adds a wireframe                                    |     false     |

The relationship between these properties and the DEM data may not be straightforward. 

The **height** and **width** of the plane should have the same ratio as the height and width of the area covered by your DEM. For instance, if you've clipped your DEM down to an image/grid size of 6000 px by 6000 px then planeHeight and planeWidth could be set to 60.

The **segmentsHeight** and **segmentsWidth** values should be set to ["the width and height of your elevation grid minus one"](http://blog.thematicmapping.org/2013/10/terrain-building-with-threejs.html). The height and width of your elevation grid was probably determined during the conversion to ENVI.

e.g.

<pre>
    gdal_translate -scale 0 2470 0 65535 -ot UInt16 -outsize <b>200 200</b> -of ENVI jotunheimen.tif jotunheimen.bin
</pre>

Corresponds to a segmentsHeight and segmentsWidth value of 199.

These values seem to control the "resolution" of the elevation data. [The L.A. Times](http://graphics.latimes.com/mars-gale-crater-how-we-did-it/) has this to say:

>"You'll notice we specified the -outsize parameter, which specifies the number of data points in the output file, and the number of vertices in the plane in the Three.js scene. This can be as high or low as you want, but you'll find that larger values can be very taxing on the graphics processor when rendering the scene. We found that using 300 x 285 provided a good amount of detail without stressing out the GPU too much. For phones, we used a smaller file, 200 x 190, and for some phones even went to a 100 x 95 file, to ensure that the interactive ran smoothly."

Lastly, **zPosition** controls vertical exaggeration. It is a kind of scaling factor that alters terrain height. I'm not sure how to determine an accurate value for this; my tactic is to adjust until the result is aesthetically pleasing. The L.A. Times used a value of 100 for their Gale Crater experience, Sandvik used 5 for Jotunheimen, and I used 50 for the crater floor example.

### References

- "Terrain Building with Three.js" by Bjørn Sandvik (Parts [I](http://blog.thematicmapping.org/2013/10/terrain-building-with-threejs-part-1.html), [II](http://blog.thematicmapping.org/2013/10/terrain-building-with-threejs.html), and [III](http://blog.thematicmapping.org/2013/10/textural-terrains-with-threejs.html))
- ["Discovering Gale Crater: How we did it"](http://graphics.latimes.com/mars-gale-crater-how-we-did-it/) by Armand Emamdjomeh and Len Degroot
- ["vr-interactives-three-js"](https://github.com/datadesk/vr-interactives-three-js) by Armand Emamdjomeh

**Data (DEM and textures)**

The Gale-Crater and Jotunheimen examples were created by journalists from the L.A. Times and Bjørn Sandvik respectively. The Jotunheimen data was obtained from [The Norwegian Mapping Authority](http://statkart.no/en/).

All Mars examples use public domain data from [HiRISE](http://www.uahirise.org//dtm/) (credit: NASA/JPL/University of Arizona).

- [Faulted Layered Bedrock in Noctis Labyrinthus](http://hirise.lpl.arizona.edu/dtm/dtm.php?ID=ESP_016845_1715).
- [Crater Floor and Central Mound in Gale Crater (MSL)](http://www.uahirise.org/dtm/dtm.php?ID=PSP_009650_1755).
- [Olympic-Peninsula](https://www.sciencebase.gov/catalog/item/5646dc56e4b0e2669b311a3b).

### Installation

#### Browser

Install and use by directly including the [browser files](dist):

```html
<head>
  <title>My A-Frame Scene</title>
  <script src="https://aframe.io/releases/0.2.0/aframe.min.js"></script>
  <script src="https://rawgit.com/bryik/aframe-terrain-model-component/master/dist/aframe-terrain-model-component.min.js"></script>
</head>

<body>
  <a-scene>
    <a-entity terrain-model='DEM: url(data/noctis-3500-clip-envi.bin); texture: url(data/noctis-3500-clip-textureRED-resized.jpg); planeWidth: 346; planeHeight: 346; segmentsWidth: 199; segmentsHeight: 199; zPosition: 100;'></a-entity>
  </a-scene>
</body>
```

#### npm

Install via npm:

```bash
npm install aframe-terrain-model-component
```

Then register and use.

```js
require('aframe');
require('aframe-terrain-model-component');
```
