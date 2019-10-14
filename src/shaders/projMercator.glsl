const float ONEOVERTWOPI = 0.15915493667125702;

#pragma glslify: smallTan = require(./smallmath/smallTan.glsl)
#pragma glslify: log1plusX = require(./smallmath/log1plusX.glsl)

uniform float uExpY0;
uniform float uLatErr; // Difference of clipping to map limit

vec2 projMercator(float dLon, float dLat) {
  float tandlat = smallTan( 0.5 * (dLat + uLatErr) );
  float p = tandlat * uExpY0;
  float q = tandlat / uExpY0;
  return vec2(dLon, log1plusX(-p) - log1plusX(q)) * ONEOVERTWOPI;
}

#pragma glslify: export(projMercator)
