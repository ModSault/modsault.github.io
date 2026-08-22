/*
Variable with all information for the camera's keyframes.
Despite the fact the website only allows for one set of keyframes the variable is made to accommodate for multiple
in case this tool needs to be scaled for whatever reason.

Example (with fake data):
[
  {
    "name": "Keyframe set 1",
    "keyframes": [
      "x": 1.0,
      "y": 2.0,
      "z": 3.0,
      "rot_x": 542,
      "rot_y": 345,
      "rot_z": 453,
      "fov": 130
    ]
  },
  ...
]
*/
var allKeyframeData = [];
var fileDownloadContents = new ArrayBuffer(0); // this is download when clicking the blue button
var fileNum = 0; // used for getting correct filename on an export
var fileLetter = 'a'; // used to know if file is type 'a', 'b', or 'c'
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

/*
 * Shout outs to Claude figuring out the conversations after I got them
 * Signed 16-bit integer → degrees mapping:
 * 0x0000 (    0) → 180° (Z-)
 * 0x4000 (16384) → 90°  (X-)
 * 0x8000 (-32768)→ 0°   (Z+)
 * 0xC000 (-16384)→ 270° (X+)
 */
function angleToDegree(ang) {
  return ((-ang / 0x10000) * 360 + 180 + 360) % 360;
}
function DegreeToAngle(deg) {
  const raw = ((180 - deg) / 360) * 0x10000;
  const clamped = ((Math.round(raw) % 0x10000) + 0x10000) % 0x10000;
  return clamped >= 0x8000 ? clamped - 0x10000 : clamped;
}


/* ------------- general modifying keyframe data ---------- */

