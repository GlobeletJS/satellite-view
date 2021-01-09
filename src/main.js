import { setParams } from "./params.js";
import * as yawgl from 'yawgl';
import { buildShader } from "./shaders/buildShader.js";
const maxMercLat = 2.0 * Math.atan( Math.exp(Math.PI) ) - Math.PI / 2.0;

export function init(userParams) {
  const params = setParams(userParams);
  const { gl, maps, globeRadius } = params;

  // Initialize shader program
  const shaders = buildShader(maps.length);
  const program = yawgl.initProgram(gl, shaders.vert, shaders.frag);
  const { uniformSetters: setters, constructVao } = program;

  // Initialize VAO and indices
  const buffers = yawgl.initQuadBuffers(gl);
  const vao = constructVao(buffers);
  const { vertexCount, type, offset } = buffers.indices;

  return {
    canvas: gl.canvas,
    draw,
    setPixelRatio: (ratio) => { params.getPixelRatio = () => ratio; },
    destroy: () => gl.canvas.remove(),
  };

  function draw(camPos, maxRayTan) {
    program.use();

    // Set uniforms related to camera position
    const lat = camPos[1];
    setters.uLat0(lat);
    setters.uCosLat0(Math.cos(lat));
    setters.uSinLat0(Math.sin(lat));
    setters.uTanLat0(Math.tan(lat));

    const clipLat = Math.min(Math.max(-maxMercLat, lat), maxMercLat);
    setters.uLatErr(lat - clipLat);
    setters.uExpY0(Math.tan(Math.PI / 4 + clipLat / 2));

    setters.uHnorm(camPos[2] / globeRadius);
    setters.uMaxRay(maxRayTan);

    setters.uCamMapPos(maps.flatMap(m => [m.camPos[0], 1.0 - m.camPos[1]]));
    setters.uMapScales(maps.flatMap(m => Array.from(m.scale)));
    setters.uTextureSampler(maps.map(m => m.sampler));

    // Draw the globe
    var resized = yawgl.resizeCanvasToDisplaySize(
      gl.canvas, params.getPixelRatio() );

    // bindFramebufferAndSetViewport
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, params.flipY);
    gl.disable(gl.SCISSOR_TEST);

    gl.clearColor(0.0, 0.0, 0.0, 0.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.bindVertexArray(vao);
    gl.drawElements(gl.TRIANGLES, vertexCount, type, offset);
    gl.bindVertexArray(null);

    return resized;
  }
}
