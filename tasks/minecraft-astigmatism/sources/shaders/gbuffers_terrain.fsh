#version 330 compatibility

uniform sampler2D lightmap;
uniform sampler2D gtexture;
uniform sampler2D key;

uniform float alphaTestRef = 0.1;
uniform vec3 cameraPosition;

in vec2 lmcoord;
in vec2 texcoord;
in vec4 glcolor;
in vec3 worldPos;

/* RENDERTARGETS: 0 */
layout(location = 0) out vec4 color;

void main() {
	color = texture(gtexture, texcoord) * glcolor;
	color *= texture(lightmap, lmcoord);
	if (color.a < alphaTestRef) {
		discard;
	}

	if (worldPos.y < 25) {
		int posX = int(cameraPosition.x);
		int posY = int(cameraPosition.y);
		int posZ = int(cameraPosition.z);
		int bX = int(worldPos.x);
		int bZ = int(worldPos.z);
		vec4 e = texelFetch(key, ivec2((posX * 2 + bX * 3) * (posY ^ 0x5C), posZ * 4 + bZ * 9) % ivec2(1499, 1499), 0);
		color = mix(color, 1 - color, e.r);
	}
}