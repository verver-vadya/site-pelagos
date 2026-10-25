import {useEffect,useMemo,useRef} from 'react';
import {useFrame,useThree} from '@react-three/fiber';
import {DepthTexture,Matrix4,Mesh,NearestFilter,OrthographicCamera,PlaneGeometry,Scene,ShaderMaterial,UnsignedIntType,Vector2,Vector3,WebGLRenderTarget} from 'three';

// Integrate scattering along each camera ray, stopping at the real scene depth.
// Rock faces and animals therefore occlude light rather than sit under a light overlay.
export default function UnderwaterLight({playing,mobile,layer}:{playing:boolean;mobile:boolean;layer:number}){
 const {size,gl}=useThree();const elapsed=useRef(0);
 const pipeline=useMemo(()=>{
  const target=new WebGLRenderTarget(1,1,{minFilter:NearestFilter,magFilter:NearestFilter});
  target.depthTexture=new DepthTexture(1,1,UnsignedIntType);
  const material=new ShaderMaterial({depthTest:false,depthWrite:false,uniforms:{uScene:{value:target.texture},uDepth:{value:target.depthTexture},uProjectionInverse:{value:new Matrix4()},uCameraWorld:{value:new Matrix4()},uEye:{value:new Vector3()},uTime:{value:0},uDark:{value:0},uResolution:{value:new Vector2()}},vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`,fragmentShader:`
   varying vec2 vUv;uniform sampler2D uScene;uniform sampler2D uDepth;uniform mat4 uProjectionInverse;uniform mat4 uCameraWorld;uniform vec3 uEye;uniform float uTime;uniform float uDark;uniform vec2 uResolution;
   vec3 worldAt(float depth){vec4 p=uProjectionInverse*vec4(vUv*2.-1.,depth*2.-1.,1.);p/=p.w;return (uCameraWorld*p).xyz;}
   float beams(vec3 p){
    // All shafts share the same refracted light direction as the key light.
    vec2 q=p.xz-vec2(.43,.16)*(p.y-8.5);
    q+=vec2(sin(q.y*.65+uTime*.14),cos(q.x*.5-uTime*.11))*.22;
    float a=pow(max(0.,sin(q.x*2.15+sin(q.y*.6)*.7)),14.);
    float b=.45+.55*pow(max(0.,cos(q.y*.82+sin(q.x*.4))),2.);
    float opening=exp(-pow((q.x-8.)/11.,2.));
    return a*b*opening*exp(-max(0.,8.5-p.y)*.045);
   }
   void main(){
    vec3 base=texture2D(uScene,vUv).rgb;float depth=texture2D(uDepth,vUv).x;
    vec3 hit=worldAt(depth);vec3 direction=normalize(hit-uEye);float distance=min(length(hit-uEye),75.);
    float stepSize=distance/float(STEPS);float scattering=0.;
    // Stable subpixel jitter removes visible bands without temporal flicker.
    float jitter=fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453);
    for(int i=0;i<STEPS;i++){
     float t=(float(i)+jitter)*stepSize;vec3 p=uEye+direction*t;
     float water=step(-6.1,p.y)*step(p.y,8.6)*step(p.z,12.);
     scattering+=beams(p)*water*exp(-t*.037)*stepSize*.012;
    }
    vec3 haze=vec3(.018,.075,.12)*(1.-exp(-distance*.008));
    vec3 result=base+haze+vec3(.10,.31,.48)*scattering*(1.-uDark*.3);
    result*=1.-uDark*.16;
    gl_FragColor=vec4(result,1.);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
   }`.replaceAll('STEPS',mobile?'20':'32')});
  const scene=new Scene(),camera=new OrthographicCamera(-1,1,1,-1,0,1),geometry=new PlaneGeometry(2,2);
  scene.add(new Mesh(geometry,material));return {target,material,scene,camera,geometry};
 },[mobile]);
 useEffect(()=>{const ratio=gl.getPixelRatio();pipeline.target.setSize(Math.max(1,Math.round(size.width*ratio)),Math.max(1,Math.round(size.height*ratio)));pipeline.material.uniforms.uResolution.value.set(size.width*ratio,size.height*ratio);},[pipeline,size,gl]);
 useEffect(()=>()=>{pipeline.target.dispose();pipeline.material.dispose();pipeline.geometry.dispose();},[pipeline]);
 useFrame(({gl,scene,camera},delta)=>{
  if(playing)elapsed.current+=Math.min(delta,.08);
  const u=pipeline.material.uniforms;u.uTime.value=elapsed.current;u.uDark.value=layer;u.uEye.value.copy(camera.position);u.uProjectionInverse.value.copy(camera.projectionMatrixInverse);u.uCameraWorld.value.copy(camera.matrixWorld);
  gl.setRenderTarget(pipeline.target);gl.render(scene,camera);gl.setRenderTarget(null);gl.render(pipeline.scene,pipeline.camera);
 },1);
 return null;
}
