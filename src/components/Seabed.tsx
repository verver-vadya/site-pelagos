import {useEffect,useMemo} from 'react';
import {useLoader} from '@react-three/fiber';
import {Color,Matrix4,Mesh,MeshStandardMaterial,PerspectiveCamera,RepeatWrapping,SRGBColorSpace,TextureLoader,type BufferGeometry,type Texture,type WebGLProgramParametersWithUniforms} from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {url} from '../lib/paths';

// The relief is reconstructed from the panorama (scripts/seabed/): the same rocks stand
// where the photograph shows them, but as real geometry lit by the scene.
// Textures have no UVs on a heightfield, so rock and sand are projected from three axes.
export const caustics=`
float waterPattern(vec3 p,float t){
 vec2 q=p.xz*.85+vec2(-p.y*.37,p.y*.13);
 q+=vec2(sin(q.y*.8+t*.22),cos(q.x*.7-t*.18))*.32;
 float a=sin(q.x*3.7+sin(q.y*2.8+t*.31));
 float b=sin(q.y*4.1+cos(q.x*2.4-t*.27));
 return pow(max(0.,1.-abs(a+b)*.65),13.);
}`;
const FLOOR=-6;
// The camera the panorama was matched to (same as the scene camera on a 16:9 screen).
const reference=new PerspectiveCamera(40,1672/941,.1,120);reference.position.set(0,0,15);reference.updateMatrixWorld();
const referenceViewProjection=new Matrix4().multiplyMatrices(reference.projectionMatrix,reference.matrixWorldInverse);

