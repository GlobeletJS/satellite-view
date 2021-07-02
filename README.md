# satellite-view

Re-project a map to a globe with WebGL

The latitude and longitude under each pixel is computed via the inverse
[General Perspective Projection](https://en.wikipedia.org/wiki/General_Perspective_projection), 
following the equations in John Snyder's
[Map Projections, A Working Manual](https://pubs.usgs.gov/pp/1395/report.pdf).

When the point of perspective is close to the surface of the sphere, Snyder's
exact equations are replaced by series approximations. These approximations
are numerically more robust in single-precision floating point math, as used
by WebGL. See 
[Robust Raster Reprojection](https://observablehq.com/@jjhembd/robust-raster-reprojection)
for details on the approximations.

Check out the 
[live example](https://globeletjs.github.io/satellite-view/examples/stamen/index.html)
using tiles from [Stamen Maps](http://maps.stamen.com).

## Installation
satellite-view is provided as an ESM module import.
```javascript
import * as satelliteView from 'satellite-view';
```

## Initialization
satelliteView.init takes a parameters object with the following properties:
- context: (REQUIRED) An extended WebGL rendering context, as returned by the 
  initContext method from [yawgl][]
- globeRadius: The (floating point) radius of the spherical Earth. Units must
  match the units of the altitude in the camPos array supplied to the draw
  method. Default: 6371 (km).
- map: (REQUIRED) An object with the following properties, OR an array of
  objects where each element has the following properties:
  - canvas: an HTML Canvas element containing a map image
  - camPos: a 2-element array containing the map coordinates of the camera
    position. Map coordinates range from [0, 0] at the top left corner of the
    Canvas to [1, 1] at the bottom right
  - scale: a 2-element array containing the scales of the current map relative
    to a map covering the whole world
  - changed: a (Boolean) flag indicating whether the map image has changed
    since the last draw call
- pixelRatio: Ratio of the pixel size of the rendered image ([drawingbuffer
  size]) to the CSS display size of the container. Default:
  [window.devicePixelRatio][]. Note: if a value is supplied, the pixel ratio
  will remain constant across draw calls. The default behavior will update
  the pixel ratio when window.devicePixelRatio changes

[yawgl]: https://github.com/GlobeletJS/yawgl
[drawingbuffer size]: https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/drawingBufferWidth
[window.devicePixelRatio]: https://developer.mozilla.org/en-US/docs/Web/API/Window/devicePixelRatio

## API
Initialization returns an object with the following properties and methods:
- `canvas`: Link to the Canvas element on which the view is rendered
- `draw(camPos, maxRayTan, camMoving)`: Renders the globe on the Canvas. 
  Arguments:
  - camPos: a 3-element array containing the longitude, latitude, altitude of
    the camera. Longitude and latitude are in radians. Altitude is in the same
    units as the supplied globe radius.
  - maxRayTan: a 2-element array containing the maximum ray tangents at the
    corners of the camera sensor. The values are the tangents of half the field
    of view angles:
      - maxRayTan[0] = tan(FOV_x / 2)
      - maxRayTan[1] = tan(FOV_y / 2)
  - camMoving: a (Boolean) flag indicating whether the camera position has
    changed since the last draw call
- `setDevicePixelRatio(ratio)`: sets pixelRatio to the supplied constant value
