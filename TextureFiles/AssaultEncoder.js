// This file contains all functions needed to encode the file you can download.

/* ------------- Sanity Checker ------------- */

// only run in localhost so that I'm aware what is and isn't encoded properly
function Assault_Encode_SanityCheckAll() {
  for (let i = 0; i < g_AllTextureData.length; i++) {
    const curData = g_AllTextureData[i];
    if (curData.TextureLayer === 4 || curData.TextureLayer === 12)
      continue;
    
    const numMipMaps = curData.pixels.length;
    let isNotSame = false;
    for (let j = 0; j < numMipMaps; j++) {
      const curCompressed = g_allFileProcessedInformation[i+1].compressedImage[j];
      const curUser = curData.pixels[j];
      for (let k = 0; k < curData.pixels[j].length; k++) {
        isNotSame |= curUser[k].r !== curCompressed[k*4+0];
        isNotSame |= curUser[k].g !== curCompressed[k*4+1];
        isNotSame |= curUser[k].b !== curCompressed[k*4+2];
        isNotSame |= curUser[k].a !== curCompressed[k*4+3];
        if (isNotSame) {
          console.error(`Texture index ${i} with id ${curData.id.toString(16).toUpperCase().padStart(8, "0")} didn't compress to be the same file\n`,
                        i, j, k, `(${curUser[k].r} ${curCompressed[k*4+0]})`, `(${curUser[k].g} ${curCompressed[k*4+1]})`, `(${curUser[k].b} ${curCompressed[k*4+2]})`, `(${curUser[k].a} ${curCompressed[k*4+3]})`)
          break;
        }
      }
      if (isNotSame) break;
    }
  }
}

/* ------------- File Header ------------- */


// each file has 20 bytes at the top that say the file that they are, I assume their version, and number of textures. This makes that.
// It's expected to be the first index in `g_allFileProcessedInformation`
function Assault_Encode_createFileHeader() {
  const downloadSegment = new ArrayBuffer(0x20);
  const downloadSegmentColors = new Uint8Array(0x20);
  const descriptions = {};
  const warnings = [];
  const errors = [];
  const compressedImage = [];
  const offsetToStartOfPixels = -1;
  const offsetToStartOfColors = -1;
  const fileSize = -1;

  const view = new DataView(downloadSegment);
  view.setUint32(0x00, 0x4E555443);
  view.setUint32(0x04, 0x80020000);
  view.setUint32(0x08, 0x00000000);
  view.setUint32(0x0C, 0x00000000);
  view.setUint32(0x10, 0x00000000);
  view.setUint32(0x14, 0x00000000);
  view.setUint32(0x18, 0x00000000);
  view.setUint32(0x1C, 0x00000000);
  descriptions[0x00] = {
    "description": "Magic bytes. Tells game this is the proper file type",
    "type": "String (4 bytes)"
  }
  descriptions[0x04] = {
    "description": "Unsure on purpose. Must be this value or game freaks out",
    "type": "1 Byte Integer (unsigned?)"
  }
  descriptions[0x05] = {
    "description": "Unsure on purpose. Must be this value or game freaks out",
    "type": "1 Byte Integer (unsigned?)"
  }
  descriptions[0x06] = {
    "description": "Number of Textures",
    "type": "2 Byte Integer (unsigned?)"
  }
  descriptions[0x08] = {
    "description": "No purpose",
    "type": "8 Byte Padding"
  }
  descriptions[0x10] = {
    "description": "No purpose",
    "type": "16 Byte Padding"
  }
  downloadSegmentColors[6] = 4;
  downloadSegmentColors[7] = 4;

  return { downloadSegment, downloadSegmentColors, descriptions, warnings, errors, compressedImage, offsetToStartOfPixels, offsetToStartOfColors, fileSize };
}
// updates number of textures within the file header made in the above function
function Assault_Encode_updateFileHeader() {
  const view = new DataView(g_allFileProcessedInformation[0].downloadSegment);
  view.setUint16(0x6, g_AllTextureData.length);
}

/* ------------ Encode Helpers ------------ */

function Assault_EncodeHelper_applyAllColors(view, offsetToStartOfColors, indexToColor, colorType, biggestPalette_size) {
  // description set when making the header of the individual texture
  const addColorDataToFile = (offset, value) => {
    offset += offsetToStartOfColors;
    console.assert(offset != undefined);
    view.setUint16(offset, value);
  };

  for (let i = 0; i < indexToColor.length; i++) {
    for (const key of Object.keys(indexToColor[i])) {
      const keyInt = parseInt(key);
      const value = Assault_EncodeHelper_rgbaToU16(indexToColor[i][key], colorType);
      addColorDataToFile(((i*biggestPalette_size)+keyInt)*2, value);
    }
  }
}

// of all palettes (internal and external to this file) it finds the one with the most colors. And other setup like preparing the shapes of allPalettes and indexToColor
function Assault_EncodeHelper_PrepareForAllPalettes(index, forceSizeAmt) {
  const curData = g_AllTextureData[index];

  // setup
  let allPalettes = [];
  let indexToColor = []; // for each texture, it contains an index used in the pixel data and the index to the color it points to (or actual color data at the end of the function)
  let biggestPalette_I = -1;
  let biggestPalette_J = -1;
  let biggestPalette_size = -1;
  let useForceSizeAmt = false;
  for (let i = index; i < g_AllTextureData.length; i++) {
    const curLoopData = g_AllTextureData[i];
    if (i != index &&
      (curLoopData.TextureLayer != curData.TextureLayer ||
        !curLoopData.colorOnly ||
        curLoopData.width != curData.width ||
        curLoopData.height != curData.height ||
        curLoopData.colorType != curData.colorType
      )
    )
      break;

    allPalettes.push([]);
    indexToColor.push([]);
    useForceSizeAmt ||= curLoopData.pixels.length > 1;
    for (let j = 0; j < curLoopData.pixels.length; j++) {
      const curPalette = Assault_EncodeHelper_GetAllColors(i, j, forceSizeAmt);
      if (biggestPalette_size < curPalette.length) {
        biggestPalette_I = i - index;
        biggestPalette_J = j;
        biggestPalette_size = curPalette.length;
      }
      allPalettes[i-index].push(curPalette);
      indexToColor[i-index].push({});
    }
  }

  // --------------------------------------------------------------------------------------------------
  // ------------------------------------ CLAUDE TAKE THE WHEEL --------------------------------------- 
  // --------------------------------------------------------------------------------------------------

  // ---- Pass 1: nearest palette index for every pixel of every image/palette ----
  const layers = [];
  for (let i = 0; i < indexToColor.length; i++) {
    for (let j = 0; j < indexToColor[i].length; j++) {
      const pixels = g_AllTextureData[index + i].pixels[j];
      const idx = new Array(pixels.length);
      for (let p = 0; p < pixels.length; p++) {
        idx[p] = Assault_EncodeHelper_NearestColorIndex(pixels[p], allPalettes, i, j);
      }
      layers.push({ i, j, idx });
    }
  }
  const mostColorDataPixels = g_AllTextureData[biggestPalette_I + index].pixels[biggestPalette_J];
  const numPixels = mostColorDataPixels.length;
  const biggestLayer = layers.find(l => l.i === biggestPalette_I && l.j === biggestPalette_J);

  // ---- Pass 2: each pixel position has a "signature" = its palette index in EVERY image ----
  // Two positions can share an output index losslessly only if their signatures match.
  const sigOf = (p) => layers.map(l => l.idx[p]).join(',');
  const sigInfo = new Map(); // sig -> { base, count, firstPixel }
  for (let p = 0; p < numPixels; p++) {
    const sig = sigOf(p);
    let info = sigInfo.get(sig);
    if (!info) {
      info = { base: biggestLayer.idx[p], count: 0, firstPixel: p };
      sigInfo.set(sig, info);
    }
    info.count++;
  }

  // Cost of squashing signature A into slot B = summed color error across all images
  // NOTE: adjust getColor/colorDist to match how your palettes store colors.
  const getColor = (layer, palIdx) => allPalettes[layer.i][layer.j][palIdx];
  const colorDist = (a, b) => {
    let d = 0;
    for (let k = 0; k < 3; k++) { const x = a[k] - b[k]; d += x * x; }
    return d;
  };
  const sigCost = (p, slotPixel) => {
    let cost = 0;
    for (const l of layers) {
      if (l.idx[p] !== l.idx[slotPixel]) {
        cost += colorDist(getColor(l, l.idx[p]), getColor(l, l.idx[slotPixel]));
      }
    }
    return cost;
  };

  // ---- Assign slots: most common signatures first ----
  // The first signature for each biggest-palette index keeps that index (same as the old behavior);
  // any other signature that would lose data in some image gets a brand-new index.
  const sorted = [...sigInfo.entries()].sort((a, b) => b[1].count - a[1].count);
  const sigToSlot = new Map();
  const slotRepPixel = []; // slot -> a representative pixel position
  let nextFree = allPalettes[biggestPalette_I][biggestPalette_J].length;

  for (const [sig, info] of sorted) {
    if (slotRepPixel[info.base] === undefined) {
      sigToSlot.set(sig, info.base);
      slotRepPixel[info.base] = info.firstPixel;
    } else if (nextFree < forceSizeAmt) {
      sigToSlot.set(sig, nextFree);
      slotRepPixel[nextFree] = info.firstPixel;
      nextFree++;
    } else {
      // Out of room: merge into the existing slot that costs the least across all images
      let bestSlot = info.base, bestCost = Infinity;
      for (let s = 0; s < slotRepPixel.length; s++) {
        if (slotRepPixel[s] === undefined) continue;
        const c = sigCost(info.firstPixel, slotRepPixel[s]);
        if (c < bestCost) { bestCost = c; bestSlot = s; }
      }
      sigToSlot.set(sig, bestSlot);
    }
  }

  // ---- Final pass: write out indices and indexToColor (same output format as before) ----
  const allIndexToUse = [];
  for (let p = 0; p < numPixels; p++) {
    const slot = sigToSlot.get(sigOf(p));
    allIndexToUse.push(slot);
    for (const l of layers) {
      const cur = indexToColor[l.i][l.j];
      if (cur[slot] == undefined) cur[slot] = [];
      cur[slot].push(l.idx[p]);
    }
  }

  // --------------------------------------------------------------------------------------------------
  // ------------------------------- CLAUDE GIVE THE WHEEL BACK TO ME ---------------------------------
  // --------------------------------------------------------------------------------------------------

  // updates indexToColor to have rgba colors instead of an index to a color
  Assault_EncodeHelper_allIndexToAColor(indexToColor, allPalettes);

  // this may look dumb but I thought we could save storage if the number of colors is less than the `forceSizeAmt`.
  // It seems the game dislikes it when the values are smaller than what it expects
  biggestPalette_size = nextFree;
  if (useForceSizeAmt || true) {
    biggestPalette_size = forceSizeAmt;
  }

  return { allIndexToUse, indexToColor, biggestPalette_size };
}

