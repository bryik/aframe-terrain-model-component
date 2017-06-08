module.exports = `precision mediump float;
precision mediump int;

//uniform mat4 modelViewMatrix;
//uniform mat4 projectionMatrix;

uniform float zPos;
//attribute vec3 position;
varying vec3 vPosition;

varying vec3 vColor;

void main() {

  vColor = vec3(color);

  vPosition = vec3(position);
  vPosition.z = vPosition.z * zPos;
  gl_Position = projectionMatrix * modelViewMatrix * vec4( vPosition, 1.0 );
}`;