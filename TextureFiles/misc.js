// These are functions that are miscellaneous and help in some places 

/* ----------------- General Purpose Functions ------------ */

// gets grid a pixel is in (thanks Claude)
function pixelIDtoGrid(width, textureLayer, pixelID) {
  const { w, h } = getGridSizes(textureLayer);
  const gridsNumHor = width / w;

  const row = Math.floor(pixelID / width);
  const col = pixelID % width;

  const gridRow = Math.floor(row / h);
  const gridCol = Math.floor(col / w);
  const toReturn = gridRow * gridsNumHor + gridCol;

  if (toReturn === Infinity || isNaN(toReturn))
    return -1;
  return toReturn;
}
// get first pixel id a grid is in (thanks Claude)
function gridToPixelID(width, textureLayer, gridID) {
  const { w, h } = getGridSizes(textureLayer);
  const gridsNumHor = width / w;

  const gridRow = Math.floor(gridID / gridsNumHor);
  const gridCol = gridID % gridsNumHor;

  const row = gridRow * h;
  const col = gridCol * w;

  return row * width + col;
}

// get file data when wanting to download an image
function getBlobForFileMipMap(index, mipmap, isCompressed = false) {
  const curData = g_AllTextureData[index];
  const width = data_hasColorData(index) ? curData.width : curData.width >> mipmap;
  const height = data_hasColorData(index) ? curData.height : curData.height >> mipmap;
  const pixels = curData.pixels[mipmap];
  const compressedImage = g_allFileProcessedInformation[index+1].compressedImage[mipmap];

  // Thanks Claude
  // Build an ImageData-compatible buffer (RGBA, 8-bit per channel)
  if (width == 0 || height == 0) {
    // 1x1 transparent PNG as a stand-in for "no data"
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error(`toBlob failed for empty texture ${index}, mip ${mipmap}`));
      }, "image/png");
    });
  }

  const imageData = new ImageData(width, height);
  const data = imageData.data;

  console.assert(width*height == pixels.length, `Image width and height (${width}x${height}) don't match the image's pixel count ${pixels.length}. Something went wrong somewhere.`);
  for (let i = 0; i < width * height; i++) {
    if (!isCompressed) {
      const p = pixels[i];
      data[i * 4 + 0] = p.r;
      data[i * 4 + 1] = p.g;
      data[i * 4 + 2] = p.b;
      data[i * 4 + 3] = p.a;
    } else {
      data[i * 4 + 0] = compressedImage[i * 4 + 0];
      data[i * 4 + 1] = compressedImage[i * 4 + 1];
      data[i * 4 + 2] = compressedImage[i * 4 + 2];
      data[i * 4 + 3] = compressedImage[i * 4 + 3];
    }
  }

  // Draw onto an offscreen canvas
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.putImageData(imageData, 0, 0);

  // Export as PNG blob, wrapped in a Promise
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error(`toBlob failed for texture ${index}, mip ${mipmap}`));
      }
    }, "image/png");
  });
}

/* ------------- Buttons on the top and bottom of the editor handler. ----- */

// delete all textures
function removeAll() {
  const response = confirm(`Delete Everything? This cannot be undone!`);
  if (!response) { return; }
  g_AllTextureData = [];
  Assault_EncodeAll();
  refreshAllFiles();
  changeCurrentTexture(-1);
  data_recalculateAllInIndex(-1);
  g_wasFileChanged = false;
}

// collapse all details incase you opened too many
function collapseAll() {
  const allDetails = document.getElementById("Editor_Contents").getElementsByTagName("details");
  for (let i = 0; i < allDetails.length; i++) {
    allDetails[i].open = true; // hacky fix for the fact elements only delete if the details is open
    allDetails[i].getElementsByTagName("summary")[0].onclick(i);
    allDetails[i].open = false;
  }
}

