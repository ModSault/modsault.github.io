// Yeah this file definitely has a lot of technical debt btw.
// It could also be shorter with better use of functions mainly with DOM creation.
/*
Variable with all info for collision data. NOT SORTED IN A WAY FRIENDLY FOR THE GAME. To get it in a game friendly
format a lot of comparisons needs to be done.

Example (with fake data):
[
  {
    "name": "hit_pack_01.pac - 1",
    "gridFloatSizes": {"x": 20.0, "y": 10.0, "z": 40.0},
    "gridFloatSizesReciprocal": {"x": 0.05, "y": 0.1, "z": 0.025},
    "gridAmt": {"x": 4, "y": 2, "z": 4},
    "LowestBounds": {"x": 1.0, "y": 2.0, "z": 3.0},
    "HighestBounds:" {"x": 1.0, "y": 2.0, "z": 3.0},
    "MiddleBounds": {"x": 1.0, "y": 2.0, "z": 3.0},
    "CircularBounds": 20.0,
    "triangles_lowerShow": 0,
    "triangles_higherShow": 0,
    "triangles": [
      {
        "normal": {"x": 1.0, "y": 2.0, "z": 3.0},
        "Edge1": {"x": 1.0, "y": 2.0, "z": 3.0},
        "Edge2": {"x": 1.0, "y": 2.0, "z": 3.0},
        "Edge3": {"x": 1.0, "y": 2.0, "z": 3.0},
        "unknownByte1": 15, // this is the surface type, this tool was made before I knew what it was
        "unknownByte2": 6, // this is the Collision Range byte
        "v1": {"x": 1.0, "y": 2.0, "z": 3.0},
        "v2": {"x": 1.0, "y": 2.0, "z": 3.0},
        "v3": {"x": 1.0, "y": 2.0, "z": 3.0},
        "inGrid": [0, 2, ...],
      }
      ...
    ],
    "threeJS": { // this is only used for rendering. This isn't relevant for the game
      "grid_shown": false,
      "grid_color": 0x00ff00,
      "circularBounds_shown": false,
      "circularBounds_color": 0x0000ff,
      "boundsPoints_shown": false,
      "boundsPoints_color": 0x00FFFF,
      "triangles_shown": true,
      "triangles_color": 0xC8C8C8,
      "triangles_colorBasedOnByte1": true,
      "triangles_colorBasedOnByte2": false,
      "triangles_colorBasedOnGrid": false,
      "triangles_colorRandom": false,
      "triangles_gridMask": "-1",
      "triangles_unknown1Mask": "-1",
      "triangles_unknown2Mask": "-1"
    }
  },
  ...
]
*/
var AllCollisionData = []
var fileDownloadContents = []; // array in array containing all hex data of all files to download
var fileDownloadSegmentColor = []; // array in array with hex data of colors. only used to get colors in file preview to make it easier to understand at a glance
var allWarnings = []; // array in array of all warnings/errors found while making the file
var allDescriptions = []; // array in array to describe purpose of all offsets and what their values mean
var fileNum = 0; // used for getting correct filename on an export
var wasFileChanged = false; // used for popup to prevent closing browser
var JSON_filenames = null; // used to determine what filenames are for what. Loaded on page load
var currentlyDownloadingAll = false; // used so two downloads can't happen at once

const copyrightAlertMessage = 'Ensure you have Forward as "X+" and Up as "Y+" in blender when importing/exporting.\n\nTHIS IS STILL COPYRIGHTED MATERIAL!!! DO NOT DISTRIBUTE!!';
const g_JSZipCreditMessage = "Thanks to JSZip for making zipping possible.\nhttps://github.com/Stuk/jszip\nhttps://stuk.github.io/jszip/";

/* ----------------- General Purpose Functions ------------ */

async function downloadAllIndividual() {
  if (currentlyDownloadingAll) return;
  currentlyDownloadingAll = true;

  const zip = new JSZip();
  for (let k = 0; k < AllCollisionData.length; k++) {
    const name = sanitizeFilename(AllCollisionData[k].name) + ".stl";
    const blob = generateSTLBinary(k);
    zip.file(name, blob);
  }
  zip.file("credit.txt", g_JSZipCreditMessage);

  const content = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(content);
  const a = document.createElement("a");
  a.href = url;
  a.download = getFileName(".zip");
  a.click();
  URL.revokeObjectURL(url);

  currentlyDownloadingAll = false;
}

// given a file, all metadata is calculated to what the website thinks everything should be
function reCalculateMetaData(index) {
  const allTriangles = AllCollisionData[index].triangles;
  let lowestBounds = null;
  let highestBounds = null;
  for (let i = 0; i < allTriangles.length * 3; i++) {
    const vertex = allTriangles[parseInt(i / 3)]["v"+(1 + (i % 3))];
    if (lowestBounds == null) {
      lowestBounds = JSON.parse(JSON.stringify(vertex));
      highestBounds = JSON.parse(JSON.stringify(vertex)); // don't copy by reference cause I will change it
      continue;
    }
    lowestBounds.x =  Math.min(lowestBounds.x, vertex.x);
    lowestBounds.y =  Math.min(lowestBounds.y, vertex.y);
    lowestBounds.z =  Math.min(lowestBounds.z, vertex.z);
    highestBounds.x = Math.max(highestBounds.x, vertex.x);
    highestBounds.y = Math.max(highestBounds.y, vertex.y);
    highestBounds.z = Math.max(highestBounds.z, vertex.z);
  }

  // no triangles check
  if (lowestBounds == null) {
    lowestBounds = { "x": 0, "y": 0, "z": 0 };
    highestBounds = { "x": 0, "y": 0, "z": 0 };
  }
  // if bounds are equal, move them 0.5 away from each other
  for (const char of ["x", "y", "z"]) {
    if (checkIfEqual(lowestBounds[char], highestBounds[char], 0.01)) {
      lowestBounds[char] -= 0.05;
      highestBounds[char] += 0.05;
    }
  }


  // get other values
  const midPoints = {
    "x": ((highestBounds.x - lowestBounds.x) / 2) + lowestBounds.x,
    "y": ((highestBounds.y - lowestBounds.y) / 2) + lowestBounds.y,
    "z": ((highestBounds.z - lowestBounds.z) / 2) + lowestBounds.z
  }
  const gridAmt = AllCollisionData[index].gridAmt;
  const gridFloatSizes = {
    "x": Math.max(0.1, (highestBounds.x - lowestBounds.x) / gridAmt.x),
    "y": Math.max(0.1, (highestBounds.y - lowestBounds.y) / gridAmt.y),
    "z": Math.max(0.1, (highestBounds.z - lowestBounds.z) / gridAmt.z)
  }
  let gridFloatSizesReciprocal = {
    "x": 1 / gridFloatSizes.x,
    "y": 1 / gridFloatSizes.y,
    "z": 1 / gridFloatSizes.z
  }
  if (!Number.isFinite(gridFloatSizesReciprocal.x)) gridFloatSizesReciprocal.x = 1;
  if (!Number.isFinite(gridFloatSizesReciprocal.y)) gridFloatSizesReciprocal.y = 1;
  if (!Number.isFinite(gridFloatSizesReciprocal.z)) gridFloatSizesReciprocal.z = 1;

  // get Collision Range value (since we now know midPoints)
  let CircularBounds = 0;
  for (let i = 0; i < allTriangles.length * 3; i++) {
    const vertex = allTriangles[parseInt(i / 3)]["v"+(1 + (i % 3))];
    CircularBounds = Math.max(CircularBounds, VectorLength(VectorSubtract(vertex, midPoints)));
  }

  // return proper values (in ways the game can correctly read)
  return {
    "gridFloatSizes": {
      "x": float64toFloat32(gridFloatSizes.x),
      "y": float64toFloat32(gridFloatSizes.y),
      "z": float64toFloat32(gridFloatSizes.z)
    },
    "gridFloatSizesReciprocal": {
      "x": float64toFloat32(gridFloatSizesReciprocal.x),
      "y": float64toFloat32(gridFloatSizesReciprocal.y),
      "z": float64toFloat32(gridFloatSizesReciprocal.z)
    },
    "gridAmt": { // only here for convenience
      "x": Math.max(1, Math.min(0xFFFF, gridAmt.x)),
      "y": Math.max(1, Math.min(0xFFFF, gridAmt.y)),
      "z": Math.max(1, Math.min(0xFFFF, gridAmt.z))
    },
    "LowestBounds": {
      "x": float64toFloat32(lowestBounds.x),
      "y": float64toFloat32(lowestBounds.y),
      "z": float64toFloat32(lowestBounds.z)
    },
    "HighestBounds": {
      "x": float64toFloat32(highestBounds.x),
      "y": float64toFloat32(highestBounds.y),
      "z": float64toFloat32(highestBounds.z)
    },
    "MiddleBounds": {
      "x": float64toFloat32(midPoints.x),
      "y": float64toFloat32(midPoints.y),
      "z": float64toFloat32(midPoints.z)
    },
    "CircularBounds": float64toFloat32(CircularBounds)
  }
}

// Given a vertex, determine all grids its in and/or close to
function getGridsFromVertex(vertex, lowestBound, gridFloatSizesReciprocal, gridAmt, epsilon = 0.111112) {
  const deltaLowest = {
    x: float64toFloat32(vertex.x) - float64toFloat32(lowestBound.x),
    y: float64toFloat32(vertex.y) - float64toFloat32(lowestBound.y),
    z: float64toFloat32(vertex.z) - float64toFloat32(lowestBound.z)
  };

  const gridNumFloat = {
    x: float64toFloat32(float64toFloat32(deltaLowest.x) * float64toFloat32(gridFloatSizesReciprocal.x)),
    y: float64toFloat32(float64toFloat32(deltaLowest.y) * float64toFloat32(gridFloatSizesReciprocal.y)),
    z: float64toFloat32(float64toFloat32(deltaLowest.z) * float64toFloat32(gridFloatSizesReciprocal.z))
  };

  // For each axis, get the candidate grid indices (floor, and floor+1 if close to boundary)
  function getCandidates(val, maxGrid) {
    const f = Math.floor(val);
    const candidates = [f];

    // Near the boundary between f and f+1?
    if (Math.abs(val - (f + 1)) < epsilon) {
      candidates.push(f + 1);
    }
    // Near the boundary between f-1 and f?
    if (Math.abs(val - f) < epsilon) {
      candidates.push(f - 1);
    }

    return [...new Set(candidates)].filter(c => c >= 0 && c < maxGrid);
  }

  const xs = getCandidates(gridNumFloat.x, gridAmt.x);
  const ys = getCandidates(gridNumFloat.y, gridAmt.y);
  const zs = getCandidates(gridNumFloat.z, gridAmt.z);

  const results = new Set();
  for (const x of xs) {
    for (const y of ys) {
      for (const z of zs) {
        if (x < 0 || y < 0 || z < 0) continue;
        if (x >= gridAmt.x || y >= gridAmt.y || z >= gridAmt.z) continue;
        const gridNum = x + (z * gridAmt.x) + (y * gridAmt.x * gridAmt.z);
        results.add(gridNum);
      }
    }
  }

  return results.size === 0 ? [] : [...results];
}

// gets all grids a triangle is in
function betterGridCalculate(v1, v2, v3, lowestBound, gridSizeReciprocal, gridAmt, epsilon = 0.111112) {
  const gridSizes = {
    x: 1 / gridSizeReciprocal.x,
    y: 1 / gridSizeReciprocal.y,
    z: 1 / gridSizeReciprocal.z
  };

  const getGridNumber = function(v, epsilonMul) {
    return {
      x: Math.floor((v.x - lowestBound.x + (epsilonMul * epsilon)) * gridSizeReciprocal.x),
      y: Math.floor((v.y - lowestBound.y + (epsilonMul * epsilon)) * gridSizeReciprocal.y),
      z: Math.floor((v.z - lowestBound.z + (epsilonMul * epsilon)) * gridSizeReciprocal.z)
    };
  };

  const v1_gridMin = getGridNumber(v1, -1);
  const v2_gridMin = getGridNumber(v2, -1);
  const v3_gridMin = getGridNumber(v3, -1);
  const v1_gridMax = getGridNumber(v1, 1);
  const v2_gridMax = getGridNumber(v2, 1);
  const v3_gridMax = getGridNumber(v3, 1);

  const grid_x_min = Math.floor(Math.max(0, Math.min(v1_gridMin.x, v2_gridMin.x, v3_gridMin.x)));
  const grid_y_min = Math.floor(Math.max(0, Math.min(v1_gridMin.y, v2_gridMin.y, v3_gridMin.y)));
  const grid_z_min = Math.floor(Math.max(0, Math.min(v1_gridMin.z, v2_gridMin.z, v3_gridMin.z)));
  const grid_x_max = Math.ceil(Math.min(gridAmt.x - 1, Math.max(v1_gridMax.x, v2_gridMax.x, v3_gridMax.x)));
  const grid_y_max = Math.ceil(Math.min(gridAmt.y - 1, Math.max(v1_gridMax.y, v2_gridMax.y, v3_gridMax.y)));
  const grid_z_max = Math.ceil(Math.min(gridAmt.z - 1, Math.max(v1_gridMax.z, v2_gridMax.z, v3_gridMax.z)));

  // I love Claude cause I don't understand how the math works below
  // --- SAT helpers ---

  // Project triangle verts onto an axis, return [min, max]
  const projectTriangle = (axis, a, b, c) => {
    const pa = axis.x*a.x + axis.y*a.y + axis.z*a.z;
    const pb = axis.x*b.x + axis.y*b.y + axis.z*b.z;
    const pc = axis.x*c.x + axis.y*c.y + axis.z*c.z;
    return [Math.min(pa, pb, pc), Math.max(pa, pb, pc)];
  };

  // Project AABB (center + half-extents) onto an axis, return [min, max]
  const projectAABB = (axis, center, half) => {
    const r = Math.abs(axis.x)*half.x + Math.abs(axis.y)*half.y + Math.abs(axis.z)*half.z;
    const p = axis.x*center.x + axis.y*center.y + axis.z*center.z;
    return [p - r, p + r];
  };

  const overlaps = (a, b) => a[0] <= b[1] + epsilon && b[0] <= a[1] + epsilon;

  // Triangle edges and normal (computed once, reused per cell)
  const e0 = VectorSubtract(v2, v1);
  const e1 = VectorSubtract(v3, v2);
  const e2 = VectorSubtract(v1, v3);
  const triNormal = VectorCross(e0, e1);

  // The 9 edge-cross-product axes (cross of triangle edge with each world axis)
  const worldAxes = [
    { x:1, y:0, z:0 },
    { x:0, y:1, z:0 },
    { x:0, y:0, z:1 }
  ];

  const satAxes = [
    // 3 AABB face normals (world axes) - cheapest, test first
    ...worldAxes,
    // 1 triangle face normal
    triNormal,
    // 9 edge cross products
    ...([e0, e1, e2].flatMap(edge => worldAxes.map(wa => VectorCross(edge, wa))))
  ];

  // Skip zero-length axes (degenerate cross products)
  const validAxes = satAxes.filter(a => a.x*a.x + a.y*a.y + a.z*a.z > 1e-14);

  const triangleIntersectsAABB = (center, half) => {
    for (const axis of validAxes) {
      const triProj  = projectTriangle(axis, v1, v2, v3);
      const aabbProj = projectAABB(axis, center, half);
      if (!overlaps(triProj, aabbProj)) return false; // Separating axis found
    }
    return true; // No separating axis - intersection confirmed
  };

  // --- Main loop ---
  const result = [
    ...getGridsFromVertex(v1, lowestBound, gridSizeReciprocal, gridAmt, epsilon),
    ...getGridsFromVertex(v2, lowestBound, gridSizeReciprocal, gridAmt, epsilon),
    ...getGridsFromVertex(v3, lowestBound, gridSizeReciprocal, gridAmt, epsilon)
  ];

  for (let x = grid_x_min; x <= grid_x_max; x++) {
    for (let y = grid_y_min; y <= grid_y_max; y++) {
      for (let z = grid_z_min; z <= grid_z_max; z++) {
        const center = {
          x: lowestBound.x + (x + 0.5) * gridSizes.x,
          y: lowestBound.y + (y + 0.5) * gridSizes.y,
          z: lowestBound.z + (z + 0.5) * gridSizes.z
        };
        const half = {
          x: (gridSizes.x * 0.5) + (epsilon),
          y: (gridSizes.y * 0.5) + (epsilon),
          z: (gridSizes.z * 0.5) + (epsilon)
        };

        if (triangleIntersectsAABB(center, half)) {
          result.push(x + (z * gridAmt.x) + (y * gridAmt.x * gridAmt.z));
        }
      }
    }
  }

  return result;
}

function isTriangleLine(v1, v2, v3) {
  const slope_1to2 = VectorNormalize(vectorFloat64ToFloat32(VectorSubtract(v1, v2)));
  const slope_1to3 = VectorNormalize(vectorFloat64ToFloat32(VectorSubtract(v1, v3)));
  const isSame = function (uno, dos) {
    return floatTo32BitHex(uno) == floatTo32BitHex(dos);
  }
  const isExactSame = checkIfEqual(slope_1to2.x, slope_1to3.x, 0.001) && checkIfEqual(slope_1to2.y, slope_1to3.y, 0.001) && checkIfEqual(slope_1to2.z, slope_1to3.z, 0.001);
  const isInverseSame = checkIfEqual(slope_1to2.x, -1*slope_1to3.x, 0.001) && checkIfEqual(slope_1to2.y, -1*slope_1to3.y, 0.001) && checkIfEqual(slope_1to2.z, -1*slope_1to3.z, 0.001);
  return isExactSame || isInverseSame;
}
function shouldTriangleDelete(v1, v2, v3) {
  // if line or normal is {"x": 0, "y": 0, "z": 0 }, delete
  return isTriangleLine(v1, v2, v3) || VectorLength(VectorPreCalculated1(v1, v2, v3)) == 0;
}


