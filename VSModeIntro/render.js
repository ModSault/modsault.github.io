var scene = null;
var renderer = null;
var camera = null;
var controls = null;
var gridHelper = null;
var currentMap = null;
var isLoadingMap = false; //prevent loading 2 maps at once

var resizeTimeout = setTimeout(() => {}, 10);
var isResizing = false;

var allKeyframeMesh = []; // all meshes that you can look at to display data on threejs view
var allOtherMeshes = [];

// used to know which keyframe is currently looked at
var currentSetIndex = -1;
var currentKeyframeIndex = -1;

// can forcefully have camera recheck what camera is looking at
var infoNeedsReset = false;

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
    infoNeedsReset = true;
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
  let prevCameraRotation = new THREE.Euler();
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
    if (keys['KeyR']) camera.rotateZ(THREE.MathUtils.degToRad(moveSpeed));
    if (keys['KeyT']) camera.rotateZ(THREE.MathUtils.degToRad(-moveSpeed));
    
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

    if (!moved && !rotated && !infoNeedsReset) { return; } // -------------------------------------------------- Below is only run on camera movements --------------------------- */
    infoNeedsReset = false;

    const calcDistance = function (vertex) {
      return Math.sqrt((Math.pow(camera.position.x - vertex.x, 2)) + (Math.pow(camera.position.y - vertex.y, 2)) + (Math.pow(camera.position.y - vertex.y, 2)))
    }
    const makeStrFromJson = function(json) {
      return `(${json.x.toFixed(2)}, ${json.y.toFixed(2)}, ${json.z.toFixed(2)})`;
    }

    // update info on screen
    const positionStr = makeStrFromJson(camera.position);
    container_HUD[3].getElementsByTagName("input")[0].value = positionStr;

    const euler = new THREE.Euler().setFromQuaternion(camera.quaternion, "YXZ");
    const rotationStr = makeStrFromJson({ "x": 180-THREE.MathUtils.radToDeg(euler.x), "y": 180-THREE.MathUtils.radToDeg(euler.y), "z": 180-THREE.MathUtils.radToDeg(euler.z) });
    container_HUD[3].getElementsByTagName("input")[1].value = rotationStr;

    // raycast and check which keyframe you're looking at
    const raycaster = new THREE.Raycaster();
    const cameraDirection = new THREE.Vector3();
    camera.getWorldDirection(cameraDirection);
    raycaster.set(camera.position, cameraDirection);
    const intersects = raycaster.intersectObjects(allKeyframeMesh, true);

    const elemOfKeyframe = document.getElementById("ThreeJSHud_TriangleInfo");
    const allOfFlexRows = elemOfKeyframe.getElementsByClassName("flexRow");
    elemOfKeyframe.style.display = "none";

    // get closest keyframe
    let closestDistance = null;
    currentSetIndex = -1;
    currentKeyframeIndex = -1;
    for (let i = 0; i < intersects.length; i++) {
      const name = intersects[i].object.name;
      const setIndex = name.split("-").map(Number)[0];
      const keyframeIndex = name.split("-").map(Number)[1];
      const distance = calcDistance({
        "x": allKeyframeData[setIndex].keyframes[keyframeIndex].x,
        "y": allKeyframeData[setIndex].keyframes[keyframeIndex].y,
        "z": allKeyframeData[setIndex].keyframes[keyframeIndex].z
      });
      if (closestDistance == null || distance < closestDistance) {
        closestDistance = distance;
        currentSetIndex = setIndex;
        currentKeyframeIndex = keyframeIndex;
      }
    }
    // display closest keyframe info to threejs view (bottom right)
    if (closestDistance !== null) {
      elemOfKeyframe.style.display = "";
      elemOfKeyframe.getElementsByTagName("p")[0].innerText = `${allKeyframeData[currentSetIndex].name} - ${currentKeyframeIndex}`;

      const allTagsGoThrough = ["x", "y", "z", "rot_x", "rot_y", "rot_z", "fov"];
      const typeInput =        [0,   0,    0,   1,      1,       1,        2   ];
      for (let i = 0; i < allTagsGoThrough.length; i++) {
        const curKeyFrame = allKeyframeData[currentSetIndex].keyframes[currentKeyframeIndex];
        if (typeInput[i] == 0) {
          allOfFlexRows[i].getElementsByTagName("input")[0].value = curKeyFrame[allTagsGoThrough[i]]*10;
          allOfFlexRows[i].getElementsByTagName("input")[1].value = float32toHex(curKeyFrame[allTagsGoThrough[i]]);
        }
        if (typeInput[i] == 1) {
          allOfFlexRows[i].getElementsByTagName("input")[0].value = angleToDegree(curKeyFrame[allTagsGoThrough[i]]);
          allOfFlexRows[i].getElementsByTagName("input")[1].value = curKeyFrame[allTagsGoThrough[i]];
        }
        if (typeInput[i] == 2) {
          allOfFlexRows[i].getElementsByTagName("input")[0].value = curKeyFrame[allTagsGoThrough[i]] / 100;
          allOfFlexRows[i].getElementsByTagName("input")[1].value = curKeyFrame[allTagsGoThrough[i]];
        }
      }
    }
  };
  animate();

  // resize callers
  const resizeObserver = new ResizeObserver((entries) => {
    for (let _ of entries) { resizeThreeJSHandler(); break; }
  });
  resizeObserver.observe(container);
}

