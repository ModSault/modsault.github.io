// This file handles reading the files directly from Star Fox Assault

/* ------------- helper ---------- */

// Turns 16 bit value to rgba 0-255. used to get raw color information from the game's file
// opposite of `Assault_EncodeHelper_rgbaToU16`.
function Assault_getColorFromU16(u16, colorType) {
  const valueTo255 = function(value, max) {
    return Math.round((((value) & max) / max) * 255);
  }
  let r, g, b, a;

  if (((colorType % 4) == 0) || ((colorType % 4) == 3)) {
    r = valueTo255(u16, 0xFF);
    g = valueTo255(u16, 0xFF);
    b = valueTo255(u16, 0xFF);
    a = valueTo255(u16 >> 8, 0xFF);
  }
  if ((colorType % 4) == 1) {
    r = valueTo255(u16 >> 11, 0x1F);
    g = valueTo255(u16 >> 5, 0x3F);
    b = valueTo255(u16, 0x1F);
    a = 255;
  }
  if ((colorType % 4) == 2) {
    const mode = u16 >> 15;
    if (mode == 0) {
      r = valueTo255(u16 >> 8, 0xF);
      g = valueTo255(u16 >> 4, 0xF);
      b = valueTo255(u16, 0xF);
      a = valueTo255(u16 >> 12, 0x7);
    }
    if (mode == 1) {
      r = valueTo255(u16 >> 10, 0x1F);
      g = valueTo255(u16 >> 5, 0x1F);
      b = valueTo255(u16, 0x1F);
      a = 255;
    }
  }

  return { r, g, b, a };
}

/* ------------- parse game file when uploaded ------------- */