// indexToColor normally contains an array of number pointing to a color within `allPalettes`.
// This takes the most occurring index and replaces the array with that color.
//    MODIFIES indexToColor
function Assault_EncodeHelper_allIndexToAColor(indexToColor, allPalettes) {
  const mostFrequent = function(arr) {
    const counts = new Map();
    let best = arr[0], bestCount = 0;
    for (const v of arr) {
      const c = (counts.get(v) || 0) + 1;
      counts.set(v, c);
      if (c > bestCount) {
        best = v;
        bestCount = c;
      }
    }
    return best;
  }

  for (let i = 0; i < indexToColor.length; i++) {
    for (let j = 0; j < indexToColor[i].length; j++) {
      for (const key of Object.keys(indexToColor[i][j])) {
        indexToColor[i][j][key] = allPalettes[i][j][mostFrequent(indexToColor[i][j][key])];
      }
    }
  }

  return indexToColor;
}

// RGBA 0-255 to unsigned 16 bits (2 bytes). Used to format color in a way the game likes
// opposite of `Assault_getColorFromU16`.
function Assault_EncodeHelper_rgbaToU16(pixel, colorType) {
  const { r, g, b, a } = pixel;
  const rgbaToSmaller = function(color, highest) {
    return Math.round(highest*color/255);
  }
  const valueTo255 = function(value, max) {
    return Math.round((((value) & max) / max) * 255);
  }
  const totalDifference = function(r_a, g_a, b_a, a_a) { // (channel)_actual
    return Math.abs(r_a - r) + Math.abs(g_a - g) + Math.abs(b_a - b) + Math.abs(a_a - a);
  }
  

  if (((colorType % 4) == 0) || ((colorType % 4) == 3)) {
    const averageRGB = Math.round((r + g + b) / (3));
    return (averageRGB) + (a << 8);
  }
  if ((colorType % 4) == 1) {
    const r_res = rgbaToSmaller(r, 0x1F);
    const g_res = rgbaToSmaller(g, 0x3F);
    const b_res = rgbaToSmaller(b, 0x1F);
    return (r_res << 11) + (g_res << 5) + b_res;
  }
  if ((colorType % 4) == 2) {
    // this had two different modes. We need to try both and pick the best one
    const r_res_1 = rgbaToSmaller(r, 0xF);
    const g_res_1 = rgbaToSmaller(g, 0xF);
    const b_res_1 = rgbaToSmaller(b, 0xF);
    const a_res_1 = rgbaToSmaller(a, 0x7);
    const res_1 = (a_res_1 << 12) + (r_res_1 << 8) + (g_res_1 << 4) + b_res_1;
    const diff_1 = totalDifference(valueTo255(r_res_1, 0xF), valueTo255(g_res_1, 0xF), valueTo255(b_res_1, 0xF), valueTo255(a_res_1, 0x7))

    const r_res_2 = rgbaToSmaller(r, 0x1F);
    const g_res_2 = rgbaToSmaller(g, 0x1F);
    const b_res_2 = rgbaToSmaller(b, 0x1F);
    const res_2 = (1 << 15) + (r_res_2 << 10) + (g_res_2 << 5) + b_res_2;
    const diff_2 = totalDifference(valueTo255(r_res_2, 0x1F), valueTo255(g_res_2, 0x1F), valueTo255(b_res_2, 0x1F), 255);

    if ((a !== 255) || diff_1 < diff_2) {
      return res_1;
    } else {
      return res_2;
    }
  }
}
// This does all the setup for a file. So makes the proper size of bytes to download, errors, warnings,
// and writing information like width and height
function Assault_EncodeHelper_HeaderAndSetup(index, numberOfColors) {
  const curData = g_AllTextureData[index];
  const numMipMaps = curData.pixels.length;
  const numPalettes = curData.pixels.length;
  const textureLayer = curData.TextureLayer;
  const width = curData.width;
  const height = curData.height;
  const numberOfPixelsToBytesRatio = getPixelsToByteRatio(textureLayer);
  const { w, h } = getGridSizes(curData.TextureLayer);

  // -------------- calculate fileSize --------------
  // header
  let fileSize = 0x50;
  if (!data_hasColorData(index)) {
    // number of mipmaps means a bigger file. idk why the game just expects
    if (([2,3,4]).includes(numMipMaps))
      fileSize += 0x20;
    if (([5,6,7]).includes(numMipMaps))
      fileSize += 0x30;
  }
  // pixels (color only has no pixel data for supported compression types)
  const offsetToStartOfPixels = fileSize;
  let sizeOfPixels = 0;
  if (!data_hasColorData(index)) {
    // mipmap handler
    for (let i = 0; i < numMipMaps && numberOfPixelsToBytesRatio != 0; i++) {
      sizeOfPixels += ((width >> i) * (height >> i)) / numberOfPixelsToBytesRatio;
    }
  } else if (!curData.colorOnly && numberOfPixelsToBytesRatio != 0) {
    // palette handler
    sizeOfPixels += (width * height) / numberOfPixelsToBytesRatio;
  }
  fileSize += sizeOfPixels;
  if (fileSize % 0x10)
    fileSize += 0x10 - (fileSize % 0x10); // align
  // color
  const offsetToStartOfColors = fileSize;
  const sizeOfColors = !data_hasColorData(index) ? 0 : (numberOfColors * 2 * numPalettes);
  fileSize += sizeOfColors;
  if (fileSize % 0x10)
    fileSize += 0x10 - (fileSize % 0x10); // align

  // --------------- make Info To return --------------
  const downloadSegment = new ArrayBuffer(fileSize);
  const downloadSegmentColors = new Uint8Array(fileSize);
  const descriptions = {};
  const warnings = [];
  const errors = [];
  const compressedImage = [];
  for (let i = 0; i < g_AllTextureData[index].pixels.length; i++) {
    const bitShiftAmt = !data_hasColorData(index) ? i : 0;
    compressedImage.push(new Uint8Array(
      4 * (g_AllTextureData[index].width >> bitShiftAmt) * (g_AllTextureData[index].height >> bitShiftAmt)
    ));
  }

  // ------------- fill in header ----------
  const view = new DataView(downloadSegment);
  const TYPE_INFO = {
    0: { bytes: 1, label: "1 Byte Integer (unsigned?)",
        write: (v, o, val) => v.setUint8(o, val) },
    1: { bytes: 2, label: "2 Byte Integer (unsigned?)",
        write: (v, o, val) => v.setUint16(o, val) },
    2: { bytes: 4, label: "4 Byte Integer (unsigned?)",
        write: (v, o, val) => v.setUint32(o, val) },
    3: { bytes: 3, label: "String (3 bytes)",
        write: (v, o, val) => { v.setUint16(o, val >> 8); v.setUint8(o+2, val & 0xFF); } },
    4: { bytes: 4, label: "String (4 bytes)",
        write: (v, o, val) => v.setUint32(o, val) },
  };
  const addDataToHeader = (offset, type, value, colorID, description) => {
    const info = TYPE_INFO[type];
    descriptions[offset] = { description, type: info.label };
    downloadSegmentColors.fill(colorID, offset, offset + info.bytes);
    console.assert(offset != undefined);
    info.write(view, offset, value);
  };
  
  const writeSize = !(data_hasColorData(index) && curData.colorOnly);
  addDataToHeader(0x00, 2, fileSize, 4, "Total size of this texture file");
  addDataToHeader(0x04, 2, sizeOfColors, 3, "Total size of color data");
  addDataToHeader(0x08, 2, sizeOfPixels, 11, "Total size of pixel data");
  addDataToHeader(0x0C, 1, offsetToStartOfPixels, 15, "Offset to start of pixel data");
  addDataToHeader(0x0E, 1, Math.min(0xFFFF, numberOfColors), 17, "Total number of colors in color data");
  addDataToHeader(0x11, 0, !data_hasColorData(index) ? numMipMaps : 1, 9, "Total number of mip maps (aka smaller versions of same texture. Always 1 if compression type only support palettes and not mipmaps)");
  addDataToHeader(0x12, 0, curData.colorType, 4, "The color type (only affects colors if in the color data segment)");
  addDataToHeader(0x13, 0, curData.TextureLayer, 9, "The compression type (also called texture layer on an error)");
  addDataToHeader(0x14, 1, writeSize ? width : 0, 4, "Width of full resolution texture (is 0 if it only saves color information)");
  addDataToHeader(0x16, 1, writeSize ? height : 0, 9, "Height of full resolution texture (is 0 if it only saves color information)");
  addDataToHeader(0x20, 4, 0xB0, 0, "????");
  addDataToHeader(offsetToStartOfPixels-0x20, 3, 0x655874, 0, "Magic bytes for file type ('eXt'). idk why this exists.");
  addDataToHeader(offsetToStartOfPixels-0x1C, 2, 0x20, 0, "????");
  addDataToHeader(offsetToStartOfPixels-0x18, 2, 0x10, 0, "????");
  addDataToHeader(offsetToStartOfPixels-0x10, 4, 0x47494458, 0, "Magic bytes for file type ('GIDX'). idk why this exists.");
  addDataToHeader(offsetToStartOfPixels-0x0C, 2, 0x10, 0, "????");
  addDataToHeader(offsetToStartOfPixels-0x08, 2, curData.id, 4, "Texture ID (used to search for the texture in a binary tree data structure)");
  
  // color in Pixel data
  for (let currentOffset = offsetToStartOfPixels, i = 0; currentOffset < offsetToStartOfColors; i++) {
    const nextOffset = currentOffset + (w*h) / numberOfPixelsToBytesRatio;
    downloadSegmentColors.fill(((i % 2) === 0) ? 11 : 15, currentOffset, nextOffset);
    currentOffset = nextOffset;
  }

  // add descriptions and color to Color Data
  for (let i = 0; i < numMipMaps; i++) {
    const numColorsReal = Math.min(0xFFFF, numberOfColors);
    for (let j = 0; j < numColorsReal; j++) {
      const curOffset = offsetToStartOfColors + (2 * i * numColorsReal) + (2 * j);
      descriptions[curOffset] = {
        description: `Palette #${i} - Color Index ${j}`,
        type: "2 Byte Integer (unsigned)"
      };
      downloadSegmentColors.fill(((i % 2) === 0) ? 3 : 17, curOffset, curOffset + 2);
    }
  }

  // add warnings and errors
  if (width == 0 || height == 0) {
    warnings.push(`The width (${width}) and/or height (${height}) is zero. I can't think of a reason for doing this.`);
  }
  if (width % w !== 0 && w !== 0) {
    errors.push(`The width (${width}) is not divisible by the grid size for this compression type (${w}). Honestly I would've expected my code to crash since it expects the width to always be valid, so if you even see this that's impressive.`);
  }
  if (height % h !== 0 && h !== 0) {
    errors.push(`The height (${height}) is not divisible by the grid size for this compression type (${h}). Honestly I would've expected my code to crash since it expects the height to always be valid, so if you even see this that's impressive.`);
  }
  if (width >> numMipMaps === 0 || height >> numMipMaps === 0) {
    errors.push(`There are ${numMipMaps} mipmaps. However either the width (${width}) or height (${height}) isn't larger than or equal to ${1 << numMipMaps} meaning that at least one mip maps is 0x0 which shouldn't be the case.`);
  }
  if (numberOfColors > 0xFFFF) {
    errors.push(`There are more colors (${numberOfColors}) than what can fit in 2 bytes (${0xFFFF}). The file may not act as expected.`);
  }
  if (sizeOfColors > 0x7FFFFFFF) {
    errors.push(`The data size for the colors in this texture file (${sizeOfColors}) takes up more than the signed 4 byte limit (${0x7fffffff}). If you see this what on earth are you encoding?`);
  }
  if (sizeOfPixels > 0x7FFFFFFF) {
    errors.push(`The data size for the pixels in this texture file (${sizeOfPixels}) takes up more than the signed 4 byte limit (${0x7fffffff}). This probably means that you have very high resolution image. While I'm no expert I doubt the GameCube could handle an image so large.`);
  }
  if (fileSize > 0x7FFFFFFF) {
    errors.push(`The data size for the entire texture file (${fileSize}) takes up more than the signed 4 byte limit (${0x7fffffff}). I'm too lazy to do the math but I think this takes up more space than a GameCube disc (~1.3 gb).`);
  }
  if (numMipMaps > 7) {
    errors.push(`There are more than 7 mipmaps (${numMipMaps}). The game code doesn't seem like it would like this. Expect a game crash.`);
  }
  if (curData.colorType > 4 && curData.colorType != 11) {
    warnings.push(`The colorType (${curData.colorType}) is larger than 4 and not the value 11. This doesn't break anything as usually it just chooses another one by wrapping around, but keep it in mind.`);
  }
  if (!([1,2,3,4,5,6,7,10,11,12]).includes(curData.TextureLayer)) {
    errors.push(`The compression type / texture layer (${curData.TextureLayer}) is an invalid number. There is no compression algorithm to run and was just made into an empty texture file.`);
  }
  if (curData.id < 0x10000000 || curData.id > 0x1000FFFF) {
    errors.push(`The texture id (0x${curData.id.toString(16).toUpperCase().padStart(8,"0")}) is not between 0x10000000 and 0x1000FFFF (inclusive). Due to how textures are searched for its possible for this texture to be missed entirely or impossible to find.`);
  }

  return { downloadSegment, downloadSegmentColors, descriptions, warnings, errors, compressedImage, offsetToStartOfPixels, offsetToStartOfColors, fileSize };
}
function Assault_EncodeHelper_GetAllColors(index, paletteIndex, forceSizeAmt = 0xFFFF) {
  const allPixels = g_AllTextureData[index].pixels[paletteIndex].flat();
  return quantizeColors(allPixels, forceSizeAmt).palette;
}

