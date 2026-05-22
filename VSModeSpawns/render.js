// This file redraws everything except the map on a change. Not super optimal but easy to code

// This variable contains all non Map/Terrain info showed to the user
//   index 0: On-foot spawn -> Arrow red
//   index 1: Arwing spawn into -> Arrow Blue
//   index 2: Landmaster spawn into -> Arrow Green
//   index 3: ---
//   index 4: Generic Vehicle Spawn -> Arrow Orange
//   index 5: ---
//   index 6: Weapon Spawn -> Cylinder Red
//   index 7: ---
//   index 8: Powerup Spawn -> Cylinder Green
//   index 9: ---
//   index 10: Vehicle Powerup Spawn -> Cylinder Blue
//   index 11: Crown Spawns -> Cylinder Yellow
//   index 12+: Custom Spawn -> Cylinder Black
var AllSpawnedObjects = []
var Flatten_RawObjects = []
var renderIndex = [true, true, true, false, true, false, true, false, true, false, true, true, true]
function toggleRenderIndex(index, checked) {
  renderIndex[index] = checked;
  makeAllShapesFromScratch();
}

var currentMap = null;
var scene = null;
var renderer = null;
var camera = null;
var controls = null;
var isLoadingMap = false;
var resizeTimeout = resizeTimeout = setTimeout(() => {}, 10);

