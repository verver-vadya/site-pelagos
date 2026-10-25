// Turns the reconstructed heightfield into a compact glTF mesh for the scene.
import {readFileSync} from 'node:fs';
import {Document,NodeIO} from '@gltf-transform/core';
import {weld,simplify,dedup,prune} from '@gltf-transform/functions';
import {MeshoptSimplifier} from 'meshoptimizer';
const [heightPath,gridPath,out,ratio]=process.argv.slice(2);
const g=JSON.parse(readFileSync(gridPath,'utf8'));
const buf=readFileSync(heightPath);const off=buf.indexOf(0x0a,buf.indexOf('}'))+1;
const h=new Float32Array(buf.buffer.slice(buf.byteOffset+off,buf.byteOffset+off+g.nx*g.nz*4));
const pos=new Float32Array(g.nx*g.nz*3);
for(let i=0;i<g.nz;i++)for(let j=0;j<g.nx;j++){const k=i*g.nx+j;pos[k*3]=g.x0+j*g.cell;pos[k*3+1]=h[k];pos[k*3+2]=g.z0+i*g.cell;}
const idx=new Uint32Array((g.nx-1)*(g.nz-1)*6);let n=0;
for(let i=0;i<g.nz-1;i++)for(let j=0;j<g.nx-1;j++){const a=i*g.nx+j,b=a+1,c=a+g.nx,d=c+1;idx[n++]=a;idx[n++]=c;idx[n++]=b;idx[n++]=b;idx[n++]=c;idx[n++]=d;}
const doc=new Document();const buffer=doc.createBuffer();
const prim=doc.createPrimitive().setAttribute('POSITION',doc.createAccessor().setType('VEC3').setArray(pos).setBuffer(buffer)).setIndices(doc.createAccessor().setType('SCALAR').setArray(idx).setBuffer(buffer));
const mesh=doc.createMesh('seabed').addPrimitive(prim);
doc.createScene().addChild(doc.createNode('seabed').setMesh(mesh));
await MeshoptSimplifier.ready;
await doc.transform(weld(),simplify({simplifier:MeshoptSimplifier,ratio:+ratio||.04,error:.0006}),dedup(),prune());
doc.getRoot().setExtras({source:'Relief reconstructed from public/media/backdrop-unlit.webp; depth estimate by Depth Anything V2 Small (Apache-2.0).'});
await new NodeIO().write(out,doc);
console.log('triangles',prim.getIndices().getCount()/3);