function data_addNewSet(nameToSet) {
  allKeyframeData.push({
    "name": nameToSet,
    "keyframes": []
  });
  wasFileChanged = true;

  if (document.getElementById("ThreeJSRenderedCheckMark").checked)
    rerenderAllThreeJS();
}
function data_addKeyFrame(index, toAdd_x = 0, toAdd_y = 0, toAdd_z = 0, toAdd_rx = 0, toAdd_ry = 0, toAdd_rz = 0, toAdd_fov = 7500) {
  allKeyframeData[index].keyframes.push({
    "x": 0,
    "y": 0,
    "z": 0,
    "rot_x": 0,
    "rot_y": 0,
    "rot_z": 0,
    "fov": 130
  });

  // ensure inputs are valid
  const keyframeIndex = allKeyframeData[index].keyframes.length-1;
  data_updateKeyFrame(index, keyframeIndex, "x", toAdd_x, false);
  data_updateKeyFrame(index, keyframeIndex, "y", toAdd_y, false);
  data_updateKeyFrame(index, keyframeIndex, "z", toAdd_z, false);
  data_updateKeyFrame(index, keyframeIndex, "rot_x", toAdd_rx, false);
  data_updateKeyFrame(index, keyframeIndex, "rot_y", toAdd_ry, false);
  data_updateKeyFrame(index, keyframeIndex, "rot_z", toAdd_rz, false);
  data_updateKeyFrame(index, keyframeIndex, "fov", toAdd_fov);
}
function data_removeSet(index) {
  allKeyframeData.splice(index, 1);
  wasFileChanged = true;
  if (document.getElementById("ThreeJSRenderedCheckMark").checked)
    rerenderAllThreeJS();
}
function data_removeKeyframe(index, keyframeIndex) {
  allKeyframeData[index].keyframes.splice(keyframeIndex, 1);
  wasFileChanged = true;
  if (document.getElementById("ThreeJSRenderedCheckMark").checked)
    rerenderAllThreeJS();
}
function data_swapKeyframe(index, keyframeIndex1, keyframeIndex2) {
  [allKeyframeData[index].keyframes[keyframeIndex1], allKeyframeData[index].keyframes[keyframeIndex2]]
    = [allKeyframeData[index].keyframes[keyframeIndex2], allKeyframeData[index].keyframes[keyframeIndex1]];
  wasFileChanged = true;
  if (document.getElementById("ThreeJSRenderedCheckMark").checked)
    rerenderAllThreeJS();
}
function data_updateName(index, nameToSet) {
  allKeyframeData[index].name = nameToSet;
  wasFileChanged = true;
  if (document.getElementById("ThreeJSRenderedCheckMark").checked)
    rerenderAllThreeJS();
}
function data_updateKeyFrame(index, keyframeIndex, jsonName, newValue, do3D = true) {
  // ensure data is a valid number
  if (newValue === "") newValue = 0;
  if (!isFinite(newValue)) newValue = 0;
  if ((["x", "y", "z"]).includes(jsonName)) {
    // ensure its a real float
    newValue = float64toFloat32(newValue);
    if (newValue === Infinity) newValue = Number.MAX_VALUE;
    if (newValue === -Infinity) newValue = -Number.MAX_VALUE;
  }
  if ((["rot_x", "rot_y", "rot_z", "fov"]).includes(jsonName)) {
    // ensure valid 2 byte integer
    newValue = parseInt(newValue);
    newValue = Math.min(newValue, 0x7FFF);
    newValue = Math.max(newValue, -0x8000);
  }

  // update data structure
  allKeyframeData[index].keyframes[keyframeIndex][jsonName] = newValue;
  wasFileChanged = true;

  // update on front end
  const ColumnNumber = (["x", "y", "z", "rot_x", "rot_y", "rot_z", "fov"]).indexOf(jsonName);
  const expectedDivInTable = (8*keyframeIndex) + ColumnNumber;
  const actualTable = document.getElementById("FileContents").getElementsByClassName("keyframeTable")[index];
  if (!actualTable) return; // table wasn't made yet
  const actualDiv = document.getElementById("FileContents").getElementsByClassName("keyframeTable")[index].getElementsByTagName("div")[expectedDivInTable];
  if (!actualDiv) return; // row wasn't made yet
  const inputs = actualDiv.getElementsByTagName("input");
  if ((["x", "y", "z"]).includes(jsonName)) {
    inputs[0].value = newValue*10;
    inputs[1].value = float32toHex(newValue);
  } else if ((["rot_x", "rot_y", "rot_z"]).includes(jsonName)) {
    inputs[0].value = angleToDegree(newValue);
    inputs[1].value = newValue;
  } else {
    inputs[0].value = newValue / 100;
    inputs[1].value = newValue;
  }

  if (do3D) recalculateFileContents();
  if (do3D && document.getElementById("ThreeJSRenderedCheckMark").checked)
    rerenderAllThreeJS();
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
  const valid = /ts_cammot[0-9]{2}[a-c]{1}.bin$/.test(filename);
  if (!valid) {
    let response = confirm("The file name '" + filename + "' seems incorrect. Are you sure you want to proceed?");
    if (!response) { return; }
  }
  const newFileNum = parseInt(filename.replace(/\D+/g, ''));
  const newFileLetter = filename.indexOf(".") > 0 ? filename[filename.indexOf(".") - 1] : 'a';
  updateFileNumAndLetter(newFileNum, newFileLetter);

  // update text in file upload box
  const AssaultLabelFile = document.getElementById("AssaultLabelFile");
  for (let node of AssaultLabelFile.childNodes) {
    if (node.nodeType === Node.TEXT_NODE && node.textContent.trim() !== "") {
      node.textContent = filename;
      break;
    }
  }
  // add description after filename so its purpose is easier to understand (if it exists)
  const actualFileNameInTable = "ts_cammot" + ((""+newFileNum).padStart(2, "0")) + newFileLetter + ".bin";
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
    let allKeyframeData_backup = JSON.parse(JSON.stringify(allKeyframeData));
    allKeyframeData = [];
    
    try {
      const view = new DataView(e.target.result);
      const numberOfKeyframeSets = view.getUint32(0);
      for (let i = 0; i < numberOfKeyframeSets; i++) {
        let offset = view.getUint32(4+(i*8));
        let numberOfKeyframes = view.getUint32(8+(i*8));
        data_addNewSet((i == 0) ? "KeyFrames" : `KeyFrame Set ${i+1}`);
        for (let j = 0; j < numberOfKeyframes; j++) {
          data_addKeyFrame(i, view.getFloat32(offset + 0x0), view.getFloat32(offset + 0x4), view.getFloat32(offset + 0x8),
                            view.getInt16(offset + 0xC), view.getInt16(offset + 0xE), view.getInt16(offset + 0x10), view.getInt16(offset + 0x12));
          offset += 0x14;
        }
      }

      wasFileChanged = false;
      refreshAllFilePreview();
    } catch (err) {
      alert(`Invalid Star Fox Assault File. Error: ${err}`);
      allKeyframeData = allKeyframeData_backup;
    }
    
  };
  reader.readAsArrayBuffer(file);
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
  const filteredNames = allNames.filter(key => /^ts_cammot[0-9]{2}[a-c]{1}.bin$/.test(key) );
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

