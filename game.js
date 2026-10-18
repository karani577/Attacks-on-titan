import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.164.1/build/three.module.js';

const $ = id => document.getElementById(id);
const storeKey = 'titanGearSave_v1';
const rarity = [
  {name:'Common',color:'#c7cbd1',weight:48}, {name:'Uncommon',color:'#64d68b',weight:27},
  {name:'Rare',color:'#65a9ff',weight:14}, {name:'Epic',color:'#c28aff',weight:7},
  {name:'Legendary',color:'#f4d34f',weight:3}, {name:'Mythic',color:'#ff626a',weight:.9},
  {name:'Ultimate',color:'#858b95',weight:.1}
];
const gearNames = ['Default','Medic','Pro','Slayer','Perfect','Godly','Berserk','Shadow','Vanguard','Phantom'];
const skillNames = [
 ['Hand Slasher','Quick Cut','Aerial Burst','Execution'],['Hand Slasher','Field Patch','Rescue Pulse','Last Stand'],
 ['Hand Slasher','Vector Dash','Twin Hook','Overdrive'],['Hand Slasher','Titan Bane','Rending Arc','Execution'],
 ['Hand Slasher','Perfect Angle','Wind Cutter','Zero Point'],['Hand Slasher','Divine Rush','Sky Splitter','Judgement'],
 ['Hand Slasher','Rage Drive','Blood Rush','Berserk Mode'],['Hand Slasher','Night Veil','Silent Cut','Eclipse'],
 ['Hand Slasher','Vanguard Charge','Formation Break','Frontline'],['Hand Slasher','Phantom Step','Ghost Line','Afterimage']
];
const rarityForGear = [0,0,1,1,2,3,4,3,2,2];
const baseSave = () => ({name:'Scout',gold:0,tokens:0,owned:[{name:'Default',rarity:0,tier:1,serial:1}],equipped:1,upgrades:{damage:0,speed:0,critDamage:0,critChance:0,range:0,gas:0},skills:{luck:0,damage:0,health:0},stats:{totalKills:0,longestStreak:0,currentStreak:0,missions:0,deaths:0},custom:{color:'#d6dce4'},serial:1});
let save;
try { save = {...baseSave(),...JSON.parse(localStorage.getItem(storeKey)||'{}')}; } catch { save = baseSave(); }
save.stats={...baseSave().stats,...(save.stats||{})}; save.upgrades={...baseSave().upgrades,...(save.upgrades||{})}; save.skills={...baseSave().skills,...(save.skills||{})};
if(!Array.isArray(save.owned)||!save.owned.length) save.owned=baseSave().owned;
const persist=()=>{try{localStorage.setItem(storeKey,JSON.stringify(save));}catch{} updateHud();};
const toast=(msg)=>{const el=$('toast');el.textContent=msg;el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),2300);};
const fmtTime=s=>`${String(Math.floor(s/60)).padStart(2,'0')}:${String(Math.floor(s%60)).padStart(2,'0')}`;
const isTouchDevice=()=>matchMedia('(pointer: coarse)').matches || (navigator.maxTouchPoints||0)>0;
const isMobile=()=>isTouchDevice() || innerWidth<760;
const consoleUA=()=>/PlayStation|Xbox|Nintendo|NintendoBrowser/i.test(navigator.userAgent);
function getConnectedGamepad(){try{return [...(navigator.getGamepads?.()||[])].find(g=>g&&g.connected)||null;}catch{return null;}}
function getDeviceProfile(){const pad=getConnectedGamepad();if(consoleUA())return {kind:'console',pad,label:'CONSOLE / GAMEPAD'};if(pad)return {kind:'controller',pad,label:'CONTROLLER'};if(isTouchDevice())return {kind:'mobile',pad:null,label:'MOBILE'};return {kind:'pc',pad:null,label:'PC'};}

let scene,camera,renderer,clock,player,playerMesh,worldGroup,hookLine,hookTarget=null,hookActive=false,hookPoint=new THREE.Vector3(),velocity=new THREE.Vector3(),titans=[],keys={},touchMove={},mode='menu',missionMap='Forest',kills=0,sessionGold=0,sessionTokens=0,elapsed=0,afkElapsed=0,health=100,gas=100,streak=0,paused=false,finishLock=false,slashCooldown=0,spawnTimer=0,dialogueNpc=null,lookYaw=0,lookPitch=-.12,dragging=false,lastPointer={x:0,y:0},pointerLocked=false,missionMenuReturn=false,empoweredSlash=0,lastPadButtons=[],lastDeviceKind='',lastHudRefresh=0;
const skillCooldowns=[0,0,0];
const maxHealth=()=>100+save.skills.health*10;
const maxGas=()=>100+save.upgrades.gas*10;

