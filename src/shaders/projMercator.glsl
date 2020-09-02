const float ONEOVERTWOPI = 0.15915493667125702;

uniform float uExpY0;
uniform float uLatErr; // Difference of clipping to map limit

float smallTan(float x) {
  return (abs(x) < 0.1)
    ? x * (1.0 + x * x / 3.0)
    : tan(x);
}

float log1plusX(float x) {
  return (abs(x) < 0.15)
    ? x * (1.0 - x * (0.5 - x / 3.0 + x * x / 4.0))
    : log( 1.0 + max(x, -0.999) );
}

vec2 projMercator(vec2 dLonLat) {
  float tandlat = smallTan( 0.5 * (dLonLat[1] + uLatErr) );
  float p = tandlat * uExpY0;
  float q = tandlat / uExpY0;
  return vec2(dLonLat[0], log1plusX(q) - log1plusX(-p)) * ONEOVERTWOPI;
}
