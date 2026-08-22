/*
Variable with all the information for level boundaries and other objects to make.
This is an example of its data with fake numbers
{
  "bounds": [
    {
      "unused": 1.0,
      "Hor_Tank": 2.0,
      "Hor_Arwing": 2.0,
      "Ceil_soft": 3.0,
      "Floor_soft": -3.0,
      "Ceil_hard": 4.0,
      "Floor_hard": -4.0,
      "Arwing_Turn_Line_Flag": 0,
      "unused_3Bytes": "000000"
    },
    ...
  ],
  "objects": [
    {
      "type": 2,
      "unused_15Bytes": "000000000000000000000000000000000000000" // turns out this was actually 19 bytes but I can't change the name now
    },
    ...
  ]
}
*/
var allLevelBoundaryData = { "bounds": [], "objects": [] };
var fileDownloadContents = new ArrayBuffer(0); // this is download when clicking the blue button
var fileNum = 0; // used for getting correct filename on an export
var wasFileChanged = false; // used for popup to prevent closing browser
var JSON_filenames = null; // used to determine what filenames are for what. Loaded on page load

/* ------------- general purpose function ------------ */

const _buf = new ArrayBuffer(4);
const _view = new DataView(_buf);
function float64toFloat32(val) {
  _view.setFloat32(0, val);
  return _view.getFloat32(0);
}
function float32toHex(val) {
  _view.setFloat32(0, val);
  const bytes = [];
  for (let i = 0; i < 4; i++) {
    bytes.push(_view.getUint8(i).toString(16).padStart(2, "0"));
  }
  return bytes.join("").toUpperCase();
}
function hexToFloat32(hex) {
  const val = parseInt(hex, 16);
  _view.setUint32(0, val);
  return _view.getFloat32(0);
}


function update3DView() {
  if (document.getElementById("ThreeJSRenderedCheckMark").checked)
    rerenderAllThreeJS();
}
function formatUnused15BytesString(str) {
  const first = str.slice(0, 6);
  const rest = str.slice(6).match(/.{1,8}/g)?.join(' ') ?? '';
  return rest ? `${first} ${rest}` : first;
}

/* ------------- general modifying boundary data ---------- */

// ensure the data has a "bounds" and "objects" key. Also remove other keys
function data_sanityCheck() {
  allLevelBoundaryData = {
    "bounds": allLevelBoundaryData.bounds == undefined ? [] : allLevelBoundaryData.bounds,
    "objects": allLevelBoundaryData.objects == undefined ? [] : allLevelBoundaryData.objects
  }
}

function data_addBounds(toAdd_unused = 0, toAdd_Hor_Tank = 1000, toAdd_Hor_Arwing = 900, toAdd_Ceil_soft = 1000, toAdd_Floor_soft = -1000, toAdd_Ceil_hard = 1200, toAdd_Floor_hard = -1200, toAdd_Arwing_Turn_Line_Flag = 0, toAdd_unused_3Bytes = "000000") {
  data_sanityCheck();
  allLevelBoundaryData.bounds.push({
    "unused": 1.0,
    "Hor_Tank": 2.0,
    "Hor_Arwing": 2.0,
    "Ceil_soft": 3.0,
    "Floor_soft": -3.0,
    "Ceil_hard": 4.0,
    "Floor_hard": -4.0,
    "Arwing_Turn_Line_Flag": 0,
    "unused_3Bytes": "000000"
  });

  // ensure inputs are valid
  const index = allLevelBoundaryData.bounds.length-1;
  data_updateBounds(index, "unused", toAdd_unused);
  data_updateBounds(index, "Hor_Tank", toAdd_Hor_Tank);
  data_updateBounds(index, "Hor_Arwing", toAdd_Hor_Arwing);
  data_updateBounds(index, "Ceil_soft", toAdd_Ceil_soft);
  data_updateBounds(index, "Floor_soft", toAdd_Floor_soft);
  data_updateBounds(index, "Ceil_hard", toAdd_Ceil_hard);
  data_updateBounds(index, "Floor_hard", toAdd_Floor_hard);
  data_updateBounds(index, "Arwing_Turn_Line_Flag", toAdd_Arwing_Turn_Line_Flag);
  data_updateBounds(index, "unused_3Bytes", toAdd_unused_3Bytes);
}
function data_addObjects(toAdd_type = 0, toAdd_unused_15Bytes = "0") {
  data_sanityCheck();
  allLevelBoundaryData.objects.push({
    "type": 2,
    "unused_15Bytes": "0"
  });

  // ensure inputs are valid
  const index = allLevelBoundaryData.objects.length-1;
  data_updateObjects(index, "type", toAdd_type);
  data_updateObjects(index, "unused_15Bytes", toAdd_unused_15Bytes);
}

function data_swapElements(isBounds, index1, index2) {
  if (isBounds) {
    [allLevelBoundaryData.bounds[index1], allLevelBoundaryData.bounds[index2]] = [allLevelBoundaryData.bounds[index2], allLevelBoundaryData.bounds[index1]];
  } else {
    [allLevelBoundaryData.objects[index1], allLevelBoundaryData.objects[index2]] = [allLevelBoundaryData.objects[index2], allLevelBoundaryData.objects[index1]];
  }
  wasFileChanged = true;
}
function data_removeElement(isBounds, index) {
  if (isBounds) {
    allLevelBoundaryData.bounds.splice(index, 1);
  } else {
    allLevelBoundaryData.objects.splice(index, 1);
  }
  wasFileChanged = true;
}

