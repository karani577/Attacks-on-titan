import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.164.1/build/three.module.js';

const $ = id => document.getElementById(id);
const storeKey = 'titanGearSave_v1';
const rarity = [
  {name:'Common',color:'#c7cbd1',weight:48},
  {name:'Uncommon',color:'#64d68b',weight:27},
  {name:'Rare',color:'#65a9ff',weight:14},
  {name:'Epic',color:'#c28aff',weight:7},
  {name:'Legendary',color:'#f4d34f',weight:3},
  {name:'Mythic',color:'#ff626a',weight:0.9},
  {name:'Ultimate',color:'#858b95',weight:0.1}
];
const gearNames = ['Default','Medic','Pro','Slayer','Perfect','Godly','Berserk','Shadow','Vanguard','Phantom'];
const skillNames = [['Hand Slasher','Quick Cut','Aerial Burst','Execution'],['Hand Slasher','Field Patch','Rescue Pulse','Last Stand'],['Hand Slasher','Vector Dash','Twin Hook','Overdrive'],['Hand Slasher','Titan Bane','Rending Arc','Execution'],['Hand Slasher','Perfect Angle','Wind Cutter','Zero Point'],['Hand Slasher','Divine Rush','Sky Splitter','Judgement'],['Hand Slasher','Rage Drive','Blood Rush','Berserk Mode'],['Hand Slasher','Night Veil','Silent Cut','Eclipse'],['Hand Slasher','Vanguard Charge','Formation Break','Frontline'],['Hand Slasher','Phantom Step','Ghost Line','Afterimage']];
const rarityForGear = [0,0,1,1,2,3,4,3,2,2];
const baseSave = () => ({name:'Scout',gold:0,tokens:0,owned:[{name:'Default',rarity:0,tier:1,serial:1}],equipped:1,upgrades:{damage:0,speed:0,critDamage:0,critChance:0,range:0,gas:0},skills:{luck:0,damage:0,health:0},stats:{totalKills:0,longestStreak:0,currentStreak:0,missions:0,deaths:0},custom:{color:'#d6dce4'},serial:1});
let save;
try { save = {...baseSave(),...JSON.parse(localStorage.getItem(storeKey)||'{}')}; } catch { save=baseSave(); }
save.stats={...baseSave().stats,...(save.stats||{})}; save.upgrades={...baseSave().upgrades,...(save.upgrades||{})}; save.skills={...baseSave().skills,...(save.skills||{})};
if(!Array.isArray(save.owned)||!save.owned.length) save.owned=baseSave().owned;
const persist=()=>{try{localStorage.setItem(storeKey,JSON.stringify(save));}catch{};updateHud();};
const toast=(msg)=>{const el=$('toast');el.textContent=msg;el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),2300);};
const fmtTime=s=>`${String(Math.floor(s/60)).padStart(2,'0')}:${String(Math.floor(s%60)).padStart(2,'0')}`;
let scene,camera,renderer,clock,player,playerMesh,ground,worldGroup,hookLine,hookTarget=null,hookActive=false,hookPoint=new THREE.Vector3(),velocity=new THREE.Vector3(),titans=[],trees=[],keys={},touchMove={},mode='lobby',missionMap='Forest',kills=0,sessionGold=0,sessionTokens=0,elapsed=0,afkElapsed=0,health=100,gas=100,streak=0,paused=false,missionStartedAt=0,finishLock=false,slashCooldown=0,skillCooldown=0,spawnTimer=0,dialogueNpc=null,lookYaw=0,lookPitch=-0.12,dragging=false,lastPointer={x:0,y:0},pointerLocked=false;
const isMobile=()=>matchMedia('(pointer: coarse)').matches || innerWidth<760;
function init(){
 scene=new THREE.Scene();scene.background=new THREE.Color('#a7c9d5');scene.fog=new THREE.Fog('#a7c9d5',75,230);
 camera=new THREE.PerspectiveCamera(70,innerWidth/innerHeight,.1,500);
 renderer=new THREE.WebGLRenderer({antialias:!isMobile(),powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,isMobile()?1.35:1.8));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=!isMobile();renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;$('game').appendChild(renderer.domElement);
 scene.add(new THREE.HemisphereLight(0xe4f4ff,0x6d765d,2.1));const sun=new THREE.DirectionalLight(0xfff0d6,2.6);sun.position.set(-30,60,25);sun.castShadow=!isMobile();sun.shadow.mapSize.set(1024,1024);scene.add(sun);
 worldGroup=new THREE.Group();scene.add(worldGroup);makeWorld('Forest');makePlayer();hookLine=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3()]),new THREE.LineBasicMaterial({color:0x75f0de}));scene.add(hookLine);hookLine.visible=false;
 bindUi();clock=new THREE.Clock();$('loading').classList.add('hidden');$('menu').classList.remove('hidden');requestAnimationFrame(loop);updateHud();if(isMobile())$('touchControls').classList.remove('hidden');
}
function mat(color,roughness=.8){return new THREE.MeshStandardMaterial({color,roughness});}
function box(parent,x,y,z,sx,sy,sz,material){const m=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz),material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function makeWorld(kind){
 while(worldGroup.children.length) {const o=worldGroup.children.pop();if(o.geometry)o.geometry.dispose();}
 const colors={Forest:['#6e8b5d','#4d6a45'],Field:['#a5a36a','#7b8c55'],City:['#858d94','#c4b79d'],Island:['#4c8c9a','#d5c6a1']};const [grass,accent]=colors[kind]||colors.Forest;
 const g=new THREE.Mesh(new THREE.PlaneGeometry(600,600),mat(grass));g.rotation.x=-Math.PI/2;g.position.y=-.12;g.receiveShadow=true;worldGroup.add(g);
 // grid-like paths help read speed and scale
 const path=box(worldGroup,0,.005,0,5,.025,600,mat('#8d927b'));path.material.transparent=true;path.material.opacity=.4;
 for(let i=0;i<42;i++){
  const x=(Math.random()-.5)*180,z=(Math.random()-.5)*180;
  if(Math.abs(x)<12&&Math.abs(z)<12)continue;
  if(kind==='City'){
   const h=5+Math.random()*15,w=5+Math.random()*6;const b=box(worldGroup,x,h/2,z,w,h,w,mat(Math.random()>.5?'#c9c3b5':'#8b999f'));for(let wy=2;wy<h;wy+=3)for(let wx=-w/2+1;wx<w/2;wx+=2)box(worldGroup,x+wx,wy,z+w/2+.02,.65,.8,.05,mat('#536c79'));
  }else if(kind==='Forest'){
   const trunk=box(worldGroup,x,2,z,.7,4,.7,mat('#594638'));const crown=new THREE.Mesh(new THREE.ConeGeometry(2.5,7,7),mat(accent));crown.position.set(x,7,z);crown.castShadow=true;worldGroup.add(crown);
  }else if(kind==='Island'){
   const rock=new THREE.Mesh(new THREE.DodecahedronGeometry(2+Math.random()*4,0),mat('#9a9a8a'));rock.position.set(x,1,z);rock.scale.y=.5;worldGroup.add(rock);
  }else{
   const mound=new THREE.Mesh(new THREE.SphereGeometry(2+Math.random()*4,7,5),mat(accent));mound.position.set(x,0,z);mound.scale.y=.2;worldGroup.add(mound);
  }
 }
 // lobby stations
 if(mode==='lobby'){
  const colorsNpc=[0xe5b85c,0x6ae0bd,0x9e8cff];const names=['GEAR SPIN','FORGE','MISSION BOARD'];
  for(let i=0;i<3;i++){const x=(i-1)*8;box(worldGroup,x,1.2,-9,3,2.4,2,mat('#273443'));const orb=new THREE.Mesh(new THREE.SphereGeometry(.6,12,10),new THREE.MeshStandardMaterial({color:colorsNpc[i],emissive:colorsNpc[i],emissiveIntensity:.25}));orb.position.set(x,3,-9);worldGroup.add(orb);const label=makeLabel(names[i]);label.position.set(x,4.2,-9);worldGroup.add(label);}
 }
 titans.forEach(t=>worldGroup.remove(t.group));titans=[];spawnTimer=0;
}
function makeLabel(text){const c=document.createElement('canvas');c.width=512;c.height=96;const ctx=c.getContext('2d');ctx.fillStyle='#101923';ctx.fillRect(0,0,512,96);ctx.strokeStyle='#e5b85c';ctx.lineWidth=5;ctx.strokeRect(3,3,506,90);ctx.fillStyle='#f4f6f8';ctx.font='bold 38px sans-serif';ctx.textAlign='center';ctx.fillText(text,256,61);const tex=new THREE.CanvasTexture(c);const m=new THREE.Mesh(new THREE.PlaneGeometry(5,1),new THREE.MeshBasicMaterial({map:tex,transparent:true,side:THREE.DoubleSide}));return m;}
function makePlayer(){
 player=new THREE.Group();scene.add(player);player.position.set(0,0,0);
 playerMesh=new THREE.Group();player.add(playerMesh);
 const body=box(playerMesh,0,1.1,0,.7,1.2,.38,mat(save.custom.color||'#d6dce4'));const head=new THREE.Mesh(new THREE.SphereGeometry(.28,12,10),mat('#d7b19a'));head.position.y=1.95;playerMesh.add(head);
 box(playerMesh,-.24,.35,0,.22,.7,.25,mat('#323e4b'));box(playerMesh,.24,.35,0,.22,.7,.25,mat('#323e4b'));
 box(playerMesh,-.49,1.15,0,.18,.9,.2,mat('#b9c4ce'));box(playerMesh,.49,1.15,0,.18,.9,.2,mat('#b9c4ce'));
}
function titanBuild(x,z){
 const group=new THREE.Group();group.position.set(x,0,z);const skin=mat('#bd8f7d');const dark=mat('#684b48');
 box(group,0,3.4,0,1.5,2.3,.8,skin);const head=new THREE.Mesh(new THREE.SphereGeometry(.65,12,10),skin);head.position.y=5;group.add(head);
 box(group,-1.1,3.5,0,.45,2.4,.48,skin);box(group,1.1,3.5,0,.45,2.4,.48,skin);
 box(group,-.4,1,0,.5,2,.55,skin);box(group,.4,1,0,.5,2,.55,skin);
 // face markings
 box(group,-.22,5.05,.57,.12,.08,.04,dark);box(group,.22,5.05,.57,.12,.08,.04,dark);box(group,0,4.7,.58,.24,.06,.04,dark);
 const ring=new THREE.Mesh(new THREE.TorusGeometry(.9,.06,6,24),new THREE.MeshBasicMaterial({color:0xffb55f}));ring.rotation.x=Math.PI/2;ring.position.y=.12;group.add(ring);
 const obj={group,hp:100,maxHp:100,alive:true,ring,attack:Math.random()*2};group.userData.titan=obj;worldGroup.add(group);titans.push(obj);return obj;
}
function spawnTitan(){
 const a=Math.random()*Math.PI*2,d=22+Math.random()*30;const t=titanBuild(player.position.x+Math.cos(a)*d,player.position.z+Math.sin(a)*d);t.hp=100+Math.max(0,save.stats.totalKills/5);t.maxHp=t.hp;
}
function spawnBatch(n=12){for(let i=0;i<n;i++)spawnTitan();}
function updateHud(){
 $('gold').textContent=Math.floor(save.gold).toLocaleString();$('tokens').textContent=Math.floor(save.tokens).toLocaleString();$('healthBar').style.width=Math.max(0,health)+'%';$('gasBar').style.width=Math.max(0,gas)+'%';
 $('killCount').textContent=kills;$('killGoal').textContent=mode==='mission'?'40':'∞';$('missionName').textContent=mode==='mission'?missionMap.toUpperCase():mode.toUpperCase();
}
function bindUi(){
 $('saveName').onclick=()=>{save.name=$('playerName').value.trim().slice(0,18)||'Scout';persist();toast(`Callsign saved: ${save.name}`);};
 $('playerName').value=save.name||'Scout';
 document.querySelectorAll('[data-start]').forEach(b=>b.onclick=()=>startMode(b.dataset.start));
 document.querySelectorAll('[data-menu]').forEach(b=>b.onclick=()=>openPanel(b.dataset.menu));
 $('panelClose').onclick=()=>{$('panelOverlay').classList.add('hidden');};
 $('pauseBtn').onclick=()=>{paused=!paused;toast(paused?'Game paused':'Game resumed');};
 $('dialogueClose').onclick=()=>{$('dialogue').classList.add('hidden');if(dialogueNpc==='play')openPanel('play');else if(dialogueNpc==='gear')openPanel('gear');else if(dialogueNpc==='forge')openPanel('forge');};
 $('replayBtn').onclick=()=>startMode('mission',missionMap);$('lobbyBtn').onclick=()=>startMode('lobby');
 $('hookBtn').onclick=toggleHook;$('slashBtn').onclick=slash;$('boostBtn').onpointerdown=()=>keys.ShiftLeft=true;$('boostBtn').onpointerup=()=>keys.ShiftLeft=false;$('jumpBtn').onclick=()=>{if(player.position.y<.2)velocity.y=10;};
 document.querySelectorAll('[data-move]').forEach(b=>{const k=b.dataset.move;const map={forward:'KeyW',back:'KeyS',left:'KeyA',right:'KeyD'};b.onpointerdown=e=>{e.preventDefault();touchMove[k]=true;};b.onpointerup=b.onpointercancel=b.onpointerleave=()=>touchMove[k]=false;});
 addEventListener('keydown',e=>{keys[e.code]=true;if(['Space','ArrowUp','ArrowDown'].includes(e.code))e.preventDefault();if(e.code==='KeyE')toggleHook();if(e.code==='KeyF'||e.code==='Mouse0')slash();if(e.code==='Space'&&player.position.y<.2)velocity.y=10;if(e.code==='Escape')paused=!paused;});
 addEventListener('keyup',e=>keys[e.code]=false);
 renderer.domElement.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'){if(e.button===0)slash();if(e.button===2)toggleHook();}});
 renderer.domElement.addEventListener('contextmenu',e=>e.preventDefault());
 renderer.domElement.addEventListener('pointermove',e=>{if(e.pointerType==='mouse'&&document.pointerLockElement===renderer.domElement){lookYaw-=e.movementX*.0025;lookPitch=Math.max(-.8,Math.min(.35,lookPitch-e.movementY*.002));}else if(e.pointerType==='touch'&&dragging){const dx=e.clientX-lastPointer.x,dy=e.clientY-lastPointer.y;lookYaw-=dx*.004;lookPitch=Math.max(-.8,Math.min(.35,lookPitch-dy*.003));lastPointer={x:e.clientX,y:e.clientY};}});
 renderer.domElement.addEventListener('pointerdown',e=>{if(e.pointerType==='touch'){dragging=true;lastPointer={x:e.clientX,y:e.clientY};}});addEventListener('pointerup',()=>dragging=false);
 renderer.domElement.addEventListener('dblclick',()=>renderer.domElement.requestPointerLock?.());
 addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,isMobile()?1.35:1.8));});
}
function startMode(next,map){
 $('menu').classList.add('hidden');$('panelOverlay').classList.add('hidden');$('missionComplete').classList.add('hidden');$('dialogue').classList.add('hidden');
 mode=next==='missions'?'choose':next;paused=false;
 if(next==='missions'){openPanel('play');return;}
 if(next==='lobby'){mode='lobby';makeWorld('Forest');player.position.set(0,0,3);velocity.set(0,0,0);health=100;gas=100;titans=[];$('hud').classList.remove('hidden');$('quickbar').classList.remove('hidden');$('missionHud').classList.add('hidden');$('crosshair').classList.add('hidden');if(isMobile())$('touchControls').classList.add('hidden');updateHud();toast('Welcome to headquarters. Approach a station or use the quick menu.');return;}
 if(next==='mission'){missionMap=map||'Forest';mode='mission';}
 else if(next==='free')mode='free';else if(next==='afk')mode='afk';
 makeWorld(mode==='mission'?missionMap:mode==='afk'?'Field':'Forest');player.position.set(0,0,0);velocity.set(0,0,0);health=100;gas=100;kills=0;sessionGold=0;sessionTokens=0;elapsed=0;missionStartedAt=performance.now();finishLock=false;streak=0;
 spawnBatch(mode==='mission'?16:18);$('hud').classList.remove('hidden');$('quickbar').classList.remove('hidden');$('missionHud').classList.remove('hidden');$('crosshair').classList.remove('hidden');if(isMobile())$('touchControls').classList.remove('hidden');updateHud();toast(mode==='afk'?'AFK Zone active. Keep this page open for timed rewards.':mode==='mission'?`${missionMap} mission: defeat 40 Titans.`:'Free Play: Titans will keep spawning.');
}
function openPanel(type){
 const content=$('panelContent');content.innerHTML='';$('panelOverlay').classList.remove('hidden');
 const titles={play:'CHOOSE YOUR DEPLOYMENT',gear:'GEAR SPIN SHOP',upgrade:'DIRECT GEAR UPGRADES',forge:'FORGE & MERGE',skills:'SKILL TREE',stats:'PERSONAL STATS',custom:'CUSTOMIZATION',leader:'LEADERBOARD'};$('panelTitle').textContent=titles[type]||type.toUpperCase();
 if(type==='play'){
  content.innerHTML='<p class="hint">Select a region. Each standard mission ends after 40 Titan kills.</p><div class="mission-options">'+[['Forest','Dense woodland and tight turns'],['Field','Open ground for high-speed runs'],['City','Buildings for anchor practice'],['Island','Rocky coastal terrain']].map(([n,d])=>`<button data-mission="${n}">⚑ ${n.toUpperCase()}<small>${d}</small></button>`).join('')+'</div><div class="content-grid" style="margin-top:12px"><button data-mode="free">∞ FREE PLAY</button><button data-mode="afk">◷ AFK ZONE</button></div>';
  content.querySelectorAll('[data-mission]').forEach(b=>b.onclick=()=>startMode('mission',b.dataset.mission));content.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>startMode(b.dataset.mode));return;
 }
 if(type==='gear'){
  content.innerHTML=`<div class="inline-row"><p class="hint">Each spin costs 500 gold. Rarity odds are shown below. Your current gear stays owned.</p><b>◈ ${save.gold.toLocaleString()}</b></div><button id="rollOne">SPIN ONCE · 500 ◈</button> <button id="rollTen">SPIN 10× · 5,000 ◈</button><div id="rollResult" class="hint" style="margin:12px 0"></div><h3>OWNED GEAR</h3><div class="content-grid">${save.owned.map((g,i)=>gearCard(g,i)).join('')}</div><h3>RARITY ODDS</h3><p class="hint">${rarity.map(r=>`<span style="color:${r.color}">${r.name} ${r.weight}%</span>`).join(' · ')}</p>`;
  $('rollOne').onclick=()=>roll(1);$('rollTen').onclick=()=>roll(10);content.querySelectorAll('[data-equip]').forEach(b=>b.onclick=()=>{save.equipped=Number(b.dataset.equip);persist();openPanel('gear');toast('Gear equipped.');});return;
 }
 if(type==='upgrade'){
  const stats=[['damage','Damage',100,'+8% slash damage'],['speed','Movement Speed',120,'+5% ground/air speed'],['critDamage','Critical Damage',150,'+15% critical multiplier'],['critChance','Critical Chance',150,'+2% critical chance'],['range','Hook Range',125,'+8% hook reach'],['gas','Gas Storage',100,'+10% gas capacity']];
  content.innerHTML='<p class="hint">Permanent upgrades apply to every gear. Costs rise with each level.</p><div class="content-grid">'+stats.map(([k,n,c,d])=>`<div class="item-card"><h3>${n}</h3><p>${d}</p><span class="pill">LEVEL ${save.upgrades[k]}</span><button data-upgrade="${k}" data-cost="${Math.floor(c*Math.pow(1.45,save.upgrades[k]))}">UPGRADE · ${Math.floor(c*Math.pow(1.45,save.upgrades[k]))} ◈</button></div>`).join('')+'</div>';
  content.querySelectorAll('[data-upgrade]').forEach(b=>b.onclick=()=>{const k=b.dataset.upgrade,c=Number(b.dataset.cost);if(save.gold<c)return toast('Not enough gold.');save.gold-=c;save.upgrades[k]++;persist();openPanel('upgrade');toast(`${k} upgraded!`);});return;
 }
 if(type==='forge'){
  content.innerHTML=`<p class="hint">Forge Tokens drop from Titans with a 10% chance. Rarity forging costs 100 tokens per step. Gear tier is separate from rarity. Merging consumes a duplicate gear of the same name and raises the selected gear's tier.</p><div class="inline-row"><b>⬡ ${save.tokens} Forge Tokens</b><span class="pill">100 TOKENS / RARITY STEP</span></div><div class="content-grid" style="margin-top:12px">${save.owned.map((g,i)=>`<div class="item-card"><h3>${g.name}</h3><p><span class="rarity-${rarity[g.rarity].name.toLowerCase()}">${rarity[g.rarity].name}</span> · Gear Tier ${g.tier}/4</p><button data-rarity="${i}">FORGE RARITY · 100 ⬡</button><button data-tier="${i}">FORGE TIER · 100 ⬡</button><button data-merge="${i}">MERGE DUPLICATE</button></div>`).join('')}</div>`;
  content.querySelectorAll('[data-rarity]').forEach(b=>b.onclick=()=>{const g=save.owned[+b.dataset.rarity];if(save.tokens<100)return toast('Need 100 Forge Tokens.');if(g.rarity>=6)return toast('Already Ultimate rarity.');save.tokens-=100;g.rarity++;persist();openPanel('forge');toast(`${g.name} is now ${rarity[g.rarity].name}!`);});
  content.querySelectorAll('[data-tier]').forEach(b=>b.onclick=()=>{const g=save.owned[+b.dataset.tier];if(save.tokens<100)return toast('Need 100 Forge Tokens.');if(g.tier>=4)return toast('This gear is already Tier 4.');save.tokens-=100;g.tier++;persist();openPanel('forge');toast(`Tier ${g.tier} unlocked: ${skillNames[gearNames.indexOf(g.name)][g.tier-1]}`);});
  content.querySelectorAll('[data-merge]').forEach(b=>b.onclick=()=>{const i=+b.dataset.merge,g=save.owned[i],j=save.owned.findIndex((x,k)=>k!==i&&x.name===g.name);if(j<0)return toast('You need a duplicate of this gear to merge.');if(g.tier>=4)return toast('Selected gear is already Tier 4.');save.owned.splice(j,1);g.tier++;if(save.equipped===j+1)save.equipped=i+1;persist();openPanel('forge');toast('Merge complete: gear tier increased.');});return;
 }
 if(type==='skills'){
  const routes=[['luck','LUCK','Improves forge-token drops and gear spin luck.'],['damage','DAMAGE','Increases slash damage.'],['health','HEALTH','Increases max health and survivability.']];
  content.innerHTML='<p class="hint">Spend gold to unlock permanent route levels. Each level costs 750 gold more than the previous level.</p><div class="content-grid">'+routes.map(([k,n,d])=>`<div class="skill-route"><h3>${n} ROUTE</h3><p>${d}</p><span class="pill">LEVEL ${save.skills[k]}</span><button data-skill="${k}">UNLOCK LEVEL ${save.skills[k]+1} · ${(save.skills[k]+1)*750} ◈</button></div>`).join('')+'</div>';
  content.querySelectorAll('[data-skill]').forEach(b=>b.onclick=()=>{const k=b.dataset.skill,c=(save.skills[k]+1)*750;if(save.gold<c)return toast('Not enough gold.');save.gold-=c;save.skills[k]++;persist();openPanel('skills');toast(`${k} route improved.`);});return;
 }
 if(type==='stats'){
  const s=save.stats;content.innerHTML=`<div class="stat-list">${[['TOTAL KILLS',s.totalKills],['LONGEST KILL STREAK',s.longestStreak],['CURRENT KILL STREAK',s.currentStreak],['MISSIONS COMPLETED',s.missions],['TOTAL DEATHS',s.deaths],['GEARS OWNED',save.owned.length]].map(([n,v])=>`<div class="stat"><small>${n}</small><b>${v}</b></div>`).join('')}</div><p class="hint">Stats are saved in this browser on this device. This demo does not have online accounts or a global leaderboard.</p><button id="exportSave">EXPORT SAVE JSON</button><button id="resetSave">RESET LOCAL SAVE</button>`;
  $('exportSave').onclick=()=>{const blob=new Blob([JSON.stringify(save,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='titan-gear-save.json';a.click();URL.revokeObjectURL(url);};$('resetSave').onclick=()=>{if(confirm('Reset all local progress? This cannot be undone.')){localStorage.removeItem(storeKey);save=baseSave();persist();openPanel('stats');}};return;
 }
 if(type==='custom'){
  content.innerHTML=`<p class="hint">Choose your scout uniform color.</p><div class="inline-row"><label for="uniformColor">Uniform</label><input id="uniformColor" type="color" value="${save.custom.color||'#d6dce4'}"></div><button id="applyColor">APPLY STYLE</button>`;
  $('applyColor').oninput=()=>{};$('applyColor').onclick=()=>{save.custom.color=$('uniformColor').value;playerMesh.children[0].material.color.set(save.custom.color);persist();toast('Uniform color saved.');};return;
 }
 if(type==='leader'){content.innerHTML='<p class="hint">Global rankings require a server and are not available in this local demo.</p><div class="stat"><small>YOUR TOTAL TITAN KILLS</small><b>'+save.stats.totalKills+'</b></div>';return;}
}
function gearCard(g,i){return `<div class="item-card"><h3>${g.name}</h3><p><span class="rarity-${rarity[g.rarity].name.toLowerCase()}">${rarity[g.rarity].name}</span> · Tier ${g.tier}/4</p><small>Skill: ${skillNames[Math.max(0,gearNames.indexOf(g.name))][g.tier-1]}</small><button data-equip="${i+1}">${save.equipped===i+1?'EQUIPPED':'EQUIP GEAR'}</button></div>`;}
function roll(count){
 const cost=500*count;if(save.gold<cost)return toast('Not enough gold for that spin.');save.gold-=cost;const results=[];
 for(let n=0;n<count;n++){let r=Math.random()*100,idx=0;for(let i=0;i<rarity.length;i++){r-=rarity[i].weight;if(r<=0){idx=i;break;}}const name=gearNames[Math.floor(Math.random()*gearNames.length)];const g={name,rarity:Math.max(idx,rarityForGear[gearNames.indexOf(name)]),tier:1,serial:++save.serial};save.owned.push(g);results.push(g);}
 persist();const result=$('rollResult');result.innerHTML='You rolled: '+results.map(g=>`<b style="color:${rarity[g.rarity].color}">${g.name} (${rarity[g.rarity].name})</b>`).join(' · ');openPanel('gear');$('rollResult').innerHTML='You rolled: '+results.map(g=>`<b style="color:${rarity[g.rarity].color}">${g.name} (${rarity[g.rarity].name})</b>`).join(' · ');
}
function showDialogue(who,title,text){dialogueNpc=who;$('dialogueTitle').textContent=title;$('dialogueText').textContent=text;$('dialogue').classList.remove('hidden');}
function toggleHook(){
 if(mode==='lobby'){const near=player.position.distanceTo(new THREE.Vector3(0,0,-9));if(near<16){const x=player.position.x;if(x< -3)showDialogue('gear','GEAR QUARTERMASTER','Spin for one of ten gear types. Each roll costs 500 gold. Better rarity improves your starting potential.');else if(x<4)showDialogue('forge','FORGE ENGINEER','Forge Tokens have a 10% chance to drop from Titans. Spend 100 tokens to advance a rarity or gear tier.');else showDialogue('play','MISSION OFFICER','Choose Forest, Field, City, or Island. Standard missions require 40 Titan kills.');}else toast('Approach a station in the lobby.');return;}
 if(hookActive){hookActive=false;hookTarget=null;hookLine.visible=false;return;}
 let best=null,dist=Infinity;for(const t of titans){if(!t.alive)continue;const d=player.position.distanceTo(t.group.position);if(d<dist&&d<45+save.upgrades.range*5){dist=d;best=t;}}
 if(!best)return toast('No Titan in hook range. Move closer.');hookTarget=best;hookActive=true;hookPoint.copy(best.group.position).add(new THREE.Vector3(0,3.2,0));toast('Hook connected — steer to build momentum.');
}
function slash(){
 if(mode==='lobby'){toggleHook();return;}if(slashCooldown>0)return;slashCooldown=.42;
 let best=null,dist=Infinity;for(const t of titans){if(!t.alive)continue;const d=player.position.distanceTo(t.group.position);if(d<dist&&d<7+save.upgrades.range*.3){dist=d;best=t;}}
 if(!best){toast('Too far to slash. Hook in and close the gap.');return;}
 const base=35*(1+save.upgrades.damage*.08)*(1+save.skills.damage*.1);const crit=Math.random()<(.08+save.upgrades.critChance*.02+save.skills.luck*.005);const dmg=base*(crit?(1.5+save.upgrades.critDamage*.15):1);best.hp-=dmg;best.group.scale.setScalar(Math.max(.75,best.hp/best.maxHp));toast(`${crit?'CRITICAL! ':''}${Math.round(dmg)} damage`);
 if(best.hp<=0)killTitan(best);
}
function killTitan(t){
 t.alive=false;worldGroup.remove(t.group);kills++;streak++;save.stats.totalKills++;save.stats.currentStreak=streak;save.stats.longestStreak=Math.max(save.stats.longestStreak,streak);
 const reward=100+Math.floor(Math.random()*75);save.gold+=reward;sessionGold+=reward;
 const tokenChance=Math.min(.9,.1+save.skills.luck*.015);if(Math.random()<tokenChance){save.tokens++;sessionTokens++;toast(`Titan slain! +${reward} gold · +1 Forge Token`);}else toast(`Titan slain! +${reward} gold`);
 if(mode==='mission'&&kills>=40&&!finishLock){finishLock=true;save.stats.missions++;persist();finishMission();}else if(mode!=='mission'&&titans.filter(x=>x.alive).length<8)spawnBatch(8);
 persist();updateHud();
}
function finishMission(){
 $('missionComplete').classList.remove('hidden');$('resultTitle').textContent=`${missionMap.toUpperCase()} COMPLETE`;$('resultKills').textContent=kills;$('resultGold').textContent=sessionGold;$('resultTokens').textContent=sessionTokens;$('resultTime').textContent=fmtTime(elapsed);
 $('missionHud').classList.add('hidden');$('touchControls').classList.add('hidden');hookActive=false;hookLine.visible=false;
}
function respawn(){save.stats.deaths++;persist();health=100;gas=100;velocity.set(0,0,0);player.position.set(0,0,0);streak=0;save.stats.currentStreak=0;if(mode==='mission'){toast('You fell in combat. Respawning…');}else toast('Respawned. Back into the fight.');}
function update(dt){
 if(paused||$('missionComplete').classList.contains('hidden')===false)return;
 if(mode==='lobby'){player.position.y=0;return;}
 elapsed+=dt;
 if(mode==='afk'){afkElapsed+=dt;if(afkElapsed>=300){afkElapsed-=300;save.gold+=5000;save.tokens+=10;sessionGold+=5000;sessionTokens+=10;persist();toast('AFK reward: +5,000 gold and +10 Forge Tokens.');}}
 slashCooldown=Math.max(0,slashCooldown-dt);skillCooldown=Math.max(0,skillCooldown-dt);spawnTimer+=dt;
 if(mode!=='mission'&&titans.filter(t=>t.alive).length<10&&spawnTimer>4){spawnTitan();spawnTimer=0;}
 const forward=new THREE.Vector3(-Math.sin(lookYaw),0,-Math.cos(lookYaw));const right=new THREE.Vector3(Math.cos(lookYaw),0,-Math.sin(lookYaw));const input=new THREE.Vector3();
 if(keys.KeyW||keys.ArrowUp||touchMove.forward)input.add(forward);if(keys.KeyS||keys.ArrowDown||touchMove.back)input.sub(forward);if(keys.KeyD||keys.ArrowRight||touchMove.right)input.add(right);if(keys.KeyA||keys.ArrowLeft||touchMove.left)input.sub(right);if(input.lengthSq())input.normalize();
 const equipped=save.owned[Math.max(0,Math.min(save.owned.length-1,(save.equipped||1)-1))]||save.owned[0];const speed=14*(1+save.upgrades.speed*.05)*(keys.ShiftLeft||keys.ShiftRight?1.8:1);
 if((keys.ShiftLeft||keys.ShiftRight)&&gas>0)gas=Math.max(0,gas-18*dt);else gas=Math.min(100+save.upgrades.gas*10,gas+5*dt);
 const accel=hookActive?28:18;velocity.x+=input.x*accel*dt;velocity.z+=input.z*accel*dt;
 if(input.lengthSq()===0&&!hookActive){velocity.x*=Math.pow(.08,dt);velocity.z*=Math.pow(.08,dt);}
 if(hookActive&&hookTarget?.alive){const anchor=hookTarget.group.position.clone().add(new THREE.Vector3(0,3.2,0));hookPoint.copy(anchor);const diff=anchor.clone().sub(player.position).normalize();velocity.addScaledVector(diff,26*dt);const dist=player.position.distanceTo(anchor);if(dist>2)velocity.addScaledVector(diff,-Math.min(8,dist*.2)*dt);hookLine.geometry.setFromPoints([player.position.clone().add(new THREE.Vector3(0,1.4,0)),anchor]);hookLine.visible=true;if(player.position.distanceTo(anchor)<2.3){hookActive=false;hookTarget=null;hookLine.visible=false;}}
 else if(hookActive){hookActive=false;hookLine.visible=false;}
 const maxSpeed=speed*(hookActive?2.4:1);const horiz=Math.hypot(velocity.x,velocity.z);if(horiz>maxSpeed){velocity.x*=maxSpeed/horiz;velocity.z*=maxSpeed/horiz;}
 velocity.y-=24*dt;player.position.addScaledVector(velocity,dt);if(player.position.y<0){player.position.y=0;velocity.y=Math.max(0,velocity.y);if(velocity.y<.3)velocity.y=0;}
 playerMesh.rotation.y=Math.atan2(velocity.x,velocity.z);if(input.lengthSq()&&velocity.length()<.5)playerMesh.rotation.y=Math.atan2(input.x,input.z);
 if(player.position.y===0&&Math.abs(velocity.y)<.1&&player.position.y<.01){} // stable ground contact
 // Titan pressure at close range
 for(const t of titans){if(!t.alive)continue;t.attack+=dt;const d=player.position.distanceTo(t.group.position);if(d<3.4&&t.attack>2.5){health-=8;t.attack=0;if(health<=0){health=100;respawn();}}}
 // Follow camera with damping, looking slightly above the player
 const lookAt=player.position.clone().add(new THREE.Vector3(0,1.6,0));const camDist=hookActive?7:8.5;const desired=lookAt.clone().add(new THREE.Vector3(Math.sin(lookYaw)*camDist*Math.cos(lookPitch),3+Math.sin(lookPitch)*camDist,-Math.cos(lookYaw)*camDist*Math.cos(lookPitch)));
 camera.position.lerp(desired,1-Math.pow(.001,dt));camera.lookAt(lookAt);
 updateHud();
}
function loop(){requestAnimationFrame(loop);const dt=Math.min(clock.getDelta(),.04);if(!paused)update(dt);renderer.render(scene,camera);}
init();