function resetCamera() {
  camera.position.set(0, 75, 100);
  camera.lookAt(new THREE.Vector3(0, 0, 0));
}
function setCamera(x, y, z, yaw) {
  camera.position.set(x, y+2, z);
  if (yaw >= 0) {
    camera.rotation.order = "YXZ";
    camera.rotation.y = Math.PI + (2*Math.PI - THREE.MathUtils.degToRad(yaw));
    camera.rotation.x = 0;
    camera.rotation.z = 0;
  }
}
// Handle window resize. The ThreeJS window kept on messing with the website layout and this strange solution is what I got to work
function resizeThreeJSHandler() {
  renderer.setSize(0, 0, true);
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    const container = document.getElementById('ThreeJSRightBar');
    const width = container.getBoundingClientRect().width;
    const height = container.getBoundingClientRect().height;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, true);
  }, 250);
}
function makeThreeJSWindow() {
  const container = document.getElementById('ThreeJSRightBar');
  const container_pTag = container.getElementsByTagName("p");

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(75, container.getBoundingClientRect().width / container.getBoundingClientRect().height, 0.1, 100000);
  resetCamera();

  renderer = new THREE.WebGLRenderer();
  renderer.setSize(container.getBoundingClientRect().width, container.getBoundingClientRect().height, false);
  container.appendChild(renderer.domElement);

  controls = new PointerLockControls(camera, document.body);
  renderer.domElement.addEventListener('click', () => { controls.lock(); });
  const keys = {};
  document.addEventListener('keydown', (event) => {
    if (controls.isLocked) {
      event.preventDefault();
      keys[event.code] = true;
    }
  });
  document.addEventListener('keyup', (event) => { keys[event.code] = false; });

  const light = new THREE.PointLight( 0xffffffff, 3, 0, 0.1 );
  scene.add( light );

  // Have basic map of just a grid
  const size = 600;
  const divisions = 600;
  const gridHelper = new THREE.GridHelper(size, divisions, 0xffffff, 0x555555);
  gridHelper.renderOrder = 0;
  gridHelper.material.depthTest = false;
  scene.add(gridHelper);

  let firstFrameRendered = false;
  let prevCameraPosition = new THREE.Vector3();
  let prevCameraRotation = new THREE.Euler();
  const animate = () => {
    if (!firstFrameRendered) {
      firstFrameRendered = true;
      makeAllShapesFromScratch();
      // refresh all displayed data so that the "goto" button can appear
      DisplayAllSpawnDataFromScratch();
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

    const moved = !camera.position.equals(prevCameraPosition);
    const rotated = !camera.rotation.equals(prevCameraRotation);

    prevCameraPosition.copy(camera.position);
    prevCameraRotation.copy(camera.rotation);

    if (!moved && !rotated) { return; }

    // update text with camera position and angle.
    container_pTag[1].textContent = "Position: (" + camera.position.x.toFixed(2) + ", " + camera.position.y.toFixed(2) + ", " +  camera.position.z.toFixed(2) + ")";
    container_pTag[1].appendChild(document.createElement("br"));
    
    
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    let yaw = Math.atan2(dir.x, dir.z) * 180 / Math.PI;
    yaw *= -1;
    if (yaw < 0) yaw = 360 - (yaw*-1);
    container_pTag[1].appendChild(document.createTextNode("Angle: " + (yaw).toFixed(2)));

    // there is definitely a better way to tell you what you looked at but I want to get this done already
    const raycaster = new THREE.Raycaster();
    const cameraDirection = new THREE.Vector3();
    camera.getWorldDirection(cameraDirection);
    raycaster.set(camera.position, cameraDirection);
    const objectsToTest = Flatten_RawObjects; 
    const intersects = raycaster.intersectObjects(objectsToTest, true);
    let allSpawnsTouched = "";
    for (let i = 0; i < AllSpawnedObjects.length; i++) {
      for (let j = 0; j < AllSpawnedObjects[i].length; j++) {
        for (let k = 0; k < intersects.length; k++) {
          if (intersects[k].object == AllSpawnedObjects[i][j][2]) {
            allSpawnsTouched += " '" + AllSpawnData[i].name + " - " + (j+1) + "'";
            break;
          }
        }
      }
    }

    if (allSpawnsTouched == "") {
      container_pTag[2].innerText = "Looking at no spawns";
    } else {
      container_pTag[2].innerText = "Looking at:" + allSpawnsTouched;
    }
  };
  animate();

  // resize callers
  window.addEventListener('resize', () => { resizeThreeJSHandler(); });
  const element = document.getElementById("ThreeJsDisplay");
  const resizeObserver = new ResizeObserver((entries) => {
    for (let _ of entries) { resizeThreeJSHandler(); }
  });
  resizeObserver.observe(element);
}

function makeCylinder(meshColor, x, y, z, scale) {
  // Create the cylinder
  const geometry = new THREE.CylinderGeometry(1, 1, 1, 16);
  const material = new THREE.MeshStandardMaterial({ color: meshColor });
  const cylinder = new THREE.Mesh(geometry, material);
  cylinder.position.set(x, y, z);
  cylinder.scale.set(1 * scale[0], 1 * scale[1], 1 * scale[2]);
  scene.add(cylinder);

  // Add an always-visible outline
  const edges = new THREE.EdgesGeometry(geometry);
  const lineMaterial = new THREE.LineBasicMaterial({ 
      color: meshColor,
      linewidth: 1,
      depthTest: false,
      transparent: true
  });
  const outline = new THREE.LineSegments(edges, lineMaterial);
  outline.position.copy(cylinder.position);
  outline.scale.copy(cylinder.scale);
  outline.renderOrder = 999;
  scene.add(outline);

  // --- Function to move the shape ---
  function move(x, y, z) {
    cylinder.position.set(x, y, z);
    outline.position.copy(cylinder.position);
  }

  // --- Function to clean up ---
  function cleanup() {
    scene.remove(cylinder);
    scene.remove(outline);

    geometry.dispose();
    material.dispose();
    edges.dispose();
    lineMaterial.dispose();
  }

  Flatten_RawObjects.push(cylinder);
  return [ move, cleanup, cylinder ];
}

function makeArrow(meshColor, x, y, z, angle, scale) {
  const arrowShape = new THREE.Shape();
  arrowShape.moveTo(0, 0);
  arrowShape.lineTo(2, 0);
  arrowShape.lineTo(2, -1);
  arrowShape.lineTo(4, 1);
  arrowShape.lineTo(2, 3);
  arrowShape.lineTo(2, 2);
  arrowShape.lineTo(0, 2);
  arrowShape.lineTo(0, 0);
  const extrudeSettings = {
    depth: 1,
    bevelEnabled: false
  };

  const geometry = new THREE.ExtrudeGeometry(arrowShape, extrudeSettings);

  const material = new THREE.MeshBasicMaterial({
    color: meshColor,
    side: THREE.DoubleSide
  });

  const arrowMesh = new THREE.Mesh(geometry, material);

  scene.add(arrowMesh);
  geometry.center();
  arrowMesh.scale.set(0.5 * scale[0], 0.5 * scale[1], 0.5 * scale[2]);
  arrowMesh.rotation.x = Math.PI / 2;
  arrowMesh.position.set(x, y, z);
  arrowMesh.rotation.z = (angle + 90) * Math.PI / 180;

  const edges = new THREE.EdgesGeometry(geometry);
  const outlineMaterial = new THREE.LineBasicMaterial({
    color: meshColor,
    linewidth: 1,
    depthTest: false,
    transparent: true
  });
  const outline = new THREE.LineSegments(edges, outlineMaterial);
  outline.position.copy(arrowMesh.position);
  outline.rotation.copy(arrowMesh.rotation);
  outline.scale.copy(arrowMesh.scale);
  outline.renderOrder = 999;
  scene.add(outline);

  // --- Function to move the shape ---
  function move(x, y, z, angle) {
    arrowMesh.position.set(x, y, z);
    arrowMesh.rotation.z = (angle + 90) * Math.PI / 180;
    outline.position.copy(cylinder.position);
    outline.rotation.copy(arrowMesh.rotation);
  }

  // --- Function to clean up ---
  function cleanup() {
    scene.remove(arrowMesh);
    scene.remove(outline);

    geometry.dispose();
    material.dispose();
    edges.dispose();
    outlineMaterial.dispose();
  }

  Flatten_RawObjects.push(arrowMesh);
  return [ move, cleanup, arrowMesh ];
}

function makeAllShapesFromScratch() {
  for (let i = 0; i < AllSpawnedObjects.length; i++) {
    for (let j = 0; j < AllSpawnedObjects[i].length; j++) {
      AllSpawnedObjects[i][j][1](); // calls cleanup function
    }
  }
  AllSpawnedObjects = [];
  Flatten_RawObjects = [];

  for (let i = 0; i < AllSpawnData.length; i++) {
    AllSpawnedObjects.push([]);
    if (!renderIndex[Math.min(i, renderIndex.length-1)]) continue; // Don't make shape for spawn limits

    for (let j = 0; j < AllSpawnData[i].spawns.length; j++) {
      let colorForShape = 0;
      let scale = [1, 1, 1]
      switch (i) {
        case 0: colorForShape = 0xFF0000; scale = [1, 1, 1]; break; // on-foot spawn
        case 1: colorForShape = 0x0000FF; scale = [5, 5, 3]; break; // Player as Arwing/Wolfen
        case 2: colorForShape = 0x00FF00; scale = [5, 5, 2.5]; break; // Player as Landmaster
        case 4: colorForShape = 0xFFA500; scale = [5, 5, 2]; break; // Vehicle Spawn
        case 6: colorForShape = 0xFF0000; scale = [1, 1.2, 1]; break; // On-foot weapon
        case 8: colorForShape = 0x00FF00; scale = [1.5, 1, 1.5]; break; // On-foot Power up
        case 10: colorForShape = 0x0000FF; scale = [5, 1, 5]; break; // Vehicle Power up
        case 11: colorForShape = 0xFFFF00; scale = [1, 0.5, 1]; break; // Crown Spawn
        default: colorForShape = 0x202020; scale = [2, 2, 2]; break; // custom spawn
      }

      switch (i) {
        case 0:
        case 1:
        case 2:
        case 4:
          AllSpawnedObjects[i].push(makeArrow(colorForShape, AllSpawnData[i].spawns[j].x_pos, AllSpawnData[i].spawns[j].y_pos, AllSpawnData[i].spawns[j].z_pos, AllSpawnData[i].spawns[j].angle, scale));
          break;
        default:
          AllSpawnedObjects[i].push(makeCylinder(colorForShape, AllSpawnData[i].spawns[j].x_pos, AllSpawnData[i].spawns[j].y_pos, AllSpawnData[i].spawns[j].z_pos, scale));
          break;
      }
    }
  }
}

/* ------------------------------- Loading user files (thanks chatGPT) ------------------------- */

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
    if (currentMap) scene.remove(currentMap);
    currentMap = result.message;
    scene.add(currentMap);
    document.getElementById("LoadingMapText").innerText = "";
  }
  isLoadingMap = false;
}

