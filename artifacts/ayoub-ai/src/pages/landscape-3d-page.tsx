import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Box, Download, Eye, Lightbulb, MousePointer2, Sparkles, TreePine, Waves, X } from 'lucide-react';
import { Link } from 'wouter';
import * as THREE from 'three';
import { userStorageKey } from '@/lib/user-account';
import './landscape-3d-page.css';

type SceneObject = { id: string; type: 'tree' | 'water' | 'lawn' | 'path' | 'light' | 'pergola'; label: string; x: number; y: number; scale: number; rotate: number; sourceImage?: string; sourceShape?: string; sourceWidth?: number; sourceHeight?: number; sourceColor?: number; sourceDepth?: number };
const STORAGE_KEY = 'qadri-landscape-3d-v2';
const PLAN_STORAGE_KEY = 'qadri-site-plan-v1';
const defaults: SceneObject[] = [
  { id: 'lawn-1', type: 'lawn', label: 'المسطح الأخضر', x: 0, y: 0, scale: 1.3, rotate: 0 },
  { id: 'water-1', type: 'water', label: 'عنصر مائي', x: 7, y: -3, scale: 1, rotate: 0 },
  { id: 'tree-1', type: 'tree', label: 'شجرة زينة', x: -7, y: -6, scale: 1, rotate: 0 },
  { id: 'tree-2', type: 'tree', label: 'شجرة زينة', x: -2, y: -10, scale: .82, rotate: 0 },
  { id: 'path-1', type: 'path', label: 'ممشى حجري', x: 0, y: 6, scale: 1.1, rotate: 0 },
];
const labels: Record<SceneObject['type'], string> = { tree: 'شجرة', water: 'ماء', lawn: 'مسطح أخضر', path: 'ممشى', light: 'إضاءة', pergola: 'برغولا' };
const icons = { tree: TreePine, water: Waves, lawn: Box, path: Box, light: Lightbulb, pergola: Box };
const planStorageKey = () => userStorageKey(PLAN_STORAGE_KEY);
const clampScene = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
function scenePosition(x = 50, y = 50) { return { x: clampScene((x - 50) * 0.28, -13, 13), y: clampScene((y - 50) * 0.24, -11, 11) }; }
function sceneType(category = '', name = ''): SceneObject['type'] {
  const value = `${category} ${name}`.toLocaleLowerCase('ar');
  if (/ماء|بركة|مسبح|نافورة|water|pool/.test(value)) return 'water';
  if (/ممشى|مسار|طريق|ممر|path|road/.test(value)) return 'path';
  if (/إضاءة|انارة|مصباح|light/.test(value)) return 'light';
  if (/برغولا|جلسة|مبنى|building|pergola/.test(value)) return 'pergola';
  if (/عشب|مسطح|نجيل|lawn|حديقة/.test(value)) return 'lawn';
  return 'tree';
}
function convertPlanToScene(): SceneObject[] | null {
  try {
    const raw = localStorage.getItem(planStorageKey());
    if (!raw) return null;
    const plan = JSON.parse(raw) as { items?: Array<Record<string, unknown>>; landscapeDrawings?: Array<Record<string, unknown>> };
    const objects: SceneObject[] = [];
    (plan.landscapeDrawings || []).forEach((drawing, index) => {
      const tool = String(drawing.tool || '');
      const type = tool === 'water' ? 'water' : tool === 'path-area' ? 'path' : tool === 'building' ? 'pergola' : 'lawn';
      const position = scenePosition(Number(drawing.x) || 50, Number(drawing.y) || 50);
      const width = Number(drawing.width) || 14;
      const height = Number(drawing.height) || 14;
      const colors: Record<string, number> = { building: 0x9b8066, entrance: 0xb59873, lawn: 0x68a45c, parking: 0x9aa29a, paving: 0xb8a98d, water: 0x43aabe, planter: 0x7b9d58, 'path-area': 0xc2ac7d };
      objects.push({ id: `plan-drawing-${index}`, type, label: type === 'water' ? 'عنصر مائي من المخطط' : type === 'path' ? 'ممشى من المخطط' : type === 'pergola' ? 'منشأة من المخطط' : 'مسطح أخضر من المخطط', x: position.x, y: position.y, scale: 1, rotate: Number(drawing.rotation) || 0, sourceWidth: clampScene(width * .28, 1, 28), sourceHeight: clampScene(height * .24, 1, 24), sourceDepth: type === 'water' ? .16 : .45, sourceColor: colors[tool] || 0x8da582 });
    });
    (plan.items || []).forEach((item, itemIndex) => {
      const quantity = Math.min(24, Math.max(1, Math.round(Number(item.quantity) || 1)));
      const savedPositions = Array.isArray(item.landscapeInstances) ? item.landscapeInstances as Array<Record<string, unknown>> : [];
      const positions = savedPositions.length ? savedPositions : Array.from({ length: quantity }, (_, index) => ({ x: Number(item.landscapeX) || 50 + (index % 4) * 5, y: Number(item.landscapeY) || 50 + Math.floor(index / 4) * 5 }));
      const type = sceneType(String(item.category || ''), String(item.name || ''));
      positions.slice(0, quantity).forEach((point, index) => {
        const position = scenePosition(Number(point.x) || 50, Number(point.y) || 50);
        objects.push({ id: `plan-item-${itemIndex}-${index}`, type, label: String(item.name || labels[type]), x: position.x, y: position.y, scale: clampScene((Number(item.landscapeSize) || 58) / 58, .5, 1.8), rotate: 0, sourceImage: String(item.landscapeIcon || item.image || ''), sourceShape: String(item.landscapeShape || 'circle') });
      });
    });
    return objects.length ? objects : null;
  } catch { return null; }
}
function readScene(convertPlan = false): SceneObject[] {
  if (convertPlan) {
    const converted = convertPlanToScene();
    if (converted) return converted;
  }
  try { const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); return Array.isArray(value) && value.length ? value : defaults; } catch { return defaults; }
}
function material(color: number, roughness = .8, metalness = 0) { return new THREE.MeshStandardMaterial({ color, roughness, metalness }); }
function makeTree(scale: number) { const group = new THREE.Group(); const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.22, .34, 1.9, 8), material(0x79533a)); trunk.position.y = .95; group.add(trunk); const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(1.25, 2), material(0x3d8149, .95)); crown.position.y = 2.25; crown.scale.set(1, 1.15, 1); group.add(crown); const crown2 = new THREE.Mesh(new THREE.IcosahedronGeometry(.7, 1), material(0x6ba858)); crown2.position.set(.45, 2.75, .15); group.add(crown2); group.scale.setScalar(1.8 * scale); return group; }
function makeObject(item: SceneObject) { const group = new THREE.Group(); if (item.sourceWidth && item.sourceHeight) { const depth = item.sourceDepth || .4; const shape = new THREE.Mesh(new THREE.BoxGeometry(item.sourceWidth, depth, item.sourceHeight), material(item.sourceColor || 0x8da582, item.type === 'water' ? .15 : .82)); shape.position.y = depth / 2; if (item.type === 'water') (shape.material as THREE.MeshStandardMaterial).transparent = true, (shape.material as THREE.MeshStandardMaterial).opacity = .84; group.add(shape); } else if (item.sourceImage) { const texture = new THREE.TextureLoader().load(item.sourceImage); texture.colorSpace = THREE.SRGBColorSpace; const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false })); const size = 2.8 * item.scale; sprite.scale.set(size, size, 1); sprite.position.y = size * .52; group.add(sprite); if (item.type === 'tree') { const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.12 * item.scale, .18 * item.scale, .9 * item.scale, 8), material(0x79533a)); trunk.position.y = .42 * item.scale; group.add(trunk); } } else if (item.type === 'tree') group.add(makeTree(item.scale)); if (!item.sourceWidth && item.type === 'water') { const pond = new THREE.Mesh(new THREE.CylinderGeometry(2.1 * item.scale, 2.1 * item.scale, .12, 48), new THREE.MeshStandardMaterial({ color: 0x4ba9c2, roughness: .12, metalness: .15, transparent: true, opacity: .82 })); pond.position.y = .08; group.add(pond); } if (!item.sourceWidth && item.type === 'lawn') { const lawn = new THREE.Mesh(new THREE.CylinderGeometry(3.6 * item.scale, 3.6 * item.scale, .18, 48), material(0x6eae5a)); lawn.position.y = .08; group.add(lawn); } if (!item.sourceWidth && item.type === 'path') { const path = new THREE.Mesh(new THREE.BoxGeometry(2.2 * item.scale, .12, 7 * item.scale), material(0xb7a57d)); path.position.y = .08; group.add(path); for (let z = -2.5; z <= 2.5; z += 1) { const tile = new THREE.Mesh(new THREE.BoxGeometry(2 * item.scale, .16, .72), material(0xd8c7a2)); tile.position.set(0, .16, z * item.scale); group.add(tile); } } if (item.type === 'light') { const pole = new THREE.Mesh(new THREE.CylinderGeometry(.06, .08, 1.2, 12), material(0x343c37, .5, .2)); pole.position.y = .6; const bulb = new THREE.Mesh(new THREE.SphereGeometry(.18, 16, 16), new THREE.MeshStandardMaterial({ color: 0xffd36b, emissive: 0xffa51f, emissiveIntensity: 2 })); bulb.position.y = 1.25; group.add(pole, bulb); } if (item.type === 'pergola' && !item.sourceWidth) { const wood = material(0x9a6c45); [-1.5, 1.5].forEach((x) => [-1.5, 1.5].forEach((z) => { const post = new THREE.Mesh(new THREE.BoxGeometry(.18, 2.6, .18), wood); post.position.set(x, 1.3, z); group.add(post); })); const roof = new THREE.Mesh(new THREE.BoxGeometry(3.4, .18, 3.4), wood); roof.position.y = 2.65; group.add(roof); } group.position.set(item.x, 0, item.y); group.rotation.y = item.rotate * Math.PI / 180; return group; }

