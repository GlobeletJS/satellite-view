float smallTan(float x) {
  // POTENTIAL SLOWDOWN: Beware per-fragment conditionals!
  return (abs(x) < 0.1)
    ? x * (1.0 + x * x / 3.0)
    : tan(x);
}

#pragma glslify: export(smallTan)
