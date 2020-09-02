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
    framebufferSize: frame.size,
    style: "mapbox://styles/mapbox/streets-v8",
    mapboxToken: "pk.eyJ1IjoiamhlbWJkIiwiYSI6ImNqcHpueHpyZjBlMjAzeG9kNG9oNzI2NTYifQ.K7fqhk2Z2YZ8NIV94M-5nA",
  }).promise.then(api => setup(api, frame))
    .catch(console.log);
}

function setup(api, frame) {
  var loadStatus = 0;
  const { gl, size } = api;
  const transform = { k: 1, x: 0, y: 0 };

  // Construct the maps.textures object
  const texture = {
    sampler: frame.sampler,
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
    const viewport = [size.width, size.height];

    // Get map zoom
    let dMap = camPos[2] / radius *        // Normalize to radius = 1
      view.topEdge() * 2 / view.height() * // ray tangent per pixel
      projection.scale(camPos);            // Scale assumes sphere radius = 1

    let k = 1.0 / dMap;

    let [x, y] = projection
      .lonLatToXY([], camPos)
      .map((c, i) => (0.5 - c) * k + viewport[i] / 2);

    Object.assign(transform, { k, x, y });

    texture.scale[0] = 1.0 / (size.width * dMap);
    texture.scale[1] = 1.0 / (size.height * dMap);

    const target = gl.TEXTURE_2D;
    loadStatus = api.draw(transform);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindTexture(target, frame.sampler);
    gl.texParameteri(target, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.generateMipmap(target);
    setTextureAnisotropy(gl, target);
    //gl.bindTexture(gl.TEXTURE_2D, null);
  }
}

function setTextureAnisotropy(gl, target) {
  var ext = (
      gl.getExtension('EXT_texture_filter_anisotropic') ||
      gl.getExtension('MOZ_EXT_texture_filter_anisotropic') ||
      gl.getExtension('WEBKIT_EXT_texture_filter_anisotropic')
      );
  if (ext) {
    var maxAnisotropy = gl.getParameter(ext.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
    // BEWARE: this texParameterf call is slow on Intel integrated graphics.
    // Avoid this entire function if at all possible.
    gl.texParameterf(target, ext.TEXTURE_MAX_ANISOTROPY_EXT,
        maxAnisotropy);
  }
  return;
}