function Assault_DropHandler(ev) {
  ev.preventDefault();
  Assault_FileChange(ev.dataTransfer.items[0].getAsFile());
}
function Assault_FileChange(file) {
  if (file == undefined) { return; }

  // verify filename and update what to export the filename as
  const filename = file.name.toLowerCase();
  const valid_textPack = /tex_pack_[0-9]{2}.nut$/.test(filename);
  const valid_logo = /ns_logos\d{0,1}\.nut$/.test(filename);
  if (!valid_textPack && !valid_logo) {
    let response = confirm("The file name '" + filename + "' seems incorrect. Are you sure you want to proceed?");
    if (!response) { return; }
  }
  let newFileNum = parseInt(filename.replace(/\D+/g, ''));
  if (isNaN(newFileNum))
    newFileNum = 0;
  if (filename.indexOf("logos") !== -1) {
    newFileNum += 79;
  }
  updateFileNum(newFileNum);

  // update text in file upload box
  const AssaultLabelFile = document.getElementById("AssaultLabelFile");
  for (let node of AssaultLabelFile.childNodes) {
    if (node.nodeType === Node.TEXT_NODE && node.textContent.trim() !== "") {
      node.textContent = filename;
      break;
    }
  }
  // add description after filename so its purpose is easier to understand (if it exists)
  let actualFileNameInTable = getFileName();
  if (GameVersion == 1 && newFileNum == 79)
    actualFileNameInTable = "attract/" + actualFileNameInTable;
  if (g_JSON_filenames != null && g_JSON_filenames[actualFileNameInTable] != undefined) {
    const relevant = g_JSON_filenames[actualFileNameInTable];
    
    let ext = "";
    if (GameVersion == 0) ext = "USA";
    if (GameVersion == 1) ext = "Japan";
    if (GameVersion == 2) ext = "PAL";
    if (relevant.IsSameAllVersions) ext = "";

    let textToAdd = relevant["Description"+ext];
    if (textToAdd == "" || textToAdd.indexOf("<") != -1) textToAdd = "Unknown / Undocumented File";

    for (let node of AssaultLabelFile.childNodes) {
      if (node.nodeType === Node.TEXT_NODE && node.textContent.trim() !== "") {
        node.textContent = filename + " (" + textToAdd + ")";
        break;
      }
    }
  }
  document.getElementById("Assault_file").value = "";

  // actually read the file
  Assault_parseFile(file);
}
function Assault_parseFile(file) {
  if (file == undefined) { return; }
  const filename = file.name.toLowerCase();

  const reader = new FileReader();
  reader.onload = async function(e) {
    // show on screen that we are currently reading the file
    const textContainer = document.getElementById("OverlayForDownloading");
    const textToShow = textContainer.getElementsByClassName("box")[0];
    textContainer.style.display = "";
    textToShow.innerText = `Parsing
    (0%)...`;

    // setup to read file
    const allTextureData_backup = g_AllTextureData;
    g_AllTextureData = [];
    const view = new DataView(e.target.result);
    try {
      // Skip entire file header (20 bytes) and get info on number of files
      // other variable are to account for 
      let curOffset = 0x20;
      const numFiles = view.getUint16(6);
      let offsetToLastPixels = -1;
      let lastSizeOfPixelData = -1;
      let lastWidth = -1;
      let lastHeight = -1;
      for (let i = 0; i < numFiles; i++) {
        // update on screen text with progress
        if (i % 25 === 0) {
          textToShow.innerText = `Parsing
          (${((i/numFiles*100).toFixed(1))/2}%)...`;
          await waitForPaint();
        }

        // get and save info from individual file header
        const sizeOfPixelData = view.getUint32(curOffset + 0x8);
        const numberOfColors = view.getUint16(curOffset + 0xE);
        const sizeOfColorData = view.getUint32(curOffset + 0x4);
        const numPalettes = Math.ceil(sizeOfColorData / (2 * numberOfColors));
        const offsetToPixels = (sizeOfPixelData == 0) ? offsetToLastPixels : curOffset + view.getUint16(curOffset + 0xC);
        const offsetToColors = curOffset + view.getUint16(curOffset + 0xC) + (sizeOfPixelData);

        const colorType = view.getUint8(curOffset + 0x12);
        const textureLayer = view.getUint8(curOffset + 0x13);
        data_addNewTexture(`${filename} ${i}`);
        data_setColorType(i, colorType, false);
        data_setTextureLayer(i, textureLayer, false);

        const numMipMaps = view.getUint8(curOffset + 0x11);
        const numberTextures = isNaN(numPalettes) ? numMipMaps : Math.max(numPalettes, numMipMaps);
        const width = (sizeOfPixelData == 0) ? lastWidth : view.getUint16(curOffset+0x14);
        const height = (sizeOfPixelData == 0) ? lastHeight : view.getUint16(curOffset+0x16);
        data_setWidth(i, width, false);
        data_setHeight(i, height, false);
        data_setNumberTextures(i, numberTextures, false);
        data_setIsColorOnly(i, sizeOfPixelData == 0, false);

        // failsafe check. Ensure there aren't both mipmaps and more than 1 palette
        if (!isNaN(numPalettes) && numMipMaps > 1) {
          console.error(`Texture ID ${i} has both palettes and mipmaps. This might be a massive problem.`);
        }

        // look for texture ID
        for (let j = 0x10; j < offsetToPixels; j += 0x10) {
          if (view.getUint32(curOffset + j) == 0x47494458) {
            data_setTextureID(i, view.getUint32(curOffset + j + 0x8));
            break;
          }
        }

        // go through all mipmaps or palettes and get their image data
        // colors are grabbed to if possible. They aren't used for anything though
        let numberOfPixelsToBytesRatio = getPixelsToByteRatio(textureLayer);
        let additionalPixelOffset = 0;
        let additionalColorOffset = 0;
        for (let j = 0; j < Math.max(numberTextures, g_AllTextureData[i].pixels.length); j++) {
          let currentWidth = width;
          let currentHeight = height;
          if (!data_hasColorData(i)) {
            currentWidth = width >> (j);
            currentHeight = height >> (j);
            additionalColorOffset = 0;
          } else {
            additionalPixelOffset = 0;
          }
          const currentSizeOfPixelData = (sizeOfPixelData == 0 && numberTextures == 0) ? lastSizeOfPixelData : currentWidth * currentHeight;// (sizeOfPixelData - additionalPixelOffset)

          const view_pixelsOnly = new DataView(e.target.result, offsetToPixels + additionalPixelOffset, currentSizeOfPixelData / numberOfPixelsToBytesRatio);
          const view_colorsOnly = new DataView(e.target.result, offsetToColors + additionalColorOffset, numberOfColors*2);
          additionalPixelOffset += (currentWidth * currentHeight) / numberOfPixelsToBytesRatio;
          additionalColorOffset += (numberOfColors*2);

          Assault_parseColors(i, j, view_colorsOnly, colorType);
          switch (textureLayer) {
            case 1: {
              // written as 4 within in the game
              Assault_parseLayer1(i, j, view_pixelsOnly, currentWidth);
              break;
            } case 2: {
              // written as 5 within in the game
              Assault_parseLayer2(i, j, view_pixelsOnly, currentWidth);
              break;
            } case 3: {
              // written as 6 within in the game
              Assault_parseLayer3(i, j, view_pixelsOnly, currentWidth);
              break;
            } case 4: {
              // written as 14 within in the game
              Assault_parseLayer4(i, j, view_pixelsOnly, currentWidth);
              break;
            } case 5: {
              // written as 8 within in the game
              Assault_parseLayer5(i, j, view_pixelsOnly, view_colorsOnly, colorType, currentWidth);
              break;
            } case 6: {
              // written as 9 within in the game
              Assault_parseLayer6(i, j, view_pixelsOnly, view_colorsOnly, colorType, currentWidth);
              break;
            } case 7: { // !!!!!!!!!!!!!!! NOT TESTED !!!!!!!!!!!!!!
              // written as 10 within in the game
              Assault_parseLayer7(i, j, view_pixelsOnly, view_colorsOnly, colorType, currentWidth);
              break;
            } case 10: {
              // written as 1 within in the game
              Assault_parseLayer10(i, j, view_pixelsOnly, currentWidth);
              break;
            } case 11: {
              // written as 3 within in the game
              Assault_parseLayer11(i, j, view_pixelsOnly, currentWidth);
              break;
            } case 12: { // !!!!!!!!!!!!!!! NOT TESTED !!!!!!!!!!!!!!
              // written as 14 within in the game
              Assault_parseLayer4(i, j, view_pixelsOnly, currentWidth);
              break;
            } case 0:
            case 8:
            case 9:
            default:
              alert(`Invalid Texture Layer / Compression Type (${textureLayer}) for texture id ${i}. No pixels will be read.`);
              break;
          }

          const actualHeight = (g_AllTextureData[i].pixels[j].length / currentWidth);
          console.assert(currentHeight == actualHeight, `${i} File height and actual height aren't the same. Expected: ${currentHeight} Got: ${actualHeight}`);
        }
        

        offsetToLastPixels = offsetToPixels;
        lastWidth = width;
        lastHeight = height;
        lastSizeOfPixelData = (sizeOfPixelData == 0) ? lastSizeOfPixelData : sizeOfPixelData;
        curOffset += view.getUint32(curOffset);
      }

      // Encode all and check if the encode result is the same as parsed result
      await Assault_EncodeAll_async();
      if (isLocalhost)
        Assault_Encode_SanityCheckAll();

      // show all info on screen
      textToShow.innerText = `Rendering to Screen...`;
      await waitForPaint();
      refreshAllFiles();
      data_recalculateAllInIndex(-1);

      g_wasFileChanged = false;
    } catch (err) {
      alert(`Invalid Star Fox Assault File. Reverting to as if you uploaded nothing. Error: ${err}`);
      g_AllTextureData = allTextureData_backup;
    }
    textContainer.style.display = "none";
  };
  reader.readAsArrayBuffer(file);
}

