import {Suspense,useCallback,useEffect,useRef,useState} from 'react';
import {Canvas,useFrame} from '@react-three/fiber';
import {Group} from 'three';
import MarineModel from './MarineModel';
import SceneBoundary from './SceneBoundary';
import {isModelName,type ModelName} from '../lib/models';

function Turntable({name,rotation,onReady,animated}:{name:ModelName;rotation:{current:number};onReady:()=>void;animated:boolean}){
  const group=useRef<Group>(null);
  useFrame(()=>{if(group.current)group.current.rotation.y=rotation.current;});
  return <group ref={group} rotation={[name==='manta'?.65:name==='turtle'?.5:name==='octopus'?-.45:.05,.8,0]}><MarineModel name={name} size={name==='manta'?4.8:4} animated={animated} onReady={onReady}/></group>;
}
export default function CreatureViewer({model,label,poster=false}:{model:string;label:string;poster?:boolean}){
  const [started,setStarted]=useState(poster);
  const [ready,setReady]=useState(false);
  const [hydrated,setHydrated]=useState(false);
  const [reducedMotion,setReducedMotion]=useState(false);
  const invalidate=useRef<()=>void>(()=>{});
  const initialRotation=model==='octopus'?0:['shark','sardine','kingfish','tuna'].includes(model)?1.15:.8;
  const rotation=useRef(initialRotation);
  const drag=useRef<{id:number;x:number}|null>(null);
  const onReady=useCallback(()=>setReady(true),[]);
  useEffect(()=>setHydrated(true),[]);
  useEffect(()=>{const query=window.matchMedia('(prefers-reduced-motion: reduce)');const sync=()=>setReducedMotion(query.matches);sync();query.addEventListener('change',sync);return()=>query.removeEventListener('change',sync);},[]);
  if(!isModelName(model))return null;
  const animated=['jelly','manta','shark','sardine','kingfish','tuna'].includes(model)&&!reducedMotion;
  return <div className={`creature-viewer ${ready?'ready':''} ${poster?'poster-view':''}`}>
    {!started?<button className="viewer-start action" disabled={!hydrated} onClick={()=>setStarted(true)} aria-label={`Рассмотреть в 3D: ${label}`}>Рассмотреть в 3D <span aria-hidden="true">↗</span></button>:<>
      <div className="viewer-canvas" role="img" aria-label={`Трёхмерная модель: ${label}`} onPointerDown={event=>{if(event.button!==0)return;drag.current={id:event.pointerId,x:event.clientX};event.currentTarget.setPointerCapture(event.pointerId);}} onPointerMove={event=>{if(drag.current?.id!==event.pointerId)return;rotation.current+=(event.clientX-drag.current.x)*.012;drag.current.x=event.clientX;invalidate.current();}} onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}}>
        <SceneBoundary fallback={<p className="viewer-message">3D недоступно. Изображение и описание остаются доступными.</p>}><Canvas dpr={[1,1.5]} camera={{position:[0,0,8],fov:40}} gl={{alpha:true,antialias:true,powerPreference:'low-power'}} onCreated={state=>{invalidate.current=state.invalidate;}} fallback={<p className="viewer-message">На этом устройстве доступно статичное изображение.</p>} frameloop={animated?'always':'demand'}><ambientLight intensity={1.4}/><directionalLight position={[3,5,6]} intensity={3} color="#d6eaf0"/><directionalLight position={[-4,0,3]} intensity={1.4} color="#5b96b5"/><Suspense fallback={null}><Turntable name={model} rotation={rotation} onReady={onReady} animated={animated}/></Suspense></Canvas></SceneBoundary>
      </div>
      {!ready&&<p className="viewer-message" role="status">Готовим 3D-наблюдение…</p>}
      {!poster&&<div className="viewer-controls" aria-label="Поворот модели"><button onClick={()=>{rotation.current-=.35;invalidate.current();}} aria-label="Повернуть влево">←</button><button onClick={()=>{rotation.current=initialRotation;invalidate.current();}} aria-label="Исходное положение">По центру</button><button onClick={()=>{rotation.current+=.35;invalidate.current();}} aria-label="Повернуть вправо">→</button></div>}
    </>}
  </div>;
}
