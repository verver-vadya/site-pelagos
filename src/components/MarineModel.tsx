import {useEffect,useMemo,useRef} from 'react';
import {useFrame,useLoader} from '@react-three/fiber';
import {AnimationMixer,Box3,Color,DoubleSide,Group,Mesh,MeshStandardMaterial,Vector3,type Material} from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {clone} from 'three/examples/jsm/utils/SkeletonUtils.js';
import {modelUrl,type ModelName} from '../lib/models';

type Props={name:ModelName;size?:number;animated?:boolean;speed?:number;submerged?:boolean;onReady?:()=>void;reveal?:{current:number}};
export default function MarineModel({name,size=4,animated=true,speed=.7,submerged=false,onReady,reveal}:Props){
  const gltf=useLoader(GLTFLoader,modelUrl(name));
  const phase=useRef(0);
  const model=useMemo(()=>{
    const source=clone(gltf.scene);
    const materials:Material[]=[];
    const opacity=new Map<Material,number>();
    const helpers:Mesh[]=[];
    source.traverse(object=>{
      if(!(object instanceof Mesh))return;
      const originals=Array.isArray(object.material)?object.material:[object.material];
      // The jellyfish export includes the author's cube guides in material_0.
      // Exclude them before framing so only the animal contributes to its bounds.
      if((name==='jelly'&&originals.every(material=>material.name==='material_0'))||(name==='octopus'&&originals.every(material=>material.name==='Material.001'))){helpers.push(object);return;}
      const converted=originals.map(original=>{
        const old=original as MeshStandardMaterial;
        const material=new MeshStandardMaterial({map:old.map||null,normalMap:old.normalMap||null,color:old.color?.clone()||new Color('white'),roughness:name==='jelly'?.28:.82,metalness:0,side:DoubleSide,transparent:name==='jelly'||old.transparent,opacity:name==='jelly'?.58:old.opacity??1,depthWrite:name!=='jelly'});
        material.color.lerp(new Color('#6797b2'),submerged?.09:name==='jelly'?.08:.025);
        opacity.set(material,material.opacity);
        if(reveal){material.transparent=true;material.opacity=0;}
        materials.push(material);return material;
      });
      object.material=Array.isArray(object.material)?converted:converted[0];
      object.frustumCulled=false;
    });
    helpers.forEach(helper=>helper.removeFromParent());
    const box=new Box3().setFromObject(source);
    const center=box.getCenter(new Vector3());
    const dimensions=box.getSize(new Vector3());
    const centered=new Group();centered.position.copy(center).negate();centered.add(source);
    const root=new Group();root.scale.setScalar(size/Math.max(dimensions.x,dimensions.y,dimensions.z));root.add(centered);
    const mixer=new AnimationMixer(source);
    const animation=gltf.animations.find(clip=>/swim|loop/i.test(clip.name)&&!/bite|fast/i.test(clip.name))||gltf.animations[0];
    if(animation)mixer.clipAction(animation).play();
    return {root,mixer,source,materials,opacity};
  },[gltf,name,size,submerged,reveal]);
  useEffect(()=>{onReady?.();return()=>{model.mixer.stopAllAction();model.mixer.uncacheRoot(model.source);model.materials.forEach(material=>material.dispose());};},[model,onReady]);
  useFrame((_,delta)=>{
    if(reveal)model.materials.forEach(original=>{const material=original as MeshStandardMaterial;material.opacity=(model.opacity.get(material)??1)*reveal.current;});
    if(animated){const step=Math.min(delta,.05)*speed;phase.current+=step;model.mixer.update(step);}
  });
  return <primitive object={model.root} dispose={null}/>;
}