/* --------------------- Used for exporting the game file and getting the right name. And showing all options to users --------------- */

function updateFileNumAndLetter(newNum, newLetter) {
  if (isNaN(newNum) || newNum == undefined || newNum < -1 || newNum > 16) newNum = 0;
  if (!(['a', 'b', 'c']).includes(newLetter)) newLetter = 'a';
  if (newNum == -1) newLetter = 'y';
  fileNum = newNum;
  fileLetter = newLetter;

  // update select option
  const select = document.getElementById("FileNameExport");
  select.value = fileNum == -1 ? -1 : (fileNum*3 + (['a','b','c'].indexOf(fileLetter)));
  const selectTextContainer = select.options[select.selectedIndex];
  const selectText = selectTextContainer == undefined ? undefined : selectTextContainer.text;

  // get map and type
  const map = (JSON_filenames == null || selectText == undefined) ? "unknown map" : selectText.substring(selectText.indexOf(" for ") + 5).slice(0, -1);
  const locationOfSecondParenthesis = (JSON_filenames == null || selectText == undefined) ? 0 : selectText.indexOf("(", selectText.indexOf("(") + 1);
  const type = (JSON_filenames == null || selectText == undefined) ? "unknown type" : selectText.substring(locationOfSecondParenthesis+1, selectText.indexOf(")"));

  // update download/export buttons
  const buttonContainer = document.getElementById("ButtonsAtBottomOfScreen");
  if (!buttonContainer) return; // making option tags, therefore the element wasn't loaded yet
  const allButtons = buttonContainer.getElementsByTagName("button");
  allButtons[0].innerText = `Download (${getFileName()})`;
  allButtons[1].innerText = `Copy as Gecko Code into Clipboard (${fileNum == -1 ? "All maps" : map} - ${fileNum == -1 ? "All types" : type})`;
}
function getFileName(endStr = ".bin", newNum = null, newLetter = null) {
  if (newNum != null)
    updateFileNumAndLetter(newNum, newLetter);
  return "ts_cammot" + (fileNum == -1 ? "xx" : (""+fileNum).padStart(2, "0")) + fileLetter + endStr;
}
function makeAllOptionTags() {
  const elem = document.getElementById("FileNameExport");
  const fragment = document.createDocumentFragment();
  const savedFileNum = fileNum;
  const savedFileLetter = fileLetter;

  for (let i = -1; i < 17*3; i++) {
    const newNum = (i == -1) ? i : Math.floor(i / 3);
    const newLetter = (i == -1) ? 'y' : (['a','b','c'])[i%3];
    const fileStr = getFileName(".bin", newNum, newLetter);

    const desc = (i == -1) ? "Template" : ((JSON_filenames == null) ? "Loading..." : JSON_filenames[fileStr].Description);
    const padding = "\u00A0".repeat(Math.max(1, 20 - fileStr.length));

    const option = document.createElement("option");
    option.value = i;
    option.innerText = `${fileStr}${padding}(${desc == "" ? "unknown" : desc})`;
    fragment.appendChild(option);
  }

  updateFileNumAndLetter(savedFileNum, savedFileLetter);
  elem.replaceChildren(fragment);
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
  let toSetClipboard = "";
  let startingAddress;

  // add if statements at top
  if (GameVersion == 0) { // USA
    toSetClipboard = "282A2C9C FF000001\n20D40974 0000000D\n48000000 8029CF48\nDE000000 8000817F\n";
    if (MapIDstr != "FF") {
      toSetClipboard += "282A2C9E 00FF" + MapIDstr + "00\n"; // 802A2E46
      if (fileLetter == 'a')      toSetClipboard += "282A2E46 FEFF0100\n"; // check if on-foot selected
      else if (fileLetter == 'b') toSetClipboard += "2C2A2E46 F0FF0300\n2A2A2E46 FEFF0100\n"; // check if value of what selected is > 3 (aka arwing/wolfen selected) and check if on-foot isn't picked
      else                        toSetClipboard += "282A2E46 F2FF0000\n"; // check if nothing but landmaster was selected
    }
    startingAddress = 0x802A50C0;
  }
  if (GameVersion == 1) { // Japan
    toSetClipboard = "282A72DC FF000001\n20D44F54 0000000D\n48000000 802A1588\nDE000000 8000817F\n";
    if (MapIDstr != "FF") {
      toSetClipboard += "282A72DE 00FF" + MapIDstr + "00\n"; // 802A7486
      if (fileLetter == 'a')      toSetClipboard += "282A7486 FEFF0100\n"; // check if on-foot selected
      else if (fileLetter == 'b') toSetClipboard += "2C2A7486 F0FF0300\n2A2A7486 FEFF0100\n"; // check if value of what selected is > 3 (aka arwing/wolfen selected) and check if on-foot isn't picked
      else                        toSetClipboard += "282A7486 F2FF0000\n"; // check if nothing but landmaster was selected
    }
    startingAddress = 0x802A9700;
  } 
  if (GameVersion == 2) { // PAL
    toSetClipboard = "282BD05C FF000001\n20D796D4 0000000D\n48000000 802B7308\nDE000000 8000817F\n";
    if (MapIDstr != "FF") {
      toSetClipboard += "282BD05E 00FF" + MapIDstr + "00\n"; // 802BD206
      if (fileLetter == 'a')      toSetClipboard += "282BD206 FEFF0100\n"; // check if on-foot selected
      else if (fileLetter == 'b') toSetClipboard += "2C2BD206 F0FF0300\n2A2BD206 FEFF0100\n"; // check if value of what selected is > 3 (aka arwing/wolfen selected) and check if on-foot isn't picked
      else                        toSetClipboard += "282BD206 F2FF0000\n"; // check if nothing but landmaster was selected
    }
    startingAddress = 0x802BF480;
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
  if (MapIDstr != "FF" && fileLetter == 'b') toSetClipboard += "\nE2000006 00000000"
  else if (MapIDstr != "FF")                 toSetClipboard += "\nE2000005 00000000"
  else                                       toSetClipboard += "\nE2000003 00000000"

  // return result to user's clipboard
  let advancedModeText = "";
  if (advancedMode) {
    advancedModeText  = "\n\nCode Explanation: First line check if in Vs mode, second line checks if on the loading screen menu,";
    advancedModeText += "third is for loading into the pointer for where the file is, the fourth line ensures the pointer is a valid address";
    if (MapIDstr != "FF") advancedModeText += "the fifth line checks if map id is the map you wanted, the sixth checks if its the proper context";
    if (MapIDstr != "FF" && fileLetter == 'b') advancedModeText += "the seventh line also checks if its the proper context because I needed two checks for the Arwing/Wolfen check,";
    advancedModeText += " the last line is to end all if statements, and everything in between is for setting the proper memory addresses to the values they need to be to load this file.";
  }

  navigator.clipboard.writeText(toSetClipboard)
  .then(() => {
    if (MapIDstr != "FF") alert("Success! It will only work for the map and type seen on the button you just pressed." + advancedModeText);
    else                  alert("Success! It will work for all maps in a situations." + advancedModeText);
  })
  .catch(err => {
    alert(`Failed to copy to clipboard. Error: ${err}`);
  });
}
function downloadJSON() {
  const jsonString = JSON.stringify(allKeyframeData, null, 2);
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
      allKeyframeData = JSON.parse(e.target.result);
      refreshAllFilePreview();
      wasFileChanged = false;
    } catch (err) {
      alert(`Invalid JSON: ${err}`);
    }
  };
  reader.readAsText(file);
}

