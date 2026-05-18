// ==========================================
// SCENE SETUP (Laboratorio Realista)
// ==========================================
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 10, 25);

const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
container.appendChild(renderer.domElement);

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.maxDistance = 50;
controls.minDistance = 5;

const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);
const dirLight = new THREE.DirectionalLight(0xffffff, 0.7);
dirLight.position.set(5, 20, 10);
dirLight.castShadow = true;
scene.add(dirLight);

// ==========================================
// 3D OBJECTS
// ==========================================

// Mesa
const tableGeo = new THREE.BoxGeometry(40, 1, 20);
const tableMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.8 });
const tableMesh = new THREE.Mesh(tableGeo, tableMat);
tableMesh.position.y = -5.5; 
tableMesh.receiveShadow = true;
scene.add(tableMesh);

// Tubo PVC Hueco (openEnded = true)
const pvcLength = 14;
const pvcRadioExterior = 2.5;
// RadiusTop, RadiusBottom, Height, RadialSegments, HeightSegments, OpenEnded
const pvcGeo = new THREE.CylinderGeometry(pvcRadioExterior, pvcRadioExterior, pvcLength, 32, 1, true);
const pvcMat = new THREE.MeshPhysicalMaterial({
    color: 0xe0e0e0, roughness: 0.3, transmission: 0.2, thickness: 0.5, side: THREE.DoubleSide
});
const pvcMesh = new THREE.Mesh(pvcGeo, pvcMat);
pvcMesh.rotation.z = Math.PI / 2;
pvcMesh.receiveShadow = true;
pvcMesh.castShadow = true;
scene.add(pvcMesh);

// Soportes del PVC
const mountGeo = new THREE.CylinderGeometry(0.5, 0.8, 3.5, 16);
const mountMat = new THREE.MeshStandardMaterial({ color: 0xdddddd });
const mount1 = new THREE.Mesh(mountGeo, mountMat); mount1.position.set(-5, -3.5, 0); scene.add(mount1);
const mount2 = new THREE.Mesh(mountGeo, mountMat); mount2.position.set(5, -3.5, 0); scene.add(mount2);

// --- Grupo de la Bobina ---
const coilGroup = new THREE.Group();
scene.add(coilGroup);

let currentRings = [];

// Halo Inducido Magenta (Apagado por defecto)
const inducedHaloGroup = new THREE.Group();
scene.add(inducedHaloGroup);
let inducedHalos = [];
const haloMat = new THREE.MeshBasicMaterial({ color: 0xff00ff, transparent: true, opacity: 0.0 });
const haloGeo = new THREE.TorusGeometry(pvcRadioExterior + 0.8, 0.2, 16, 64);
for(let i=0; i<5; i++){
    let h = new THREE.Mesh(haloGeo, haloMat);
    h.position.x = -8 + (i * 4);
    h.rotation.y = Math.PI / 2;
    inducedHaloGroup.add(h);
    inducedHalos.push(h);
}

function buildCoil(espirasParam) {
    currentRings.forEach(r => { coilGroup.remove(r); r.geometry.dispose(); r.material.dispose(); });
    currentRings = [];
    const maxVisualRings = Math.min(espirasParam, 200); 
    const radio = pvcRadioExterior + 0.1;
    const materialVarnish = new THREE.MeshPhysicalMaterial({ color: 0x8B3A00, roughness: 0.2, metalness: 0.7, clearcoat: 0.5 });
    const geometryTorus = new THREE.TorusGeometry(radio, 0.05, 8, 32);
    
    for(let i=0; i<maxVisualRings; i++) {
        const ring = new THREE.Mesh(geometryTorus, materialVarnish);
        ring.position.x = -5 + (10 / Math.max(1, maxVisualRings - 1)) * i;
        ring.rotation.y = Math.PI / 2;
        ring.castShadow = true;
        coilGroup.add(ring);
        currentRings.push(ring);
    }
}
buildCoil(100); 

// --- Grupo del Imán ---
const magnetGroup = new THREE.Group();
scene.add(magnetGroup);

const halfGeo = new THREE.CylinderGeometry(1.8, 1.8, 2, 32);
const meshN = new THREE.Mesh(halfGeo, new THREE.MeshStandardMaterial({ color: 0xff003c, roughness: 0.4 }));
meshN.rotation.z = Math.PI / 2; meshN.position.x = 1; meshN.castShadow = true;
magnetGroup.add(meshN);

const meshS = new THREE.Mesh(halfGeo, new THREE.MeshStandardMaterial({ color: 0x0a40d8, roughness: 0.4 }));
meshS.rotation.z = Math.PI / 2; meshS.position.x = -1; meshS.castShadow = true;
magnetGroup.add(meshS);

// Campo Magnético del Imán (Cian)
let magnetFields = [];
const fieldLinesMat = new THREE.LineBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.6 });
for (let i = 0; i < 6; i++) {
    let eGeo = new THREE.TorusGeometry(3.5, 0.02, 8, 64);
    let edge = new THREE.LineLoop(eGeo, fieldLinesMat);
    edge.rotation.x = (Math.PI / 3) * i;
    magnetGroup.add(edge);
    magnetFields.push(edge);
}

let magnetStartX = -20;
let magnetEndX = 20;
magnetGroup.position.x = magnetStartX;

// ==========================================
// ANIMACIÓN LEY DE FARADAY
// ==========================================
window.simulador3D = {
    actualizarBobina: buildCoil,
    actualizarTamanioMange: function(vol) {
        let scale = 1 + (vol / 50);
        meshN.scale.set(1, scale, 1);
        meshS.scale.set(1, scale, 1);
    },
    
    animarEntradaSalida: function(tiempoSecs, femCalculada, onUpdateOsciloscopio, onComplete) {
        magnetGroup.position.x = magnetStartX;
        gsap.killTweensOf(magnetGroup.position);
        
        const duration = Math.max(0.5, tiempoSecs); 

        return gsap.to(magnetGroup.position, {
            x: magnetEndX,
            duration: duration,
            ease: "power1.inOut",
            onUpdate: function() {
                let progress = this.progress(); 
                let factor = 0;
                
                if (progress > 0.1 && progress < 0.4) {
                    factor = Math.sin(((progress - 0.1)/0.3) * Math.PI);
                } else if (progress > 0.6 && progress < 0.9) {
                    factor = -Math.sin(((progress - 0.6)/0.3) * Math.PI);
                }
                
                let femInstante = femCalculada * factor; 
                if(onUpdateOsciloscopio) onUpdateOsciloscopio(femInstante);
                
                // Efecto Colisión de Campos: Halos Magenta reaccionan a la fuerza
                haloMat.opacity = Math.abs(factor) * 0.8;
                inducedHalos.forEach(h => {
                    h.scale.setScalar(1 + (Math.abs(factor) * 0.5));
                });
            },
            onComplete: function() {
                haloMat.opacity = 0; // Apagar campos inducidos
                gsap.to(magnetGroup.position, {
                    x: magnetStartX,
                    duration: duration,
                    ease: "power2.inOut",
                    onComplete: onComplete
                });
            }
        });
    }
};

// ==========================================
// RENDER LOOP
// ==========================================
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    
    // Rotar campos mágneticos del imán para fluidez constante
    magnetFields.forEach((mf, idx) => {
        mf.rotation.y -= 0.05 * (idx%2===0?1:-1); // Girar como torbellino
    });
    
    // Rotar halos inducidos si están encendidos
    if (haloMat.opacity > 0.01) {
        inducedHalos.forEach((h, idx) => {
            h.rotation.z += 0.1 * (idx%2===0?1:-1);
        });
    }

    renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