// download everything and put it in a zipped folder
async function downloadAllTextures() {
  alert(g_copyrightAlertMessage + "\n\n" + "Also this may take a while be patient.");

  // show on screen progress
  const textContainer = document.getElementById("OverlayForDownloading");
  const textToShow = textContainer.getElementsByClassName("box")[0];
  textContainer.style.display = "";
  textToShow.innerText = "Downloading (0%)...";

  const zip = new JSZip();

  for (let i = 0; i < g_AllTextureData.length; i++) {
    for (let j = 0; j < g_AllTextureData[i].pixels.length; j++) {
      const blob = await getBlobForFileMipMap(i, j);
      const fileName = sanitizeFilename(g_AllTextureData[i].name + `_${j}.png`);
      zip.file(fileName, blob);
    }
    textToShow.innerText = `Downloading (${(i/g_AllTextureData.length*100).toFixed(1)}%)...`;
  }

  // credit who made zipping support
  zip.file("credit.txt", g_JSZipCreditMessage);

  const content = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(content);
  const a = document.createElement("a");
  a.href = url;
  a.download = getFileName(".zip");
  a.click();
  URL.revokeObjectURL(url);

  textContainer.style.display = "none";
}
// download only one mipmap / palette
async function downloadOneTexture(index, mipmapIndex) {
  alert(g_copyrightAlertMessage);

  const blob = await getBlobForFileMipMap(index, mipmapIndex);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = sanitizeFilename(`${g_AllTextureData[index].name}.png`);
  a.click();
  URL.revokeObjectURL(url);
}
// same as above but does compressed image
async function downloadOneCompressedTexture(index, mipmapIndex) {
  alert(g_copyrightAlertMessage);

  const blob = await getBlobForFileMipMap(index, mipmapIndex, true);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = sanitizeFilename(`${g_AllTextureData[index].name}_compressed.png`);
  a.click();
  URL.revokeObjectURL(url);
}

// --------------------------------- Downloading Logic ------------------------------- */