function init(){
  try {
    scene=new THREE.Scene();scene.background=new THREE.Color('#a9c9dc');scene.fog=new THREE.FogExp2('#a9c9dc',.0024);
    camera=new THREE.PerspectiveCamera(68,innerWidth/innerHeight,.1,900);
    renderer=new THREE.WebGLRenderer({antialias:!isMobile(),alpha:false,powerPreference:'high-performance'});
    renderer.setPixelRatio(Math.min(devicePixelRatio||1,isMobile()?1.25:1.8));renderer.setSize(innerWidth,innerHeight);
    renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;
    renderer.shadowMap.enabled=!isMobile();renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    $('game').appendChild(renderer.domElement);
    scene.add(new THREE.HemisphereLight(0xe5f5ff,0x55604c,isMobile()?1.9:1.55));
    const sun=new THREE.DirectionalLight(0xffe4ba,isMobile()?2.3:3.0);sun.position.set(-45,85,35);sun.castShadow=renderer.shadowMap.enabled;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-90;sun.shadow.camera.right=90;sun.shadow.camera.top=90;sun.shadow.camera.bottom=-90;sun.shadow.bias=-.00025;scene.add(sun);
    const fill=new THREE.DirectionalLight(0x8ac8ff,.7);fill.position.set(45,28,-55);scene.add(fill);
    worldGroup=new THREE.Group();scene.add(worldGroup);makeWorld('Forest');makePlayer();
    hookLine=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3()]),new THREE.LineBasicMaterial({color:0x78f4e0,transparent:true,opacity:.9}));scene.add(hookLine);hookLine.visible=false;
    bindUi();clock=new THREE.Clock();$('loading').classList.add('hidden');$('menu').classList.remove('hidden');requestAnimationFrame(loop);updateHud();syncDeviceUI();
  } catch(err) { console.error(err);$('loading').innerHTML='<div class="panel"><h1>FIELD SYSTEM ERROR</h1><p>This browser could not start WebGL. Try refreshing in Safari or using a browser with WebGL enabled.</p></div>'; }
}
function mat(color,roughness=.78,metalness=0){return new THREE.MeshStandardMaterial({color,roughness,metalness});}
function box(parent,x,y,z,sx,sy,sz,material){const m=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz),material);m.position.set(x,y,z);m.castShadow=renderer?.shadowMap.enabled||false;m.receiveShadow=renderer?.shadowMap.enabled||false;parent.add(m);return m;}
function sphere(parent,x,y,z,sx,sy,sz,material,segments=16){const m=new THREE.Mesh(new THREE.SphereGeometry(1,segments,Math.max(8,Math.floor(segments*.65))),material);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=renderer?.shadowMap.enabled||false;m.receiveShadow=renderer?.shadowMap.enabled||false;parent.add(m);return m;}
function capsule(parent,x,y,z,radius,length,material,rotZ=0,rotX=0){const g=new THREE.CapsuleGeometry(radius,length,4,10);const m=new THREE.Mesh(g,material);m.position.set(x,y,z);m.rotation.z=rotZ;m.rotation.x=rotX;m.castShadow=renderer?.shadowMap.enabled||false;m.receiveShadow=renderer?.shadowMap.enabled||false;parent.add(m);return m;}
function makeGroundTexture(kind){
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;const ctx=canvas.getContext('2d');
  const base={Forest:'#637b4c',Field:'#a6a06b',City:'#7f898b',Island:'#477e83'}[kind]||'#637b4c';ctx.fillStyle=base;ctx.fillRect(0,0,256,256);
  const palette=kind==='City'?['#a4aaa5','#6b777b','#c3b9a0']:kind==='Island'?['#6b9693','#a8a18a','#385f67']:kind==='Field'?['#c0b67a','#77834e','#8c9758']:['#7c925b','#405f3f','#8a9b67'];
  for(let i=0;i<2300;i++){ctx.globalAlpha=.12+Math.random()*.22;ctx.fillStyle=palette[i%palette.length];const x=Math.random()*256,y=Math.random()*256,r=Math.random()*2.5+.3;ctx.fillRect(x,y,r,r);}ctx.globalAlpha=1;
  const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.repeat.set(32,32);tex.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());return tex;
}
function clearGroup(group){while(group.children.length){const obj=group.children[group.children.length-1];group.remove(obj);obj.traverse?.(child=>{if(child.geometry)child.geometry.dispose();if(child.material){const mats=Array.isArray(child.material)?child.material:[child.material];mats.forEach(m=>{if(m.map&&m.map!==groundTexture){};m.dispose?.();});}});}}
let groundTexture=null;
function makeWorld(kind){
  clearGroup(worldGroup);titans=[];spawnTimer=0;hookActive=false;hookTarget=null;if(hookLine)hookLine.visible=false;
  const palettes={Forest:{sky:'#a9c9dc',fog:'#a9c9dc',grass:'#6c8752',accent:'#3d6540'},Field:{sky:'#c5d5d7',fog:'#c5d5d7',grass:'#a6a06b',accent:'#7e8a4f'},City:{sky:'#b4c3cf',fog:'#b4c3cf',grass:'#7f898b',accent:'#c4b59a'},Island:{sky:'#a7d0dc',fog:'#a7d0dc',grass:'#477e83',accent:'#c9bd9a'}};
  const p=palettes[kind]||palettes.Forest;scene.background.set(p.sky);scene.fog.color.set(p.fog);scene.fog.density=isMobile()?.0028:.00215;
  if(groundTexture){groundTexture.dispose();groundTexture=null;}groundTexture=makeGroundTexture(kind);
  const groundMat=new THREE.MeshStandardMaterial({color:0xffffff,map:groundTexture,roughness:1});const ground=new THREE.Mesh(new THREE.PlaneGeometry(760,760),groundMat);ground.rotation.x=-Math.PI/2;ground.position.y=-.16;ground.receiveShadow=renderer.shadowMap.enabled;worldGroup.add(ground);
  // Worn paths and soft terrain variation make scale easier to read without expensive terrain shaders.
  const pathMat=new THREE.MeshStandardMaterial({color:kind==='City'?0x777a79:kind==='Island'?0x8d9e91:0x9b9876,roughness:1,transparent:true,opacity:.48});
  for(let i=0;i<3;i++){const path=new THREE.Mesh(new THREE.PlaneGeometry(5+i*1.6,560),pathMat);path.rotation.x=-Math.PI/2;path.rotation.z=(i-1)*.24;path.position.set((i-1)*18,-.145,(i-1)*14);worldGroup.add(path);}
  const count=kind==='City'?(isMobile()?18:36):(isMobile()?34:64);
  for(let i=0;i<count;i++){
    const x=(Math.random()-.5)*240,z=(Math.random()-.5)*240;if(Math.abs(x)<15&&Math.abs(z)<18)continue;
    if(kind==='Forest'){
      const h=5+Math.random()*6,r=.65+Math.random()*.6;const trunk= new THREE.Mesh(new THREE.CylinderGeometry(r*.35,r*.52,h*.48,7),mat('#594638'));trunk.position.set(x,h*.24,z);trunk.castShadow=renderer.shadowMap.enabled;worldGroup.add(trunk);
      for(let layer=0;layer<3;layer++){const crown=new THREE.Mesh(new THREE.ConeGeometry(r*(3.1-layer*.42),h*.48,7),mat(layer===0?'#355a3b':layer===1?'#426c43':p.accent));crown.position.set(x,h*.45+layer*h*.19,z);crown.castShadow=renderer.shadowMap.enabled;worldGroup.add(crown);}
    }else if(kind==='City'){
      const h=7+Math.random()*19,w=5+Math.random()*7,d=5+Math.random()*7;const wall=mat(Math.random()>.5?'#b7b5a9':'#77858b');box(worldGroup,x,h/2,z,w,h,d,wall);box(worldGroup,x,h+.16,z,w*1.05,.32,d*1.05,mat('#454e57'));
      const windowMat=mat('#304d60',.35,.12);for(let wy=2.3;wy<h-1;wy+=3.1)for(let wx=-w/2+1;wx<w/2-0.3;wx+=2.1){box(worldGroup,x+wx,wy,z+d/2+.025,.72,.95,.05,windowMat);}
    }else if(kind==='Island'){
      const rock=new THREE.Mesh(new THREE.DodecahedronGeometry(2+Math.random()*4,1),mat(Math.random()>.5?'#a6a08c':'#657f7b'));rock.position.set(x,.5+Math.random()*1.2,z);rock.scale.set(1+Math.random(),.45+Math.random()*.5,1+Math.random());rock.rotation.set(Math.random(),Math.random(),Math.random());rock.castShadow=renderer.shadowMap.enabled;worldGroup.add(rock);
    }else{
      const mound=new THREE.Mesh(new THREE.SphereGeometry(2+Math.random()*5,9,6),mat(p.accent));mound.position.set(x,-.05,z);mound.scale.y=.18;worldGroup.add(mound);
      if(i%3===0){const tuft=new THREE.Mesh(new THREE.ConeGeometry(.22,.8,5),mat('#536d3f'));tuft.position.set(x+1,.35,z+1);worldGroup.add(tuft);}
    }
  }
  // Distant low-poly ridge silhouettes add depth while remaining cheap to render.
  for(let i=0;i<18;i++){const a=i/18*Math.PI*2;const h=18+Math.random()*34;const ridge=new THREE.Mesh(new THREE.ConeGeometry(17+Math.random()*12,h,6),mat(kind==='City'?'#8e9da5':kind==='Island'?'#567e83':'#829d9b'));ridge.position.set(Math.cos(a)*270,h*.42,Math.sin(a)*270);ridge.rotation.y=Math.random()*Math.PI;worldGroup.add(ridge);}
  if(mode==='lobby'){
    const colorsNpc=[0xe5b85c,0x6ae0bd,0x9e8cff],names=['GEAR SPIN','FORGE','MISSION BOARD'];
    for(let i=0;i<3;i++){const x=(i-1)*9;box(worldGroup,x,1.2,-10,3.4,2.4,2.6,mat('#1d2b3a'));const orb=new THREE.Mesh(new THREE.IcosahedronGeometry(.72,1),new THREE.MeshStandardMaterial({color:colorsNpc[i],emissive:colorsNpc[i],emissiveIntensity:.45,metalness:.2,roughness:.25}));orb.position.set(x,3,-10);worldGroup.add(orb);const label=makeLabel(names[i]);label.position.set(x,4.4,-10);worldGroup.add(label);}
  }
}
function makeLabel(text){const c=document.createElement('canvas');c.width=512;c.height=96;const ctx=c.getContext('2d');ctx.fillStyle='#0d1722';ctx.fillRect(0,0,512,96);ctx.strokeStyle='#e5b85c';ctx.lineWidth=5;ctx.strokeRect(3,3,506,90);ctx.fillStyle='#f4f6f8';ctx.font='bold 38px sans-serif';ctx.textAlign='center';ctx.fillText(text,256,61);const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;const m=new THREE.Mesh(new THREE.PlaneGeometry(5.8,1.1),new THREE.MeshBasicMaterial({map:tex,transparent:true,side:THREE.DoubleSide,depthWrite:false}));return m;}
function makePlayer(){
  player=new THREE.Group();scene.add(player);player.position.set(0,0,0);playerMesh=new THREE.Group();player.add(playerMesh);
  const coat=mat(save.custom.color||'#d6dce4',.72),leather=mat('#283744'),metal=mat('#9baebe',.28,.65),skin=mat('#d7b19a');
  capsule(playerMesh,0,1.15,0,.34,.65,coat);sphere(playerMesh,0,1.95,0,.27,.29,.27,skin,16);
  capsule(playerMesh,-.22,.38,0,.12,.48,leather);capsule(playerMesh,.22,.38,0,.12,.48,leather);
  capsule(playerMesh,-.45,1.18,0,.1,.38,coat,-.12);capsule(playerMesh,.45,1.18,0,.1,.38,coat,.12);
  box(playerMesh,-.38,.65,.02,.25,.2,.26,metal);box(playerMesh,.38,.65,.02,.25,.2,.26,metal);
  box(playerMesh,0,1.2,-.24,.7,.16,.12,leather);
}
function titanBuild(x,z){
  const group=new THREE.Group();group.position.set(x,0,z);const skinColors=['#b98270','#c3927e','#aa796d','#c49b83','#92766f'];const skin=mat(skinColors[Math.floor(Math.random()*skinColors.length)],.9);const shadowSkin=mat('#684b49',.95);const crease=mat('#81554f',.9);const eyeMat=new THREE.MeshStandardMaterial({color:'#ffe3a0',emissive:'#f45a36',emissiveIntensity:1.15,roughness:.3});
  // Anatomical, low-poly body with layered muscle forms. Height before scale is ~13 units.
  sphere(group,0,5.45,0,.85,.82,.55,skin,18);capsule(group,0,7.1,0,.88,1.8,skin);sphere(group,0,7.7,.02,1.05,1.02,.62,skin,18);sphere(group,0,7.25,.42,.76,.65,.3,skin,16);
  sphere(group,-.52,7.7,.45,.42,.52,.25,skin);sphere(group,.52,7.7,.45,.42,.52,.25,skin);
  capsule(group,-.56,3.1,0,.37,2.5,skin,.04);capsule(group,.56,3.1,0,.37,2.5,skin,-.04);
  sphere(group,-.57,1.05,.06,.4,.8,.42,skin,14);sphere(group,.57,1.05,.06,.4,.8,.42,skin,14);
  capsule(group,-1.27,6.35,0,.34,2.25,skin,-.14);capsule(group,1.27,6.35,0,.34,2.25,skin,.14);
  sphere(group,-1.42,5.02,.04,.38,.46,.37,skin,14);sphere(group,1.42,5.02,.04,.38,.46,.37,skin,14);
  capsule(group,-1.35,4.45,.03,.24,.42,skin,-.08);capsule(group,1.35,4.45,.03,.24,.42,skin,.08);
  capsule(group,0,8.55,0,.26,.48,skin);sphere(group,0,9.38,.04,.62,.77,.56,skin,18);
  sphere(group,-.29,9.48,.49,.13,.12,.08,shadowSkin,12);sphere(group,.29,9.48,.49,.13,.12,.08,shadowSkin,12);
  sphere(group,-.29,9.49,.55,.055,.06,.035,eyeMat,10);sphere(group,.29,9.49,.55,.055,.06,.035,eyeMat,10);
  sphere(group,0,9.15,.54,.14,.1,.12,crease,10);sphere(group,0,8.98,.51,.25,.065,.08,shadowSkin,12);
  // Chest and abdominal definition
  for(let row=0;row<3;row++)for(let side of [-1,1])sphere(group,side*(.31-row*.035),7.18-row*.42,.63,.29,.18,.09,row===0?skin:crease,12);
  // Warm nape marker is placed behind the neck to make the weak point readable.
  const nape=new THREE.Mesh(new THREE.TorusGeometry(.31,.075,8,18),new THREE.MeshStandardMaterial({color:0xffbd62,emissive:0x8b4013,emissiveIntensity:.65,roughness:.3}));nape.position.set(0,8.7,-.48);group.add(nape);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(1.35,.055,7,28),new THREE.MeshBasicMaterial({color:0xffbf68,transparent:true,opacity:.72}));ring.rotation.x=Math.PI/2;ring.position.y=.1;group.add(ring);
  const baseScale=1.28+Math.random()*.52;group.scale.setScalar(baseScale);
  const obj={group,hp:100,maxHp:100,alive:true,ring,attack:Math.random()*2,baseScale,height:12.8*baseScale,phase:Math.random()*6.28};group.userData.titan=obj;worldGroup.add(group);titans.push(obj);return obj;
}
function spawnTitan(){const a=Math.random()*Math.PI*2,d=28+Math.random()*28;const t=titanBuild(player.position.x+Math.cos(a)*d,player.position.z+Math.sin(a)*d);t.hp=100+Math.max(0,save.stats.totalKills/5);t.maxHp=t.hp;}
function spawnBatch(n=12){for(let i=0;i<n;i++)spawnTitan();}
function updateHud(){
  if(!$('gold'))return;$('gold').textContent=Math.floor(save.gold).toLocaleString();$('tokens').textContent=Math.floor(save.tokens).toLocaleString();
  $('healthBar').style.width=`${Math.max(0,health/maxHealth()*100)}%`;$('gasBar').style.width=`${Math.max(0,gas/maxGas()*100)}%`;
  $('killCount').textContent=kills;$('killGoal').textContent=mode==='mission'?'40':'∞';$('missionName').textContent=mode==='mission'?missionMap.toUpperCase():mode.toUpperCase();
  $('missionHealth').style.width=`${Math.max(0,health/maxHealth()*100)}%`;$('missionGas').style.width=`${Math.max(0,gas/maxGas()*100)}%`;
}
function syncDeviceUI(){
  const profile=getDeviceProfile();if(profile.kind!==lastDeviceKind){lastDeviceKind=profile.kind;}
  if($('deviceLabel'))$('deviceLabel').textContent=profile.label;
  if($('menuDeviceText'))$('menuDeviceText').textContent=profile.kind==='mobile'?'TOUCH CONTROLS READY':profile.kind==='pc'?'KEYBOARD + MOUSE READY':profile.kind==='console'?'CONSOLE INPUT DETECTED':'GAMEPAD CONNECTED';
  if($('controlText'))$('controlText').textContent=profile.kind==='mobile'?'PAD MOVE · DRAG LOOK\nHOOK / SLASH / BOOST / JUMP':profile.kind==='pc'?'WASD MOVE · MOUSE LOOK\nE HOOK · CLICK SLASH · SPACE JUMP · SHIFT BOOST · 1–3 SKILLS':'LEFT STICK MOVE · RIGHT STICK LOOK\nA JUMP · B HOOK · X SLASH · RT BOOST\nY BURST · LB PULSE · RB EXECUTE';
  const resultVisible=$('missionComplete')&&!$('missionComplete').classList.contains('hidden');
  $('touchControls').classList.toggle('hidden',!isTouchDevice()||!['mission','free','afk'].includes(mode)||resultVisible);
}
function bindUi(){
  $('saveName').onclick=()=>{save.name=$('playerName').value.trim().slice(0,18)||'Scout';persist();toast(`Callsign saved: ${save.name}`);};$('playerName').value=save.name||'Scout';
  document.querySelectorAll('[data-start]').forEach(b=>b.onclick=()=>startMode(b.dataset.start));document.querySelectorAll('[data-menu]').forEach(b=>b.onclick=()=>openPanel(b.dataset.menu));
  $('panelClose').onclick=()=>{$('panelOverlay').classList.add('hidden');if(missionMenuReturn){$('menu').classList.remove('hidden');missionMenuReturn=false;}};
  const togglePause=()=>{if(!['mission','free','afk'].includes(mode))return;paused=!paused;toast(paused?'Game paused':'Game resumed');};$('pauseBtn').onclick=togglePause;$('missionPauseBtn').onclick=togglePause;
  $('dialogueClose').onclick=()=>{$('dialogue').classList.add('hidden');if(dialogueNpc==='play')openPanel('play');else if(dialogueNpc==='gear')openPanel('gear');else if(dialogueNpc==='forge')openPanel('forge');};
  $('replayBtn').onclick=()=>startMode('mission',missionMap);$('lobbyBtn').onclick=()=>startMode('lobby');
  $('hookBtn').onclick=toggleHook;$('slashBtn').onclick=slash;$('boostBtn').onpointerdown=e=>{e.preventDefault();keys.ShiftLeft=true;};$('boostBtn').onpointerup=$('boostBtn').onpointercancel=()=>keys.ShiftLeft=false;$('jumpBtn').onclick=()=>{if(player.position.y<.25)velocity.y=10;};
  document.querySelectorAll('[data-move]').forEach(b=>{const k=b.dataset.move;b.onpointerdown=e=>{e.preventDefault();touchMove[k]=true;};b.onpointerup=b.onpointercancel=b.onpointerleave=()=>touchMove[k]=false;});
  document.querySelectorAll('[data-skill-use]').forEach(b=>b.onclick=()=>useSkill(Number(b.dataset.skillUse)));
  addEventListener('keydown',e=>{keys[e.code]=true;if(['Space','ArrowUp','ArrowDown'].includes(e.code))e.preventDefault();if(e.repeat)return;if(e.code==='KeyE')toggleHook();if(e.code==='KeyF')slash();if(e.code==='Space'&&player.position.y<.25)velocity.y=10;if(e.code==='Escape'&&['mission','free','afk'].includes(mode)){paused=!paused;toast(paused?'Game paused':'Game resumed');}if(e.code==='Digit1')useSkill(1);if(e.code==='Digit2')useSkill(2);if(e.code==='Digit3')useSkill(3);});
  addEventListener('keyup',e=>keys[e.code]=false);
  renderer.domElement.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'){if(e.button===0)slash();if(e.button===2)toggleHook();}});renderer.domElement.addEventListener('contextmenu',e=>e.preventDefault());
  renderer.domElement.addEventListener('pointermove',e=>{if(e.pointerType==='mouse'&&document.pointerLockElement===renderer.domElement){lookYaw-=e.movementX*.0023;lookPitch=Math.max(-.78,Math.min(.34,lookPitch-e.movementY*.0018));}else if(e.pointerType==='touch'&&dragging){const dx=e.clientX-lastPointer.x,dy=e.clientY-lastPointer.y;lookYaw-=dx*.004;lookPitch=Math.max(-.78,Math.min(.34,lookPitch-dy*.003));lastPointer={x:e.clientX,y:e.clientY};}});
  renderer.domElement.addEventListener('pointerdown',e=>{if(e.pointerType==='touch'){dragging=true;lastPointer={x:e.clientX,y:e.clientY};}});addEventListener('pointerup',()=>dragging=false);addEventListener('pointercancel',()=>dragging=false);renderer.domElement.addEventListener('dblclick',()=>renderer.domElement.requestPointerLock?.());
  addEventListener('gamepadconnected',()=>{syncDeviceUI();toast('Controller detected. Gamepad controls enabled.');});addEventListener('gamepaddisconnected',()=>{syncDeviceUI();toast('Controller disconnected. Switching controls.');});
  addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio||1,isMobile()?1.25:1.8));});
}
function startMode(next,map){
  $('menu').classList.add('hidden');$('panelOverlay').classList.add('hidden');$('missionComplete').classList.add('hidden');$('dialogue').classList.add('hidden');missionMenuReturn=false;
  if(next==='missions'){mode='lobby';openPanel('play',true);return;}
  if(next==='lobby'){
    mode='lobby';document.body.classList.remove('in-mission');makeWorld('Forest');player.position.set(0,0,3);velocity.set(0,0,0);health=maxHealth();gas=maxGas();kills=0;sessionGold=0;sessionTokens=0;paused=false;
    $('hud').classList.remove('hidden');$('quickbar').classList.remove('hidden');$('missionHud').classList.add('hidden');$('crosshair').classList.add('hidden');$('touchControls').classList.add('hidden');$('controlGuide').classList.add('hidden');$('skillCorner').classList.add('hidden');updateHud();syncDeviceUI();toast('Headquarters: approach a station or use the quick menu.');return;
  }
  if(next==='mission'){missionMap=map||'Forest';mode='mission';}else if(next==='free')mode='free';else if(next==='afk')mode='afk';else mode=next;
  document.body.classList.add('in-mission');makeWorld(mode==='mission'?missionMap:mode==='afk'?'Field':'Forest');player.position.set(0,0,0);velocity.set(0,0,0);health=maxHealth();gas=maxGas();kills=0;sessionGold=0;sessionTokens=0;elapsed=0;afkElapsed=0;finishLock=false;streak=0;paused=false;empoweredSlash=0;skillCooldowns.fill(0);lookYaw=0;lookPitch=-.12;
  spawnBatch(mode==='mission'?16:18);$('hud').classList.add('hidden');$('quickbar').classList.add('hidden');$('missionHud').classList.remove('hidden');$('crosshair').classList.remove('hidden');$('controlGuide').classList.remove('hidden');$('skillCorner').classList.remove('hidden');syncDeviceUI();updateHud();
  toast(mode==='afk'?'AFK Zone active. Keep this page open for timed rewards.':mode==='mission'?`${missionMap} mission: defeat 40 Titans.`:'Free Play: Titans will keep spawning.');
}
function openPanel(type,returnToMenu=false){
  missionMenuReturn=returnToMenu;const content=$('panelContent');content.innerHTML='';$('panelOverlay').classList.remove('hidden');
  const titles={play:'CHOOSE YOUR DEPLOYMENT',gear:'GEAR SPIN SHOP',upgrade:'DIRECT GEAR UPGRADES',forge:'FORGE & MERGE',skills:'SKILL TREE',stats:'PERSONAL STATS',custom:'CUSTOMIZATION',leader:'LEADERBOARD'};$('panelTitle').textContent=titles[type]||type.toUpperCase();
  if(type==='play'){
    content.innerHTML='<p class="hint">Select a region. Standard missions finish after 40 Titan kills.</p><div class="mission-options">'+[['Forest','Dense woodland and vertical routes'],['Field','Open ground for high-speed runs'],['City','Buildings and tight anchor angles'],['Island','Rocky coastal terrain']].map(([n,d])=>`<button data-mission="${n}">⚑ ${n.toUpperCase()}<small>${d}</small></button>`).join('')+'</div><div class="content-grid" style="margin-top:12px"><button data-mode="free">∞ FREE PLAY</button><button data-mode="afk">◷ AFK ZONE</button></div>';
    content.querySelectorAll('[data-mission]').forEach(b=>b.onclick=()=>startMode('mission',b.dataset.mission));content.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>startMode(b.dataset.mode));return;
  }
  if(type==='gear'){
    content.innerHTML=`<div class="inline-row"><p class="hint">Each spin costs 500 gold. Your current gear stays owned.</p><b>◈ ${save.gold.toLocaleString()}</b></div><button id="rollOne">SPIN ONCE · 500 ◈</button> <button id="rollTen">SPIN 10× · 5,000 ◈</button><div id="rollResult" class="hint" style="margin:12px 0"></div><h3>OWNED GEAR</h3><div class="content-grid">${save.owned.map((g,i)=>gearCard(g,i)).join('')}</div><h3>RARITY ODDS</h3><p class="hint">${rarity.map(r=>`<span style="color:${r.color}">${r.name} ${r.weight}%</span>`).join(' · ')}</p>`;
    $('rollOne').onclick=()=>roll(1);$('rollTen').onclick=()=>roll(10);content.querySelectorAll('[data-equip]').forEach(b=>b.onclick=()=>{save.equipped=Number(b.dataset.equip);persist();openPanel('gear');toast('Gear equipped.');});return;
  }
  if(type==='upgrade'){
    const stats=[['damage','Damage',100,'+8% slash damage'],['speed','Movement Speed',120,'+5% ground and air speed'],['critDamage','Critical Damage',150,'+15% critical multiplier'],['critChance','Critical Chance',150,'+2% critical chance'],['range','Hook Range',125,'+8% hook reach'],['gas','Gas Storage',100,'+10% gas capacity']];
    content.innerHTML='<p class="hint">Permanent upgrades apply to every gear. Costs rise with each level.</p><div class="content-grid">'+stats.map(([k,n,c,d])=>`<div class="item-card"><h3>${n}</h3><p>${d}</p><span class="pill">LEVEL ${save.upgrades[k]}</span><button data-upgrade="${k}" data-cost="${Math.floor(c*Math.pow(1.45,save.upgrades[k]))}">UPGRADE · ${Math.floor(c*Math.pow(1.45,save.upgrades[k]))} ◈</button></div>`).join('')+'</div>';
    content.querySelectorAll('[data-upgrade]').forEach(b=>b.onclick=()=>{const k=b.dataset.upgrade,c=Number(b.dataset.cost);if(save.gold<c)return toast('Not enough gold.');save.gold-=c;save.upgrades[k]++;persist();openPanel('upgrade');toast(`${k} upgraded!`);});return;
  }
  if(type==='forge'){
    content.innerHTML=`<p class="hint">Forge Tokens drop from Titans. Rarity forging costs 100 tokens per step; gear tier is separate from rarity. Merging consumes a duplicate of the same gear.</p><div class="inline-row"><b>⬡ ${save.tokens} Forge Tokens</b><span class="pill">100 TOKENS / STEP</span></div><div class="content-grid" style="margin-top:12px">${save.owned.map((g,i)=>`<div class="item-card"><h3>${g.name}</h3><p><span class="rarity-${rarity[g.rarity].name.toLowerCase()}">${rarity[g.rarity].name}</span> · Gear Tier ${g.tier}/4</p><button data-rarity="${i}">FORGE RARITY · 100 ⬡</button><button data-tier="${i}">FORGE TIER · 100 ⬡</button><button data-merge="${i}">MERGE DUPLICATE</button></div>`).join('')}</div>`;
    content.querySelectorAll('[data-rarity]').forEach(b=>b.onclick=()=>{const g=save.owned[+b.dataset.rarity];if(save.tokens<100)return toast('Need 100 Forge Tokens.');if(g.rarity>=6)return toast('Already Ultimate rarity.');save.tokens-=100;g.rarity++;persist();openPanel('forge');toast(`${g.name} is now ${rarity[g.rarity].name}!`);});
    content.querySelectorAll('[data-tier]').forEach(b=>b.onclick=()=>{const g=save.owned[+b.dataset.tier];if(save.tokens<100)return toast('Need 100 Forge Tokens.');if(g.tier>=4)return toast('This gear is already Tier 4.');save.tokens-=100;g.tier++;persist();openPanel('forge');toast(`Tier ${g.tier} unlocked: ${skillNames[gearNames.indexOf(g.name)][g.tier-1]}`);});
    content.querySelectorAll('[data-merge]').forEach(b=>b.onclick=()=>{const i=+b.dataset.merge,g=save.owned[i],j=save.owned.findIndex((x,k)=>k!==i&&x.name===g.name);if(j<0)return toast('You need a duplicate of this gear to merge.');if(g.tier>=4)return toast('Selected gear is already Tier 4.');save.owned.splice(j,1);g.tier++;if(save.equipped===j+1)save.equipped=i+1;persist();openPanel('forge');toast('Merge complete: gear tier increased.');});return;
  }
  if(type==='skills'){
    const routes=[['luck','LUCK','Improves forge-token drops and critical chance.'],['damage','DAMAGE','Increases slash damage.'],['health','HEALTH','Increases maximum health.']];
    content.innerHTML='<p class="hint">Spend gold to unlock permanent route levels. Each level costs 750 gold more than the previous level.</p><div class="content-grid">'+routes.map(([k,n,d])=>`<div class="skill-route"><h3>${n} ROUTE</h3><p>${d}</p><span class="pill">LEVEL ${save.skills[k]}</span><button data-skill="${k}">UNLOCK LEVEL ${save.skills[k]+1} · ${(save.skills[k]+1)*750} ◈</button></div>`).join('')+'</div>';
    content.querySelectorAll('[data-skill]').forEach(b=>b.onclick=()=>{const k=b.dataset.skill,c=(save.skills[k]+1)*750;if(save.gold<c)return toast('Not enough gold.');save.gold-=c;save.skills[k]++;persist();openPanel('skills');toast(`${k} route improved.`);});return;
  }
  if(type==='stats'){
    const s=save.stats;content.innerHTML=`<div class="stat-list">${[['TOTAL KILLS',s.totalKills],['LONGEST KILL STREAK',s.longestStreak],['CURRENT KILL STREAK',s.currentStreak],['MISSIONS COMPLETED',s.missions],['TOTAL DEATHS',s.deaths],['GEARS OWNED',save.owned.length]].map(([n,v])=>`<div class="stat"><small>${n}</small><b>${v}</b></div>`).join('')}</div><p class="hint">Progress is saved in this browser on this device. There are no online accounts or global leaderboard in this prototype.</p><button id="exportSave">EXPORT SAVE JSON</button><button id="resetSave">RESET LOCAL SAVE</button>`;
    $('exportSave').onclick=()=>{const blob=new Blob([JSON.stringify(save,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='titan-gear-save.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};$('resetSave').onclick=()=>{if(confirm('Reset all local progress? This cannot be undone.')){localStorage.removeItem(storeKey);save=baseSave();persist();openPanel('stats');}};return;
  }
  if(type==='custom'){
    content.innerHTML=`<p class="hint">Choose your scout uniform colour.</p><div class="inline-row"><label for="uniformColor">Uniform</label><input id="uniformColor" type="color" value="${save.custom.color||'#d6dce4'}"></div><button id="applyColor">APPLY STYLE</button>`;
    $('applyColor').onclick=()=>{save.custom.color=$('uniformColor').value;playerMesh.children[0].material.color.set(save.custom.color);persist();toast('Uniform colour saved.');};return;
  }
  if(type==='leader'){content.innerHTML='<p class="hint">Global rankings require a server and are not available in this local prototype.</p><div class="stat"><small>YOUR TOTAL TITAN KILLS</small><b>'+save.stats.totalKills+'</b></div>';return;}
}
function gearCard(g,i){return `<div class="item-card"><h3>${g.name}</h3><p><span class="rarity-${rarity[g.rarity].name.toLowerCase()}">${rarity[g.rarity].name}</span> · Tier ${g.tier}/4</p><small>Skill: ${skillNames[Math.max(0,gearNames.indexOf(g.name))][g.tier-1]}</small><button data-equip="${i+1}">${save.equipped===i+1?'EQUIPPED':'EQUIP GEAR'}</button></div>`;}
function roll(count){const cost=500*count;if(save.gold<cost)return toast('Not enough gold for that spin.');save.gold-=cost;const results=[];for(let n=0;n<count;n++){let r=Math.random()*100,idx=0;for(let i=0;i<rarity.length;i++){r-=rarity[i].weight;if(r<=0){idx=i;break;}}const name=gearNames[Math.floor(Math.random()*gearNames.length)];const g={name,rarity:Math.max(idx,rarityForGear[gearNames.indexOf(name)]),tier:1,serial:++save.serial};save.owned.push(g);results.push(g);}persist();openPanel('gear');$('rollResult').innerHTML='You rolled: '+results.map(g=>`<b style="color:${rarity[g.rarity].color}">${g.name} (${rarity[g.rarity].name})</b>`).join(' · ');}
function showDialogue(who,title,text){dialogueNpc=who;$('dialogueTitle').textContent=title;$('dialogueText').textContent=text;$('dialogue').classList.remove('hidden');}
function toggleHook(){
  if(mode==='lobby'){
    const pos=new THREE.Vector3(0,0,-10);if(player.position.distanceTo(pos)<18){const x=player.position.x;if(x< -4)showDialogue('gear','GEAR QUARTERMASTER','Spin for one of ten gear types. Each roll costs 500 gold. Better rarity improves your potential.');else if(x<4)showDialogue('forge','FORGE ENGINEER','Titans may drop Forge Tokens. Spend 100 tokens to advance gear rarity or tier.');else showDialogue('play','MISSION OFFICER','Choose Forest, Field, City, or Island. Standard missions require 40 Titan kills.');}else toast('Approach a station in the lobby.');return;
  }
  if(hookActive){hookActive=false;hookTarget=null;hookLine.visible=false;return;}
  let best=null,dist=Infinity;for(const t of titans){if(!t.alive)continue;const d=player.position.distanceTo(t.group.position);if(d<dist&&d<55+save.upgrades.range*5){dist=d;best=t;}}
  if(!best)return toast('No Titan in hook range. Move closer.');hookTarget=best;hookActive=true;hookPoint.copy(best.group.position).add(new THREE.Vector3(0,t.height*.68,0));toast('Hook connected — steer to build momentum.');
}
function slash(){
  if(mode==='lobby'){toggleHook();return;}if(!['mission','free','afk'].includes(mode)||slashCooldown>0)return;slashCooldown=.42;
  let best=null,dist=Infinity;for(const t of titans){if(!t.alive)continue;const d=player.position.distanceTo(t.group.position);if(d<dist&&d<9.5+save.upgrades.range*.3){dist=d;best=t;}}
  if(!best){toast('Too far to slash. Hook in and close the gap.');return;}
  const base=35*(1+save.upgrades.damage*.08)*(1+save.skills.damage*.1);const crit=Math.random()<(.08+save.upgrades.critChance*.02+save.skills.luck*.005);const dmg=base*(crit?(1.5+save.upgrades.critDamage*.15):1)*(empoweredSlash>0?2.25:1);best.hp-=dmg;const remain=Math.max(.78,1-(1-best.hp/best.maxHp)*.16);best.group.scale.set(best.baseScale*remain,best.baseScale*remain,best.baseScale*remain);toast(`${crit?'CRITICAL! ':''}${Math.round(dmg)} damage${empoweredSlash>0?' · EXECUTE':''}`);if(best.hp<=0)killTitan(best);
}
function useSkill(n){if(!['mission','free','afk'].includes(mode))return;if(skillCooldowns[n-1]>0)return toast(`Skill ${n} is recharging.`);const forward=new THREE.Vector3(-Math.sin(lookYaw),0,-Math.cos(lookYaw));
  if(n===1){velocity.addScaledVector(forward,30);velocity.y=Math.max(velocity.y,2.5);gas=Math.max(0,gas-8);skillCooldowns[0]=7;toast('BURST — high-speed dash!');}
  if(n===2){let hits=0;for(const t of [...titans]){if(t.alive&&player.position.distanceTo(t.group.position)<14){t.hp-=42*(1+save.skills.damage*.1);hits++;if(t.hp<=0)killTitan(t);else{const s=t.baseScale*Math.max(.78,1-(1-t.hp/t.maxHp)*.16);t.group.scale.set(s,s,s);}}}skillCooldowns[1]=12;toast(hits?`PULSE — struck ${hits} Titan${hits===1?'':'s'}!`:'PULSE — no Titans in range.');}
  if(n===3){empoweredSlash=6;skillCooldowns[2]=18;toast('EXECUTE armed — next slash deals bonus damage.');}
  updateSkillUI();
}
function updateSkillUI(){const labels=['Dash','Area strike','Empowered slash'];for(let i=0;i<3;i++){const b=document.querySelector(`[data-skill-use="${i+1}"]`);if(!b)continue;b.disabled=skillCooldowns[i]>0;const status=$(`skill${['One','Two','Three'][i]}Status`);if(status)status.textContent=skillCooldowns[i]>0?`${Math.ceil(skillCooldowns[i])}s`:labels[i];}if($('skillStatus'))$('skillStatus').textContent=skillCooldowns.some(x=>x>0)?'RECHARGING':empoweredSlash>0?'EXECUTE READY':'READY';}
function killTitan(t){if(!t.alive)return;t.alive=false;worldGroup.remove(t.group);kills++;streak++;save.stats.totalKills++;save.stats.currentStreak=streak;save.stats.longestStreak=Math.max(save.stats.longestStreak,streak);const reward=100+Math.floor(Math.random()*75);save.gold+=reward;sessionGold+=reward;const tokenChance=Math.min(.9,.1+save.skills.luck*.015);if(Math.random()<tokenChance){save.tokens++;sessionTokens++;toast(`Titan slain! +${reward} gold · +1 Forge Token`);}else toast(`Titan slain! +${reward} gold`);
  if(mode==='mission'&&kills>=40&&!finishLock){finishLock=true;save.stats.missions++;persist();finishMission();}
  else if(mode==='mission'){const alive=titans.filter(x=>x.alive).length;const remaining=40-kills-alive;if(alive<7&&remaining>0)spawnBatch(Math.min(8,remaining));}
  else if(titans.filter(x=>x.alive).length<8)spawnBatch(8);persist();updateHud();
}
function finishMission(){$('missionComplete').classList.remove('hidden');$('resultTitle').textContent=`${missionMap.toUpperCase()} COMPLETE`;$('resultKills').textContent=kills;$('resultGold').textContent=sessionGold;$('resultTokens').textContent=sessionTokens;$('resultTime').textContent=fmtTime(elapsed);$('missionHud').classList.add('hidden');$('touchControls').classList.add('hidden');$('controlGuide').classList.add('hidden');$('skillCorner').classList.add('hidden');hookActive=false;hookLine.visible=false;paused=true;}
function respawn(){save.stats.deaths++;persist();health=maxHealth();gas=maxGas();velocity.set(0,0,0);player.position.set(0,0,0);streak=0;save.stats.currentStreak=0;toast('You fell in combat. Respawning…');}
function pollGamepad(dt){const profile=getDeviceProfile(),pad=profile.pad;if(!pad)return {x:0,z:0,boost:false};const dead=.16;let ax=pad.axes?.[0]||0,ay=pad.axes?.[1]||0,rx=pad.axes?.[2]||0,ry=pad.axes?.[3]||0;if(Math.abs(ax)<dead)ax=0;if(Math.abs(ay)<dead)ay=0;if(Math.abs(rx)<dead)rx=0;if(Math.abs(ry)<dead)ry=0;
  lookYaw-=rx*dt*2.3;lookPitch=Math.max(-.78,Math.min(.34,lookPitch+ry*dt*1.7));const buttons=pad.buttons||[];const down=i=>!!buttons[i]?.pressed;const edge=i=>down(i)&&!lastPadButtons[i];
  if(edge(0)&&player.position.y<.25)velocity.y=10;if(edge(1))toggleHook();if(edge(2))slash();if(edge(3))useSkill(1);if(edge(4))useSkill(2);if(edge(5))useSkill(3);if(edge(9)&&['mission','free','afk'].includes(mode)){paused=!paused;toast(paused?'Game paused':'Game resumed');}
  lastPadButtons=buttons.map(b=>!!b.pressed);return {x:ax,z:ay,boost:down(7)||down(6)};
}
function update(dt){
  if(paused||!player)return;const gameplay=['mission','free','afk'].includes(mode);if(gameplay){elapsed+=dt;if(mode==='afk'){afkElapsed+=dt;if(afkElapsed>=300){afkElapsed-=300;save.gold+=5000;save.tokens+=10;sessionGold+=5000;sessionTokens+=10;persist();toast('AFK reward: +5,000 gold and +10 Forge Tokens.');}}}
  slashCooldown=Math.max(0,slashCooldown-dt);empoweredSlash=Math.max(0,empoweredSlash-dt);for(let i=0;i<3;i++)skillCooldowns[i]=Math.max(0,skillCooldowns[i]-dt);updateSkillUI();
  const pad=pollGamepad(dt);const forward=new THREE.Vector3(-Math.sin(lookYaw),0,-Math.cos(lookYaw));const right=new THREE.Vector3(Math.cos(lookYaw),0,-Math.sin(lookYaw));const input=new THREE.Vector3();
  const f=keys.KeyW||keys.ArrowUp||touchMove.forward||pad.z<-.16,b=keys.KeyS||keys.ArrowDown||touchMove.back||pad.z>.16,l=keys.KeyA||keys.ArrowLeft||touchMove.left||pad.x<-.16,r=keys.KeyD||keys.ArrowRight||touchMove.right||pad.x>.16;
  if(f)input.add(forward);if(b)input.sub(forward);if(r)input.add(right);if(l)input.sub(right);if(input.lengthSq())input.normalize();
  const boosting=!!(keys.ShiftLeft||keys.ShiftRight||pad.boost)&&gas>0;const speed=14*(1+save.upgrades.speed*.05)*(boosting?1.8:1);
  if(boosting)gas=Math.max(0,gas-18*dt);else gas=Math.min(maxGas(),gas+5*dt);
  const accel=hookActive?30:18;velocity.x+=input.x*accel*dt;velocity.z+=input.z*accel*dt;
  if(input.lengthSq()===0&&!hookActive){velocity.x*=Math.pow(.08,dt);velocity.z*=Math.pow(.08,dt);}
  if(hookActive&&hookTarget?.alive){const anchor=hookTarget.group.position.clone().add(new THREE.Vector3(0,hookTarget.height*.68,0));hookPoint.copy(anchor);const diff=anchor.clone().sub(player.position).normalize();velocity.addScaledVector(diff,27*dt);const dist=player.position.distanceTo(anchor);if(dist>2)velocity.addScaledVector(diff,-Math.min(8,dist*.18)*dt);hookLine.geometry.setFromPoints([player.position.clone().add(new THREE.Vector3(0,1.4,0)),anchor]);hookLine.visible=true;if(dist<2.4){hookActive=false;hookTarget=null;hookLine.visible=false;}}
  else if(hookActive){hookActive=false;hookLine.visible=false;}
  const maxSpeed=speed*(hookActive?2.45:1);const horiz=Math.hypot(velocity.x,velocity.z);if(horiz>maxSpeed){velocity.x*=maxSpeed/horiz;velocity.z*=maxSpeed/horiz;}
  velocity.y-=24*dt;player.position.addScaledVector(velocity,dt);if(player.position.y<0){player.position.y=0;velocity.y=Math.max(0,velocity.y);if(velocity.y<.3)velocity.y=0;}
  playerMesh.rotation.y=Math.atan2(velocity.x,velocity.z);if(input.lengthSq()&&velocity.length()<.5)playerMesh.rotation.y=Math.atan2(input.x,input.z);
  if(gameplay){
    spawnTimer+=dt;if(mode==='mission'){const alive=titans.filter(t=>t.alive).length;const remaining=40-kills-alive;if(alive<6&&remaining>0&&spawnTimer>1.8){spawnBatch(Math.min(8,remaining));spawnTimer=0;}}else if(titans.filter(t=>t.alive).length<10&&spawnTimer>4){spawnTitan();spawnTimer=0;}
    for(const t of titans){if(!t.alive)continue;t.attack+=dt;t.phase+=dt;const delta=player.position.clone().sub(t.group.position);delta.y=0;const d=delta.length();if(d>3.8&&d<85){delta.normalize();t.group.position.addScaledVector(delta,Math.min(.9,1.1*dt));t.group.rotation.y=Math.atan2(delta.x,delta.z);}t.group.position.y=Math.sin(t.phase*1.8)*.045;if(d<4.2&&t.attack>2.2){health-=8;t.attack=0;if(health<=0)respawn();}}
  }
  const lookAt=player.position.clone().add(new THREE.Vector3(0,1.8,0));const camDist=hookActive?7.2:9.2;const desired=lookAt.clone().add(new THREE.Vector3(Math.sin(lookYaw)*camDist*Math.cos(lookPitch),3.1+Math.sin(lookPitch)*camDist,-Math.cos(lookYaw)*camDist*Math.cos(lookPitch)));camera.position.lerp(desired,1-Math.pow(.001,dt));camera.lookAt(lookAt);
  if(performance.now()-lastHudRefresh>180){updateHud();lastHudRefresh=performance.now();}
}
function loop(){requestAnimationFrame(loop);const dt=Math.min(clock.getDelta(),.04);update(dt);renderer.render(scene,camera);if(Math.floor(performance.now()/1200)!==Math.floor((performance.now()-16)/1200))syncDeviceUI();}
init();