function data_updateBounds(index, jsonName, newValue) {
  // ensure data type is correct and valid
  if (newValue === "") newValue = 0;
  if (jsonName == "unused_3Bytes") {
    newValue = String(newValue).replace(/[^0-9a-fA-F]/g, '').slice(0, 6).padStart(6, "0").toUpperCase()
  } else if (jsonName == "Arwing_Turn_Line_Flag") {
    if (!isFinite(newValue)) newValue = 0;
    newValue = Math.max(0, Math.min(255, parseInt(newValue)));
  } else {
    if (!isFinite(newValue)) newValue = 0;
    newValue = float64toFloat32(newValue);
    if (newValue === Infinity) newValue = Number.MAX_VALUE;
    if (newValue === -Infinity) newValue = -Number.MAX_VALUE;
  }

  // update data structure
  allLevelBoundaryData.bounds[index][jsonName] = newValue;
  wasFileChanged = true;

  // update on front end
  const mainBigBoyContainer = document.getElementById("FileContents");
  if (!mainBigBoyContainer) return;
  const table = mainBigBoyContainer.getElementsByClassName("boundsTable")[0];
  if (!table) return;
  const expectedDivInTable = (index * 10) + (["unused", "Hor_Tank", "Ceil_hard", "Ceil_soft", "Hor_Arwing", "Floor_soft", "Floor_hard", "Arwing_Turn_Line_Flag", "unused_3Bytes"]).indexOf(jsonName);
  const divOfInterest = table.getElementsByTagName("div")[expectedDivInTable];
  if (!divOfInterest) return;
  const inputs = divOfInterest.getElementsByTagName("input");

  if (jsonName == "unused_3Bytes") {
    inputs[0].value = newValue.match(/.{1,2}/g).join(' ');
  } else if (jsonName == "Arwing_Turn_Line_Flag") {
    inputs[0].checked = newValue > 0;
    inputs[1].value = newValue;
  } else {
    inputs[0].value = newValue;
    inputs[1].value = float32toHex(newValue);;
  }
}
function data_updateObjects(index, jsonName, newValue) {
  // ensure data type is correct and valid
  if (newValue === "") newValue = 0;
  if (jsonName == "unused_15Bytes") {
    newValue = String(newValue).replace(/[^0-9a-fA-F]/g, '').slice(0, 38).padStart(38, "0").toUpperCase()
  } else {
    if (!isFinite(newValue)) newValue = 0;
    newValue = Math.max(0, Math.min(255, parseInt(newValue)));
  }

  // update data structure
  allLevelBoundaryData.objects[index][jsonName] = newValue;
  wasFileChanged = true;

  // update on front end
  const mainBigBoyContainer = document.getElementById("FileContents");
  if (!mainBigBoyContainer) return;
  const table = mainBigBoyContainer.getElementsByClassName("objectsTable")[0];
  if (!table) return;
  const expectedDivInTable = (index * 3) + (["type", "unused_15Bytes"]).indexOf(jsonName);
  const divOfInterest = table.getElementsByTagName("div")[expectedDivInTable];
  if (!divOfInterest) return;
  const inputs = divOfInterest.getElementsByTagName("input");

  if (jsonName == "unused_15Bytes") {
    inputs[0].value = formatUnused15BytesString(newValue);
  } else {
    divOfInterest.getElementsByTagName("select")[0].value = newValue;
    inputs[0].value = newValue;
  }
}


/* -------------- makes table at top with all needed game files ------------- */

// this is for grid with all filenames and what they are
function updateFilenameGrid() {
  if (JSON_filenames == null) return;

  // remove all elements in grid
  const grid = document.getElementById("FileNameGrid");
  grid.replaceChildren();

  // get all filenames needed and sort alphabetically
  const allNames = Object.keys(JSON_filenames);
  const filteredNames = allNames.filter(key => /^ts_mapdata[0-9]{2}.bin$/.test(key) );
  const sortedNames = filteredNames.sort((a, b) => { return a.toLowerCase().localeCompare(b.toLowerCase()) });

  // Make top row of grid
  const topRowElements = ["Name", "Description"];
  for (let i = 0; i < topRowElements.length; i++) {
    grid.appendChild(DOM_addAny("p", {"innerText": topRowElements[i]}));
  }

  // get Game version
  let ext = "USA";
  if (GameVersion == 1) ext = "Japan";
  if (GameVersion == 2) ext = "PAL";

  // make All other rows
  for (let i = 0; i < sortedNames.length; i++) {
    const relevant = JSON_filenames[sortedNames[i]];
    if (!relevant["Isfile_"+ext]) continue;

    // add to grid if in this game version
    grid.appendChild(DOM_addAny("p", {"innerText": sortedNames[i]}));
    if (relevant["IsSameAllVersions"]) {
      grid.appendChild(DOM_addAny("p", {"innerText": relevant["Description"]}));
    } else {
      if (GameVersion == 0) grid.appendChild(DOM_addAny("p", {"innerText": relevant["Description_USA"]}));
      if (GameVersion == 1) grid.appendChild(DOM_addAny("p", {"innerText": relevant["Description_Japan"]}));
      if (GameVersion == 2) grid.appendChild(DOM_addAny("p", {"innerText": relevant["Description_PAL"]}));
    }
  }
}
function gameVersionUpdater() {
  updateFilenameGrid();
  recalculateFileContents();
}

/* ------------- parse game file when uploaded ------------- */

