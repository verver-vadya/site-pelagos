import {useEffect,useMemo,useRef} from 'react';
import {useFrame,useLoader,useThree} from '@react-three/fiber';
import {AdditiveBlending,BufferGeometry,DoubleSide,Float32BufferAttribute,PlaneGeometry,ShaderMaterial,SRGBColorSpace,TextureLoader,Vector2} from 'three';
import {url} from '../lib/paths';

// A photographed texture is projected onto a sculpted relief, preserving natural
// rock detail. Light shafts, suspended particles and surface reflections are live.
export default function WaterHabitat({playing,mobile,layer}:{playing:boolean;mobile:boolean;layer:number}){
  const clock=useRef(0);const {size}=useThree();
  const texture=useLoader(TextureLoader,url('media/backdrop-unlit.webp'));texture.colorSpace=SRGBColorSpace;
  const aspect=size.width/size.height;
  const relief=useMemo(()=>{
    const depth=31;const height=2*Math.tan(40*Math.PI/360)*depth;const width=height*aspect;
    const geometry=new PlaneGeometry(width,height,mobile?48:112,mobile?36:72);
    const positions=geometry.attributes.position,uv=geometry.attributes.uv;
    for(let i=0;i<positions.count;i++){
      const u=uv.getX(i),v=uv.getY(i);const underwater=Math.min(1,Math.max(0,(v-.09)*25));
      const imageU=(u-.5)*Math.min(1,aspect/(1672/941))+.5;
      // Leave the physical window frame flat; only submerged rock has depth.
      const glassEdge=Math.min(1,Math.max(0,(.965-imageU)*35))*Math.min(1,Math.max(0,(imageU-.015)*35));
      const low=Math.pow(Math.max(0,1-v/.55),1.7)*underwater*glassEdge;
      const rocks=(.6+Math.sin(u*27+Math.sin(v*31))*Math.sin(v*24)*.25+Math.sin(u*71+v*47)*.11);
      const banks=.3+Math.pow(Math.abs(u-.38)*1.5,2)*2;
      positions.setZ(i,low*rocks*banks*2.4);
    }
    geometry.computeVertexNormals();return geometry;
  },[aspect,mobile]);
  const rock=useMemo(()=>new ShaderMaterial({uniforms:{uMap:{value:texture},uTime:{value:0},uDark:{value:0},uCover:{value:new Vector2(1,1)}},vertexShader:`varying vec2 vUv;varying vec3 vNormal;varying vec3 vWorld;void main(){vUv=uv;vNormal=normalize(normalMatrix*normal);vec4 world=modelMatrix*vec4(position,1.);vWorld=world.xyz;gl_Position=projectionMatrix*viewMatrix*world;}`,fragmentShader:`
    varying vec2 vUv;varying vec3 vNormal;varying vec3 vWorld;uniform sampler2D uMap;uniform float uTime;uniform float uDark;uniform vec2 uCover;
    void main(){vec2 imageUv=(vUv-.5)*uCover+.5;vec3 base=texture2D(uMap,imageUv).rgb;
    float underwater=smoothstep(.085,.13,imageUv.y);float terrain=(1.-smoothstep(.25,.52,imageUv.y))*underwater;
    vec2 p=vWorld.xy*2.2;float a=sin(p.x*3.1+p.y*1.4+uTime*.31+sin(p.y*2.7-uTime*.2));float b=sin(p.y*3.4-p.x*.8-uTime*.25+sin(p.x*2.8+uTime*.18));
    float caustic=pow(max(0.,1.-abs(a+b)*.65),22.);float detail=.93+max(0.,dot(vNormal,normalize(vec3(.45,.8,1.))))*.07;
    vec3 color=base*detail+vec3(.001,.003,.004)*caustic*terrain*.4; color*=1.-uDark*.31;
    gl_FragColor=vec4(color,1.);
    #include <colorspace_fragment>
    }`}),[texture]);
  const surface=useMemo(()=>new ShaderMaterial({side:DoubleSide,transparent:true,depthWrite:false,uniforms:{uTime:{value:0},uDark:{value:0}},vertexShader:`varying vec2 vUv;uniform float uTime;void main(){vUv=uv;vec3 p=position;p.z+=sin(p.x*.8+uTime*.35)*.06+sin(p.y*.6-uTime*.28)*.05;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,fragmentShader:`varying vec2 vUv;uniform float uTime;uniform float uDark;void main(){vec2 p=vUv*60.;float a=sin(p.x*2.+sin(p.y*1.8+uTime*.22)+uTime*.2);float b=sin(p.y*2.3+sin(p.x*1.6-uTime*.18));float ripple=pow(max(0.,1.-abs(a+b)*.7),18.);gl_FragColor=vec4(.34,.67,.82,ripple*.022*(1.-uDark*.35));}`}),[]);
  const rays=useMemo(()=>new ShaderMaterial({transparent:true,depthWrite:false,side:DoubleSide,blending:AdditiveBlending,uniforms:{uTime:{value:0},uDark:{value:0}},vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`varying vec2 vUv;uniform float uTime;uniform float uDark;void main(){float edge=pow(max(0.,sin(vUv.x*3.14159)),3.);float ends=smoothstep(0.,.13,vUv.y)*(1.-smoothstep(.82,1.,vUv.y));float drift=.77+sin(vUv.y*7.+uTime*.17)*.12+sin(vUv.y*19.-uTime*.21)*.07;gl_FragColor=vec4(.28,.57,.76,edge*ends*drift*.095*(1.-uDark*.39));}`}),[]);
  const dust=useMemo(()=>{const g=new BufferGeometry(),positions=[];for(let i=0;i<(mobile?64:170);i++){positions.push(Math.sin(i*127.1)*14,Math.cos(i*73.7)*6,-2-(i%31)*.5);}g.setAttribute('position',new Float32BufferAttribute(positions,3));return g;},[mobile]);
  const dustMaterial=useMemo(()=>new ShaderMaterial({transparent:true,depthWrite:false,blending:AdditiveBlending,uniforms:{uTime:{value:0}},vertexShader:`uniform float uTime;void main(){vec3 p=position;p.x+=sin(uTime*.12+position.y)*.16;p.y+=sin(uTime*.09+position.x)*.08;vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=clamp(17./-mv.z,.5,1.5);}`,fragmentShader:`void main(){float a=max(0.,1.-length(gl_PointCoord-.5)*2.);gl_FragColor=vec4(.48,.69,.78,a*.14);}`}),[]);
  useEffect(()=>()=>{relief.dispose();rock.dispose();surface.dispose();rays.dispose();dust.dispose();dustMaterial.dispose();},[relief,rock,surface,rays,dust,dustMaterial]);
  useFrame((_,delta)=>{if(playing)clock.current+=Math.min(delta,.05);[rock,surface,rays].forEach(material=>{material.uniforms.uTime.value=clock.current;material.uniforms.uDark.value=layer;});rock.uniforms.uCover.value.set(Math.min(1,aspect/(1672/941)),Math.min(1,(1672/941)/aspect));dustMaterial.uniforms.uTime.value=clock.current;});
  return <>
    <mesh geometry={relief} position={[0,0,-16]} material={rock}/>
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,5.5,-10]} material={surface}><planeGeometry args={[60,60,mobile?24:48,mobile?24:48]}/></mesh>
    {Array.from({length:mobile?6:11},(_,i)=><mesh key={i} position={[3+i*.95,1,-5-(i%3)*3]} rotation={[0,0,-.27-(i%4)*.035]} material={rays}><planeGeometry args={[.7+(i%3)*.45,23]}/></mesh>)}
    <points geometry={dust} material={dustMaterial}/>
  </>;
}
