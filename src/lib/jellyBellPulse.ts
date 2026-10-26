import {BufferGeometry,Mesh,type BufferAttribute,type InterleavedBufferAttribute,type Object3D} from 'three';

const bellRadius=1.113;

export function createJellyBellPulse(source:Object3D){
  const surfaces:{geometry:BufferGeometry;base:Float32Array;position:BufferAttribute|InterleavedBufferAttribute}[]=[];
  source.traverse(object=>{
    if(!(object instanceof Mesh))return;
    const materials=Array.isArray(object.material)?object.material:[object.material];
    if(!materials.some(material=>/Moon-Jelly_(Bell|Canal|Cavity|Tentacle)/.test(material.name)))return;
    const geometry=object.geometry.clone();
    const attribute=geometry.getAttribute('position');
    if(!attribute)return;
    object.geometry=geometry;
    const base=new Float32Array(attribute.count*3);
    for(let i=0;i<attribute.count;i++){
      base[i*3]=attribute.getX(i);
      base[i*3+1]=attribute.getY(i);
      base[i*3+2]=attribute.getZ(i);
    }
    surfaces.push({geometry,base,position:attribute});
  });

  const update=(time:number)=>{
    const pulse=Math.sin(time*2.2);
    for(const {base,position} of surfaces){
      for(let i=0;i<position.count;i++){
        const x=base[i*3],y=base[i*3+1],z=base[i*3+2];
        const radius=Math.min(1,Math.hypot(x,z)/bellRadius);
        const edge=radius*radius;
        const squeeze=1-.075*pulse*edge;
        position.setXYZ(i,x*squeeze,y+pulse*(.05*(1-edge)-.04*edge),z*squeeze);
      }
      position.needsUpdate=true;
    }
    return pulse;
  };

  return {geometries:surfaces.map(surface=>surface.geometry),update};
}
