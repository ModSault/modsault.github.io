// This file contains information to modify the giant data structure that has everything for the texture files

/* ------------- getters ---------- */

function getGridSizes(textureLayer) {
  switch (textureLayer) {
    case 1:
    case 2:
    case 3:
    case 11:
      return { "w": 4, "h": 4 };
    case 10:
    case 6:
    case 7:
      return { "w": 8, "h": 4 };
    case 4:
    case 5:
    case 12:
      return { "w": 8, "h": 8 };
    default:
      return { "w": 0, "h": 0 };
  }
}

// 0.25 means 4 bytes for 1 pixel
function getPixelsToByteRatio(textureLayer) {
  switch (textureLayer) {
    case 1:
    case 2:
    case 7:
    case 11:
      return 0.5;
    case 3:
      return 0.25;
    case 4:
    case 5:
    case 12:
      return 2;
    case 6:
    case 10:
      return 1;
    default:
      return 0;
  }
}

function data_getIDPretty(index) {
  const id = g_AllTextureData[index].id;
  return id.toString(16).toUpperCase().padStart(8, "0");
}
function data_hasColorData(index) {
  return ([5,6,7]).includes(g_AllTextureData[index].TextureLayer);
}

function data_getMipMapMaxCount(index) {
  const { w, h } = getGridSizes(g_AllTextureData[index].TextureLayer);
  const width_maxNumberTextures = Math.floor(Math.log2(g_AllTextureData[index].width / w) + 1);
  const height_maxNumberTextures = Math.floor(Math.log2(g_AllTextureData[index].height / h) + 1);
  let toReturn = Math.min(width_maxNumberTextures, height_maxNumberTextures);
  if (toReturn == Infinity || toReturn == !Infinity || isNaN(toReturn))
    toReturn = 1;
  while (
    ((g_AllTextureData[index].width >> (toReturn-1)) % w !== 0) ||
    ((g_AllTextureData[index].height >> (toReturn-1)) % h !== 0)
  ) {
    toReturn--; // ensure mipmaps are still divisible by grid size
    if (toReturn < 2) break;
  }
  toReturn = Math.max(1, toReturn);
  return toReturn;
}

// return 256 if `256 total colors` compression type, etc..
// return 0 if compression type has no separate color data
function data_getMaxRecommendedColorsSize(index) {
  const textureLayer = g_AllTextureData[index].TextureLayer;
  if (!data_hasColorData(index))
    return 0;
  return ([0x10, 0x100, 0x10000])[textureLayer-5];
}


// looks at colors data and sees info from it
function data_getUsedAndNot(index, paletteIndex) {
  const curData = g_AllTextureData[index];
  const maxIndexToLookAt = data_getMaxRecommendedColorsSize(index);

  let amtUsed = 0, amtNotUsed = 0;
    for (let i = 0; i < Math.min(maxIndexToLookAt, curData.colors[paletteIndex].length); i++) {
    const isReplaceable = curData.colors[paletteIndex][i].used;
    amtUsed += isReplaceable;
    amtNotUsed += !isReplaceable
  }
  return { amtUsed, amtNotUsed };
}

// ------------ getters: used for knowing how many adjacent textures should be updated as well (usually for encoding) ------------------

function data_getTextureWithPixelData(index) {
  if (index < 0)
    return undefined;
  if (index >= g_AllTextureData.length)
    return undefined;
  if (!data_hasColorData(index))
    return index;
  if (!g_AllTextureData[index].colorOnly)
    return index;

  for (let i = index-1; i >= 0; i--) {
    if (!g_AllTextureData[i].colorOnly) {
      return i;
    }
  }
  return undefined;
}
function data_getNumberOfExternalPalettes(index) {
  if (index < 0 || index >= g_AllTextureData.length)
    return 0;
  if (index == undefined || index == -1)
    return 0;
  if (!data_hasColorData(index))
    return 0;

  let toReturn = 0;
  for (let i = index+1;
            i < g_AllTextureData.length &&
            g_AllTextureData[i].colorOnly &&
            data_hasColorData(i);
      i++) {
    toReturn++;
  }
  return toReturn;
}
function date_getReEncodeListOnChange(index) {
  const startingIndex = data_getTextureWithPixelData(index) ?? index;
  const numAdditional = data_getNumberOfExternalPalettes(startingIndex);
  const toReturn = [];
  for (let i = 0; i <= numAdditional; i++) {
    toReturn.push(i+startingIndex);
  }
  return toReturn;
}