// read color data from the file
function Assault_parseColors(i, j, view, colorType) {
  for (let iter = 0; iter < view.byteLength; iter += 2) {
    const colorU16 = view.getUint16(iter);
    const {r, g, b, a} = Assault_getColorFromU16(colorU16, colorType);
    data_addNewColor(i, j, r, g, b, a, false);
  }
}

/* -------------- Individual Compression Type Handlers ------------------ */

function Assault_parseLayer1(i, j, view, width, toCompressedImage = false) {
  const numberOfPixels = view.byteLength / 2;
  const height = Math.ceil(numberOfPixels / width);

  // stored in 4x4 grids. We need to account for that
  const blockWidth = 4;
  const blockHeight = 4;
  const bytesPerBlock = blockWidth * blockHeight;
  const blocksPerRow = Math.ceil(width / blockWidth);

  let pixelID = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const blockCol = Math.floor(x / blockWidth);
      const blockRow = Math.floor(y / blockHeight);
      const blockIndex = (blockRow * blocksPerRow) + blockCol;

      const inBlockX = x % blockWidth;
      const inBlockY = y % blockHeight;
      const inBlockIndex = inBlockY * blockWidth + inBlockX;

      const pixelIndex = (blockIndex * bytesPerBlock * 2) + (inBlockIndex * 2); // each pixel is 2 bytes
      const pixelOffset = (pixelIndex);
      const color = view.getUint16(pixelOffset);
      const {r, g, b, a} = Assault_getColorFromU16(color, 1);

      if (!toCompressedImage)
        data_addPixel(i, j, r, g, b, a);
      else
        data_setCompressedPixel(i, j, pixelID, r, g, b, a);
      pixelID++;
    }
  }

  console.assert(numberOfPixels == g_AllTextureData[i].pixels[j].length, i, numberOfPixels, g_AllTextureData[i].pixels[j].length);
}