/* ------------ Encode ------------ */

function Assault_EncodeAll() {
  g_allFileProcessedInformation = [];
  g_allFileProcessedInformation.push(Assault_Encode_createFileHeader()); // place file header
  Assault_Encode_updateFileHeader(); // set number of textures within header
  for (let i = 0; i < g_AllTextureData.length; i++) {
    g_allFileProcessedInformation.push({});
    Assault_generalEncode(i, false); // this function updates the `g_allFileProcessedInformation` variable at the appropriate index
  }
  displayWarningsAndErrors(); // update on screen warnings/errors
}

// this should only be called after parsing an Assault file. This shows progress on screen.
// and yes this is the just the same as the above function otherwise
async function Assault_EncodeAll_async() {
  const textContainer = document.getElementById("OverlayForDownloading");
  const textToShow = textContainer.getElementsByClassName("box")[0];
  textContainer.style.display = "";
  textToShow.innerText = `Recompressing / Encoding
  (50%) ...`;

  g_allFileProcessedInformation = [];
  g_allFileProcessedInformation.push(Assault_Encode_createFileHeader()); // place file header
  Assault_Encode_updateFileHeader(); // set number of textures within header
  for (let i = 0; i < g_AllTextureData.length; i++) {
    // update on screen text with progress
    if (i % 25 === 0) {
      textToShow.innerText = `Recompressing / Encoding
      (${parseFloat((i/g_AllTextureData.length*100).toFixed(1))/2 + 50}%)...`;
      await waitForPaint();
    }

    g_allFileProcessedInformation.push({});
    Assault_generalEncode(i, false); // this function updates the `g_allFileProcessedInformation` variable at the appropriate index
  }
  displayWarningsAndErrors(); // update on screen warnings/errors

  // don't hide `textContainer` as the Assault Parser will hide it
}

