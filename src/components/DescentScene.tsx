import {Suspense,useEffect,useMemo,useRef,useState} from 'react';
import {Canvas,useFrame,useThree} from '@react-three/fiber';
import {AdditiveBlending,AmbientLight,BufferGeometry,Color,DirectionalLight,Float32BufferAttribute,FogExp2,Group,HemisphereLight,ShaderMaterial,type PerspectiveCamera} from 'three';
import MarineModel from './MarineModel';
import SceneBoundary from './SceneBoundary';
import WaterHabitat from './WaterHabitat';
import UnderwaterLight from './UnderwaterLight';
import {FishSchool,WaterBackdrop} from './AquariumScene';
import {type ModelName} from '../lib/models';
import {installWaterFog} from '../lib/water';

installWaterFog();

// Camera height at each chapter of the page: just under the surface, sunlit, twilight, midnight.
const STOPS=[3,-8,-32,-58];
const BOTTOM=STOPS[STOPS.length-1];
const FOG=new Color(0,0,0);
const cameraAt=(level:number)=>{const i=Math.min(STOPS.length-2,Math.floor(level));const t=level-i;const s=t*t*(3-2*t);return STOPS[i]+(STOPS[i+1]-STOPS[i])*s;};
// 0 at the surface, 1 at the bottom of the descent.
const darknessAt=(y:number)=>Math.max(0,Math.min(1,(STOPS[0]-y)/(STOPS[0]-BOTTOM)));

type Level={current:number};

function Cruiser({name,size,center,radius,speed,phase,playing,mobile,pitch=0}:{name:ModelName;size:number;center:[number,number,number];radius:[number,number];speed:number;phase:number;playing:boolean;mobile:boolean;pitch?:number}){
  // Animals circle slowly; the far half of the loop dissolves in the water, so they come and go.
  const group=useRef<Group>(null);const time=useRef(phase);
  useFrame((_,delta)=>{
    if(playing)time.current+=Math.min(delta,.05)*speed;
    const g=group.current;if(!g)return;const t=time.current;const k=mobile?.45:1;
    const x=center[0]*k+Math.cos(t)*radius[0]*k,z=center[2]+Math.sin(t)*radius[1];
    const vx=-Math.sin(t)*radius[0],vz=Math.cos(t)*radius[1];
    g.position.set(x,center[1]+Math.sin(t*2.3)*.25,z);
    g.rotation.set(pitch,Math.atan2(vx,vz),Math.sin(t)*.12);
  });
  return <group ref={group}><MarineModel name={name} size={size*(mobile?.8:1)} animated={playing} submerged speed={.5}/></group>;
}

function Drifter({center,playing}:{center:[number,number,number];playing:boolean}){
  const group=useRef<Group>(null);const time=useRef(0);
  useFrame((_,delta)=>{if(playing)time.current+=Math.min(delta,.05);const g=group.current;if(!g)return;const t=time.current;g.position.set(center[0]+Math.sin(t*.07)*.8,center[1]+Math.sin(t*.32)*.35,center[2]);g.rotation.set(.12+Math.sin(t*.32)*.06,t*.04,.08);});
  return <group ref={group}><MarineModel name="jelly" size={1.6} animated={playing} submerged speed={.4}/></group>;
}

// Marine snow fills the whole column: it drifts down, so on the way down it streams past the glass.
function MarineSnow({mobile,playing}:{mobile:boolean;playing:boolean}){
  const time=useRef(0);
  const geometry=useMemo(()=>{const g=new BufferGeometry(),p:number[]=[];const n=mobile?500:1400;for(let i=0;i<n;i++){const a=Math.sin(i*12.9898)*43758.5453,b=Math.sin(i*78.233)*12543.12,c=Math.sin(i*39.425)*24634.6;p.push((a-Math.floor(a)-.5)*44,10-(b-Math.floor(b))*(10-BOTTOM+14),-34+(c-Math.floor(c))*44);}g.setAttribute('position',new Float32BufferAttribute(p,3));return g;},[mobile]);
  const material=useMemo(()=>new ShaderMaterial({transparent:true,depthWrite:false,blending:AdditiveBlending,uniforms:{uTime:{value:0}},vertexShader:`uniform float uTime;varying float vFade;void main(){vec3 p=position;p.y-=mod(uTime*.18+position.x*3.1,3.)-1.5;p.x+=sin(uTime*.2+position.y)*.15;vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=clamp(26./-mv.z,.6,2.4);vFade=smoothstep(40.,6.,-mv.z);}`,fragmentShader:`varying float vFade;void main(){float a=max(0.,1.-length(gl_PointCoord-.5)*2.);gl_FragColor=vec4(.55,.75,.82,a*.22*vFade);}`}),[]);
  useEffect(()=>()=>{geometry.dispose();material.dispose();},[geometry,material]);
  useFrame((_,delta)=>{if(playing)time.current+=Math.min(delta,.05);material.uniforms.uTime.value=time.current;});
  return <points geometry={geometry} material={material} frustumCulled={false}/>;
}