function Assault_parseLayer2(i, j, view, width, toCompressedImage = false) {
  const numberOfPixels = view.byteLength / 2;
  const height = Math.ceil(numberOfPixels / width);

  // stored in 4x4 grids. We need to account for that
  const blockWidth = 4;
  const blockHeight = 4;
  const bytesPerBlock = 32;
  const blocksPerRow = Math.ceil(width / blockWidth);

  let pixelID = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const blockCol = Math.floor(x / blockWidth);
      const blockRow = Math.floor(y / blockHeight);
      const blockIndex = (blockRow * blocksPerRow) + blockCol;

      const inBlockX = x % blockWidth;
      const inBlockY = y % blockHeight;
      const inBlockIndex = inBlockY * blockWidth + inBlockX;

      const pixelIndex = (blockIndex * bytesPerBlock) + (inBlockIndex * 2); // each pixel is 2 bytes
      const pixelOffset = (pixelIndex);
      const color = view.getUint16(pixelOffset);
      const {r, g, b, a} = Assault_getColorFromU16(color, 2);

      if (!toCompressedImage)
        data_addPixel(i, j, r, g, b, a);
      else
        data_setCompressedPixel(i, j, pixelID, r, g, b, a);
      pixelID++;
    }
  }

  console.assert(numberOfPixels == g_AllTextureData[i].pixels[j].length, i, numberOfPixels, g_AllTextureData[i].pixels[j].length);
}