/* -------------------- Showing Keyframes ------------------- */

// makes main red keyframe
function makeArrow(name, meshColor, x, y, z, rx, ry, rz) {
  const arrowShape = new THREE.Shape();
  arrowShape.moveTo(0, 0);
  arrowShape.lineTo(2, 0);
  arrowShape.lineTo(2, -1);
  arrowShape.lineTo(4, 1);
  arrowShape.lineTo(2, 3);
  arrowShape.lineTo(2, 2);
  arrowShape.lineTo(0, 2);
  arrowShape.lineTo(0, 0);

  const geometry = new THREE.ExtrudeGeometry(arrowShape, { bevelEnabled: false });
  geometry.center();
  const matrix = new THREE.Matrix4().makeRotationY(Math.PI / 2);
  geometry.applyMatrix4(matrix);
  const material = new THREE.MeshBasicMaterial({
    color: meshColor,
    side: THREE.FrontSide
  });
  const arrowMesh = new THREE.Mesh(geometry, material);
  arrowMesh.name = name;
  arrowMesh.scale.set(0.5, 1.5, 1.5);
  arrowMesh.position.set(x*10, y*10, z*10);
  
  arrowMesh.rotation.set(
    THREE.MathUtils.degToRad(angleToDegree(rx)),
    THREE.MathUtils.degToRad(360 - angleToDegree(ry)),
    THREE.MathUtils.degToRad(90 - angleToDegree(rz)),
    "YXZ"
  );

  const edges = new THREE.EdgesGeometry(geometry, 15);
  const outlineMaterial = new THREE.LineBasicMaterial({ color: 0x000000 });
  const outline = new THREE.LineSegments(edges, outlineMaterial);
  outline.position.copy(arrowMesh.position);
  outline.scale.copy(arrowMesh.scale);
  outline.quaternion.copy(arrowMesh.quaternion);
  outline.name = name + '_outline';

  scene.add(arrowMesh);
  scene.add(outline);
  return [arrowMesh, outline];
}
// make the visualizer to know what you'll see in game (Claude helped make shape)
function makeFOV(name, meshColor, x, y, z, rx, ry, rz, fov) {
  const depth = 3;
  const aspectW = 33;
  const aspectH = 57;
  const halfFovRad = THREE.MathUtils.degToRad((fov/100) * 0.5);

  // Half-height and half-width of the base at given depth
  const halfH = Math.tan(halfFovRad) * depth;
  const halfW = halfH * (aspectW / aspectH);

  // 5 vertices: tip + 4 base corners
  const vertices = new Float32Array([
    // Tip (index 0)
    0,  0,  0,
    // Base corners (indices 1-4), base is at -depth (into the scene)
    -halfW,  halfH, -depth,  // top-left
     halfW,  halfH, -depth,  // top-right
     halfW, -halfH, -depth,  // bottom-right
    -halfW, -halfH, -depth,  // bottom-left
  ]);

  // Triangles: 4 side faces + 2 for the rectangular base
  const indices = [
    // Sides
    0, 1, 2,
    0, 2, 3,
    0, 3, 4,
    0, 4, 1
  ];

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  const mat = new THREE.MeshBasicMaterial({
    color: meshColor,
    wireframe: true,
  });

  const frustum = new THREE.Mesh(geo, mat);
  frustum.position.set(x * 10, y * 10, z * 10);
  frustum.rotation.set(
    THREE.MathUtils.degToRad(angleToDegree(rx)),
    THREE.MathUtils.degToRad(360 - angleToDegree(ry)),
    THREE.MathUtils.degToRad(90 - angleToDegree(rz)),
    "YXZ"
  );
  frustum.name = name;
  scene.add(frustum);

  return frustum;
}
// 13 steps will be made since it seems the game takes ~1/2 seconds to travel to 1 keyframe
// This shows smaller arrows to show how the camera will move between keyframes
function makeSteps(name, meshColor, curKeyFrame, nextKeyFrame) {
  const STEP_COUNT = 13;

  const arrowShape = new THREE.Shape();
  arrowShape.moveTo(0, 0);
  arrowShape.lineTo(2, 0);
  arrowShape.lineTo(2, -1);
  arrowShape.lineTo(4, 1);
  arrowShape.lineTo(2, 3);
  arrowShape.lineTo(2, 2);
  arrowShape.lineTo(0, 2);
  arrowShape.lineTo(0, 0);

  const geometry = new THREE.ExtrudeGeometry(arrowShape, { bevelEnabled: false });
  geometry.center();
  const matrix = new THREE.Matrix4().makeRotationY(Math.PI / 2);
  geometry.applyMatrix4(matrix);

  const material = new THREE.MeshBasicMaterial({
    color: meshColor,
    side: THREE.FrontSide,
  });

  // One draw call for all 14 arrows
  const instancedMesh = new THREE.InstancedMesh(geometry, material, STEP_COUNT);

  // one draw call for all outlines
  const edges = new THREE.EdgesGeometry(geometry, 15);
  const mergedGeometry = new THREE.BufferGeometry();
  const positions = [];

  // arrow object positions and angles
  const dummy = new THREE.Object3D();
  dummy.scale.set(0.17, 0.5, 0.5);

  // ensure that the rotation wont show a full barrel roll if angles are 32000 and -32000 (since those are close in raw hex representation)
  const toUnsigned2Byte = function(r) {
    _view.setInt16(0, r);
    return _view.getUint16(0);
  }
  const getEasierRotation = function(r1, r2) {
    const simple = r1 - r2;
    const complex = toUnsigned2Byte(r1) - toUnsigned2Byte(r2);
    return (Math.abs(simple) < Math.abs(complex)) ? simple : complex;
  }

  for (let i = 0; i < STEP_COUNT; i++) {
    const t = (i+1) / (STEP_COUNT + 1)

    // show filled arrow object
    const newPos = {
      "x": curKeyFrame.x + ((nextKeyFrame.x - curKeyFrame.x) * t),
      "y": curKeyFrame.y + ((nextKeyFrame.y - curKeyFrame.y) * t),
      "z": curKeyFrame.z + ((nextKeyFrame.z - curKeyFrame.z) * t)
    }
    const euler = new THREE.Euler(
      THREE.MathUtils.degToRad(angleToDegree(curKeyFrame.rot_x + (getEasierRotation(nextKeyFrame.rot_x, curKeyFrame.rot_x) * t))),
      THREE.MathUtils.degToRad(360 - angleToDegree(curKeyFrame.rot_y + (getEasierRotation(nextKeyFrame.rot_y, curKeyFrame.rot_y) * t))),
      THREE.MathUtils.degToRad(90 - angleToDegree(curKeyFrame.rot_z + (getEasierRotation(nextKeyFrame.rot_z, curKeyFrame.rot_z) * t))),
      "YXZ"
    );
    const newQuat = new THREE.Quaternion().setFromEuler(euler);
    
    dummy.position.set(newPos.x*10, newPos.y*10, newPos.z*10);
    dummy.quaternion.copy(newQuat);
    dummy.updateMatrix();
    instancedMesh.setMatrixAt(i, dummy.matrix);

    // show outlines to arrows
    const mat = new THREE.Matrix4().compose(
      new THREE.Vector3(newPos.x * 10, newPos.y * 10, newPos.z * 10),
      newQuat,
      new THREE.Vector3(0.17, 0.5, 0.5)
    );
    const edgePositions = edges.attributes.position.array;
    for (let j = 0; j < edgePositions.length; j += 3) {
      const v = new THREE.Vector3(edgePositions[j], edgePositions[j + 1], edgePositions[j + 2]);
      v.applyMatrix4(dummy.matrix);
      positions.push(v.x, v.y, v.z);
    }
  }

  // object render update
  instancedMesh.instanceMatrix.needsUpdate = true;

  // outline render update
  mergedGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  const outlineMaterial = new THREE.LineBasicMaterial({ color: 0x000000 });
  const outlineLines = new THREE.LineSegments(mergedGeometry, outlineMaterial);

  scene.add(outlineLines);
  scene.add(instancedMesh);
  return [ instancedMesh, outlineLines ];
}
function rerenderAllThreeJS() {
  // cleanup
  for (let i = 0; i < allKeyframeMesh.length; i++) {
    disposeMesh(allKeyframeMesh[i]);
  }
  for (let i = 0; i < allOtherMeshes.length; i++) {
    disposeMesh(allOtherMeshes[i]);
  }
  allKeyframeMesh = [];
  allOtherMeshes = [];

  // setup
  const keyframeColor = parseInt(document.getElementById("KeyFrameColor").value.substr(1), 16);
  const stepColor = parseInt(document.getElementById("StepColor").value.substr(1), 16);
  const fovColor = parseInt(document.getElementById("FOVColor").value.substr(1), 16);
  const showSteps = document.getElementById("ShowStepsCheckbox").checked;
  const showFOV = document.getElementById("ShowFOVCheckbox").checked;
  for (let i = 0; i < allKeyframeData.length; i++) {
    for (let j = 0; j < allKeyframeData[i].keyframes.length; j++) {
      // make main keyframe
      const curKeyFrame = allKeyframeData[i].keyframes[j];
      const newMeshes = makeArrow(`${i}-${j}`, keyframeColor, curKeyFrame.x, curKeyFrame.y, curKeyFrame.z, curKeyFrame.rot_x, curKeyFrame.rot_y, curKeyFrame.rot_z);
      allKeyframeMesh.push(newMeshes[0]);
      allOtherMeshes.push(newMeshes[1]);
      // make FOV
      if (showFOV) {
        const FOV_POV = makeFOV(`${i}-FOV-${j}`, fovColor, curKeyFrame.x, curKeyFrame.y, curKeyFrame.z, curKeyFrame.rot_x, curKeyFrame.rot_y, curKeyFrame.rot_z, curKeyFrame.fov);
        allOtherMeshes.push(FOV_POV);
      }
      // make smaller arrow substeps
      if (showSteps && j != allKeyframeData[i].keyframes.length - 1) {
        const nextKeyFrame = allKeyframeData[i].keyframes[j+1];
        const newStepMeshes = makeSteps(`${i}-Steps-${j}`, stepColor, curKeyFrame, nextKeyFrame);
        allOtherMeshes.push(newStepMeshes[0]);
        allOtherMeshes.push(newStepMeshes[1]);
      }
    }
  }

  infoNeedsReset = true;
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
    if (currentMap) disposeMesh(currentMap);
    currentMap = result.message;
    scene.add(currentMap);
    document.getElementById("LoadingMapText").innerText = "";
    document.getElementById("GridHelperSee").checked = false;
    document.getElementById("GridHelperSee").onchange();
  }
  isLoadingMap = false;
}


