#pragma glslify: threshold = require(./threshold.glsl)

vec3 dither4x4(vec2 position, vec3 color) {
  // Based on https://github.com/hughsk/glsl-dither/blob/master/4x4.glsl
  int x = int( mod(position.x, 4.0) );
  int y = int( mod(position.y, 4.0) );
  int index = x + y * 4;

  float limit = 0.0;
  if (index ==  0) limit = 0.0625;
  if (index ==  1) limit = 0.5625;
  if (index ==  2) limit = 0.1875;
  if (index ==  3) limit = 0.6875;
  if (index ==  4) limit = 0.8125;
  if (index ==  5) limit = 0.3125;
  if (index ==  6) limit = 0.9375;
  if (index ==  7) limit = 0.4375;
  if (index ==  8) limit = 0.2500;
  if (index ==  9) limit = 0.7500;
  if (index == 10) limit = 0.1250;
  if (index == 11) limit = 0.6250;
  if (index == 12) limit = 1.0000;
  if (index == 13) limit = 0.5000;
  if (index == 14) limit = 0.8750;
  if (index == 15) limit = 0.3750;

  // Use limit to toggle color between adjacent 8-bit values
  return vec3(
      threshold(color.r, limit),
      threshold(color.g, limit),
      threshold(color.b, limit)
      );
}

#pragma glslify: export(dither4x4)