function Assault_parseLayer3(i, j, view, width, toCompressedImage = false) {
  const numberOfPixels = view.byteLength / 4;
  const height = Math.ceil(numberOfPixels / width);

  // stored in 4x4 grids. We need to account for that
  const blockWidth = 4;
  const blockHeight = 4;
  const bytesPerBlock = 64;
  const blocksPerRow = Math.ceil(width / blockWidth);

  let pixelID = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const blockCol = Math.floor(x / blockWidth);
      const blockRow = Math.floor(y / blockHeight);
      const blockIndex = (blockRow * blocksPerRow) + blockCol;

      const inBlockX = x % blockWidth;
      const inBlockY = y % blockHeight;
      const inBlockIndex = inBlockY * blockWidth + inBlockX;

      const pixelIndex = (blockIndex * bytesPerBlock) + (inBlockIndex * 2); // each pixel is 2 bytes. And an offset of 0x20 is where its other 2 bytes are :|
      const pixelOffset = (pixelIndex);
      const a = view.getUint8(pixelOffset+0x00);
      const r = view.getUint8(pixelOffset+0x01);
      const g = view.getUint8(pixelOffset+0x20);
      const b = view.getUint8(pixelOffset+0x21);

      if (!toCompressedImage)
        data_addPixel(i, j, r, g, b, a);
      else
        data_setCompressedPixel(i, j, pixelID, r, g, b, a);
      pixelID++;
    }
  }

  console.assert(numberOfPixels == g_AllTextureData[i].pixels[j].length, i, numberOfPixels, g_AllTextureData[i].pixels[j].length);
}
// claude wrote a lot of this
function Assault_parseLayer4(i, j, view, width, toCompressedImage = false) {
  const numberOfPixels = view.byteLength * 2;
  const getDerivedColor = function(c1, c2, n) {
    return c1 + Math.floor((c2 - c1) * n / 8);
  }
  const height = Math.ceil(numberOfPixels / width);

  // game stores pixels in a bigger 8x8 grid then smaller 4x4 grids instead of just left to right. So we need to account for that.
  const blockWidthBig = 8;
  const blockHeightBig = 8;
  const blockWidthSmall = 4;
  const blockHeightSmall = 4;
  const blockByteSize = 8; // 2 bytes color1 + 2 bytes color2 + 4 bytes pixel indices. game primarily stores in 4x4 grid that sorted in an annoying way
  const blocksPerRowBig = Math.ceil(width / blockWidthBig);

  let pixelID = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const blockColBig = Math.floor(x / blockWidthBig);
      const blockRowBig = Math.floor(y / blockWidthBig);
      const blockBigNumber = blockRowBig * blocksPerRowBig + blockColBig;

      const blockCol = Math.floor((x % blockWidthBig) / blockWidthSmall);
      const blockRow = Math.floor((y % blockHeightBig) / blockHeightSmall);
      const blockSmallNumber = blockRow * 2 + blockCol;

      const inBlockX = x % blockWidthSmall;
      const inBlockY = y % blockHeightSmall;
      const inBlockIndex = inBlockY * blockWidthSmall + inBlockX; // 0..15, row-major within block

      const blockByteOffset = (blockBigNumber * blockByteSize * 4) + (blockSmallNumber * blockByteSize);

      const color1 = view.getUint16(blockByteOffset);
      const color2 = view.getUint16(blockByteOffset + 2);
      const AllPixelsInBlock = view.getUint32(blockByteOffset + 4);

      const { "r": r1, "g": g1, "b": b1, "a": a1 } = Assault_getColorFromU16(color1, 1);
      const { "r": r2, "g": g2, "b": b2, "a": a2 } = Assault_getColorFromU16(color2, 1);

      const shift = 30 - (2 * inBlockIndex);
      const byteValues = (AllPixelsInBlock >>> shift) & 0x3;

      // color1 <= color2 (unsigned 16-bit compare) means this block is in
      // 3-color + punch-through-alpha mode, not 4-color opaque mode.
      const punchThrough = (color1 & 0xFFFF) <= (color2 & 0xFFFF);

      if (punchThrough && byteValues === 3) {
        // index 11: fully transparent, color is irrelevant
        if (!toCompressedImage)
          data_addPixel(i, j, 0, 0, 0, 0);
        else
          data_setCompressedPixel(i, j, pixelID, 0, 0, 0, 0);
        pixelID++;
        continue;
      }

      const n = punchThrough
        ? ([0, 8, 4])[byteValues]   // index 0 -> color1, 1 -> color2, 2 -> 1/2 blend
        : ([0, 8, 3, 5])[byteValues]; // index 0 -> color1, 1 -> 1/3 blend, 2 -> 2/3 blend, 3 -> color2

      const r = getDerivedColor(r1, r2, n);
      const g = getDerivedColor(g1, g2, n);
      const b = getDerivedColor(b1, b2, n);
      const a = getDerivedColor(a1, a2, n);
      if (!toCompressedImage)
        data_addPixel(i, j, r, g, b, a);
      else
        data_setCompressedPixel(i, j, pixelID, r, g, b, a);
      pixelID++;
    }
  }

  console.assert(numberOfPixels == g_AllTextureData[i].pixels[j].length, i, numberOfPixels, g_AllTextureData[i].pixels[j].length);
}

