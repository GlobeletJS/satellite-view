import * as yawgl from 'yawgl';
import * as vectorMap from 'vector-map';
import * as projection from "./proj-mercator.js";

export function initMap() {
  // Wrapper for maps. Handles projection of spherical coordinates
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1024;
  const gl = yawgl.getExtendedContext(canvas);

  return vectorMap.init({
    gl,
    style: "mapbox://styles/mapbox/streets-v8",
    mapboxToken: "pk.eyJ1IjoiamhlbWJkIiwiYSI6ImNqcHpueHpyZjBlMjAzeG9kNG9oNzI2NTYifQ.K7fqhk2Z2YZ8NIV94M-5nA",
  }).promise.then(api => setup(api, canvas))
    .catch(console.log);
}

function setup(api, canvas) {
  var loadStatus = 0;
  const transform = { k: 1, x: 0, y: 0 };

  // Construct the maps.textures object
  const texture = {
    canvas,
    camPos: new Float64Array([0.5, 0.5]),
    scale: new Float64Array(2),
    changed: true,
  };

  return {
    texture,
    loaded: () => loadStatus,

    setPosition,
    draw,
  };

  function setPosition(camPos, radius, view) {
    const viewport = [canvas.width, canvas.height];

    // Get map zoom
    let dMap = camPos[2] / radius *        // Normalize to radius = 1
      view.topEdge() * 2 / view.height() * // ray tangent per pixel
      projection.scale(camPos);            // Scale assumes sphere radius = 1

    let k = 1.0 / dMap;

    let [x, y] = projection
      .lonLatToXY([], camPos)
      .map((c, i) => (0.5 - c) * k + viewport[i] / 2);

    Object.assign(transform, { k, x, y });

    texture.scale[0] = 1.0 / (canvas.width * dMap);
    texture.scale[1] = 1.0 / (canvas.height * dMap);
  }

  function draw() {
    loadStatus = api.draw(transform);
  }
}
