import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, textureCompress, weld, simplify } from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';
import { readFile, writeFile, mkdir } from 'node:fs/promises';

const io=new NodeIO().registerExtensions(ALL_EXTENSIONS);
await MeshoptSimplifier.ready;
await mkdir('public/models',{recursive:true});
await mkdir('docs/licenses',{recursive:true});
const models=['manta','turtle','shark','sardine','kingfish','tuna','jelly','octopus'];
const evidence=[];
for(const name of models){
  const input=`.check/model-sources/${name}.glb`;
  const binary=await readFile(input);
  const jsonLength=binary.readUInt32LE(12);
  const original=JSON.parse(binary.subarray(20,20+jsonLength).toString('utf8'));
  evidence.push({name,asset:original.asset,animations:original.animations?.map(a=>a.name)||[],originalBytes:binary.length});
  const document=await io.read(input);
  await document.transform(dedup(),prune(),weld());
  if(name==='octopus')await document.transform(simplify({simplifier:MeshoptSimplifier,ratio:.08,error:.006}));
  await document.transform(textureCompress({encoder:sharp,targetFormat:'webp',resize:[1024,1024],quality:86}));
  document.getRoot().setExtras({...document.getRoot().getExtras(),pelagos:{modified:'WebP textures resized to 1024; deduplication, unused data removal; octopus mesh simplified. Original attribution retained in docs/licenses/model-metadata.json.'}});
  const output=`public/models/${name}.glb`;
  await io.write(output,document);
  const optimized=await readFile(output);
  console.log(`${name}: ${(binary.length/1e6).toFixed(2)} MB -> ${(optimized.length/1e6).toFixed(2)} MB`);
}
await writeFile('docs/licenses/model-metadata.json',JSON.stringify(evidence,null,2)+'\n');
