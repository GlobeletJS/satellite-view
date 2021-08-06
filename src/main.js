import { setParams } from "./params.js";
import { buildShader } from "./shaders/buildShader.js";

export function init(userParams) {
  const { PI, cos, sin, tan, atan, exp, min, max } = Math;
  const maxMercLat = 2.0 * atan(exp(PI)) - PI / 2.0;

  const params = setParams(userParams);
  const { context, maps, globeRadius, unitsPerRad } = params;

  // Initialize shader program
  const shaders = buildShader(maps.length);
  const program = context.initProgram(shaders.vert, shaders.frag);
  const { uniformSetters: setters, constructVao } = program;

  // Initialize VAO
  const aVertexPosition = context.initQuad();
  const vao = constructVao({ attributes: { aVertexPosition } });

  return {
    canvas: context.gl.canvas,
    draw,
    setPixelRatio: (ratio) => { params.getPixelRatio = () => ratio; },
    destroy: () => context.gl.canvas.remove(),
  };

  function draw(camPos, maxRayTan) {
    program.use();

    // Set uniforms related to camera position
    const lat = camPos[1] / unitsPerRad;
    setters.uLat0(lat);
    setters.uCosLat0(cos(lat));
    setters.uSinLat0(sin(lat));
    setters.uTanLat0(tan(lat));

    const clipLat = min(max(-maxMercLat, lat), maxMercLat);
    setters.uLatErr(lat - clipLat);
    setters.uExpY0(tan(PI / 4 + clipLat / 2));

    setters.uHnorm(camPos[2] / globeRadius);
    setters.uMaxRay(maxRayTan);

    setters.uCamMapPos(maps.flatMap(m => [m.camPos[0], 1.0 - m.camPos[1]]));
    setters.uMapScales(maps.flatMap(m => Array.from(m.scale)));
    setters.uTextureSampler(maps.map(m => m.sampler));

    // Draw the globe
    const resized = context.resizeCanvasToDisplaySize(params.getPixelRatio());
    context.bindFramebufferAndSetViewport();
    context.gl.pixelStorei(context.gl.UNPACK_FLIP_Y_WEBGL, params.flipY);
    context.clear();
    context.draw({ vao });

    return resized;
  }
}
