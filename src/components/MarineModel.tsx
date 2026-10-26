import {useEffect,useMemo,useRef} from 'react';
import {useFrame,useLoader} from '@react-three/fiber';
import {AnimationMixer,Box3,CatmullRomCurve3,Color,DoubleSide,Group,Mesh,MeshStandardMaterial,TubeGeometry,Vector3,type Material} from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {clone} from 'three/examples/jsm/utils/SkeletonUtils.js';
import {modelUrl,type ModelName} from '../lib/models';

type Props={name:ModelName;size?:number;animated?:boolean;speed?:number;submerged?:boolean;onReady?:()=>void;reveal?:{current:number}};
export default function MarineModel({name,size=4,animated=true,speed=.7,submerged=false,onReady,reveal}:Props){
  const gltf=useLoader(GLTFLoader,modelUrl(name));
  const phase=useRef(0);
  const model=useMemo(()=>{
    const source=clone(gltf.scene);
    const materials:Material[]=[];const addedGeometry:TubeGeometry[]=[];
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
        const jellyOpacity=/Tentacle|OralArm/.test(old.name)?.82:.46;
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
    const box=new Box3().setFromObject(source);
    const center=box.getCenter(new Vector3());
    const dimensions=box.getSize(new Vector3());
    const centered=new Group();centered.position.copy(center).negate();centered.add(source);
    let filaments:Group|undefined;
    if(name==='jelly'){
      filaments=new Group();
      filaments.position.set(.25,.2,0);filaments.rotation.z=-.68;filaments.scale.setScalar(.72);
      const material=new MeshStandardMaterial({color:'#9bc2d0',emissive:'#214d63',emissiveIntensity:.08,roughness:.42,metalness:0,transparent:true,opacity:.48,depthWrite:false,side:DoubleSide});
      opacity.set(material,material.opacity);
      materials.push(material);
      const strand=(points:Vector3[],radius:number)=>{const geometry=new TubeGeometry(new CatmullRomCurve3(points),20,radius,4,false);addedGeometry.push(geometry);filaments!.add(new Mesh(geometry,material));};
      // The model already has fine marginal tentacles; the four oral arms need to hang outside its bell.
      for(let i=0;i<4;i++){
        const angle=i*Math.PI/2+.3;const radial=(r:number,y:number)=>new Vector3(Math.cos(angle)*r,y,Math.sin(angle)*r);
        strand([radial(.16,-.18),radial(.23,-.38),radial(.34,-.62),radial(.42,-.82)],.011);
      }
      centered.add(filaments);
    }
    const root=new Group();root.scale.setScalar(size/Math.max(dimensions.x,dimensions.y,dimensions.z));root.add(centered);
    const mixer=new AnimationMixer(source);
    const animation=gltf.animations.find(clip=>/swim|loop/i.test(clip.name)&&!/bite|fast/i.test(clip.name))||gltf.animations[0];
    if(animation)mixer.clipAction(animation).play();
    return {root,mixer,source,materials,opacity,addedGeometry,filaments};
  },[gltf,name,size,submerged,reveal]);
  useEffect(()=>{onReady?.();return()=>{model.mixer.stopAllAction();model.mixer.uncacheRoot(model.source);model.materials.forEach(material=>material.dispose());model.addedGeometry.forEach(geometry=>geometry.dispose());};},[model,onReady]);
  useFrame((_,delta)=>{
    if(reveal)model.materials.forEach(original=>{const material=original as MeshStandardMaterial;material.opacity=(model.opacity.get(material)??1)*reveal.current;});
    if(animated){const step=Math.min(delta,.05)*speed;phase.current+=step;model.mixer.update(step);}
    if(model.filaments){model.filaments.rotation.z=Math.sin(phase.current*.42)*.035;model.filaments.rotation.x=Math.cos(phase.current*.35)*.025;}
  });
  return <primitive object={model.root} dispose={null}/>;
}