// given a file and triangle index, get all info needed for the triangle
function reCalculateTriangleInfo(index, tri_index, amtDif = 0.06) {
  const cur_tri = AllCollisionData[index].triangles[tri_index];
  const AllGridLocations = betterGridCalculate(cur_tri.v1, cur_tri.v2, cur_tri.v3, AllCollisionData[index].LowestBounds, AllCollisionData[index].gridFloatSizesReciprocal, AllCollisionData[index].gridAmt, amtDif);
  const allGridLocations_unique = [...new Set(AllGridLocations)].filter(n => n >= 0).sort((a, b) => a - b);

  const collisionRange1 = Math.ceil(VectorLength(VectorSubtract(cur_tri.v1, cur_tri.v2)));
  const collisionRange2 = Math.ceil(VectorLength(VectorSubtract(cur_tri.v1, cur_tri.v3)));
  const highestCollisionRange = Math.max(1, collisionRange1, collisionRange2);
  const deleteTri = shouldTriangleDelete(cur_tri.v1, cur_tri.v2, cur_tri.v3);
  // return values that the game will see (so no float64 only values)
  return {
    "normal": vectorFloat64ToFloatFrom2ByteInt(VectorPreCalculated1(cur_tri.v1, cur_tri.v2, cur_tri.v3)),
    "Edge1": vectorFloat64ToFloatFrom2ByteInt(VectorPreCalculated2(cur_tri.v1, cur_tri.v2, cur_tri.v3)),
    "Edge2": vectorFloat64ToFloatFrom2ByteInt(VectorPreCalculated3(cur_tri.v1, cur_tri.v2, cur_tri.v3)),
    "Edge3": vectorFloat64ToFloatFrom2ByteInt(VectorPreCalculated4(cur_tri.v1, cur_tri.v2, cur_tri.v3)),
    "unknownByte1": cur_tri.unknownByte1,
    "unknownByte2": highestCollisionRange > 255 ? 0 : highestCollisionRange, // 0 means game will calculate it if its too big of a triangle
    "v1": vectorFloat64ToFloat32(JSON.parse(JSON.stringify(cur_tri.v1))),
    "v2": vectorFloat64ToFloat32(JSON.parse(JSON.stringify(cur_tri.v2))),
    "v3": vectorFloat64ToFloat32(JSON.parse(JSON.stringify(cur_tri.v3))),
    "inGrid": deleteTri ? [] : allGridLocations_unique
  }
}

// for typing in grid numbers manually, this handles seeing all values in the one string
function maskInputWithCommaDelimiter(initial, min = 0, max = 255) {
  const onlyNeededChars = initial.replace(/[^0-9,]/g, "");
  if (onlyNeededChars.indexOf("-1") != -1) return "-1";

  let toReturn = "";
  const numbers = onlyNeededChars.split(",").map(Number);
  for (let i = 0; i < numbers.length; i++) {
    if (numbers[i] >= min && numbers[i] <= max && toReturn.indexOf(","+numbers[i]) == -1) {
      toReturn += ","+numbers[i];
    }
  }
  toReturn = toReturn.substring(1); // remove starting comma
  return toReturn;
}

// these are global for performance. Website was super slow when it needed to allocate all the memory every time
const _buf = new ArrayBuffer(4);
const _view = new DataView(_buf);
function float64toFloat32(val) {
  _view.setFloat32(0, val);
  return _view.getFloat32(0);
}
function floatTo32BitHex(float) {
  if (float == -0 || float == 0) { float = 0; }
  _view.setFloat32(0, float);
  return _view.getUint32(0);
}
// just used to ensure a vector is a friendly format for the game
function vectorFloat64ToFloat32(vector) {
  return {
    "x": float64toFloat32(vector.x),
    "y": float64toFloat32(vector.y),
    "z": float64toFloat32(vector.z)
  };
}

// these are global for performance. Website was super slow when it needed to allocate all the memory every time
const _hexBuf = new ArrayBuffer(4);
const _hexBytes = new Uint8Array(_hexBuf);
const _hexView = new DataView(_hexBuf);
function HexStrToFloat(hex) {
  for (let i = 0; i < 4; i++) {
    _hexBytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return _hexView.getFloat32(0, false);
}

// game stores normals and edges in a 2 byte signed integer format. These are ways to go to and from them
function floatTo2ByteInt(float) {
  // -2 to 1.99999 : 0x8000 (-32768) to 0x7FFF (32767)
  if (float >= 2) float = 1.999999;
  if (float <= -2) float = -2;
  return (((float/2)*32768) & 0xFFFF);
}
function TwoByteIntToFloat(twoByteInt) {
  // -2 to 1.99999 : 0x8000 (-32768) to 0x7FFF (32767)
  if (twoByteInt >= 32768) twoByteInt = twoByteInt - 0x10000; // turn to negative if above signed 2 byte value
  if (twoByteInt < -32768) twoByteInt = -32768;
  return parseFloat((twoByteInt / 32768) * 2);
}
// just used to ensure a vector is a friendly format for the game
function vectorFloat64ToFloatFrom2ByteInt(vector) {
  return {
    "x": TwoByteIntToFloat(floatTo2ByteInt(vector.x)),
    "y": TwoByteIntToFloat(floatTo2ByteInt(vector.y)),
    "z": TwoByteIntToFloat(floatTo2ByteInt(vector.z))
  };
}


// helpful vector functions
function VectorSubtract(a, b) {
  return {
    x: a.x - b.x,
    y: a.y - b.y,
    z: a.z - b.z
  };
}
function VectorCross(a, b) {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x
  };
}
function VectorDot(a, b) {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}
function VectorLength(v) {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}
function VectorNormalize(v) {
  const len = VectorLength(v);
  if (len === 0) return { x: 0, y: 0, z: 0 };
  return {
    x: v.x / len,
    y: v.y / len,
    z: v.z / len
  };
}

// calculated normals and edges for triangles. These are the precalculated values the game will read
function VectorPreCalculated1(v1, v2, v3) {
  const E1 = VectorSubtract(v2, v1);
  const E2 = VectorSubtract(v3, v1);
  return VectorNormalize(VectorCross(E1, E2));
}
function VectorPreCalculated2(v1, v2, v3) {
  return VectorNormalize(VectorSubtract(v2, v1));
}
function VectorPreCalculated3(v1, v2, v3) {
  return VectorNormalize(VectorSubtract(v3, v2));
}
function VectorPreCalculated4(v1, v2, v3) {
  return VectorNormalize(VectorSubtract(v1, v3));
}

// used to check if my website and game agree with float/fixed point numbers
function checkIfEqual(a, b, tolerance = 0) {
  if (
    (tolerance === 0 && a === b) ||
    (tolerance != 0 && (Math.abs(parseFloat(a) - parseFloat(b)) <= tolerance))
  ) {
    return true;
  }
  return false;
}

/* ----------------- General DOM creation -------------- */

const allSurfaceTypes = [
  "Nothing", // index 0
  "Dirt / Sandstone", // index 1
  "Sand", // index 2
  "Grass", // index 3
  "Slippery Water", // index 4
  "Water", // index 5
  "Hard Surface / Concrete", // index 6
  "Metal", // index 7
  "Plants / Nature", // index 8
  "Transparent / Reflective", // index 9
  "Ice", // index 10
  "Snow", // index 11
  "Unused Nothing 1", // index 12
  "Unused Nothing 2", // index 13
  "Simple Map Ramps", // index 14
  "Supporting Structure / Mission 2 Boss Surface", // index 15
  "Metal (Aparoid Exclusive)", // index 16
  "Aparoid Filled Hexagon", // index 17
  "Unused Generic", // index 18
  "Aparoid Hollow Hexagon", // index 19
  "Unused Nothing 3", // index 20
  "Unused Nothing 4", // index 21
  "Unused Nothing 5", // index 22
  "Unused Nothing 6", // index 23
  "Unused Nothing 7", // index 24
  "Unused Nothing 8", // index 25
  "Unused Nothing 9", // index 26
  "Unused Nothing 10", // index 27
  "Unused Nothing 11", // index 28
  "Unused Nothing 12", // index 29
  "Unused Nothing 13", // index 30
  "Death" // index 31
];

// used to get all options in ThreeJS hud
function makeAllOptionsSurfaceTypeSelector() {
  const elem = document.getElementById("ThreeJSHUD_unknown1Select");
  const fragment = document.createDocumentFragment();

  for (let i = 0; i <= 255; i++) {
    const option = document.createElement("option");
    option.value = i;
    option.innerText = (i >= allSurfaceTypes.length) ? `Unused/Custom index ${i}` : allSurfaceTypes[i];
    fragment.appendChild(option);
  }

  elem.replaceChildren(fragment);
}

// add buttons in triangle section of file to fix all of a specific value if any triangle has it incorrect.
function addRecalculateAll(CollisionIndex, jsonTableName, numberWrongJson, displayText) {
  if (numberWrongJson[jsonTableName].length == 0) {
    return document.createDocumentFragment();
  }

  const toReturn = DOM_generalAdd("span");
  const button = document.createElement("button");
  button.innerText = `Fix All '${displayText}' Values (${numberWrongJson[jsonTableName].length})`;
  button.onclick = function() {
    for (let i = 0; i < AllCollisionData[CollisionIndex].triangles.length; i++) {
      AllCollisionData[CollisionIndex].triangles[i][jsonTableName] = reCalculateTriangleInfo(CollisionIndex, i)[jsonTableName];
    }
    refreshTable_triangles(CollisionIndex, this);
    wasFileChanged = true;
    updateIndexDownloadFile(CollisionIndex);
    if (document.getElementById("ThreeJSRenderedCheckMark").checked)
      rerenderAllThreeJS();
  }
  toReturn.appendChild(button);
  return toReturn;
}

// used to add text, an input field, and fix button for a value in the file thats only one value. So circular bounds and surface types are 2 examples
// adds dropdown for Surface type if `walkSurfaceDropdown` is true
function addOnePoint(CollisionIndex, jsonTableName, triangleIndex, value, expectedValue, isAdvancedMode = true, isFloat = true, walkSurfaceDropdown = false) {
  const toReturn = document.createElement("div");
  if (isFloat) {
    toReturn.innerText = `${parseFloat(value).toFixed(3)}`;
  } else if (!walkSurfaceDropdown) {
    toReturn.innerText = `${parseInt(value)}`;
  } else {
    value = Math.abs(value);
    toReturn.innerText = value >= allSurfaceTypes.length ? `Unused/Custom index ${value}` : allSurfaceTypes[value];
  }
  const advancedClass = isAdvancedMode ? " AdvancedOnly" : "";
  
  const onChangeHandler = function (value) {
    let valueToSet = float64toFloat32(value);
    if (!isFloat)
      valueToSet = Math.min(255, Math.max(0, valueToSet));
    if (triangleIndex == -1) {
      AllCollisionData[CollisionIndex][jsonTableName] = valueToSet;
    } else {
      AllCollisionData[CollisionIndex]["triangles"][triangleIndex][jsonTableName] = valueToSet;
    }
    refreshTable_metadata(CollisionIndex, this);
    refreshTable_triangles(CollisionIndex, this);
    wasFileChanged = true;
    updateIndexDownloadFile(CollisionIndex);
    if (document.getElementById("ThreeJSRenderedCheckMark").checked)
      rerenderAllThreeJS();
  }

  // add elements

  if (walkSurfaceDropdown) {
    const span_select = DOM_generalAdd("div", "flexRow");
    const select = document.createElement("select");
    select.name = "SurfaceType_Select"
    select.className = advancedClass;
    for (let i = 0; i <= 255; i++) {
      const option = document.createElement("option");
      option.value = i;
      option.innerText = (i >= allSurfaceTypes.length) ? `Unused/Custom index ${i}` : allSurfaceTypes[i];
      select.appendChild(option);
    }
    select.value = parseInt(value);
    select.onchange = function() { this.blur(); onChangeHandler(this.value); }
    span_select.appendChild(select);
    toReturn.appendChild(span_select);
  }

  const span_input = DOM_generalAdd("div", "flexRow");
  const input = document.createElement("input");
  input.className = advancedClass;
  input.type = "number";
  if (isFloat) {
    input.name = "float";
    input.step = "any";
    input.value = parseFloat(value);
  } else {
    input.name = "integer";
    input.step = "1";
    input.value = parseInt(value);
  }
  input.onchange = function() { this.blur(); onChangeHandler(this.value); }
  span_input.appendChild(input);
  toReturn.appendChild(span_input);

  const isCorrect = checkIfEqual(value, expectedValue, 0.01);
  if (!isCorrect) {
    const span_button = DOM_generalAdd("div", "flexRow");
    const button = document.createElement("button");
    button.innerText = "Fix";
    button.onclick = function() { this.blur(); onChangeHandler(expectedValue); }
    span_button.appendChild(button);
    toReturn.appendChild(span_button);

    toReturn.style.backgroundColor = "var(--warning-background-color)";
  }

  return toReturn;
}

// used to add text, 3 input fields, and fix button for a vector in the file that expects a vector. So a vertex and normal are examples
function addXYZPoints(CollisionIndex, jsonTableName, triangleIndex, x, y, z, expectedX, expectedY, expectedZ, isAdvancedMode = true, isFloat = true) {
  const toReturn = document.createElement("div");
  if (isFloat)
    toReturn.innerText = `(${parseFloat(x).toFixed(1)}, ${parseFloat(y).toFixed(1)}, ${parseFloat(z).toFixed(1)})`;
  else
    toReturn.innerText = `(${parseInt(x)}, ${parseInt(y)}, ${parseInt(z)})`;

  const onChangeHandler = function(valueToSet, PositionType) {
    let initialVertex = null;
    if (jsonTableName == "v1" || jsonTableName == "v2" || jsonTableName == "v3") {
      const cur_json = AllCollisionData[CollisionIndex]["triangles"][triangleIndex][jsonTableName];
      initialVertex = `${floatTo32BitHex(cur_json.x)} ${floatTo32BitHex(cur_json.y)} ${floatTo32BitHex(cur_json.z)}`;
    }

    valueToSet = float64toFloat32(valueToSet);
    if (!isFloat)
      valueToSet = Math.max(0, Math.min(0xFFFF, valueToSet));
    if (triangleIndex == -1) {
      AllCollisionData[CollisionIndex][jsonTableName][PositionType] = valueToSet;
    } else {
      AllCollisionData[CollisionIndex]["triangles"][triangleIndex][jsonTableName][PositionType] = valueToSet;
      if (jsonTableName == "normal" || jsonTableName == "Edge1" || jsonTableName == "Edge2" || jsonTableName == "Edge3") {
        AllCollisionData[CollisionIndex]["triangles"][triangleIndex][jsonTableName][PositionType] = TwoByteIntToFloat(floatTo2ByteInt(valueToSet));
      }
    }

    if (initialVertex != null && document.getElementById("VertexCausesAutoFix").checked) {
      AllCollisionData[CollisionIndex]["triangles"][triangleIndex] = reCalculateTriangleInfo(CollisionIndex, triangleIndex);
    }

    if (initialVertex != null && document.getElementById("VertexChangesAll").checked) {
      for (let i = 0; i < AllCollisionData[CollisionIndex].triangles.length * 3; i++) {
        if (parseInt(i / 3) == triangleIndex) continue;

        const tri_cur = AllCollisionData[CollisionIndex].triangles[parseInt(i / 3)]["v"+(1+(i%3))];
        const newVertex = `${floatTo32BitHex(tri_cur.x)} ${floatTo32BitHex(tri_cur.y)} ${floatTo32BitHex(tri_cur.z)}`;
        if (newVertex == initialVertex) {
          tri_cur[PositionType] = valueToSet;
          if (document.getElementById("VertexCausesAutoFix").checked)
            AllCollisionData[CollisionIndex].triangles[parseInt(i / 3)] = reCalculateTriangleInfo(CollisionIndex, parseInt(i / 3));
        }
      }
    }

    refreshTable_metadata(CollisionIndex);
    refreshTable_triangles(CollisionIndex);
    wasFileChanged = true;
    updateIndexDownloadFile(CollisionIndex);
    if (document.getElementById("ThreeJSRenderedCheckMark").checked)
      rerenderAllThreeJS();
  }
  const advancedClass = isAdvancedMode ? " AdvancedOnly" : "";

  // add elements

  const span_x = DOM_generalAdd("div", "flexRow" + advancedClass);
  span_x.appendChild(DOM_generalAdd("p", "", "x:"));
  const input_x = document.createElement("input");
  input_x.name = "X position";
  input_x.type = "number";
  input_x.value = parseFloat(x);
  if (!isFloat) input_x.value = parseInt(x);
  input_x.step = "any";
  if (!isFloat) input_x.step = "1";
  input_x.onchange = function () { this.blur(); onChangeHandler(isFloat ? parseFloat(this.value) : parseInt(this.value), "x"); };
  span_x.appendChild(input_x);
  toReturn.appendChild(span_x);

  const span_y = DOM_generalAdd("div", "flexRow" + advancedClass);
  span_y.appendChild(DOM_generalAdd("p", "", "y:"));
  const input_y = document.createElement("input");
  input_y.name = "Y position";
  input_y.type = "number";
  input_y.value = parseFloat(y);
  if (!isFloat) input_y.value = parseInt(y);
  input_y.step = "any";
  if (!isFloat) input_y.step = "1";
  input_y.onchange = function () { this.blur(); onChangeHandler(isFloat ? parseFloat(this.value) : parseInt(this.value), "y"); };
  span_y.appendChild(input_y);
  toReturn.appendChild(span_y);

  const span_z = DOM_generalAdd("div", "flexRow" + advancedClass);
  span_z.appendChild(DOM_generalAdd("p", "", "z:"));
  const input_z = document.createElement("input");
  input_z.name = "Z position";
  input_z.type = "number";
  input_z.value = parseFloat(z);
  if (!isFloat) input_z.value = parseInt(z);
  input_z.step = "any";
  if (!isFloat) input_z.step = "1";
  input_z.onchange = function () { this.blur(); onChangeHandler(isFloat ? parseFloat(this.value) : parseInt(this.value), "z"); };
  span_z.appendChild(input_z);
  toReturn.appendChild(span_z);

  const isXCorrect = checkIfEqual(x, expectedX, 0.01);
  const isYCorrect = checkIfEqual(y, expectedY, 0.01);
  const isZCorrect = checkIfEqual(z, expectedZ, 0.01);
  if (!isXCorrect || !isYCorrect || !isZCorrect) {
    const span_button = DOM_generalAdd("div", "flexRow");
    const button = document.createElement("button");
    button.innerText = "Fix";
    button.onclick = function() {
      if (triangleIndex == -1) {
        AllCollisionData[CollisionIndex][jsonTableName].x = float64toFloat32(expectedX);
        AllCollisionData[CollisionIndex][jsonTableName].y = float64toFloat32(expectedY);
        AllCollisionData[CollisionIndex][jsonTableName].z = float64toFloat32(expectedZ);
        if (jsonTableName == "gridAmt") {
          AllCollisionData[CollisionIndex][jsonTableName].x = Math.max(1, Math.min(0xFFFF, AllCollisionData[CollisionIndex][jsonTableName].x));
          AllCollisionData[CollisionIndex][jsonTableName].y = Math.max(1, Math.min(0xFFFF, AllCollisionData[CollisionIndex][jsonTableName].y));
          AllCollisionData[CollisionIndex][jsonTableName].z = Math.max(1, Math.min(0xFFFF, AllCollisionData[CollisionIndex][jsonTableName].z));
        }
      } else {
        AllCollisionData[CollisionIndex]["triangles"][triangleIndex][jsonTableName].x = float64toFloat32(expectedX);
        AllCollisionData[CollisionIndex]["triangles"][triangleIndex][jsonTableName].y = float64toFloat32(expectedY);
        AllCollisionData[CollisionIndex]["triangles"][triangleIndex][jsonTableName].z = float64toFloat32(expectedZ);
        if (jsonTableName == "normal" || jsonTableName == "Edge1" || jsonTableName == "Edge2" || jsonTableName == "Edge3") {
          AllCollisionData[CollisionIndex]["triangles"][triangleIndex][jsonTableName].x = TwoByteIntToFloat(floatTo2ByteInt(expectedX));
          AllCollisionData[CollisionIndex]["triangles"][triangleIndex][jsonTableName].y = TwoByteIntToFloat(floatTo2ByteInt(expectedY));
          AllCollisionData[CollisionIndex]["triangles"][triangleIndex][jsonTableName].z = TwoByteIntToFloat(floatTo2ByteInt(expectedZ));
        }
      }
      refreshTable_metadata(CollisionIndex, this);
      refreshTable_triangles(CollisionIndex, this);
      wasFileChanged = true;
      updateIndexDownloadFile(CollisionIndex);
      if (document.getElementById("ThreeJSRenderedCheckMark").checked)
        rerenderAllThreeJS();
    }
    span_button.appendChild(button);
    toReturn.appendChild(span_button);

    toReturn.style.backgroundColor = "var(--warning-background-color)";
  }
  

  return toReturn;
}

