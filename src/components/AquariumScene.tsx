import {Suspense,useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {Canvas,useFrame,useLoader,useThree} from '@react-three/fiber';
import {Box3,Color,DoubleSide,Group,InstancedMesh,Mesh,MeshStandardMaterial,Object3D,ShaderMaterial,Vector2,Vector3,type WebGLProgramParametersWithUniforms} from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import MarineModel from './MarineModel';
import SceneBoundary from './SceneBoundary';
import WaterHabitat from './WaterHabitat';
import {modelUrl,type ModelName} from '../lib/models';
import {url} from '../lib/paths';

type Pointer={current:Vector2};
function SwimmingAnimal({name,size,origin,phase=0,playing,onReady,featured=false,instant=false,onArrivalStage}:{name:ModelName;size:number;origin:[number,number,number];phase?:number;playing:boolean;onReady?:()=>void;featured?:boolean;instant?:boolean;onArrivalStage?:(stage:string)=>void}){
  const group=useRef<Group>(null);const elapsed=useRef(phase);const arrival=useRef(0);const reveal=useRef(0);const travel=useRef(0);const stage=useRef('waiting');const {size:viewport}=useThree();
  useFrame((_,delta)=>{
    if(playing)elapsed.current+=Math.min(delta,.05);
    const time=elapsed.current;const mobile=viewport.width<650;
    if(!group.current)return;
    const isRay=name==='manta';
    if(featured){
      if(instant||(!playing&&arrival.current===0))arrival.current=5.2;else if(playing)arrival.current+=Math.min(delta,.05);
      const progress=Math.max(0,Math.min(1,(arrival.current-.65)/4.5));
      travel.current=progress*progress*progress*(progress*(progress*6-15)+10);
      const visibility=Math.min(1,progress/.62);reveal.current=visibility*visibility*(3-2*visibility);
      const next=progress===1?'settled':progress>.42?'approaching':progress>.03?'silhouette':'waiting';
      if(next!==stage.current){stage.current=next;onArrivalStage?.(next);}
    }
    const x=isRay?origin[0]+Math.sin(time*.095)*.85:origin[0]+Math.sin(time*.07+phase)*1.4;
    const distance=featured?1-travel.current:0;
    const framedX=mobile&&featured?(x-origin[0])*.25:mobile?x*.32:x;
    group.current.position.set(framedX+distance*.7,origin[1]+(mobile&&featured?.9:0)+Math.sin(time*.14+phase)*.17+distance*.25,origin[2]+Math.cos(time*.08)*.4-distance*9);
    if(isRay)group.current.rotation.set(-.58+Math.sin(time*.12)*.035,(featured?-.55:-.42)+Math.cos(time*.095)*(featured?.04:.1)+distance*.14,(featured?-.20:.12)+Math.sin(time*.15)*(featured?.025:.04)+distance*.07);
    else if(name==='turtle')group.current.rotation.set(-.08,.9+Math.cos(time*.07)*.12,.05+Math.sin(time*.17)*.025);
    else if(name==='jelly')group.current.rotation.set(.08,Math.sin(time*.06)*.2,.08);
    else group.current.rotation.set(.02,-.8+Math.sin(time*.07)*.18,.03+Math.sin(time*.12)*.02);
    group.current.scale.setScalar(mobile?(isRay?.6:.75):1);
  });
  return <group ref={group} position={origin}><MarineModel name={name} size={size} animated={playing} submerged onReady={onReady} reveal={featured?reveal:undefined} speed={name==='manta'?.65:.55}/></group>;
}

function FishSchool({count,playing}:{count:number;playing:boolean}){
  const gltf=useLoader(GLTFLoader,modelUrl('sardine'));
  const mesh=useRef<InstancedMesh>(null);const time=useRef(0);const shader=useRef<WebGLProgramParametersWithUniforms|null>(null);
  const {geometry,material}=useMemo(()=>{
    gltf.scene.updateMatrixWorld(true);let source:Mesh|null=null;gltf.scene.traverse(object=>{if(!source&&object instanceof Mesh)source=object;});
    if(!source)throw new Error('Fish model has no geometry');
    const fish=source as Mesh;const geometry=fish.geometry.clone().applyMatrix4(fish.matrixWorld);const box=new Box3().setFromBufferAttribute(geometry.attributes.position as never);const center=box.getCenter(new Vector3());const bounds=box.getSize(new Vector3());geometry.translate(-center.x,-center.y,-center.z);geometry.scale(.43/Math.max(bounds.x,bounds.y,bounds.z),.43/Math.max(bounds.x,bounds.y,bounds.z),.43/Math.max(bounds.x,bounds.y,bounds.z));
    const original=(Array.isArray(fish.material)?fish.material[0]:fish.material) as MeshStandardMaterial;
    const material=new MeshStandardMaterial({map:original.map||null,color:new Color('#c1d6df'),roughness:.66,metalness:0,side:DoubleSide});
    material.onBeforeCompile=compiled=>{compiled.uniforms.uSwim={value:0};compiled.vertexShader='uniform float uSwim;\n'+compiled.vertexShader;compiled.vertexShader=compiled.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n float tailWeight=pow(clamp((-position.z+0.02)/0.3,0.0,1.0),2.0); transformed.x+=sin(uSwim*6.0+float(gl_InstanceID)*1.31)*0.022*tailWeight;');shader.current=compiled;};
    return {geometry,material};
  },[gltf]);
  const dummy=useMemo(()=>new Object3D(),[]);const target=useMemo(()=>new Vector3(),[]);
  useEffect(()=>()=>{geometry.dispose();material.dispose();},[geometry,material]);
  useFrame((_,delta)=>{
    if(playing)time.current+=Math.min(delta,.05);
    if(shader.current)shader.current.uniforms.uSwim.value=time.current;
    if(!mesh.current)return;
    const t=time.current*.065;
    for(let i=0;i<count;i++){
      const lane=i%2;const p=t+lane*2.2;const seed=i*2.39996;const radius=Math.sqrt((i+.5)/count);
      const x=Math.sin(p)*7.5+Math.cos(seed)*radius*2.4;
      const y=.1+Math.sin(seed)*radius*.85+Math.sin(time.current*.35+seed)*.07;
      const z=-7+Math.cos(p)*2.2+Math.cos(seed*1.73)*.9;
      dummy.position.set(x,y,z);target.set(x+Math.cos(p)*7.5,y,z-Math.sin(p)*2.2);dummy.lookAt(target);dummy.scale.setScalar(.7+(i%7)*.065);dummy.updateMatrix();mesh.current.setMatrixAt(i,dummy.matrix);
    }
    mesh.current.instanceMatrix.needsUpdate=true;
  });
  return <instancedMesh ref={mesh} args={[geometry,material,count]} frustumCulled={false}/>;
}

function WaterOptics({pointer,playing}:{pointer:Pointer;playing:boolean}){
  const {viewport,size}=useThree();const time=useRef(0);const smooth=useMemo(()=>new Vector2(.5,.5),[]);
  const material=useMemo(()=>new ShaderMaterial({transparent:true,depthWrite:false,uniforms:{uTime:{value:0},uPointer:{value:new Vector2(.5,.5)},uAspect:{value:1},uPointerStrength:{value:0}},vertexShader:'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:`varying vec2 vUv;uniform float uTime;uniform vec2 uPointer;uniform float uAspect;uniform float uPointerStrength;
    void main(){vec2 delta=(vUv-uPointer)*vec2(uAspect,1.0);float influence=exp(-length(delta)*9.0)*uPointerStrength;float refraction=sin(vUv.y*38.0+vUv.x*21.0+uTime*.45+influence*2.0);float ray=pow(max(0.0,sin(vUv.x*23.0+vUv.y*7.0+sin(uTime*.14)*.14)),18.0);float rim=pow(max(0.0,refraction),10.0);float alpha=ray*.018+rim*influence*.085;gl_FragColor=vec4(.55,.83,.93,alpha);}`}),[]);
  useEffect(()=>()=>material.dispose(),[material]);
  useFrame((_,delta)=>{if(playing)time.current+=Math.min(delta,.05);smooth.lerp(pointer.current,1-Math.exp(-Math.min(delta,.05)*3));material.uniforms.uTime.value=time.current;material.uniforms.uPointer.value.copy(smooth);material.uniforms.uAspect.value=size.width/size.height;material.uniforms.uPointerStrength.value=playing&&size.width>650?1:0;});
  return <mesh position={[0,0,5]}><planeGeometry args={[viewport.width*.68,viewport.height*.68]}/><primitive object={material} attach="material"/></mesh>;
}

function WaterWorld({mode,playing,pointer,mobile,onReady,layer,reduced,onArrivalStage}:{mode:'aquarium'|'virtual';playing:boolean;pointer:Pointer;mobile:boolean;onReady:()=>void;layer:number;reduced:boolean;onArrivalStage:(stage:string)=>void}){
  return <>
    <WaterHabitat playing={playing} mobile={mobile} layer={layer}/>
    <fogExp2 attach="fog" args={['#10517a',.039+layer*.013]}/>
    <ambientLight intensity={.35}/><hemisphereLight args={['#89b8d0','#082b4a',.75]}/>
    <directionalLight position={[6,8,7]} intensity={3.1} color="#a6d6e5"/><directionalLight position={[-5,1,6]} intensity={1.1} color="#3173a1"/>
    <Suspense fallback={null}>
      <SwimmingAnimal name="manta" size={5.4} origin={[3.5,1.8,-2]} playing={playing} onReady={onReady} featured instant={reduced} onArrivalStage={onArrivalStage}/>
      <FishSchool count={mobile?28:64} playing={playing}/>
      <SwimmingAnimal name="turtle" size={1.6} origin={[-3.6,-1.1,-3]} phase={18} playing={playing}/>
      {!mobile&&<><SwimmingAnimal name="manta" size={2} origin={[-4,2.1,-8]} phase={42} playing={playing}/><SwimmingAnimal name="kingfish" size={1.35} origin={[1,-1.1,-4]} phase={8} playing={playing}/><SwimmingAnimal name="kingfish" size={1.1} origin={[6,-1.7,-6]} phase={24} playing={playing}/></>}
      {mode==='virtual'&&<><SwimmingAnimal name="shark" size={3.4} origin={[-4,-.2,-5]} phase={10} playing={playing}/>{!mobile&&<SwimmingAnimal name="tuna" size={2.3} origin={[4,-2,-8]} phase={30} playing={playing}/>}<SwimmingAnimal name="jelly" size={1.1} origin={[2,2.7,-5]} phase={6} playing={playing}/></>}
    </Suspense>
    <WaterOptics pointer={pointer} playing={playing}/>
  </>;
}

export default function AquariumScene({mode='aquarium'}:{mode?:'aquarium'|'virtual'}){
  const host=useRef<HTMLDivElement>(null);const pointer=useRef(new Vector2(.5,.5));
  const [mounted,setMounted]=useState(false);const [ready,setReady]=useState(false);const [visible,setVisible]=useState(true);const [paused,setPaused]=useState(false);const [reduced,setReduced]=useState(false);const [mobile,setMobile]=useState(false);const [layer,setLayer]=useState(0);
  const [failed,setFailed]=useState(false);
  const [arrivalStage,setArrivalStage]=useState('waiting');
  const onReady=useCallback(()=>setReady(true),[]);
  const onError=useCallback(()=>{setFailed(true);setReady(true);},[]);
  useEffect(()=>{
    setMounted(true);setPaused(document.documentElement.dataset.motionPaused==='true');const reducedQuery=matchMedia('(prefers-reduced-motion: reduce)');const mobileQuery=matchMedia('(max-width: 650px)');
    const settings=()=>{setReduced(reducedQuery.matches);setMobile(mobileQuery.matches);};settings();reducedQuery.addEventListener('change',settings);mobileQuery.addEventListener('change',settings);
    const element=host.current;const parent=element?.closest('section')||element;let within=true;let rect=parent?.getBoundingClientRect();
    const refreshVisibility=()=>setVisible(within&&!document.hidden);
    const observer=new IntersectionObserver(entries=>{within=entries[0].isIntersecting;refreshVisibility();},{rootMargin:'64px'});if(element)observer.observe(element);
    const move=(event:PointerEvent)=>{if(!rect||event.pointerType!=='mouse'||reducedQuery.matches)return;pointer.current.set(Math.max(0,Math.min(1,(event.clientX-rect.left)/rect.width)),1-Math.max(0,Math.min(1,(event.clientY-rect.top)/rect.height)));};
    const leave=()=>pointer.current.set(.5,.5);const measure=()=>{rect=parent?.getBoundingClientRect();};
    const pause=(event:Event)=>setPaused(Boolean((event as CustomEvent).detail));
    const depth=(event:Event)=>setLayer(Math.max(0,Math.min(2,Number((event as CustomEvent).detail)||0)));
    parent?.addEventListener('pointermove',move as EventListener,{passive:true});parent?.addEventListener('pointerleave',leave);window.addEventListener('resize',measure,{passive:true});window.addEventListener('scroll',measure,{passive:true});document.addEventListener('visibilitychange',refreshVisibility);window.addEventListener('pelagos:pause',pause);window.addEventListener('pelagos:depth',depth);
    return()=>{observer.disconnect();reducedQuery.removeEventListener('change',settings);mobileQuery.removeEventListener('change',settings);parent?.removeEventListener('pointermove',move as EventListener);parent?.removeEventListener('pointerleave',leave);window.removeEventListener('resize',measure);window.removeEventListener('scroll',measure);document.removeEventListener('visibilitychange',refreshVisibility);window.removeEventListener('pelagos:pause',pause);window.removeEventListener('pelagos:depth',depth);};
  },[]);
  const playing=visible&&!paused&&!reduced;
  return <div ref={host} className={`aquarium-live ${ready?'is-ready':''}`} data-layer={layer} data-arrival={arrivalStage} aria-hidden="true">
    <div className="live-environment" style={{backgroundImage:`url(${url(failed?'media/panorama.webp':'media/backdrop-unlit.webp')})`}}/>
    {mounted&&!failed&&<SceneBoundary onError={onError}><Canvas dpr={mobile?1:[1,1.35]} camera={{position:[0,0,15],fov:40,near:.1,far:70}} gl={{alpha:true,antialias:true,powerPreference:'default'}} frameloop={playing?'always':'demand'} fallback={null}><WaterWorld mode={mode} playing={playing} pointer={pointer} mobile={mobile} onReady={onReady} layer={layer} reduced={reduced} onArrivalStage={setArrivalStage}/></Canvas></SceneBoundary>}
  </div>;
}