// download file for Star Fox Assault
function downloadNUT() {
  const blob = new Blob(
    g_allFileProcessedInformation.map(f => f.downloadSegment),
    { type: 'application/octet-stream' }
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = getFileName(".nut");
  a.click();
  URL.revokeObjectURL(url);
  g_wasFileChanged = false;
}

// download JSON that be easily traversed if wanting these for a model viewer or something
//    { id: pixels, id2: pixels2 }
async function downloadFormattedJSON() {
  const textContainer = document.getElementById("OverlayForDownloading");
  const textToShow = textContainer.getElementsByClassName("box")[0];
  textContainer.style.display = "";

  const jsonToReturn = {};
  for (let i = 0; i < g_AllTextureData.length; i++) {
    textToShow.innerText = `Making JSON (${(i/g_AllTextureData.length*100).toFixed(1)}%)...`;
    if (i % 10 === 0)
      await waitForPaint();

    const curData = g_AllTextureData[i];
    const id = curData.id;
    const highestResImage = curData.pixels[0] // only care for high res for using in other programs
    if (jsonToReturn[id] !== undefined) {
      alert(`Duplicate texture ID (${id}) was found. Unable to create the JSON for downloading.`);
      return;
    }
    jsonToReturn[id] = highestResImage;
  }


  textToShow.innerText = "Formatting file...";
  await waitForPaint(); // show the changes in above code. Below line takes a while
  const jsonString = JSON.stringify(jsonToReturn, null, 2);
  textContainer.style.display = "none";

  const blob = new Blob([jsonString], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = getFileName("_formatted.json");
  document.body.appendChild(a);
  a.click();

  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// download all data in a way easier to edit in outside programs/tools. Can be imported with dev tools console in Advanced Mode
async function downloadJSON() {
  const textContainer = document.getElementById("OverlayForDownloading");
  const textToShow = textContainer.getElementsByClassName("box")[0];
  textContainer.style.display = "";
  textToShow.innerText = "Formatting file...";

  await waitForPaint(); // show the changes in above code. Below line takes a while
  const jsonString = JSON.stringify(g_AllTextureData, null, 2);
  textContainer.style.display = "none";

  const blob = new Blob([jsonString], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = getFileName(".json");
  document.body.appendChild(a);
  a.click();

  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  g_wasFileChanged = false;
}

/* -------------- Functions to add select options for image preview box. Add these in <script> tags ------------- */

function makeAllCompressionTypes() {
  const elem = document.getElementById("ImageDisplay_CompressionType");
  const fragment = document.createDocumentFragment();

  for (const elem of allCompressionTypesNames) {
    fragment.appendChild(DOM_addAny("option", {
      "value": elem.val,
      "innerText": elem.name,
    }));
  }

  elem.replaceChildren(fragment);
}
function makeAllColorTypes() {
  const elem = document.getElementById("ImageDisplay_ColorType");
  const fragment = document.createDocumentFragment();

  for (const elem of allColorTypes) {
    fragment.appendChild(DOM_addAny("option", {
      "value": elem.val,
      "innerText": elem.name,
    }));
  }

  elem.replaceChildren(fragment);
}

/* -------------- Functions to update on screen elements when needed. Like errors and warnings ------------- */

function displayWarningsAndErrors() {
  const warning_frag = document.createDocumentFragment();
  const error_frag = document.createDocumentFragment();
  const makeNameOfTexture = function(index) {
    return `[${index-1}; ${data_getIDPretty(index-1)}] ${g_AllTextureData[index-1].name}`;
  }
  const addText = function (index, text, isError) {
    const textToAdd = `'${makeNameOfTexture(index)}': ${text}`;
    if (isError) {
      error_frag.appendChild(DOM_addAny("p", { "innerText": `Error in ${textToAdd}` }));
    } else {
      warning_frag.appendChild(DOM_addAny("p", { "innerText": `Warning in ${textToAdd}` }));
    }
  }

  // check for duplicate IDs
  const allIDs = {};
  for (let i = 0; i < g_AllTextureData.length; i++) {
    const id = g_AllTextureData[i].id;
    if (allIDs[id] != undefined) {
      addText(i+1, `Duplicate Texture ID ${id.toString(16).toUpperCase()}. First seen in '${makeNameOfTexture(allIDs[id]+1)}'.`, true)
    } else {
      allIDs[id] = i;
    }
  }

  // add all errors and warnings
  warning_frag.appendChild(DOM_addAny("p", {
    "innerText": "Be careful if replacing a file with something larger than it's original size, it may cause problems"
  }));
  for (let i = 1; i < g_allFileProcessedInformation.length; i++) {
    const curWarns = g_allFileProcessedInformation[i].warnings;
    const curErrors = g_allFileProcessedInformation[i].errors;
    for (let j = 0; j < curWarns.length; j++) {
      addText(i, curWarns[j], false);
    }
    for (let j = 0; j < curErrors.length; j++) {
      addText(i, curErrors[j], true);
    }
  }

  document.getElementById("WarningsText").replaceChildren(warning_frag);
  document.getElementById("ErrorText").replaceChildren(error_frag);
}

/* -------------- Handle loading json file (advanced mode only, input isn't checked to be valid) ----------- */

function AdvConLoad() {
  alert("The file is assumed to be correct on load. So no security or sanity checks are done.")
  document.getElementById("JSONLoadFile").click();
}
function LoadJSONFile(file) {
  if (file == undefined) { return; }

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      g_AllTextureData = JSON.parse(e.target.result);
      Assault_EncodeAll();
      refreshAllFiles();
      data_recalculateAllInIndex(-1);
      g_wasFileChanged = false;
    } catch (err) {
      alert(`Invalid JSON: ${err}`);
    }
  };
  reader.readAsText(file);
}

/* --------------------- Used for exporting the game file and getting the right name. And showing all options to users. And now also gecko code showing --------------- */

// values over 78 are for logo files. Below that are for tex_pack files
function updateFileNum(newNum) {
  if (isNaN(newNum) || newNum == undefined || newNum < -1 || newNum > 78 + 6) newNum = 0;
  g_fileNum = newNum;

  // update select option
  const select = document.getElementById("FileNameExport");
  select.value = g_fileNum;

  // update download/export button
  const buttonContainer = document.getElementById("ButtonsAtBottomOfScreen");
  if (!buttonContainer) return; // making option tags, therefore the element wasn't loaded yet
  const allButtons = buttonContainer.getElementsByTagName("button");
  allButtons[0].innerText = `Download (${getFileName()})`;
}
function getFileName(endStr = ".nut", newNum = null) {
  if (newNum != null)
    updateFileNum(newNum);

  if (g_fileNum <= 78)
    return "tex_pack_" + (g_fileNum == -1 ? "xx" : (""+g_fileNum).padStart(2, "0")) + endStr;
  else
    return "ns_logos" + (g_fileNum == 79 ? "" : (""+(g_fileNum-78))) + endStr;
}