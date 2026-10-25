import {url} from './paths';
export const modelNames=['manta','turtle','shark','sardine','kingfish','tuna','jelly','octopus'] as const;
export type ModelName=typeof modelNames[number];
export const modelUrl=(name:ModelName)=>url(`models/${name}.glb`);
export const isModelName=(value:string):value is ModelName=>(modelNames as readonly string[]).includes(value);