// Below a kilometre the only light is living light: slow blue-green flashes.
function LivingLight({mobile,playing}:{mobile:boolean;playing:boolean}){
  const time=useRef(0);
  const geometry=useMemo(()=>{const g=new BufferGeometry(),p:number[]=[],seed:number[]=[];const n=mobile?90:220;for(let i=0;i<n;i++){const a=Math.sin(i*91.7)*43758.5,b=Math.sin(i*17.3)*24634.6,c=Math.sin(i*53.1)*12543.1;p.push((a-Math.floor(a)-.5)*36,BOTTOM+10-(b-Math.floor(b))*22,-26+(c-Math.floor(c))*34);seed.push(i*1.618%1);}g.setAttribute('position',new Float32BufferAttribute(p,3));g.setAttribute('seed',new Float32BufferAttribute(seed,1));return g;},[mobile]);
  const material=useMemo(()=>new ShaderMaterial({transparent:true,depthWrite:false,fog:false,blending:AdditiveBlending,uniforms:{uTime:{value:0}},vertexShader:`attribute float seed;uniform float uTime;varying float vGlow;void main(){vec3 p=position;p.x+=sin(uTime*.15+seed*40.)*.6;p.y+=sin(uTime*.11+seed*20.)*.4;vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;float pulse=pow(max(0.,sin(uTime*(.35+seed*.5)+seed*60.)),3.);vGlow=(.5+pulse*1.6)*smoothstep(50.,4.,-mv.z);gl_PointSize=clamp((200.+pulse*420.)/-mv.z,3.,30.);}`,fragmentShader:`varying float vGlow;void main(){float d=length(gl_PointCoord-.5)*2.;float a=pow(max(0.,1.-d),2.6);gl_FragColor=vec4(vec3(.25,.95,.85)*a*vGlow,a*vGlow);}`}),[]);
  useEffect(()=>()=>{geometry.dispose();material.dispose();},[geometry,material]);
  useFrame((_,delta)=>{if(playing)time.current+=Math.min(delta,.05);material.uniforms.uTime.value=time.current;});
  return <points geometry={geometry} material={material} frustumCulled={false}/>;
}