/* -------------------- Other ------------------- */

function quickAdd(index) {
  let x = parseFloat(camera.position.x.toFixed(2));
  let y = parseFloat((camera.position.y - 2).toFixed(2));
  let z = parseFloat(camera.position.z.toFixed(2));
    
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  let angle = Math.atan2(dir.x, dir.z) * 180 / Math.PI;
  angle *= -1;
  if (angle < 0)
    angle = 360 - (angle*-1);
  angle = parseInt(angle.toFixed(2));

  // add new spawn, change only whats needed and display it in grid
  addNewSpawn_defaults(index);
  const newSpawnIndex = AllSpawnData[index].spawns.length-1;
  AllSpawnData[index].spawns[newSpawnIndex].x_pos = x;
  AllSpawnData[index].spawns[newSpawnIndex].y_pos = y;
  AllSpawnData[index].spawns[newSpawnIndex].z_pos = z;
  if (AllSpawnData[index].spawns[newSpawnIndex].angle != undefined) {
    AllSpawnData[index].spawns[newSpawnIndex].angle = angle;
  }
  refreshSpawnData(index);
}

/* -------------------- Export Scene ------------ */

async function exportScene(ext = ".glb") {
  const { General3JS_Exporter } = await import('../Resources/threejs_importer_exporter.js');
  await General3JS_Exporter(scene, fileNumToStr()+ext);
}

/* -------------------- Run When file is loaded ------------------- */

makeThreeJSWindow();