// general purpose DOM creation
function DOM_pTag(text) {
  let toReturn = document.createElement("p");
  toReturn.innerText = text;
  return toReturn;
}
function DOM_generalAdd(tagName, className = "", text = "") {
  let toReturn = document.createElement(tagName);
  if (className !== "")  {
    toReturn.classList.add(...className.split(" "));
  }

  if (text !== "") {
    toReturn.innerText = text;
  }
  
  return toReturn;
}

/* ------------- Using and Updating File number. And making options in select tag ------------ */

function updateFileNum(newFileNum) {
  fileNum = newFileNum;
  document.getElementById("ButtonsAtBottomOfScreen").getElementsByTagName("button")[0].innerText = "Download (" + getFileName(".pac") + ")";
  document.getElementById("FileNameExport").value = newFileNum;
}
function getFileName(endStr = ".pac") {
  return "hit_pack_" + ((""+fileNum).padStart(2, "0")) + endStr;
}
function makeAllOptionTags() {
  const elem = document.getElementById("FileNameExport");
  const fragment = document.createDocumentFragment();

  for (let i = 0; i <= 78; i++) {
    const fileStr = "hit_pack_" + ((""+i).padStart(2, "0")) + ".pac";
    const desc = (JSON_filenames == null) ? "" : JSON_filenames[fileStr].Description;
    const padding = "\u00A0".repeat(Math.max(1, 20 - fileStr.length));

    const option = document.createElement("option");
    option.value = i;
    option.innerText = `${fileStr}${padding}(${desc == "" ? "unknown" : desc})`;
    fragment.appendChild(option);
  }

  elem.replaceChildren(fragment);
}

/* -------------- Handle loading js file (advanced mode only, input isn't checked to be valid) ----------- */

function AdvConLoad() {
  alert("The file is assumed to be correct on load. So no security or sanity checks are done.")
  document.getElementById("JSONLoadFile").click();
}
function LoadJSONFile(file) {
  if (file == undefined) { return; }

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      AllCollisionData = JSON.parse(e.target.result);
      refreshAllFiles();
      updateEntireDownloadFile();
      wasFileChanged = false;
    } catch (err) {
      alert(`Invalid JSON: ${err}`);
    }
  };
  reader.readAsText(file);
}

/* ------------- Handle loading file from stl file and from scratch ---------- */

function AddNewCollisionFromScratch() {
  AllCollisionData.push({
    "name": "Custom index " + AllCollisionData.length,
    "gridFloatSizes": { "x": 0.10000000149011612, "y": 0.10000000149011612, "z": 0.10000000149011612 },
    "gridFloatSizesReciprocal": { "x": 10, "y": 10, "z": 10 },
    "gridAmt": { "x": 1, "y": 1, "z": 1 },
    "LowestBounds": { "x": -0.05, "y": -0.05, "z": -0.05 },
    "HighestBounds": { "x": 0.05, "y": 0.05, "z": 0.05 },
    "MiddleBounds": { "x": 0, "y": 0, "z": 0 },
    "CircularBounds": 0,
    "triangles": [],
    "triangles_lowerShow": -1,
    "triangles_higherShow": -1,
    "threeJS": {
      "grid_shown": false,
      "grid_color": "#00ff00",
      "circularBounds_shown": false,
      "circularBounds_color": "#0000ff",
      "boundsPoints_shown": false,
      "boundsPoints_color": "#00FFFF",
      "triangles_shown": true,
      "triangles_color": "#C8C8C8",
      "triangles_colorBasedOnByte1": true,
      "triangles_colorBasedOnByte2": false,
      "triangles_colorBasedOnGrid": false,
      "triangles_colorRandom": false,
      "triangles_gridMask": "-1",
      "triangles_unknown1Mask": "-1",
      "triangles_unknown2Mask": "-1"
    }
  });
  refreshAllFiles();
  updateEntireDownloadFile();
  wasFileChanged = true;
}

function Blender_DropHandler(ev) {
  ev.preventDefault();
  Blender_FileChange(ev.dataTransfer.items[0].getAsFile());
}
function Blender_FileChange(file) {
  if (file == undefined) { return; }

  let filename = file.name.toLowerCase();
  if (filename.indexOf(".stl") == -1) {
    let response = confirm("The file name '" + filename + "' doesn't end with '.slt'. Are you sure you want to proceed?");
    if (!response) { return; }
  }

  Blender_parseFile(file);
}
function Blender_parseFile(file) {
  const reader = new FileReader();
  reader.onload = function(e) {
    // lazy ascii file check
    try {
      const bytes = new Uint8Array(e.target.result).slice(0, 50);
      const header = new TextDecoder("utf-8").decode(bytes);
      if (header.toLocaleLowerCase().trimStart().startsWith("solid") || header.toLocaleLowerCase().trimStart().startsWith("ascii")) {
        let response = confirm("The file you are loading appears to be the unsupported ASCII version. You should change it using another program like Blender. Are you sure you want to proceed?");
        if (!response) { return; }
      }
    } catch (err) {
      alert(`Error reading file '${file.name}. Error: ${err}`);
      return;
    }

    // setup contents to add to collision file
    const view = new DataView(e.target.result);
    let toReturn = {
      "name": file.name.toLowerCase(),
      "gridFloatSizes": { "x": 0, "y": 0, "z": 0 },
      "gridFloatSizesReciprocal": { "x": 0, "y": 0, "z": 0 },
      "gridAmt": { "x": 1, "y": 1, "z": 1 },
      "LowestBounds": { "x": 0, "y": 0, "z": 0 },
      "HighestBounds": { "x": 0, "y": 0, "z": 0 },
      "MiddleBounds": { "x": 0, "y": 0, "z": 0 },
      "CircularBounds": 0,
      "triangles": [],
      "triangles_lowerShow": -1,
      "triangles_higherShow": -1,
      "threeJS": {
        "grid_shown": false,
        "grid_color": "#00ff00",
        "circularBounds_shown": false,
        "circularBounds_color": "#0000ff",
        "boundsPoints_shown": false,
        "boundsPoints_color": "#00FFFF",
        "triangles_shown": true,
        "triangles_color": "#C8C8C8",
        "triangles_colorBasedOnByte1": true,
        "triangles_colorBasedOnByte2": false,
        "triangles_colorBasedOnGrid": false,
        "triangles_colorRandom": false,
        "triangles_gridMask": "-1",
        "triangles_unknown1Mask": "-1",
        "triangles_unknown2Mask": "-1"
      }
    };

    try {
      // setup
      const numberTriangles = view.getUint32(80, true);
      if (numberTriangles > 0x10000) {
        alert(`Failed to load file. The number of triangles (${numberTriangles}) exceeds ${0x10000}. Star Fox Assault doesn't support that.`)
        return;
      }

      // get all triangles
      let offset = 84;
      for (let i = 0; i < numberTriangles; i++) {
        toReturn.triangles.push({
          "normal": {
            "x": view.getFloat32(offset, true),
            "y": view.getFloat32(offset+4, true),
            "z": view.getFloat32(offset+8, true),
          },
          "Edge1": { "x": 0, "y": 0, "z": 0 },
          "Edge2": { "x": 0, "y": 0, "z": 0 },
          "Edge3": { "x": 0, "y": 0, "z": 0 },
          "unknownByte1": view.getUint8(offset+49, true),
          "unknownByte2": 0,
          "v1": {
            "x": view.getFloat32(offset+12, true),
            "y": view.getFloat32(offset+16, true),
            "z": view.getFloat32(offset+20, true),
          },
          "v2": {
            "x": view.getFloat32(offset+24, true),
            "y": view.getFloat32(offset+28, true),
            "z": view.getFloat32(offset+32, true),
          },
          "v3": {
            "x": view.getFloat32(offset+36, true),
            "y": view.getFloat32(offset+40, true),
            "z": view.getFloat32(offset+44, true),
          },
          "inGrid": []
        });
        offset += 50;
      }
      AllCollisionData.push(toReturn);
    } catch (err) {
      alert(`Error reading file '${file.name}. Error: ${err}`);
      return;
    }
    

    // calculate all metadata info
    let allExpectedMetaData = reCalculateMetaData(AllCollisionData.length - 1);
    allExpectedMetaData.gridAmt = { // every ~60 units is a new grid
      "x": Math.max(1, Math.min(255, Math.ceil(allExpectedMetaData.gridFloatSizes.x / 60.0))),
      "y": Math.max(1, Math.min(255, Math.ceil(allExpectedMetaData.gridFloatSizes.y / 60.0))),
      "z": Math.max(1, Math.min(255, Math.ceil(allExpectedMetaData.gridFloatSizes.z / 60.0)))
    };
    allExpectedMetaData.gridFloatSizes = {
      "x": allExpectedMetaData.gridFloatSizes.x / allExpectedMetaData.gridAmt.x,
      "y": allExpectedMetaData.gridFloatSizes.y / allExpectedMetaData.gridAmt.y,
      "z": allExpectedMetaData.gridFloatSizes.z / allExpectedMetaData.gridAmt.z
    };
    allExpectedMetaData.gridFloatSizesReciprocal = {
      "x": 1 / allExpectedMetaData.gridFloatSizes.x,
      "y": 1 / allExpectedMetaData.gridFloatSizes.y,
      "z": 1 / allExpectedMetaData.gridFloatSizes.z
    };
    for (const key in allExpectedMetaData) {
      toReturn[key] = allExpectedMetaData[key];
    }

    // recalculate triangle info
    for (let i = 0; i < toReturn.triangles.length; i++) {
      const copiedNormal = JSON.parse(JSON.stringify(toReturn.triangles[i].normal));
      toReturn.triangles[i] = reCalculateTriangleInfo(AllCollisionData.length - 1, i);
      toReturn.triangles[i].normal = vectorFloat64ToFloatFrom2ByteInt(copiedNormal); // ensure its value is game friendly
    }

    // display it on GUI
    refreshAllFiles();
    updateEntireDownloadFile();
  };
  reader.readAsArrayBuffer(file);
}

/* ------------- Handle Loading file from Star Fox Assault -------------- */

function Assault_DropHandler(ev) {
  ev.preventDefault();
  Assault_FileChange(ev.dataTransfer.items[0].getAsFile());
}
function Assault_FileChange(file) {
  if (file == undefined) { return; }

  let filename = file.name.toLowerCase();
  const valid = /hit_pack_[0-9]{2}.pac$/.test(filename);
  if (!valid) {
    let response = confirm("The file name '" + filename + "' seems incorrect. Are you sure you want to proceed?");
    if (!response) { return; }
  }
  let newFileNum = parseInt(filename.replace(/\D+/g, ''));
  if (isNaN(newFileNum) || newFileNum == undefined || newFileNum < 0 || newFileNum > 78) newFileNum = 0;
  updateFileNum(newFileNum);

  document.getElementById("AssaultLabelFile").innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" height="80px" viewBox="0 -960 960 960" width="80px" fill="var(--font-color)"><path d="M450-313v-371L330-564l-43-43 193-193 193 193-43 43-120-120v371h-60ZM220-160q-24 0-42-18t-18-42v-143h60v143h520v-143h60v143q0 24-18 42t-42 18H220Z"/></svg>'
  document.getElementById("AssaultLabelFile").appendChild(document.createTextNode(filename));
  // add description after filename so its purpose is easier to understand
  const actualFileNameInTable = "hit_pack_" + ((""+newFileNum).padStart(2, "0")) + ".pac";
  if (JSON_filenames != null && JSON_filenames[actualFileNameInTable] != undefined) {
    const relevant = JSON_filenames[actualFileNameInTable];
    
    let ext = "";
    if (GameVersion == 0) ext = "USA";
    if (GameVersion == 1) ext = "Japan";
    if (GameVersion == 2) ext = "PAL";
    if (relevant.IsSameAllVersions) ext = "";

    let textToAdd = relevant["Description"+ext];
    if (textToAdd == "" || textToAdd.indexOf("<") != -1) textToAdd = "Unknown / Undocumented File";
    document.getElementById("AssaultLabelFile").appendChild(document.createTextNode(" (" + textToAdd + ")"));
  }
  document.getElementById("Assault_file").value = "";
  Assault_parseFile(file);
}
function Assault_parseFile(file) {
  const reader = new FileReader();
  reader.onload = function(e) {
    let AllCollisionData_backup = AllCollisionData;
    AllCollisionData = [];
    try {
      const view = new DataView(e.target.result);
      let iterationNumber = 1;
      for (let currentFileOffset = 0; view.getUint32(currentFileOffset + 0x8) != 0; iterationNumber++, currentFileOffset += view.getUint32(currentFileOffset + 0x4)) {
        // Just making sure all files ignore certain bytes
        if (view.getUint32(currentFileOffset + 0xC) != iterationNumber - 1) {
          console.warn(`File number didn't match. Got: ${view.getUint32(currentFileOffset + 0xC)}, Expected: ${iterationNumber - 1}`);
        }
        if (view.getUint32(currentFileOffset + 0x10) != 0) {
          console.warn(`Offset 0x10 isn't 0, ${view.getUint32(currentFileOffset + 0x10)}`);
        }
        if (view.getUint32(currentFileOffset + 0x14) != 0) {
          console.warn(`Offset 0x14 isn't 0, ${view.getUint32(currentFileOffset + 0x14)}`);
        }
        if (view.getUint32(currentFileOffset + 0x18) != 0) {
          console.warn(`Offset 0x18 isn't 0, ${view.getUint32(currentFileOffset + 0x18)}`);
        }
        if (view.getUint32(currentFileOffset + 0x1C) != 0) {
          console.warn(`Offset 0x1C isn't 0, ${view.getUint32(currentFileOffset + 0x1C)}`);
        }
        if (view.getUint16(currentFileOffset + 0x42) != 0) {
          console.warn(`Offset 0x42 isn't 0, ${view.getUint16(currentFileOffset + 0x42)}`);
        }
        
        // make new index
        let toReturn = {
          "name": file.name + " " + (iterationNumber-1),
          "gridFloatSizes": {
            "x": view.getFloat32(currentFileOffset + 0x20),
            "y": view.getFloat32(currentFileOffset + 0x24),
            "z": view.getFloat32(currentFileOffset + 0x28)
          },
          "gridFloatSizesReciprocal": {
            "x": view.getFloat32(currentFileOffset + 0x2C),
            "y": view.getFloat32(currentFileOffset + 0x30),
            "z": view.getFloat32(currentFileOffset + 0x34)
          },
          "gridAmt": {
            "x": view.getUint16(currentFileOffset + 0x38),
            "y": view.getUint16(currentFileOffset + 0x3A),
            "z": view.getUint16(currentFileOffset + 0x3C)
          },
          "LowestBounds": {
            "x": view.getFloat32(currentFileOffset + 0x44),
            "y": view.getFloat32(currentFileOffset + 0x48),
            "z": view.getFloat32(currentFileOffset + 0x4C)
          },
          "HighestBounds": {
            "x": view.getFloat32(currentFileOffset + 0x50),
            "y": view.getFloat32(currentFileOffset + 0x54),
            "z": view.getFloat32(currentFileOffset + 0x58)
          },
          "MiddleBounds": {
            "x": view.getFloat32(currentFileOffset + 0x5C),
            "y": view.getFloat32(currentFileOffset + 0x60),
            "z": view.getFloat32(currentFileOffset + 0x64)
          },
          "CircularBounds": view.getFloat32(currentFileOffset + 0x68),
          "triangles": [],
          "triangles_lowerShow": -1,
          "triangles_higherShow": -1,
          "threeJS": {
            "grid_shown": false,
            "grid_color": "#00ff00",
            "circularBounds_shown": false,
            "circularBounds_color": "#0000ff",
            "boundsPoints_shown": false,
            "boundsPoints_color": "#00FFFF",
            "triangles_shown": true,
            "triangles_color": "#C8C8C8",
            "triangles_colorBasedOnByte1": true,
            "triangles_colorBasedOnByte2": false,
            "triangles_colorBasedOnGrid": false,
            "triangles_colorRandom": false,
            "triangles_gridMask": "-1",
            "triangles_unknown1Mask": "-1",
            "triangles_unknown2Mask": "-1"
          }
        };

        // get triangles and what grid they are in
        const numberTriangles = view.getUint16(currentFileOffset + 0x40);
        const numberGrids = toReturn.gridAmt.x * toReturn.gridAmt.y * toReturn.gridAmt.z;
        let trianglesInGrid = Array.from({ length: (numberTriangles-1) }, () => []);
        for (let i = 0; i < numberGrids; i++) {
          const allGridsPointers = view.getUint32(currentFileOffset + 0x74) + 0x20 + currentFileOffset;
          let startingOffset = view.getUint32(allGridsPointers + (4*i)) + 0x20 + currentFileOffset;
          let endingOffset = view.getUint32(allGridsPointers + (4*i) + 4) + 0x20 + currentFileOffset;
          while (startingOffset != endingOffset) {
            const triangleNumber = view.getUint16(startingOffset);
            if (triangleNumber >= trianglesInGrid.length) {
              throw Error(`A triangle ID of ${triangleNumber} was found in a grid. However the highest triangle ID recorded was ${trianglesInGrid.length-1}. It's possible the file was written with the wrong amount of triangles in the header (offset 0x${(currentFileOffset + 0x40).toString(16)} from start of file; 2 byte Integer)`);
            }
            trianglesInGrid[triangleNumber].push(i);
            startingOffset += 2;
          }
        }

        // get all other info for triangles and add it to "toReturn"
        const offsetToVertices = view.getUint32(currentFileOffset + 0x6C) + 0x20 + currentFileOffset;
        const offsetToPrecalculated = view.getUint32(currentFileOffset + 0x78) + 0x20 + currentFileOffset;
        let curOffsetToTriangles = view.getUint32(currentFileOffset + 0x70) + 0x20 + currentFileOffset;
        for (let i = 1; i < numberTriangles; i++) {
          const normalForce_index = view.getInt16(curOffsetToTriangles);
          const EdgeVector1_index = view.getInt16(curOffsetToTriangles + 0x2);
          const EdgeVector2_index = view.getInt16(curOffsetToTriangles + 0x4);
          const EdgeVector3_index = view.getInt16(curOffsetToTriangles + 0x6);
          const unknown_1 = view.getUint8(curOffsetToTriangles + 0x8);
          const unknown_2 = view.getUint8(curOffsetToTriangles + 0x9);
          const v1_index = view.getUint16(curOffsetToTriangles + 0xA);
          const v2_index = view.getUint16(curOffsetToTriangles + 0xC);
          const v3_index = view.getUint16(curOffsetToTriangles + 0xE);

          const preCalculatedIndexToFloat = function(index, additionalOffset) {
            let isNegative = (index < 0);
            index = Math.abs(index) -1;
            let twoByteInt = view.getInt16(offsetToPrecalculated+(6*index)+additionalOffset)
            return TwoByteIntToFloat(twoByteInt) * (isNegative ? -1 : 1);
          }

          toReturn.triangles.push({
            "normal": {
              "x": preCalculatedIndexToFloat(normalForce_index, 0x0),
              "y": preCalculatedIndexToFloat(normalForce_index, 0x2),
              "z": preCalculatedIndexToFloat(normalForce_index, 0x4)
            },
            "Edge1": {
              "x": preCalculatedIndexToFloat(EdgeVector1_index, 0x0),
              "y": preCalculatedIndexToFloat(EdgeVector1_index, 0x2),
              "z": preCalculatedIndexToFloat(EdgeVector1_index, 0x4)
            },
            "Edge2": {
              "x": preCalculatedIndexToFloat(EdgeVector2_index, 0x0),
              "y": preCalculatedIndexToFloat(EdgeVector2_index, 0x2),
              "z": preCalculatedIndexToFloat(EdgeVector2_index, 0x4)
            },
            "Edge3": {
              "x": preCalculatedIndexToFloat(EdgeVector3_index, 0x0),
              "y": preCalculatedIndexToFloat(EdgeVector3_index, 0x2),
              "z": preCalculatedIndexToFloat(EdgeVector3_index, 0x4)
            },
            "unknownByte1": unknown_1,
            "unknownByte2": unknown_2,
            "v1": {
              "x": view.getFloat32(offsetToVertices + (12*v1_index)),
              "y": view.getFloat32(offsetToVertices + (12*v1_index) + 0x4),
              "z": view.getFloat32(offsetToVertices + (12*v1_index) + 0x8)
            },
            "v2": {
              "x": view.getFloat32(offsetToVertices + (12*v2_index)),
              "y": view.getFloat32(offsetToVertices + (12*v2_index) + 0x4),
              "z": view.getFloat32(offsetToVertices + (12*v2_index) + 0x8)
            },
            "v3": {
              "x": view.getFloat32(offsetToVertices + (12*v3_index)),
              "y": view.getFloat32(offsetToVertices + (12*v3_index) + 0x4),
              "z": view.getFloat32(offsetToVertices + (12*v3_index) + 0x8)
            },
            "inGrid": trianglesInGrid[i-1]
          });

          curOffsetToTriangles += 16;
        }

        AllCollisionData.push(toReturn);
      }
      wasFileChanged = false;
      document.getElementById("GridHelperSee").checked = false;
      if (document.getElementById("ThreeJSRenderedCheckMark").checked)
        gridHelper.visible = false;
    } catch (err) {
      alert(`Error reading file '${file.name}': ${err}`);
      AllCollisionData = AllCollisionData_backup;
    }
    collapseAll();
    refreshAllFiles();
    updateEntireDownloadFile();
  };
  reader.readAsArrayBuffer(file);
}