function Assault_DropHandler(ev) {
  ev.preventDefault();
  Assault_FileChange(ev.dataTransfer.items[0].getAsFile());
}
function Assault_FileChange(file) {
  if (file == undefined) { return; }

  // verify filename and update what to export the filename as
  let filename = file.name.toLowerCase();
  const valid = /ts_mapdata[0-9]{2}.bin$/.test(filename);
  if (!valid) {
    let response = confirm("The file name '" + filename + "' seems incorrect. Are you sure you want to proceed?");
    if (!response) { return; }
  }
  const newFileNum = parseInt(filename.replace(/\D+/g, ''));
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
  const actualFileNameInTable = "ts_mapdata" + ((""+newFileNum).padStart(2, "0")) + ".bin";
  if (JSON_filenames != null && JSON_filenames[actualFileNameInTable] != undefined) {
    const relevant = JSON_filenames[actualFileNameInTable];
    
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
  Assault_parseFile(file);
}
function Assault_parseFile(file) {
  if (file == undefined) { return; }

  const reader = new FileReader();
  reader.onload = function(e) {
    const allLevelBoundaryData_backup = JSON.parse(JSON.stringify(allLevelBoundaryData));
    allLevelBoundaryData = { "bounds": [], "objects": [] };
    const view = new DataView(e.target.result);

    try {
      const amtOfData = view.getUint32(0);
      if (amtOfData > 2) {
        alert(`There seems to be ${amtOfData} types of data in the file when 1 or 2 is expected (first 4 bytes of file). The extra pieces of data won't be parsed`);
      }
    
      // parse bounds
      if (amtOfData >= 1) {
        let curOffset = view.getUint32(0x4);
        const amtOfBoundsData = view.getUint32(0xC);

        for (let i = 0; i < amtOfBoundsData; i++) {
          data_addBounds(
            view.getFloat32(curOffset+0x00),
            view.getFloat32(curOffset+0x04),
            view.getFloat32(curOffset+0x08),
            view.getFloat32(curOffset+0x0C),
            view.getFloat32(curOffset+0x10),
            view.getFloat32(curOffset+0x14),
            view.getFloat32(curOffset+0x18),
            view.getUint8(curOffset+0x1C),
            (view.getUint32(curOffset+0x1C) & 0xFFFFFF).toString(16)
          );
          curOffset += 0x20;
        }
      }

      // parse objects
      if (amtOfData >= 2) {
        let curOffset = view.getUint32(0x8);
        const amtOfBoundsData = view.getUint32(0x10);

        for (let i = 0; i < amtOfBoundsData; i++) {
          const hexStr = new Uint8Array(view.buffer, curOffset+1, 19).reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), '');

          data_addObjects(
            view.getUint8(curOffset+0x00),
            hexStr
          );
          curOffset += 0x14;
        }
      }

      wasFileChanged = false;
      refreshAllFilePreview();
    } catch (err) {
      alert(`Invalid Star Fox Assault File. Error: ${err}`);
      allLevelBoundaryData = allLevelBoundaryData_backup;
    }
  };
  reader.readAsArrayBuffer(file);
}


/* --------------------- Used for exporting the game file and getting the right name. And showing all options to users --------------- */

function updateFileNum(newNum) {
  if (isNaN(newNum) || newNum == undefined || newNum < -1 || newNum > 16) newNum = 0;
  fileNum = newNum;

  // update select option
  const select = document.getElementById("FileNameExport");
  select.value = fileNum;
  const selectTextContainer = select.options[select.selectedIndex];
  const selectText = selectTextContainer == undefined ? undefined : selectTextContainer.text;

  // get map name
  const map = (JSON_filenames == null || selectText == undefined) ? "unknown map" : selectText.substring(selectText.indexOf(" for ") + 5).slice(0, -1);

  // update download/export buttons
  const buttonContainer = document.getElementById("ButtonsAtBottomOfScreen");
  if (!buttonContainer) return; // making option tags, therefore the element wasn't loaded yet
  const allButtons = buttonContainer.getElementsByTagName("button");
  allButtons[0].innerText = `Download (${getFileName()})`;
  allButtons[1].innerText = `Copy as Gecko Code into Clipboard (${fileNum == -1 ? "All maps" : map})`;
}
function getFileName(endStr = ".bin", newNum = null) {
  if (newNum != null)
    updateFileNum(newNum);
  return "ts_mapdata" + (fileNum == -1 ? "xx" : (""+fileNum).padStart(2, "0")) + endStr;
}
function makeAllOptionTags() {
  const elem = document.getElementById("FileNameExport");
  const fragment = document.createDocumentFragment();
  const savedFileNum = fileNum;

  for (let i = -1; i < 17; i++) {
    const fileStr = getFileName(".bin", i);

    const desc = (i == -1) ? "Template" : ((JSON_filenames == null) ? "Loading..." : JSON_filenames[fileStr].Description);
    const padding = "\u00A0".repeat(Math.max(1, 20 - fileStr.length));

    const option = document.createElement("option");
    option.value = i;
    option.innerText = `${fileStr}${padding}(${desc == "" ? "unknown" : desc})`;
    fragment.appendChild(option);
  }

  updateFileNum(savedFileNum);
  elem.replaceChildren(fragment);
}

/* ---------------- update information on front end to visualize the data in the file --------------- */

