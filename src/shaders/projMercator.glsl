// Store 0.5 / PI.
// NOTE: Nvidia says it would be better to set it as a uniform??
// https://docs.nvidia.com/drive/nvvib_docs/
// NVIDIA%20DRIVE%20Linux%20SDK%20Development%20Guide/baggage/
// tegra_gles2_performance.pdf
const float ONEOVERTWOPI = 0.15915493667125702;

#pragma glslify: smallTan = require(./smallmath/smallTan.glsl)
#pragma glslify: log1plusX = require(./smallmath/log1plusX.glsl)

uniform vec2 uMapProjFactors; // exp(camY), latitude clipping difference

vec2 projMercator(float dLon, float dLat) {
  float tandlat = smallTan( 0.5 * (dLat + uMapProjFactors[1]) );
  float p = tandlat * uMapProjFactors[0];
  float q = tandlat / uMapProjFactors[0];
  return vec2(dLon, log1plusX(-p) - log1plusX(q)) * ONEOVERTWOPI;
}

#pragma glslify: export(projMercator)
