float diffSqrt(float x) {
  // Returns 1 - sqrt(1-x), with special handling for small x
  float halfx = 0.5 * x;
  // POTENTIAL SLOWDOWN: Beware per-fragment conditionals!
  return (abs(x) > 0.1)
    ? 1.0 - sqrt(1.0 - x)
    : halfx * (1.0 + 0.5 * halfx * (1.0 + halfx));
}

#pragma glslify: export(diffSqrt)