/* ------------------- Setters ------------------- */

function data_addNewTexture(name) {
  g_AllTextureData.push({
    "name": name,
    "width": 0,
    "height": 0,
    "colorOnly": false,
    "colorType": 2,
    "TextureLayer": 6,
    "id": 0x1000FFFF,
    "pixels": [],
    "colors": []
  });
  g_wasFileChanged = true;
}
function data_addNewTextureFromScratch() {
  const index = g_AllTextureData.length;
  data_addNewTexture(`Custom Texture ${index}`);
  data_setWidth(index, 1, false);
  data_setHeight(index, 1, true);
  refreshAllFiles();
  data_recalculateAllInIndex(index);
}

// updates: "colors": []
function data_addNewColor(index, paletteIndex, r, g, b, a, used = false) {
  while (g_AllTextureData[index].colors.length <= paletteIndex) {
    g_AllTextureData[index].colors.push([]);
  }

  const newIndex = g_AllTextureData[index].colors[paletteIndex].length;
  g_AllTextureData[index].colors[paletteIndex].push({
    "r": 0,
    "g": 0,
    "b": 0,
    "a": 0,
    "used": true
  });
  data_setColorData(index, paletteIndex, newIndex, "r", r);
  data_setColorData(index, paletteIndex, newIndex, "g", g);
  data_setColorData(index, paletteIndex, newIndex, "b", b);
  data_setColorData(index, paletteIndex, newIndex, "a", a);
  data_setColorData(index, paletteIndex, newIndex, "used", used);
}
// updates: "colors": []
function data_setColorData(index, paletteIndex, colorIndex, type, newValue) {
  const curColor = g_AllTextureData[index].colors[paletteIndex][colorIndex];
  if (curColor == undefined)
    return;

  switch(type) {
    case "r":
    case "g":
    case "b":
    case "a":
      curColor[type] = Math.min(255, Math.max(0, newValue));
      break;
    case "used":
      curColor[type] = Boolean(newValue);
      break;
    default:
      console.warn(`Unknown Color Key ${type}`);
  }
  g_wasFileChanged = true;
}

// Makes all images in this file the proper size
// updates: "pixels": []
function data_resizeTextures(index) {
  const allData = g_AllTextureData[index].pixels;
  const { w, h } = getGridSizes(g_AllTextureData[index].TextureLayer);
  let width = g_AllTextureData[index].width;
  let height = g_AllTextureData[index].height;
  for (let i = 0; i < allData.length; i++) {
    const curTexture = allData[i];
    if (width < w) width = 0;
    if (height < h) height = 0;
    while (curTexture.length < width*height) {
      data_addPixel(index, i, 0, 0, 0, 0);
    }
    allData[i] = curTexture.splice(0, width*height);

    if (!data_hasColorData(index)) {
      width = width >> 1;
      height = height >> 1;
    }
  }
  g_wasFileChanged = true;
}
// updates: "pixels": []
function data_clearMipMap(index, mipmapIndex) {
  const allData = g_AllTextureData[index].pixels[mipmapIndex];
  for (let i = 0; i < allData.length; i++) {
    data_setPixel(index, mipmapIndex, i, "r", 0);
    data_setPixel(index, mipmapIndex, i, "g", 0);
    data_setPixel(index, mipmapIndex, i, "b", 0);
    data_setPixel(index, mipmapIndex, i, "a", 0);
  }
}
// If there are palettes outside of this texture (only present in vanilla with Vs mode characters)
// ensure they all function the same
function data_makeExternalPalettesTheSame(index, resize) {
  if (!data_hasColorData(index)) return;

  for (const i of date_getReEncodeListOnChange(index)) {
    if (i == index) continue;
    g_AllTextureData[i].width = g_AllTextureData[index].width;
    g_AllTextureData[i].height = g_AllTextureData[index].height;
    g_AllTextureData[i].TextureLayer = g_AllTextureData[index].TextureLayer;
    g_AllTextureData[i].colorType = g_AllTextureData[index].colorType;
    if (resize)
      data_resizeTextures(i);
  }
}

