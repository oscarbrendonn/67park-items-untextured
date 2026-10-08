import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {DRACOLoader} from 'three/addons/loaders/DRACOLoader.js';
import {MeshoptDecoder} from './vendor/addons/libs/meshopt_decoder.module.js';
import {createEffect} from './effects.js';
const view=document.querySelector('#view'),status=document.querySelector('#status'),select=document.querySelector('#item'),download=document.querySelector('#download');
const renderer=new T.WebGLRenderer({antialias:true,alpha:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setClearColor(0,0);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;view.append(renderer.domElement);
const scene=new T.Scene(),camera=new T.PerspectiveCamera(35,1,.001,10000),controls=new OrbitControls(camera,renderer.domElement);controls.enablePan=false;
scene.add(new T.HemisphereLight(0xffffff,0x98a5a2,2));const light=new T.DirectionalLight(0xffffff,2);light.position.set(3,5,4);scene.add(light);
const draco=new DRACOLoader().setDecoderPath('./vendor/addons/libs/draco/gltf/'),loader=new GLTFLoader().setDRACOLoader(draco).setMeshoptDecoder(MeshoptDecoder);
const items=await(await fetch('./items.json?v=black-shirt-sharp-3')).json();items.forEach((x,i)=>select.add(new Option(x.name,i)));let active,serial=0,effect;
async function show(){
 const id=++serial,item=items[select.value||0];status.textContent='Loading…';
 try{
  const nextEffect=item.effect?createEffect(item.effect):null;
  const root=nextEffect?.root||(await loader.loadAsync(item.file)).scene;
  // Same upright presentation as the game's skateboard wrapper; GLB unchanged.
  if(item.file?.includes('skateboard')){root.traverse(o=>{if(o.name==='body')o.rotation.x=Math.PI;});root.rotation.y=-Math.PI/2;}
  if(id!==serial){nextEffect?.dispose();return;}
  if(active){scene.remove(active);if(effect)effect.dispose();else active.traverse(o=>{o.geometry?.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m?.dispose()});}
  effect=nextEffect;active=root;scene.add(active);active.updateMatrixWorld(true);
  const box=new T.Box3().setFromObject(active,true),center=box.getCenter(new T.Vector3()),size=box.getSize(new T.Vector3()),span=Math.max(size.x,size.y,size.z,.01);
  camera.near=span/1000;camera.far=span*100;camera.updateProjectionMatrix();camera.position.copy(center).add(new T.Vector3(span*.45,span*.35,span*2.6));controls.target.copy(center);controls.minDistance=span*.4;controls.maxDistance=span*6;controls.update();
  download.href=item.file||'./effects.js';download.textContent=item.effect?'Download effect code':'Download GLB';
  status.textContent='Ready · '+(Number(select.value)+1)+' / '+items.length+(item.effect?' · Procedural effect, no texture':'' );
  window.__itemPreview={ready:true,root:active,name:item.name};renderer.render(scene,camera);
 }catch(e){status.textContent='Could not load. Please choose the item again.';console.error(e);}
}
new ResizeObserver(()=>{renderer.setSize(view.clientWidth,view.clientHeight);camera.aspect=view.clientWidth/view.clientHeight;camera.updateProjectionMatrix();renderer.render(scene,camera)}).observe(view);
select.onchange=show;renderer.setAnimationLoop(()=>{if(!document.hidden){effect?.update(performance.now()/1000);renderer.render(scene,camera)}});await show();
