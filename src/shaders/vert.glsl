attribute vec4 aVertexPosition;
uniform vec2 uMaxRay;

varying highp vec2 vRayParm;

void main(void) {
  vRayParm = uMaxRay * aVertexPosition.xy;
  gl_Position = aVertexPosition;
}
