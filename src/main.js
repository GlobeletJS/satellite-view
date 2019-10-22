import { addCanvas } from "./dom-util.js";
import * as yawgl from 'yawgl';
//import { shaders } from "./shaders/old/shaders.js";
import { buildShader } from "./shaders/buildShader.js";
import { getWebMercatorFactors } from "./proj-factors.js";

const nMaps = 2; // NOTE: Also hard-coded in shader!

export function initSatelliteView(container, radius, mapWidth, mapHeight) {
  // Input container is an HTML element that will be filled with a canvas
  //  on which will the view will be rendered
  // Input radius is the (floating point) radius of the spherical Earth
  // Input mapWidth, mapHeight are the pixel dimensions of the maps that
  //  will be supplied to the draw function.

  const canvas = addCanvas(container);
  const gl = canvas.getContext("webgl");
  gl.getExtension('OES_standard_derivatives');

  // Initialize shader program
  const shaders = buildShader(nMaps);
  console.log(shaders.frag);
  const progInfo = yawgl.initShaderProgram(gl, shaders.vert, shaders.frag);

  // Load data into GPU for shaders: attribute buffers, indices, textures
  const buffers = yawgl.initQuadBuffers(gl);
  const textureMaker = () => yawgl.initTexture(gl, mapWidth, mapHeight);
  const textures = Array.from(Array(nMaps), textureMaker);

  // Store links to uniform arrays
  const uniforms = {
    uMaxRay: new Float64Array(2),
    uTextureSampler: textures.map(tx => tx.sampler),
    uCamMapPos: new Float64Array(2 * nMaps),
    uMapScales: new Float64Array(2 * nMaps),
  };

  return {
    canvas,
    draw,
  };

  function draw(maps, camPos, maxRayTan, camMoving) {
    if (maps.length !== nMaps) {
      return console.log("ERROR in renderer.draw: maps array length is wrong!");
    }
    if (!camMoving && !maps.some(map => map.changed)) return;

    // Update uniforms related to camera position
    uniforms.uHnorm = camPos[2] / radius;
    uniforms.uLat0 = camPos[1];
    uniforms.uCosLat0 = Math.cos(camPos[1]);
    uniforms.uSinLat0 = Math.sin(camPos[1]);
    uniforms.uTanLat0 = Math.tan(camPos[1]);
    [uniforms.uExpY0, uniforms.uLatErr] = getWebMercatorFactors(camPos[1]);

    uniforms.uMaxRay.set(maxRayTan);

    // Set uniforms and update textures for each map
    maps.forEach( (map, index) => {
      uniforms.uCamMapPos.set(map.camPos, 2 * index);
      uniforms.uMapScales.set(map.scale, 2 * index);
      if (map.changed) textures[index].update(map.canvas);
    });

    // Draw the globe
    yawgl.resizeCanvasToDisplaySize(canvas);
    yawgl.drawScene(gl, progInfo, buffers, uniforms);
  }
}
