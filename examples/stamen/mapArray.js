import * as tileFrame from 'tile-frame';

export function initMapArray(mapParams, getTile, numLevels) {
  const maps = [];
  for (let i = 0; i < numLevels; i++) {
    maps[i] = initFrame(mapParams, getTile);
  }

  return {
    textures: maps.map( map => map.texture ),
    loaded: () => maps.reduce( (sum, map) => sum + map.frame.loaded(), 0 ),

    setCenterZoom,
    drawTiles,
    tileDistance,
  };

  function drawTiles() {
    maps.forEach( map => { map.texture.changed = map.frame.drawTiles(); });
  }

  function setCenterZoom(center, zoom) {
    maps.forEach( (map, index) => {
      // Set increasing zoom levels, up to last map with z = zoom
      let z = zoom - numLevels + index + 1;
      map.frame.setCenterZoom(center, z);

      // Update texture coordinate transform parameters
      map.frame.toLocal(map.texture.camPos, center);
      map.texture.scale[0] = map.frame.getScale(0);
      map.texture.scale[1] = map.frame.getScale(1);
    });
  }

  function tileDistance(z, x, y) {
    let distances = maps.map( map => map.frame.tileDistance(z, x, y) );
    return Math.min(...distances);
  }
}

function initFrame(mapParams, getTile) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  const frame = tileFrame.init(mapParams, context, getTile);
  const texture = {
    canvas,
    camPos: new Float64Array(2),
    scale: new Float64Array(2),
    changed: true,
  };
  return { frame, texture };
}
