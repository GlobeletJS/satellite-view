# satellite-view

Re-project a map to a globe with WebGL

The latitude and longitude under each pixel is computed via the inverse
[General Perspective Projection](https://en.wikipedia.org/wiki/General_Perspective_projection), 
following the equations in John Snyder's
[Map Projections, A Working Manual](https://pubs.usgs.gov/pp/1395/report.pdf).

When the point of perspective is close to the surface of the sphere, Snyder's
exact equations are replaced by series approximations. These approximations
are numerically more robust in single-precision floating point math, as used
by WebGL.

## Installation
satellite-view is provided as an ESM module import.
```javascript
import { initSatelliteView } from 'satellite-view';
```

## Initialization
initSatelliteView requires the following parameters:
- container: An HTML element where the globe will be displayed. Note: an HTML
  Canvas will be appended as a child of this container, with the following 
  styles:
  - width = 100%
  - height = 100%
  - z-index = 0.
- radius: The (floating point) radius of the spherical Earth
- mapWidth, mapHeight: pixel dimensions of the maps that will be supplied to
  the draw function

## API
Initialization returns an object with the following properties and methods:
- canvas: Link to the Canvas element on which the view is rendered
- draw(maps, camPos, maxRayTan, camMoving): Renders the globe on the Canvas. 
  Arguments:
  - maps: an array of map objects, where each object has the following
    properties:
    - canvas: an HTML Canvas Element containing a map image
    - camPos: a 2-element array containing the map coordinates of the camera
      position. (Map coordinates range from [0, 0] at the top left corner of the
      Canvas to [1, 1] at the bottom right)
    - scale: a 2-element array containing the scale of the current map relative
      to a map covering the whole world
    - changed: a (Boolean) flag indicating whether the map image has changed
      since the last draw call
  - camPos: a 3-element array containing the longitude, latitude, altitude of
    the camera. Longitude and latitude are in radians. Altitude is in the same
    units as the supplied sphere radius.
  - maxRayTan: a 2-element array containing the maximum ray tangents at the
    corners of the camera sensor. The values are the tangents of half the field
    of view angles:
      - maxRayTan[0] = tan(FOV_x / 2)
      - maxRayTan[1] = tan(FOV_y / 2)
  - camMoving: a (Boolean) flag indicating whether the camera position has
    changed since the last draw call