/* -------------- Remove and Add all information for keyframes ----------- */

function refreshAllFilePreview() {
  const elem = document.getElementById("FileContents");
  const fragment = document.createDocumentFragment();
  const te = getFocusedElementPath();
  document.activeElement.blur(); // prevent auto scrolling

  // helpers
  const addPositionInput = function(index, keyFrameNum, jsonName, val) {
    const toReturn = DOM_addAny("div", {});
    toReturn.appendChild(DOM_addAny("input", {
      "name": "position",
      "type": "number",
      "step": 0.1,
      "value": val*10,
      "onchange": function(e) { data_updateKeyFrame(index, keyFrameNum, jsonName, e.target.value/10); }
    }));
    toReturn.appendChild(DOM_addAny("br", { "className": "AdvancedOnly" }));
    toReturn.appendChild(DOM_addAny("input", {
      "name": "position_hex",
      "className": "AdvancedOnly",
      "value": float32toHex(val),
      "onchange": function(e) { data_updateKeyFrame(index, keyFrameNum, jsonName, hexToFloat32(e.target.value.replace(/[^0-9a-fA-F]/g, ""))); }
    }));
    return toReturn;
  }
  const addPOVInput = function(index, keyFrameNum, jsonName, val) {
    const toReturn = DOM_addAny("div", {});
    toReturn.appendChild(DOM_addAny("input", {
      "name": "fov",
      "type": "number",
      "step": 0.1,
      "value": val/100,
      "onchange": function(e) { data_updateKeyFrame(index, keyFrameNum, jsonName, e.target.value*100); }
    }));
    toReturn.appendChild(DOM_addAny("br", { "className": "AdvancedOnly" }));
    toReturn.appendChild(DOM_addAny("input", {
      "name": "fov_raw",
      "className": "AdvancedOnly",
      "type": "number",
      "step": 1,
      "value": val,
      "onchange": function(e) { data_updateKeyFrame(index, keyFrameNum, jsonName, e.target.value); }
    }));
    return toReturn;
  }
  const addRotationInput = function(index, keyFrameNum, jsonName, val) {
    const toReturn = DOM_addAny("div", {});
    toReturn.appendChild(DOM_addAny("input", {
      "name": "angle_degrees",
      "type": "number",
      "step": 0.1,
      "value": angleToDegree(val),
      "onchange": function(e) { data_updateKeyFrame(index, keyFrameNum, jsonName, DegreeToAngle(e.target.value)); }
    }));
    toReturn.appendChild(DOM_addAny("br", { "className": "AdvancedOnly" }));
    toReturn.appendChild(DOM_addAny("input", {
      "name": "angle_raw",
      "className": "AdvancedOnly",
      "type": "number",
      "step": 1,
      "value": val,
      "onchange": function(e) { data_updateKeyFrame(index, keyFrameNum, jsonName, e.target.value); }
    }));
    return toReturn;
  }


  for (let i = 0; i < allKeyframeData.length; i++) {
    // make name of table
    fragment.appendChild(DOM_addAny("h2", { "innerText": allKeyframeData[i].name }));
    const table = DOM_addAny("div", { "className": "keyframeTable" });

    // make top row
    const topRow = ["id", "X position", "Y position", "Z position", "Pitch", "Yaw", "Roll", "Field of View", "Other"];
    for (const str of topRow) {
      table.appendChild(DOM_addAny("p", { "innerText": str }));
    }

    // add keyframe data
    for (let j = 0; j < allKeyframeData[i].keyframes.length; j++) {
      const curKeyFrame = allKeyframeData[i].keyframes[j];

      table.appendChild(DOM_addAny("p", { "innerText": j }));
      table.appendChild(addPositionInput(i, j, "x", curKeyFrame.x));
      table.appendChild(addPositionInput(i, j, "y", curKeyFrame.y));
      table.appendChild(addPositionInput(i, j, "z", curKeyFrame.z));
      table.appendChild(addRotationInput(i, j, "rot_x", curKeyFrame.rot_x));
      table.appendChild(addRotationInput(i, j, "rot_y", curKeyFrame.rot_y));
      table.appendChild(addRotationInput(i, j, "rot_z", curKeyFrame.rot_z));
      table.appendChild(addPOVInput(i, j, "fov", curKeyFrame.fov));

      const otherBox = DOM_addAny("div", { "innerHTML": XSVG + arrowDownwardSVG + arrowDownwardSVG });
      const allSVG = otherBox.getElementsByTagName("svg");
      allSVG[0].onclick = function () { data_removeKeyframe(i, j); refreshAllFilePreview(); } // X
      allSVG[1].onclick = function () { data_swapKeyframe(i, j, j-1); refreshAllFilePreview(); } // Up arrow
      allSVG[2].onclick = function () { data_swapKeyframe(i, j, j+1); refreshAllFilePreview(); } // Down arrow
      allSVG[1].classList.add("rotate180"); // flip up arrow (so it doesn't show as downward)
      // hide arrows if on end of table
      if (j == 0) allSVG[1].style.display = "none";
      if (j == allKeyframeData[i].keyframes.length - 1) allSVG[2].style.display = "none";

      // hide X if only 1 keyframe exists
      if (allKeyframeData[i].keyframes.length == 1) {
        allSVG[0].classList.add("AdvancedOnly");

        const pWarningMsg = DOM_addAny("p", { "className": "NotAdvancedOnly" });
        pWarningMsg.appendChild(document.createTextNode("X removed"));
        pWarningMsg.appendChild(document.createElement("br"));
        pWarningMsg.appendChild(document.createTextNode("for safety"));
        otherBox.appendChild(pWarningMsg);
      }
      otherBox.appendChild(DOM_addAny("button", {
        "innerText": "go to",
        "className": "ThreeJSOnly",
        "onclick": () => gotoButtonHandler(i,j)
      }));
      otherBox.appendChild(DOM_addAny("button", {
        "innerText": "copy camera",
        "className": "ThreeJSOnly",
        "onclick": () => copyCamButtonHandler(i,j)
      }));

      table.appendChild(otherBox);
    }
    fragment.appendChild(table);

    // buttons below table
    const divWithButtons = DOM_addAny("div", { "className": "addButtonContainer" });
    divWithButtons.appendChild(DOM_addAny("button", {
      "innerText": "Quick add from Camera",
      "className": "ThreeJSOnly",
      "onclick": () => quickAddButtonHandler(i)
    }));
    divWithButtons.appendChild(DOM_addAny("button", {
      "innerText": "Add Keyframe",
      "onclick": function() { data_addKeyFrame(i); refreshAllFilePreview(); }
    }));
    divWithButtons.appendChild(DOM_addAny("button", {
      "innerText": "Remove Keyframe Set",
      "className": "AdvancedOnly",
      "onclick": function() { data_removeSet(i); refreshAllFilePreview(); }
    }));
    fragment.appendChild(divWithButtons);

    // space out tables
    fragment.appendChild(document.createElement("br"));
  }

  // button below all tables
  fragment.appendChild(DOM_addAny("button", {
    "innerText": "Add Keyframe Set",
    "className": "addKeyframeSet " + (allKeyframeData.length !== 0 ? "AdvancedOnly" : ""),
    "onclick": function() { data_addNewSet(`KeyFrame Set ${allKeyframeData.length+1}`); refreshAllFilePreview(); }
  }));

  elem.replaceChildren(fragment);
  focusOnElement(lastFocusedPath);
  recalculateFileContents();
  if (document.getElementById("ThreeJSRenderedCheckMark").checked)
    rerenderAllThreeJS();
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
  const startingAddress = (["8029CF48", "802A1588", "802B7308"])[GameVersion]; // pointer locations: USA, Japan, PAL

  // calculate file size
  let offsetsOfSets = [];
  let fileSize = 4 + (allKeyframeData.length * 8);
  for (let i = 0; i < allKeyframeData.length; i++) {
    offsetsOfSets.push(fileSize);
    fileSize += 20 * allKeyframeData[i].keyframes.length;
  }
  if ((fileSize & 0xF) != 0) fileSize += 16 - (fileSize & 0xF);
  fileDownloadContents = new ArrayBuffer(fileSize);
  const view = new DataView(fileDownloadContents);

  // check for all warnings and errors
  WarningsText_frag.appendChild(DOM_addAny("p", { "innerText": "Be warned of large file sizes! It might causes problems if it exceeds the file's normal length and Gecko Codes can only support so many lines at once!!!" }));
  if (allKeyframeData.length > 0xFFFFFFFF) {
    ErrorsText_frag.appendChild(DOM_addAny("p", { "innerText": `The number of Keyframe Sets (${allKeyframeData.length}) exceeds the 4 byte unsigned integer limit (${0xFFFFFFFF}). Don't expect the file to work.` }));
  } else if (allKeyframeData.length > 0x7FFFFFFF) {
    WarningsText_frag.appendChild(DOM_addAny("p", { "innerText": `The number of Keyframe Sets (${allKeyframeData.length}) exceeds the 4 byte signed integer limit (${0x7FFFFFFF}). The file may not work as expected.` }));
  } else if (allKeyframeData.length == 0) {
    ErrorsText_frag.appendChild(DOM_addAny("p", { "innerText": `The number of Keyframe Sets is 0. The game might behave really weirdly.` }));
  }
  for (let i = 0; i < allKeyframeData.length; i++) {
    if (allKeyframeData[i].keyframes.length < 42) {
      WarningsText_frag.appendChild(DOM_addAny("p", { "innerText": `The number of Keyframes (${allKeyframeData[i].keyframes.length}) in Keyframe Set (${i}) is less than 42 (the amount of keyframes the game always has). Due to faulty math in the game, it might read more keyframes then what you actually have.` }));
    }
    if (allKeyframeData[i].keyframes.length > 42) {
      WarningsText_frag.appendChild(DOM_addAny("p", { "innerText": `The number of Keyframes (${allKeyframeData[i].keyframes.length}) in Keyframe Set (${i}) is larger than 42 (the amount of keyframes the game always has). Due to faulty math in the game, it might read less keyframes then what you actually have.` }));
    }
    if (allKeyframeData[i].keyframes.length > 0xFFFFFFFF) {
      ErrorsText_frag.appendChild(DOM_addAny("p", { "innerText": `The number of Keyframes (${allKeyframeData[i].keyframes.length}) in set '${allKeyframeData[i].name}' exceeds the 4 byte unsigned integer limit (${0xFFFFFFFF}). Don't expect the file to work.` }));
    } else if (allKeyframeData[i].keyframes.length > 0x7FFFFFFF) {
      WarningsText_frag.appendChild(DOM_addAny("p", { "innerText": `The number of Keyframes (${allKeyframeData[i].keyframes.length}) in set '${allKeyframeData[i].name}' exceeds the 4 byte signed integer limit (${0x7FFFFFFF}). The file may not work as expected.` }));
    } else if (allKeyframeData[i].keyframes.length == 0) {
      ErrorsText_frag.appendChild(DOM_addAny("p", { "innerText": `The number of Keyframes in set '${allKeyframeData[i].name}' is 0. The game might behave really weirdly.` }));
    }
    if (offsetsOfSets[i] > 0x10000000) {
      ErrorsText_frag.appendChild(DOM_addAny("p", { "innerText": `The offset (${offsetsOfSets[i].toString(16)}) in set '${allKeyframeData[i].name}' seems very large. The file will most likely cause a crash.` }));
    } else if (offsetsOfSets[i] > 0x01000000) {
      WarningsText_frag.appendChild(DOM_addAny("p", { "innerText": `The offset (${offsetsOfSets[i].toString(16)}) in set '${allKeyframeData[i].name}' seems large. The file may cause a crash.` }));
    }
  }

  // QOL function (updates all needed at once)
  const addValueToFile = function(offset, value, type_id, color_index, description) {
    const addrText = `[${startingAddress}]+0x${offset.toString(16).toUpperCase()}`;
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
        view.setInt32(offset, value);
        OffsetDescriptionGrid_frag.appendChild(DOM_addAny("p", { "innerText": "4 Byte Signed Integer", "style": colorType }));
        break;
      case 2:
        view.setUint32(offset, value);
        OffsetDescriptionGrid_frag.appendChild(DOM_addAny("p", { "innerText": "4 Byte Unsigned Integer", "style": colorType }));
        break;
      case 3:
        view.setInt16(offset, value);
        OffsetDescriptionGrid_frag.appendChild(DOM_addAny("p", { "innerText": "2 Byte Signed Integer", "style": colorType }));
        size = 2;
        break;
    }
    for (let i = 0; i < size; i++) {
      FilePreviewGrid_frag.appendChild(DOM_addAny("p", { "innerText": view.getUint8(offset+i).toString(16).padStart(2, "0").toUpperCase(), "style": colorType }));
    }

    OffsetDescriptionGrid_frag.appendChild(DOM_addAny("p", { "innerText": description, "style": colorType }));
  }

  // make headers of grids
  const offset_headers = ["Memory Address (in game)", "Variable Type", "Description"];
  for (let i = 0; i < offset_headers.length; i++) OffsetDescriptionGrid_frag.appendChild(DOM_addAny("p", { "innerText": offset_headers[i] }));
  const file_headers = ["Memory Address (in game)", ".0", ".1", ".2", ".3", ".4", ".5", ".6", ".7", ".8", ".9", ".A", ".B", ".C", ".D", ".E", ".F"];
  for (let i = 0; i < file_headers.length; i++) FilePreviewGrid_frag.appendChild(DOM_addAny("p", { "innerText": file_headers[i] }));

  // make file metadata
  let curOffset = 0;
  addValueToFile(curOffset, allKeyframeData.length, 1, 0, "Number of Keyframe Sets (always 0x1 in vanilla game; game never reads this value)");
  curOffset += 4;
  for (let i = 0; i < allKeyframeData.length; i++) {
    addValueToFile(curOffset, offsetsOfSets[i], 2, i+1, `Offset to KeyFrame Set - ${allKeyframeData[i].name}`);
    addValueToFile(curOffset+4, allKeyframeData[i].keyframes.length, 2, i+1, "Number of Keyframes in this Set (mainly used to know how long the intro is)");
    curOffset += 8;
  }

  // write keyframedata
  for (let i = 0; i < allKeyframeData.length; i++) {
    console.assert(curOffset == offsetsOfSets[i], "Offset where keyframe data is written to and expected to didn't match", curOffset.toString(16), offsetsOfSets[i].toString(16));
    for (let j = 0; j < allKeyframeData[i].keyframes.length; j++) {
      const curKeyFrame = allKeyframeData[i].keyframes[j];
      const KeyframeText = `Keyframe Set ${i} id ${j} - `;
      addValueToFile(curOffset+ 0, curKeyFrame.x, 0, i+1, `${KeyframeText}X position`);
      addValueToFile(curOffset+ 4, curKeyFrame.y, 0, i+1, `${KeyframeText}Y position`);
      addValueToFile(curOffset+ 8, curKeyFrame.z, 0, i+1, `${KeyframeText}Z position`);
      addValueToFile(curOffset+12, curKeyFrame.rot_x, 3, i+1, `${KeyframeText}Pitch rotation`);
      addValueToFile(curOffset+14, curKeyFrame.rot_y, 3, i+1, `${KeyframeText}Yaw rotation`);
      addValueToFile(curOffset+16, curKeyFrame.rot_z, 3, i+1, `${KeyframeText}Roll position`);
      addValueToFile(curOffset+18, curKeyFrame.fov, 3, i+1, `${KeyframeText}Field of View (FOV)`);
      curOffset += 20;
    }
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
  data_addNewSet("KeyFrames");
  data_addKeyFrame(0);
  updateFileNumAndLetter(-1, 'y');
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