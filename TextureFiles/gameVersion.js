// This file handles all changes when the game version is changed (like from USA to Japan)

function gameVersionUpdater() {
  updateFilenameGrid();
  makeAllOptionTags();
  showAddressOfTrees();
  showCodeForVsModeCharacters();
}

// this is for grid with all filenames and what they are
function updateFilenameGrid() {
  if (g_JSON_filenames == null) return;

  // remove all elements in grid
  const grid = document.getElementById("FileNameGrid");
  grid.replaceChildren();

  // get all filenames needed and sort alphabetically
  const allNames = Object.keys(g_JSON_filenames);
  const filteredNames = allNames.filter(key => (/^tex_pack_[0-9]{2}.nut$/.test(key) || (/ns_logos\d{0,1}\.nut$/.test(key))) );
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
    const relevant = g_JSON_filenames[sortedNames[i]];
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

// makes dropdown to select filename to download and all its text
function makeAllOptionTags() {
  const elem = document.getElementById("FileNameExport");
  const fragment = document.createDocumentFragment();
  const savedFileNum = g_fileNum;

  for (let i = -1; i <= 78 + 6; i++) {
    let fileStr = getFileName(".nut", i);
    if (i > 79) fileStr = "logo/" + fileStr;
    if (i == 79 && GameVersion == 1) fileStr = "attract/" + fileStr; // file is elsewhere in Japan copy

    const desc = (i == -1) ? "Template" : ((g_JSON_filenames == null) ? "Loading..." : g_JSON_filenames[fileStr].Description);
    const padding = "\u00A0".repeat(Math.max(1, 24 - fileStr.length));

    const option = document.createElement("option");
    option.value = i;
    option.innerText = `${fileStr}${padding}(${desc == "" ? "unknown" : desc})`;
    fragment.appendChild(option);
  }

  elem.replaceChildren(fragment);
  updateFileNum(savedFileNum);
}

// Used for showing where binary tress are in advanced mode only box at bottom of the screen
function showAddressOfTrees() {
  const frag = document.createDocumentFragment();
  const pixelDataTree = ["8081A620", "8081EC00", "80853380"]; // USA, Japan, PAL
  const colorDataTree = ["8082E680", "80832C60", "808673E0"];

  frag.appendChild(DOM_addAny("span", {
    innerText: `Pixel data tree location around memory: 0x${pixelDataTree[GameVersion]}`
  }));
  frag.appendChild(DOM_addAny("br"));
  frag.appendChild(DOM_addAny("span", {
    innerText: `Color data tree location around memory: 0x${colorDataTree[GameVersion]}`
  }));

  document.getElementById("TreeLocations").replaceChildren(frag);
}


// Provides the gecko code to the user to allow for more customizable vs mode character textures 
function showCodeForVsModeCharacters() {
  let replaceAmt = 0;
  if (document.getElementById("GeckoCode_Input_Fox").checked) replaceAmt += 0x0001;
  if (document.getElementById("GeckoCode_Input_Falco").checked) replaceAmt += 0x0002;
  if (document.getElementById("GeckoCode_Input_Slippy").checked) replaceAmt += 0x0004;
  if (document.getElementById("GeckoCode_Input_Krystal").checked) replaceAmt += 0x0008;
  if (document.getElementById("GeckoCode_Input_Peppy").checked) replaceAmt += 0x0010;
  if (document.getElementById("GeckoCode_Input_Wolf").checked) replaceAmt += 0x0020;

  const addCode = function(code) {
    const elem = document.getElementById("uniqueColorsCode");
    const frag = document.createDocumentFragment();
    for (let i = 0; i < code.length; i++) {
      if (i !== 0) frag.appendChild(document.createElement("br"));
      frag.appendChild(document.createTextNode(code[i].replaceAll("ZZZZ", replaceAmt.toString(16).toUpperCase().padStart(4, "0"))));
    }
    elem.replaceChildren(frag);
  }

  if (GameVersion == 0) { // USA
    const array = [
      "040781F0 3C841000",
      "040781C0 3C841000",
      "0416525C 80B30004",
      "20D40974 00000016",
      "C20781F0 00000003",
      "48000005 7CC802A6",
      "38C60094 48000019",
      "60000000 00000000",
      "C20781C0 0000000C",
      "48000051 3C841000",
      "881C01FB 38A00001",
      "7CA50030 70A5ZZZZ",
      "4D820020 7CA802A6",
      "38000000 B0660002",
      "48000015 B086000A",
      "4800000D 7CA803A6",
      "4E800020 7C0600AC",
      "7C0004AC 7C0607AC",
      "4C00012C 4E800020",
      "7CC802A6 38C60068",
      "4BFFFFAD 00000000",
      "C216525C 00000005",
      "A0B30006 2C057FFF",
      "40820008 38A07FFF",
      "2C057FFF 40820008",
      "38A07FFF 64A51000",
      "60000000 00000000",
      "E2000001 00000000",
    ];
    addCode(array);
    return;
  }
  if (GameVersion == 1) { // Japan
    const array = [
      "04077BB0 3C841000",
      "04077B80 3C841000",
      "04163298 80B30004",
      "20D44F57 00000016",
      "C2077BB0 00000003",
      "48000005 7CC802A6",
      "38C60094 48000019",
      "60000000 00000000",
      "C2077B80 0000000C",
      "48000051 3C841000",
      "881C01FB 38A00001",
      "7CA50030 70A5ZZZZ",
      "4D820020 7CA802A6",
      "38000000 B0660002",
      "48000015 B086000A",
      "4800000D 7CA803A6",
      "4E800020 7C0600AC",
      "7C0004AC 7C0607AC",
      "4C00012C 4E800020",
      "7CC802A6 38C60068",
      "4BFFFFAD 00000000",
      "C2163298 00000005",
      "A0B30006 2C057FFF",
      "40820008 38A07FFF",
      "2C057FFF 40820008",
      "38A07FFF 64A51000",
      "60000000 00000000",
      "E2000001 00000000",
    ];
    addCode(array);
    return;
  }
  if (GameVersion == 2) { // PAL
    const array = [
      "04078B50 3C841000",
      "04078B20 3C841000",
      "04167024 80B30004",
      "20D796D7 00000016",
      "C2078B50 00000003",
      "48000005 7CC802A6",
      "38C60094 48000019",
      "60000000 00000000",
      "C2078B20 0000000C",
      "48000051 3C841000",
      "881C01FB 38A00001",
      "7CA50030 70A5ZZZZ",
      "4D820020 7CA802A6",
      "38000000 B0660002",
      "48000015 B086000A",
      "4800000D 7CA803A6",
      "4E800020 7C0600AC",
      "7C0004AC 7C0607AC",
      "4C00012C 4E800020",
      "7CC802A6 38C60068",
      "4BFFFFAD 00000000",
      "C2167024 00000005",
      "A0B30006 2C057FFF",
      "40820008 38A07FFF",
      "2C057FFF 40820008",
      "38A07FFF 64A51000",
      "60000000 00000000",
      "E2000001 00000000",
    ];
    addCode(array);
    return;
  }
}