function refreshAllFilePreview() {
  data_sanityCheck();
  const elem = document.getElementById("FileContents");
  const fragment = document.createDocumentFragment();
  document.activeElement.blur(); // prevent auto scrolling

  // helpers
  const bounds_makeFloatTopHexBottom = function(index, jsonName, value, advancedMode) {
    const toReturn = DOM_addAny("div", { "className": advancedMode ? "AdvancedOnly" : "" });
    toReturn.appendChild(DOM_addAny("input", {
      "name": "float_number",
      "type": "number",
      "step": 0.1,
      "value": value,
      "onchange": function(e) {
        data_updateBounds(index, jsonName, e.target.value);
        recalculateFileContents();
        update3DView();
      }
    }));
    toReturn.appendChild(DOM_addAny("br", { "className": "AdvancedOnly" }));
    toReturn.appendChild(DOM_addAny("input", {
      "name": "float_hex",
      "className": "AdvancedOnly",
      "value": float32toHex(value).padStart(8, "0"),
      "onchange": function(e) {
        data_updateBounds(index, jsonName, hexToFloat32(e.target.value.replace(/[^0-9a-fA-F]/g, '')));
        recalculateFileContents();
        update3DView();
      }
    }));
    return toReturn;
  }
  const bounds_addFlagCell = function(index, jsonName, value, advancedMode) {
    const toReturn = DOM_addAny("div", { "className": "flexRow" + (advancedMode ? " AdvancedOnly" : "") });
    // not in advanced mode visuals
    toReturn.appendChild(DOM_addAny("input", {
      "type": "checkbox",
      "name": `checkbox_bounds_${index}`,
      "id": `checkbox_bounds_${index}`,
      "checked": value > 0,
      "className": "NotAdvancedOnly",
      "onchange": function(e) {
        data_updateBounds(index, jsonName, ([false, true]).indexOf(e.target.checked));
        recalculateFileContents();
        update3DView();
      }
    }));
    toReturn.appendChild(DOM_addAny("label", {
      "innerText": "Is Space Level Flag",
      "htmlFor": `checkbox_bounds_${index}`,
      "className": "NotAdvancedOnly"
    }));
    // advanced mode visuals
    toReturn.appendChild(DOM_addAny("input", {
      "type": "number",
      "step": 1,
      "name": "Arwing_Flag_Input",
      "value": value,
      "className": "smallInput AdvancedOnly",
      "onchange": function(e) {
        data_updateBounds(index, jsonName, e.target.value);
        recalculateFileContents();
        update3DView();
      }
    }));
    toReturn.appendChild(DOM_addAny("p", {
      "innerText": "Disables Wingtip Contrails and Arwing doesn't fall downwards",
      "className": "AdvancedOnly"
    }));

    return toReturn;
  }
  const bounds_addUnused3Bytes = function(index, jsonName, value, advancedMode) {
    const toReturn = DOM_addAny("div", { "className": (advancedMode ? " AdvancedOnly" : "") });
    toReturn.appendChild(DOM_addAny("input", {
      "name": "float_hex",
      "className": "AdvancedOnly",
      "value": value.match(/.{1,2}/g).join(' '),
      "onchange": function(e) {
        data_updateBounds(index, jsonName, e.target.value);
        recalculateFileContents();
        update3DView();
      }
    }));
    return toReturn;
  }
  const general_addOtherRow = function(isBounds, index, advancedMode) {
    const toReturn = DOM_addAny("div", { "className": (advancedMode ? " AdvancedOnly" : "") });
    toReturn.innerHTML += XSVG + arrowDownwardSVG + arrowDownwardSVG;
    const allSVGs = toReturn.getElementsByTagName("svg");
    allSVGs[1].classList.add(isBounds ? "rotate90" : "rotate180");
    if (isBounds) allSVGs[2].classList.add("rotate270");

    allSVGs[0].onclick = function(e) {
      data_removeElement(isBounds, index);
      refreshAllFilePreview();
      recalculateFileContents();
      update3DView();
    }
    allSVGs[1].onclick = function(e) {
      data_swapElements(isBounds, index, index-1);
      refreshAllFilePreview();
      recalculateFileContents();
      update3DView();
    }
    allSVGs[2].onclick = function(e) {
      data_swapElements(isBounds, index, index+1);
      refreshAllFilePreview();
      recalculateFileContents();
      update3DView();
    }

    // hide arrows that would cause a crash
    if (index == 0)
      allSVGs[1].style.display = "none";
    if ((isBounds && index == allLevelBoundaryData.bounds.length-1) ||
        (!isBounds && index == allLevelBoundaryData.objects.length-1))
      allSVGs[2].style.display = "none";

    return toReturn;
  }
  const objects_addType = function(index, jsonName, value, advancedMode) {
    const toReturn = DOM_addAny("div", { "className": "flexRow" + (advancedMode ? " AdvancedOnly" : "") });

    const select = DOM_addAny("select", {
      "value": value,
      "name": "NonStaticSelect",
      "onchange": function(e) {
        data_updateObjects(index, jsonName, e.target.value);
        recalculateFileContents();
        update3DView();
      }
    });
    const allOptions = ["Nothing", "Moving/Rotating Objects", "Katina Outside Base Objects", "Katina Spinning Destroyable Things in Corner of Base", "Orbital Gate Spinning Objects", "Sargasso Spinning Thing Top Outside of Base", "Titania Spinning Flying Things"]
    const allValues =  [0,          1,                        4,                             6,                                                      7,                               8,                                             9]
    for (let i = 0; i < allOptions.length; i++) {
      select.appendChild(DOM_addAny("option", { "value": allValues[i], "innerText": allOptions[i] }));
    }
    select.value = value;
    toReturn.appendChild(select);

    toReturn.appendChild(DOM_addAny("input", {
      "type": "number",
      "className": "smallInput AdvancedOnly",
      "name": "NonStaticInput",
      "step": 1,
      "value": value,
      "onchange": function(e) {
        data_updateObjects(index, jsonName, e.target.value);
        recalculateFileContents();
        update3DView();
      }
    }));
    return toReturn;
  }
  const objects_addUnused15bytes = function(index, jsonName, value, advancedMode) {
    const toReturn = DOM_addAny("div", { "className": "flexRow" + (advancedMode ? " AdvancedOnly" : "") });
    toReturn.appendChild(DOM_addAny("input", {
      "name": "float_hex",
      "className": "bigInput AdvancedOnly",
      "value": formatUnused15BytesString(value),
      "onchange": function(e) {
        data_updateObjects(index, jsonName, e.target.value);
        recalculateFileContents();
        update3DView();
      }
    }));
    return toReturn;
  }

  // ------------------------------------------------------------------------------

  // show bounds on screen
  fragment.appendChild(DOM_addAny("h2", { "innerText": "Level Boundaries" }));
  const boundsTable = DOM_addAny("div", { "className": "boundsTable" });

  const advancedFlagsBounds = [true, true, false, false, false, false, false, false, false, true, true];
  const firstRowBounds = ["id", "Unused Float", "Landmaster Horizontal Range", "Arwing Hard Ceiling Limit", "Arwing Soft Ceiling Limit", "Arwing Horizontal Range", "Arwing Soft Floor Limit", "Arwing Hard Floor Limit", "Flag", "Unused Bytes (hex)", "Other"];
  for (let i = 0; i < firstRowBounds.length; i++) {
    const advText = advancedFlagsBounds[i] ? "AdvancedOnly" : "";
    boundsTable.appendChild(DOM_addAny("p", { "innerText": firstRowBounds[i], "className": advText}));
  }

  for (let i = 0; i < allLevelBoundaryData.bounds.length; i++) {
    const curData = allLevelBoundaryData.bounds[i];

    boundsTable.appendChild(DOM_addAny("p", {
      "innerText": i,
      "className": advancedFlagsBounds[0] ? "AdvancedOnly" : ""
    }));
    boundsTable.appendChild(bounds_makeFloatTopHexBottom(i, "unused", curData.unused, advancedFlagsBounds[1]));
    boundsTable.appendChild(bounds_makeFloatTopHexBottom(i, "Hor_Tank", curData.Hor_Tank, advancedFlagsBounds[2]));
    boundsTable.appendChild(bounds_makeFloatTopHexBottom(i, "Ceil_hard", curData.Ceil_hard, advancedFlagsBounds[3]));
    boundsTable.appendChild(bounds_makeFloatTopHexBottom(i, "Ceil_soft", curData.Ceil_soft, advancedFlagsBounds[4]));
    boundsTable.appendChild(bounds_makeFloatTopHexBottom(i, "Hor_Arwing", curData.Hor_Arwing, advancedFlagsBounds[5]));
    boundsTable.appendChild(bounds_makeFloatTopHexBottom(i, "Floor_soft", curData.Floor_soft, advancedFlagsBounds[6]));
    boundsTable.appendChild(bounds_makeFloatTopHexBottom(i, "Floor_hard", curData.Floor_hard, advancedFlagsBounds[7]));
    boundsTable.appendChild(bounds_addFlagCell(i, "Arwing_Turn_Line_Flag", curData.Arwing_Turn_Line_Flag, advancedFlagsBounds[8]));
    boundsTable.appendChild(bounds_addUnused3Bytes(i, "unused_3Bytes", curData.unused_3Bytes, advancedFlagsBounds[9]));
    boundsTable.appendChild(general_addOtherRow(true, i, advancedFlagsBounds[10]));
  }
  fragment.appendChild(boundsTable);
  fragment.appendChild(DOM_addAny("button", {
    "className": "addColumnButton" + (allLevelBoundaryData.bounds.length == 0 ? "" : " AdvancedOnly"),
    "innerText": "Add Bounds",
    "onclick": function(e) {
      data_addBounds();
      refreshAllFilePreview();
      recalculateFileContents();
      update3DView();
    }
  }));
  fragment.appendChild(DOM_addAny("div", { "className": "horizontalLine" }));

  // show objects to add to level
  fragment.appendChild(DOM_addAny("h2", { "innerText": "Non-Static Objects" }));
  fragment.appendChild(DOM_addAny("p", { "innerText": "I'm not fully sure how this works but it determines what type of non-static objects to make." }));
  fragment.appendChild(DOM_addAny("p", { "innerText": "I recommend not touching it. It also isn't shown on the 3D display because I don't understand it." }));
  const objectsTable = DOM_addAny("div", { "className": "objectsTable" });

  const advancedFlagsObjects = [false, false, true, false];
  const firstRowObjects = ["id", "Type of Object", "Unused 19 bytes (hex)", "Other"];
  for (let i = 0; i < firstRowObjects.length; i++) {
    const advText = advancedFlagsObjects[i] ? "AdvancedOnly" : "";
    objectsTable.appendChild(DOM_addAny("p", { "innerText": firstRowObjects[i], "className": advText}));
  }

  for (let i = 0; i < allLevelBoundaryData.objects.length; i++) {
    const curData = allLevelBoundaryData.objects[i];

    objectsTable.appendChild(DOM_addAny("p", {
      "innerText": i,
      "className": advancedFlagsObjects[0] ? "AdvancedOnly" : ""
    }));
    objectsTable.appendChild(objects_addType(i, "type", curData.type, advancedFlagsObjects[1]));
    objectsTable.appendChild(objects_addUnused15bytes(i, "unused_15Bytes", curData.unused_15Bytes, advancedFlagsObjects[2]));
    objectsTable.appendChild(general_addOtherRow(false, i, advancedFlagsBounds[3]));
  }
  fragment.appendChild(objectsTable);
  fragment.appendChild(DOM_addAny("button", {
    "className": "addColumnButton",
    "innerText": "Add Object",
    "onclick": function(e) {
      data_addObjects();
      refreshAllFilePreview();
      recalculateFileContents();
      update3DView();
    }
  }));

  // add all elements to screen and ensure everything on screen is up to date
  elem.replaceChildren(fragment);
  focusOnElement(lastFocusedPath);
  recalculateFileContents();
  update3DView();
}

