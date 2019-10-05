const float HALFPI = 1.5707963705062866;

float atan2(float y, float x) {
  // Follows https://stackoverflow.com/a/26070411/10082269,
  // which might be incorrect or irrelevant
  return ( abs(x) > abs(y) )
    ? atan(y, x)
    : HALFPI - atan(x, y);
}

#pragma glslify: export(atan2)
