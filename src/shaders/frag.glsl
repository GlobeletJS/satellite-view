#extension GL_OES_standard_derivatives : enable
precision highp float;
precision highp sampler2D;

#pragma glslify: diffSqrt = require(./smallmath/diffSqrt.glsl)
#pragma glslify: xyToLonLat = require(./inverseProj.glsl)
#pragma glslify: project = require(./projMercator.glsl)
#pragma glslify: dateline = require(./utils/dateline.glsl,fwidth=fwidth)
#pragma glslify: inside = require(./utils/inside.glsl)
#pragma glslify: dither2x2 = require(./dithering/dither2x2.glsl)
#pragma glslify: horizonTaper = require(./utils/horizonTaper.glsl,fwidth=fwidth)

varying vec2 vRayParm;

// Uniforms: Normalized camera altitude
uniform float uHnorm;
// Texture samplers and coordinate transform parameters
uniform sampler2D uTextureSampler[2];
uniform vec2 uCamMapPos[2];
uniform vec2 uMapScales[2];
// DON'T FORGET TO SET UNIFORMS FOR IMPORTED SUBROUTINES

void main(void) {
  // 0. Pre-compute some values
  float p = length(vRayParm); // Tangent of ray angle
  float p2 = p * p;
  float gamma = p2 * uHnorm * (2.0 + uHnorm);
  float sinC = (uHnorm + diffSqrt(gamma)) * p / (1.0 + p2);
  float cosC = sqrt(1.0 - sinC * sinC);

  // 1. Invert for longitude and latitude perturbations relative to camera
  vec2 dLonLat = xyToLonLat(vRayParm, sinC, cosC);

  // 2. Project dLon, dLat to texture coordinates within each map
  vec2 dMerc = project(dLonLat[0], dLonLat[1]);

  vec2 texCoord0 = uCamMapPos[0] + uMapScales[0] * dMerc;
  texCoord0.x = dateline(texCoord0.x);
  vec2 texCoord1 = uCamMapPos[1] + uMapScales[1] * dMerc;
  texCoord1.x = dateline(texCoord1.x);

  // 3. Lookup color from the appropriate texture
  vec4 texelColor = inside(texCoord1) // Are we inside the hi-res texture?
    ? texture2D(uTextureSampler[1], texCoord1)
    : texture2D(uTextureSampler[0], texCoord0); // Fall back to lo-res

  // Add cosine shading, dithering, and horizon tapering
  vec3 dithered = dither2x2(gl_FragCoord.xy, cosC * texelColor.rgb);
  gl_FragColor = vec4(dithered.rgb, texelColor.a) * horizonTaper(gamma);
}