function Assault_generalEncode(index, updateWarningsAndErrors = true) {
  // Calls function to encode everything for this file
  const getBasicInfo = function() {
    switch (g_AllTextureData[index].TextureLayer) {
      case 1:
        return Assault_EncodeLayer1(index);
        break;
      case 2:
        return Assault_EncodeLayer2(index);
        break;
      case 3:
        return Assault_EncodeLayer3(index);
        break;
      case 4:
      case 12:
        return Assault_EncodeLayer4(index);
        break;
      case 5:
        if (g_AllTextureData[index].colorOnly)
          return Assault_EncodeColorOnly(index);
        return Assault_EncodeLayer5(index);
        break;
      case 6:
        if (g_AllTextureData[index].colorOnly)
          return Assault_EncodeColorOnly(index);
        return Assault_EncodeLayer6(index);
        break;
      case 7:
        if (g_AllTextureData[index].colorOnly)
          return Assault_EncodeColorOnly(index);
        return Assault_EncodeLayer7(index);
        break;
      case 10:
        return Assault_EncodeLayer10(index);
        break;
      case 11:
        return Assault_EncodeLayer11(index);
        break;
      case 8:
      case 9:
      default:
        return Assault_EncodeHelper_HeaderAndSetup(index, 0);
        break;
    }
  }

  // set info from above function to `g_allFileProcessedInformation`. +1 because of file header being index 0
  const { downloadSegment, downloadSegmentColors, descriptions, warnings, errors, compressedImage, offsetToStartOfPixels, offsetToStartOfColors, fileSize, indexToColor, biggestPalette_size } = getBasicInfo();
  g_allFileProcessedInformation[index+1] = { downloadSegment, downloadSegmentColors, descriptions, warnings, errors, compressedImage, offsetToStartOfPixels, offsetToStartOfColors, fileSize, indexToColor, biggestPalette_size };

  // account for if this texture has no pixel data (aka it saves only color information)
  let fileIndexWithPixelData = data_getTextureWithPixelData(index) ?? -1;
  if (fileIndexWithPixelData != -1 && g_AllTextureData[index].colorOnly) {
    if (g_allFileProcessedInformation[fileIndexWithPixelData+1].indexToColor.length <= index-fileIndexWithPixelData) {
      fileIndexWithPixelData = -1
    }
  }

  // decode what I just encoded so it can be previewed
  const colorType = g_AllTextureData[index].colorType;
  const pixelToByteRatio = getPixelsToByteRatio(g_AllTextureData[index].TextureLayer);
  let curPixelOffset = offsetToStartOfPixels;
  let curColorOffset = offsetToStartOfColors;
  for (let j = 0; j < g_AllTextureData[index].pixels.length && pixelToByteRatio != 0 && fileIndexWithPixelData != -1; j++) {
    const byteToPixelRatio = 1 / pixelToByteRatio;
    let currentWidth, currentHeight;
    if (!data_hasColorData(index)) {
      // mipmaps
      currentWidth = g_AllTextureData[index].width >> (j);
      currentHeight = g_AllTextureData[index].height >> (j);
    } else {
      // palettes
      currentWidth = g_AllTextureData[fileIndexWithPixelData].width;
      currentHeight = g_AllTextureData[fileIndexWithPixelData].height;
    }
    const sizeOfPixelData = currentWidth*currentHeight*byteToPixelRatio;
    let view_pixelsOnly;
    if (data_hasColorData(index) && g_AllTextureData[index].colorOnly) {
      // gets previous pixel data if this file has no pixel data
      view_pixelsOnly = new DataView(g_allFileProcessedInformation[fileIndexWithPixelData+1].downloadSegment, curPixelOffset, sizeOfPixelData);
    } else {
      view_pixelsOnly = new DataView(downloadSegment, curPixelOffset, sizeOfPixelData);
    }
    curPixelOffset += sizeOfPixelData * (!data_hasColorData(index));
    const sizeOfColorData = g_allFileProcessedInformation[fileIndexWithPixelData+1].biggestPalette_size * 2;
    const view_colorsOnly = new DataView(downloadSegment, curColorOffset, sizeOfColorData);
    curColorOffset += sizeOfColorData;
    
    switch (g_AllTextureData[index].TextureLayer) {
      case 1: {
        Assault_parseLayer1(index, j, view_pixelsOnly, currentWidth, true);
        break;
      } case 2: {
        Assault_parseLayer2(index, j, view_pixelsOnly, currentWidth, true);
        break;
      } case 3: {
        Assault_parseLayer3(index, j, view_pixelsOnly, currentWidth, true);
        break;
      } case 4: {
        Assault_parseLayer4(index, j, view_pixelsOnly, currentWidth, true);
        break;
      } case 5: {
        Assault_parseLayer5(index, j, view_pixelsOnly, view_colorsOnly, colorType, currentWidth, true);
        break;
      } case 6: {
        Assault_parseLayer6(index, j, view_pixelsOnly, view_colorsOnly, colorType, currentWidth, true);
        break;
      } case 7: { // !!!!!!!!!!!!!!! NOT TESTED !!!!!!!!!!!!!!
        Assault_parseLayer7(index, j, view_pixelsOnly, view_colorsOnly, colorType, currentWidth, true);
        break;
      } case 10: {
        Assault_parseLayer10(index, j, view_pixelsOnly, currentWidth, true);
        break;
      } case 11: {
        Assault_parseLayer11(index, j, view_pixelsOnly, currentWidth, true);
        break;
      } case 12: { // !!!!!!!!!!!!!!! NOT TESTED !!!!!!!!!!!!!!
        Assault_parseLayer4(index, j, view_pixelsOnly, currentWidth, true);
        break;
      }
      default:
        break;
    }
  }
  Assault_Encode_updateFileHeader();

  if (updateWarningsAndErrors)
    displayWarningsAndErrors();
}




// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
// This section is 100% claude. I barely understand it myself

/**
 * Reduce a list of RGBA colors down to at most `maxColors` representative colors.
 * colors: array of {r,g,b,a} (0-255 each)
 * Returns: { palette, mapped }
 *   palette = up to maxColors {r,g,b,a} objects
 *   mapped  = original array, each color replaced by its nearest palette color
 */
