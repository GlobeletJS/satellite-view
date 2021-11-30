#version 300 es

in vec4 aVertexPosition;

uniform vec2 uMaxRay;

out highp vec2 vRayParm;

void main(void) {
  vRayParm = uMaxRay * aVertexPosition.xy;
  gl_Position = aVertexPosition;
}
