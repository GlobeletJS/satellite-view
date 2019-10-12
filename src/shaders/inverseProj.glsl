uniform float uLat0;
uniform float uCosLat0;
uniform float uSinLat0;
uniform float uTanLat0;

float latChange(float x, float y, float sinC, float cosC) {
  float xtan = x * uTanLat0;
  float curveTerm = 0.5 * y * (xtan * xtan - y * y / 3.0);

  // POTENTIAL SLOWDOWN: Beware per-fragment conditionals!
  return (max( abs(sinC), abs(sinC * uTanLat0) ) > 0.1) // TODO: isn't sinC >= 0?
    ? asin(uSinLat0 * cosC + y * uCosLat0 * sinC) - uLat0
    : sinC * (y - sinC * (0.5 * xtan * x + curveTerm * sinC));
}

vec2 xyToLonLat(vec2 xy, float sinC, float cosC) {
  vec2 pHat = normalize(xy);
  float dLon = atan(pHat.x * sinC,
      uCosLat0 * cosC - pHat.y * uSinLat0 * sinC);
  float dLat = latChange(pHat.x, pHat.y, sinC, cosC);
  return vec2(dLon, dLat);
}

#pragma glslify: export(xyToLonLat)
