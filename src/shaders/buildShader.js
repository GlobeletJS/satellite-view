import vertexSrc from "./vert.glsl";
import invertSrc from "./inverseProj.glsl";
import projectSrc from "./projMercator.glsl";
import texLookup from "./texLookup.glsl";
import dither2x2 from "./dither2x2.glsl";
import fragMain from "./frag.glsl";

const header = `
#extension GL_OES_standard_derivatives : enable
precision highp float;
precision highp sampler2D;

`;

export function buildShader(nLod) {
  nLod = Math.max(1, Math.floor(nLod));
  const lodSrc = insideSrc + setupLOD(nLod) + texLookup;

  const fragmentSrc = header + invertSrc + projectSrc + 
    lodSrc + dither2x2 + fragMain;

  return {
    vert: vertexSrc,
    frag: fragmentSrc,
  };
}

function setupLOD(nLod) {
  // Define function signature, with pre-defined constant
  var selector = `const int nLod = ${nLod};
vec4 sampleLOD(sampler2D samplers[${nLod}], vec2 coords[${nLod}]) {
  return `;

  // Sample from the highest LOD that includes the coordinate
  for (let i = nLod - 1; i > 0; i--) {
    selector += `inside(coords[${i}])
    ? texture2D(samplers[${i}], coords[${i}])
    : `;
  }
  // Add default to lowest LOD
  selector += `texture2D(samplers[0], coords[0]);`;

  // Close the function block: bracket AND line break
  selector += `
}
`
  return selector;
}

const insideSrc = `
bool inside(vec2 pos) {
  // Check if the supplied texture coordinate falls inside [0,1] X [0,1]
  // We adjust the limits slightly to ensure we are 1 pixel away from the edges
  return (
      0.001 < pos.x && pos.x < 0.999 &&
      0.001 < pos.y && pos.y < 0.999 );
}
`;
