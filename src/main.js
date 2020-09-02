import { setParams } from "./params.js";
import * as yawgl from 'yawgl';
import { buildShader } from "./shaders/buildShader.js";
import { getWebMercatorFactors } from "./proj-factors.js";

export function init(userParams) {
  const params = setParams(userParams);
  const gl = params.gl;

  // Initialize shader program
  const shaders = buildShader(params.nMaps);
  // TODO: use yawgl.initProgram
  const progInfo = yawgl.initShaderProgram(gl, shaders.vert, shaders.frag);

  // Load data into GPU for shaders: attribute buffers, indices, textures
  // TODO: use the constructVao method returned by yawgl.initProgram
  const buffers = yawgl.initQuadBuffers(gl);

  // Store links to uniform arrays
  const uniforms = {
    uMaxRay: new Float64Array(2),
    uTextureSampler: params.maps.map(tx => tx.sampler),
    uCamMapPos: new Float64Array(2 * params.nMaps),
    uMapScales: new Float64Array(2 * params.nMaps),
  };

  return {
    canvas: gl.canvas,
    draw,
    setPixelRatio: (ratio) => { params.getPixelRatio = () => ratio; },
    destroy: () => gl.canvas.remove(),
  };

  function draw(camPos, maxRayTan) {
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
      // Flip orientation of Y, from Canvas2D to WebGL orientation
      let tmp = [map.camPos[0], 1.0 - map.camPos[1]];
      uniforms.uCamMapPos.set(tmp, 2 * index);
      uniforms.uMapScales.set(map.scale, 2 * index);
    });

    // Draw the globe
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, params.flipY);

    var resized = yawgl.resizeCanvasToDisplaySize(
      gl.canvas, params.getPixelRatio() );
    // TODO: use the setupDraw method returned by yawgl.initProgram
    yawgl.drawScene(gl, progInfo, buffers, uniforms);
    return resized;
  }
}