/* -------------- Updating File preview and contents when downloading ------------- */

function recalculateFileContents() {
  // setup
  const OffsetDescriptionGrid = document.getElementById("OffsetDescriptionGrid");
  const FilePreviewGrid = document.getElementById("FilePreviewGrid");
  const WarningsText = document.getElementById("WarningsText");
  const ErrorsText = document.getElementById("ErrorText");

  const OffsetDescriptionGrid_frag = document.createDocumentFragment();
  const FilePreviewGrid_frag = document.createDocumentFragment();
  const WarningsText_frag = document.createDocumentFragment();
  const ErrorsText_frag = document.createDocumentFragment();

  const highlightColors = ["01", "05", "09", "13", "17", "02", "06", "10", "14", "18", "03", "07", "11", "15", "04", "08", "12", "16"];
  const startingAddress = (["80385D70", "8038A3B0", "803A0970"])[GameVersion]; // pointer locations: USA, Japan, PAL

  // calculate file size
  let fileSize = 4 + (2 * 8);
  const offsetForBoundaries = fileSize;
  fileSize += allLevelBoundaryData.bounds.length * 0x20;
  const offsetForObjects = fileSize;
  fileSize += allLevelBoundaryData.objects.length * 0x14;
  if ((fileSize & 0xF) != 0) fileSize += 16 - (fileSize & 0xF);
  fileDownloadContents = new ArrayBuffer(fileSize);
  const view = new DataView(fileDownloadContents);

  // check for all warnings and errors
  WarningsText_frag.appendChild(DOM_addAny("p", { "innerText": "Be warned of large file sizes! It might causes problems if it exceeds the file's normal length and Gecko Codes can only support so many lines at once!!!" }));
  if (allLevelBoundaryData.bounds.length > 0xFFFFFFFF) {
    ErrorsText_frag.appendChild(DOM_addAny("p", { "innerText": `The number of Boundaries (${allLevelBoundaryData.bounds.length}) exceeds the 4 byte unsigned integer limit (${0xFFFFFFFF}). Don't expect the file to work.` }));
  } else if (allLevelBoundaryData.bounds.length > 0x7FFFFFFF) {
    WarningsText_frag.appendChild(DOM_addAny("p", { "innerText": `The number of Boundaries (${allLevelBoundaryData.bounds.length}) exceeds the 4 byte signed integer limit (${0x7FFFFFFF}). The file may not work as expected.` }));
  } else if (allLevelBoundaryData.bounds.length == 0) {
    ErrorsText_frag.appendChild(DOM_addAny("p", { "innerText": `The number of Boundaries is 0. The game might behave really weirdly.` }));
  }
  if (allLevelBoundaryData.objects.length > 0xFFFFFFFF) {
    ErrorsText_frag.appendChild(DOM_addAny("p", { "innerText": `The number of non-static objects (${allLevelBoundaryData.objects.length}) exceeds the 4 byte unsigned integer limit (${0xFFFFFFFF}). Don't expect the file to work.` }));
  } else if (allLevelBoundaryData.objects.length > 0x7FFFFFFF) {
    WarningsText_frag.appendChild(DOM_addAny("p", { "innerText": `The number of non-static objects (${allLevelBoundaryData.objects.length}) exceeds the 4 byte signed integer limit (${0x7FFFFFFF}). The file may not work as expected.` }));
  } else if (allLevelBoundaryData.objects.length == 0) {
    ErrorsText_frag.appendChild(DOM_addAny("p", { "innerText": `The number of non-static objects is 0. The game might behave really weirdly.` }));
  }

  // QOL functions (updates all needed at once)
  const makeOffsetAddrText = function(offset) {
    return `[${startingAddress}]+0x${offset.toString(16).toUpperCase()}`;
  }
  const addValueToFile = function(offset, value, type_id, color_index, description) {
    const addrText = makeOffsetAddrText(offset);
    const colorType = color_index == 0 ? "" : `background-color: var(--highlightColor-${highlightColors[(color_index-1)%highlightColors.length]});`
    OffsetDescriptionGrid_frag.appendChild(DOM_addAny("p", { "innerText": addrText, "style": colorType }));
    if ((offset & 0xF) == 0) {
      FilePreviewGrid_frag.appendChild(DOM_addAny("p", { "innerText": addrText }));
    }

    let size = 4;
    switch (type_id) {
      case 0:
        view.setFloat32(offset, value);
        OffsetDescriptionGrid_frag.appendChild(DOM_addAny("p", { "innerText": "4 Byte Float", "style": colorType }));
        break;
      case 1:
        view.setUint8(offset, value);
        size = 1;
        OffsetDescriptionGrid_frag.appendChild(DOM_addAny("p", { "innerText": "1 Byte Signed Integer", "style": colorType }));
        break;
      case 2:
        view.setUint8(offset, value);
        size = 1;
        OffsetDescriptionGrid_frag.appendChild(DOM_addAny("p", { "innerText": "1 Byte Unsigned Integer", "style": colorType }));
        break;
      case 3:
        view.setUint32(offset, value);
        OffsetDescriptionGrid_frag.appendChild(DOM_addAny("p", { "innerText": "4 Byte Unsigned Integer", "style": colorType }));
        break;
    }
    for (let i = 0; i < size; i++) {
      FilePreviewGrid_frag.appendChild(DOM_addAny("p", { "innerText": view.getUint8(offset+i).toString(16).padStart(2, "0").toUpperCase(), "style": colorType }));
    }

    OffsetDescriptionGrid_frag.appendChild(DOM_addAny("p", { "innerText": description, "style": colorType }));
  }
  const addPaddingToFile = function(offset, strValue, color_index) {
    const colorType = color_index == 0 ? "" : `background-color: var(--highlightColor-${highlightColors[(color_index-1)%highlightColors.length]});`
    OffsetDescriptionGrid_frag.appendChild(DOM_addAny("p", { "innerText": makeOffsetAddrText(offset), "style": colorType }));

    const individualComponents = strValue.match(/.{1,2}/g);
    for (const val of individualComponents) {
      if ((offset & 0xF) == 0) {
        FilePreviewGrid_frag.appendChild(DOM_addAny("p", { "innerText": makeOffsetAddrText(offset) }));
      }
      view.setUint8(offset, parseInt(val, 16));
      FilePreviewGrid_frag.appendChild(DOM_addAny("p", { "innerText": view.getUint8(offset).toString(16).padStart(2, "0").toUpperCase(), "style": colorType }));
      offset++;
    }

    OffsetDescriptionGrid_frag.appendChild(DOM_addAny("p", { "innerText": `${individualComponents.length} Byte Padding`, "style": colorType }));
    OffsetDescriptionGrid_frag.appendChild(DOM_addAny("p", { "innerText": `-`, "style": colorType }));
  }

  // make headers of grids
  const offset_headers = ["Memory Address (in game)", "Variable Type", "Description"];
  for (let i = 0; i < offset_headers.length; i++) OffsetDescriptionGrid_frag.appendChild(DOM_addAny("p", { "innerText": offset_headers[i] }));
  const file_headers = ["Memory Address (in game)", ".0", ".1", ".2", ".3", ".4", ".5", ".6", ".7", ".8", ".9", ".A", ".B", ".C", ".D", ".E", ".F"];
  for (let i = 0; i < file_headers.length; i++) FilePreviewGrid_frag.appendChild(DOM_addAny("p", { "innerText": file_headers[i] }));

  // make file metadata
  let curOffset = 0;
  addValueToFile(curOffset, 2, 3, 0, "Number of Different Types of Data (always 0x2 in Vanilla game; one for boundaries and another for objects. Game does read this and expects objects to always be last.)");
  curOffset += 4;
  addValueToFile(curOffset, offsetForBoundaries, 3, 1, "Offset to Information about Level Boundaries");
  curOffset += 4;
  addValueToFile(curOffset, offsetForObjects, 3, 2, "Offset to Information about Non-Static Objects");
  curOffset += 4;
  addValueToFile(curOffset, allLevelBoundaryData.bounds.length, 3, 1, "Amount of Level Boundary Information (Always 0x1 in Vanilla game)");
  curOffset += 4;
  addValueToFile(curOffset, allLevelBoundaryData.objects.length, 3, 2, "Amount of Non-Static Objects");
  curOffset += 4;

  // add bounds info
  console.assert(offsetForBoundaries == curOffset, `Offset for Boundaries isn't what was expected. ${curOffset.toString(16)} ${offsetForBoundaries.toString(16)}`);
  for (let i = 0; i < allLevelBoundaryData.bounds.length; i++) {
    const curData = allLevelBoundaryData.bounds[i];
    addValueToFile(curOffset+0x00, curData.unused, 0, 1, `Level Boundary id ${i} - Unused Float`);
    addValueToFile(curOffset+0x04, curData.Hor_Tank, 0, 1, `Level Boundary id ${i} - Landmaster Horizontal Range`);
    addValueToFile(curOffset+0x08, curData.Hor_Arwing, 0, 1, `Level Boundary id ${i} - Arwing Horizontal Range`);
    addValueToFile(curOffset+0x0C, curData.Ceil_soft, 0, 1, `Level Boundary id ${i} - Arwing Soft Ceiling Limit`);
    addValueToFile(curOffset+0x10, curData.Floor_soft, 0, 1, `Level Boundary id ${i} - Arwing Soft Floor Limit`);
    addValueToFile(curOffset+0x14, curData.Ceil_hard, 0, 1, `Level Boundary id ${i} - Arwing Hard Ceiling Limit`);
    addValueToFile(curOffset+0x18, curData.Floor_hard, 0, 1, `Level Boundary id ${i} - Arwing Hard Floor Limit`);
    addValueToFile(curOffset+0x1C, curData.Arwing_Turn_Line_Flag, 1, 1, `Level Boundary id ${i} - Arwing Wingtip Contrail Flag`);
    addPaddingToFile(curOffset+0x1D, curData.unused_3Bytes, 1);
    curOffset += 0x20;
  }

  // add objects info
  console.assert(offsetForObjects == curOffset, `Offset for Objects isn't what was expected. ${curOffset.toString(16)} ${offsetForObjects.toString(16)}`);
  for (let i = 0; i < allLevelBoundaryData.objects.length; i++) {
    const curData = allLevelBoundaryData.objects[i];
    addValueToFile(curOffset+0x0, curData.type, 1, 2, `Non-Static Object id ${i} - Object Type`);
    addPaddingToFile(curOffset+0x1, curData.unused_15Bytes, 2);
    curOffset += 0x14;
  }

  // show extra zeros in file to get it align with 16 bytes
  while (curOffset != fileSize) {
    FilePreviewGrid_frag.appendChild(DOM_addAny("p", { "innerText": view.getUint8(curOffset).toString(16).padStart(2, "0").toUpperCase() }));
    curOffset += 1;
  }
  console.assert(curOffset == fileSize, "Not All Bytes of the file are shown to the user.", curOffset.toString(16), fileSize.toString(16));

  // update all elements on the site
  OffsetDescriptionGrid.replaceChildren(OffsetDescriptionGrid_frag);
  FilePreviewGrid.replaceChildren(FilePreviewGrid_frag);
  WarningsText.replaceChildren(WarningsText_frag);
  ErrorsText.replaceChildren(ErrorsText_frag);
}

