var scene = null;
var renderer = null;
var camera = null;
var controls = null;
var gridHelper = null;
var currentMap = null;
var isLoadingMap = false; //prevent loading 2 maps at once

var resizeTimeout = setTimeout(() => {}, 10);
var isResizing = false;

var allMeshes = []

// ----------------- Three JS rendering and handlers ----------------- 

// Handle window resize. The ThreeJS window kept on messing with the website layout and this strange solution is what I got to work
function resizeThreeJSHandler() {
  if (isResizing) return;
  isResizing = true;

  renderer.setSize(0, 0, true);
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    const container = document.getElementById('ThreeJSViewer');
    const width = container.getBoundingClientRect().width;
    const height = container.getBoundingClientRect().height;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, true);
    isResizing = false;
  }, 250);
}
function resetCamera() {
  camera.position.set(0, 75, 100);
  camera.lookAt(new THREE.Vector3(0, 0, 0));
}
function makeThreeJSWindow() {
  const container = document.getElementById('ThreeJSViewer');
  const container_HUD = container.getElementsByClassName("ThreeJSHud");

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(75, container.getBoundingClientRect().width / container.getBoundingClientRect().height, 0.1, 100000);
  resetCamera();

  renderer = new THREE.WebGLRenderer();
  renderer.setSize(container.getBoundingClientRect().width, container.getBoundingClientRect().height, false);
  container.prepend(renderer.domElement);
  
  // controls handler
  const keys = {};
  controls = new PointerLockControls(camera, document.body);
  renderer.domElement.addEventListener('click', () => { controls.lock(); });
  document.addEventListener('keydown', (event) => {
    if (controls.isLocked) {
      event.preventDefault();
      keys[event.code] = true;
    }
  });
  document.addEventListener('keyup', (event) => {
    keys[event.code] = false;
  });

  // weak circular light
  const light = new THREE.PointLight( 0xffffffff, 3, 0, 0.1 );
  scene.add(light);

  // Have basic map of just a grid so everything isn't just a black void
  const size = 600;
  const divisions = 600;
  gridHelper = new THREE.GridHelper(size, divisions, 0xffffff, 0x555555);
  gridHelper.renderOrder = 0;
  gridHelper.material.depthTest = false;
  gridHelper.visible = document.getElementById("GridHelperSee").checked;
  scene.add(gridHelper);

  let firstFrameRendered = false;
  let prevCameraPosition = new THREE.Vector3();
  const animate = () => {
    if (!firstFrameRendered) {
      firstFrameRendered = true;
      document.getElementById("ThreeJSRenderedCheckMark").checked = true; // allows more elements to render on screen because of CSS rule
      resizeThreeJSHandler();
      rerenderAllThreeJS();
    }

    requestAnimationFrame(animate);

    // move light with you
    light.position.copy(camera.position);

    // WASD movement (thanks chatGPT)
    let moveSpeed = 1;
    const direction = new THREE.Vector3();
    if (keys['ShiftLeft'] || keys['ShiftRight']) moveSpeed = 3;
    if (keys['KeyV']) moveSpeed = 20;
    if (keys['KeyW']) direction.z += moveSpeed;
    if (keys['KeyS']) direction.z -= moveSpeed;
    if (keys['KeyA']) direction.x -= moveSpeed;
    if (keys['KeyD']) direction.x += moveSpeed;
    if (keys['KeyQ']) direction.y -= moveSpeed;
    if (keys['KeyE']) direction.y += moveSpeed;
    
    // Normalize to prevent faster diagonal movement
    if (direction.length() > 0) direction.normalize();

    // Move relative to camera
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();
    const right = new THREE.Vector3();
    right.crossVectors(forward, camera.up).normalize();

    // Apply movement
    camera.position.add(forward.multiplyScalar(direction.z * moveSpeed));
    camera.position.add(right.multiplyScalar(direction.x * moveSpeed));
    camera.position.y += direction.y * moveSpeed; // vertical movement

    renderer.render(scene, camera);

    // Show Position (only if camera moved)
    const moved = !camera.position.equals(prevCameraPosition);
    prevCameraPosition.copy(camera.position);
    if (!moved) { return; }
    const makeStrFromJson = function(json) {
      return `(${json.x.toFixed(2)}, ${json.y.toFixed(2)}, ${json.z.toFixed(2)})`;
    }
    const positionStr = makeStrFromJson(camera.position);
    container_HUD[3].getElementsByTagName("input")[0].value = positionStr;
  };
  animate();

  // resize callers
  const resizeObserver = new ResizeObserver((entries) => {
    for (let _ of entries) { resizeThreeJSHandler(); break; }
  });
  resizeObserver.observe(container);
}

/* -------------------- Showing Boundaries ------------------- */

