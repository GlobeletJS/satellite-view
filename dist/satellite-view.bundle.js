function setParams(userParams) {
  const {
    gl,
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

  if (!(gl instanceof WebGLRenderingContext)) {
    throw("satellite-view: no valid WebGLRenderingContext!");
  }

  return { gl, getPixelRatio, globeRadius, maps, flipY };
}

function resizeCanvasToDisplaySize(canvas, multiplier) {
  // Make sure the canvas drawingbuffer is the same size as the display
  // webglfundamentals.org/webgl/lessons/webgl-resizing-the-canvas.html

  // multiplier allows scaling. Example: multiplier = window.devicePixelRatio
  if (!multiplier || multiplier < 0) multplier = 1;

  const width = Math.floor(canvas.clientWidth * multiplier);
  const height = Math.floor(canvas.clientHeight * multiplier);

  // Exit if no change
  if (canvas.width === width && canvas.height === height) return false;

  // Resize drawingbuffer to match resized display
  canvas.width = width;
  canvas.height = height;
  return true;
}

function initQuadBuffers(gl) {
  // 4 vertices at the corners of the quad
  const vertices = [ -1, -1,  0,    1, -1,  0,    1,  1,  0,   -1,  1,  0 ];
  // Store byte info and load into GPU
  const vertexPositions = {
    buffer: gl.createBuffer(),
    numComponents: 3,
    type: gl.FLOAT,
    normalize: false,
    stride: 0,
    offset: 0
  };
  // Bind to the gl context
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositions.buffer);
  // Pass the array into WebGL
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

  // Texture coordinates assume image has 0,0 at top left
  const texCoordData = [ 0, 1,   1, 1,   1, 0,   0, 0 ];
  const texCoords = {
    buffer: gl.createBuffer(),
    numComponents: 2,
    type: gl.FLOAT,
    normalize: false,
    stride: 0,
    offset: 0
  };
  gl.bindBuffer(gl.ARRAY_BUFFER, texCoords.buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoordData), gl.STATIC_DRAW);

  // Index into two triangles
  var indices = [ 0,  1,  2,    2,  3,  0 ];
  const vertexIndices = {
    buffer: gl.createBuffer(),
    vertexCount: indices.length,
    type: gl.UNSIGNED_SHORT,
    offset: 0
  };
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, vertexIndices.buffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

  return {
    attributes: {
      aVertexPosition: vertexPositions,
      aTexCoord: texCoords,
    },
    indices: vertexIndices,
  };
}

function createUniformSetter(gl, program, info, textureUnit) {
  const { name, type, size } = info;
  const isArray = name.endsWith("[0]");
  const loc = gl.getUniformLocation(program, name);

  switch (type) {
    case gl.FLOAT:
      return (isArray)
        ? (v) => gl.uniform1fv(loc, v)
        : (v) => gl.uniform1f(loc, v);
    case gl.FLOAT_VEC2:
      return (v) => gl.uniform2fv(loc, v);
    case gl.FLOAT_VEC3:
      return (v) => gl.uniform3fv(loc, v);
    case gl.FLOAT_VEC4:
      return (v) => gl.uniform4fv(loc, v);
    case gl.INT:
      return (isArray)
        ? (v) => gl.uniform1iv(loc, v)
        : (v) => gl.uniform1i(loc, v);
    case gl.INT_VEC2:
      return (v) => gl.uniform2iv(loc, v);
    case gl.INT_VEC3:
      return (v) => gl.uniform3iv(loc, v);
    case gl.INT_VEC4:
      return (v) => gl.uniform4iv(loc, v);
    case gl.BOOL:
      return (v) => gl.uniform1iv(loc, v);
    case gl.BOOL_VEC2:
      return (v) => gl.uniform2iv(loc, v);
    case gl.BOOL_VEC3:
      return (v) => gl.uniform3iv(loc, v);
    case gl.BOOL_VEC4:
      return (v) => gl.uniform4iv(loc, v);
    case gl.FLOAT_MAT2:
      return (v) => gl.uniformMatrix2fv(loc, false, v);
    case gl.FLOAT_MAT3:
      return (v) => gl.uniformMatrix3fv(loc, false, v);
    case gl.FLOAT_MAT4:
      return (v) => gl.uniformMatrix4fv(loc, false, v);
    case gl.SAMPLER_2D:
      return getTextureSetter(gl.TEXTURE_2D);
    case gl.SAMPLER_CUBE:
      return getTextureSetter(gl.TEXTURE_CUBE_MAP);
    default:  // we should never get here
      throw("unknown type: 0x" + type.toString(16));
  }

  function getTextureSetter(bindPoint) {
    return (isArray)
      ? buildTextureArraySetter(bindPoint)
      : buildTextureSetter(bindPoint);
  }

  function buildTextureSetter(bindPoint) {
    return function(texture) {
      gl.uniform1i(loc, textureUnit);
      gl.activeTexture(gl.TEXTURE0 + textureUnit);
      gl.bindTexture(bindPoint, texture);
    };
  }

  function buildTextureArraySetter(bindPoint) {
    const units = Array.from(Array(size), () => textureUnit++);
    return function(textures) {
      gl.uniform1iv(loc, units);
      textures.forEach((texture, i) => {
        gl.activeTexture(gl.TEXTURE0 + units[i]);
        gl.bindTexture(bindPoint, texture);
      });
    };
  }
}