// --------------------------------- Downloading Logic ------------------------------- */

function downloadBin() {
  const blob = new Blob([fileDownloadContents], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = getFileName(".bin");
  document.body.appendChild(a);
  a.click();

  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  wasFileChanged = false;
}
function geckoCodeCopy() {
  const MapIDstr = (""+((fileNum) & 0xFF).toString(16).toUpperCase()).padStart(2, "0");
  const checkVsMode = document.getElementById("GeckoCodeMakeVsModeCheck").checked;
  let toSetClipboard = "";

  // add if statements at top
  if (GameVersion == 0) { // USA
    toSetClipboard = "20D40974 0000000D\n48000000 80385D70\nDE000000 8000817F\n";
    if (checkVsMode) { toSetClipboard += "282A2C9C FF000001\n"; }
    if (MapIDstr != "FF") { toSetClipboard += "282A2C9E 00FF" + MapIDstr + "00\n"; }
  }
  if (GameVersion == 1) { // Japan
    toSetClipboard = "20D44F54 0000000D\n48000000 8038A3B0\nDE000000 8000817F\n";
    if (checkVsMode) { toSetClipboard += "282A72DC FF000001\n"; }
    if (MapIDstr != "FF") { toSetClipboard += "282A72DE 00FF" + MapIDstr + "00\n"; }
  } 
  if (GameVersion == 2) { // PAL
    toSetClipboard = "20D796D4 0000000D\n48000000 803A0970\nDE000000 8000817F\n";
    if (checkVsMode) { toSetClipboard += "282BD05C FF000001\n"; }
    if (MapIDstr != "FF") { toSetClipboard += "282BD05E 00FF" + MapIDstr + "00\n"; }
  }

  // add code to write to proper memory address
  toSetClipboard += "16000000 " + ((fileDownloadContents.byteLength & 0xFFFFFFFF).toString(16).toUpperCase().padStart(8, "0"));
  const vals = new Uint8Array(fileDownloadContents);
  for (let i = 0; i < fileDownloadContents.byteLength; i++) {
    if (i % 8 == 0) { toSetClipboard += "\n"; }
    else if (i % 4 == 0) { toSetClipboard += " "; }
    toSetClipboard += vals[i].toString(16).toUpperCase().padStart(2, "0");
  }
  
  // add end ifs
  if (checkVsMode && MapIDstr != "FF")       toSetClipboard += "\nE2000004 00000000"
  else if (checkVsMode || MapIDstr != "FF")  toSetClipboard += "\nE2000003 00000000"
  else                                       toSetClipboard += "\nE2000002 00000000"

  // return result to user's clipboard
  let advancedModeText = "";
  if (advancedMode) {
    advancedModeText  = "\n\nCode Explanation: First line checks if on the loading screen menu,";
    advancedModeText += " second is for loading into the pointer for where the file is, the third line ensures the pointer is a valid address,";
    if (checkVsMode) advancedModeText += " the fourth line checks if it is Vs. mode,"
    if (!checkVsMode && MapIDstr != "FF") advancedModeText += " the fourth line checks if map id is the map you wanted,";
    if (checkVsMode && MapIDstr != "FF") advancedModeText += " the fifth line checks if map id is the map you wanted,";
    advancedModeText += " the last line is to end all if statements, and everything in between is for setting the proper memory addresses to the values they need to be to load this file.";
  }

  navigator.clipboard.writeText(toSetClipboard)
  .then(() => {
    if (MapIDstr != "FF") alert("Success! It will only work for the map on the button you just pressed." + advancedModeText);
    else                  alert("Success! It will work for all maps in a situations." + advancedModeText);
  })
  .catch(err => {
    alert(`Failed to copy to clipboard. Error: ${err}`);
  });
}
function downloadJSON() {
  const jsonString = JSON.stringify(allLevelBoundaryData, null, 2);
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
      allLevelBoundaryData = JSON.parse(e.target.result);
      refreshAllFilePreview();
      wasFileChanged = false;
    } catch (err) {
      alert(`Invalid JSON: ${err}`);
    }
  };
  reader.readAsText(file);
}