function seabedMaterial(t:Record<'rock'|'rockNormal'|'rockRough'|'sand'|'sandNormal'|'detail',Texture>,time:{value:number}){
 // Water absorbs the warm end of daylight first: the seabed is tinted blue-green at any distance.
 const material=new MeshStandardMaterial({color:new Color('#3f7bb4'),roughness:.95,metalness:0});
 material.onBeforeCompile=(shader:WebGLProgramParametersWithUniforms)=>{
  Object.assign(shader.uniforms,{uWaterTime:time,uRock:{value:t.rock},uRockN:{value:t.rockNormal},uRockR:{value:t.rockRough},uSand:{value:t.sand},uSandN:{value:t.sandNormal},uDetail:{value:t.detail},uReference:{value:referenceViewProjection}});
  shader.vertexShader='varying vec3 vSeabed;varying vec3 vSeabedNormal;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvSeabed=(modelMatrix*vec4(position,1.)).xyz;vSeabedNormal=normalize(mat3(modelMatrix)*objectNormal);');
  shader.fragmentShader=`varying vec3 vSeabed;varying vec3 vSeabedNormal;uniform float uWaterTime;uniform sampler2D uRock;uniform sampler2D uRockN;uniform sampler2D uRockR;uniform sampler2D uSand;uniform sampler2D uSandN;uniform sampler2D uDetail;uniform mat4 uReference;
${caustics}
vec3 blendWeights(vec3 n){vec3 w=pow(abs(n),vec3(5.));return w/(w.x+w.y+w.z);}
vec4 triplanar(sampler2D map,vec3 p,vec3 w,float s){return texture2D(map,p.zy*s)*w.x+texture2D(map,p.xz*s)*w.y+texture2D(map,p.xy*s)*w.z;}
// Whiteout blend of tangent-space normals onto each projection axis.
vec3 triplanarNormal(sampler2D map,vec3 p,vec3 n,vec3 w,float s,float strength){
 vec3 tx=texture2D(map,p.zy*s).xyz*2.-1.,ty=texture2D(map,p.xz*s).xyz*2.-1.,tz=texture2D(map,p.xy*s).xyz*2.-1.;
 tx.xy*=strength;ty.xy*=strength;tz.xy*=strength;
 vec3 nx=vec3(0.,tx.y,tx.x)*sign(n.x),ny=vec3(ty.x,0.,ty.y)*sign(n.y),nz=vec3(tz.x,tz.y,0.)*sign(n.z);
 return normalize(n+nx*w.x+ny*w.y+nz*w.z);
}
// Fine relief of the photograph, projected back through the camera it was taken from.
float photoRelief(vec3 p){
 vec4 clip=uReference*vec4(p,1.);vec2 uv=clip.xy/clip.w*.5+.5;
 float inside=step(0.,uv.x)*step(uv.x,1.)*step(0.,uv.y)*step(uv.y,1.)*step(0.,clip.w);
 return mix(1.,texture2D(uDetail,uv).r*255./128.,inside);
}
float rockAmount(vec3 p,vec3 n){
 float lift=smoothstep(.12,.55,p.y-(${FLOOR.toFixed(1)}));
 float steep=smoothstep(.82,.55,n.y);
 return clamp(max(lift,steep),0.,1.);
}
`+shader.fragmentShader
   .replace('#include <map_fragment>',`
 vec3 seabedN=normalize(vSeabedNormal);vec3 seabedW=blendWeights(seabedN);float rocky=rockAmount(vSeabed,seabedN);
 vec3 rockColor=triplanar(uRock,vSeabed,seabedW,.42).rgb;
 vec3 sandColor=texture2D(uSand,vSeabed.xz*.32).rgb*vec3(.86,.94,.95);
 float relief=photoRelief(vSeabed);
 diffuseColor.rgb*=mix(sandColor,rockColor,rocky)*pow(relief,1.3);
 float mottling=sin(vSeabed.x*.9+sin(vSeabed.z*.6))*sin(vSeabed.z*1.1+vSeabed.y*.7);
 diffuseColor.rgb*=.9+mottling*.1;`)
   .replace('#include <roughnessmap_fragment>',`float roughnessFactor=mix(.97,triplanar(uRockR,vSeabed,seabedW,.42).g*.35+.65,rocky);`)
   .replace('#include <normal_fragment_maps>',`
 vec3 worldDetail=normalize(mix(triplanarNormal(uSandN,vSeabed,seabedN,vec3(0.,1.,0.),.32,.6),triplanarNormal(uRockN,vSeabed,seabedN,seabedW,.42,1.15),rocky));
 normal=normalize((viewMatrix*vec4(worldDetail,0.)).xyz);
 normal=normalize(normal+vec3(-dFdx(relief),-dFdy(relief),0.)*2.4);`)
   // Repeat the photo's local contrast after the haze too, so distant rocks keep their structure.
   .replace('#include <fog_fragment>','#include <fog_fragment>\n gl_FragColor.rgb*=pow(relief,1.15);')
   .replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
 float caustic=waterPattern(vSeabed,uWaterTime);
 float upward=clamp(seabedN.y*.5+.5,.15,1.);
 totalEmissiveRadiance+=diffuseColor.rgb*vec3(.09,.23,.28)*caustic*upward*(1.-rocky*.35);
 // Light scattered by the water itself: shadowed faces stay deep blue, never black.
 totalEmissiveRadiance+=vec3(.0,.011,.034);`);
 };
 material.customProgramCacheKey=()=>'pelagos-seabed-v1';
 return material;
}

export default function Seabed({time}:{time:{value:number}}){
 const gltf=useLoader(GLTFLoader,url('models/seabed.glb'));
 const [rock,rockNormal,rockRough,sand,sandNormal,detail]=useLoader(TextureLoader,['rock-diff','rock-nor','rock-rough','sand-diff','sand-nor','photo-detail'].map(name=>url(`media/seabed/${name}.webp`)));
 const seabed=useMemo(()=>{
  let geometry:BufferGeometry|null=null;
  gltf.scene.updateMatrixWorld(true);
  gltf.scene.traverse(object=>{if(!geometry&&object instanceof Mesh)geometry=object.geometry.clone().applyMatrix4(object.matrixWorld);});
  if(!geometry)throw new Error('Seabed model has no geometry');
  const relief=geometry as BufferGeometry;relief.computeVertexNormals();
  [rock,rockNormal,rockRough,sand,sandNormal].forEach(texture=>{texture.wrapS=texture.wrapT=RepeatWrapping;texture.anisotropy=4;texture.needsUpdate=true;});
  rock.colorSpace=sand.colorSpace=SRGBColorSpace;
  return {geometry:relief,material:seabedMaterial({rock,rockNormal,rockRough,sand,sandNormal,detail},time)};
 },[gltf,rock,rockNormal,rockRough,sand,sandNormal,detail,time]);
 useEffect(()=>()=>{seabed.geometry.dispose();seabed.material.dispose();},[seabed]);
 return <mesh geometry={seabed.geometry} material={seabed.material} castShadow receiveShadow/>;
}
