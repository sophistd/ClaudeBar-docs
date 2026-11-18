/**
 * [INPUT]: Three.js PBR、RoomEnvironment 与 UI Kit 的三项原生 range 控件。
 * [OUTPUT]: 可调主光、粗糙度、折射率的实时材质舞台；失败时保留静态图。
 * [POS]: 只由 UI Kit 按需加载；按事件渲染，不运行空闲动画循环。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
export function mountOptics(stage) {
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'low-power'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
  renderer.setClearColor(0xffffff);renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.domElement.setAttribute('role','img');
  renderer.domElement.setAttribute('aria-label','三层门框材质样本：铝、玻璃与石墨。可用旁边滑杆调整光学参数。');
  const scene=new THREE.Scene();scene.background=new THREE.Color(0xffffff);
  const camera=new THREE.OrthographicCamera(-3,3,2.4,-2.4,.1,60);
  camera.position.set(4.6,3.3,7);camera.lookAt(0,1.5,0);
  const pmrem=new THREE.PMREMGenerator(renderer);
  const room=new RoomEnvironment();const environment=pmrem.fromScene(room,.035);
  scene.environment=environment.texture;scene.environmentIntensity=.65;room.dispose();pmrem.dispose();
  const light=new THREE.DirectionalLight(0xfffaf4,4.2);
  light.position.set(-4.2,6,4.2);light.castShadow=true;
  light.shadow.mapSize.set(2048,2048);light.shadow.camera.left=-5;light.shadow.camera.right=5;
  light.shadow.camera.top=6;light.shadow.camera.bottom=-5;light.shadow.normalBias=.025;light.shadow.bias=-.0001;
  light.shadow.radius=4;light.target.position.set(0,1,0);scene.add(light,light.target);
  const fill=new THREE.HemisphereLight(0xeaf1ff,0xb8b4ad,.8);scene.add(fill);
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.MeshStandardMaterial({color:0xffffff,roughness:.6,metalness:0}));
  floor.rotation.x=-Math.PI/2;floor.position.y=-.025;floor.receiveShadow=true;scene.add(floor);
  const metal=new THREE.MeshPhysicalMaterial({color:0xcbd0d4,metalness:1,roughness:.18,anisotropy:.65,envMapIntensity:1});
  const glass=new THREE.MeshPhysicalMaterial({color:0xe9edef,metalness:0,roughness:.08,transmission:1,thickness:.34,ior:1.45,clearcoat:1,clearcoatRoughness:.04,attenuationColor:0xc9d1d4,attenuationDistance:2});
  const graphite=new THREE.MeshPhysicalMaterial({color:0x242629,metalness:.25,roughness:.38,clearcoat:.18,clearcoatRoughness:.28});
  const group=new THREE.Group();scene.add(group);
  function gateway(width,height,bar,depth,material,z){
    const x=width/2,t=bar;const shape=new THREE.Shape();
    shape.moveTo(-x,0);shape.lineTo(-x,height);shape.lineTo(x,height);shape.lineTo(x,0);
    shape.lineTo(x-t,0);shape.lineTo(x-t,height-t);shape.lineTo(-x+t,height-t);shape.lineTo(-x+t,0);shape.closePath();
    const geometry=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSegments:5,steps:1,bevelSize:.045,bevelThickness:.045,curveSegments:8});
    geometry.translate(0,0,-depth/2);
    const mesh=new THREE.Mesh(geometry,material);mesh.position.z=z;mesh.castShadow=material!==glass;mesh.receiveShadow=true;group.add(mesh);return mesh;
  }
  gateway(3.3,3.35,.31,.48,metal,-.28);
  gateway(2.35,2.48,.23,.3,glass,.12);
  gateway(1.35,1.55,.24,.32,graphite,.47);
  let pending=0,disposed=false;
  const render=()=>{if(disposed||pending)return;pending=requestAnimationFrame(()=>{pending=0;if(!disposed)renderer.render(scene,camera);});};
  const resize=()=>{const width=stage.clientWidth,height=stage.clientHeight;const half=2.35;camera.left=-half*width/height;camera.right=half*width/height;camera.top=half;camera.bottom=-half;camera.updateProjectionMatrix();renderer.setSize(width,height,false);render();};
  const observer=new ResizeObserver(resize);observer.observe(stage);
  stage.append(renderer.domElement);stage.dataset.renderer='webgl';resize();
  stage.querySelector('img').hidden=true;
  const listeners=[];
  const bind=(id,apply)=>{const input=document.getElementById(id);input.disabled=false;const handler=()=>{apply(Number(input.value));render();};input.addEventListener('input',handler);listeners.push(()=>input.removeEventListener('input',handler));};
  bind('light-angle',(v)=>{const angle=v*Math.PI/180;light.position.set(Math.sin(angle)*6,6,Math.cos(angle)*6);document.getElementById('light-value').value=`${v}°`;});
  bind('roughness',(v)=>{metal.roughness=v;glass.roughness=Math.min(v*.45,.32);document.getElementById('roughness-value').value=v.toFixed(2);});
  bind('ior',(v)=>{glass.ior=v;document.getElementById('ior-value').value=v.toFixed(2);});
  function dispose(){if(disposed)return;disposed=true;cancelAnimationFrame(pending);observer.disconnect();listeners.forEach(f=>f());scene.traverse(o=>{o.geometry?.dispose();if(o.material){for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});environment.dispose();renderer.dispose();}
  renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();dispose();stage.querySelector('img').hidden=false;renderer.domElement.remove();stage.dataset.renderer='fallback';document.querySelectorAll('.optics-controls input').forEach(i=>i.disabled=true);document.getElementById('optics-status').textContent='图形上下文已中断，已切回静态材质图。';});
  window.addEventListener('pagehide',event=>{if(!event.persisted)dispose();});
  return dispose;
}