export default function Landscape3DPage() {
  const mountRef = useRef<HTMLDivElement>(null);
  const cameraState = useRef({ x: 0, y: 2.2, z: 18, yaw: 0, pitch: -0.08 });
  const convertPlan = new URLSearchParams(window.location.search).get('convert') === '1';
  const [objects, setObjects] = useState<SceneObject[]>(() => readScene(convertPlan));
  const [selected, setSelected] = useState<string | null>('lawn-1');
  const [prompt, setPrompt] = useState('');
  const [mode, setMode] = useState<'design' | 'walk'>('design');
  const [walkHint, setWalkHint] = useState('اضغط ابدأ المشي ثم استخدم WASD أو الأسهم والماوس');
  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(objects)); }, [objects]);
  const selectedObject = objects.find((item) => item.id === selected);
  const addObject = (type: SceneObject['type']) => { const id = `${type}-${Date.now()}`; setObjects((current) => [...current, { id, type, label: labels[type], x: -7 + Math.random() * 14, y: -9 + Math.random() * 14, scale: .8 + Math.random() * .4, rotate: 0 }]); setSelected(id); };
  const updateSelected = (patch: Partial<SceneObject>) => setObjects((current) => current.map((item) => item.id === selected ? { ...item, ...patch } : item));
  const removeSelected = () => { setObjects((current) => current.filter((item) => item.id !== selected)); setSelected(null); };
  const generateConcept = () => { const lower = prompt.toLocaleLowerCase('ar'); const base: SceneObject['type'][] = lower.includes('ماء') || lower.includes('بركة') ? ['water', 'tree', 'tree', 'light'] : lower.includes('مودرن') ? ['lawn', 'path', 'light', 'pergola'] : ['lawn', 'tree', 'tree', 'water', 'path']; setObjects(base.map((type, index) => ({ id: `ai-${type}-${Date.now()}-${index}`, type, label: labels[type], x: -6 + (index % 3) * 6, y: -7 + Math.floor(index / 3) * 6, scale: 1, rotate: 0 }))); setSelected(null); };
  useEffect(() => {
    const mount = mountRef.current; if (!mount) return;
    const scene = new THREE.Scene(); scene.background = new THREE.Color(0xb9dce5); scene.fog = new THREE.Fog(0xb9dce5, 22, 75);
    const camera = new THREE.PerspectiveCamera(68, mount.clientWidth / Math.max(1, mount.clientHeight), .1, 120); const initial = cameraState.current; camera.position.set(initial.x, initial.y, initial.z); camera.rotation.order = 'YXZ'; camera.rotation.set(initial.pitch, initial.yaw, 0);
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.outputColorSpace = THREE.SRGBColorSpace; mount.appendChild(renderer.domElement);
    const hemi = new THREE.HemisphereLight(0xdff7ff, 0x536a48, 2.2); scene.add(hemi); const sun = new THREE.DirectionalLight(0xfff1c5, 3.5); sun.position.set(-12, 24, 10); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); scene.add(sun);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(70, 70), material(0x6f9f61)); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
    const border = new THREE.Mesh(new THREE.BoxGeometry(32, .35, 28), material(0x9f8661)); border.position.y = -.2; scene.add(border);
    const garden = new THREE.Mesh(new THREE.BoxGeometry(29, .18, 25), material(0x76b168)); garden.position.y = .02; garden.receiveShadow = true; scene.add(garden);
    const objectsGroup = new THREE.Group(); objects.forEach((item) => { const group = makeObject(item); group.userData.objectId = item.id; group.traverse((child) => { if (child instanceof THREE.Mesh) { child.castShadow = true; child.receiveShadow = true; } }); objectsGroup.add(group); }); scene.add(objectsGroup);
    const keys = new Set<string>(); let locked = false; let frame = 0; const onKeyDown = (e: KeyboardEvent) => { keys.add(e.key.toLowerCase()); if (['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright',' '].includes(e.key.toLowerCase())) e.preventDefault(); }; const onKeyUp = (e: KeyboardEvent) => keys.delete(e.key.toLowerCase()); const onMouse = (e: MouseEvent) => { if (!locked) return; cameraState.current.yaw -= e.movementX * .0023; cameraState.current.pitch = THREE.MathUtils.clamp(cameraState.current.pitch - e.movementY * .0023, -1.25, 1.25); };
    const onLock = () => { locked = document.pointerLockElement === renderer.domElement; if (locked) setWalkHint('أنت داخل الحديقة — WASD للحركة، حرّك الماوس للنظر، ESC للخروج'); else setWalkHint('تم إيقاف المشي — اضغط ابدأ المشي للعودة'); }; renderer.domElement.addEventListener('click', () => { if (mode === 'walk') renderer.domElement.requestPointerLock(); }); document.addEventListener('pointerlockchange', onLock); window.addEventListener('keydown', onKeyDown); window.addEventListener('keyup', onKeyUp); window.addEventListener('mousemove', onMouse);
    const resize = () => { if (!mount) return; camera.aspect = mount.clientWidth / Math.max(1, mount.clientHeight); camera.updateProjectionMatrix(); renderer.setSize(mount.clientWidth, mount.clientHeight, false); }; resize(); window.addEventListener('resize', resize);
    const animate = () => { frame = requestAnimationFrame(animate); const state = cameraState.current; camera.rotation.set(state.pitch, state.yaw, 0); const speed = keys.has('shift') ? .16 : .085; const forward = new THREE.Vector3(-Math.sin(state.yaw), 0, -Math.cos(state.yaw)); const right = new THREE.Vector3(Math.cos(state.yaw), 0, -Math.sin(state.yaw)); const move = new THREE.Vector3(); if (keys.has('w') || keys.has('arrowup')) move.add(forward); if (keys.has('s') || keys.has('arrowdown')) move.sub(forward); if (keys.has('d') || keys.has('arrowright')) move.add(right); if (keys.has('a') || keys.has('arrowleft')) move.sub(right); if (move.lengthSq()) { move.normalize().multiplyScalar(speed); state.x = THREE.MathUtils.clamp(state.x + move.x, -14, 14); state.z = THREE.MathUtils.clamp(state.z + move.z, -13, 13); camera.position.set(state.x, state.y, state.z); } renderer.render(scene, camera); }; animate();
    return () => { cancelAnimationFrame(frame); document.exitPointerLock?.(); document.removeEventListener('pointerlockchange', onLock); window.removeEventListener('keydown', onKeyDown); window.removeEventListener('keyup', onKeyUp); window.removeEventListener('mousemove', onMouse); window.removeEventListener('resize', resize); renderer.dispose(); renderer.domElement.remove(); };
  }, [objects, mode]);
  const countText = useMemo(() => `${objects.length} عناصر ثلاثية الأبعاد`, [objects.length]);
  return <main className="landscape-3d-page" dir="rtl"><header className="landscape-3d-topbar"><div><Link href="/landscape-editor" className="landscape-3d-back"><ArrowRight size={15} /> العودة لمخطط اللاندسكيب</Link><div className="eyebrow">QADRI AI / REAL-WORLD LANDSCAPE</div><h1>سكيب 3D — امشِ داخل فكرتك</h1><p>هذه ليست صورة ثابتة: ادخل الحديقة، تحرك داخلها، شاهد الارتفاعات والظلال، وعدّل التصميم قبل التنفيذ.</p></div><div className="landscape-3d-top-actions"><span className="landscape-3d-save"><span />يحفظ تلقائيًا</span><button className="btn secondary small" onClick={() => window.print()}><Download size={14} />تصدير المشهد</button></div></header><div className="landscape-3d-layout"><aside className="landscape-3d-controls"><section className="landscape-3d-panel landscape-3d-ai"><div className="landscape-3d-panel-title"><Sparkles size={17} /><div><strong>المهندس الذكي</strong><small>اكتب المطلوب وسيبني توزيعًا أوليًا قابلًا للمشي</small></div></div><textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="مثال: حديقة مودرن فيها بركة وممشى وإضاءة ليلية..." /><button className="btn landscape-3d-generate" onClick={generateConcept}><Sparkles size={14} />توليد تصور ذكي</button></section><section className="landscape-3d-panel landscape-3d-walk-panel"><div className="landscape-3d-panel-title"><Eye size={17} /><div><strong>وضع التجربة الواقعية</strong><small>{walkHint}</small></div></div><button className={`btn landscape-3d-walk-button${mode === 'walk' ? ' active' : ''}`} onClick={() => { setMode(mode === 'walk' ? 'design' : 'walk'); setWalkHint(mode === 'walk' ? 'اضغط ابدأ المشي ثم استخدم WASD أو الأسهم والماوس' : 'اضغط داخل المشهد لتثبيت الماوس والبدء بالمشي'); }}><MousePointer2 size={14} />{mode === 'walk' ? 'إيقاف وضع المشي' : 'ابدأ المشي داخل الحديقة'}</button></section><section className="landscape-3d-panel"><div className="landscape-3d-panel-title"><Box size={17} /><div><strong>مكتبة العناصر الحقيقية</strong><small>كل عنصر له عمق وظل ومكان داخل المشهد</small></div></div><div className="landscape-3d-tool-grid">{(['tree','water','lawn','path','light','pergola'] as SceneObject['type'][]).map((type) => { const Icon = icons[type]; return <button key={type} onClick={() => addObject(type)}><Icon size={18} /><span>{labels[type]}</span><b>+</b></button>; })}</div></section>{selectedObject && <section className="landscape-3d-panel landscape-3d-selected"><div className="landscape-3d-selected-head"><strong>العنصر المحدد</strong><button onClick={removeSelected} aria-label="حذف العنصر"><X size={14} /></button></div><span>{selectedObject.label}</span><label>الحجم <input type="range" min=".5" max="1.8" step=".05" value={selectedObject.scale} onChange={(event) => updateSelected({ scale: Number(event.target.value) })} /></label><label>الدوران <input type="range" min="-30" max="30" value={selectedObject.rotate} onChange={(event) => updateSelected({ rotate: Number(event.target.value) })} /></label></section>}<div className="landscape-3d-count">{countText} · اضغط على المشهد وابدأ الجولة</div></aside><section className="landscape-3d-stage-shell"><div className="landscape-3d-stage-head"><div><strong>المشهد الواقعي</strong><span>WebGL · منظور أول · إضاءة وظلال حقيقية</span></div><div className="landscape-3d-legend"><i /> نباتات <i /> ماء <i /> إضاءة</div></div><div ref={mountRef} className="landscape-3d-stage" /><div className="landscape-3d-stage-footer"><span><strong>طريقة الاستخدام:</strong> اضغط «ابدأ المشي»، ثم اضغط داخل المشهد. استخدم WASD أو الأسهم وحرك الماوس.</span><span>ESC يعيدك إلى المؤشر</span></div></section></div></main>;
}
