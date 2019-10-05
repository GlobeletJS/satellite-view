# satellite-view

Re-project a map to a globe with WebGL

The latitude and longitude under each pixel is computed via the inverse
General Perspective Projection, following the equations in John Snyder's
[Map Projections, A Working Manual](https://pubs.usgs.gov/pp/1395/report.pdf).

When the point of perspective is close to the surface of the sphere, Snyder's
exact equations are replaced by series approximations. These approximations
are numerically more robust in WebGL's single-precision floating point math.

## Installation
satellite-view is provided as an ESM module import.
```javascript
import { initSatelliteView } from 'satellite-view';
```

## Initialization
initSatelliteView requires the following parameters:
- view: An object created by [yawgl](https://github.com/jjhembd/yawgl).initView
- radius: The (floating point) radius of the spherical Earth
- mapWidth, mapHeight: pixel dimensions of the maps that will be supplied to
  the draw function

Note: satellite-view will append an HTML Canvas as a child of view.element.
This Canvas will fill its parent element, at z-index = 0.

## API
Initialization returns an object with the following methods:
- draw(maps, camPos, camMoving): Renders the globe on the Canvas. Arguments:
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
  - camMoving: a (Boolean) flag indicating whether the camera position has
    changed since the last draw call

