import { setParams } from "./params.js";
import * as yawgl from 'yawgl';
import { buildShader } from "./shaders/buildShader.js";
import { getWebMercatorFactors } from "./proj-factors.js";

export function init(userParams) {
  const params = setParams(userParams);

  const gl = yawgl.getExtendedContext(params.canvas);

  // Initialize shader program
  const shaders = buildShader(params.nMaps);
  const progInfo = yawgl.initShaderProgram(gl, shaders.vert, shaders.frag);

  // Load data into GPU for shaders: attribute buffers, indices, textures
  const buffers = yawgl.initQuadBuffers(gl);
  const textures = params.maps.map(map => {
    return yawgl.initTexture(gl, map.canvas.width, map.canvas.height);
  });

  // Store links to uniform arrays
  const uniforms = {
    uMaxRay: new Float64Array(2),
    uTextureSampler: textures.map(tx => tx.sampler),
    uCamMapPos: new Float64Array(2 * params.nMaps),
    uMapScales: new Float64Array(2 * params.nMaps),
  };

  return {
    canvas: gl.canvas,
    draw,
    setPixelRatio: (ratio) => { params.getPixelRatio = () => ratio; },
    destroy: () => gl.canvas.remove(),
  };

  function draw(camPos, maxRayTan, camMoving) {
    if (!camMoving && !params.maps.some(map => map.changed)) return;

    // Update uniforms related to camera position
    uniforms.uHnorm = camPos[2] / params.globeRadius;
    uniforms.uLat0 = camPos[1];
    uniforms.uCosLat0 = Math.cos(camPos[1]);
    uniforms.uSinLat0 = Math.sin(camPos[1]);
    uniforms.uTanLat0 = Math.tan(camPos[1]);
    [uniforms.uExpY0, uniforms.uLatErr] = getWebMercatorFactors(camPos[1]);

    uniforms.uMaxRay.set(maxRayTan);

    // Set uniforms and update textures for each map
    params.maps.forEach( (map, index) => {
      uniforms.uCamMapPos.set(map.camPos, 2 * index);
      uniforms.uMapScales.set(map.scale, 2 * index);
      if (map.changed) textures[index].update(map.canvas);
    });

    // Draw the globe
    var resized = yawgl.resizeCanvasToDisplaySize(
      gl.canvas, params.getPixelRatio() );
    yawgl.drawScene(gl, progInfo, buffers, uniforms);
    return resized;
  }
}
