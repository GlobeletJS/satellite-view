function setParams(userParams) {
  const {
    context,
    pixelRatio,
    globeRadius = 6371,
    map,
    flipY = false,
  } = userParams;

  const getPixelRatio = (pixelRatio)
    ? () => userParams.pixelRatio
    : () => window.devicePixelRatio;
  // NOTE: getPixelRatio() returns the result of an object getter,
  //       NOT the property value at the time of getPixelRatio definition
  //  Thus, getPixelRatio will mirror any changes in the parent object

  const maps = Array.isArray(map)
    ? map
    : [map];

  if (!context || !(context.gl instanceof WebGLRenderingContext)) {
    throw("satellite-view: no valid WebGLRenderingContext!");
  }

  return { context, getPixelRatio, globeRadius, maps, flipY };
}

var vertexSrc = `attribute vec4 aVertexPosition;
uniform vec2 uMaxRay;

varying highp vec2 vRayParm;

void main(void) {
  vRayParm = uMaxRay * aVertexPosition.xy;
  gl_Position = aVertexPosition;
}
`;

var invertSrc = `uniform float uLat0;
uniform float uCosLat0;
uniform float uSinLat0;
uniform float uTanLat0;

float latChange(float x, float y, float sinC, float cosC) {
  float xtan = x * uTanLat0;
  float curveTerm = 0.5 * y * (xtan * xtan - y * y / 3.0);

  return (max(sinC, abs(sinC * uTanLat0) ) < 0.1)
    ? sinC * (y - sinC * (0.5 * xtan * x + curveTerm * sinC))
    : asin(uSinLat0 * cosC + y * uCosLat0 * sinC) - uLat0;
}

vec2 xyToLonLat(vec2 xy, float sinC, float cosC) {
  vec2 pHat = normalize(xy);
  float dLon = atan(pHat.x * sinC,
      uCosLat0 * cosC - pHat.y * uSinLat0 * sinC);
  float dLat = latChange(pHat.x, pHat.y, sinC, cosC);
  return vec2(dLon, dLat);
}
`;

var projectSrc = `const float ONEOVERTWOPI = 0.15915493667125702;

uniform float uExpY0;
uniform float uLatErr; // Difference of clipping to map limit

float smallTan(float x) {
  return (abs(x) < 0.1)
    ? x * (1.0 + x * x / 3.0)
    : tan(x);
}

float log1plusX(float x) {
  return (abs(x) < 0.15)
    ? x * (1.0 - x * (0.5 - x / 3.0 + x * x / 4.0))
    : log( 1.0 + max(x, -0.999) );
}

vec2 projMercator(vec2 dLonLat) {
  float tandlat = smallTan( 0.5 * (dLonLat[1] + uLatErr) );
  float p = tandlat * uExpY0;
  float q = tandlat / uExpY0;
  return vec2(dLonLat[0], log1plusX(q) - log1plusX(-p)) * ONEOVERTWOPI;
}
`;

function glslInterp(strings, ...expressions) {
  return strings.reduce( (acc, val, i) => acc + expressions[i-1]() + val );
}
var texLookup = (args) => glslInterp`const int nLod = ${args.nLod};

uniform sampler2D uTextureSampler[nLod];
uniform vec2 uCamMapPos[nLod];
uniform vec2 uMapScales[nLod];

float dateline(float x1) {
  // Choose the correct texture coordinate in fragments crossing the
  // antimeridian of a cylindrical coordinate system
  // See http://vcg.isti.cnr.it/~tarini/no-seams/

  // Alternate coordinate: forced across the antimeridian
  float x2 = fract(x1 + 0.5) - 0.5;
  // Choose the coordinate with the smaller screen-space derivative
  return (fwidth(x1) < fwidth(x2) + 0.001) ? x1 : x2;
}

bool inside(vec2 pos) {
  // Check if the supplied texture coordinate falls inside [0,1] X [0,1]
  // We adjust the limits slightly to ensure we are 1 pixel away from the edges
  return (
      0.001 < pos.x && pos.x < 0.999 &&
      0.001 < pos.y && pos.y < 0.999 );
}

vec4 sampleLOD(sampler2D samplers[nLod], vec2 coords[nLod]) {
  return ${args.buildSelector}texture2D(samplers[0], coords[0]);
}

vec4 texLookup(vec2 dMerc) {
  vec2 texCoords[nLod];

  for (int i = 0; i < nLod; i++) {
    texCoords[i] = uCamMapPos[i] + uMapScales[i] * dMerc;
    texCoords[i].x = dateline(texCoords[i].x);
  }

  return sampleLOD(uTextureSampler, texCoords);
}
`;