function Descent({level,mobile,playing,reduced}:{level:Level;mobile:boolean;playing:boolean;reduced:boolean}){
  const {camera,scene}=useThree() as unknown as {camera:PerspectiveCamera;scene:{fog:FogExp2|null}};
  const sun=useRef<DirectionalLight>(null);const sky=useRef<HemisphereLight>(null);const ambient=useRef<AmbientLight>(null);
  const [layer,setLayer]=useState(0);const shown=useRef(0);
  useEffect(()=>{camera.fov=mobile?52:40;camera.position.set(0,cameraAt(level.current),15);camera.rotation.set(-.04,0,0);camera.updateProjectionMatrix();},[camera,mobile,level]);
  useFrame((_,delta)=>{
    // The camera follows the scroll with a short ease, never with a jump.
    const target=cameraAt(level.current);const ease=reduced?1:1-Math.exp(-Math.min(delta,.1)*5);
    camera.position.y+=(target-camera.position.y)*ease;
    const dark=darknessAt(camera.position.y);const fade=1-dark;
    if(sun.current)sun.current.intensity=3.8*fade*fade;
    if(sky.current)sky.current.intensity=.08+.97*Math.pow(fade,1.5);
    if(ambient.current)ambient.current.intensity=.03+.15*fade;
    const fog=scene.fog;if(fog){fog.color.setRGB(dark*3.4,0,0);fog.density=.028+dark*.03;}
    // The light pass and backdrop take the layer as a prop; refresh them in coarse steps only.
    const stepped=Math.round(dark*3.4*20)/20;if(stepped!==shown.current){shown.current=stepped;setLayer(stepped);}
  });
  return <>
    <WaterHabitat playing={playing} mobile={mobile} layer={Math.min(layer,2)} seabed={false}/>
    <WaterBackdrop layer={layer}/><fogExp2 attach="fog" args={[FOG,.028]}/>
    <ambientLight ref={ambient} intensity={.18}/><hemisphereLight ref={sky} args={['#5a9ad6','#0a2550',1.05]}/>
    <directionalLight ref={sun} position={[10,20,7]} intensity={3.8} color="#a6d6e5"/><directionalLight position={[-5,1,6]} intensity={.6} color="#3173a1"/>
    <MarineSnow mobile={mobile} playing={playing}/>
    <LivingLight mobile={mobile} playing={playing}/>
    <Suspense fallback={null}>
      <group position={[mobile?-1:2,-8,0]}><FishSchool count={mobile?30:70} playing={playing} instant/></group>
      <Cruiser name="manta" size={4.2} center={[3,-5.5,-6]} radius={[8,4]} speed={.09} phase={1} playing={playing} mobile={mobile} pitch={-.15}/>
      {!mobile&&<Cruiser name="kingfish" size={1.5} center={[2,-10.5,-7]} radius={[7,3]} speed={.13} phase={3.5} playing={playing} mobile={mobile}/>}
      <Drifter center={[mobile?1.2:5.5,-3.2,-2]} playing={playing}/>
      <Cruiser name="tuna" size={2.6} center={[3,-30,-8]} radius={[8,4]} speed={.12} phase={.5} playing={playing} mobile={mobile}/>
      <Cruiser name="shark" size={4} center={[1,-34,-11]} radius={[10,5]} speed={.07} phase={2.6} playing={playing} mobile={mobile}/>
      {!mobile&&<Cruiser name="manta" size={3.2} center={[4,-27,-14]} radius={[9,4]} speed={.07} phase={4.4} playing={playing} mobile={mobile} pitch={-.3}/>}
    </Suspense>
    <UnderwaterLight playing={playing} mobile={mobile} layer={layer} floor={-26}/>
  </>;
}

export default function DescentScene(){
  const level=useRef(0);
  const host=useRef<HTMLDivElement>(null);
  const [mounted,setMounted]=useState(false);const [ready,setReady]=useState(false);const [failed,setFailed]=useState(false);
  const [visible,setVisible]=useState(true);const [paused,setPaused]=useState(false);const [reduced,setReduced]=useState(false);const [mobile,setMobile]=useState(false);
  useEffect(()=>{
    setMounted(true);setPaused(document.documentElement.dataset.motionPaused==='true');
    const reducedQuery=matchMedia('(prefers-reduced-motion: reduce)');const mobileQuery=matchMedia('(max-width: 650px)');
    const settings=()=>{setReduced(reducedQuery.matches);setMobile(mobileQuery.matches);};settings();
    reducedQuery.addEventListener('change',settings);mobileQuery.addEventListener('change',settings);
    const descent=(event:Event)=>{level.current=Math.max(0,Math.min(STOPS.length-1,Number((event as CustomEvent).detail)||0));};
    const pause=(event:Event)=>setPaused(Boolean((event as CustomEvent).detail));
    const refresh=()=>setVisible(!document.hidden);
    level.current=Number(document.documentElement.dataset.descent||0);
    window.addEventListener('pelagos:descent',descent);window.addEventListener('pelagos:pause',pause);document.addEventListener('visibilitychange',refresh);
    const timer=setTimeout(()=>setReady(true),400);
    return()=>{clearTimeout(timer);reducedQuery.removeEventListener('change',settings);mobileQuery.removeEventListener('change',settings);window.removeEventListener('pelagos:descent',descent);window.removeEventListener('pelagos:pause',pause);document.removeEventListener('visibilitychange',refresh);};
  },[]);
  // The camera still follows the scroll when motion is paused; only the animals and particles stop.
  const playing=visible&&!paused&&!reduced;
  return <div ref={host} className={`aquarium-live ${ready&&!failed?'is-ready':''}`} aria-hidden="true">
    {mounted&&!failed&&<SceneBoundary onError={()=>setFailed(true)}><Canvas dpr={mobile?1:[1,1.35]} camera={{position:[0,3,15],fov:40,near:.1,far:140}} gl={{alpha:true,antialias:true,powerPreference:'default'}} frameloop={visible?'always':'never'} fallback={null}><Descent level={level} mobile={mobile} playing={playing} reduced={reduced}/></Canvas></SceneBoundary>}
  </div>;
}