function quantizeColors(colors, maxColors = 256) {
  const nearestColor = function (c, palette) {
    let best = palette[0];
    let bestDist = Infinity;
    for (const p of palette) {
      const d = (c.r - p.r) ** 2 + (c.g - p.g) ** 2 + (c.b - p.b) ** 2 + (c.a - p.a) ** 2;
      if (d < bestDist) {
        bestDist = d;
        best = p;
      }
    }
    return best;
  }

  // 1. Count frequency of each exact color (helps weight + dedupe)
  const freqMap = new Map();
  for (const c of colors) {
    const key = `${c.r},${c.g},${c.b},${c.a}`;
    if (freqMap.has(key)) {
      freqMap.get(key).count++;
    } else {
      freqMap.set(key, { r: c.r, g: c.g, b: c.b, a: c.a, count: 1 });
    }
  }
  const uniqueColors = [...freqMap.values()];

  // Already under the limit? Nothing to do.
  if (uniqueColors.length <= maxColors) {
    const palette = uniqueColors.map(({ r, g, b, a }) => ({ r, g, b, a }));
    return { palette, mapped: colors.map(c => nearestColor(c, palette)) };
  }

  // 2. Median cut: recursively split buckets along their widest channel
  function channelRange(bucket, channel) {
    let min = 255, max = 0;
    for (const c of bucket) {
      if (c[channel] < min) min = c[channel];
      if (c[channel] > max) max = c[channel];
    }
    return max - min;
  }

  function widestChannel(bucket) {
    const ranges = {
      r: channelRange(bucket, "r"),
      g: channelRange(bucket, "g"),
      b: channelRange(bucket, "b"),
      a: channelRange(bucket, "a"),
    };
    return Object.entries(ranges).sort((a, b) => b[1] - a[1])[0][0];
  }

  function medianCut(buckets, targetCount) {
    while (buckets.length < targetCount) {
      // Find the bucket with the most "spread" to split next (by weighted count)
      let splitIdx = 0;
      let splitScore = -1;
      buckets.forEach((bucket, i) => {
        if (bucket.length < 2) return;
        const channel = widestChannel(bucket);
        const score = channelRange(bucket, channel) * bucket.length;
        if (score > splitScore) {
          splitScore = score;
          splitIdx = i;
        }
      });

      const bucket = buckets[splitIdx];
      if (bucket.length < 2) break; // can't split further

      const channel = widestChannel(bucket);
      bucket.sort((a, b) => a[channel] - b[channel]);

      // Split at the weighted median (accounts for pixel frequency, not just count of unique colors)
      const totalWeight = bucket.reduce((s, c) => s + c.count, 0);
      let acc = 0, mid = 0;
      for (let i = 0; i < bucket.length; i++) {
        acc += bucket[i].count;
        if (acc >= totalWeight / 2) {
          mid = i + 1;
          break;
        }
      }
      mid = Math.max(1, Math.min(mid, bucket.length - 1));

      const bucketA = bucket.slice(0, mid);
      const bucketB = bucket.slice(mid);

      buckets.splice(splitIdx, 1, bucketA, bucketB);
    }
    return buckets;
  }

  const buckets = medianCut([uniqueColors], maxColors);

  // 3. Average each bucket (weighted by frequency) into one representative color
  const palette = buckets.map(bucket => {
    let rSum = 0, gSum = 0, bSum = 0, aSum = 0, weight = 0;
    for (const c of bucket) {
      rSum += c.r * c.count;
      gSum += c.g * c.count;
      bSum += c.b * c.count;
      aSum += c.a * c.count;
      weight += c.count;
    }
    return {
      r: Math.round(rSum / weight),
      g: Math.round(gSum / weight),
      b: Math.round(bSum / weight),
      a: Math.round(aSum / weight),
    };
  });

  // 4. Map every original color to its nearest palette color
  const mapped = colors.map(c => nearestColor(c, palette));

  return { palette, mapped };
}