// sets width to proper value and ensures image is correct size (if resize is true)
function data_setWidth(index, newWidth, resize = true) {
  const { w, h } = getGridSizes(g_AllTextureData[index].TextureLayer);

  newWidth = Math.min(0xFFFF, Math.max(0, newWidth));
  if (newWidth == 0) {
    g_AllTextureData[index].height = 0;
    g_AllTextureData[index].width = 0;
  } else {
    let fixedWidth = Math.max(w, newWidth);
    if (w !== 0) fixedWidth = Math.max(w, newWidth - (newWidth % w));
    g_AllTextureData[index].width = fixedWidth;
    g_AllTextureData[index].height = Math.max(h, g_AllTextureData[index].height);
  }

  data_setNumberTextures(index, g_AllTextureData[index].pixels.length, false); // ensure not too large
  if (resize)
    data_resizeTextures(index);
  g_wasFileChanged = true;
  data_makeExternalPalettesTheSame(index, resize);
}
// sets height to proper value and ensures image is correct size (if resize is true)
function data_setHeight(index, newHeight, resize = true) {
  const { w, h } = getGridSizes(g_AllTextureData[index].TextureLayer);

  newHeight = Math.min(0xFFFF, Math.max(0, newHeight));
  if (newHeight == 0) {
    g_AllTextureData[index].width = 0;
    g_AllTextureData[index].height = 0;
  } else {
    let fixedHeight = Math.max(h, newHeight);
    if (w !== 0) fixedHeight = Math.max(h, newHeight - (newHeight % h));
    g_AllTextureData[index].height = fixedHeight;
    g_AllTextureData[index].width = Math.max(w, g_AllTextureData[index].width);
  }

  data_setNumberTextures(index, g_AllTextureData[index].pixels.length, false); // ensure not too large
  if (resize)
    data_resizeTextures(index);
  g_wasFileChanged = true;
  data_makeExternalPalettesTheSame(index, resize);
}
// updates: "id": 0x10004234
function data_setTextureID(index, newID) {
  if (typeof newID === "string") {
    newID = parseInt(newID.replace(/[^0-9a-fA-F]/g, "").substring(0,8), 16);
  }
  g_AllTextureData[index].id = Math.max(0, Math.min(0xFFFFFFFF, newID));
  g_wasFileChanged = true;
}
// updates: "colorType": 2
function data_setColorType(index, newColorType, resize = true) {
  g_AllTextureData[index].colorType = Math.min(255, Math.max(0, newColorType));
  g_wasFileChanged = true;
  data_makeExternalPalettesTheSame(index, resize);
}
// updates: "TextureLayer": 2
// this is also the compression type
function data_setTextureLayer(index, newTextureLayer, resize = true) {
  newTextureLayer = parseInt(newTextureLayer); // I hate js sometimes
  const curData = g_AllTextureData[index];

  // resize image if needed. Since their grid sizes can differ
  const { w, h } = getGridSizes(newTextureLayer);
  if (w !== 0 && curData.width % w !== 0) {
    data_setWidth(index, curData.width + w - (curData.width % w), true);
  }
  if (h !== 0 && curData.height % h !== 0) {
    data_setHeight(index, curData.height + w - (curData.height % h), true);
  }

  g_AllTextureData[index].TextureLayer = Math.max(0, Math.min(0xFF, newTextureLayer));
  g_wasFileChanged = true;
  data_setNumberTextures(index, g_AllTextureData[index].pixels.length, false); // ensure changing from palettes to mipmaps caused no problems
  if (resize) {
    data_resizeTextures(index);
  }
  data_makeExternalPalettesTheSame(index, resize);
}


