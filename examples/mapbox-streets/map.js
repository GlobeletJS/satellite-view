import * as tileSetter from "tile-setter";

export function initMap(context) {
  // Wrapper for maps. Handles projection of spherical coordinates
  const framebuffer = context.initFramebuffer({ width: 1024, height: 1024 });

  return tileSetter.init({
    context, framebuffer,
    style: "./streets-v8-noInteractive.json",
    // eslint-disable-next-line max-len
    mapboxToken: "pk.eyJ1IjoiamhlbWJkIiwiYSI6ImNqcHpueHpyZjBlMjAzeG9kNG9oNzI2NTYifQ.K7fqhk2Z2YZ8NIV94M-5nA",
    units: "degrees",
  }).promise.then(api => setup(api, context, framebuffer.sampler))
    .catch(console.log);
}

function setup(api, context, sampler) {
  let loadStatus = 0;

  // Construct the maps.textures object
  const texture = {
    sampler,
    camPos: new Float64Array([0.5, 0.5]),
    scale: new Float64Array(2),
    changed: true,
  };

  return {
    texture,
    loaded: () => loadStatus,
    draw,
  };

  function draw(camPos, radius, view) {
    // Get map zoom
    const dMap = camPos[2] / radius *      // Normalize to radius = 1
      view.topEdge() * 2 / view.height() * // ray tangent per pixel
      api.projection.scale(camPos);

    const k = 1.0 / dMap;
    const zoom = Math.log2(k) - 9;

    api.setCenterZoom(camPos, zoom);
    loadStatus = api.draw();

    texture.scale.set(api.getScale());
    texture.camPos.set(api.getCamPos());

    context.updateMips(sampler);
  }
}
