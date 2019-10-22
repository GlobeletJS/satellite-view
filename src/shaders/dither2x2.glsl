float threshold(float val, float limit) {
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