/* --------------- Export STL File ------------------------ */

function generateSTLBinary(CollisionIndex) {
  // get triangles for index (or all triangles) and setup return buffer
  const triangles = CollisionIndex === -1
    ? AllCollisionData.flatMap(c => c.triangles)
    : AllCollisionData[CollisionIndex].triangles;
  const buffer = new ArrayBuffer(84 + triangles.length * 50);

  // text header
  const encoder = new TextEncoder();
  const header = encoder.encode("Star Fox Assault Collision .STL Binary file | ModSault");
  new Uint8Array(buffer).set(header, 0); // write at byte 0

  // triangle count
  const view = new DataView(buffer);
  view.setUint32(80, triangles.length, true);

  // add all triangles
  let offset = 84;
  for (const tri of triangles) {
    // normal
    view.setFloat32(offset, tri.normal.x, true);
    view.setFloat32(offset+4, tri.normal.y, true);
    view.setFloat32(offset+8, tri.normal.z, true);
    // v1
    view.setFloat32(offset+12, tri.v1.x, true);
    view.setFloat32(offset+16, tri.v1.y, true);
    view.setFloat32(offset+20, tri.v1.z, true);
    // v2
    view.setFloat32(offset+24, tri.v2.x, true);
    view.setFloat32(offset+28, tri.v2.y, true);
    view.setFloat32(offset+32, tri.v2.z, true);
    // v3
    view.setFloat32(offset+36, tri.v3.x, true);
    view.setFloat32(offset+40, tri.v3.y, true);
    view.setFloat32(offset+44, tri.v3.z, true);
    // attribute byte count (unused)
    view.setUint8(offset+48, 0, true);
    view.setUint8(offset+49, tri.unknownByte1, true);
    offset += 50;
  }
  return buffer;
}

