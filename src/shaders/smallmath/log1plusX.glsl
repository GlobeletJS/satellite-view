float log1plusX(float x) {
  // POTENTIAL SLOWDOWN: Beware per-fragment conditionals!
  return (abs(x) > 0.15)
    ? log( 1.0 + max(x, -0.999) )
    : x * (1.0 - x * (0.5 - x / 3.0 + x * x / 4.0));
}

#pragma glslify: export(log1plusX)
