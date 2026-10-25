import {useEffect,useMemo,useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import {AdditiveBlending,BufferGeometry,DoubleSide,Float32BufferAttribute,ShaderMaterial} from 'three';
import Seabed from './Seabed';

export default function WaterHabitat({playing,mobile,layer,seabed=true}:{playing:boolean;mobile:boolean;layer:number;seabed?:boolean}){
 const time=useMemo(()=>({value:0}),[]);
 const clock=useRef(0);
 const surface=useMemo(()=>new ShaderMaterial({side:DoubleSide,transparent:true,depthWrite:false,uniforms:{uTime:time,uDark:{value:0}},vertexShader:`varying vec3 vWorld;uniform float uTime;void main(){vec3 p=position;p.z+=sin(p.x*.7+uTime*.37)*.09+sin(p.y*.9-uTime*.29)*.045;vec4 world=modelMatrix*vec4(p,1.);vWorld=world.xyz;gl_Position=projectionMatrix*viewMatrix*world;}`,fragmentShader:`varying vec3 vWorld;uniform float uTime;uniform float uDark;void main(){vec2 p=vWorld.xz;vec3 n=normalize(vec3(-.063*cos(p.x*.7+uTime*.37),1.,-.04*cos(p.y*.9-uTime*.29)));vec3 eye=normalize(cameraPosition-vWorld);float fresnel=pow(1.-abs(dot(n,eye)),3.);vec3 light=normalize(vec3(.45,1.,.2));float glint=pow(max(0.,dot(reflect(-light,n),eye)),90.);float distanceFade=exp(-length(cameraPosition-vWorld)*.023)*smoothstep(112.,80.,length(cameraPosition-vWorld));vec3 c=mix(vec3(.025,.16,.22),vec3(.18,.48,.59),fresnel)+glint*.3;gl_FragColor=vec4(c*(1.-uDark*.22),distanceFade*distanceFade*.26);#include <colorspace_fragment>
}`.replace(';#include',';\n#include')}),[time]);
 const dust=useMemo(()=>{const geometry=new BufferGeometry(),p=[];for(let i=0;i<(mobile?80:220);i++)p.push(Math.sin(i*127.1)*18,Math.cos(i*73.7)*7,-4-(i%43)*.8);geometry.setAttribute('position',new Float32BufferAttribute(p,3));return geometry;},[mobile]);
 const dustMaterial=useMemo(()=>new ShaderMaterial({transparent:true,depthWrite:false,blending:AdditiveBlending,uniforms:{uTime:time},vertexShader:`uniform float uTime;void main(){vec3 p=position;p.x+=sin(uTime*.12+position.y)*.14;p.y+=sin(uTime*.09+position.x)*.06;vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=clamp(19./-mv.z,.5,1.6);}`,fragmentShader:`void main(){float a=max(0.,1.-length(gl_PointCoord-.5)*2.);gl_FragColor=vec4(.42,.68,.8,a*.13);}`}),[time]);
 useEffect(()=>()=>surface.dispose(),[surface]);
 useEffect(()=>()=>dust.dispose(),[dust]);
 useEffect(()=>()=>dustMaterial.dispose(),[dustMaterial]);
 useFrame((_,delta)=>{if(playing)clock.current+=Math.min(delta,.08);time.value=clock.current;surface.uniforms.uDark.value=layer;});
 return <group>
  {seabed&&<Seabed time={time}/>}
  <mesh rotation={[-Math.PI/2,0,0]} position={[0,8.5,-30]} material={surface}><planeGeometry args={[240,240,mobile?32:64,mobile?32:64]}/></mesh>
  {seabed&&<points geometry={dust} material={dustMaterial}/>}
 </group>;
}
