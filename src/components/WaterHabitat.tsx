import {useEffect,useMemo,useRef} from 'react';
import {useFrame,useLoader} from '@react-three/fiber';
import {AdditiveBlending,BufferGeometry,Color,DoubleSide,Float32BufferAttribute,Mesh,MeshStandardMaterial,PlaneGeometry,ShaderMaterial,type WebGLProgramParametersWithUniforms} from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {url} from '../lib/paths';

// World-space light patterns are shared by the sand and scanned rock surfaces.
const caustics=`
float waterPattern(vec3 p,float t){
 vec2 q=p.xz*.85+vec2(-p.y*.37,p.y*.13);
 q+=vec2(sin(q.y*.8+t*.22),cos(q.x*.7-t*.18))*.32;
 float a=sin(q.x*3.7+sin(q.y*2.8+t*.31));
 float b=sin(q.y*4.1+cos(q.x*2.4-t*.27));
 return pow(max(0.,1.-abs(a+b)*.65),13.);
}`;
function submergedMaterial(source:MeshStandardMaterial,time:{value:number},sand=false){
 const material=source.clone();
 material.color.lerp(new Color('#416574'),.26);material.roughness=.91;material.metalness=0;
 material.onBeforeCompile=(shader:WebGLProgramParametersWithUniforms)=>{
  shader.uniforms.uWaterTime=time;
  shader.vertexShader='varying vec3 vSeabed;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvSeabed=(modelMatrix*vec4(position,1.)).xyz;');
  shader.fragmentShader='varying vec3 vSeabed;uniform float uWaterTime;\n'+caustics+'\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   float mottling=sin(vSeabed.x*17.+sin(vSeabed.z*11.))*sin(vSeabed.z*21.+vSeabed.y*13.);
   diffuseColor.rgb*=.94+mottling*.06;
   ${sand?'diffuseColor.rgb*=.89+.11*sin(vSeabed.z*24.+sin(vSeabed.x*1.8)*2.);':''}`);
  shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
   float caustic=waterPattern(vSeabed,uWaterTime);
   float upward=clamp(normal.y*.5+.5,.15,1.);
   totalEmissiveRadiance+=diffuseColor.rgb*vec3(.09,.23,.28)*caustic*upward;`);
 };
 material.customProgramCacheKey=()=>sand?'pelagos-sand-v2':'pelagos-rock-v2';
 return material;
}
// Low foreground, a central corridor and stepped right-hand cliffs follow the original panorama.
const formations:[number,number,number,number,number,number][]=[
 [10,-5.4,-5,2.8,.16,1.9],[12,-3.9,-10,3.2,-.6,2.5],[13,-2.4,-17,3.8,.8,3.2],
 [8,-4.5,-12,2.1,1.8,1.8],[7,-4.9,-3,1.9,-1.2,1.7],[5,-5.1,-8,1.7,.6,1.8],
 [4,-5.2,-16,2,2.2,2.2],[1,-5.4,-13,1.45,.5,1.8],[-2,-5.6,-19,1.7,-.7,1.5],
 [-11,-5.8,-5,2.3,-.8,1.2],[-10,-5.7,-15,3,1.3,1.5],[-13,-5.1,-23,3.8,.3,1.7],
 [15,-3.5,-29,4.5,-.3,3.4],[7,-5.3,-30,2.8,2.3,1.8],[-4,-5.5,-33,3,.7,1.4],
 [3,-5.7,3,.65,.8,.8],[-5,-5.8,1,.9,2.2,.8],[6,-5.3,-1,.7,1.4,1.1],
];
export default function WaterHabitat({playing,mobile,layer}:{playing:boolean;mobile:boolean;layer:number}){
 const gltf=useLoader(GLTFLoader,url('models/coast-rocks.glb'));
 const time=useMemo(()=>({value:0}),[]);
 const clock=useRef(0);
 const rocks=useMemo(()=>{
  const objects:Mesh[]=[];
  gltf.scene.updateMatrixWorld(true);
  gltf.scene.traverse(object=>{if(object instanceof Mesh)objects.push(object);});
  return objects.map(mesh=>({geometry:mesh.geometry.clone().applyMatrix4(mesh.matrixWorld),material:submergedMaterial((Array.isArray(mesh.material)?mesh.material[0]:mesh.material) as MeshStandardMaterial,time)}));
 },[gltf,time]);
 const ground=useMemo(()=>{
  const geometry=new PlaneGeometry(90,100,mobile?80:144,mobile?90:160);geometry.rotateX(-Math.PI/2);geometry.translate(0,-6,-26);
  const p=geometry.attributes.position;
  for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i);p.setY(i,-6+Math.sin(x*.23+z*.11)*.17+Math.cos(z*.3)*.1+Math.sin(z*9+x*.3)*.018);}
  geometry.computeVertexNormals();
  const material=submergedMaterial(new MeshStandardMaterial({color:'#71817d',roughness:1}),time,true);
  return {geometry,material};
 },[mobile,time]);
 const surface=useMemo(()=>new ShaderMaterial({side:DoubleSide,transparent:true,depthWrite:false,uniforms:{uTime:time,uDark:{value:0}},vertexShader:`varying vec3 vWorld;uniform float uTime;void main(){vec3 p=position;p.z+=sin(p.x*.7+uTime*.37)*.09+sin(p.y*.9-uTime*.29)*.045;vec4 world=modelMatrix*vec4(p,1.);vWorld=world.xyz;gl_Position=projectionMatrix*viewMatrix*world;}`,fragmentShader:`varying vec3 vWorld;uniform float uTime;uniform float uDark;void main(){vec2 p=vWorld.xz;vec3 n=normalize(vec3(-.063*cos(p.x*.7+uTime*.37),1.,-.04*cos(p.y*.9-uTime*.29)));vec3 eye=normalize(cameraPosition-vWorld);float fresnel=pow(1.-abs(dot(n,eye)),3.);vec3 light=normalize(vec3(.45,1.,.2));float glint=pow(max(0.,dot(reflect(-light,n),eye)),90.);float distanceFade=exp(-length(cameraPosition-vWorld)*.023);vec3 c=mix(vec3(.025,.16,.22),vec3(.18,.48,.59),fresnel)+glint*.3;gl_FragColor=vec4(c*(1.-uDark*.22),distanceFade*distanceFade*.26);#include <colorspace_fragment>
}`.replace(';#include',';\n#include')}),[time]);
 const dust=useMemo(()=>{const geometry=new BufferGeometry(),p=[];for(let i=0;i<(mobile?80:220);i++)p.push(Math.sin(i*127.1)*18,Math.cos(i*73.7)*7,-4-(i%43)*.8);geometry.setAttribute('position',new Float32BufferAttribute(p,3));return geometry;},[mobile]);
 const dustMaterial=useMemo(()=>new ShaderMaterial({transparent:true,depthWrite:false,blending:AdditiveBlending,uniforms:{uTime:time},vertexShader:`uniform float uTime;void main(){vec3 p=position;p.x+=sin(uTime*.12+position.y)*.14;p.y+=sin(uTime*.09+position.x)*.06;vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=clamp(19./-mv.z,.5,1.6);}`,fragmentShader:`void main(){float a=max(0.,1.-length(gl_PointCoord-.5)*2.);gl_FragColor=vec4(.42,.68,.8,a*.13);}`}),[time]);
 useEffect(()=>()=>{rocks.forEach(r=>{r.geometry.dispose();r.material.dispose();});},[rocks]);
 useEffect(()=>()=>{ground.geometry.dispose();ground.material.dispose();},[ground]);
 useEffect(()=>()=>surface.dispose(),[surface]);
 useEffect(()=>()=>dust.dispose(),[dust]);
 useEffect(()=>()=>dustMaterial.dispose(),[dustMaterial]);
 useFrame((_,delta)=>{if(playing)clock.current+=Math.min(delta,.08);time.value=clock.current;surface.uniforms.uDark.value=layer;});
 return <group>
  <mesh geometry={ground.geometry} material={ground.material} receiveShadow/>
  {formations.filter((_,i)=>!mobile||i<15).map(([x,y,z,scale,turn,height],i)=><group key={i} position={[x,y,z]} rotation={[.03*Math.sin(i),turn,.04*Math.cos(i)]} scale={[scale,height,scale]}>{rocks.map((rock,j)=><mesh key={j} geometry={rock.geometry} material={rock.material} castShadow receiveShadow/>)}</group>)}
  <mesh rotation={[-Math.PI/2,0,0]} position={[0,8.5,-30]} material={surface}><planeGeometry args={[240,240,mobile?32:64,mobile?32:64]}/></mesh>
  <points geometry={dust} material={dustMaterial}/>
 </group>;
}
