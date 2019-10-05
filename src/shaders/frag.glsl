#extension GL_OES_standard_derivatives : enable
precision highp float;
precision highp sampler2D;

#pragma glslify: diffSqrt = require(./smallmath/diffSqrt.glsl)
#pragma glslify: project = require(./projMercator.glsl)
#pragma glslify: dateline = require(./dateline.glsl,fwidth=fwidth)
#pragma glslify: inside = require(./inside.glsl)
#pragma glslify: dither2x2 = require(./dithering/dither2x2.glsl)

varying vec2 vRayParm;

// Camera geographic position
uniform vec3 uCamGeoPos; // [ lon, lat, altitude / earthRadius ]
uniform vec3 uCosSinTan; // [ cos(lat), sin(lat), tan(lat) ]
// Texture samplers
uniform sampler2D uTextureSampler[2];
// Texture coordinate transform parameters.
uniform vec2 uCamMapPos[2];
uniform vec2 uMapScales[2];
// DON'T FORGET TO SET THE PROJECTION UNIFORM uMapProjFactors

float latChange(float lat0, float x, float y, 
    float sinC, float cosC, float cosLat0, float sinLat0, float tanLat0) {
  float lat, xtan, curveTerm, result;
  // POTENTIAL SLOWDOWN: Beware per-fragment conditionals!
  if ( max( abs(sinC), abs(sinC * tanLat0) ) > 0.1 ) {
    lat = asin(sinLat0 * cosC + y * cosLat0 * sinC);
    result = lat - lat0;
  } else {
    xtan = x * tanLat0;
    curveTerm = 0.5 * y * (xtan * xtan - y * y / 3.0);
    result = sinC * (y - sinC * (0.5 * xtan * x + curveTerm * sinC));
  }
  return result;
}

float horizonTaper(float gamma) {
  float visibleRadius = sqrt(gamma);
  float delta = 4.0 * fwidth(visibleRadius);
  float alpha = 1.0 - smoothstep(1.0 - delta, 1.0, visibleRadius);
  return alpha * alpha;
}

void main(void) {
  float tanAlpha = length(vRayParm);
  float tan2alpha = tanAlpha * tanAlpha;
  float gamma = tan2alpha * uCamGeoPos[2] * (2.0 + uCamGeoPos[2]);

  float sinC = (uCamGeoPos[2] + diffSqrt(gamma)) * tanAlpha / (1.0 + tan2alpha);
  float cosC = sqrt(1.0 - sinC * sinC); // numerically unstable? if sinC << 1

  // Solve for longitude and latitude changes relative to screen center
  vec2 normPos = normalize(vRayParm); // what if length(vRayParm) = 0?
  // dLon: beware numerical problems! when sinC << cosC
  float dLon = atan( normPos.x * sinC, 
      uCosSinTan[0] * cosC - normPos.y * uCosSinTan[1] * sinC );
  float dLat = latChange( uCamGeoPos[1], normPos.x, normPos.y,
      sinC, cosC, uCosSinTan[0], uCosSinTan[1], uCosSinTan[2] );

  // Convert dLon, dLat to texture coordinates within each map
  vec2 dMerc = project(dLon, dLat);

  vec2 texCoord0 = uCamMapPos[0] + uMapScales[0] * dMerc;
  texCoord0.x = dateline(texCoord0.x);
  vec2 texCoord1 = uCamMapPos[1] + uMapScales[1] * dMerc;
  texCoord1.x = dateline(texCoord1.x);

  // Lookup color from the appropriate texture
  vec4 texelColor = inside(texCoord1) // Are we inside the hi-res texture?
    ? texture2D(uTextureSampler[1], texCoord1)
    : texture2D(uTextureSampler[0], texCoord0); // Fall back to lo-res

  // Add dithering and tapering
  vec3 dithered = dither2x2(gl_FragCoord.xy, cosC * texelColor.rgb);
  gl_FragColor = vec4(dithered.rgb, texelColor.a) * horizonTaper(gamma);
}