// this is for number of mipmaps and palettes depending on the compression type used
function data_setNumberTextures(index, newNumber, resize = true) {
  let maxNumberTextures = data_getMipMapMaxCount(index);
  if (data_hasColorData(index))
    maxNumberTextures = newNumber; // infinite palette support

  const valueToChangeTo = Math.max(1, Math.min(maxNumberTextures, newNumber));
  const oldValue = g_AllTextureData[index].pixels.length;
  while (g_AllTextureData[index].pixels.length < valueToChangeTo) {
    g_AllTextureData[index].pixels.push([]);
  }
  g_AllTextureData[index].pixels = g_AllTextureData[index].pixels.splice(0, valueToChangeTo);

  if (resize) {
    data_resizeTextures(index);
    for (let i = oldValue; i < valueToChangeTo && !data_hasColorData(index); i++) {
      data_setMipMapToMatchHigherRes(index, i);
    }
  }
  g_wasFileChanged = true;
}
// updates: "colorOnly": false
// should only be used with Vs mode characters
function data_setIsColorOnly(index, newIsColor, resize = true) {
  g_AllTextureData[index].colorOnly = newIsColor;
  if (index != 0 && newIsColor)
    data_setNumberTextures(index, Math.max(g_AllTextureData[index].pixels.length, g_AllTextureData[index-1].pixels.length), false);
  g_wasFileChanged = true;

  data_makeExternalPalettesTheSame(data_getTextureWithPixelData(index) ?? index, resize);
}
// updates individual element within: "pixels": []
function data_setPixel(index, mipMapNum, pixelIndex, colorType, newValue) {
  g_AllTextureData[index].pixels[mipMapNum][pixelIndex][colorType] = Math.min(255, Math.max(0, newValue));
  g_wasFileChanged = true;
}
// updates individual element within: "pixels": []
function data_addPixel(index, mipMapNum, r, g, b, a) {
  g_AllTextureData[index].pixels[mipMapNum].push({
    "r": 0,
    "g": 0,
    "b": 0,
    "a": 0
  });

  const pixelIndex = g_AllTextureData[index].pixels[mipMapNum].length - 1;
  data_setPixel(index, mipMapNum, pixelIndex, "r", r);
  data_setPixel(index, mipMapNum, pixelIndex, "g", g);
  data_setPixel(index, mipMapNum, pixelIndex, "b", b);
  data_setPixel(index, mipMapNum, pixelIndex, "a", a);
  g_wasFileChanged = true;
}
// updates individual element within: g_allFileProcessedInformation.compressedImage
function data_setCompressedPixel(index, mipMapNum, pixelIndex, r, g, b, a) {
  const cur = g_allFileProcessedInformation[index+1].compressedImage[mipMapNum];
  cur[pixelIndex*4+0] = r;
  cur[pixelIndex*4+1] = g;
  cur[pixelIndex*4+2] = b;
  cur[pixelIndex*4+3] = a;
}

// when making a new mipmap or uploading a png it ensures smaller mip maps look like bigger one
// updates: "pixels": []
function data_setMipMapToMatchHigherRes(index, mipmapIndex) {
  if (mipmapIndex == 0) return;
  const curData = g_AllTextureData[index];
  const higherRes = curData.pixels[mipmapIndex - 1];
  const higherRes_w = curData.width >> (mipmapIndex - 1);
  const lowerRes = curData.pixels[mipmapIndex];
  const lowerRes_w = higherRes_w >> 1;

  const avg = (a, b, c, d) => (a + b + c + d) / 4;

  for (let i = 0; i < lowerRes.length; i++) {
    const row = Math.floor(i / lowerRes_w);
    const col = i % lowerRes_w;
    const topLeft = (row * 2) * higherRes_w + (col * 2);

    const p1 = higherRes[topLeft];
    const p2 = higherRes[topLeft + 1];
    const p3 = higherRes[topLeft + higherRes_w];
    const p4 = higherRes[topLeft + higherRes_w + 1];

    data_setPixel(index, mipmapIndex, i, "r", avg(p1.r, p2.r, p3.r, p4.r));
    data_setPixel(index, mipmapIndex, i, "g", avg(p1.g, p2.g, p3.g, p4.g));
    data_setPixel(index, mipmapIndex, i, "b", avg(p1.b, p2.b, p3.b, p4.b));
    data_setPixel(index, mipmapIndex, i, "a", avg(p1.a, p2.a, p3.a, p4.a));
  }
}

// Updates EVERYTHING when something changes in a file.
//    updateGridToSee - changes what grid to view in the preview if needed
//    reEncodeList - updates all of those indices as well (array of ints)
function data_recalculateAllInIndex(index, updateGridToSee = false, reEncodeList = undefined) {
  reEncodeList = reEncodeList ?? date_getReEncodeListOnChange(index);
  for (const i of reEncodeList) {
    if (i >= g_AllTextureData.length || i < 0) {
      continue;
    }

    Assault_generalEncode(i);
    refreshFileHeaderInfo(i);
    refreshFilePixelInfo(i);
    refreshFileColorInfo(i);
    if (i == g_currentTextureToShow) {
      if (updateGridToSee)
        changeImageGridToView(-1, false);
      updateAllInfoInRightFilePreview();
    }
  }

  displayWarningsAndErrors();

  // bottom advanced only box functions
  showFileOffsetsInFilePreview();
  updateOffsetBound();
}