function Assault_parseLayer5(i, j, view_pixels, view_colors, colorType, width, toCompressedImage = false) {
  const numberOfPixels = view_pixels.byteLength * 2;
  const height = Math.ceil(numberOfPixels / width);

  // game stores pixels in 8x8 grids instead of just left to right. So we need to account for that.
  const blockWidth = 8;
  const blockHeight = 8;
  const pixelsPerBlock = blockWidth * blockHeight; // 64
  const blocksPerRow = Math.ceil(width / blockWidth);

  let pixelID = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const blockCol = Math.floor(x / blockWidth);
      const blockRow = Math.floor(y / blockHeight);
      const blockIndex = blockRow * blocksPerRow + blockCol;

      const inBlockX = x % blockWidth;
      const inBlockY = y % blockHeight;
      const inBlockIndex = inBlockY * blockWidth + inBlockX;

      const byteIndex = Math.floor(((blockIndex * pixelsPerBlock) + inBlockIndex) / 2);
      const pixelOffset = byteIndex;
      const byte = view_pixels.getUint8(pixelOffset);

      const colorIndex = (inBlockIndex % 2 == 0)
        ? (byte & 0xF0) >> 4   // odd indexInBlock -> high nibble, shifted into 0-15
        : (byte & 0x0F);       // even indexInBlock -> low nibble
      const colorU16 = view_colors.getUint16((colorIndex * 2));
      const  { r, g, b, a } = Assault_getColorFromU16(colorU16, colorType);

      if (!toCompressedImage) {
        data_addPixel(i, j, r, g, b, a);
        data_setColorData(i, j, colorIndex, "used", true); // lets user know this color is used
      } else
        data_setCompressedPixel(i, j, pixelID, r, g, b, a);
      pixelID++;
    }
  }

  console.assert(numberOfPixels == g_AllTextureData[i].pixels[j].length, i, numberOfPixels, g_AllTextureData[i].pixels[j].length);
}

function Assault_parseLayer6(i, j, view_pixels, view_colors, colorType, width, toCompressedImage = false) {
  const numberOfPixels = view_pixels.byteLength;
  const height = Math.ceil(numberOfPixels / width);

  // game stores pixels in 8x4 grids instead of just left to right. So we need to account for that
  const blockWidth = 8;
  const blockHeight = 4;
  const pixelsPerBlock = blockWidth * blockHeight; // 32
  const blocksPerRow = width / blockWidth;

  let pixelID = 0;
  const allColors = g_AllTextureData[i].colors;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // figure out which block this (x,y) belongs to
      const blockX = Math.floor(x / blockWidth);
      const blockY = Math.floor(y / blockHeight);
      const blockIndex = blockY * blocksPerRow + blockX;

      // position within the block
      const localX = x % blockWidth;
      const localY = y % blockHeight;
      const indexInBlock = localY * blockWidth + localX;

      const pixelOffset = (blockIndex * pixelsPerBlock) + indexInBlock;
      const colorIndex = view_pixels.getUint8(pixelOffset);
      const colorU16 = view_colors.getUint16((colorIndex * 2));
      const  { r, g, b, a } = Assault_getColorFromU16(colorU16, colorType);

      if (!toCompressedImage) {
        data_addPixel(i, j, r, g, b, a);
        data_setColorData(i, j, colorIndex, "used", true); // lets user know this color is used
      } else
        data_setCompressedPixel(i, j, pixelID, r, g, b, a);
      pixelID++;
    }
  }

  console.assert(numberOfPixels == g_AllTextureData[i].pixels[j].length, i, numberOfPixels, g_AllTextureData[i].pixels[j].length);
}

