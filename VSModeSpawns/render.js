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
  document.addEventListener('keydown', (event) => { keys[event.code] = true; });
  document.addEventListener('keyup', (event) => { keys[event.code] = false; });

  const light = new THREE.AmbientLight( 0xffffffff, 10 ); // soft white light
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

    // WASD movement (thanks chatGPT)
    let moveSpeed = 1;
    const direction = new THREE.Vector3();
    if (keys['ShiftLeft'] || keys['ShiftRight']) moveSpeed = 3;
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
    container_pTag[1].innerHTML = "Position: (" + camera.position.x.toFixed(2) + ", " + camera.position.y.toFixed(2) + ", " +  camera.position.z.toFixed(2) + ")<br>";
    
    
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    let yaw = Math.atan2(dir.x, dir.z) * 180 / Math.PI;
    yaw *= -1;
    if (yaw < 0) yaw = 360 - (yaw*-1);
    container_pTag[1].innerHTML += "Angle: " + (yaw).toFixed(2) + "<br><br>";

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

const loaderImports = {
  gltf: () => import('../Resources/three.js/examples/jsm/loaders/GLTFLoader.js').then(m => m.GLTFLoader),
  glb: () => import('../Resources/three.js/examples/jsm/loaders/GLTFLoader.js').then(m => m.GLTFLoader),
  obj: () => import('../Resources/three.js/examples/jsm/loaders/OBJLoader.js').then(m => m.OBJLoader),
  mtl: () => import('../Resources/three.js/examples/jsm/loaders/MTLLoader.js').then(m => m.MTLLoader),
  fbx: () => import('../Resources/three.js/examples/jsm/loaders/FBXLoader.js').then(m => m.FBXLoader),
  dae: () => import('../Resources/three.js/examples/jsm/loaders/ColladaLoader.js').then(m => m.ColladaLoader),
  stl: () => import('../Resources/three.js/examples/jsm/loaders/STLLoader.js').then(m => m.STLLoader),
  ply: () => import('../Resources/three.js/examples/jsm/loaders/PLYLoader.js').then(m => m.PLYLoader),
  "3mf": () => import('../Resources/three.js/examples/jsm/loaders/3MFLoader.js').then(m => m.ThreeMFLoader),
  amf: () => import('../Resources/three.js/examples/jsm/loaders/AMFLoader.js').then(m => m.AMFLoader),
  vtk: () => import('../Resources/three.js/examples/jsm/loaders/VTKLoader.js').then(m => m.VTKLoader),
  vtp: () => import('../Resources/three.js/examples/jsm/loaders/VTKLoader.js').then(m => m.VTKLoader),
  usdz: () => import('../Resources/three.js/examples/jsm/loaders/USDZLoader.js').then(m => m.USDZLoader),
};

async function mapDraggedIn(ev) {
  ev.preventDefault();
  ChangeMapLoadedFile(ev.dataTransfer.items[0].getAsFile());
}

async function ChangeMapLoadedFile(file) {
  if (!file || isLoadingMap) return;
  document.getElementById("LoadingMapText").innerText = "Loading...";
  isLoadingMap = true;

  const filename = file.name;
  const ext = filename.substring(filename.lastIndexOf(".") + 1).toLowerCase();

  const importLoader = loaderImports[ext];
  if (!importLoader) {
    document.getElementById("LoadingMapText").innerText = "Unsupported file extension: " + ext;
    isLoadingMap = false;
    return;
  }

  try {
    // Dynamically import the loader
    const LoaderClass = await importLoader();
    const loader = new LoaderClass();

    // Read the file
    const textFormats = ["obj", "mtl", "dae", "amf", "gltf"];
    const reader = new FileReader();
    const isText = textFormats.includes(ext);

    const fileContent = await new Promise((resolve, reject) => {
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => {
        isLoadingMap = false;
        document.getElementById("LoadingMapText").innerText = "Failed to read file";
        reject(reader.error);
      };
      reader.onabort = () => {
        isLoadingMap = false;
        document.getElementById("LoadingMapText").innerText = "Aborted read file";
        reject(new Error("File read aborted"));
      };
      if (isText) reader.readAsText(file);
      else reader.readAsArrayBuffer(file);
    });

    // Parse the model depending on loader
    let object;
    switch (ext) {
      case "gltf":
      case "glb":
        object = await new Promise((resolve, reject) => {
          loader.parse(fileContent, "", gltf => resolve(gltf.scene), err => reject(err));
        });
        break;

      case "obj":
      case "mtl":
      case "fbx":
      case "amf":
        object = loader.parse(fileContent);
        break;

      case "dae":
      case "3mf":
        object = loader.parse(fileContent).scene;
        break;

      case "stl":
        const geometry = loader.parse(fileContent);
        object = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: 0x7777ff }));
        break;

      case "ply":
        const plyGeometry = loader.parse(fileContent);
        object = new THREE.Mesh(plyGeometry, new THREE.MeshStandardMaterial({ color: 0x7777ff }));
        break;

      case "vtk":
      case "vtp":
      case "usdz":
        object = loader.parse(fileContent);
        break;

      default:
        throw new Error("Unsupported loader logic for extension: " + ext);
    }

    if (currentMap) scene.remove(currentMap);
    currentMap = object;
    scene.add(currentMap);
    document.getElementById("LoadingMapText").innerText = "";
  } catch (err) {
    console.error("Error loading model:", err);
    document.getElementById("LoadingMapText").innerText = "Failed to load model: " + err.message
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
  if (angle < 0) angle = 360 - (angle*-1);
  angle = angle.toFixed(2);
  if (!([0,1,2,4]).includes(index)) {
    angle = 0;
  }
  angle = parseInt(angle);

  // unused 2 bytes shouldn't get the value of the angle. Check index to see if we will add to angle or unused 2 bytes
  addNewSpawn(index, false, x, y, z, (index == 4) ? angle : 0, (index == 4) ? 0 : angle);
  refreshSpawnData(index);
}

/* -------------------- Run When file is loaded ------------------- */

makeThreeJSWindow();