function makeCylinder(color, size, height, y = 0) {
  const geometry = new THREE.CylinderGeometry(size, size, height, 32, 1, true);
  const material = new THREE.MeshStandardMaterial({
    color,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.3,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(0,y,0);
  scene.add(mesh);
  return mesh;
}

function makeCylinderCap(color, size, opacity = 0.3, y = 0) {
  const geometry = new THREE.CircleGeometry(size, 32);
  const material = new THREE.MeshStandardMaterial({
    color,
    side: THREE.DoubleSide,
    transparent: true,
    opacity,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = Math.PI / 2;
  mesh.position.y = y;
  scene.add(mesh);
  return mesh;
}

function rerenderAllThreeJS() {
  // cleanup
  for (let i = 0; i < allMeshes.length; i++) {
    disposeMesh(allMeshes[i]);
  }
  allMeshes = [];

  // setup
  const landmasterColor = parseInt(document.getElementById("LandmasterBoundaryColor").value.substr(1), 16);
  const arwingColor = parseInt(document.getElementById("ArwingBoundaryColor").value.substr(1), 16);
  const showLandmaster = document.getElementById("ShowLandmasterCheckbox").checked;
  const showArwing = document.getElementById("ShowArwingCheckbox").checked;

  // go through all bounds objects
  data_sanityCheck();
  for (let i = 0; i < allLevelBoundaryData.bounds.length; i++) {
    const curData = allLevelBoundaryData.bounds[i];

    if (showLandmaster) {
      allMeshes.push(makeCylinder(landmasterColor, curData.Hor_Tank, 2000));
    }
    if (showArwing) {
      const showHardCeiling = curData.Ceil_hard >= curData.Ceil_soft;
      const showHardFloor = curData.Floor_hard <= curData.Floor_soft;
      const showSoftCeiling = curData.Ceil_hard != curData.Ceil_soft;
      const showSoftFloor = curData.Floor_hard != curData.Floor_soft;

      const highestPoint = Math.max(curData.Ceil_hard, curData.Ceil_soft);
      const lowestPoint = Math.min(curData.Floor_hard, curData.Floor_soft);
      const height = highestPoint - lowestPoint;

      allMeshes.push(makeCylinder(arwingColor, curData.Hor_Arwing, height, highestPoint - (height/2)));

      if (showSoftFloor) allMeshes.push(makeCylinderCap(arwingColor, curData.Hor_Arwing, 0.5, curData.Floor_soft));
      if (showSoftCeiling) allMeshes.push(makeCylinderCap(arwingColor, curData.Hor_Arwing, 0.5, curData.Ceil_soft));
      if (showHardFloor) allMeshes.push(makeCylinderCap(arwingColor, curData.Hor_Arwing, 0.9, curData.Floor_hard));
      if (showHardCeiling) allMeshes.push(makeCylinderCap(arwingColor, curData.Hor_Arwing, 0.9, curData.Ceil_hard));
    }
  }
}

/* ------------------------------- Loading user files and exporting (thanks chatGPT) ------------------------- */

async function mapDraggedIn(ev) {
  ev.preventDefault();
  ChangeMapLoadedFile(ev.dataTransfer.items[0].getAsFile());
}

async function ChangeMapLoadedFile(file) {
  if (!file || isLoadingMap) return;
  document.getElementById("LoadingMapText").innerText = "Loading...";
  isLoadingMap = true;

  const { General3JS_Importer } = await import('../Resources/threejs_importer_exporter.js');
  const result = await General3JS_Importer(file);

  if (result.type == "error") {
    document.getElementById("LoadingMapText").innerText = result.message;
  }
  if (result.type == "model") {
    if (currentMap) disposeMesh(currentMap);
    currentMap = result.message;
    scene.add(currentMap);
    document.getElementById("LoadingMapText").innerText = "";
    document.getElementById("GridHelperSee").checked = false;
    document.getElementById("GridHelperSee").onchange();
  }
  isLoadingMap = false;
}

async function exportScene(ext = ".glb") {
  const { General3JS_Exporter } = await import('../Resources/threejs_importer_exporter.js');
  await General3JS_Exporter(scene, getFileName(ext));
}

/* -------------------- Other Functions ------------ */

function CameraPositionChange(str) {
  const values = str.match(/-?\d+(\.\d+)?/g).map(Number);
  const curPos = camera.position;
  const newX = values.length > 0 ? values[0] : curPos.x;
  const newY = values.length > 1 ? values[1] : curPos.y;
  const newZ = values.length > 2 ? values[2] : curPos.z;
  camera.position.set(newX, newY, newZ);
}

// deletes object cleanly
function disposeMesh(mesh) {
  if (mesh.geometry) {
    mesh.geometry.dispose();
  }
  if (mesh.material) {
    if (Array.isArray(mesh.material)) {
      mesh.material.forEach(m => m.dispose());
    } else {
      mesh.material.dispose();
    }
  }
  scene.remove(mesh);
  mesh.geometry = null;
  mesh.material = null;
}

// -------------- call on load ------------------------

makeThreeJSWindow();