var dither2x2 = `float threshold(float val, float limit) {
  float decimal = fract(255.0 * val);
  float dithered = (decimal < limit)
    ? 0.0
    : 1.0;
  float adjustment = (dithered - decimal) / 255.0;
  return val + adjustment;
}

vec3 dither2x2(vec2 position, vec3 color) {
  // Based on https://github.com/hughsk/glsl-dither/blob/master/2x2.glsl
  int x = int( mod(position.x, 2.0) );
  int y = int( mod(position.y, 2.0) );
  int index = x + y * 2;

  float limit = 0.0;
  if (index == 0) limit = 0.25;
  if (index == 1) limit = 0.75;
  if (index == 2) limit = 1.00;
  if (index == 3) limit = 0.50;

  // Use limit to toggle color between adjacent 8-bit values
  return vec3(
      threshold(color.r, limit),
      threshold(color.g, limit),
      threshold(color.b, limit)
      );
}
`;

var fragMain = `float diffSqrt(float x) {
  // Returns 1 - sqrt(1-x), with special handling for small x
  float halfx = 0.5 * x;
  return (x < 0.1)
    ? halfx * (1.0 + 0.5 * halfx * (1.0 + halfx))
    : 1.0 - sqrt(1.0 - x);
}

float horizonTaper(float gamma) {
  // sqrt(gamma) = tan(ray_angle) / tan(horizon)
  float horizonRatio = sqrt(gamma);
  float delta = 2.0 * fwidth(horizonRatio);
  return 1.0 - smoothstep(1.0 - delta, 1.0, horizonRatio);
}

varying vec2 vRayParm;
uniform float uHnorm;

void main(void) {
  // 0. Pre-compute some values
  float p = length(vRayParm); // Tangent of ray angle
  float p2 = p * p;
  float gamma = p2 * uHnorm * (2.0 + uHnorm);
  float sinC = (uHnorm + diffSqrt(gamma)) * p / (1.0 + p2);
  float cosC = sqrt(1.0 - sinC * sinC);

  // 1. Invert for longitude and latitude perturbations relative to camera
  vec2 dLonLat = xyToLonLat(vRayParm, sinC, cosC);

  // 2. Project to a change in the Mercator coordinates
  vec2 dMerc = projMercator(dLonLat);

  // 3. Lookup color from the appropriate texture
  vec4 texelColor = texLookup(dMerc);

  // Add cosine shading, dithering, and horizon tapering
  vec3 dithered = dither2x2(gl_FragCoord.xy, cosC * texelColor.rgb);
  gl_FragColor = vec4(dithered.rgb, texelColor.a) * horizonTaper(gamma);
}
`;

const header = `
precision highp float;
precision highp sampler2D;

`;

function buildShader(nLod) {
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
  var selector = ``;
  while (--n) selector += `inside(coords[${n}])
    ? texture2D(samplers[${n}], coords[${n}])
    : `;
  return selector;
}

const maxMercLat = 2.0 * Math.atan( Math.exp(Math.PI) ) - Math.PI / 2.0;

function init(userParams) {
  const params = setParams(userParams);
  const { context, maps, globeRadius } = params;

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
    const resized = context.resizeCanvasToDisplaySize(params.getPixelRatio());

    context.bindFramebufferAndSetViewport();

    context.gl.pixelStorei(context.gl.UNPACK_FLIP_Y_WEBGL, params.flipY);

    context.clear();
    context.draw({ vao });

    return resized;
  }
}

export { init };
