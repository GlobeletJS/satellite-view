attribute vec4 aVertexPosition;

uniform vec2 uMaxRay;

varying highp vec2 vRayParm;

void main(void) {
  vRayParm.x = aVertexPosition.x * uMaxRay.x;
  vRayParm.y = aVertexPosition.y * uMaxRay.y;
  gl_Position = aVertexPosition;
}
