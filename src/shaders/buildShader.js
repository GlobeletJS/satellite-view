import vertexSrc from "./vert.glsl";
import invertSrc from "./inverseProj.glsl";
import projectSrc from "./projMercator.glsl";
import texLookup from "./texLookup.js.glsl";
import dither2x2 from "./dither2x2.glsl";
import fragMain from "./frag.glsl";

const header = `#version 300 es
precision highp float;
precision highp sampler2D;

`;

export function buildShader(nLod) {
  // Input nLod is the number of 'levels of detail' supplied
  // in the set of multi-resolution maps
  nLod = Math.max(1, Math.floor(nLod));

  // Execute the 'tagged template literal' added to texLookup.js.glsl by
  // ../../build/glsl-plugin.js. This will substitute nLod-dependent code
  const args = { // Properties MUST match ./texLookup.js.glsl
    nLod: () => nLod,
    buildSelector: () => buildSelector(nLod),
  };
  const texLookupSrc = texLookup(args);

  // Combine the GLSL-snippets into one shader source
  const fragmentSrc = header + invertSrc + projectSrc +
    texLookupSrc + dither2x2 + fragMain;

  return {
    vert: vertexSrc,
    frag: fragmentSrc,
  };
}

function buildSelector(n) {
  // In the texLookup code, add lines to check each of the supplied textures,
  // and sample the highest LOD that contains the current coordinate
  let selector = ``; // eslint-disable-line quotes
  while (--n) selector += `inside(coords[${n}])
    ? texture(samplers[${n}], coords[${n}])
    : `;
  return selector;
}