function createUniformSetters(gl, program) {
  const typeSizes = {
    [gl.FLOAT]: 1,
    [gl.FLOAT_VEC2]: 2,
    [gl.FLOAT_VEC3]: 3,
    [gl.FLOAT_VEC4]: 4,
    [gl.INT]: 1,
    [gl.INT_VEC2]: 2,
    [gl.INT_VEC3]: 3,
    [gl.INT_VEC4]: 4,
    [gl.BOOL]: 1,
    [gl.BOOL_VEC2]: 2,
    [gl.BOOL_VEC3]: 3,
    [gl.BOOL_VEC4]: 4,
    [gl.FLOAT_MAT2]: 4,
    [gl.FLOAT_MAT3]: 9,
    [gl.FLOAT_MAT4]: 16,
    [gl.SAMPLER_2D]: 1,
    [gl.SAMPLER_CUBE]: 1,
  };

  // Collect info about all the uniforms used by the program
  const uniformInfo = Array
    .from({ length: gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS) })
    .map((v, i) => gl.getActiveUniform(program, i))
    .filter(info => info !== undefined);

  const textureTypes = [gl.SAMPLER_2D, gl.SAMPLER_CUBE];
  var textureUnit = 0;

  return uniformInfo.reduce((d, info) => {
    let { name, type, size } = info;
    let isArray = name.endsWith("[0]");
    let key = isArray ? name.slice(0, -3) : name;

    //let setter = createUniformSetter(gl, program, info, textureUnit);
    //d[key] = wrapSetter(setter, isArray, type, size);
    d[key] = createUniformSetter(gl, program, info, textureUnit);

    if (textureTypes.includes(type)) textureUnit += size;

    return d;
  }, {});
}

function initAttributes(gl, program) {
  // Construct a dictionary of the indices of each attribute used by program
  const attrIndices = Array
    .from({ length: gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES) })
    .map((v, i) => gl.getActiveAttrib(program, i))
    .reduce((d, { name }, index) => (d[name] = index, d), {});

  // Construct a dictionary of functions to set a constant value for a given
  // vertex attribute, when a per-vertex buffer is not needed
  const constantSetters = Object.entries(attrIndices).reduce((d, [name, i]) => {
    d[name] = function(v) {
      gl.disableVertexAttribArray(i);

      // For float attributes, the supplied value may be a Number
      if (v.length === undefined) return gl.vertexAttrib1f(i, v);

      if (![1, 2, 3, 4].includes(v.length)) return;
      const methodName = "vertexAttrib" + v.length + "fv";
      gl[methodName](i, v);
    };
    return d;
  }, {});

  function constructVao({ attributes, indices }) {
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    Object.entries(attributes).forEach(([name, a]) => {
      const index = attrIndices[name];
      if (index === undefined) return;

      gl.enableVertexAttribArray(index);
      gl.bindBuffer(gl.ARRAY_BUFFER, a.buffer);
      gl.vertexAttribPointer(
        index,                // index of attribute in program
        a.numComponents || a.size, // Number of elements to read per vertex
        a.type || gl.FLOAT,   // Type of each element
        a.normalize || false, // Whether to normalize it
        a.stride || 0,        // Byte spacing between vertices
        a.offset || 0         // Byte # to start reading from
      );
      gl.vertexAttribDivisor(index, a.divisor || 0);
    });

    if (indices) gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indices.buffer);

    gl.bindVertexArray(null);
    return vao;
  }

  return { constantSetters, constructVao };
}

function initProgram(gl, vertexSrc, fragmentSrc) {
  const program = gl.createProgram();
  gl.attachShader(program, loadShader(gl, gl.VERTEX_SHADER, vertexSrc));
  gl.attachShader(program, loadShader(gl, gl.FRAGMENT_SHADER, fragmentSrc));
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    fail("Unable to link the program", gl.getProgramInfoLog(program));
  }

  const { constantSetters, constructVao } = initAttributes(gl, program);
  const uniformSetters = createUniformSetters(gl, program);

  return {
    uniformSetters: Object.assign(uniformSetters, constantSetters),
    use: () => gl.useProgram(program),
    constructVao,
  };
}

function loadShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    let log = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    fail("An error occured compiling the shader", log);
  }

  return shader;
}

function fail(msg, log) {
  throw Error("yawgl.initProgram: " + msg + ":\n" + log);
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
  const { gl, maps, globeRadius } = params;

  // Initialize shader program
  const shaders = buildShader(maps.length);
  const program = initProgram(gl, shaders.vert, shaders.frag);
  const { uniformSetters: setters, constructVao } = program;

  // Initialize VAO and indices
  const buffers = initQuadBuffers(gl);
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
    var resized = resizeCanvasToDisplaySize(
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

export { init };
