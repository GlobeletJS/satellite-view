function setParams(userParams) {
  const params = {};

  params.getPixelRatio = (userParams.pixelRatio)
    ? () => userParams.pixelRatio
    : () => window.devicePixelRatio;
  // NOTE: getPixelRatio() returns the result of an object getter,
  //       NOT the property value at the time of getPixelRatio definition
  //  Thus, getPixelRatio will mirror any changes in the parent object

  params.globeRadius = userParams.globeRadius || 6371;

  params.maps = Array.isArray(userParams.map)
    ? userParams.map
    : [userParams.map];

  params.nMaps = params.maps.length;
  params.canvas = addCanvas(userParams.container);

  return params;
}

// Fill a supplied DIV with a background Canvas for rendering
function addCanvas(parentElement) {
  var child = document.createElement('canvas');
  // Could use Object.assign, but not supported by Android Webview?
  setStyles(child, {
    "width": "100%",
    "height": "100%",
    "display": "inline-block",
    "position": "absolute",
    "top": 0,
    "left": 0,
    "z-index": 0,
  });
  parentElement.appendChild(child);
  return child;
}

function setStyles(element, styles) {
  Object.keys(styles).forEach(key => {
    element.style[key] = styles[key];
  });
  return element;
}

function createAttributeSetters(gl, program) {
  // Very similar to greggman's module:
  // https://github.com/gfxfundamentals/webgl-fundamentals/blob/master/
  //  webgl/resources/webgl-utils.js
  var attribSetters = {};
  var numAttribs = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES);
  for (let i = 0; i < numAttribs; i++) {
    var attribInfo = gl.getActiveAttrib(program, i);
    if (!attribInfo) break;
    var index = gl.getAttribLocation(program, attribInfo.name);
    attribSetters[attribInfo.name] = createAttribSetter(gl, index);
  }
  return attribSetters;
}

function createAttribSetter(gl, index) {
  return function(b) {
    // Enable this attribute (shader attributes are disabled by default)
    gl.enableVertexAttribArray(index);
    // Bind the buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, b.buffer);
    // Point the attribute in the program to this buffer,
    // and tell the program the byte layout in the buffer
    gl.vertexAttribPointer(
        index,                      // index of attribute in program
        b.numComponents || b.size,  // Number of elements to read per vertex
        b.type || gl.FLOAT,         // Type of each element
        b.normalize || false,       // Whether to normalize it
        b.stride || 0,              // Byte spacing between vertices
        b.offset || 0               // Byte # to start reading from
        );
  };
}

function setBuffersAndAttributes(gl, setters, buffers) {
  setAttributes(setters, buffers.attributes);
  if (buffers.indices) {
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indices.buffer);
  }
}

function setAttributes(setters, attribs) {
  Object.keys(attribs).forEach( function(name) {
    var setter = setters[name];
    if (setter) setter( attribs[name] );
  });
}

function createUniformSetters(gl, program) {
  // Very similar to greggman's module:
  // https://github.com/greggman/webgl-fundamentals/blob/master/webgl/resources/webgl-utils.js

  var uniformSetters = {};
  var numUniforms = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);

  // Track texture bindpoint index in case multiple textures are required
  var textureUnit = 0;

  for (let i = 0; i < numUniforms; i++) {
    var uniformInfo = gl.getActiveUniform(program, i);
    if (!uniformInfo) break;

    var name = uniformInfo.name;
    // remove the array suffix added by getActiveUniform
    if (name.substr(-3) === "[0]") name = name.substr(0, name.length - 3);

    var setter = createUniformSetter(program, uniformInfo);
    uniformSetters[name] = setter;
  }
  return uniformSetters;

  // This function must be nested to access the textureUnit index
  function createUniformSetter(program, uniformInfo) {
    var loc = gl.getUniformLocation(program, uniformInfo.name);
    var isArray = (uniformInfo.size > 1 && uniformInfo.name.substr(-3) === "[0]");
    var type = uniformInfo.type;
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
      case gl.SAMPLER_CUBE:
        if (isArray) {
          var units = [];
          for (let i = 0; i < uniformInfo.size; i++) {
            units.push(textureUnit++);
          }
          return function(bindPoint, units) {
            return function(textures) {
              gl.uniform1iv(loc, units);
              textures.forEach( function(texture, index) {
                gl.activeTexture(gl.TEXTURE0 + units[index]);
                gl.bindTexture(bindPoint, texture);
              });
            };
          }(getBindPointForSamplerType(gl, type), units);
        } else {
          return function(bindPoint, unit) {
            return function(texture) {
              //gl.uniform1i(loc, units); // Typo? How did it even work?
              gl.uniform1i(loc, unit);
              gl.activeTexture(gl.TEXTURE0 + unit);
              gl.bindTexture(bindPoint, texture);
            };
          }(getBindPointForSamplerType(gl, type), textureUnit++);
        }
     default:  // we should never get here
        throw("unknown type: 0x" + type.toString(16));
    }
  }
}