/* -------------- Make ThreeJS segment of page ------------- */

function initialize3DDisplay() {
  const containerAll = document.getElementById("ThreeJSViewer");
  document.getElementById("UnloadedThreeJSButton").remove();

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

    document.getElementById("ThreeJSViewer").ondragover = function (event) { event.preventDefault(); };
    document.getElementById("ThreeJSViewer").ondrop = function (event) {
      event.preventDefault();
      mapDraggedIn(event);
    };
  }, { once: true });
}

/* --------------- Run on Page Load and Close ---------- */

// wait for full html load
window.addEventListener("load", function() {
  data_sanityCheck();
  data_addBounds();
  data_addObjects();
  updateFileNum(-1);
  refreshAllFilePreview();

  wasFileChanged = false;
  fetch('../Documentation/Filenames.json')
  .then(response => response.json())
  .then(data => {
    JSON_filenames = data;
    gameVersionUpdater();
    makeAllOptionTags();
  })
  .catch(error => {
    alert(`Failed to load file for filenames. Filenames and what they are will not be presented to you. I recommend a page refresh to fix it. Error: ${error}`)
  });
});

window.addEventListener("beforeunload", (event) => {
  // prevent closing when you changed something
  if (wasFileChanged) {
    event.preventDefault();
    event.returnValue = "";
  }
});