function Assault_EncodeHelper_NearestColorIndex(c, palettes, i, j) {
  let best = -1;
  let bestDist = Infinity;
  const palette = palettes[i][j];
  for (let i = 0; i < palette.length; i++) {
    const p = palette[i];
    const d = (c.r - p.r) ** 2 + (c.g - p.g) ** 2 + (c.b - p.b) ** 2 + (c.a - p.a) ** 2;
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  return best;
}
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

/* ----------------- Compression Type Specific Code ----------- */


function Assault_EncodeLayer1(index) { 
  const curData = g_AllTextureData[index];
  const numberOfPixelsToBytesRatio = getPixelsToByteRatio(curData.TextureLayer); // 0.5

  const { downloadSegment, downloadSegmentColors, descriptions, warnings, errors, compressedImage, offsetToStartOfPixels, offsetToStartOfColors, fileSize } = Assault_EncodeHelper_HeaderAndSetup(index, 0);
  const view = new DataView(downloadSegment);
  const addDataToFile = (offset, value, pixelID) => {
    offset += offsetToStartOfPixels;
    descriptions[offset] = {
      description: `Pixel ID ${pixelID} color - rgb565, alpha channel is always 255`,
      type: "2 Byte Integer (unsigned)"
    };
    console.assert(offset != undefined);
    view.setUint16(offset, value);
  };

  const { w, h } = getGridSizes(curData.TextureLayer);
  let currentMipMapOffset = 0;
  for (let mipmapNum = 0; mipmapNum < curData.pixels.length; mipmapNum++) {
    const curWidthMax = curData.width >> mipmapNum;
    const curHeightMax = curData.height >> mipmapNum;

    for (let pixelID = 0; pixelID < curData.pixels[mipmapNum].length; pixelID++) {
      const curPixel = curData.pixels[mipmapNum][pixelID];
      const u16Color = Assault_EncodeHelper_rgbaToU16(curPixel, 1);

      // recover this pixel's actual (x, y) in the full mipmap image
      const x = pixelID % curWidthMax;
      const y = Math.floor(pixelID / curWidthMax);

      // which grid cell it falls into
      const grid = pixelIDtoGrid(curWidthMax, curData.TextureLayer, pixelID);
      const localX = x % w;
      const localY = y % h;
      const pixelNumInGrid = localY * w + localX;

      const offset = (grid * (w * h) + pixelNumInGrid) / numberOfPixelsToBytesRatio; // 2 bytes per pixel
      addDataToFile(currentMipMapOffset+offset, u16Color, pixelID);
    }
    currentMipMapOffset += (curWidthMax*curHeightMax)/numberOfPixelsToBytesRatio;
  }

  return { downloadSegment, downloadSegmentColors, descriptions, warnings, errors, compressedImage, offsetToStartOfPixels, offsetToStartOfColors, fileSize };
}
function Assault_EncodeLayer2(index) {
  const curData = g_AllTextureData[index];
  const numberOfPixelsToBytesRatio = getPixelsToByteRatio(curData.TextureLayer); // 0.5

  const { downloadSegment, downloadSegmentColors, descriptions, warnings, errors, compressedImage, offsetToStartOfPixels, offsetToStartOfColors, fileSize } = Assault_EncodeHelper_HeaderAndSetup(index, 0);
  const view = new DataView(downloadSegment);
  const addDataToFile = (offset, value, pixelID) => {
    offset += offsetToStartOfPixels;
    descriptions[offset] = {
      description: `Pixel ID ${pixelID} color - rgb555 or rgba4443 depending on mode bit`,
      type: "2 Byte Integer (unsigned)"
    };
    console.assert(offset != undefined);
    view.setUint16(offset, value);
  };

  const { w, h } = getGridSizes(curData.TextureLayer);
  let currentMipMapOffset = 0;
  for (let mipmapNum = 0; mipmapNum < curData.pixels.length; mipmapNum++) {
    const curWidthMax = curData.width >> mipmapNum;
    const curHeightMax = curData.height >> mipmapNum;

    for (let pixelID = 0; pixelID < curData.pixels[mipmapNum].length; pixelID++) {
      const curPixel = curData.pixels[mipmapNum][pixelID];
      const u16Color = Assault_EncodeHelper_rgbaToU16(curPixel, 2);

      // recover this pixel's actual (x, y) in the full mipmap image
      const x = pixelID % curWidthMax;
      const y = Math.floor(pixelID / curWidthMax);

      // which grid cell it falls into
      const grid = pixelIDtoGrid(curWidthMax, curData.TextureLayer, pixelID);
      const localX = x % w;
      const localY = y % h;
      const pixelNumInGrid = localY * w + localX;

      const offset = (grid * (w * h) + pixelNumInGrid) / numberOfPixelsToBytesRatio; // 2 bytes per pixel
      addDataToFile(currentMipMapOffset+offset, u16Color, pixelID);
    }
    currentMipMapOffset += (curWidthMax*curHeightMax)/numberOfPixelsToBytesRatio;
  }

  return { downloadSegment, downloadSegmentColors, descriptions, warnings, errors, compressedImage, offsetToStartOfPixels, offsetToStartOfColors, fileSize };
}
function Assault_EncodeLayer3(index) {
  const curData = g_AllTextureData[index];
  const numberOfPixelsToBytesRatio = getPixelsToByteRatio(curData.TextureLayer);

  const { downloadSegment, downloadSegmentColors, descriptions, warnings, errors, compressedImage, offsetToStartOfPixels, offsetToStartOfColors, fileSize } = Assault_EncodeHelper_HeaderAndSetup(index, 0);
  const view = new DataView(downloadSegment);
  const addDataToFile = (offset, value, pixelID, colorChannel) => {
    offset += offsetToStartOfPixels;
    descriptions[offset] = {
      description: `Pixel ID ${pixelID} - ${colorChannel} channel`,
      type: "1 Byte Integer (unsigned)"
    };
    console.assert(offset != undefined);
    view.setUint8(offset, value);
  };

  const { w, h } = getGridSizes(curData.TextureLayer);
  let currentMipMapOffset = 0;

  for (let mipmapNum = 0; mipmapNum < curData.pixels.length; mipmapNum++) {
    const curWidthMax = curData.width >> mipmapNum;
    const curHeightMax = curData.height >> mipmapNum;

    for (let pixelID = 0; pixelID < curData.pixels[mipmapNum].length; pixelID++) {
      const curPixel = curData.pixels[mipmapNum][pixelID];

      // recover this pixel's actual (x, y) in the full mipmap image
      const x = pixelID % curWidthMax;
      const y = Math.floor(pixelID / curWidthMax);

      // which grid cell it falls into
      const grid = pixelIDtoGrid(curWidthMax, curData.TextureLayer, pixelID);
      const localX = x % w;
      const localY = y % h;
      const pixelNumInGrid = localY * w + localX;

      const offset = ((4* grid * (w * h)) + (2*pixelNumInGrid)); // 4 bytes per pixel, but split up for some reason
      addDataToFile(currentMipMapOffset+offset+0x00, curPixel.a, pixelID, "alpha");
      addDataToFile(currentMipMapOffset+offset+0x01, curPixel.r, pixelID, "red");
      addDataToFile(currentMipMapOffset+offset+0x20, curPixel.g, pixelID, "green");
      addDataToFile(currentMipMapOffset+offset+0x21, curPixel.b, pixelID, "blue");
    }
    currentMipMapOffset += (curWidthMax*curHeightMax)/numberOfPixelsToBytesRatio;
  }

  return { downloadSegment, downloadSegmentColors, descriptions, warnings, errors, compressedImage, offsetToStartOfPixels, offsetToStartOfColors, fileSize };
}
// This is like 99% claude. I don't fully know a good way to write this myself
function Assault_EncodeLayer4(index) {
  // 'bbox' - per-channel min/max bounding box corners
  // 'extremes' - actual farthest-apart pixel pair in the block (usually more accurate)
  const cfg = 'bbox';

  const curData = g_AllTextureData[index];
  const numberOfPixelsToBytesRatio = getPixelsToByteRatio(curData.TextureLayer);

  const { downloadSegment, downloadSegmentColors, descriptions, warnings, errors, compressedImage, offsetToStartOfPixels, offsetToStartOfColors, fileSize } = Assault_EncodeHelper_HeaderAndSetup(index, 0);
  const view = new DataView(downloadSegment);
  const addPixelDataToFile = (offset, color1, color2, blends, pixelID) => {
    offset += offsetToStartOfPixels;
    console.assert(offset < offsetToStartOfColors);
    console.assert(offset != undefined);
    descriptions[offset] = { description: `Color Blend 1 RGB565 format`, type: "2 Byte Integer (unsigned)" };
    descriptions[offset+2] = { description: `Color Blend 2 RGB565 format`, type: "2 Byte Integer (unsigned)" };
    descriptions[offset+4] = { description: `4x4 Grid starting at top left Pixel ID ${pixelID} - Every 2 bits represent a blend of the 2 colors before it in the file. If color 2 > color 1 and all bits are on, its a transparent pixel.`, type: "4 Byte Integer (unsigned)" };
    view.setUint16(offset, color1);
    view.setUint16(offset+2, color2);
    view.setUint32(offset+4, blends);
  };

  const packRGB565 = (r, g, b) => {
    return Assault_EncodeHelper_rgbaToU16({ r, g, b, a: 255 }, 1);
  };
  const unpack565 = (c) => {
    return Assault_getColorFromU16(c, 1);
  };
  // exact match to the game's Assault_parseLayer4 decode math: c1 + floor((c2-c1)*n/8)
  const deriveN = (c1, c2, n) => c1 + Math.floor((c2 - c1) * n / 8);

  const chooseEndpoints_bbox = (pixels) => {
    let minR=255,minG=255,minB=255,maxR=0,maxG=0,maxB=0;
    for (const p of pixels) {
      if (p.r<minR)minR=p.r; if(p.g<minG)minG=p.g; if(p.b<minB)minB=p.b;
      if (p.r>maxR)maxR=p.r; if(p.g>maxG)maxG=p.g; if(p.b>maxB)maxB=p.b;
    }
    return { hi: packRGB565(maxR,maxG,maxB), lo: packRGB565(minR,minG,minB) };
  };
  const chooseEndpoints_extremes = (pixels) => {
    let bestDist=-1, a=pixels[0], b=pixels[0];
    for (let i=0;i<pixels.length;i++) for (let j=i+1;j<pixels.length;j++) {
      const p1=pixels[i], p2=pixels[j];
      const d=(p1.r-p2.r)**2+(p1.g-p2.g)**2+(p1.b-p2.b)**2;
      if (d>bestDist){bestDist=d;a=p1;b=p2;}
    }
    return { hi: packRGB565(a.r,a.g,a.b), lo: packRGB565(b.r,b.g,b.b) };
  };
  const chooseEndpoints = (pixels) => cfg.endpointMode === 'extremes'
    ? chooseEndpoints_extremes(pixels) : chooseEndpoints_bbox(pixels);

  const encodeSmallBlock = (curData, mipmapNum, curWidthMax, startX, startY) => {
    const blockPixels = [];
    for (let row=0; row<4; row++) for (let col=0; col<4; col++) {
      const px=startX+col, py=startY+row;
      blockPixels.push(curData.pixels[mipmapNum][py*curWidthMax+px]);
    }
    const hasTransparency = blockPixels.some(p=>p.a===0);
    const opaquePixels = blockPixels.filter(p=>p.a!==0);
    const sourcePixels = opaquePixels.length ? opaquePixels : blockPixels;
    const { hi, lo } = chooseEndpoints(sourcePixels);

    let color1, color2;
    if (hasTransparency) {
      color1 = Math.min(hi, lo); color2 = Math.max(hi, lo); // punch-through: color1 <= color2
      if (color1===color2 && color2<0xFFFF) color2 += 1;
    } else {
      color1 = Math.max(hi, lo); color2 = Math.min(hi, lo); // opaque: color1 > color2
      if (color1===color2) { color1 = color1<0xFFFF?color1+1:color1; color2 = color1-1; }
    }
    const e1 = unpack565(color1), e2 = unpack565(color2);

    // n values matched exactly to Assault_parseLayer4's lookup tables
    const palette = hasTransparency
      ? [ e1, e2,
          { r:deriveN(e1.r,e2.r,4), g:deriveN(e1.g,e2.g,4), b:deriveN(e1.b,e2.b,4) }, // half-blend, n=4
          null ] // index3 = transparent
      : [ e1, e2,
          { r:deriveN(e1.r,e2.r,3), g:deriveN(e1.g,e2.g,3), b:deriveN(e1.b,e2.b,3) }, // n=3 (3/8)
          { r:deriveN(e1.r,e2.r,5), g:deriveN(e1.g,e2.g,5), b:deriveN(e1.b,e2.b,5) } ]; // n=5 (5/8)

    let blends = 0;
    for (let i=0; i<16; i++) {
      const p = blockPixels[i];
      let bestIndex = 0;
      if (hasTransparency && p.a===0) {
        bestIndex = 3;
      } else {
        let bestDist = Infinity;
        const candidates = hasTransparency ? 3 : 4;
        for (let idx=0; idx<candidates; idx++) {
          const c = palette[idx];
          const d = (p.r-c.r)**2+(p.g-c.g)**2+(p.b-c.b)**2;
          if (d<bestDist) { bestDist=d; bestIndex=idx; }
        }
      }
      blends |= (bestIndex << (30 - 2*i)); // matches parser's shift = 30 - 2*inBlockIndex
    }
    return { color1, color2, blends: blends>>>0 };
  };

  const { w, h } = getGridSizes(curData.TextureLayer);
  const smallBlockByteSize = ((w*h)/numberOfPixelsToBytesRatio) / 4;
  let currentMipMapOffset = 0;

  for (let mipmapNum=0; mipmapNum<curData.pixels.length; mipmapNum++) {
    const curWidthMax = curData.width >> mipmapNum;
    const curHeightMax = curData.height >> mipmapNum;
    for (let by=0; by<curHeightMax; by+=h) {
      for (let bx=0; bx<curWidthMax; bx+=w) {
        const bigPixelID = by*curWidthMax+bx;
        const grid = pixelIDtoGrid(curWidthMax, curData.TextureLayer, bigPixelID);
        const bigBlockOffset = grid * (w*h) / numberOfPixelsToBytesRatio;
        for (let blockRow=0; blockRow<2; blockRow++) {
          for (let blockCol=0; blockCol<2; blockCol++) {
            const smallBlockNumber = blockRow*2+blockCol;
            const startX = bx+blockCol*4, startY = by+blockRow*4;
            const smallPixelID = startY*curWidthMax+startX;
            const { color1, color2, blends } = encodeSmallBlock(curData, mipmapNum, curWidthMax, startX, startY);
            const offset = bigBlockOffset + smallBlockNumber*smallBlockByteSize;
            addPixelDataToFile(currentMipMapOffset+offset, color1, color2, blends, smallPixelID);
          }
        }
      }
    }
    currentMipMapOffset += (curWidthMax*curHeightMax)/numberOfPixelsToBytesRatio;
  }

  return { downloadSegment, downloadSegmentColors, descriptions, warnings, errors, compressedImage, offsetToStartOfPixels, offsetToStartOfColors, fileSize };
}
// This has separate color and pixel data.
function Assault_EncodeLayer5(index) {
  const curData = g_AllTextureData[index];
  const numberOfPixelsToBytesRatio = getPixelsToByteRatio(curData.TextureLayer);

  const { allIndexToUse, indexToColor, biggestPalette_size } = Assault_EncodeHelper_PrepareForAllPalettes(index, Math.min(0xFFFF, data_getMaxRecommendedColorsSize(index)));

  const { downloadSegment, downloadSegmentColors, descriptions, warnings, errors, compressedImage, offsetToStartOfPixels, offsetToStartOfColors, fileSize } = Assault_EncodeHelper_HeaderAndSetup(index, biggestPalette_size);
  
  const view = new DataView(downloadSegment);
  const addPixelDataToFile = (offset, value, pixelID) => {
    offset += offsetToStartOfPixels;
    console.assert(offset < offsetToStartOfColors);
    console.assert(offset != undefined);
    descriptions[offset] = {
      description: `Pixel ID ${pixelID} and ${pixelID+1} - color index for each pixel ID`,
      type: "2 4 bit Integers (unsigned)"
    };
    view.setUint8(offset, value);
  };

  const { w, h } = getGridSizes(curData.TextureLayer);
  for (let pixelID = 0; pixelID < allIndexToUse.length; pixelID+=2) {
    const index1 = allIndexToUse[pixelID];
    const index2 = allIndexToUse[pixelID+1];

    // recover this pixel's actual (x, y) in the full mipmap image
    const x = pixelID % curData.width;
    const y = Math.floor(pixelID / curData.width);

    // which grid cell it falls into
    const grid = pixelIDtoGrid(curData.width, curData.TextureLayer, pixelID);
    const localX = x % w;
    const localY = y % h;
    const pixelNumInGrid = localY * w + localX;

    const offset = ((grid * (w * h)) + (pixelNumInGrid)) / numberOfPixelsToBytesRatio;
    addPixelDataToFile(offset, (index1 << 4) | (index2), pixelID);
  }

  // write color data for this texture file only
  Assault_EncodeHelper_applyAllColors(view, offsetToStartOfColors, indexToColor[0], curData.colorType, biggestPalette_size);

  return { downloadSegment, downloadSegmentColors, descriptions, warnings, errors, compressedImage, offsetToStartOfPixels, offsetToStartOfColors, fileSize, indexToColor, biggestPalette_size };
}
// This has separate color and pixel data.
function Assault_EncodeLayer6(index) {
  const curData = g_AllTextureData[index];
  const numberOfPixelsToBytesRatio = getPixelsToByteRatio(curData.TextureLayer);

  const { allIndexToUse, indexToColor, biggestPalette_size } = Assault_EncodeHelper_PrepareForAllPalettes(index, Math.min(0xFFFF, data_getMaxRecommendedColorsSize(index)));

  const { downloadSegment, downloadSegmentColors, descriptions, warnings, errors, compressedImage, offsetToStartOfPixels, offsetToStartOfColors, fileSize } = Assault_EncodeHelper_HeaderAndSetup(index, biggestPalette_size);
  
  const view = new DataView(downloadSegment);
  const addPixelDataToFile = (offset, value, pixelID) => {
    offset += offsetToStartOfPixels;
    console.assert(offset != undefined);
    descriptions[offset] = {
      description: `Pixel ID ${pixelID} - color index for this pixel ID`,
      type: "1 Byte Integer (unsigned)"
    };
    view.setUint8(offset, value);
  };

  const { w, h } = getGridSizes(curData.TextureLayer);
  for (let pixelID = 0; pixelID < allIndexToUse.length; pixelID++) {
    const colIndex = allIndexToUse[pixelID];

    // recover this pixel's actual (x, y) in the full mipmap image
    const x = pixelID % curData.width;
    const y = Math.floor(pixelID / curData.width);

    // which grid cell it falls into
    const grid = pixelIDtoGrid(curData.width, curData.TextureLayer, pixelID);
    const localX = x % w;
    const localY = y % h;
    const pixelNumInGrid = localY * w + localX;

    const offset = ((grid * (w * h)) + (pixelNumInGrid)) / numberOfPixelsToBytesRatio;
    addPixelDataToFile(offset, colIndex, pixelID);
  }

  // write color data for this texture file only
  Assault_EncodeHelper_applyAllColors(view, offsetToStartOfColors, indexToColor[0], curData.colorType, biggestPalette_size);

  return { downloadSegment, downloadSegmentColors, descriptions, warnings, errors, compressedImage, offsetToStartOfPixels, offsetToStartOfColors, fileSize, indexToColor, biggestPalette_size };
}
// This has separate color and pixel data.
function Assault_EncodeLayer7(index) {
  const curData = g_AllTextureData[index];
  const numberOfPixelsToBytesRatio = getPixelsToByteRatio(curData.TextureLayer);

  const { allIndexToUse, indexToColor, biggestPalette_size } = Assault_EncodeHelper_PrepareForAllPalettes(index, Math.min(0xFFFF, data_getMaxRecommendedColorsSize(index)));

  const { downloadSegment, downloadSegmentColors, descriptions, warnings, errors, compressedImage, offsetToStartOfPixels, offsetToStartOfColors, fileSize } = Assault_EncodeHelper_HeaderAndSetup(index, biggestPalette_size);
  
  const view = new DataView(downloadSegment);
  const addPixelDataToFile = (offset, value, pixelID) => {
    offset += offsetToStartOfPixels;
    console.assert(offset != undefined);
    descriptions[offset] = {
      description: `Pixel ID ${pixelID} - color index for this pixel ID`,
      type: "2 Byte Integer (unsigned)"
    };
    view.setUint16(offset, value);
  };

  const { w, h } = getGridSizes(curData.TextureLayer);
  for (let pixelID = 0; pixelID < allIndexToUse.length; pixelID++) {
    const colIndex = allIndexToUse[pixelID];

    // recover this pixel's actual (x, y) in the full mipmap image
    const x = pixelID % curData.width;
    const y = Math.floor(pixelID / curData.width);

    // which grid cell it falls into
    const grid = pixelIDtoGrid(curData.width, curData.TextureLayer, pixelID);
    const localX = x % w;
    const localY = y % h;
    const pixelNumInGrid = localY * w + localX;

    const offset = ((grid * (w * h)) + (pixelNumInGrid)) / numberOfPixelsToBytesRatio;
    addPixelDataToFile(offset, colIndex, pixelID);
  }

  // write color data for this texture file only
  Assault_EncodeHelper_applyAllColors(view, offsetToStartOfColors, indexToColor[0], curData.colorType, biggestPalette_size);

  return { downloadSegment, downloadSegmentColors, descriptions, warnings, errors, compressedImage, offsetToStartOfPixels, offsetToStartOfColors, fileSize, indexToColor, biggestPalette_size };
}

function Assault_EncodeLayer10(index) {
  const curData = g_AllTextureData[index];
  const numberOfPixelsToBytesRatio = getPixelsToByteRatio(curData.TextureLayer);

  const { downloadSegment, downloadSegmentColors, descriptions, warnings, errors, compressedImage, offsetToStartOfPixels, offsetToStartOfColors, fileSize } = Assault_EncodeHelper_HeaderAndSetup(index, 0);
  const view = new DataView(downloadSegment);
  const addPixelDataToFile = (offset, value, pixelID) => {
    offset += offsetToStartOfPixels;
    console.assert(offset != undefined);
    descriptions[offset] = {
      description: `Pixel ID ${pixelID} - value for all channels`,
      type: "1 Byte Integer (unsigned)"
    };
    view.setUint8(offset, value);
  };

  const { w, h } = getGridSizes(curData.TextureLayer);
  let currentMipMapOffset = 0;

  for (let mipmapNum = 0; mipmapNum < curData.pixels.length; mipmapNum++) {
    const curWidthMax = curData.width >> mipmapNum;
    const curHeightMax = curData.height >> mipmapNum;

    for (let pixelID = 0; pixelID < curData.pixels[mipmapNum].length; pixelID++) {
      const curPixel = curData.pixels[mipmapNum][pixelID];
      const value = (curPixel.r + curPixel.g + curPixel.b + curPixel.a) / 4;

      // recover this pixel's actual (x, y) in the full mipmap image
      const x = pixelID % curWidthMax;
      const y = Math.floor(pixelID / curWidthMax);

      // which grid cell it falls into
      const grid = pixelIDtoGrid(curWidthMax, curData.TextureLayer, pixelID);
      const localX = x % w;
      const localY = y % h;
      const pixelNumInGrid = localY * w + localX;

      const offset = ((grid * (w * h)) + (pixelNumInGrid)) / numberOfPixelsToBytesRatio;
      addPixelDataToFile(currentMipMapOffset+offset, value, pixelID);
    }
    currentMipMapOffset += (curWidthMax*curHeightMax)/numberOfPixelsToBytesRatio;
  }

  return { downloadSegment, downloadSegmentColors, descriptions, warnings, errors, compressedImage, offsetToStartOfPixels, offsetToStartOfColors, fileSize };
}
function Assault_EncodeLayer11(index) {
  const curData = g_AllTextureData[index];
  const numberOfPixelsToBytesRatio = getPixelsToByteRatio(curData.TextureLayer);

  const { downloadSegment, downloadSegmentColors, descriptions, warnings, errors, compressedImage, offsetToStartOfPixels, offsetToStartOfColors, fileSize } = Assault_EncodeHelper_HeaderAndSetup(index, 0);
  const view = new DataView(downloadSegment);
  const addPixelDataToFile = (offset, value, pixelID) => {
    offset += offsetToStartOfPixels;
    console.assert(offset != undefined);
    descriptions[offset] = {
      description: `Pixel ID ${pixelID} - First byte is color of RGB channels, second byte is for alpha channel`,
      type: "2 Byte Integer (unsigned)"
    };
    view.setUint16(offset, value);
  };

  const { w, h } = getGridSizes(curData.TextureLayer);
  let currentMipMapOffset = 0;

  for (let mipmapNum = 0; mipmapNum < curData.pixels.length; mipmapNum++) {
    const curWidthMax = curData.width >> mipmapNum;
    const curHeightMax = curData.height >> mipmapNum;

    for (let pixelID = 0; pixelID < curData.pixels[mipmapNum].length; pixelID++) {
      const curPixel = curData.pixels[mipmapNum][pixelID];
      const valueRGB = (curPixel.r + curPixel.g + curPixel.b) / 3;
      const valueA = curPixel.a;

      // recover this pixel's actual (x, y) in the full mipmap image
      const x = pixelID % curWidthMax;
      const y = Math.floor(pixelID / curWidthMax);

      // which grid cell it falls into
      const grid = pixelIDtoGrid(curWidthMax, curData.TextureLayer, pixelID);
      const localX = x % w;
      const localY = y % h;
      const pixelNumInGrid = localY * w + localX;

      const offset = ((grid * (w * h)) + (pixelNumInGrid)) / numberOfPixelsToBytesRatio;
      addPixelDataToFile(currentMipMapOffset+offset, (valueA << 8) | valueRGB, pixelID);
    }
    currentMipMapOffset += (curWidthMax*curHeightMax)/numberOfPixelsToBytesRatio;
  }

  return { downloadSegment, downloadSegmentColors, descriptions, warnings, errors, compressedImage, offsetToStartOfPixels, offsetToStartOfColors, fileSize };
}

// If a texture doesn't have pixel data it runs this. Just grabs color data from a previous texture and writes it to its file information
function Assault_EncodeColorOnly(index) {
  const cantEncode = function() {
    const { downloadSegment, downloadSegmentColors, descriptions, warnings, errors, compressedImage, offsetToStartOfPixels, offsetToStartOfColors, fileSize } = Assault_EncodeHelper_HeaderAndSetup(index, 0);
    errors.push(`Failed to find valid pixel/color Data before this texture. Ensure a texture before this one doesn't have "Only Save Color Information" and is the same compression type.`);
    return { downloadSegment, downloadSegmentColors, descriptions, warnings, errors, compressedImage, offsetToStartOfPixels, offsetToStartOfColors, fileSize };
  }

  const curData = g_AllTextureData[index];
  const textureWithPixelData = data_getTextureWithPixelData(index) ?? -1;
  if (textureWithPixelData == -1) {
    return cantEncode();
  }

  const indexToColor = g_allFileProcessedInformation[textureWithPixelData+1].indexToColor;
  const numberOfColors = g_allFileProcessedInformation[textureWithPixelData+1].biggestPalette_size || 0;
  const { downloadSegment, downloadSegmentColors, descriptions, warnings, errors, compressedImage, offsetToStartOfPixels, offsetToStartOfColors, fileSize } = Assault_EncodeHelper_HeaderAndSetup(index, numberOfColors);
  const view = new DataView(downloadSegment);

  if (numberOfColors != 0 && indexToColor != undefined && indexToColor[index-textureWithPixelData] != undefined) {
    Assault_EncodeHelper_applyAllColors(view, offsetToStartOfColors, indexToColor[index-textureWithPixelData], curData.colorType, numberOfColors);
  } else {
    return cantEncode();
  }

  return { downloadSegment, downloadSegmentColors, descriptions, warnings, errors, compressedImage, offsetToStartOfPixels, offsetToStartOfColors, fileSize };
}