function getBindPointForSamplerType(gl, type) {
  if (type === gl.SAMPLER_2D)   return gl.TEXTURE_2D;
  if (type === gl.SAMPLER_CUBE) return gl.TEXTURE_CUBE_MAP;
  return undefined;
}

function setUniforms(setters, values) {
  Object.keys(values).forEach( function(name) {
    var setter = setters[name];
    if (setter) setter(values[name]);
  });
}

// Initialize a shader program
function initShaderProgram(gl, vsSource, fsSource) {
  // NOTE: Load any WebGL extensions before calling this

  const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
  const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

  const shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    throw Error('Unable to initialize the shader program: \n' +
        gl.getProgramInfoLog(shaderProgram) );
    return null;
  }

  return {
    program: shaderProgram,
    attributeSetters: createAttributeSetters(gl, shaderProgram),
    uniformSetters: createUniformSetters(gl, shaderProgram),
  };
}

// create shader of a given type, upload source, compile it
function loadShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw Error('An error occurred compiling the shaders: \n' +
        gl.getShaderInfoLog(shader) );
    gl.deleteShader(shader);
    return null;
  }

  return shader;
}

function drawScene(gl, programInfo, bufferInfo, uniforms, viewport) {
  // Make a blank canvas that fills the displayed size from CSS
  prepCanvas(gl, viewport);

  // Tell WebGL to use our program when drawing
  gl.useProgram(programInfo.program);

  // Prepare shader attributes.
  setBuffersAndAttributes( gl, programInfo.attributeSetters, bufferInfo );
  // Set the shader uniforms
  setUniforms( programInfo.uniformSetters, uniforms );

  // Draw the scene
  gl.drawElements(gl.TRIANGLES, bufferInfo.indices.vertexCount,
      bufferInfo.indices.type, bufferInfo.indices.offset);

  // Turn off the scissor test for now  TODO: is this necessary?
  gl.disable(gl.SCISSOR_TEST);
}

function prepCanvas(gl, port) {
  // Set some parameters
  gl.clearColor(0.0, 0.0, 0.0, 0.0);  // Clear to transparent black
  gl.clearDepth(1.0);                 // Clear everything
  gl.enable(gl.DEPTH_TEST);           // Enable depth testing
  gl.depthFunc(gl.LEQUAL);            // Near things obscure far things

  // Tell WebGL how to convert from clip space to pixels
  if (port !== undefined) {
    gl.viewport(port.left, port.bottom, port.width, port.height);
    gl.enable(gl.SCISSOR_TEST);
    gl.scissor(port.left, port.bottom, port.width, port.height);
  } else {
    // Use the whole canvas
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  }

  // Clear the canvas AND the depth buffer
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  return;
}

