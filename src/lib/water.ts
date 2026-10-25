import {Color,ShaderChunk} from 'three';

// Water colour as seen through the glass in the source panorama: navy low and to the
// left, brightening towards the light falling from the upper right. Fog fades distant
// geometry into the same colour, so rocks dissolve into the water rather than into a flat tint.
const linear=(hex:string)=>{const c=new Color(hex);return `vec3(${c.r.toFixed(5)},${c.g.toFixed(5)},${c.b.toFixed(5)})`;};
export const waterColor=`
vec3 pelagosWater(vec3 dir,float dark){
 float rise=smoothstep(-.42,.5,dir.x*.75+dir.y*1.05);
 vec3 c=mix(${linear('#00173c')},${linear('#0a4c96')},rise);
 c=mix(c,${linear('#011636')},smoothstep(-.1,-.42,dir.y)*.6);
 vec3 sun=normalize(vec3(.42,.78,-.46));
 c+=${linear('#1a8ad6')}*pow(max(dot(dir,sun),0.),5.)*.9;
 // Past the twilight layer the water goes almost black (dark runs 0–3.4 on the descent page).
 return c*.8*max(.035,1.-dark*.27);
}`;

let installed=false;
export function installWaterFog(){
 if(installed)return;installed=true;
 ShaderChunk.fog_pars_vertex='#ifdef USE_FOG\n varying float vFogDepth;varying vec3 vFogView;\n#endif';
 ShaderChunk.fog_vertex='#ifdef USE_FOG\n vFogDepth=-mvPosition.z;vFogView=mvPosition.xyz;\n#endif';
 ShaderChunk.fog_pars_fragment=`#ifdef USE_FOG
 uniform vec3 fogColor;varying float vFogDepth;varying vec3 vFogView;
 #ifdef FOG_EXP2
  uniform float fogDensity;
 #else
  uniform float fogNear;uniform float fogFar;
 #endif
 ${waterColor}
#endif`;
 // fogColor.r carries the depth layer (0–2) so the page can darken the water without new uniforms.
 ShaderChunk.fog_fragment=`#ifdef USE_FOG
 #ifdef FOG_EXP2
  float fogFactor=1.-exp(-fogDensity*fogDensity*vFogDepth*vFogDepth);
 #else
  float fogFactor=smoothstep(fogNear,fogFar,vFogDepth);
 #endif
 vec3 fogDir=normalize(transpose(mat3(viewMatrix))*vFogView);
 // Red fades first, then green: everything turns bluer with distance before the haze takes over.
 gl_FragColor.rgb*=exp(-vFogDepth*vec3(.065,.026,.008));
 // Fog is applied after the output colour transform, so the water colour is converted too.
 gl_FragColor.rgb=mix(gl_FragColor.rgb,linearToOutputTexel(vec4(pelagosWater(fogDir,fogColor.r),1.)).rgb,fogFactor);
#endif`;
}