/* -------------------- Other Functions ------------ */

function gotoButtonHandler(setIndex, keyframeIndex) {
  const curKeyFrame = allKeyframeData[setIndex].keyframes[keyframeIndex];
  camera.position.set(curKeyFrame.x*10, curKeyFrame.y*10, curKeyFrame.z*10);
  camera.rotation.set(
    THREE.MathUtils.degToRad(angleToDegree(curKeyFrame.rot_x)),
    THREE.MathUtils.degToRad(360-angleToDegree(curKeyFrame.rot_y)),
    THREE.MathUtils.degToRad(-angleToDegree(curKeyFrame.rot_z)),
    "YXZ"
  );
}
function copyCamButtonHandler(setIndex, keyframeIndex) {
  const euler = new THREE.Euler().setFromQuaternion(camera.quaternion, "YXZ");
  const position = camera.position;
  data_updateKeyFrame(setIndex, keyframeIndex, "x", position.x/10, false);
  data_updateKeyFrame(setIndex, keyframeIndex, "y", position.y/10, false);
  data_updateKeyFrame(setIndex, keyframeIndex, "z", position.z/10, false);
  data_updateKeyFrame(setIndex, keyframeIndex, "rot_x", DegreeToAngle(Math.round(180-THREE.MathUtils.radToDeg(euler.x))), false);
  data_updateKeyFrame(setIndex, keyframeIndex, "rot_y", DegreeToAngle(Math.round(180-THREE.MathUtils.radToDeg(euler.y))), false);
  data_updateKeyFrame(setIndex, keyframeIndex, "rot_z", DegreeToAngle(Math.round(180-THREE.MathUtils.radToDeg(euler.z))));
}
function quickAddButtonHandler(setIndex) {
  const euler = new THREE.Euler().setFromQuaternion(camera.quaternion, "YXZ");
  const funcSimp = function(angle) { return DegreeToAngle(Math.round(180-THREE.MathUtils.radToDeg(angle))); }
  const position = camera.position;
  data_addKeyFrame(setIndex, position.x/10, position.y/10, position.z/10, funcSimp(euler.x), funcSimp(euler.y), funcSimp(euler.z));
  refreshAllFilePreview();
}

async function exportScene(ext = ".glb") {
  const { General3JS_Exporter } = await import('../Resources/threejs_importer_exporter.js');
  await General3JS_Exporter(scene, getFileName(ext));
}

function CameraPositionChange(str) {
  const values = str.match(/-?\d+(\.\d+)?/g).map(Number);
  const curPos = camera.position;
  const newX = values.length > 0 ? values[0] : curPos.x;
  const newY = values.length > 1 ? values[1] : curPos.y;
  const newZ = values.length > 2 ? values[2] : curPos.z;
  camera.position.set(newX, newY, newZ);
}

function CameraAngleChange(str) {
  const values = str.match(/-?\d+(\.\d+)?/g).map(Number);
  while (values.length < 3) values.push(0);
  camera.rotation.set(
    THREE.MathUtils.degToRad(180-(values[0])),
    THREE.MathUtils.degToRad(180-(values[1])),
    THREE.MathUtils.degToRad(180-(values[2])),
    "YXZ"
  );
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