// buffer should be output from `generateSTLBinary`
function downloadSTLBinary(buffer, filename) {
  const blob = new Blob([buffer], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ------------- Buttons on the top of the editor handler ---------- */

function removeAll() {
  const response = confirm(`Delete Everything? This cannot be undone!`);
  if (!response) { return; }
  AllCollisionData = [];
  refreshAllFiles();
  updateEntireDownloadFile();
  wasFileChanged = false;
  
  document.getElementById("GridHelperSee").checked = true;
  if (document.getElementById("ThreeJSRenderedCheckMark").checked)
    gridHelper.visible = true;
}
function collapseAll() {
  const allDetails = document.getElementById("Editor_Contents").getElementsByTagName("details");
  for (let i = 0; i < Math.min(allDetails.length, AllCollisionData.length); i++) {
    allDetails[i].open = false;
    refreshTable_threejs(i, null, true);
    refreshTable_metadata(i, null, true);
    refreshTable_triangles(i, null, true);
  }
}
function expandAll() { // this button no longer exists but I'll leave the function
  const allDetails = document.getElementById("Editor_Contents").getElementsByTagName("details");
  for (let i = 0; i < Math.min(allDetails.length, AllCollisionData.length); i++) {
    allDetails[i].open = true;
    refreshTable_threejs(i);
    refreshTable_metadata(i);
    refreshTable_triangles(i);
  }
}
function fixAll() {
  let response = confirm("You are about to fix all metadata and triangle information. You cannot undo this. Are you sure you want to proceed?");
  if (!response) { return; }

  for (let i = 0; i < AllCollisionData.length; i++) {
    // add triangle if none exists
    if (AllCollisionData[i].triangles.length === 0) {
      AllCollisionData[i].gridAmt = { "x": 1, "y": 1, "z": 1 }
      AllCollisionData[i].triangles.push({
        "normal": { "x": -0.9486832980505138, "y": 0.0, "z": 0.31622776601683794 },
        "Edge1": { "x": 0.2672612419124244, "y": 0.5345224838248488, "z": 0.8017837257372732 },
        "Edge2": { "x": -0.31622776601683794, "y": 0.0, "z": -0.9486832980505138 },
        "Edge3": { "x": 0.0, "y": -1.0, "z": 0.0 },
        "unknownByte1": 15,
        "unknownByte2": 8,
        "v1": { "x": -1.0, "y": -47.0, "z": -3.0 },
        "v2": { "x": 1.0, "y": -45.0, "z": 3.0 },
        "v3": { "x": -1.0, "y": -45.0, "z": -3.0 },
        "inGrid": [0]
      });
    }

    // fix metadata
    const expected_metaData = reCalculateMetaData(i);
    for (const key in expected_metaData) {
      AllCollisionData[i][key] = expected_metaData[key];
    }

    // fix all triangle information
    const allTriangles = AllCollisionData[i].triangles;
    for (let j = 0; j < allTriangles.length; j++) {
      if (shouldTriangleDelete(allTriangles[j].v1, allTriangles[j].v2, allTriangles[j].v3)) {
        allTriangles.splice(j, 1);
        j--;
        continue;
      }
      allTriangles[j] = reCalculateTriangleInfo(i, j);
    }
  }
  refreshAllFiles();
  updateEntireDownloadFile();
  wasFileChanged = true;
  if (document.getElementById("ThreeJSRenderedCheckMark").checked)
    rerenderAllThreeJS();
}

/* ---------------- Display all info on editor --------------- */

// on any render change, reshow all render information needed for the current file.
function refreshTable_threejs(index, elemCalledFrom = null, deleteAll = false) {
  // change eye shown in quick options
  const span_quickOptions = document.getElementById("Editor_Contents").getElementsByClassName("FileQuickOptions")[index];
  const eyeCrossedOut = span_quickOptions.getElementsByTagName("svg")[2];
  const eyeSeen = span_quickOptions.getElementsByTagName("svg")[3];
  const anythingRendered = AllCollisionData[index].threeJS.triangles_shown | AllCollisionData[index].threeJS.grid_shown | AllCollisionData[index].threeJS.circularBounds_shown | AllCollisionData[index].threeJS.boundsPoints_shown;
  eyeCrossedOut.style.display = anythingRendered ? "none" : "";
  eyeSeen.style.display = anythingRendered ? "" : "none";

  // delete all from table and read add elements
  if (elemCalledFrom != null) elemCalledFrom.blur();
  const threeJS_table = document.getElementById("Editor_Contents").getElementsByTagName("details")[index].getElementsByClassName("threejsTable")[0];
  const fragment = document.createDocumentFragment();
  const cur = AllCollisionData[index];
  const i = index;
  if (deleteAll) {
    threeJS_table.replaceChildren();
    return;
  }

  const threeJS_topRow = ["Type", "Render", "Render Options"];
  for (let j = 0; j < threeJS_topRow.length; j++) {
    fragment.appendChild(DOM_generalAdd("p", "", threeJS_topRow[j]));
  }
  const threeJS_leftColumn = ["Triangles", "Grid", "Active Collision Range", "Bound Points"];
  const threeJS_JSONnames = ["triangles", "grid", "circularBounds", "boundsPoints"];
  for (let j = 0; j < threeJS_leftColumn.length; j++) {
    fragment.appendChild(DOM_generalAdd("p", "", threeJS_leftColumn[j]));

    // check box to render or not
    const checkBoxContainer = DOM_generalAdd("div");
    const checkBox = document.createElement("input");
    checkBox.name = "render_checkbox";
    checkBox.type = "checkbox";
    checkBox.onchange = function () {
      this.blur();
      cur.threeJS[threeJS_JSONnames[j]+"_shown"] = this.checked;
      refreshTable_threejs(index, this);
      if (document.getElementById("ThreeJSRenderedCheckMark").checked)
        rerenderAllThreeJS();
    }
    checkBox.checked = cur.threeJS[threeJS_JSONnames[j]+"_shown"];
    checkBoxContainer.appendChild(checkBox);
    fragment.appendChild(checkBoxContainer);

    // additional render options (color and mask for triangles). Only show if rendering
    const renderOptions = DOM_generalAdd("div", "renderOptionsBox");
    if (!cur.threeJS[threeJS_JSONnames[j]+"_shown"]) {
      fragment.appendChild(renderOptions);
      continue;
    }

    // color picker
    const span_color = DOM_generalAdd("div");
    span_color.appendChild(DOM_generalAdd("p", "", "Color:"));
    const input_color = document.createElement("input");
    input_color.name = "Color_picker";
    input_color.type = "color";
    input_color.value = cur.threeJS[threeJS_JSONnames[j]+"_color"];
    input_color.onchange = function () {
      this.blur();
      cur.threeJS[threeJS_JSONnames[j]+"_colorBasedOnByte1"] = false;
      cur.threeJS[threeJS_JSONnames[j]+"_colorBasedOnByte2"] = false;
      cur.threeJS[threeJS_JSONnames[j]+"_colorBasedOnGrid"] = false;
      cur.threeJS[threeJS_JSONnames[j]+"_colorRandom"] = false;
      cur.threeJS[threeJS_JSONnames[j]+"_color"] = this.value;
      refreshTable_threejs(index, this);
      if (document.getElementById("ThreeJSRenderedCheckMark").checked)
        rerenderAllThreeJS();
    }
    span_color.appendChild(input_color);
    renderOptions.appendChild(span_color);

    if (threeJS_JSONnames[j] == "triangles") {
      const colorTypeChangeHandler = function(unknown1Bool, unknown2Bool, gridBool, randomBool) {
        this.blur();
        cur.threeJS[threeJS_JSONnames[j]+"_colorBasedOnByte1"] = unknown1Bool;
        cur.threeJS[threeJS_JSONnames[j]+"_colorBasedOnByte2"] = unknown2Bool;
        cur.threeJS[threeJS_JSONnames[j]+"_colorBasedOnGrid"] = gridBool;
        cur.threeJS[threeJS_JSONnames[j]+"_colorRandom"] = randomBool;
        refreshTable_threejs(index, this);
        if (document.getElementById("ThreeJSRenderedCheckMark").checked)
          rerenderAllThreeJS();
      }
      const valueMaskChangeHandler = function(newValue, jsonName, min, max) {
        this.blur();
        if (newValue.indexOf("-1") != -1)
          newValue = "-1";
        else if (newValue !== "")
          newValue = maskInputWithCommaDelimiter(newValue, min, max);
        if (newValue === "") newValue = "-1";
        cur.threeJS[threeJS_JSONnames[j]+jsonName] = newValue;
        refreshTable_threejs(index, this);
        if (document.getElementById("ThreeJSRenderedCheckMark").checked)
          rerenderAllThreeJS();
      }

      // color based on unknown byte 1
      const span_colorBasedOn1 = DOM_generalAdd("div", "");
      const colorBasedOn1 = document.createElement("input");
      colorBasedOn1.name = "ColorBy_UnknownByte1";
      colorBasedOn1.type = "checkbox";
      colorBasedOn1.checked = cur.threeJS[threeJS_JSONnames[j]+"_colorBasedOnByte1"];
      colorBasedOn1.onchange = function() { colorTypeChangeHandler(this.checked, false, false, false); }
      span_colorBasedOn1.appendChild(colorBasedOn1);
      span_colorBasedOn1.appendChild(DOM_generalAdd("p", "", "Automatically color based on Surface Type"));
      renderOptions.appendChild(span_colorBasedOn1);

      // color based on unknown byte 2
      const span_colorBasedOn2 = DOM_generalAdd("div", "");
      const colorBasedOn2 = document.createElement("input");
      colorBasedOn2.name = "ColorBy_UnknownByte2";
      colorBasedOn2.type = "checkbox";
      colorBasedOn2.checked = cur.threeJS[threeJS_JSONnames[j]+"_colorBasedOnByte2"];
      colorBasedOn2.onchange = function() { colorTypeChangeHandler(false, this.checked, false, false); }
      span_colorBasedOn2.appendChild(colorBasedOn2);
      span_colorBasedOn2.appendChild(DOM_generalAdd("p", "", "Automatically color based on Collision Range"));
      renderOptions.appendChild(span_colorBasedOn2);

      // color based on grid
      const span_colorBasedOnGrid = DOM_generalAdd("div", "AdvancedOnly");
      const colorBasedOnGrid = document.createElement("input");
      colorBasedOnGrid.name = "ColorBy_Grid";
      colorBasedOnGrid.type = "checkbox";
      colorBasedOnGrid.checked = cur.threeJS[threeJS_JSONnames[j]+"_colorBasedOnGrid"];
      colorBasedOnGrid.onchange = function() { colorTypeChangeHandler(false, false, this.checked, false); }
      span_colorBasedOnGrid.appendChild(colorBasedOnGrid);
      span_colorBasedOnGrid.appendChild(DOM_generalAdd("p", "", "Automatically color based on Grid its in"));
      renderOptions.appendChild(span_colorBasedOnGrid);

      // color randomly
      const span_colorRandom = DOM_generalAdd("div", "");
      const colorRandomInput = document.createElement("input");
      colorRandomInput.name = "ColorBy_Random";
      colorRandomInput.type = "checkbox";
      colorRandomInput.checked = cur.threeJS[threeJS_JSONnames[j]+"_colorRandom"];
      colorRandomInput.onchange = function() { colorTypeChangeHandler(false, false, false, this.checked); }
      span_colorRandom.appendChild(colorRandomInput);
      span_colorRandom.appendChild(DOM_generalAdd("p", "", "Each triangle is a random color"));
      renderOptions.appendChild(span_colorRandom);

      // Mask based on unknown byte 1
      const span_unknown1 = DOM_generalAdd("div", "AdvancedOnly");
      span_unknown1.appendChild(DOM_generalAdd("p", "", "Surface Type Value Mask (comma delimiter, -1 for all):"));
      const input_unknown1 = document.createElement("input");
      input_unknown1.name = "MaskBy_UnknownByte1";
      input_unknown1.value = cur.threeJS[threeJS_JSONnames[j]+"_unknown1Mask"];
      input_unknown1.onchange = function () { valueMaskChangeHandler(this.value, "_unknown1Mask", 0, 255); }
      span_unknown1.appendChild(input_unknown1);
      renderOptions.appendChild(span_unknown1);

      // Mask based on unknown byte 2
      const span_unknown2 = DOM_generalAdd("div", "AdvancedOnly");
      span_unknown2.appendChild(DOM_generalAdd("p", "", "Collision Range Value Mask (comma delimiter, -1 for all):"));
      const input_unknown2 = document.createElement("input");
      input_unknown2.name = "MaskBy_UnknownByte1";
      input_unknown2.value = cur.threeJS[threeJS_JSONnames[j]+"_unknown2Mask"];
      input_unknown2.onchange = function () { valueMaskChangeHandler(this.value, "_unknown2Mask", 0, 255); }
      span_unknown2.appendChild(input_unknown2);
      renderOptions.appendChild(span_unknown2);

      // Mask based on unknown grid number
      const span_grid = DOM_generalAdd("div", "AdvancedOnly");
      span_grid.appendChild(DOM_generalAdd("p", "", "Grid Number Mask (comma delimiter, -1 for all):"));
      const input_grid = document.createElement("input");
      input_grid.name = "MaskBy_Grid";
      input_grid.value = cur.threeJS[threeJS_JSONnames[j]+"_gridMask"];
      input_grid.onchange = function () {
        const maxNumGrids = AllCollisionData[i].gridAmt.x * AllCollisionData[i].gridAmt.y * AllCollisionData[i].gridAmt.z;
        valueMaskChangeHandler(this.value, "_gridMask", 0, maxNumGrids-1);
      }
      span_grid.appendChild(input_grid);
      renderOptions.appendChild(span_grid);
    }
    fragment.appendChild(renderOptions);
  }
  threeJS_table.replaceChildren(fragment);
}

// on any triangle change, reshow all triangle information needed for the current file.
function refreshTable_triangles(index, elemCalledFrom = null, deleteAll = false) {
  // update number of triangles in the parenthesis in name
  const nameElem = document.getElementById("Editor_Contents").getElementsByTagName("details")[index].getElementsByTagName("summary")[0];
  const newName = nameElem.innerText.substring(0, nameElem.innerText.indexOf("(")) + "(" + (AllCollisionData[index].triangles.length) + ")"
  nameElem.innerText = newName;

  // update triangle index display
  const inputsBox = document.getElementById("Editor_Contents").getElementsByTagName("details")[index].getElementsByClassName("triangleIndexInput")[0].getElementsByTagName("input");
  inputsBox[0].value = AllCollisionData[index].triangles_lowerShow;
  inputsBox[1].value = AllCollisionData[index].triangles_higherShow;

  // delete table and recreate it
  if (elemCalledFrom != null) elemCalledFrom.blur();
  const fixAllButtonsContainer = document.getElementById("Editor_Contents").getElementsByTagName("details")[index].getElementsByClassName("fixAllContainer")[0];
  const triangle_table = document.getElementById("Editor_Contents").getElementsByTagName("details")[index].getElementsByClassName("triangleTable")[0];
  const fragmentTri = document.createDocumentFragment();
  const i = index;
  if (deleteAll) {
    triangle_table.replaceChildren();
    fixAllButtonsContainer.replaceChildren();
    return;
  }

  const triangle_topRow = ["id", "Normal", "v2-v1", "v3-v2", "v1-v3", "Surface Type", "Collision Range", "vertex 1 (v1)", "vertex 2 (v2)", "vertex 3 (v3)", "In Grid", ""];
  for (let j = 0; j < triangle_topRow.length; j++) {
    fragmentTri.appendChild(DOM_generalAdd("p", "", triangle_topRow[j]));
  }
  const numNeedRecalculate = { // used to see if we need recalculate all buttons
    "normal": [],
    "Edge1": [],
    "Edge2": [],
    "Edge3": [],
    "unknownByte1": [],
    "unknownByte2": [],
    "v1": [],
    "v2": [],
    "v3": [],
    "inGrid": [],
    "delete": [] // check for triangles that are straight lines and offer to delete them
  }
  let anyNeedRecalculate = false;
  for (let j = 0; j < AllCollisionData[i].triangles.length; j++) {
    const tri_cur = AllCollisionData[i].triangles[j];
    const expected = reCalculateTriangleInfo(i, j);

    // check recalculate status for all triangles
    for (const key in numNeedRecalculate) {
      if (key == "unknownByte1" || key == "unknownByte2") {
        if (!checkIfEqual(tri_cur[key], expected[key], 0.01)) {
          numNeedRecalculate[key].push(j);
          anyNeedRecalculate = true;
        }
        continue;
      }
      if (key == "inGrid") {
        if (!(tri_cur[key].sort((a, b) => a - b).join(",") == expected[key].sort((a, b) => a - b).join(","))) {
          numNeedRecalculate[key].push(j);
          anyNeedRecalculate = true;
        }
        continue;
      }
      if (key == "delete") {
        if (shouldTriangleDelete(tri_cur.v1, tri_cur.v2, tri_cur.v3)) {
          numNeedRecalculate[key].push(j);
          anyNeedRecalculate = true;
        }
        continue;
      }
      if (!checkIfEqual(tri_cur[key].x, expected[key].x, 0.01) || !checkIfEqual(tri_cur[key].y, expected[key].y, 0.01) || !checkIfEqual(tri_cur[key].z, expected[key].z, 0.01)) {
        numNeedRecalculate[key].push(j);
        anyNeedRecalculate = true;
      }
    }
    
    // render triangle only if in range of inputs
    if (j >= AllCollisionData[i].triangles_lowerShow && j <= AllCollisionData[i].triangles_higherShow) {
      fragmentTri.appendChild(DOM_generalAdd("p", "", ""+j));
      fragmentTri.appendChild(addXYZPoints(i, "normal", j, tri_cur.normal.x, tri_cur.normal.y, tri_cur.normal.z, expected.normal.x, expected.normal.y, expected.normal.z, true, true));
      fragmentTri.appendChild(addXYZPoints(i, "Edge1", j, tri_cur.Edge1.x, tri_cur.Edge1.y, tri_cur.Edge1.z, expected.Edge1.x, expected.Edge1.y, expected.Edge1.z, true, true));
      fragmentTri.appendChild(addXYZPoints(i, "Edge2", j, tri_cur.Edge2.x, tri_cur.Edge2.y, tri_cur.Edge2.z, expected.Edge2.x, expected.Edge2.y, expected.Edge2.z, true, true));
      fragmentTri.appendChild(addXYZPoints(i, "Edge3", j, tri_cur.Edge3.x, tri_cur.Edge3.y, tri_cur.Edge3.z, expected.Edge3.x, expected.Edge3.y, expected.Edge3.z, true, true));
      fragmentTri.appendChild(addOnePoint(i, "unknownByte1", j, tri_cur.unknownByte1, expected.unknownByte1, true, false, true));
      fragmentTri.appendChild(addOnePoint(i, "unknownByte2", j, tri_cur.unknownByte2, expected.unknownByte2, true, false));
      fragmentTri.appendChild(addXYZPoints(i, "v1", j, tri_cur.v1.x, tri_cur.v1.y, tri_cur.v1.z, expected.v1.x, expected.v1.y, expected.v1.z, true, true));
      fragmentTri.appendChild(addXYZPoints(i, "v2", j, tri_cur.v2.x, tri_cur.v2.y, tri_cur.v2.z, expected.v2.x, expected.v2.y, expected.v2.z, true, true));
      fragmentTri.appendChild(addXYZPoints(i, "v3", j, tri_cur.v3.x, tri_cur.v3.y, tri_cur.v3.z, expected.v3.x, expected.v3.y, expected.v3.z, true, true));
      
      // grid numbers
      const gridNumSortedAsString = tri_cur.inGrid.sort((a, b) => a - b).join(",");
      const grid_span = document.createElement("span");
      grid_span.innerText = gridNumSortedAsString;
      const input_span = DOM_generalAdd("span", "flexRow AdvancedOnly");
      const input_grid = document.createElement("input");
      input_grid.name = "grid_numbers";
      input_grid.value = gridNumSortedAsString;
      input_grid.onchange = function () {
        this.blur()
        const maxNumGrids = AllCollisionData[i].gridAmt.x * AllCollisionData[i].gridAmt.y * AllCollisionData[i].gridAmt.z;
        if (this.value !== "")
          this.value = maskInputWithCommaDelimiter(this.value, 0, maxNumGrids-1);
        if (this.value === "")
          this.value == "";
        tri_cur.inGrid = this.value == "" ? [] : [...new Set(this.value.split(",").map(Number))];
        refreshTable_triangles(i, this);
        wasFileChanged = true;
        updateIndexDownloadFile(index);
        if (document.getElementById("ThreeJSRenderedCheckMark").checked)
          rerenderAllThreeJS();
      }
      input_span.appendChild(input_grid);
      grid_span.appendChild(input_span);
      fragmentTri.appendChild(grid_span);
      if (gridNumSortedAsString !== expected.inGrid.sort((a, b) => a - b).join(",")) {
        const span_button = DOM_generalAdd("span", "flexRow");
        const button = document.createElement("button");
        button.innerText = "Fix";
        button.onclick = function() {
          this.blur()
          AllCollisionData[i].triangles[j].inGrid = expected.inGrid;
          refreshTable_triangles(i, this);
          wasFileChanged = true;
          updateIndexDownloadFile(index);
          if (document.getElementById("ThreeJSRenderedCheckMark").checked)
            rerenderAllThreeJS();
        }
        span_button.appendChild(button);
        grid_span.appendChild(span_button);
        grid_span.style.backgroundColor = "var(--warning-background-color)";
      }
      
      // red x
      const redX_span = DOM_generalAdd("span");
      const redX = DOM_generalAdd("span", "red-x removeTriangleReddX");
      redX.onclick = function () {
        this.blur()
        AllCollisionData[i].triangles.splice(j, 1);
        AllCollisionData[i].triangles_lowerShow = Math.min(AllCollisionData[i].triangles_lowerShow, AllCollisionData[i].triangles.length - 1);
        AllCollisionData[i].triangles_higherShow = Math.min(AllCollisionData[i].triangles_higherShow, AllCollisionData[i].triangles.length - 1);
        refreshTable_metadata(i, this);
        refreshTable_triangles(i, this);
        wasFileChanged = true;
        updateIndexDownloadFile(index);
        if (document.getElementById("ThreeJSRenderedCheckMark").checked)
          rerenderAllThreeJS();
      }
      const goToButton = DOM_generalAdd("button", "ThreeJSOnly", "go to");
      goToButton.onclick = function () {
        const v1 = AllCollisionData[i].triangles[j].v1;
        const v2 = AllCollisionData[i].triangles[j].v2;
        const v3 = AllCollisionData[i].triangles[j].v3;
        const normal = AllCollisionData[i].triangles[j].normal;

        const center = new THREE.Vector3(
            (v1.x + v2.x + v3.x) / 3,
            (v1.y + v2.y + v3.y) / 3,
            (v1.z + v2.z + v3.z) / 3
        );

        // Calculate triangle size via longest edge
        const edge1 = new THREE.Vector3().subVectors(v2, v1).length();
        const edge2 = new THREE.Vector3().subVectors(v3, v2).length();
        const edge3 = new THREE.Vector3().subVectors(v1, v3).length();
        const triSize = Math.max(edge1, edge2, edge3);

        // Position camera along normal, scaled by triangle size
        const normalDir = new THREE.Vector3(normal.x, normal.y, normal.z).normalize();
        camera.position.copy(center).addScaledVector(normalDir, triSize);
        camera.lookAt(center);
        createHighlightFromGoTo(i, j);
      }
      redX_span.appendChild(redX);
      redX_span.appendChild(goToButton);

      const template = document.createElement('template');
      template.innerHTML = arrowDownwardSVG + arrowDownwardSVG;
      redX_span.appendChild(template.content);

      const arrowUpButton = redX_span.getElementsByTagName("svg")[0];
      const arrowDownButton = redX_span.getElementsByTagName("svg")[1];
      arrowUpButton.style.transform = 'rotate(180deg)  translateY(5px) ';
      if (j == 0) {
        arrowUpButton.style.display = "none";
      }
      if (j == AllCollisionData[i].triangles.length - 1) {
        arrowDownButton.style.display = "none";
      }
      arrowUpButton.onclick = function() {
        this.blur();
        [AllCollisionData[i].triangles[j], AllCollisionData[i].triangles[j-1]] = [AllCollisionData[i].triangles[j-1], AllCollisionData[i].triangles[j]];
        wasFileChanged = true;
        refreshTable_triangles(i, this);
        updateIndexDownloadFile(i);
        if (document.getElementById("ThreeJSRenderedCheckMark").checked)
          rerenderAllThreeJS();
      }
      arrowDownButton.onclick = function() {
        this.blur();
        [AllCollisionData[i].triangles[j], AllCollisionData[i].triangles[j+1]] = [AllCollisionData[i].triangles[j+1], AllCollisionData[i].triangles[j]];
        wasFileChanged = true;
        refreshTable_triangles(i, this);
        updateIndexDownloadFile(i);
        if (document.getElementById("ThreeJSRenderedCheckMark").checked)
          rerenderAllThreeJS();
      }

      if (shouldTriangleDelete(tri_cur.v1, tri_cur.v2, tri_cur.v3)) {
        redX_span.style.backgroundColor = "var(--warning-background-color)";
      }

      fragmentTri.appendChild(redX_span);
    }
  }
  triangle_table.replaceChildren(fragmentTri);

  // remove all old 'recalculateAll` buttons and add them back
  const fragmentButtons = document.createDocumentFragment();
  if (anyNeedRecalculate) {
    const keyToString = {
      "normal": "Normal",
      "Edge1": "v2-v1",
      "Edge2": "v3-v2",
      "Edge3": "v1-v3",
      "unknownByte1": "Surface Type",
      "unknownByte2": "Collision Range",
      "inGrid": "Grid Location",
      "delete": ""
    }

    // add last row (recalculate all buttons)
    fragmentButtons.appendChild(addRecalculateAll(i, "normal", numNeedRecalculate, "Normal"));
    fragmentButtons.appendChild(addRecalculateAll(i, "Edge1", numNeedRecalculate, "v2-v1"));
    fragmentButtons.appendChild(addRecalculateAll(i, "Edge2", numNeedRecalculate, "v3-v2"));
    fragmentButtons.appendChild(addRecalculateAll(i, "Edge3", numNeedRecalculate, "v1-v3"));
    fragmentButtons.appendChild(addRecalculateAll(i, "unknownByte1", numNeedRecalculate, "Surface Type"));
    fragmentButtons.appendChild(addRecalculateAll(i, "unknownByte2", numNeedRecalculate, "Collision Range"));
    fragmentButtons.appendChild(addRecalculateAll(i, "inGrid", numNeedRecalculate, "Grid Location"));

    // add button to delete what you should delete
    if (numNeedRecalculate.delete.length !== 0) {
      const deleteSpan = DOM_generalAdd("span");
      const button = document.createElement("button");
      button.innerText = `Delete Bad Triangles (${numNeedRecalculate.delete.length})`;
      button.onclick = function() {
        for (let i = 0; i < AllCollisionData[index].triangles.length; i++) {
          const cur_tri = AllCollisionData[index].triangles[i];
          if (shouldTriangleDelete(cur_tri.v1, cur_tri.v2, cur_tri.v3)) {
            AllCollisionData[index].triangles.splice(i, 1);
            i--;
          }
        }
        wasFileChanged = true;
        refreshTable_triangles(index, this);
        updateIndexDownloadFile(index);
        if (document.getElementById("ThreeJSRenderedCheckMark").checked)
          rerenderAllThreeJS();
      }
      deleteSpan.appendChild(button);
      fragmentButtons.appendChild(deleteSpan);
    }

    // add advanced mode only text to show what triangles are the problem
    for (const key in numNeedRecalculate) {
      if (numNeedRecalculate[key].length !== 0) {
        if (key != "delete")
          fragmentButtons.appendChild(DOM_generalAdd("p", "AdvancedOnly", `Triangle IDs with wrong '${keyToString[key]}': ${numNeedRecalculate[key].slice(0, 20).join(', ') + (numNeedRecalculate[key].length > 20 ? ", ..." : "")}`))
        else
          fragmentButtons.appendChild(DOM_generalAdd("p", "AdvancedOnly", `Triangle IDs that should be deleted: ${numNeedRecalculate[key].slice(0, 20).join(', ') + (numNeedRecalculate[key].length > 20 ? ", ..." : "")}`))
      }
    }
  }
  fixAllButtonsContainer.replaceChildren(fragmentButtons);
}

// on any triangle/metadata change, reshow all metadata information needed for the current file.
function refreshTable_metadata(index, elemCalledFrom = null, deleteAll = false) {
  // setup
  if (elemCalledFrom != null) elemCalledFrom.blur();
  const metaData_table = document.getElementById("Editor_Contents").getElementsByTagName("details")[index].getElementsByClassName("metadataTable")[0];
  const fragment = document.createDocumentFragment();
  const cur = AllCollisionData[index];
  const i = index;
  if (deleteAll) {
    metaData_table.replaceChildren();
    return;
  }

  // remake table top row
  const metaData_topRow = ["Type", "Value"];
  for (let j = 0; j < metaData_topRow.length; j++) {
    fragment.appendChild(DOM_generalAdd("p", "", metaData_topRow[j]));
  }
  const metaData_leftColumn = ["Number of Grids", "Grid Size", "Grid Size (Reciprocal)", "Bounding Box - Lowest", "Bounding Box - Middle", "Bounding Box - Highest", "Collision Range"];
  const metaData_JSONnames = ["gridAmt", "gridFloatSizes", "gridFloatSizesReciprocal", "LowestBounds", "MiddleBounds", "HighestBounds", "CircularBounds"];
  const metaData_advancedMode = [true, true, true, true, true, true, true];
  const allExpectedValues = reCalculateMetaData(i);
  for (let j = 0; j < metaData_leftColumn.length; j++) {
    // Add relevant information to table (change expected value to be based on actual vales too so that when clicking "fix" it won't become something that makes no sense from current values)
    
    const metaData_cur = cur[metaData_JSONnames[j]];
    fragment.appendChild(DOM_generalAdd("p", "", metaData_leftColumn[j]));
    if (metaData_JSONnames[j] == "CircularBounds") {
      expected = 0;
      for (let i = 0; i < cur.triangles.length * 3; i++) {
        const vertex = cur.triangles[parseInt(i / 3)]["v"+(1 + (i % 3))];
        expected = Math.max(expected, VectorLength(VectorSubtract(vertex, cur["MiddleBounds"])));
      }
      expected = float64toFloat32(expected);
      fragment.appendChild(addOnePoint(index, metaData_JSONnames[j], -1, parseFloat(metaData_cur), expected, metaData_advancedMode[j], true));
    } else {
      let expected = allExpectedValues[metaData_JSONnames[j]];
      if (metaData_JSONnames[j] == "gridFloatSizesReciprocal") {
        expected = {"x": 1 / cur["gridFloatSizes"].x, "y": 1 / cur["gridFloatSizes"].y, "z": 1 / cur["gridFloatSizes"].z};
        if (!Number.isFinite(expected.x)) expected.x = 1;
        if (!Number.isFinite(expected.y)) expected.y = 1;
        if (!Number.isFinite(expected.z)) expected.z = 1;
        expected = vectorFloat64ToFloat32(expected);
      }
      if (metaData_JSONnames[j] == "MiddleBounds") {
        expected = {
          "x": ((cur["HighestBounds"].x - cur["LowestBounds"].x) / 2) + cur["LowestBounds"].x,
          "y": ((cur["HighestBounds"].y - cur["LowestBounds"].y) / 2) + cur["LowestBounds"].y,
          "z": ((cur["HighestBounds"].z - cur["LowestBounds"].z) / 2) + cur["LowestBounds"].z
        };
        expected = vectorFloat64ToFloat32(expected);
      }
      if (metaData_JSONnames[j] == "gridFloatSizes") {
        expected = {
          "x": Math.max(0.1, (cur["HighestBounds"].x - cur["LowestBounds"].x) / cur["gridAmt"].x),
          "y": Math.max(0.1, (cur["HighestBounds"].y - cur["LowestBounds"].y) / cur["gridAmt"].y),
          "z": Math.max(0.1, (cur["HighestBounds"].z - cur["LowestBounds"].z) / cur["gridAmt"].z)
        };
        expected = vectorFloat64ToFloat32(expected);
      }
      fragment.appendChild(addXYZPoints(i, metaData_JSONnames[j], -1, metaData_cur.x, metaData_cur.y, metaData_cur.z, expected.x, expected.y, expected.z, metaData_advancedMode[j], j != 0));
    }
  }

  metaData_table.replaceChildren(fragment);
}

// delete all dropdowns for all files and add them back. Only called when adding/removing/rearranging files.
function refreshAllFiles(elemCalledFrom = null, indexErased = -1) {
  if (elemCalledFrom != null) elemCalledFrom.blur();

  // since everything is removed and added again, we need to remember which spawn types were opened
  const allDetails = document.getElementById("Editor_Contents").getElementsByTagName("details");
  let OpenedDetails = new Array(Math.max(allDetails.length, AllCollisionData.length)).fill(false);
  for (let i = 0; i < Math.min(allDetails.length, AllCollisionData.length); i++) {
    OpenedDetails[i] = allDetails[i].open;
  }
  if (indexErased != -1) {
    OpenedDetails.splice(indexErased, 1);
  }
  // save scroll info too
  const verticalScroll = document.querySelector('#EditorAnd3DBox .box').scrollTop;
  const horizontalScroll = document.querySelector('#EditorAnd3DBox .box').scrollLeft;

  // remove all previous elements
  const parent = document.getElementById("Editor_Contents");
  parent.replaceChildren();

  for (let i = 0; i < AllCollisionData.length; i++) {
    // setup
    const cur = AllCollisionData[i];
    const divWithAll = DOM_generalAdd("div");
    const detailsContainer = DOM_generalAdd("details");
    const summaryElement = DOM_generalAdd("summary", "", "[File id " + (i) + "] " + cur.name + " (" + cur.triangles.length + ")");
    summaryElement.addEventListener('click', () => {
      if (!detailsContainer.open) {
        refreshTable_threejs(i);
        refreshTable_metadata(i);
        refreshTable_triangles(i);
      } else {
        refreshTable_threejs(i, null, true);
        refreshTable_metadata(i, null, true);
        refreshTable_triangles(i, null, true);
      }
    });
    detailsContainer.appendChild(summaryElement);

    // Three JS table
    const threeJS_h4 = DOM_generalAdd("h4", "ThreeJSOnly", "Three 3D Display Options");
    const threeJS_table = DOM_generalAdd("div", "ThreeJSOnly threejsTable");
    detailsContainer.appendChild(threeJS_h4);
    detailsContainer.appendChild(threeJS_table);

    // Metadata Table
    const metaData_h4 = DOM_generalAdd("h4", "", "File Header Data");
    const metaData_table = DOM_generalAdd("div", "metadataTable");
    detailsContainer.appendChild(metaData_h4);
    detailsContainer.appendChild(metaData_table);

    // Triangles Table
    const triangle_h4 = DOM_generalAdd("h4", "", "Triangles");
    const span_triangleDisplayRange = DOM_generalAdd("span", "flexRow triangleIndexInput", "Show Triangle IDs: ");
    const span_triangleLowerBound = document.createElement("input");
    span_triangleLowerBound.step = "1";
    span_triangleLowerBound.name = "Lower Bound";
    span_triangleLowerBound.type = "number";
    span_triangleLowerBound.value = AllCollisionData[i].triangles_lowerShow;
    span_triangleLowerBound.onchange = function () {
      let realValue = Math.min(Math.max(-1, parseInt(this.value)), AllCollisionData[i].triangles.length-1);
      AllCollisionData[i].triangles_lowerShow = realValue;
      AllCollisionData[i].triangles_higherShow = Math.max(realValue, Math.min(realValue+25, AllCollisionData[i].triangles_higherShow));
      refreshTable_triangles(i);
      if (document.getElementById("ThreeJSRenderedCheckMark").checked)
        rerenderAllThreeJS();
    }
    span_triangleDisplayRange.appendChild(span_triangleLowerBound);
    span_triangleDisplayRange.appendChild(document.createTextNode(" - "));
    const span_triangleHigherBound = document.createElement("input");
    span_triangleHigherBound.step = "1";
    span_triangleHigherBound.name = "Higher Bound";
    span_triangleHigherBound.type = "number";
    span_triangleHigherBound.value = AllCollisionData[i].triangles_higherShow;
    span_triangleHigherBound.onchange = function () {
      let realValue = Math.min(Math.max(-1, parseInt(this.value)), AllCollisionData[i].triangles.length-1);
      AllCollisionData[i].triangles_higherShow = realValue;
      AllCollisionData[i].triangles_lowerShow = Math.min(realValue, Math.max(realValue-25, AllCollisionData[i].triangles_lowerShow));
      refreshTable_triangles(i);
      if (document.getElementById("ThreeJSRenderedCheckMark").checked)
        rerenderAllThreeJS();
    }
    span_triangleDisplayRange.appendChild(span_triangleHigherBound);
    const fixAllButtonsContainer = DOM_generalAdd("div", "fixAllContainer");
    const triangle_table = DOM_generalAdd("div", "triangleTable");
    const addNewTriangleButton = DOM_generalAdd("button", "addNewTriangle AdvancedOnly", "Add Triangle");
    addNewTriangleButton.onclick = function() {
      AllCollisionData[i].triangles.push({
        "normal": { "x": -0.9486832980505138, "y": 0.0, "z": 0.31622776601683794 },
        "Edge1": { "x": 0.2672612419124244, "y": 0.5345224838248488, "z": 0.8017837257372732 },
        "Edge2": { "x": -0.31622776601683794, "y": 0.0, "z": -0.9486832980505138 },
        "Edge3": { "x": 0.0, "y": -1.0, "z": 0.0 },
        "unknownByte1": 15,
        "unknownByte2": 8,
        "v1": { "x": -1.0, "y": -2.0, "z": -3.0 },
        "v2": { "x": 1.0, "y": 2.0, "z": 3.0 },
        "v3": { "x": -1.0, "y": 2.0, "z": -3.0 },
        "inGrid": [0]
      });
      span_triangleHigherBound.value = (parseInt(span_triangleHigherBound.value) == AllCollisionData[i].triangles.length - 2) ? (parseInt(span_triangleHigherBound.value) + 1) : (span_triangleHigherBound.value);
      span_triangleHigherBound.onchange();
      refreshTable_metadata(i);
      refreshTable_triangles(i);
      wasFileChanged = true;
      updateIndexDownloadFile(i);
      if (document.getElementById("ThreeJSRenderedCheckMark").checked)
        rerenderAllThreeJS();
    }
    const removeAllTrianglesButton = DOM_generalAdd("button", "removeAllTriangles AdvancedOnly", "Remove All Triangles");
    removeAllTrianglesButton.onclick = function() {
      let response = confirm(`Are you sure you want to delete all triangles? This cannot be undone.`);
      if (!response) { return; }
      AllCollisionData[i].triangles = [];
      span_triangleHigherBound.value = -1;
      span_triangleHigherBound.onchange();
      refreshTable_metadata(i);
      refreshTable_triangles(i);
      wasFileChanged = true;
      updateIndexDownloadFile(i);
      if (document.getElementById("ThreeJSRenderedCheckMark").checked)
        rerenderAllThreeJS();
    }
    detailsContainer.appendChild(triangle_h4);
    detailsContainer.appendChild(fixAllButtonsContainer);
    detailsContainer.appendChild(span_triangleDisplayRange);
    detailsContainer.appendChild(triangle_table);
    detailsContainer.appendChild(addNewTriangleButton);
    detailsContainer.appendChild(removeAllTrianglesButton);


    // add all other options (delete file, download, and visibility)
    const span_quickOptions = DOM_generalAdd("span", "FileQuickOptions");
    span_quickOptions.innerHTML += arrowDownwardSVG + arrowDownwardSVG + eyeInvisibleSVG + eyeVisibleSVG + downloadSVG;
    const redX = DOM_generalAdd("span", "red-x removeFileReddX");
    redX.onclick = function() {
      let response = confirm(`Delete: "${cur.name}" with ${cur.triangles.length} triangles? This cannot be undone!`);
      if (!response) { return; }
      AllCollisionData.splice(i, 1);
      fileDownloadContents.splice(i, 1);
      fileDownloadSegmentColor.splice(i, 1);
      allWarnings.splice(i, 1);
      allDescriptions.splice(i, 1);
      refreshAllFiles(this, i);
      updateIndexDownloadFile(AllCollisionData.length); // fastest to recalculate
      wasFileChanged = true;
      if (document.getElementById("ThreeJSRenderedCheckMark").checked)
        rerenderAllThreeJS();
    }
    span_quickOptions.appendChild(redX);
    const eyeCrossedOut = span_quickOptions.getElementsByTagName("svg")[2];
    const eyeSeen = span_quickOptions.getElementsByTagName("svg")[3];
    const arrowUpButton = span_quickOptions.getElementsByTagName("svg")[0];
    const arrowDownButton = span_quickOptions.getElementsByTagName("svg")[1];
    const downloadButton = span_quickOptions.getElementsByTagName("svg")[4];
    eyeCrossedOut.onclick = function (e) {
      if (e.shiftKey) {
        for (let k = 0; k < AllCollisionData.length; k++) {
          AllCollisionData[k].threeJS.triangles_shown = true;
          refreshTable_threejs(k, null, !document.getElementById("Editor_Contents").getElementsByTagName("details")[k].open);
        }
      } else {
        AllCollisionData[i].threeJS.triangles_shown = true;
        refreshTable_threejs(i, null, !document.getElementById("Editor_Contents").getElementsByTagName("details")[i].open);
      }

      if (document.getElementById("ThreeJSRenderedCheckMark").checked)
        rerenderAllThreeJS();
    }
    eyeSeen.onclick = function (e) {
      if (e.shiftKey) {
        for (let k = 0; k < AllCollisionData.length; k++) {
          AllCollisionData[k].threeJS.grid_shown = false;
          AllCollisionData[k].threeJS.circularBounds_shown = false;
          AllCollisionData[k].threeJS.boundsPoints_shown = false;
          AllCollisionData[k].threeJS.triangles_shown = false;
          refreshTable_threejs(k, null, !document.getElementById("Editor_Contents").getElementsByTagName("details")[k].open);
        }
      } else {
        AllCollisionData[i].threeJS.grid_shown = false;
        AllCollisionData[i].threeJS.circularBounds_shown = false;
        AllCollisionData[i].threeJS.boundsPoints_shown = false;
        AllCollisionData[i].threeJS.triangles_shown = false;
        refreshTable_threejs(i, null, !document.getElementById("Editor_Contents").getElementsByTagName("details")[i].open);
      }
      
      if (document.getElementById("ThreeJSRenderedCheckMark").checked)
        rerenderAllThreeJS();
    }
    eyeSeen.setAttribute("class", "ThreeJSOnly");
    eyeCrossedOut.setAttribute("class", "ThreeJSOnly");
    downloadButton.onclick = function (e) {
      alert(copyrightAlertMessage);
      if (e.shiftKey) {
        downloadAllIndividual();
      } else {
        downloadSTLBinary(generateSTLBinary(i), AllCollisionData[i].name + ".stl");
      }
    }
    arrowUpButton.style.transform = 'rotate(180deg)  translateY(5px) ';
    if (i == 0) {
      arrowUpButton.style.display = "none";
    }
    arrowUpButton.onclick = function () {
      [AllCollisionData[i], AllCollisionData[i-1]] = [AllCollisionData[i-1], AllCollisionData[i]];
      wasFileChanged = true;
      refreshAllFiles();
      updateIndexDownloadFile(i);
      updateIndexDownloadFile(i-1);
      if (document.getElementById("ThreeJSRenderedCheckMark").checked)
        rerenderAllThreeJS();
    }
    if (i == AllCollisionData.length - 1) {
      arrowDownButton.style.display = "none";
    }
    arrowDownButton.onclick = function () {
      [AllCollisionData[i], AllCollisionData[i+1]] = [AllCollisionData[i+1], AllCollisionData[i]];
      wasFileChanged = true;
      refreshAllFiles();
      updateIndexDownloadFile(i);
      updateIndexDownloadFile(i+1);
      if (document.getElementById("ThreeJSRenderedCheckMark").checked)
        rerenderAllThreeJS();
    }

    // add all elements
    divWithAll.appendChild(detailsContainer);
    divWithAll.appendChild(span_quickOptions);
    parent.appendChild(divWithAll);
  }

  // Reopen details the user already opened
  const newDetails = document.getElementById("Editor_Contents").getElementsByTagName("details");
  for (let i = 0; i < newDetails.length; i++) {
    newDetails[i].open = OpenedDetails[i];
    if (OpenedDetails[i]) {
      // show elements in table
      refreshTable_threejs(i);
      refreshTable_metadata(i);
      refreshTable_triangles(i);
    } else {
      refreshTable_threejs(i, null, true); // render correct eye icon
    }
  }
  // restore previous scroll
  document.querySelector('#EditorAnd3DBox .box').scrollTop = verticalScroll;
  document.querySelector('#EditorAnd3DBox .box').scrollLeft = horizontalScroll;

  // hide download buttons if there is nothing to download
  const downloadButton = document.getElementById("Editor_AddObjFile").getElementsByTagName("span")[0].getElementsByTagName("button");
  downloadButton[2].style.display = AllCollisionData.length ? "" : "none";
  downloadButton[3].style.display = AllCollisionData.length ? "" : "none";

  // update threejs if shown
  if (document.getElementById("ThreeJSRenderedCheckMark").checked)
    rerenderAllThreeJS();
}

/* --------------- Only run when gamemode is updated or on load ------------ */

// this is for grid with all filenames and what they are
function updateFilenameGrid() {
  if (JSON_filenames == null) return;

  // remove all elements in grid
  const grid = document.getElementById("FileNameGrid");
  grid.replaceChildren();

  // get all filenames needed and sort alphabetically
  const allNames = Object.keys(JSON_filenames);
  const filteredNames = allNames.filter(key => /^hit_pack_\d\d\.pac$/.test(key) );
  const sortedNames = filteredNames.sort((a, b) => { return a.toLowerCase().localeCompare(b.toLowerCase()) });

  // Make top row of grid
  const topRowElements = ["Name", "Description"];
  for (let i = 0; i < topRowElements.length; i++) {
    grid.appendChild(DOM_pTag(topRowElements[i]));
  }

  // make All other rows
  for (let i = 0; i < sortedNames.length; i++) {
    const relevant = JSON_filenames[sortedNames[i]];

    // check if in this version
    let ext = "USA";
    if (GameVersion == 1) ext = "Japan";
    if (GameVersion == 2) ext = "PAL";
    if (!relevant["Isfile_"+ext]) continue;

    // add to grid if in this game version
    grid.appendChild(DOM_pTag(sortedNames[i]));
    if (relevant["IsSameAllVersions"]) {
      grid.appendChild(DOM_pTag(relevant["Description"]));
    } else {
      if (GameVersion == 0) grid.appendChild(DOM_pTag(relevant["Description_USA"]));
      if (GameVersion == 1) grid.appendChild(DOM_pTag(relevant["Description_Japan"]));
      if (GameVersion == 2) grid.appendChild(DOM_pTag(relevant["Description_PAL"]));
    }
  }
}

// called on game version update
function gameVersionUpdater() {
  updateFilenameGrid();
  UpdateFilePreview(-1, -1);
}

/* --------------- Updating File Download and Preview ------------ */

// this was made to make a function more optimal. Don't think it helped much but this is used
// to show descriptions when viewing offsets of the file
const descriptionBank = [
  {
    // index 0
    "type": "ASCII String",
    "desc": "'NPAC' 4 character string. Can be used for identification"
  },
  {
    // index 1
    "type": "4 Byte Integer",
    "desc": "Offset (from start of NPAC string) to get to next NPAC file"
  },
  {
    // index 2
    "type": "4 Byte Integer",
    "desc": "Size of this file"
  },
  {
    // index 3
    "type": "4 Byte Integer",
    "desc": "File number"
  },
  {
    // index 4
    "type": "Padding",
    "desc": "{} bytes"
  },
  {
    // index 5
    "type": "4 Byte Float",
    "desc": "Size of Grid in {} direction"
  },
  {
    // index 6
    "type": "4 Byte Float",
    "desc": "Size of Grid's Reciprocal in {} direction"
  },
  {
    // index 7
    "type": "2 Byte Integer",
    "desc": "Number of grids in {} direction"
  },
  {
    // index 8
    "type": "2 Byte Integer",
    "desc": "Number of {} (+1 for some reason)"
  },
  {
    // index 9
    "type": "4 Byte Float",
    "desc": "Bounding Box Lowest Location in {} direction"
  },
  {
    // index 10
    "type": "4 Byte Float",
    "desc": "Bounding Box Highest Location in {} direction"
  },
  {
    // index 11
    "type": "4 Byte Float",
    "desc": "Bounding Box Middle Location in {} direction"
  },
  {
    // index 12
    "type": "4 Byte Float",
    "desc": "Collision Range, Radius of Sphere"
  },
  {
    // index 13
    "type": "4 Byte Integer",
    "desc": "Offset to start of {} *"
  },
  {
    // index 14
    "type": "4 Byte Float",
    "desc": "Vertex ID {} - X position"
  },
  {
    // index 15
    "type": "4 Byte Float",
    "desc": "Vertex ID {} - Y position"
  },
  {
    // index 16
    "type": "4 Byte Float",
    "desc": "Vertex ID {} - Z position"
  },
  {
    // index 17
    "type": "2 Byte Signed Integer",
    "desc": "Triangle ID {} - Normal; Index = |value| + 1. If negative multiply all precalculated floats by -1"
  },
  {
    // index 18
    "type": "2 Byte Signed Integer",
    "desc": "Triangle ID {} - Edge 1; Same description as above"
  },
  {
    // index 19
    "type": "2 Byte Signed Integer",
    "desc": "Triangle ID {} - Edge 2; Same description as above"
  },
  {
    // index 20
    "type": "2 Byte Signed Integer",
    "desc": "Triangle ID {} - Edge 3; Same description as above"
  },
  {
    // index 21
    "type": "1 Byte Integer",
    "desc": "Triangle ID {} - Surface Type"
  },
  {
    // index 22
    "type": "1 Byte Integer",
    "desc": "Triangle ID {} - Collision Range (1:1 mapping to float as unsigned int)"
  },
  {
    // index 23
    "type": "2 Byte Integer",
    "desc": "Triangle ID {} - Vertex 1 ID"
  },
  {
    // index 24
    "type": "2 Byte Integer",
    "desc": "Triangle ID {} - Vertex 2 ID"
  },
  {
    // index 25
    "type": "2 Byte Integer",
    "desc": "Triangle ID {} - Vertex 3 ID"
  },
  {
    // index 26
    "type": "2 Byte Integer",
    "desc": "Precalculated ID {} - Turned to float for X value"
  },
  {
    // index 27
    "type": "2 Byte Integer",
    "desc": "Precalculated ID {} - Turned to float for Y value"
  },
  {
    // index 28
    "type": "2 Byte Integer",
    "desc": "Precalculated ID {} - Turned to float for Z value"
  },
  {
    // index 29
    "type": "2 Byte Integer",
    "desc": "Grid Number {} - Triangle ID inside of grid"
  },
  {
    // index 30
    "type": "4 Byte Integer",
    "desc": "Offset to start of all triangles in Grid {} *"
  },
  {
    // index 31
    "type": "4 Byte Integer",
    "desc": "Offset to start of all triangles in Grid {} and end of triangles in previous Grid *"
  },
  {
    // index 32
    "type": "4 Byte Integer",
    "desc": "Offset to end of triangles in Grid {} *"
  }
];

// called when user types in new value range for offsets to view
function updateOffsetBound(isHigherBound) {
  const allowedDifference = 0x1000; // max range between max and min. Values too high cause too much lag
  const lowerBoundElem = document.getElementById('OffsetLowerBound');
  const higherBoundElem = document.getElementById('OffsetHigherBound');
  lowerBoundElem.value = lowerBoundElem.value.replace(/[^0-9a-fA-F]/g, "").toUpperCase();
  higherBoundElem.value = higherBoundElem.value.replace(/[^0-9a-fA-F]/g, "").toUpperCase();
  const totalFileSize = fileDownloadSegmentColor.reduce((sum, item) => sum + item.length, 0);

  if (!isHigherBound) {
    const lowerValue = Math.min(totalFileSize-1, parseInt(lowerBoundElem.value, 16));
    lowerBoundElem.value = lowerValue.toString(16).toUpperCase();
    const higherValue = Math.max(lowerValue, Math.min(lowerValue+allowedDifference, parseInt(higherBoundElem.value, 16)));
    higherBoundElem.value = higherValue.toString(16).toUpperCase();
  } else {
    const higherValue = Math.min(totalFileSize-1, parseInt(higherBoundElem.value, 16));
    higherBoundElem.value = higherValue.toString(16).toUpperCase();
    const lowerValue = Math.min(higherValue, Math.max(higherValue-allowedDifference, parseInt(lowerBoundElem.value, 16)));
    lowerBoundElem.value = lowerValue.toString(16).toUpperCase();
  }

  UpdateFilePreview(parseInt(lowerBoundElem.value, 16), parseInt(higherBoundElem.value, 16));
}

// recalculate every file. So raw binary of file and everything else
function updateEntireDownloadFile() {
  UpdateFilePreview(-1, -1);
  fileDownloadContents = [];
  fileDownloadSegmentColor = [];
  allWarnings = [];
  allDescriptions = [];
  for (let i = 0; i < AllCollisionData.length + 1; i++) {
    const result = getIndexDownloadFile(i);
    fileDownloadContents.push(result.contents);
    fileDownloadSegmentColor.push(result.color);
    allWarnings.push(result.warnings);
    allDescriptions.push(result.allDescriptions);
  }
  updatePreviewFileNumberOffsets();
  updateWarningsAndErrorsInFile();
}
// only update 1 file. So raw binary of file and everything else for only 1 file
function updateIndexDownloadFile(index) {
  UpdateFilePreview(-1, -1);
  const result = getIndexDownloadFile(index);
  fileDownloadContents[index] = result.contents;
  fileDownloadSegmentColor[index] = result.color;
  allWarnings[index] = result.warnings;
  allDescriptions[index] = result.allDescriptions;
  updatePreviewFileNumberOffsets();
  updateWarningsAndErrorsInFile();
}
// shows user the offsets where all files start and end
function updatePreviewFileNumberOffsets() {
  updateOffsetBound(true); // ensure user input isn't too large if file shrunk

  const elem = document.getElementById("OffsetAmtsForFiles");
  const fragment = document.createDocumentFragment();

  let curOffset = 0;
  for (let i = 0; i < fileDownloadContents.length; i++) {
    let name = "End of File";
    if (i < fileDownloadContents.length - 1)
      name = AllCollisionData[i].name;

    const fileNumText = (name == "End of File") ? "" : `[File id ${i}] `;
    const text = `'${fileNumText}${name}': 0x${(curOffset).toString(16).toUpperCase()} - 0x${(curOffset + fileDownloadContents[i].byteLength - 1).toString(16).toUpperCase()}`;
    fragment.appendChild(document.createTextNode(text));

    if (i !== fileDownloadContents.length - 1)
      fragment.appendChild(document.createElement("br"));

    curOffset += fileDownloadContents[i].byteLength;
  }

  elem.replaceChildren(fragment);
}
// shows users all warnings and errors. So all orange and red text above the download button
function updateWarningsAndErrorsInFile() {
  const warningElem = document.getElementById("WarningsText");
  const errorElem = document.getElementById("ErrorText");
  const fragment_Warning = document.createDocumentFragment();
  const fragment_Error = document.createDocumentFragment();

  fragment_Warning.appendChild(document.createTextNode("Be careful if replacing a file with something larger than it's original size, it may cause problems"));
  fragment_Warning.appendChild(document.createElement("br"));
  for (let i = 0; i < allWarnings.length; i++) {
    for (let j = 0; j < allWarnings[i].length; j++) {
      if (allWarnings[i][j].type == "error") {
        fragment_Error.appendChild(document.createTextNode(`Error in '[File id ${i}] ${AllCollisionData[i].name}': ${allWarnings[i][j].message}`));
        fragment_Error.appendChild(document.createElement("br"));
      }
      if (allWarnings[i][j].type == "warning") {
        fragment_Warning.appendChild(document.createTextNode(`Warning in '[File id ${i}] ${AllCollisionData[i].name}': ${allWarnings[i][j].message}`));
        fragment_Warning.appendChild(document.createElement("br"));
      }
    }
  }

  warningElem.replaceChildren(fragment_Warning);
  errorElem.replaceChildren(fragment_Error);
}

// quite slow. I tried, trust me.
// Setup info for downloading file. So raw hex, errors/warnings, colors for preview, and offset descriptions
function getIndexDownloadFile(index) {
  let warnings = [];
  let descriptions = {};
  descriptions[0] = { "desc_id": 0, "data": null };
  descriptions[4] = { "desc_id": 1, "data": null };
  descriptions[8] = { "desc_id": 2, "data": null };
  descriptions[12] = { "desc_id": 3, "data": null };
  descriptions[16] = { "desc_id": 4, "data": "16" };

  // if last file check
  if (index >= AllCollisionData.length) {
    let contents = new ArrayBuffer(0x20);
    (new Uint8Array(contents)).fill(0);
    const view = new DataView(contents);

    let color = new Uint8Array(0x20);
    color.fill(0);
    
    view.setUint32(0x0, 0x4E504143); // write NPAC string
    view.setUint32(0xC, index); // write file index
    return {
      "contents": contents,
      "color": color,
      "warnings": warnings,
      "allDescriptions": descriptions
    };
  }
  const curFileData = AllCollisionData[index];
  const curTries = AllCollisionData[index].triangles;

  // Setup section. Get all unique precalculated values and vertices and triangles in certain grids
  const numberGrids = curFileData.gridAmt.x * curFileData.gridAmt.y * curFileData.gridAmt.z;
  const xyzToStringFloat32 = function(json, mul=1) {
    return `${floatTo32BitHex(mul*json.x).toString(16)} ${floatTo32BitHex(mul*json.y).toString(16)} ${floatTo32BitHex(mul*json.z).toString(16)}`;
  };
  const xyzToString2ByteInt = function(json, mul=1) {
    return `${floatTo2ByteInt(mul*json.x).toString(16)} ${floatTo2ByteInt(mul*json.y).toString(16)} ${floatTo2ByteInt(mul*json.z).toString(16)}`;
  };
  let verticesMap = new Map();
  let normalMap = new Map();
  let TrianglesInGrid = Array.from({length: numberGrids}, () => []);
  let trianglesOutsideBoundingBox = [];
  let trianglesOutsideCircularBounds = [];
  let trianglesInNoGrids = [];
  let trianglesShouldDelete = [];
  for (let i = 0; i < curTries.length; i++) {
    const { normal, Edge1, Edge2, Edge3, v1, v2, v3, inGrid } = curTries[i];
    if (shouldTriangleDelete(v1, v2, v3)) trianglesShouldDelete.push(i);

    // precalculated values
    for (const vec of [normal, Edge1, Edge2, Edge3]) {
      const key = xyzToString2ByteInt(vec, 1);
      if (!normalMap.has(key) && !normalMap.has(xyzToString2ByteInt(vec, -1))) {
        normalMap.set(key, normalMap.size);
      }
    }

    // grid
    const inGridLen = inGrid.length;
    for (let j = 0; j < inGridLen; j++) {
      const curGrid = inGrid[j];
      if (curGrid >= numberGrids) {
        warnings.push({ type: "warning", message: `Triangle index ${i} has a grid index of ${curGrid} when there are only ${numberGrids} grids in total. This is ignored.` });
        continue;
      }
      TrianglesInGrid[curGrid].push(i);
    }
    if (inGridLen == 0) trianglesInNoGrids.push(i);

    // all vertex
    let outsideBounds = false;
    let outsideCircularBounds = false;
    for (const vertex of [v1, v2, v3]) {
      outsideBounds |= (vertex.x > curFileData.HighestBounds.x + 0.01) || (vertex.x < curFileData.LowestBounds.x - 0.01);
      outsideBounds |= (vertex.y > curFileData.HighestBounds.y + 0.01) || (vertex.y < curFileData.LowestBounds.y - 0.01);
      outsideBounds |= (vertex.z > curFileData.HighestBounds.z + 0.01) || (vertex.z < curFileData.LowestBounds.z - 0.01);
      outsideCircularBounds |= (VectorLength(VectorSubtract(vertex, curFileData.MiddleBounds)) - curFileData.CircularBounds) > 0.01;

      const key = xyzToStringFloat32(vertex, 1);
      if (!verticesMap.has(key)) {
        verticesMap.set(key, verticesMap.size);
      }
    }
    if (outsideBounds) trianglesOutsideBoundingBox.push(i);
    if (outsideCircularBounds) trianglesOutsideCircularBounds.push(i);
  }

  // error and warning checking
  if (trianglesShouldDelete.length !== 0) {
    warnings.push({
      "type": "warning",
      "message": `There are ${trianglesShouldDelete.length} bad triangles in this file (like Triangle ID ${trianglesShouldDelete[0]}). These should be deleted as they can sometimes have unusual side effects.`
    });
  }
  if (trianglesInNoGrids.length !== 0) {
    warnings.push({
      "type": "warning",
      "message": `There are ${trianglesInNoGrids.length} triangles assigned to no grids (like Triangle ID ${trianglesInNoGrids[0]}). This can be ignored but the triangle should be deleted or updated to be placed into a grid.`
    });
  }
  if (trianglesOutsideBoundingBox.length !== 0) {
    warnings.push({
      "type": "warning",
      "message": `There are ${trianglesOutsideBoundingBox.length} triangles outside the bounding box (like Triangle ID ${trianglesOutsideBoundingBox[0]}). Update the bounding boxes, grid sizes, and triangles that are inside of certain grids to fix this problem. The file can still be downloaded but it may not act as you expect.`
    });
  }
  if (trianglesOutsideCircularBounds.length !== 0) {
    warnings.push({
      "type": "error",
      "message": `There are ${trianglesOutsideCircularBounds.length} triangles outside the Collision Range of the file (like Triangle ID ${trianglesOutsideCircularBounds[0]}). Make sure to update this value otherwise triangles outside the range may not work as expected.`
    });
  }
  if (curTries.length === 0) {
    warnings.push({
      "type": "error",
      "message": `There are no triangles in this file. The game might react in very unusual ways even though it seems harmless. Please add a triangle.`
    });
  }
  if (curTries.length > 0xFFFF) {
    warnings.push({
      "type": "error",
      "message": `There are ${curTries.length} triangles. This is larger than the 2 byte limit (${0xFFFF}) meaning the file cannot be constructed correctly. Remove triangles or split the file into many smaller files.`
    });
  } else if (curTries.length > 0x7FFF) {
    warnings.push({
      "type": "warning",
      "message": `There are ${curTries.length} triangles. This is larger than the signed 2 byte limit (${0x7FFF}). The file was still made but the results may not be what you expect.`
    });
  }
  if (verticesMap.size > 0xFFFF) {
    warnings.push({
      "type": "error",
      "message": `There are ${verticesMap.size} vertices. This is larger than the 2 byte limit (${0xFFFF}) meaning the file cannot be constructed correctly. Remove triangles or split the file into many smaller files.`
    });
  } else if (verticesMap.size > 0x7FFF) {
    warnings.push({
      "type": "warning",
      "message": `There are ${verticesMap.size} vertices. This is larger than the signed 2 byte limit (${0x7FFF}). The file was still made but the results may not be what you expect.`
    });
  }
  if (normalMap.size > 0x7FFE) {
    warnings.push({
      "type": "error",
      "message": `There are ${normalMap.size} precalculated vectors. This is larger than what the file can handle (${0x7FFE}) meaning the file cannot be constructed correctly. Simplify the model, remove triangles, or split the file into many smaller files to fix.`
    });
  }
  if (curFileData.gridAmt.x > 0xFFFF) {
    warnings.push({
      "type": "error",
      "message": `There are ${curFileData.gridAmt.x} amount of grids in the X direction. This is larger than the 2 byte limit (${0xFFFF}) meaning the file cannot be constructed correctly. Reduce the number of grids in the x direction.`
    });
  } else if (curFileData.gridAmt.x > 0x7FFF) {
    warnings.push({
      "type": "warning",
      "message": `There are ${curFileData.gridAmt.x} amount of grids in the X direction. This is larger than the signed 2 byte limit (${0x7FFF}). The file was still made but the results may not be what you expect.`
    });
  }
  if (curFileData.gridAmt.y > 0xFFFF) {
    warnings.push({
      "type": "error",
      "message": `There are ${curFileData.gridAmt.y} amount of grids in the X direction. This is larger than the 2 byte limit (${0xFFFF}) meaning the file cannot be constructed correctly. Reduce the number of grids in the y direction.`
    });
  } else if (curFileData.gridAmt.y > 0x7FFF) {
    warnings.push({
      "type": "warning",
      "message": `There are ${curFileData.gridAmt.y} amount of grids in the Y direction. This is larger than the signed 2 byte limit (${0x7FFF}). The file was still made but the results may not be what you expect.`
    });
  }
  if (curFileData.gridAmt.z > 0xFFFF) {
    warnings.push({
      "type": "error",
      "message": `There are ${curFileData.gridAmt.z} amount of grids in the X direction. This is larger than the 2 byte limit (${0xFFFF}) meaning the file cannot be constructed correctly. Reduce the number of grids in the z direction.`
    });
  } else if (curFileData.gridAmt.z > 0x7FFF) {
    warnings.push({
      "type": "warning",
      "message": `There are ${curFileData.gridAmt.z} amount of grids in the Z direction. This is larger than the signed 2 byte limit (${0x7FFF}). The file was still made but the results may not be what you expect.`
    });
  }

  // calculate size of file
  const headerSize = 0x7C;
  const verticesSize = verticesMap.size * 12;
  const trianglesSize = curTries.length * 16;
  const precalculatedSize = normalMap.size * 6;
  const allGridsTrianglesSize = TrianglesInGrid.reduce((sum, t) => sum + 2 * t.length, 0);
  const allGridsOffsetsSize = (numberGrids+1) * 4;

  let totalSize = headerSize;
  if (totalSize % 4 != 0) totalSize += 4 - (totalSize % 4);
  const offsetToVertices = totalSize;
  totalSize += verticesSize;
  if (totalSize % 16 != 0) totalSize += 16 - (totalSize % 16);
  const offsetToTriangles = totalSize;
  totalSize += trianglesSize;
  if (totalSize % 8 != 0) totalSize += 8 - (totalSize % 8);
  const offsetToPrecalculated = totalSize;
  totalSize += precalculatedSize;
  const offsetToTriangleInGrid = totalSize;
  totalSize += allGridsTrianglesSize;
  if (totalSize % 4 != 0) totalSize += 4 - (totalSize % 4);
  const offsetToGridOffsets = totalSize;
  totalSize += allGridsOffsetsSize;
  if (totalSize % 16 != 0) totalSize += 16 - (totalSize % 16);

  // Making file section
  let contents = new ArrayBuffer(totalSize);
  (new Uint8Array(contents)).fill(0);
  const view = new DataView(contents);
  let color = new Uint8Array(totalSize);
  color.fill(0);
  
  view.setUint32(0x0, 0x4E504143); // write NPAC string
  view.setUint32(0x4, totalSize); // write offset to next file from here
  view.setUint32(0x8, totalSize-0x20); // write size of this file
  view.setUint32(0xC, index); // write file index

  // helper
  const doColorDesc = function(offset, size, colorFill, descID, descData) {
    color.fill(colorFill, offset, offset+size);
    descriptions[offset] = { "desc_id": descID, "data": descData };
  }

  // write all in header
  view.setFloat32(0x20, curFileData.gridFloatSizes.x);
  view.setFloat32(0x24, curFileData.gridFloatSizes.y);
  view.setFloat32(0x28, curFileData.gridFloatSizes.z);
  doColorDesc(0x20, 4, 9, 5, "X");
  doColorDesc(0x24, 4, 9, 5, "Y");
  doColorDesc(0x28, 4, 9, 5, "Z");
  view.setFloat32(0x2C, curFileData.gridFloatSizesReciprocal.x);
  view.setFloat32(0x30, curFileData.gridFloatSizesReciprocal.y);
  view.setFloat32(0x34, curFileData.gridFloatSizesReciprocal.z);
  doColorDesc(0x2C, 4, 9, 6, "X");
  doColorDesc(0x30, 4, 9, 6, "Y");
  doColorDesc(0x34, 4, 9, 6, "Z");
  view.setUint16(0x38, curFileData.gridAmt.x);
  view.setUint16(0x3A, curFileData.gridAmt.y);
  view.setUint16(0x3C, curFileData.gridAmt.z);
  doColorDesc(0x38, 2, 9, 7, "X");
  doColorDesc(0x3A, 2, 9, 7, "Y");
  doColorDesc(0x3C, 2, 9, 7, "Z");
  view.setUint16(0x3E, verticesMap.size + 1);
  doColorDesc(0x3E, 2, 11, 8, "Vertices");
  view.setUint16(0x40, curTries.length + 1);
  doColorDesc(0x40, 2, 3, 8, "Triangles");
  doColorDesc(0x42, 2, 0, 4, "2");
  view.setFloat32(0x44, curFileData.LowestBounds.x);
  view.setFloat32(0x48, curFileData.LowestBounds.y);
  view.setFloat32(0x4C, curFileData.LowestBounds.z);
  doColorDesc(0x44, 4, 6, 9, "X");
  doColorDesc(0x48, 4, 6, 9, "Y");
  doColorDesc(0x4C, 4, 6, 9, "Z");
  view.setFloat32(0x50, curFileData.HighestBounds.x);
  view.setFloat32(0x54, curFileData.HighestBounds.y);
  view.setFloat32(0x58, curFileData.HighestBounds.z);
  doColorDesc(0x50, 4, 6, 10, "X");
  doColorDesc(0x54, 4, 6, 10, "Y");
  doColorDesc(0x58, 4, 6, 10, "Z");
  view.setFloat32(0x5C, curFileData.MiddleBounds.x);
  view.setFloat32(0x60, curFileData.MiddleBounds.y);
  view.setFloat32(0x64, curFileData.MiddleBounds.z);
  doColorDesc(0x5C, 4, 6, 11, "X");
  doColorDesc(0x60, 4, 6, 11, "Y");
  doColorDesc(0x64, 4, 6, 11, "Z");
  view.setFloat32(0x68, curFileData.CircularBounds);
  doColorDesc(0x68, 4, 7, 12, null);
  view.setUint32(0x6C, offsetToVertices - 0x20);
  doColorDesc(0x6C, 4, 11, 13, "Vertices");
  view.setUint32(0x70, offsetToTriangles - 0x20);
  doColorDesc(0x70, 4, 3, 13, "Triangles");
  view.setUint32(0x74, offsetToGridOffsets - 0x20);
  doColorDesc(0x74, 4, 10, 13, "Offsets for All Triangles in a Grid");
  view.setUint32(0x78, offsetToPrecalculated - 0x20);
  doColorDesc(0x78, 4, 8, 13, "Precalculated Values");

  // write all vertices
  let currentOffset = 0x7C;
  if (currentOffset % 4 != 0) currentOffset += 4 - (currentOffset % 4);
  console.assert(currentOffset == offsetToVertices, currentOffset, offsetToVertices);
  for (const [FloatVals, index] of verticesMap) {
    const indexAsStr = index.toString();
    const splitStr = FloatVals.split(" ");
    const x = parseInt(splitStr[0], 16);
    const y = parseInt(splitStr[1], 16);
    const z = parseInt(splitStr[2], 16);
    view.setUint32(currentOffset, x);
    view.setUint32(currentOffset+4, y);
    view.setUint32(currentOffset+8, z);
    doColorDesc(currentOffset  , 4, 11, 14, indexAsStr);
    doColorDesc(currentOffset+4, 4, 11, 15, indexAsStr);
    doColorDesc(currentOffset+8, 4, 11, 16, indexAsStr);
    currentOffset += 12;
  }
  if (currentOffset % 16 != 0) currentOffset += 16 - (currentOffset % 16);

  // write all triangles
  const getIDOfxyzFloat32 = function(json, mapOfInterest) {
    let toReturn = mapOfInterest.get(xyzToStringFloat32(json, 1));
    console.assert(toReturn != undefined && !isNaN(toReturn));
    return toReturn;
  };
  const getIDOfxyz2ByteInt = function(json, mapOfInterest) {
    let toReturn = mapOfInterest.get(xyzToString2ByteInt(json, 1));
    toReturn = toReturn + 1;

    if ((isNaN(toReturn) || toReturn == undefined)) {
      toReturn = mapOfInterest.get(xyzToString2ByteInt(json, -1));
      toReturn = (toReturn + 1) * -1;
    }

    console.assert(toReturn != undefined && !isNaN(toReturn));
    return toReturn;
  };
  console.assert(currentOffset == offsetToTriangles, currentOffset, offsetToTriangles);
  for (let i = 0; i < curTries.length; i++) {
    const indexAsStr = i.toString();
    const normalID = getIDOfxyz2ByteInt(curTries[i]["normal"], normalMap);
    const edge1ID = getIDOfxyz2ByteInt(curTries[i]["Edge1"], normalMap);
    const edge2ID = getIDOfxyz2ByteInt(curTries[i]["Edge2"], normalMap);
    const edge3ID = getIDOfxyz2ByteInt(curTries[i]["Edge3"], normalMap);
    const v1ID = getIDOfxyzFloat32(curTries[i]["v1"], verticesMap);
    const v2ID = getIDOfxyzFloat32(curTries[i]["v2"], verticesMap);
    const v3ID = getIDOfxyzFloat32(curTries[i]["v3"], verticesMap);

    view.setInt16(currentOffset, normalID);
    view.setInt16(currentOffset+2, edge1ID);
    view.setInt16(currentOffset+4, edge2ID);
    view.setInt16(currentOffset+6, edge3ID);
    view.setUint8(currentOffset+8, curTries[i]["unknownByte1"]);
    view.setUint8(currentOffset+9, curTries[i]["unknownByte2"]);
    view.setUint16(currentOffset+10, v1ID);
    view.setUint16(currentOffset+12, v2ID);
    view.setUint16(currentOffset+14, v3ID);

    doColorDesc(currentOffset   , 2, 3, 17, indexAsStr);
    doColorDesc(currentOffset+ 2, 2, 3, 18, indexAsStr);
    doColorDesc(currentOffset+ 4, 2, 3, 19, indexAsStr);
    doColorDesc(currentOffset+ 6, 2, 3, 20, indexAsStr);
    doColorDesc(currentOffset+ 8, 1, 3, 21, indexAsStr);
    doColorDesc(currentOffset+ 9, 1, 3, 22, indexAsStr);
    doColorDesc(currentOffset+10, 2, 3, 23, indexAsStr);
    doColorDesc(currentOffset+12, 2, 3, 24, indexAsStr);
    doColorDesc(currentOffset+14, 2, 3, 25, indexAsStr);
    currentOffset += 16;
  }
  if (currentOffset % 8 != 0) currentOffset += 8 - (currentOffset % 8);

  // write all precalculated values
  console.assert(currentOffset == offsetToPrecalculated, currentOffset, offsetToPrecalculated);
  for (const [FloatVals, index] of normalMap) {
    const indexAsStr = index.toString();
    const splitStr = FloatVals.split(" ");
    const x = parseInt(splitStr[0], 16);
    const y = parseInt(splitStr[1], 16);
    const z = parseInt(splitStr[2], 16);
    view.setInt16(currentOffset, x);
    view.setInt16(currentOffset+2, y);
    view.setInt16(currentOffset+4, z);

    doColorDesc(currentOffset  , 2, 8, 26, indexAsStr);
    doColorDesc(currentOffset+2, 2, 8, 27, indexAsStr);
    doColorDesc(currentOffset+4, 2, 8, 28, indexAsStr);
    currentOffset += 6;
  }

  // write all triangles in the grids
  console.assert(currentOffset == offsetToTriangleInGrid, currentOffset, offsetToTriangleInGrid);
  let offsetsToGrids = [];
  for (let i = 0; i < TrianglesInGrid.length; i++) {
    offsetsToGrids.push(currentOffset);
    for (let j = 0; j < TrianglesInGrid[i].length; j++) {
      view.setUint16(currentOffset, TrianglesInGrid[i][j]);
      doColorDesc(currentOffset, 2, 9, 29, i.toString());
      currentOffset += 2;
    }
  }
  offsetsToGrids.push(currentOffset);
  if (currentOffset % 4 != 0) currentOffset += 4 - (currentOffset % 4);

  // write all offsets to the grids
  console.assert(currentOffset == offsetToGridOffsets, currentOffset, offsetToGridOffsets);
  for (let i = 0; i < offsetsToGrids.length; i++) {
    const indexAsStr = i.toString();
    view.setUint32(currentOffset, offsetsToGrids[i] - 0x20);
    color.fill(10, currentOffset, currentOffset + 4);
    if (i == 0) {
      doColorDesc(currentOffset, 4, 10, 30, indexAsStr);
    } else if (i < offsetsToGrids.length - 1) {
      doColorDesc(currentOffset, 4, 10, 31, indexAsStr);
    } else {
      doColorDesc(currentOffset, 4, 10, 32, indexAsStr-1);
    }
    currentOffset += 4;
  }

  return {
    "contents": contents,
    "color": color,
    "warnings": warnings,
    "allDescriptions": descriptions
  }
}

// makes <p> tag and sets a background color to it. Used for viewing file's hex, offsets, and descriptions
function pTagColor(text, bgColorIndex = 0) {
  const highlightColors = ["01", "05", "09", "13", "17", "02", "06", "10", "14", "18", "03", "07", "11", "15", "04", "08", "12", "16"];

  let pTag = document.createElement("p");
  pTag.innerText = text;
  if (bgColorIndex != 0)
    pTag.style.backgroundColor = "var(--highlightColor-" + (highlightColors[(bgColorIndex-1) % highlightColors.length]) + ")";
  return pTag;
}
// Show all descriptions, offsets, and hex data within user specified range
function UpdateFilePreview(lowerBound, higherBound) {
  lowerBound = parseInt(lowerBound) & ~(0xF);
  higherBound = parseInt(higherBound) & ~(0xF);

  let startingAddress;
  if (GameVersion == 0) { startingAddress = 0x812FFEE0; } // USA
  if (GameVersion == 1) { startingAddress = 0x813044C0; } // Japan
  if (GameVersion == 2) { startingAddress = 0x81338C40; } // PAL

  // Make document fragments
  const fragment_file = document.createDocumentFragment();
  const fragment_offsets = document.createDocumentFragment();
  if (lowerBound < 0 && higherBound < 0) {
    document.getElementById("FileAddresses").replaceChildren(fragment_file);
    document.getElementById("OffsetTable").replaceChildren(fragment_offsets);
    return;
  }

  const row1Contents_file = ["Memory Address (in game)", "Offset", "File's Offset", "File id", ".0", ".1", ".2", ".3", ".4", ".5", ".6", ".7", ".8", ".9", ".A", ".B", ".C", ".D", ".E", ".F"];
  for (let i = 0; i < row1Contents_file.length; i++) {
    fragment_file.appendChild(pTagColor(row1Contents_file[i]));
  }
  const row1Contents_offsets = ["Memory Address (in game)", "Offset", "File's Offset", "Variable Type", "File id",  "Description"];
  for (let i = 0; i < row1Contents_offsets.length; i++) {
    fragment_offsets.appendChild(pTagColor(row1Contents_offsets[i]));
  }

  let currentOffset = 0;
  let i = 0;
  for (; i < fileDownloadContents.length && currentOffset + fileDownloadContents[i].byteLength < lowerBound; i++) {
    currentOffset += fileDownloadContents[i].byteLength;
  }
  for (; i < fileDownloadContents.length; i++) {
    const fileContentsAsBuffer = new Uint8Array(fileDownloadContents[i]);
    const segmentColors = fileDownloadSegmentColor[i];
    const description = allDescriptions[i];
    const colorIndex = (i % 2) + 1;

    for (let j = Math.max(0, lowerBound - currentOffset); j < fileContentsAsBuffer.length; j++) {
      let totalOffset = currentOffset + j;
      if (totalOffset >= higherBound + 0x10) break;

      if (j % 16 === 0) {
        fragment_file.appendChild(pTagColor("0x" + (startingAddress + totalOffset).toString(16).toUpperCase()));
        fragment_file.appendChild(pTagColor("+0x" + totalOffset.toString(16).toUpperCase()));
        fragment_file.appendChild(pTagColor((j >= 0x20) ? "+0x" + (j-0x20).toString(16).toUpperCase() : "--"));
        fragment_file.appendChild(pTagColor((i == AllCollisionData.length) ? "EOF" : (i).toString(), colorIndex));
      }
      fragment_file.appendChild(pTagColor(fileContentsAsBuffer[j].toString(16).padStart(2, "0").toUpperCase(), segmentColors[j]));
      
      if (description[j] != undefined) {
        const bankElem = descriptionBank[description[j].desc_id];
        const needReplacing = bankElem.desc.indexOf("{}") != -1;
        const desc = needReplacing ? bankElem.desc.replace("{}", description[j].data) : bankElem.desc;

        fragment_offsets.appendChild(pTagColor("0x" + (startingAddress + totalOffset).toString(16).toUpperCase()));
        fragment_offsets.appendChild(pTagColor("+0x" + totalOffset.toString(16).toUpperCase()));
        fragment_offsets.appendChild(pTagColor((j >= 0x20) ? "+0x" + (j-0x20).toString(16).toUpperCase() : "--"));
        fragment_offsets.appendChild(pTagColor(bankElem.type));
        fragment_offsets.appendChild(pTagColor((i == AllCollisionData.length) ? "EOF" : (i).toString(), colorIndex));
        fragment_offsets.appendChild(pTagColor(desc, segmentColors[j]));
      }
    }
    currentOffset += fileDownloadContents[i].byteLength;
    if (currentOffset >= higherBound + 0x10) break;
  }

  document.getElementById("FileAddresses").replaceChildren(fragment_file);
  document.getElementById("OffsetTable").replaceChildren(fragment_offsets);
}

/* --------------- Download File ------------------- */

function downloadPAC() {
  const totalLength = fileDownloadContents.reduce((sum, b) => sum + b.byteLength, 0);
  const combined = new Uint8Array(totalLength);
  let offset = 0;
  for (const buf of fileDownloadContents) {
    combined.set(new Uint8Array(buf), offset);
    offset += buf.byteLength;
  }

  const blob = new Blob([combined], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = getFileName(".pac");
  a.click();
  URL.revokeObjectURL(url);
  wasFileChanged = false;
}
function downloadJSON() {
  const jsonString = JSON.stringify(AllCollisionData, null, 2);
  const blob = new Blob([jsonString], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = getFileName(".json");
  document.body.appendChild(a);
  a.click();

  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  wasFileChanged = false;
}

/* -------------- Startup 3JS display --------------- */

function initialize3DDisplay() {
  const containerAll = document.getElementById("ThreeJsDisplay");
  document.getElementById("UnloadedThreeJSButton").remove();
  const allChildren = containerAll.querySelectorAll("*");
  allChildren.forEach(elem => {
    elem.style.display = "";
  });

  const moduleScript = document.createElement("script");
  moduleScript.type = "module";
  moduleScript.textContent = `
    import * as THREE from '../Resources/three.js/build/three.module.min.js';
    import { PointerLockControls } from '../Resources/three.js/examples/jsm/controls/PointerLockControls.js';
    window.THREE = THREE;
    window.PointerLockControls = PointerLockControls;
    window.dispatchEvent(new Event('threejs-module-ready'));
  `;
  containerAll.appendChild(moduleScript);

  window.addEventListener('threejs-module-ready', () => {
    const externalScript = document.createElement("script");
    externalScript.src = "./render.js";
    containerAll.appendChild(externalScript);
  }, { once: true });
}

/* --------------- Run on Page Load and Close ---------- */

// wait for full html load
window.addEventListener("load", function() {
  refreshAllFiles();
  updateEntireDownloadFile();
  updateFileNum(0);
  wasFileChanged = false;
  fetch('../Documentation/Filenames.json')
  .then(response => response.json())
  .then(data => {
    JSON_filenames = data;
    gameVersionUpdater();
    makeAllOptionTags();
  })
  .catch(error => {
    alert(`Failed to load file for filenames. Filenames and what they are will not be presented to you. I recommend a page refresh to fix it. Error: ${error}`);
  });
});
window.addEventListener("beforeunload", (event) => {
  // prevent closing when you changed something
  if (wasFileChanged) {
    event.preventDefault();
    event.returnValue = "";
  }
});