module.exports = `precision mediump float;
precision mediump int;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform float zPos;

attribute vec3 position;
attribute vec4 color;

varying vec3 vPosition;
varying vec4 vColor;

void main() {
  vPosition = position;
  vColor = color;

  vec3 tPosition = vec3(position);
  tPosition.z = tPosition.z * zPos;

  gl_Position = projectionMatrix * modelViewMatrix * vec4( tPosition, 1.0 );
}`;