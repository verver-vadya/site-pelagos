import {BufferGeometry,Color,DoubleSide,DynamicDrawUsage,Float32BufferAttribute,Group,Mesh,MeshStandardMaterial} from 'three';

const rows=40;

export function createJellyOralArms(){
  const group=new Group();
  const material=new MeshStandardMaterial({
    color:'#a6c8d6',roughness:.68,metalness:0,
    transparent:true,opacity:.72,depthWrite:false,side:DoubleSide,vertexColors:true,
  });
  const geometries:BufferGeometry[]=[];
  const ribbons:{geometry:BufferGeometry;positions:Float32Array;arm:number;layer:number}[]=[];
  const pale=new Color('#d8edf0');const blue=new Color('#75adc4');

  for(let arm=0;arm<4;arm++)for(let layer=0;layer<2;layer++){
    const geometry=new BufferGeometry();
    const positions=new Float32Array((rows+1)*3*3);
    const colors=new Float32Array((rows+1)*3*4);
    const indices:number[]=[];
    for(let row=0;row<=rows;row++){
      const t=row/rows;const color=pale.clone().lerp(blue,t*.64);
      for(let side=0;side<3;side++){
        const index=(row*3+side)*4;
        colors[index]=color.r;colors[index+1]=color.g;colors[index+2]=color.b;
        const attachment=.18+.82*Math.min(1,t/.22);
        colors[index+3]=(side===1?.8:.4)*attachment*(1-.25*t);
      }
      if(row===rows)continue;
      for(let side=0;side<2;side++){
        const a=row*3+side;const b=a+3;
        indices.push(a,b,a+1,a+1,b,b+1);
      }
    }
    const attribute=new Float32BufferAttribute(positions,3);attribute.setUsage(DynamicDrawUsage);
    geometry.setAttribute('position',attribute);
    geometry.setAttribute('color',new Float32BufferAttribute(colors,4));
    geometry.setIndex(indices);
    const mesh=new Mesh(geometry,material);mesh.frustumCulled=false;group.add(mesh);
    geometries.push(geometry);ribbons.push({geometry,positions:attribute.array as Float32Array,arm,layer});
  }

  const update=(time:number)=>{
    for(const {geometry,positions,arm,layer} of ribbons){
      const angle=arm*Math.PI/2+.3;
      const radialX=Math.cos(angle),radialZ=Math.sin(angle);
      const tangentX=-radialZ,tangentZ=radialX;
      const length=1.95+.12*Math.sin(arm*2.3);
      for(let row=0;row<=rows;row++){
        const t=row/rows;
        const spread=.025+.425*t;
        const drift=.23*t*t*Math.sin(t*5-time*.72+arm*1.8);
        const x=radialX*spread+tangentX*drift;
        const z=radialZ*spread+tangentZ*drift;
        const twist=layer*Math.PI/2+.26*Math.sin(t*7-time*.38+arm);
        const widthX=tangentX*Math.cos(twist)+radialX*Math.sin(twist);
        const widthZ=tangentZ*Math.cos(twist)+radialZ*Math.sin(twist);
        const taper=.12+.88*Math.pow(Math.sin(Math.PI*t),.8)*Math.min(1,t/.18);
        const width=(layer===0?.092:.052)*taper*(1+.2*Math.sin(t*22+arm*2+layer));
        for(let side=0;side<3;side++){
          const edge=side-1;const index=(row*3+side)*3;
          const ruffle=.029*t*Math.sin(t*29+arm*1.4+edge*1.8-time*.46);
          const fold=side===1?.018*Math.sin(t*18+arm*1.7+layer):0;
          positions[index]=x+widthX*width*edge+radialX*fold;
          positions[index+1]=-length*t+ruffle;
          positions[index+2]=z+widthZ*width*edge+radialZ*fold;
        }
      }
      geometry.attributes.position.needsUpdate=true;
      geometry.computeVertexNormals();
    }
  };
  update(0);
  return {group,material,geometries,update};
}
