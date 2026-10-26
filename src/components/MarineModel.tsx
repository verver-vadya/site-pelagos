import {useEffect,useMemo,useRef} from 'react';
import {useFrame,useLoader} from '@react-three/fiber';
import {AnimationMixer,Box3,BufferGeometry,Color,DoubleSide,Group,Mesh,MeshStandardMaterial,Vector3,type Material} from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {clone} from 'three/examples/jsm/utils/SkeletonUtils.js';
import {modelUrl,type ModelName} from '../lib/models';
import {createJellyOralArms} from '../lib/jellyOralArms';
import {createJellyBellPulse} from '../lib/jellyBellPulse';

type Props={name:ModelName;size?:number;animated?:boolean;speed?:number;submerged?:boolean;onReady?:()=>void;reveal?:{current:number}};
export default function MarineModel({name,size=4,animated=true,speed=.7,submerged=false,onReady,reveal}:Props){
  const gltf=useLoader(GLTFLoader,modelUrl(name));
  const phase=useRef(0);
  const model=useMemo(()=>{
    const source=clone(gltf.scene);
    const materials:Material[]=[];const addedGeometry:BufferGeometry[]=[];
    const bellPulse=name==='jelly'?createJellyBellPulse(source):undefined;
    if(bellPulse)addedGeometry.push(...bellPulse.geometries);
    const opacity=new Map<Material,number>();
    const helpers:Mesh[]=[];
    source.traverse(object=>{
      if(!(object instanceof Mesh))return;
      const originals=Array.isArray(object.material)?object.material:[object.material];
      // The jellyfish export includes the author's cube guides in material_0.
      // Exclude them before framing so only the animal contributes to its bounds.
      if((name==='jelly'&&originals.every(material=>material.name==='material_0'||/Moon-Jelly_OralArm/.test(material.name)))||(name==='octopus'&&originals.every(material=>material.name==='Material.001'))){helpers.push(object);return;}
      const converted=originals.map(original=>{
        const old=original as MeshStandardMaterial;
        const jellyOpacity=/Tentacle|OralArm/.test(old.name)?.82:/Bell1/.test(old.name)?.63:/Bell2/.test(old.name)?.4:.46;
        const material=new MeshStandardMaterial({map:old.map||null,normalMap:old.normalMap||null,color:old.color?.clone()||new Color('white'),roughness:name==='jelly'?.28:.82,metalness:0,side:DoubleSide,transparent:name==='jelly'||old.transparent,opacity:name==='jelly'?jellyOpacity:old.opacity??1,depthWrite:name!=='jelly'});
        material.color.lerp(new Color('#6797b2'),submerged?.09:name==='jelly'?.08:.025);
        opacity.set(material,material.opacity);
        if(reveal){material.transparent=true;material.opacity=0;}
        materials.push(material);return material;
      });
      object.material=Array.isArray(object.material)?converted:converted[0];
      object.frustumCulled=false;object.castShadow=submerged;object.receiveShadow=submerged;
    });
    helpers.forEach(helper=>helper.removeFromParent());
    const content=new Group();content.add(source);
    let oralArms:ReturnType<typeof createJellyOralArms>|undefined;
    if(name==='jelly'){
      oralArms=createJellyOralArms();
      // Keep the oral arms below the bell's underside; their roots meet at its central mouth.
      oralArms.group.position.set(0,-.04,0);
      oralArms.group.rotation.z=-.72;
      oralArms.group.scale.setScalar(.72);
      opacity.set(oralArms.material,oralArms.material.opacity);
      materials.push(oralArms.material);
      addedGeometry.push(...oralArms.geometries);
      content.add(oralArms.group);
    }
    const box=new Box3().setFromObject(content);
    const center=box.getCenter(new Vector3());
    const dimensions=box.getSize(new Vector3());
    const centered=new Group();centered.position.copy(center).negate();centered.add(content);
    const root=new Group();root.scale.setScalar(size/Math.max(dimensions.x,dimensions.y,dimensions.z));root.add(centered);
    const mixer=new AnimationMixer(source);
    const animation=gltf.animations.find(clip=>/swim|loop/i.test(clip.name)&&!/bite|fast/i.test(clip.name))||gltf.animations[0];
    // The imported jelly clip moves its skin independently of the replacement oral arms.
    // Our bell pulse and ribbon motion share one clock and keep the mouth joined.
    if(animation&&name!=='jelly')mixer.clipAction(animation).play();
    return {root,mixer,source,materials,opacity,addedGeometry,oralArms,bellPulse};
  },[gltf,name,size,submerged,reveal]);
  useEffect(()=>{onReady?.();return()=>{model.mixer.stopAllAction();model.mixer.uncacheRoot(model.source);model.materials.forEach(material=>material.dispose());model.addedGeometry.forEach(geometry=>geometry.dispose());};},[model,onReady]);
  useFrame((_,delta)=>{
    if(reveal)model.materials.forEach(original=>{const material=original as MeshStandardMaterial;material.opacity=(model.opacity.get(material)??1)*reveal.current;});
    if(animated){const step=Math.min(delta,.05)*speed;phase.current+=step;if(name!=='jelly')model.mixer.update(step);}
    if(animated){
      const pulse=model.bellPulse?.update(phase.current)??0;
      if(model.oralArms){model.oralArms.update(phase.current);model.oralArms.group.rotation.z=-.72+Math.sin(phase.current*.42)*.035;model.oralArms.group.rotation.x=Math.cos(phase.current*.35)*.025;model.oralArms.group.scale.set(.72*(1-.04*pulse),.72*(1+.04*pulse),.72*(1-.04*pulse));}
    }
  });
  return <primitive object={model.root} dispose={null}/>;
}
