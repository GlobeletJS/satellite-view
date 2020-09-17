import { initFramebuffer } from "./framebuffer.js";
import * as yawgl from 'yawgl';
import * as vectorMap from 'vector-map';
import * as projection from "./proj-mercator.js";

export function initMap(gl) {
  // Wrapper for maps. Handles projection of spherical coordinates
  const frame = initFramebuffer(gl, 1024, 1024);

  return vectorMap.init({
    gl,
    framebuffer: frame.buffer,
    size: frame.size,
    style: "mapbox://styles/mapbox/streets-v8",
    mapboxToken: "pk.eyJ1IjoiamhlbWJkIiwiYSI6ImNqcHpueHpyZjBlMjAzeG9kNG9oNzI2NTYifQ.K7fqhk2Z2YZ8NIV94M-5nA",
  }).promise.then(api => setup(api, frame.sampler))
    .catch(console.log);
}

function setup(api, sampler) {
  var loadStatus = 0;
  const gl = api.gl;

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
      projection.scale(camPos);            // Scale assumes sphere radius = 1

    let k = 1.0 / dMap;
    let zoom = Math.log2(k) - 9;

    let changed = api.setCenterZoom(camPos, zoom, 'radians');
    loadStatus = api.draw();

    let scale = api.getScale();
    texture.scale.set(scale);
    let mapPos = api.getCamPos();
    texture.camPos.set(mapPos);
    console.log("scale, camPos = " + scale + ", " + mapPos);

    // Update mipmaps
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    //gl.bindTexture(gl.TEXTURE_2D, sampler);
    //gl.generateMipmap(gl.TEXTURE_2D);
    //gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    //gl.bindTexture(gl.TEXTURE_2D, null);
  }
}
