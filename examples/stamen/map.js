// Wrapper for maps. Handles projection of spherical coordinates
import * as projection from "./proj-mercator.js";
import { initRasterCache } from 'tile-rack';
import { initMapArray } from "./mapArray.js";

export function initMaps(mapParams) {
  const xy = new Float64Array(2);
  const tileSize = mapParams.tileSize;

  const cache = initRasterCache(tileSize, tileURL);
  var numCachedTiles = 0;

  // Initialize array of 2D map grids
  const maps = initMapArray(mapParams, cache.retrieve, 2);

  return {
    textures: maps.textures,
    loaded: maps.loaded,

    setPosition,
    draw,
  };

  function setPosition(camPos, radius, view) {
    // Get map zoom
    let dMap = camPos[2] / radius *        // Normalize to radius = 1
      view.topEdge() * 2 / view.height() * // ray tangent per pixel
      projection.scale(camPos);            // Scale assumes sphere radius = 1
    let zoom = Math.round( -Math.log2(tileSize * dMap) );

    projection.lonLatToXY(xy, camPos);
    maps.setCenterZoom(xy, zoom);
  }

  function draw() {
    maps.drawTiles();
    numCachedTiles = cache.trim(maps.tileDistance, 1.5);
  }
}

function tileURL(z, x, y) {
  const endpoint = "http://tile.stamen.com/toner-lite/{z}/{x}/{y}.png";
  return endpoint.replace(/{z}/, z).replace(/{x}/, x).replace(/{y}/, y);
}
