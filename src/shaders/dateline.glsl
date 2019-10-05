// NOTE: Uses "fwidth" from the  GL_OES_standard_derivatives extension, which
// must be enabled in the parent program. BUT glslify is confused by extensions
// in modules. See /issues/46... To prevent fwidth from being renamed, require
// this module as follows:
// #pragma glslify: dateline = require(./dateline.glsl,fwidth=fwidth)

float dateline(float x1) {
  // Choose the correct texture coordinate in triangles crossing the
  // antimeridian of a cylindrical coordinate system
  // See http://vcg.isti.cnr.it/~tarini/no-seams/

  // Alternate coordinate: forced across the antimeridian
  float x2 = fract(x1 + 0.5) - 0.5;
  // Choose the coordinate with the smaller screen-space derivative
  return (fwidth(x1) < fwidth(x2) + 0.001) ? x1 : x2;
}

#pragma glslify: export(dateline)
