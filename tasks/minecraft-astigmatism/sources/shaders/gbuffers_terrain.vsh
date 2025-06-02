#version 330 compatibility

out vec2 lmcoord;
out vec2 texcoord;
out vec4 glcolor;
out vec3 normal;
out vec4 worldpos;

uniform mat4 gbufferModelViewInverse;
uniform vec3 cameraPosition;



void main() {
	texcoord = (gl_TextureMatrix[0] * gl_MultiTexCoord0).xy;
	lmcoord = (gl_TextureMatrix[1] * gl_MultiTexCoord1).xy;
	glcolor = gl_Color;

	vec3 viewPos = (gl_ModelViewMatrix * gl_Vertex).xyz;
	vec3 eyePlayerPos = mat3(gbufferModelViewInverse) * viewPos;
	worldPos = eyePlayerPos + cameraPosition;

	gl_Position = gl_ModelViewProjectionMatrix * gl_Vertex;
}