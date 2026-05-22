var scene = null;
var renderer = null;
var camera = null;
var controls = null;
var gridHelper = null;
var resizeTimeout = setTimeout(() => {}, 10);
var allTriangleMeshes = [];
var allOtherMeshes = [];
var debugObjects = [];
var specialGoToOutline = null;
var isResizing = false;

var currentFileIndex = -1;
var currentTriangleIndex = -1;
var infoNeedsReset = false;

// ----------------- Three JS rendering and handlers ----------------- 

// Handle window resize. The ThreeJS window kept on messing with the website layout and this strange solution is what I got to work
function resizeThreeJSHandler() {
  if (isResizing) return;
  isResizing = true;

  renderer.setSize(0, 0, true);
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    const container = document.getElementById('ThreeJsDisplay');
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
  const container = document.getElementById('ThreeJsDisplay');
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
  document.addEventListener('mousedown', (event) => {
    if (controls.isLocked) {
      if (event.button == 0) {
        if (currentFileIndex != -1 && currentTriangleIndex != -1) {
          createHighlightFromGoTo(currentFileIndex, currentTriangleIndex)
        }
      }
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
      document.getElementById("ThreeJSRenderedCheckMark").checked = true;
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

    const moved = !camera.position.equals(prevCameraPosition);
    const rotated = !camera.rotation.equals(prevCameraRotation);

    prevCameraPosition.copy(camera.position);
    prevCameraRotation.copy(camera.rotation);

    if (!moved && !rotated && !infoNeedsReset) { return; }

    // cleanup previous triangle info (so red dots and "v1" text)
    for (let i = 0; i < debugObjects.length; i++) {
      disposeMesh(debugObjects[i]);
    }
    debugObjects = [];
    infoNeedsReset = false;
    container_HUD[4].style.display = "none"; // hide "v1"
    container_HUD[5].style.display = "none"; // hide "v2"
    container_HUD[6].style.display = "none"; // hide "v3"

    // get triangle user is looking at. Cast raycast, and show info for closest (if touching any triangles)
    const TriInfoHud = document.getElementById("ThreeJSHud_TriangleInfo");
    TriInfoHud.style.display = "none";

    const calcDistance = function (vertex) {
      return Math.sqrt((Math.pow(camera.position.x - vertex.x, 2)) + (Math.pow(camera.position.y - vertex.y, 2)) + (Math.pow(camera.position.y - vertex.y, 2)))
    }
    const makeStrFromJson = function(json) {
      return `(${json.x.toFixed(2)}, ${json.y.toFixed(2)}, ${json.z.toFixed(2)})`;
    }

    const raycaster = new THREE.Raycaster();
    const cameraDirection = new THREE.Vector3();
    camera.getWorldDirection(cameraDirection);
    raycaster.set(camera.position, cameraDirection);
    const intersects = raycaster.intersectObjects(allTriangleMeshes, true);

    let closestDistance = null;
    let closestName = null;
    let closestFaceIndex = null;
    currentFileIndex = -1;
    currentTriangleIndex = -1;
    for (let i = 0; i < intersects.length; i++) {
      const name = intersects[i].object.name;
      const faceIndex = intersects[i].faceIndex;
      const allVertex = [AllCollisionData[name].triangles[faceIndex].v1, AllCollisionData[name].triangles[faceIndex].v2, AllCollisionData[name].triangles[faceIndex].v3];
      for (const v in allVertex) {
        const distance = calcDistance(v);
        if (closestDistance == null || distance < closestDistance) {
          closestDistance = distance;
          closestName = name;
          closestFaceIndex = faceIndex;
        }
      }
    }
    if (closestDistance !== null) {
      TriInfoHud.style.display = "";
      currentFileIndex = closestName;
      currentTriangleIndex = closestFaceIndex;
      
      // update fileName and Triangle Index displayed
      const allPTags = container_HUD[3].getElementsByTagName("p");
      allPTags[0].innerText = `[File id ${parseInt(currentFileIndex)+1}] ${AllCollisionData[currentFileIndex].name}`;
      allPTags[1].innerText = "Triangle Index: " + currentTriangleIndex;

      // update all HUD info
      const cur_tri = AllCollisionData[currentFileIndex].triangles[currentTriangleIndex];
      const normal_str = makeStrFromJson(cur_tri.normal);
      const edge1_str = makeStrFromJson(cur_tri.Edge1);
      const edge2_str = makeStrFromJson(cur_tri.Edge2);
      const edge3_str = makeStrFromJson(cur_tri.Edge3);
      const unknownByte1_str = ("") + cur_tri.unknownByte1;
      const unknownByte2_str = ("") + cur_tri.unknownByte2;
      const v1_str = makeStrFromJson(cur_tri.v1);
      const v2_str = makeStrFromJson(cur_tri.v2);
      const v3_str = makeStrFromJson(cur_tri.v3);
      const inGrid_str = cur_tri.inGrid.sort((a, b) => a - b).join(",");

      // check if need recalculate
      const expected = reCalculateTriangleInfo(currentFileIndex, currentTriangleIndex);
      const doNedRecalculate = {
        "normal": false,
        "Edge1": false,
        "Edge2": false,
        "Edge3": false,
        "unknownByte1": false,
        "unknownByte2": false,
        "v1": false,
        "v2": false,
        "v3": false,
        "inGrid": false
      };
      for (const key in doNedRecalculate) {
        if (key == "unknownByte1" || key == "unknownByte2") {
          if (!checkIfEqual(cur_tri[key], expected[key], 0.01)) {
            doNedRecalculate[key] = true;
          }
          continue;
        }
        if (key == "inGrid") {
          if (!(cur_tri[key].sort((a, b) => a - b).join(",") == expected[key].sort((a, b) => a - b).join(","))) {
            doNedRecalculate[key] = true;
          }
          continue;
        }
        if (!checkIfEqual(cur_tri[key].x, expected[key].x, 0.01) || !checkIfEqual(cur_tri[key].y, expected[key].y, 0.01) || !checkIfEqual(cur_tri[key].z, expected[key].z, 0.01)) {
          doNedRecalculate[key] = true;
        }
      }
      
      // setup
      const allSpans = container_HUD[3].getElementsByTagName("span");
      const allInputs = container_HUD[3].getElementsByTagName("input");
      const allButtons = container_HUD[3].getElementsByTagName("button");
      const updateInfo = function(index, str, needFix) {
        allSpans[index].innerText = str;
        allInputs[index].value = str;
        allButtons[index].style.display = needFix ? "" : "none";
        allButtons[index].disabled = !needFix;
        allButtons[index].style.cursor = needFix ? "" : "default";
        if (index == 4) {
          const select = container_HUD[3].getElementsByTagName("select")[0];

          select.value = parseInt(str);          
          allSpans[index].innerText = select.options[parseInt(str)].text;
        }
      }

      // update HUD with all info
      updateInfo(0, normal_str, doNedRecalculate["normal"]);
      updateInfo(1, edge1_str, doNedRecalculate["Edge1"]);
      updateInfo(2, edge2_str, doNedRecalculate["Edge2"]);
      updateInfo(3, edge3_str, doNedRecalculate["Edge3"]);
      updateInfo(4, unknownByte1_str, doNedRecalculate["unknownByte1"]);
      updateInfo(5, unknownByte2_str, doNedRecalculate["unknownByte2"]);
      updateInfo(6, v1_str, doNedRecalculate["v1"]);
      updateInfo(7, v2_str, doNedRecalculate["v2"]);
      updateInfo(8, v3_str, doNedRecalculate["v3"]);
      updateInfo(9, inGrid_str, doNedRecalculate["inGrid"]);

      // show vertices and normals visually (love you claude)
      if (document.getElementById("TriangleInfoViewer").checked) {
        const vertex = [cur_tri.v1, cur_tri.v2, cur_tri.v3];
        const normal = cur_tri.normal;
        const TriangleCenter = new THREE.Vector3(
          (cur_tri.v1.x + cur_tri.v2.x + cur_tri.v3.x) / 3,
          (cur_tri.v1.y + cur_tri.v2.y + cur_tri.v3.y) / 3,
          (cur_tri.v1.z + cur_tri.v2.z + cur_tri.v3.z) / 3
        );
        const textToMove = [container_HUD[4], container_HUD[5], container_HUD[6]];

        const containerRect = renderer.domElement.getBoundingClientRect();

        const color = parseInt(document.getElementById("TriangleInfoColor").value.replace("#", ""), 16);

        const edge1 = new THREE.Vector3().subVectors(vertex[1], vertex[0]).length();
        const edge2 = new THREE.Vector3().subVectors(vertex[2], vertex[1]).length();
        const edge3 = new THREE.Vector3().subVectors(vertex[1], vertex[2]).length();
        const triSize = Math.max(edge1, edge2, edge3);
        const circleSegmentCount = Math.max(8, Math.min(64, triSize/20));

        vertex.forEach((v, idx) => {
          // Dot
          const dotGeo = new THREE.SphereGeometry(Math.min(0.5, triSize / 30), circleSegmentCount, circleSegmentCount);
          const dotMat = new THREE.MeshBasicMaterial({ color: color, depthTest: false });
          const dot = new THREE.Mesh(dotGeo, dotMat);
          dot.position.copy(v);
          dot.renderOrder = 999;
          scene.add(dot);
          debugObjects.push(dot);

          // Label offset away from triangle center
          const dir = new THREE.Vector3().subVectors(v, TriangleCenter).normalize();
          const labelPos = new THREE.Vector3().copy(v).addScaledVector(dir, triSize / 30);

          // Project to screen
          const projected = labelPos.clone().project(camera);
          const x = (projected.x *  0.5 + 0.5) * containerRect.width;
          const y = (-projected.y * 0.5 + 0.5) * containerRect.height;

          textToMove[idx].style.left = x + "px";
          textToMove[idx].style.top  = y + "px";
          textToMove[idx].style.display = projected.z > 1 ? "none" : "block";
        });

        // --- Normal arrow from center ---
        const arrowLength = VectorLength(normal);
        const arrowDir = new THREE.Vector3(normal.x, normal.y, normal.z).normalize();
        const arrow = new THREE.ArrowHelper(arrowDir, TriangleCenter, arrowLength, color, Math.min(0.3, triSize/40), Math.min(0.7, triSize/20));
        arrow.line.material.depthTest = false;
        arrow.cone.material.depthTest = false;
        arrow.line.renderOrder = 999;
        arrow.cone.renderOrder = 999;
        scene.add(arrow);
        debugObjects.push(arrow);

        // --- outline on triangle ---
        const outline = createOutline(vertex[0], vertex[1], vertex[2], color);
        outline.renderOrder = 900;
        scene.add(outline);
        debugObjects.push(outline);

        // --- activate range sphere ---
        if (document.getElementById("TriangleInfoBoundsViewer").checked) {
          // add sphere
          const geometry = new THREE.SphereGeometry(cur_tri.unknownByte2, circleSegmentCount*2, circleSegmentCount*2);
          const material = new THREE.MeshPhongMaterial({ color: color, transparent: true, opacity: 0.2 });
          const sphere = new THREE.Mesh(geometry, material);
          sphere.position.set(
            cur_tri.v1.x,
            cur_tri.v1.y,
            cur_tri.v1.z
          );
          scene.add(sphere);
          debugObjects.push(sphere);

          // Add wireframe outline
          const edgesGeo = new THREE.EdgesGeometry(geometry);
          const edgesMat = new THREE.LineBasicMaterial({ color: color });
          const wireframe = new THREE.LineSegments(edgesGeo, edgesMat);
          wireframe.position.copy(sphere.position);
          scene.add(wireframe);
          debugObjects.push(wireframe);
        }
      }
    }

    // update position on screen
    const positionStr = makeStrFromJson(camera.position)
    container_HUD[2].getElementsByTagName("input")[0].value = positionStr;

    // delete goto outline if looking away (shout outs to claude)
    if (specialGoToOutline != null) {
      const frustum = new THREE.Frustum();
      const matrix = new THREE.Matrix4();
      matrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
      frustum.setFromProjectionMatrix(matrix);
      const isOnScreen = frustum.intersectsObject(specialGoToOutline);
      
      if (!isOnScreen) {
        disposeMesh(specialGoToOutline);
        specialGoToOutline = null;
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

// So grass is green, snow is white, etc..
// look at variable `allSurfaceTypes` in `logic.js` for names
// `getColor(x)` means its unused and I resort to a "random" value
const surfaceColors = [
  0xFF3737, // index 0
  0xC98F6E, // index 1
  0xD2B48C, // index 2
  0x69FF37, // index 3
  0x7F9AF3, // index 4
  0x2352EB, // index 5
  0x585E72, // index 6
  0x607D8B, // index 7
  0x00C853, // index 8
  0x1CC3D9, // index 9
  0x35FFF2, // index 10
  0xAEE9E5, // index 11
  getColor(12), // index 12
  getColor(13), // index 13
  0xA2802F, // index 14
  0xBDA56D, // index 15
  0x714086, // index 16
  0xF008C2, // index 17
  getColor(18), // index 18
  0x9118AF, // index 19
  getColor(20), // index 20
  getColor(21), // index 21
  getColor(22), // index 22
  getColor(23), // index 23
  getColor(24), // index 24
  getColor(25), // index 25
  getColor(26), // index 26
  getColor(27), // index 27
  getColor(28), // index 28
  getColor(29), // index 29
  getColor(30), // index 30
  0xFF0000 // index 31
];

// Show all triangles in a Collision File
function renderTriangles(index) {
  const triangles = AllCollisionData[index].triangles;
  const threejsInfo = AllCollisionData[index].threeJS;
  const vertexCount = triangles.length * 3;
  const positions = new Float32Array(vertexCount * 3);
  const normals   = new Float32Array(vertexCount * 3);
  const colors    = new Float32Array(vertexCount * 3);

  for (let i = 0; i < triangles.length; i++) {
    const tri = triangles[i];
      
    // --------- check all masks to see if we want this triangle --------------
    // check grid mask
    if (threejsInfo.triangles_gridMask.indexOf("-1") == -1) {
      const allowed = threejsInfo.triangles_gridMask.split(",").map(Number);
      let foundValid = false;
      for (let j = 0; j < allowed.length; j++) {
        foundValid |= tri.inGrid.includes(allowed[j])
      }
      if (!foundValid)
        continue;
    }
    // check unknownbyte1 mask
    if (threejsInfo.triangles_unknown1Mask.indexOf("-1") == -1) {
      const allowed = threejsInfo.triangles_unknown1Mask.split(",").map(Number);
      if (!allowed.includes(tri.unknownByte1)) {
        continue;
      }
    }
    // check unknownbyte2 mask
    if (threejsInfo.triangles_unknown2Mask.indexOf("-1") == -1) {
      const allowed = threejsInfo.triangles_unknown2Mask.split(",").map(Number);
      if (!allowed.includes(tri.unknownByte2)) {
        continue;
      }
    }

    // --------- determine triangle color --------------
    let color = 0;
    if (threejsInfo.triangles_colorBasedOnByte1) {
      color = (tri.unknownByte1 >= surfaceColors.length) ? getColor(tri.unknownByte1) : surfaceColors[tri.unknownByte1];
    } else if (threejsInfo.triangles_colorBasedOnByte2) {
      // Colors are shown so that similar values look similar. Thanks to Claude for this implementation
      const t = tri.unknownByte2 / 255;

      // Purple → Blue → Cyan → Green → Yellow → Red
      const stops = [
        [148, 0, 211],   // 0.0  - purple
        [0,   0, 255],   // 0.2  - blue
        [0,  255, 255],  // 0.4  - cyan
        [0,  255,   0],  // 0.6  - green
        [255, 255,  0],  // 0.8  - yellow
        [255,   0,  0],  // 1.0  - red
      ];

      const scaled = t * (stops.length - 1);
      const i = Math.min(Math.floor(scaled), stops.length - 2);
      const f = scaled - i;

      const r = Math.round(stops[i][0] + f * (stops[i+1][0] - stops[i][0]));
      const g = Math.round(stops[i][1] + f * (stops[i+1][1] - stops[i][1]));
      const b = Math.round(stops[i][2] + f * (stops[i+1][2] - stops[i][2]));

      color = (r << 16) | (g << 8) | b;
    } else if (threejsInfo.triangles_colorBasedOnGrid) {
      // Colors are shown based of on number of grids its in
      if (tri.inGrid.length === 0) {
        // assigned to no grids
        continue;
      }
      color = getColor(tri.inGrid.length);
    } else if (threejsInfo.triangles_colorRandom) {
      color = ((Math.random() * 255) << 16) | ((Math.random() * 255) << 8) | ((Math.random() * 255) << 0)
    } else {
      color = parseInt(threejsInfo.triangles_color.replace("#",""), 16);
    }
    const r = (color >> 16) & 0xFF;
    const g = (color >> 8) & 0xFF;
    const b = color & 0xFF;

    // add render information
    const verts = [tri.v1, tri.v2, tri.v3];
    verts.forEach((v, j) => {
      const idx = (i * 3 + j) * 3;

      // Position from v1/v2/v3
      positions[idx]     = v.x;
      positions[idx + 1] = v.y;
      positions[idx + 2] = v.z;

      // Same face normal for all 3 verts
      normals[idx]     = tri.normal.x;
      normals[idx + 1] = tri.normal.y;
      normals[idx + 2] = tri.normal.z;

      // Same random color for all 3 verts
      colors[idx]     = r / 255;
      colors[idx + 1] = g / 255;
      colors[idx + 2] = b / 255;
    });
  }

  // render
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('normal',   new THREE.BufferAttribute(normals,   3));
  geometry.setAttribute('color',    new THREE.BufferAttribute(colors,    3));

  const material = new THREE.MeshLambertMaterial({
    vertexColors: true
  });

  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);
  return mesh;
}


// this is all claude idk what this is doing really
// shows grids to help with debugging
function renderGridAll(index) {
  const threejsInfo = AllCollisionData[index].threeJS;
  const gridFloatSizesReciprocal = AllCollisionData[index].gridFloatSizesReciprocal;
  const LowestBounds = AllCollisionData[index].LowestBounds;
  const gridAmt = AllCollisionData[index].gridAmt;

  const color = parseInt(threejsInfo.grid_color.replace("#", ""), 16);
  const r = ((color >> 16) & 0xFF) / 255;
  const g = ((color >> 8) & 0xFF) / 255;
  const b = (color & 0xFF) / 255;
  const threeColor = new THREE.Color(r, g, b);

  const cellSize = {
    x: 1 / gridFloatSizesReciprocal.x,
    y: 1 / gridFloatSizesReciprocal.y,
    z: 1 / gridFloatSizesReciprocal.z,
  };

  const renderAll = threejsInfo.triangles_gridMask.indexOf("-1") !== -1;
  const allGridMasks = threejsInfo.triangles_gridMask.split(",").map(Number);
  const maskedCellCount = renderAll ? (gridAmt.x * gridAmt.y * gridAmt.z) : allGridMasks.length;

  const boxGeo = new THREE.BoxGeometry(cellSize.x, cellSize.y, cellSize.z);
  const boxMat = new THREE.MeshBasicMaterial({
    color: threeColor,
    transparent: true,
    opacity: 0.02,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const instancedMesh = new THREE.InstancedMesh(boxGeo, boxMat, maskedCellCount);
  instancedMesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);

  const edgePositions = new Float32Array(maskedCellCount * 12 * 2 * 3);
  let offset = 0;

  const dummy = new THREE.Object3D();
  let instanceIndex = 0;

  const hx = cellSize.x / 2;
  const hy = cellSize.y / 2;
  const hz = cellSize.z / 2;

  const edgePairs = [
    [-hx,-hy,-hz,  hx,-hy,-hz],
    [ hx,-hy,-hz,  hx, hy,-hz],
    [ hx, hy,-hz, -hx, hy,-hz],
    [-hx, hy,-hz, -hx,-hy,-hz],
    [-hx,-hy, hz,  hx,-hy, hz],
    [ hx,-hy, hz,  hx, hy, hz],
    [ hx, hy, hz, -hx, hy, hz],
    [-hx, hy, hz, -hx,-hy, hz],
    [-hx,-hy,-hz, -hx,-hy, hz],
    [ hx,-hy,-hz,  hx,-hy, hz],
    [ hx, hy,-hz,  hx, hy, hz],
    [-hx, hy,-hz, -hx, hy, hz],
  ];

  for (let x = 0; x < gridAmt.x; x++) {
    for (let y = 0; y < gridAmt.y; y++) {
      for (let z = 0; z < gridAmt.z; z++) {
        if (!renderAll) {
          const gridNumber = x + (z * gridAmt.x) + (y * gridAmt.x * gridAmt.z);
          if (!allGridMasks.includes(gridNumber)) {
            continue;
          }
        }

        const cx = (x / gridFloatSizesReciprocal.x) + LowestBounds.x + hx;
        const cy = (y / gridFloatSizesReciprocal.y) + LowestBounds.y + hy;
        const cz = (z / gridFloatSizesReciprocal.z) + LowestBounds.z + hz;

        dummy.position.set(cx, cy, cz);
        dummy.updateMatrix();
        instancedMesh.setMatrixAt(instanceIndex++, dummy.matrix);

        for (const [ax, ay, az, bx, by, bz] of edgePairs) {
          edgePositions[offset++] = cx + ax;
          edgePositions[offset++] = cy + ay;
          edgePositions[offset++] = cz + az;
          edgePositions[offset++] = cx + bx;
          edgePositions[offset++] = cy + by;
          edgePositions[offset++] = cz + bz;
        }
      }
    }
  }

  instancedMesh.instanceMatrix.needsUpdate = true;
  scene.add(instancedMesh);

  const wireGeo = new THREE.BufferGeometry();
  wireGeo.setAttribute('position', new THREE.BufferAttribute(edgePositions, 3));
  const wireMat = new THREE.LineBasicMaterial({
    color: threeColor,
    transparent: true,
    opacity: 0.8,
  });
  const wireframe = new THREE.LineSegments(wireGeo, wireMat);
  scene.add(wireframe);

  return [instancedMesh, wireframe];
}

// render bounding box
function renderBoundPoints(index) {
  const threejsInfo = AllCollisionData[index].threeJS;
  const LowestBounds = AllCollisionData[index].LowestBounds;
  const HighestBounds = AllCollisionData[index].HighestBounds;
  const MiddleBounds = AllCollisionData[index].MiddleBounds;

  // get color
  let r, g, b;
  const color = parseInt(threejsInfo.boundsPoints_color.replace("#",""), 16);
  r = (color >> 16) & 0xFF;
  g = (color >> 8) & 0xFF;
  b = color & 0xFF;

  // make box
  const sizeX = HighestBounds.x - LowestBounds.x;
  const sizeY = HighestBounds.y - LowestBounds.y;
  const sizeZ = HighestBounds.z - LowestBounds.z;

  const centerX = LowestBounds.x + sizeX / 2;
  const centerY = LowestBounds.y + sizeY / 2;
  const centerZ = LowestBounds.z + sizeZ / 2;

  const geometry = new THREE.BoxGeometry(sizeX, sizeY, sizeZ);
  const material = new THREE.MeshBasicMaterial({
    color: new THREE.Color(r / 255, g / 255, b / 255),
    transparent: true,
    opacity: 0.02,
    depthWrite: false,
    side: THREE.DoubleSide
  });

  const box = new THREE.Mesh(geometry, material);
  box.position.set(centerX, centerY, centerZ);
  scene.add(box);

  // Wireframe edges on top
  const edges = new THREE.EdgesGeometry(geometry);
  const lineMaterial = new THREE.LineBasicMaterial({
    color: new THREE.Color(r / 255, g / 255, b / 255),
    opacity: 0.8,
    transparent: true
  });
  const wireframe = new THREE.LineSegments(edges, lineMaterial);
  wireframe.position.set(centerX, centerY, centerZ);
  scene.add(wireframe);

  // add lines from corners to middle point
  const corners = [
    [LowestBounds.x,  LowestBounds.y,  LowestBounds.z],
    [HighestBounds.x, LowestBounds.y,  LowestBounds.z],
    [LowestBounds.x,  HighestBounds.y, LowestBounds.z],
    [HighestBounds.x, HighestBounds.y, LowestBounds.z],
    [LowestBounds.x,  LowestBounds.y,  HighestBounds.z],
    [HighestBounds.x, LowestBounds.y,  HighestBounds.z],
    [LowestBounds.x,  HighestBounds.y, HighestBounds.z],
    [HighestBounds.x, HighestBounds.y, HighestBounds.z],
  ];

  const points = [];
  for (const [cx, cy, cz] of corners) {
    points.push(cx, cy, cz);
    points.push(MiddleBounds.x, MiddleBounds.y, MiddleBounds.z);
  }

  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(points), 3));

  const lineMat = new THREE.LineBasicMaterial({
    color: new THREE.Color(r / 255, g / 255, b / 255),
    transparent: true,
    opacity: 0.8
  });

  const lines = new THREE.LineSegments(lineGeo, lineMat);
  scene.add(lines);

  // return
  return [ box, wireframe, lines ];
}

// render circular range showing when the file is active.
function renderCircularBounds(index) {
  const threejsInfo = AllCollisionData[index].threeJS;
  const MiddleBounds = AllCollisionData[index].MiddleBounds;
  const range = AllCollisionData[index].CircularBounds;

  // get color
  let r, g, b;
  const color = parseInt(threejsInfo.circularBounds_color.replace("#",""), 16);
  r = (color >> 16) & 0xFF;
  g = (color >> 8) & 0xFF;
  b = color & 0xFF;
  const threeColor = new THREE.Color(r / 255, g / 255, b / 255);

  // make sphere
  const geometry = new THREE.SphereGeometry(
    range,
    Math.min(255, Math.max(32, range / 23)),
    Math.min(255, Math.max(32, range / 23))
  );
  const material = new THREE.MeshBasicMaterial({
    color: threeColor,
    transparent: true,
    opacity: 0.08,
    depthWrite: false,
    side: THREE.DoubleSide
  });

  const sphere = new THREE.Mesh(geometry, material);
  sphere.position.set(MiddleBounds.x, MiddleBounds.y, MiddleBounds.z);
  scene.add(sphere);

  // Edge lines
  const edges = new THREE.WireframeGeometry(geometry, 30);
  const edgeMat = new THREE.LineBasicMaterial({
    color: threeColor,
    transparent: true,
    opacity: 0.8
  });

  const wireframe = new THREE.LineSegments(edges, edgeMat);
  sphere.add(wireframe);

  return [ wireframe, sphere ];
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


// go through all files and render all. Delete all previous info first
function rerenderAllThreeJS() {
  // cleanup
  for (let i = 0; i < allTriangleMeshes.length; i++) {
    disposeMesh(allTriangleMeshes[i]);
  }
  for (let i = 0; i < allOtherMeshes.length; i++) {
    disposeMesh(allOtherMeshes[i]);
  }
  if (specialGoToOutline != null) {
    disposeMesh(specialGoToOutline);
  }
  allTriangleMeshes = [];
  allOtherMeshes = [];
  specialGoToOutline = null;
  
  // add all new triangles and meshes
  for (let i = 0; i < AllCollisionData.length; i++) {
    const curInfo = AllCollisionData[i].threeJS;
    
    if (curInfo.triangles_shown) {
      const newMesh = renderTriangles(i);
      newMesh.name = `${i}`
      allTriangleMeshes.push(newMesh);
    }
    if (curInfo.grid_shown) {
      const [boxMesh, wireMesh] = renderGridAll(i);
      allOtherMeshes.push(boxMesh, wireMesh);
    }
    if (curInfo.circularBounds_shown) {
      const newMesh = renderCircularBounds(i);
      allOtherMeshes.push(newMesh[0]);
      allOtherMeshes.push(newMesh[1]);
    }
    if (curInfo.boundsPoints_shown) {
      const newMesh = renderBoundPoints(i);
      allOtherMeshes.push(newMesh[0]);
      allOtherMeshes.push(newMesh[1]);
      allOtherMeshes.push(newMesh[2]);
    }
  }

  infoNeedsReset = true;
}



// chatGPT function to give close values radically different colors
// Used primarily for debugging
function getColor(value) {
  // Use a large prime or irrational factor to spread nearby integers
  const factor = 137.508; // golden angle in degrees
  let hue = (value * factor) % 360; // wrap into 0..360

  // HSV to RGB (full saturation and brightness)
  let c = 1, x = c * (1 - Math.abs((hue / 60) % 2 - 1)), m = 0;
  let r1, g1, b1;

  if(hue < 60){ r1=c; g1=x; b1=0; }
  else if(hue < 120){ r1=x; g1=c; b1=0; }
  else if(hue < 180){ r1=0; g1=c; b1=x; }
  else if(hue < 240){ r1=0; g1=x; b1=c; }
  else if(hue < 300){ r1=x; g1=0; b1=c; }
  else { r1=c; g1=0; b1=x; }

  let R = Math.round((r1 + m) * 200) + 55;
  let G = Math.round((g1 + m) * 200) + 55;
  let B = Math.round((b1 + m) * 200) + 55;

  return (R << 16) | (G << 8) | B;
}

// --------- when HUD inputs are changed -------------

function ShowOrHideTriInfo(show) {
  infoNeedsReset = true;
  document.getElementById('TriangleInfoColor').style.display = show ? '' : 'none';
  document.getElementById('TriangleInfoBoundsViewer').style.display = show ? '' : 'none';
  document.getElementById('TriangleInfoBoundsViewer').labels[0].style.display = show ? '' : 'none';
}

function CameraPositionChange(str) {
  const values = str.match(/-?\d+(\.\d+)?/g).map(Number);
  const curPos = camera.position;
  const newX = values.length > 0 ? values[0] : curPos.x;
  const newY = values.length > 1 ? values[1] : curPos.y;
  const newZ = values.length > 2 ? values[2] : curPos.z;
  camera.position.set(newX, newY, newZ);
}

function updateTriangleInfo(str, jsonTableName) {
  wasFileChanged = true;
  const values = str == "" ? [] : str.match(/-?\d+(\.\d+)?/g).map(Number);

  const tri_cur = AllCollisionData[currentFileIndex].triangles[currentTriangleIndex];
  if (jsonTableName == "inGrid")  {
    const maxNumGrids = AllCollisionData[currentFileIndex].gridAmt.x * AllCollisionData[currentFileIndex].gridAmt.y * AllCollisionData[currentFileIndex].gridAmt.z;
    if (str !== "")
      str = maskInputWithCommaDelimiter(str, 0, maxNumGrids-1);
    if (str === "")
      str = "";
    tri_cur.inGrid = str == "" ? [] : [...new Set(str.split(",").map(Number))];
  } else if (jsonTableName == "unknownByte1" || jsonTableName == "unknownByte2") {
    if (values.length > 0) {
      let newValue = parseInt(values[0]);
      newValue = Math.max(0, Math.min(255, newValue));
      tri_cur[jsonTableName] = newValue;
    }
  } else {
    let initialVertex = null;
    if (jsonTableName == "v1" || jsonTableName == "v2" || jsonTableName == "v3") {
      const cur_json = JSON.parse(JSON.stringify(AllCollisionData[currentFileIndex]["triangles"][currentTriangleIndex][jsonTableName]));
      initialVertex = `${floatTo32BitHex(cur_json.x)} ${floatTo32BitHex(cur_json.y)} ${floatTo32BitHex(cur_json.z)}`;
    }

    const newX = values.length > 0 ? float64toFloat32(values[0]) : float64toFloat32(tri_cur[jsonTableName].x);
    const newY = values.length > 1 ? float64toFloat32(values[1]) : float64toFloat32(tri_cur[jsonTableName].y);
    const newZ = values.length > 2 ? float64toFloat32(values[2]) : float64toFloat32(tri_cur[jsonTableName].z);
    tri_cur[jsonTableName] = { "x": newX, "y": newY, "z": newZ };
    if (jsonTableName == "normal" || jsonTableName == "Edge1" || jsonTableName == "Edge2" || jsonTableName == "Edge3") {
      tri_cur[jsonTableName] = {
        "x": TwoByteIntToFloat(floatTo2ByteInt(newX)),
        "y": TwoByteIntToFloat(floatTo2ByteInt(newY)),
        "z": TwoByteIntToFloat(floatTo2ByteInt(newZ))
      };
    }

    if (initialVertex != null && document.getElementById("VertexCausesAutoFix").checked) {
      AllCollisionData[currentFileIndex]["triangles"][currentTriangleIndex] = reCalculateTriangleInfo(currentFileIndex, currentTriangleIndex);
    }

    if (initialVertex != null && document.getElementById("VertexChangesAll").checked) {
      for (let i = 0; i < AllCollisionData[currentFileIndex].triangles.length * 3; i++) {
        if (parseInt(i / 3) == currentTriangleIndex) continue;
        
        const tri_loop_cur = AllCollisionData[currentFileIndex].triangles[parseInt(i / 3)]["v"+(1+(i%3))];
        const newVertex = `${floatTo32BitHex(tri_loop_cur.x)} ${floatTo32BitHex(tri_loop_cur.y)} ${floatTo32BitHex(tri_loop_cur.z)}`;
        if (newVertex == initialVertex) {
          tri_loop_cur.x = newX;
          tri_loop_cur.y = newY;
          tri_loop_cur.z = newZ;
          if (document.getElementById("VertexCausesAutoFix").checked)
            AllCollisionData[currentFileIndex].triangles[parseInt(i / 3)] = reCalculateTriangleInfo(currentFileIndex, parseInt(i / 3));
        }
      }
    }
  }
  infoNeedsReset = true; // check if looking at new triangle even though you haven't moved 
  
  refreshTable_metadata(currentFileIndex);
  refreshTable_triangles(currentFileIndex);
  updateIndexDownloadFile(currentFileIndex);
  rerenderAllThreeJS();
}

function fixTriangleInfo3JS(jsonTableName) {
  const tri_cur = AllCollisionData[currentFileIndex].triangles[currentTriangleIndex];
  const expected = reCalculateTriangleInfo(currentFileIndex, currentTriangleIndex);
  tri_cur[jsonTableName] = expected[jsonTableName];
  wasFileChanged = true;
  refreshTable_metadata(currentFileIndex);
  refreshTable_triangles(currentFileIndex);
  updateIndexDownloadFile(currentFileIndex);
  rerenderAllThreeJS();
}

function ThreeJSDeleteTri() {
  AllCollisionData[currentFileIndex].triangles.splice(currentTriangleIndex, 1);
  AllCollisionData[currentFileIndex].triangles_lowerShow = Math.min(AllCollisionData[currentFileIndex].triangles_lowerShow, AllCollisionData[currentFileIndex].triangles.length - 1);
  AllCollisionData[currentFileIndex].triangles_higherShow = Math.min(AllCollisionData[currentFileIndex].triangles_higherShow, AllCollisionData[currentFileIndex].triangles.length - 1);
  refreshTable_metadata(currentFileIndex, this);
  refreshTable_triangles(currentFileIndex, this);
  wasFileChanged = true;
  updateIndexDownloadFile(currentFileIndex);
  rerenderAllThreeJS();
}

function ThreeJSHideFile() {
  const cur = AllCollisionData[currentFileIndex].threeJS;
  cur.triangles_shown = false;
  cur.grid_shown = false;
  cur.circularBounds_shown = false;
  cur.boundsPoints_shown = false;

  let anyShown = false;
  for (let i = 0; i < AllCollisionData.length; i++) {
    const loop_cur = AllCollisionData[i].threeJS;
    anyShown |= loop_cur.triangles_shown;
  }
  document.getElementById("GridHelperSee").checked = !(anyShown)
  gridHelper.visible = document.getElementById("GridHelperSee").checked;

  refreshTable_threejs(currentFileIndex, null, !document.getElementById("Editor_Contents").getElementsByTagName("details")[currentFileIndex].open);
  rerenderAllThreeJS();
}

function ThreeJSHideAllButFile() {
  ChangeAllRender(0b0000, 0b0000, false, currentFileIndex);
}

// multi purpose function to change render of files in various ways
// `bits` tells it what to render/not render
// `ignoreBits` tells is what we are interested in. So triangles, grid, etc
function ChangeAllRender(bits, ignoreBits, ThreeJSGrid = false, skipIndex = -1) {
  const showTri = (bits & 0b0001) != 0;
  const showGrid = (bits & 0b0010) != 0;
  const showCollisionRange = (bits & 0b0100) != 0;
  const showBoundPoints = (bits & 0b1000) != 0;

  let anyShown = false;
  for (let i = 0; i < AllCollisionData.length; i++) {
    if (i == skipIndex) continue;

    const cur = AllCollisionData[i].threeJS;
    if (!(ignoreBits & 0b0010) && cur.triangles_shown)
      cur.grid_shown = showGrid;
    if (!(ignoreBits & 0b0100) && cur.triangles_shown)
      cur.circularBounds_shown = showCollisionRange;
    if (!(ignoreBits & 0b1000) && cur.triangles_shown)
      cur.boundsPoints_shown = showBoundPoints;
    if (!(ignoreBits & 0b0001))
      cur.triangles_shown = showTri;
    
    anyShown |= cur.triangles_shown;
    refreshTable_threejs(i, null, !document.getElementById("Editor_Contents").getElementsByTagName("details")[i].open);
  }
  rerenderAllThreeJS();

  if (ThreeJSGrid) {
    document.getElementById("GridHelperSee").checked = !(anyShown)
    gridHelper.visible = document.getElementById("GridHelperSee").checked;
  }
}

// function to change color of all files rendered. Also handles changing color of
// grid and such
function ChangeAllRender_color(bits, color) {
  for (let i = 0; i < AllCollisionData.length; i++) {
    const cur = AllCollisionData[i].threeJS;
    if (!cur.triangles_shown) continue;

    if (bits & 0b0001) {
      cur.triangles_colorBasedOnByte1 = false;
      cur.triangles_colorBasedOnByte2 = false;
      cur.triangles_colorBasedOnGrid = false;
      cur.triangles_colorRandom = false;
      cur.triangles_color = color != -1 ? color : ("#"+getColor(i+1).toString(16));
    }
    if (bits & 0b0010) {
      cur.grid_color = color;
    }
    if (bits & 0b0100) {
      cur.circularBounds_color = color;
    }
    if (bits & 0b1000) {
      cur.boundsPoints_color = color;
    }

    refreshTable_threejs(i, null, !document.getElementById("Editor_Contents").getElementsByTagName("details")[i].open);
  }
  rerenderAllThreeJS();
}

// change render type for triangles. So if it is based on grid, unknownBute1, or a random color
function ChangeAllRender_tri(unknown1, unknown2, grid, random) {
  for (let i = 0; i < AllCollisionData.length; i++) {
    const cur = AllCollisionData[i].threeJS;
    if (!cur.triangles_shown) continue;

    cur.triangles_colorBasedOnByte1 = unknown1;
    cur.triangles_colorBasedOnByte2 = unknown2;
    cur.triangles_colorBasedOnGrid = grid;
    cur.triangles_colorRandom = random;

    refreshTable_threejs(i, null, !document.getElementById("Editor_Contents").getElementsByTagName("details")[i].open);
  }
  rerenderAllThreeJS();
}

// ------------------- when goto button is clicked ------------------- 

// makes it easy to find triangle you want
function createOutline(v1, v2, v3, color) {
  const geometry = new THREE.BufferGeometry();
  const vertices = new Float32Array([
    v1.x, v1.y, v1.z,
    v2.x, v2.y, v2.z,
    v3.x, v3.y, v3.z,
  ]);
  geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  geometry.setIndex([0, 1, 2]);

  // Outline edges
  const edgesGeometry = new THREE.EdgesGeometry(geometry);
  const outlineMaterial = new THREE.LineBasicMaterial({
    color: color,
    depthTest: false,  // renders through all surfaces
  });
  const outline = new THREE.LineSegments(edgesGeometry, outlineMaterial);
  return outline;
}
// make white highlight of triangle you pressed "goto" on. Render on top
function createHighlightFromGoTo(CollisionIndex, triangleIndex) {
  const i = CollisionIndex, j = triangleIndex;
  const v1 = AllCollisionData[i].triangles[j].v1;
  const v2 = AllCollisionData[i].triangles[j].v2;
  const v3 = AllCollisionData[i].triangles[j].v3;

  const outline = createOutline(v1, v2, v3, 0xFFFFFF);
  outline.renderOrder = 1000;
  scene.add(outline);

  if (specialGoToOutline != null) {
    disposeMesh(specialGoToOutline);
  }
  specialGoToOutline = outline;
  return outline;
}

/* -------------------- Export Scene ------------ */

async function exportScene(ext = ".glb") {
  const { General3JS_Exporter } = await import('../Resources/threejs_importer_exporter.js');
  await General3JS_Exporter(scene, getFileName(ext));
}

// -------------- call on load ------------------------

makeThreeJSWindow();