// Make sure the canvas drawingbuffer is the same size as the display
// webglfundamentals.org/webgl/lessons/webgl-resizing-the-canvas.html
function resizeCanvasToDisplaySize(canvas, multiplier) {
  // multiplier allows scaling. Example: multiplier = window.devicePixelRatio
  multiplier = multiplier || 1;
  multiplier = Math.max(0, multiplier); // Don't allow negative scaling

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

function setupMipMaps(gl, target, width, height) {
  // We are using WebGL1 (for compatibility with mobile browsers) which can't
  // handle mipmapping for non-power-of-2 images. Maybe we should provide
  // pre-computed mipmaps? see https://stackoverflow.com/a/21540856/10082269
  if (isPowerOf2(width) && isPowerOf2(height)) {
    gl.generateMipmap(target);
    // Clamp to avoid wrapping around poles
    // TODO: this may not work with circular coordinates?
    gl.texParameteri(target, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  } else { // Turn off mipmapping 
    gl.texParameteri(target, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    // Set wrapping to clamp to edge
    gl.texParameteri(target, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(target, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }
  return;
}

function setTextureAnisotropy(gl, target) {
  var ext = (
      gl.getExtension('EXT_texture_filter_anisotropic') ||
      gl.getExtension('MOZ_EXT_texture_filter_anisotropic') || 
      gl.getExtension('WEBKIT_EXT_texture_filter_anisotropic')
      );
  if (ext) {
    var maxAnisotropy = gl.getParameter(ext.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
    // BEWARE: this texParameterf call is slow on Intel integrated graphics.
    // Avoid this entire function if at all possible.
    gl.texParameterf(target, ext.TEXTURE_MAX_ANISOTROPY_EXT, 
        maxAnisotropy);
  }
  return;
}

function isPowerOf2(value) {
  // This trick uses bitwise operators.
  // See https://stackoverflow.com/a/30924333/10082269
  return value && !(value & (value - 1));
  // For a better explanation, with some errors in the solution, see
  // https://stackoverflow.com/a/30924360/10082269
}

function initTexture(gl, width, height) {
  // Initializes a 2D texture object, extending the default gl.createTexture()
  // The GL context and the binding target are implicitly saved in the closure.
  // Returns the sampler (as a property) along with update and replace methods.
  // Input data is an ImageData object

  const target = gl.TEXTURE_2D;
  const texture = gl.createTexture();
  gl.bindTexture(target, texture);

  // Initialize with default parameters
  const level = 0;  // Mipmap level
  const internalFormat = gl.RGBA;
  const srcFormat = gl.RGBA;
  const srcType = gl.UNSIGNED_BYTE;
  const border = 0;

  gl.texImage2D(target, level, internalFormat, width, height, border,
      srcFormat, srcType, null);

  // Set up mipmapping and anisotropic filtering, if appropriate
  setupMipMaps(gl, target, width, height);
  setTextureAnisotropy(gl, target);

  return {
    sampler: texture,
    replace,
    update,
  }

  function replace( image ) {
    // Replaces the texture with the supplied image data
    // WARNING: will change texture width/height to match the image
    gl.bindTexture(target, texture);
    gl.texImage2D(target, level, internalFormat, srcFormat, srcType, image);

    // Re-do mipmap setup, since width/height may have changed
    setupMipMaps(gl, target, image.width, image.height);
    return;
  }

  function update( image ) {
    // Updates a portion of the texture with the supplied image data.
    gl.bindTexture(target, texture);

    // Image will be written starting from the pixel (xoffset, yoffset).
    // If these values are not set on the input, use (0,0)
    var xoff = image.xoffset || 0;
    var yoff = image.yoffset || 0;
    gl.texSubImage2D(target, level, xoff, yoff, srcFormat, srcType, image);

    setupMipMaps(gl, target, image.width, image.height);
    return;
  }
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
  return vec2(dLonLat[0], log1plusX(-p) - log1plusX(q)) * ONEOVERTWOPI;
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
#extension GL_OES_standard_derivatives : enable
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

// Maximum latitude for Web Mercator: 85.0113 degrees. Beware rounding!
const maxMercLat = 2.0 * Math.atan( Math.exp(Math.PI) ) - Math.PI / 2.0;

function getWebMercatorFactors(camLatitude) {
  // Clip latitude to map limits
  var clipLat = Math.min(Math.max(-maxMercLat, camLatitude), maxMercLat);
  var latErr = camLatitude - clipLat;

  // camera exp(Y), for converting delta latitude to delta Y
  var expY = Math.tan( 0.25 * Math.PI + 0.5 * clipLat );

  return [expY, latErr];
}

function init(userParams) {
  const params = setParams(userParams);

  const gl = params.canvas.getContext("webgl");
  gl.getExtension('OES_standard_derivatives');

  // Initialize shader program
  const shaders = buildShader(params.nMaps);
  const progInfo = initShaderProgram(gl, shaders.vert, shaders.frag);

  // Load data into GPU for shaders: attribute buffers, indices, textures
  const buffers = initQuadBuffers(gl);
  const textures = params.maps.map(map => {
    return initTexture(gl, map.canvas.width, map.canvas.height);
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
    var resized = resizeCanvasToDisplaySize(
      gl.canvas, params.getPixelRatio() );
    drawScene(gl, progInfo, buffers, uniforms);
    return resized;
  }
}

export { init };
