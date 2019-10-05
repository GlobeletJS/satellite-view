import { addCanvas } from "./dom-util.js";
import * as yawgl from 'yawgl';
import { shaders } from "./shaders/shaders.js";
import { setWebMercatorFactors } from "./proj-factors.js";

const nMaps = 2; // NOTE: Also hard-coded in shader!

export function initSatelliteView(view, radius, mapWidth, mapHeight) {
  // Input view is an object created by yawgl.initView
  // Input radius is the (floating point) radius of the spherical Earth
  // Input mapWidth, mapHeight are the pixel dimensions of the maps that
  //  will be supplied to the draw function.

  const canvas = addCanvas(view.element);
  const gl = canvas.getContext("webgl");
  gl.getExtension('OES_standard_derivatives');

  // Initialize shader program
  const progInfo = yawgl.initShaderProgram(gl, shaders.vert, shaders.frag);

  // Load data into GPU for shaders: attribute buffers, indices, textures
  const buffers = yawgl.initQuadBuffers(gl);
  const textureMaker = () => yawgl.initTexture(gl, mapWidth, mapHeight);
  const textures = Array.from(Array(nMaps), textureMaker);

  // Store links to uniforms
  const uniforms = {
    uMaxRay: view.maxRay,

    uCamGeoPos: new Float64Array(3),
    uCosSinTan: new Float64Array(3),

    uMapProjFactors: new Float64Array(2),

    uTextureSampler: textures.map(tx => tx.sampler),
    uCamMapPos: new Float64Array(2 * nMaps),
    uMapScales: new Float64Array(2 * nMaps),
  };

  return { draw };

  function draw(maps, camPos, camMoving) {
    if (maps.length !== nMaps) {
      return console.log("ERROR in renderer.draw: maps array length is wrong!");
    }
    if (!camMoving && !maps.some(map => map.changed)) return;

    // Update uniforms for drawing
    uniforms.uCamGeoPos.set([
        camPos[0],  // Not used!
        camPos[1],
        camPos[2] / radius
    ]);
    uniforms.uCosSinTan.set([
        Math.cos( camPos[1] ),
        Math.sin( camPos[1] ),
        Math.tan( camPos[1] )
    ]);
    setWebMercatorFactors(uniforms.uMapProjFactors, camPos);

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