function Assault_parseLayer7(i, j, view_pixels, view_colors, colorType, width, toCompressedImage = false) {
  const numberOfPixels = view_pixels.byteLength / 2;
  const height = Math.ceil(numberOfPixels / width);

  // game stores pixels in 8x4 grids instead of just left to right. So we need to account for that
  const blockWidth = 8;
  const blockHeight = 4;
  const pixelsPerBlock = blockWidth * blockHeight; // 32
  const blocksPerRow = width / blockWidth;

  let pixelID = 0;
  const allColors = g_AllTextureData[i].colors;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // figure out which block this (x,y) belongs to
      const blockX = Math.floor(x / blockWidth);
      const blockY = Math.floor(y / blockHeight);
      const blockIndex = blockY * blocksPerRow + blockX;

      // position within the block
      const localX = x % blockWidth;
      const localY = y % blockHeight;
      const indexInBlock = localY * blockWidth + localX;

      const pixelOffset = (blockIndex * pixelsPerBlock * 2) + (indexInBlock * 2);
      const colorIndex = view_pixels.getUint16(pixelOffset);
      const colorU16 = view_colors.getUint16((colorIndex * 2));
      const  { r, g, b, a } = Assault_getColorFromU16(colorU16, colorType);

      if (!toCompressedImage) {
        data_addPixel(i, j, r, g, b, a);
        data_setColorData(i, j, colorIndex, "used", true); // lets user know this color is used
      } else
        data_setCompressedPixel(i, j, pixelID, r, g, b, a);

      pixelID++;
    }
  }

  console.assert(numberOfPixels == g_AllTextureData[i].pixels[j].length, i, numberOfPixels, g_AllTextureData[i].pixels[j].length);
}
function Assault_parseLayer10(i, j, view, width, toCompressedImage = false) {
  const numberOfPixels = view.byteLength;
  const height = Math.ceil(numberOfPixels / width);

  // stored in 8x4 grids. We need to account for that
  const blockWidth = 8;
  const blockHeight = 4;
  const bytesPerBlock = 32;
  const blocksPerRow = Math.ceil(width / blockWidth);

  let pixelID = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const blockCol = Math.floor(x / blockWidth);
      const blockRow = Math.floor(y / blockHeight);
      const blockIndex = (blockRow * blocksPerRow) + blockCol;

      const inBlockX = x % blockWidth;
      const inBlockY = y % blockHeight;
      const inBlockIndex = inBlockY * blockWidth + inBlockX;

      const byteIndex = (blockIndex * bytesPerBlock) + inBlockIndex;
      const pixelOffset = (byteIndex);
      const a = view.getUint8(pixelOffset);

      if (!toCompressedImage)
        data_addPixel(i, j, a, a, a, a);
      else
        data_setCompressedPixel(i, j, pixelID, a, a, a, a);
      pixelID++;
    }
  }

  console.assert(numberOfPixels == g_AllTextureData[i].pixels[j].length, i, numberOfPixels, g_AllTextureData[i].pixels[j].length);
}
function Assault_parseLayer11(i, j, view, width, toCompressedImage = false) {
  const numberOfPixels = view.byteLength / 2;
  const height = Math.ceil(numberOfPixels / width);

  // stored in 4x4 grids. We need to account for that
  const blockWidth = 4;
  const blockHeight = 4;
  const bytesPerBlock = 16; // 2 bytes per pixel. multiplied by 2 later
  const blocksPerRow = Math.ceil(width / blockWidth);

  let pixelID = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const blockCol = Math.floor(x / blockWidth);
      const blockRow = Math.floor(y / blockHeight);
      const blockIndex = (blockRow * blocksPerRow) + blockCol;

      const inBlockX = x % blockWidth;
      const inBlockY = y % blockHeight;
      const inBlockIndex = inBlockY * blockWidth + inBlockX;

      const byteIndex = (blockIndex * bytesPerBlock) + inBlockIndex;
      const pixelOffset = (byteIndex*2);
      const a = view.getUint8(pixelOffset);
      const color = view.getUint8(pixelOffset+1);

      if (!toCompressedImage)
        data_addPixel(i, j, color, color, color, a);
      else
        data_setCompressedPixel(i, j, pixelID, color, color, color, a);
      pixelID++;
    }
  }

  console.assert(numberOfPixels == g_AllTextureData[i].pixels[j].length, i, numberOfPixels, g_AllTextureData[i].pixels[j].length);
}