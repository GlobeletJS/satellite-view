import * as tileSetter from 'tile-setter';

export function initMap(context) {
  // Wrapper for maps. Handles projection of spherical coordinates
  const framebuffer = context.initFramebuffer({ width: 1024, height: 1024 });

  return tileSetter.init({
    context, framebuffer,
    style: "./streets-v8-noInteractive.json",
    mapboxToken: "pk.eyJ1IjoiamhlbWJkIiwiYSI6ImNqcHpueHpyZjBlMjAzeG9kNG9oNzI2NTYifQ.K7fqhk2Z2YZ8NIV94M-5nA",
    units: "radians",
  }).promise.then(api => setup(api, framebuffer.sampler))
    .catch(console.log);
}

function setup(api, sampler) {
  var loadStatus = 0;

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
    let dMap = camPos[2] / radius *        // Normalize to radius = 1
      view.topEdge() * 2 / view.height() * // ray tangent per pixel
      api.projection.scale(camPos);

    let k = 1.0 / dMap;
    let zoom = Math.log2(k) - 9;

    let changed = api.setCenterZoom(camPos, zoom);
    loadStatus = api.draw();

    let scale = api.getScale();
    texture.scale.set(scale);
    let mapPos = api.getCamPos();
    texture.camPos.set(mapPos);

    // Update mipmaps
    const gl = api.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindTexture(gl.TEXTURE_2D, sampler);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.bindTexture(gl.TEXTURE_2D, null);
  }
}
