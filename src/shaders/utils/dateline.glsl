// NOTE: Uses "fwidth" from the  GL_OES_standard_derivatives extension, which
// enabled in the parent program. Require as follows to prevent renaming
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
