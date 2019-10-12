// NOTE: Uses "fwidth" from the GL_OES_standard_derivatives extension,
// enabled in the parent program. Require as follows to prevent renaming:
// #pragma glslify: horizonTaper = require(./horizonTaper,fwidth=fwidth)

float horizonTaper(float gamma) {
  // sqrt(gamma) = tan(ray_angle) / tan(horizon)
  float horizonRatio = sqrt(gamma);
  float delta = 4.0 * fwidth(horizonRatio);
  float alpha = 1.0 - smoothstep(1.0 - delta, 1.0, horizonRatio);
  return alpha * alpha;
}

#pragma glslify: export(horizonTaper)
