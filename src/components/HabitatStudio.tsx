import {Suspense,useEffect,useMemo,useState} from 'react';
import {Canvas,useThree} from '@react-three/fiber';
import {Color,type PerspectiveCamera} from 'three';
import MarineModel from './MarineModel';
import WaterHabitat from './WaterHabitat';
import UnderwaterLight from './UnderwaterLight';
import {WaterBackdrop} from './AquariumScene';
import {isModelName,type ModelName} from '../lib/models';
import {installWaterFog} from '../lib/water';

installWaterFog();
type V=[number,number,number];
type Shot={camera:V;look:V;fov:number;layer:number;position:V;rotation:V;size:number};
// Where each animal is photographed: open water under the light, or down among the rocks.
export const shots:Record<ModelName,Shot>={
 manta:{camera:[0,0,15],look:[0,.5,0],fov:34,layer:0,position:[.3,.4,4],rotation:[-.5,-.5,-.15],size:5.6},
 shark:{camera:[0,0,15],look:[0,0,0],fov:34,layer:.6,position:[.5,-.2,5],rotation:[.05,-1.1,0],size:5.2},
 tuna:{camera:[0,0,15],look:[0,0,0],fov:34,layer:.3,position:[.5,-.1,6],rotation:[.05,-1.1,0],size:4.2},
 kingfish:{camera:[0,0,15],look:[0,-.5,0],fov:34,layer:.1,position:[.3,-.6,7],rotation:[.04,-1.15,0],size:3.6},
 sardine:{camera:[0,0,15],look:[0,0,0],fov:34,layer:0,position:[.6,.4,5],rotation:[.04,-1.15,0],size:.75},
 turtle:{camera:[3,-2.5,3],look:[4,-4.6,-6],fov:38,layer:.2,position:[4,-3.6,-3],rotation:[.45,-.5,0],size:3.6},
 octopus:{camera:[2,-2,2],look:[3.5,-5,-5],fov:38,layer:.4,position:[3.9,-4.3,-3],rotation:[0,.6,0],size:5.5},
 jelly:{camera:[0,-1,15],look:[0,1.5,0],fov:36,layer:1.1,position:[1.2,1.2,6],rotation:[.05,.8,0],size:3},
};
// A still, dense ball of fish for the sardine card; the home scene's school is spread out for motion.
const school=Array.from({length:42},(_,i):V=>{const r=Math.cbrt((i+.5)/42),a=i*2.39996,b=Math.acos(1-2*((i*.618)%1));return [Math.cos(a)*Math.sin(b)*r*3.4,Math.cos(b)*r*1.3,Math.sin(a)*Math.sin(b)*r*1.8];});
const parse=(value:string|null,fallback:V):V=>{const parts=value?.split(',').map(Number);return parts&&parts.length===3&&parts.every(Number.isFinite)?parts as V:fallback;};

function Rig({shot}:{shot:Shot}){
 const camera=useThree(state=>state.camera) as PerspectiveCamera;
 useEffect(()=>{camera.position.set(...shot.camera);camera.fov=shot.fov;camera.lookAt(...shot.look);camera.updateProjectionMatrix();},[camera,shot]);
 return null;
}

export default function HabitatStudio({model}:{model:string}){
 const [ready,setReady]=useState(false);
 const shot=useMemo(()=>{
  if(!isModelName(model))return null;const query=new URLSearchParams(location.search);const base=shots[model];
  return {camera:parse(query.get('cam'),base.camera),look:parse(query.get('look'),base.look),position:parse(query.get('pos'),base.position),rotation:parse(query.get('rot'),base.rotation),fov:Number(query.get('fov')||base.fov),layer:Number(query.get('layer')??base.layer),size:Number(query.get('size')||base.size)};
 },[model]);
 useEffect(()=>{if(ready)document.documentElement.dataset.ready='true';},[ready]);
 if(!shot||!isModelName(model))return null;
 return <div style={{position:'fixed',inset:0}}><Canvas shadows dpr={1} camera={{position:shot.camera,fov:shot.fov,near:.1,far:120}} gl={{antialias:true,preserveDrawingBuffer:true}} frameloop="always">
  <Rig shot={shot}/>
  <WaterHabitat playing={false} mobile={false} layer={shot.layer}/>
  <WaterBackdrop layer={shot.layer}/><fogExp2 attach="fog" args={[new Color(shot.layer,0,0),.028+shot.layer*.01]}/>
  <ambientLight intensity={.18}/><hemisphereLight args={['#5a9ad6','#0a2550',1.05]}/>
  <directionalLight position={[10,20,7]} intensity={3.8} color="#a6d6e5" castShadow shadow-mapSize={[1024,1024]} shadow-camera-left={-24} shadow-camera-right={24} shadow-camera-top={20} shadow-camera-bottom={-20} shadow-camera-far={90} shadow-bias={-.0004} shadow-normalBias={.025}/><directionalLight position={[-5,1,6]} intensity={1.1} color="#3173a1"/>
  <Suspense fallback={null}>
   {model==='sardine'?<group position={shot.position}>{school.map((fish,i)=><group key={i} position={fish} rotation={[shot.rotation[0],shot.rotation[1]+Math.sin(i*7.3)*.14,shot.rotation[2]]}><MarineModel name="sardine" size={shot.size} animated={false} submerged onReady={i===0?()=>setReady(true):undefined}/></group>)}</group>:<group position={shot.position} rotation={shot.rotation}><MarineModel name={model} size={shot.size} animated={false} submerged onReady={()=>setReady(true)}/></group>}
  </Suspense>
  <UnderwaterLight playing={false} mobile={false} layer={shot.layer}/>
 </Canvas></div>;
}
