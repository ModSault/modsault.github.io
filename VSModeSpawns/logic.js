/* All contents for the file will be in this variable:
[
    {
        "name": "On-foot Spawns",
        "custom_spawn": false,
        "byte_length": 16 or 1 or CustomAmount,
        "type": "Player Spawn" or "Vehicle Spawn" or "Weapon Spawn" or "Crown Spawn" or "Spawn Limit" or "Custom"
        "spawns": [
            {
                "x_pos": 0.0,
                "y_pos": 0.0,
                "z_pos": 0.0,
                "unused_2_bytes": 0,
                "angle": 0
            },
            ... INFO FOR THIS ARRAY IS DEPENDENT ON TYPE
        ]
    },
    ...
]
This is meant to accommodate for custom types of spawns, but since the game isn't made to handle them it will be ignored.
*/
var AllSpawnData = []
var fileDownloadContents = new Uint8Array([0x00]);
var fileDownloadSegmentColor = new Uint8Array([0x00]); // only used to get colors in file preview to match that of its spawn type index
var fileNum = 0;
var wasFileChanged = false;

/* ------------ Modify above variable ------------ */

function addNewSpawn_defaults(index) {
  let param1 = 0, param2 = 0, param3 = 0, param4 = 0, param5 = 0, param6 = 0, param7 = 0;
  let spawnType = AllSpawnData[index].type;
  switch (spawnType) {
    case "Player Spawn":
    case "Crown Spawn":
    case "Spawn Limit":
    case "Custom 16 bytes":
      break;
    case "Vehicle Spawn":
      param5 = 1; // 0 in invalid vehicle spawn ID. So switch it to 1
      break;
    case "Weapon Spawn":
      param4 = 0; // Homing Launcher for default On-foot Weapon
      if (index == 8) param4 = 11; // Booster Pack default for On-foot power up
      if (index == 10) param4 = 17; // Instant Dual Blue Hyper Lasers default for Vehicle power up
      break;
    default:
      console.error("Unknown spawn type:", spawnType);
  }
  addNewSpawn(index, param1, param2, param3, param4, param5, param6, param7);
}
function addNewSpawn(index, param1 = 0, param2 = 0, param3 = 0, param4 = 0, param5 = 0, param6 = 0, param7 = 0) {
  let spawnType = AllSpawnData[index].type;
  switch (spawnType) {
    case "Player Spawn":
      AllSpawnData[index].spawns.push({
        x_pos: param1,
        y_pos: param2,
        z_pos: param3,
        unused_2_bytes: param4,
        angle: param5
      });
      break;
    case "Vehicle Spawn":
      AllSpawnData[index].spawns.push({
        x_pos: param1,
        y_pos: param2,
        z_pos: param3,
        angle: param4,
        id: param5
      });
      break;
    case "Weapon Spawn":
      let defSpawn = 0;
      if (index == 8) defSpawn = 11; // Booster Pack default for On-foot power up
      if (index == 10) defSpawn = 17; // Instant Dual Blue Hyper Lasers default for Vehicle power up
      AllSpawnData[index].spawns.push({
        x_pos: param1,
        y_pos: param2,
        z_pos: param3,
        id: param4
      });
      break;
    case "Crown Spawn":
      AllSpawnData[index].spawns.push({
        x_pos: param1,
        y_pos: param2,
        z_pos: param3,
        unused_4_bytes: param4
      });
      break;
    case "Spawn Limit":
      AllSpawnData[index].spawns.push({
        val: param1
      });
      break;
    case "Custom 16 bytes":
      AllSpawnData[index].spawns.push({
        x_pos: param1,
        y_pos: param2,
        z_pos: param3,
        byte_13: param4,
        byte_14: param5,
        byte_15: param6,
        byte_16: param7
      });
      break;
    default:
      console.error("Unknown spawn type:", spawnType);
  }
}

function initializeSpawnData(addSpawns = true) {
  AllSpawnData = [];
  let allNames = ["On-foot Spawns", "Player as Arwing/Wolfen Spawns", "Player as Landmaster Spawns",
                  "Vehicle Spawn Limit", "Vehicle Spawns", "On-foot Weapon Spawn Limit",
                  "On-foot Weapon Spawns", "On-foot PowerUp Spawn Limit", "On-foot PowerUp Spawns",
                  "Vehicle PowerUp Spawn Limit", "Vehicle PowerUp Spawns", "Crown Spawns"]
  let allTypes = ["Player Spawn", "Player Spawn", "Player Spawn",
                  "Spawn Limit", "Vehicle Spawn", "Spawn Limit",
                  "Weapon Spawn", "Spawn Limit", "Weapon Spawn",
                  "Spawn Limit", "Weapon Spawn", "Crown Spawn"]
  if (allNames.length != allTypes.length) {
    console.error("Spawn data names and types are not the same length!")
    return
  }

  for(let i = 0; i < allNames.length; i++) {
    let bytes = allTypes[i].toLowerCase().indexOf("limit") == -1 ? 16 : 1;
    AllSpawnData.push({
      name: allNames[i],
      custom_spawn: false,
      byte_length: bytes,
      type: allTypes[i],
      spawns: []
    });
    if (addSpawns) addNewSpawn_defaults(i);
    if (addSpawns && allTypes[i].toLowerCase().indexOf("limit") != -1) {
      addNewSpawn_defaults(i);
      addNewSpawn_defaults(i);
      addNewSpawn_defaults(i);
    }
  }
}

function addCustom16BytesToSpawnData(addSpawns = true) {
  let customNumber = AllSpawnData.length - 11;
  AllSpawnData.push({
    name: "Custom Generic Spawn " + customNumber,
    custom_spawn: true,
    byte_length: 16,
    type: "Custom 16 bytes",
    spawns: []
  });
  if (addSpawns) addNewSpawn_defaults(AllSpawnData.length - 1);
}

/* ------------ Helper Functions to make certain html elements ------------ */

function makePTagOfText(text, advancedMode = false) {
  let pTag = document.createElement("p");
  pTag.innerText = text;
  if (advancedMode) {
    pTag.className = "AdvancedOnly";
  }
  return pTag;
}
function makePositionElements(value, index_SpawnType, index_SpawnNumber, nameOfElement) {
  let masterDiv = document.createElement("div");

  let floatInput = document.createElement("input");
  floatInput.type = "number";
  floatInput.value = value;
  floatInput.step = "any";
  floatInput.name = "Position_As_Float";
  floatInput.onchange = function() {
    this.blur();
    AllSpawnData[index_SpawnType].spawns[index_SpawnNumber][nameOfElement] = parseFloat(floatInput.value);
    refreshSpawnData(index_SpawnType);
  }
  masterDiv.appendChild(floatInput);

  let pTag = makePTagOfText("Raw Hex:", true);
  masterDiv.appendChild(pTag);

  let hexInput = document.createElement("input");
  hexInput.type = "text";
  hexInput.value = floatToHex(value).toUpperCase();
  hexInput.name = "Position_As_Hex";
  hexInput.className = "AdvancedOnly";
  hexInput.onchange = function() {
    this.blur();
    let hexValue = hexInput.value;
    //remove all non-hex characters
    hexValue = hexValue.replace(/[^0-9A-Fa-f]/g, "");
    while (hexValue.length < 8) {
      hexValue = "0" + hexValue;
    }
    hexValue = hexValue.substring(0, 8);
    AllSpawnData[index_SpawnType].spawns[index_SpawnNumber][nameOfElement] = hexToFloat(hexValue);
    refreshSpawnData(index_SpawnType);
  }
  masterDiv.appendChild(hexInput);

  return masterDiv;
}
function makeFixedNumInput(value, min, max, step, index_SpawnType, index_SpawnNumber, nameOfElement) {
  let input = document.createElement("input");
  input.type = "number";
  input.value = value;
  input.min = min;
  input.max = max;
  input.step = step;
  input.name = "Fixed_Input"
  input.onchange = function() {
    this.blur();
    let newValue = parseInt(input.value);
    newValue = clampValue(newValue, min, max);
    AllSpawnData[index_SpawnType].spawns[index_SpawnNumber][nameOfElement] = newValue;
    refreshSpawnData(index_SpawnType);
  }
  return input;
}
function makeOtherBox(haveUpArrow, haveDownArrow, index_SpawnType, index_SpawnNumber, totalNumSpawns) {
  let divForOtherBox = document.createElement("div");

  if (haveUpArrow) {
    let upArrow = document.createElement("button");
    upArrow.className = "arrow-up";
    upArrow.onclick = function() {
      this.blur();
      let temp = AllSpawnData[index_SpawnType].spawns[index_SpawnNumber];
      AllSpawnData[index_SpawnType].spawns[index_SpawnNumber] = AllSpawnData[index_SpawnType].spawns[index_SpawnNumber - 1];
      AllSpawnData[index_SpawnType].spawns[index_SpawnNumber - 1] = temp;
      refreshSpawnData(index_SpawnType);
    }
    divForOtherBox.appendChild(upArrow);
  }

  if (haveDownArrow) {
    let downArrow = document.createElement("button");
    downArrow.className = "arrow-down";
    downArrow.onclick = function() {
      this.blur();
      let temp = AllSpawnData[index_SpawnType].spawns[index_SpawnNumber];
      AllSpawnData[index_SpawnType].spawns[index_SpawnNumber] = AllSpawnData[index_SpawnType].spawns[index_SpawnNumber + 1];
      AllSpawnData[index_SpawnType].spawns[index_SpawnNumber + 1] = temp;
      refreshSpawnData(index_SpawnType);
    }
    divForOtherBox.appendChild(downArrow);
  }

  if (totalNumSpawns == 1) {
    let pWarning = document.createElement("p");
    pWarning.innerHTML = "X removed<br>for safety"
    pWarning.className = "NotAdvancedOnly";
    divForOtherBox.appendChild(pWarning);
  }

  let xMark = document.createElement("button");
  xMark.className = "red-x";
  if (totalNumSpawns == 1) xMark.className += " AdvancedOnly"
  xMark.onclick = function() {
    this.blur();
    AllSpawnData[index_SpawnType].spawns.splice(index_SpawnNumber, 1);
    refreshSpawnData(index_SpawnType);
  }
  divForOtherBox.appendChild(xMark);

  try {
    if (document.getElementById("UnloadedThreeJSButton") == null && !([3,5,7,9]).includes(index_SpawnType)) {
      let goToButton = document.createElement("button");
      goToButton.innerText = "goto";
      goToButton.onclick = function() {
        this.blur();
        newYaw = -1;
        if (([0,1,2,4]).includes(index_SpawnType)) {
          newYaw = AllSpawnData[index_SpawnType].spawns[index_SpawnNumber].angle;
        }
        setCamera(AllSpawnData[index_SpawnType].spawns[index_SpawnNumber].x_pos, AllSpawnData[index_SpawnType].spawns[index_SpawnNumber].y_pos, AllSpawnData[index_SpawnType].spawns[index_SpawnNumber].z_pos, newYaw);
      }
      divForOtherBox.appendChild(goToButton);
    }
  } catch (error) {
    console.error("Error: " + error);
  }


  return divForOtherBox;
}

/* ------------ Display Info from AllSpawnData ------------ */

function WipeDisplayedSpawnData() {
  let spawnData = document.getElementById("SpawnInfoBox");
  spawnData.replaceChildren();
}
function AddButtonsAtTop() {
  let masterDiv = document.createElement("div");
  masterDiv.className = "collapseExpandButtons";

  let buttonReset = document.createElement("button");
  buttonReset.innerText = "Reset All Spawns";
  buttonReset.onclick = function() {
    let response = confirm("Reset all spawns?");
    if (!response) { return; }
    initializeSpawnData();
    DisplayAllSpawnDataFromScratch();
    updateGeckoCodes();
    wasFileChanged = false;
  };
  masterDiv.appendChild(buttonReset);


  let buttonCollapse = document.createElement("button");
  buttonCollapse.innerText = "Collapse All";
  buttonCollapse.onclick = function() {
    let details = document.querySelectorAll("#SpawnInfoBox details");
    for (let i = 0; i < details.length; i++) {
      details[i].open = false;
    }
  };
  masterDiv.appendChild(buttonCollapse);

  let buttonExpand = document.createElement("button");
  buttonExpand.innerText = "Expand All";
  buttonExpand.onclick = function() {
    let details = document.querySelectorAll("#SpawnInfoBox details");
    for (let i = 0; i < details.length; i++) {
      details[i].open = true;
    }
  };
  masterDiv.appendChild(buttonExpand);

  document.getElementById("SpawnInfoBox").appendChild(masterDiv);
}
function DisplaySpawnDataFromScratch(index) {
  let spawnType = AllSpawnData[index].type;
  let classNameToUse = "";
  let row1Text = [];
  let row1AdvancedMode = [];
  switch (spawnType) {
    case "Player Spawn":
      classNameToUse = "gridOfSpawnInfoGeneric grid_PlayerSpawnType";
      row1Text = ["#", "X pos", "Y pos", "Z pos", "Unused 2 Bytes", "Angle", "Other"];
      row1AdvancedMode = [false, false, false, false, true, false, false];
      break;
    case "Vehicle Spawn":
      classNameToUse = "gridOfSpawnInfoGeneric grid_VehicleSpawnType";
      row1Text = ["#", "X pos", "Y pos", "Z pos", "Angle", "ID", "Other"];
      row1AdvancedMode = [false, false, false, false, false, false, false];
      break;
    case "Weapon Spawn":
      classNameToUse = "gridOfSpawnInfoGeneric grid_WeaponSpawnType";
      row1Text = ["#", "X pos", "Y pos", "Z pos", "ID", "Other"];
      row1AdvancedMode = [false, false, false, false, false, false];
      break;
    case "Crown Spawn":
      classNameToUse = "gridOfSpawnInfoGeneric grid_CrownSpawnType";
      row1Text = ["#", "X pos", "Y pos", "Z pos", "Unused 4 Bytes", "Other"];
      row1AdvancedMode = [false, false, false, false, true, false];
      break;
    case "Spawn Limit":
      classNameToUse = "gridOfSpawnInfoGeneric grid_SpawnLimitType";
      row1Text = ["#", "Maximum Amount of Spawns", "Other"];
      row1AdvancedMode = [false, false, true];
      break;
    case "Custom 16 bytes":
      classNameToUse = "gridOfSpawnInfoGeneric grid_Custom16Type";
      row1Text = ["#", "X pos", "Y pos", "Z pos", "Byte 13", "Byte 14", "Byte 15", "Byte 16", "Other"];
      row1AdvancedMode = [false, false, false, false, false, false, false, false, false];
      break;
    default:
      console.error("Unknown spawn type:", spawnType);
  }
  if (row1Text.length != row1AdvancedMode.length) {
    console.error("Row 1 text and advanced mode arrays are not the same length! Spawn type: " + spawnType);
    return;
  }

  let details = document.createElement("details");

  let summary = document.createElement("summary");
  if (!AllSpawnData[index].custom_spawn) {
    summary.className = "SpawnSummaryTitle";
    summary.innerText = AllSpawnData[index].name + " (" + (AllSpawnData[index].spawns.length) + ")";
    
  } else {
    let containerDiv = document.createElement("div");

    summary.className = "SpawnSummaryTitle";
    summary.innerText = AllSpawnData[index].name + " (" + (AllSpawnData[index].spawns.length) + ")";
    containerDiv.appendChild(details);

    let button = document.createElement("button");
    button.className = "red-x CustomSpawnRedX";
    button.onclick = function() {
      AllSpawnData.splice(index,1);
      DisplayAllSpawnDataFromScratch();
    };
    containerDiv.appendChild(button);

    document.getElementById("SpawnInfoBox").appendChild(containerDiv);
  }
  details.appendChild(summary);

  let pWarning = document.createElement("p");
  if (AllSpawnData[index].name == "Vehicle Spawns") {
    pWarning.innerHTML = "Vehicles won't spawn within 10 or so units from each other even when below the spawn limit.";
  }
  if (spawnType == "Spawn Limit") {
    pWarning.innerHTML = "Values above 127 have inconsistent behavior depending on the map<br>(due to this value being read as an unsigned value sometimes and signed other times)";
  }
  if (spawnType == "Weapon Spawn") {
    pWarning.innerHTML = "Items/PowerUps for the Pilot will spawn on the closest floor<br><span class='AdvancedOnly'>Spawn Limit is ignored when mixing items not suited for this section (i.e. powerup in weapon)</span>";
  }
  if (spawnType == "Crown Spawn") {
    pWarning.innerHTML = "This will spawn on the closest floor regardless of position";
  }
  if (spawnType == "Custom 16 bytes") {
    pWarning.innerHTML = "This is a spawn that has no effect on the game<br>This only exists in case someone wants a new category for their own mod";
  }
  details.appendChild(pWarning);
  
  let gridInfoDiv = document.createElement("div");
  details.appendChild(gridInfoDiv);

  let gridDiv = document.createElement("div");
  gridDiv.className = classNameToUse;
  gridInfoDiv.appendChild(gridDiv);
  for (let i = 0; i < row1Text.length; i++) {
    gridDiv.appendChild(makePTagOfText(row1Text[i], row1AdvancedMode[i]));
  }

  let addNewRowButton = document.createElement("button");
  addNewRowButton.className = "addNewRow";
  if (spawnType.toLowerCase().indexOf("limit") != -1) {
    addNewRowButton.className += " AdvancedOnly";
  }
  addNewRowButton.onclick = function() {
    this.blur();
    addNewSpawn_defaults(index);
    refreshSpawnData(index);
  }
  gridInfoDiv.appendChild(addNewRowButton);

  if (!AllSpawnData[index].custom_spawn) {
    document.getElementById("SpawnInfoBox").appendChild(details);
  }
}
function refreshSpawnData(index, recalculate = true) {
  const RelevantSummaryElement = document.getElementsByClassName("SpawnSummaryTitle")[index];
  RelevantSummaryElement.innerHTML = AllSpawnData[index].name + " (" + AllSpawnData[index].spawns.length + ")"

  let spawnType = AllSpawnData[index].type;
  switch (spawnType) {
    case "Player Spawn":
      refreshSpawnData_PlayerSpawn(index);
      break;
    case "Vehicle Spawn":
      refreshSpawnData_VehicleSpawn(index);
      break;
    case "Weapon Spawn":
      refreshSpawnData_WeaponSpawn(index);
      break;
    case "Crown Spawn":
      refreshSpawnData_CrownSpawn(index);
      break;
    case "Spawn Limit":
      refreshSpawnData_SpawnLimit(index);
      break;
    case "Custom 16 bytes":
      refreshSpawnData_Custom16Type(index);
      break;
    default:
      console.error("Unknown spawn type:", spawnType);
  }

  if (recalculate) {
    recalculateFileContents();
    if (document.getElementById("UnloadedThreeJSButton") == null) makeAllShapesFromScratch();
  }
  wasFileChanged = true;
}
function refreshSpawnData_CrownSpawn(index) {
  if (AllSpawnData[index].type != "Crown Spawn") {
    console.error("Tried to refresh crown spawn data, but type is not crown spawn! Type: " + AllSpawnData[index].type);
    return;
  }

  const numColumns = 6;
  let spawnData = AllSpawnData[index].spawns;
  let gridDiv = document.getElementsByClassName("gridOfSpawnInfoGeneric")[index];

  // delete all elements not in the first row
  while (gridDiv.children.length > numColumns) {
    gridDiv.removeChild(gridDiv.lastChild);
  }

  // add new elements for each spawn
  for (let i = 0; i < spawnData.length; i++) {
    // row number
    gridDiv.appendChild(makePTagOfText(i+1, false));

    // x y and z pos manipulation
    gridDiv.appendChild(makePositionElements(spawnData[i].x_pos, index, i, "x_pos"));
    gridDiv.appendChild(makePositionElements(spawnData[i].y_pos, index, i, "y_pos"));
    gridDiv.appendChild(makePositionElements(spawnData[i].z_pos, index, i, "z_pos"));

    // unused 4 bytes
    let divForUnused4Bytes = document.createElement("div");
    divForUnused4Bytes.className = "AdvancedOnly";
    divForUnused4Bytes.appendChild(makeFixedNumInput(spawnData[i].unused_4_bytes, -2147483648, 4294967295, 1, index, i, "unused_4_bytes"));
    gridDiv.appendChild(divForUnused4Bytes);

    // Other Box
    gridDiv.appendChild(makeOtherBox(i != 0, i+1 != spawnData.length, index, i, spawnData.length));
  }
}
function refreshSpawnData_WeaponSpawn(index) {
  if (AllSpawnData[index].type != "Weapon Spawn") {
    console.error("Tried to refresh weapon spawn data, but type is not weapon spawn! Type: " + AllSpawnData[index].type);
    return;
  }

  const numColumns = 6;
  let spawnData = AllSpawnData[index].spawns;
  let gridDiv = document.getElementsByClassName("gridOfSpawnInfoGeneric")[index];

  // delete all elements not in the first row
  while (gridDiv.children.length > numColumns) {
    gridDiv.removeChild(gridDiv.lastChild);
  }

  // add new elements for each spawn
  for (let i = 0; i < spawnData.length; i++) {
    // row number
    gridDiv.appendChild(makePTagOfText(i+1, false));

    // x y and z pos manipulation
    gridDiv.appendChild(makePositionElements(spawnData[i].x_pos, index, i, "x_pos"));
    gridDiv.appendChild(makePositionElements(spawnData[i].y_pos, index, i, "y_pos"));
    gridDiv.appendChild(makePositionElements(spawnData[i].z_pos, index, i, "z_pos"));

    // ID
    let divForID = document.createElement("div");
    let allKnownIDs = ["Homing Launcher", "Grenade", "Sensor Bomb", "Sniper", "Machine Gun", // index: 0 - 4
                      "Missile-Launcher", "Predator Rocket", "Gatling Gun", "Demon Sniper", "Fireburst Pod", // index: 5 - 9
                      "Reversal Weapon", "Booster Pack", "Barrier", "Stealth Suit", "Green Health pack", // index: 10 - 14
                      "Silver Health pack", "Gold Health pack", "Instant Dual Hyper Lasers", "Smart Bombs", "Cluster Bombs", // index: 15 - 19
                      "Silver Ring", "Gold Ring", "Silver Star", "??? Invisible Item", "??? Invisible Item 2", // index: 20 - 24
                      "??? Unloaded Item", "??? Unloaded Vehicle item", "Laser Upgrade", "Silver ring no “supplies”", // index: 25 - 28
                      "Random Weapon 1 (Homing and Missile Launcher, Sniper, Machine Gun, Sensor Bomb, Grenade)", // index: 29
                      "Random Weapon 2 (Gatling Gun, Demon Sniper, Fireburst Pod, Reversal Weapon, Predator Rocket)", // index: 30
                      "Random PowerUp (Booster Pack, All Health Packs, Barrier, Stealth Suit)", // index: 31
                      "Random Vehicle PowerUp (Instant Dual Hyper Lasers, both bombs, both rings, and silver star)"]; // index: 32
    const expectedOnFootWeapon = (index == 6);
    const expectedOnFootPowerUp = (index == 8);
    const expectedVehiclePowerUp = (index == 10);
    
    let select = document.createElement("select");
    select.name = "Item_ID_Select";
    for (let j = 0; j < allKnownIDs.length; j++) {
      const isUnfinished = (allKnownIDs.indexOf("???") != -1 || j == 28);
      const isWeapon = (j <= 10 || j == 29 || j == 30);
      const isOnFootPowerUp = ((j >= 11 & j <= 16) || j == 31);
      const isVehiclePowerUp = ((j >= 17 & j <= 22) || j == 32);

      let option = document.createElement("option");
      option.value = j;
      option.text = allKnownIDs[j];
      if (isUnfinished || (expectedOnFootWeapon && !isWeapon) || (expectedOnFootPowerUp && !isOnFootPowerUp) || (expectedVehiclePowerUp && !isVehiclePowerUp)) {
        option.className = "AdvancedOnly";
      }
      if (spawnData[i].id == j) {
        option.selected = true;
      }
      select.appendChild(option);
    }
    select.onchange = function() {
      this.blur();
      let selectedValue = parseInt(select.value);
      spawnData[i].id = selectedValue;
      refreshSpawnData(index);
    }
    divForID.appendChild(select);
    
    divForID.appendChild(makePTagOfText("Raw Value:", true));
    let valueInput = makeFixedNumInput(spawnData[i].id, -2147483648, 4294967295, 1, index, i, "id");
    valueInput.className = "AdvancedOnly";
    valueInput.value = spawnData[i].id;
    divForID.appendChild(valueInput);

    gridDiv.appendChild(divForID);

    // Other Box
    gridDiv.appendChild(makeOtherBox(i != 0, i+1 != spawnData.length, index, i, spawnData.length));

    // update the value of the select box
    select.value = spawnData[i].id;
  }
}
function refreshSpawnData_VehicleSpawn(index) {
  if (AllSpawnData[index].type != "Vehicle Spawn") {
    console.error("Tried to refresh vehicle spawn data, but type is not vehicle spawn! Type: " + AllSpawnData[index].type);
    return;
  }

  const numColumns = 7;
  let spawnData = AllSpawnData[index].spawns;
  let gridDiv = document.getElementsByClassName("gridOfSpawnInfoGeneric")[index];

  // delete all elements not in the first row
  while (gridDiv.children.length > numColumns) {
    gridDiv.removeChild(gridDiv.lastChild);
  }

  // add new elements for each spawn
  for (let i = 0; i < spawnData.length; i++) {
    // row number
    gridDiv.appendChild(makePTagOfText(i+1, false));

    // x y and z pos manipulation
    gridDiv.appendChild(makePositionElements(spawnData[i].x_pos, index, i, "x_pos"));
    gridDiv.appendChild(makePositionElements(spawnData[i].y_pos, index, i, "y_pos"));
    gridDiv.appendChild(makePositionElements(spawnData[i].z_pos, index, i, "z_pos"));

    // angle
    let divForAngle = document.createElement("div");
    divForAngle.appendChild(makeFixedNumInput(spawnData[i].angle, 0, 65535, 1, index, i, "angle"));
    gridDiv.appendChild(divForAngle);

    // ID
    let divForID = document.createElement("div");
    let allKnownIDs = ["Arwing/Wolfen", "Wolfen", "Landmaster", "Arwing/Wolfen/Landmaster"];
    let allKnownValues = [1, 2, 3, 6];

    let select = document.createElement("select");
    select.name = "Vehicle_ID_Select"
    for (let j = 0; j < allKnownIDs.length; j++) {
      let option = document.createElement("option");
      option.value = allKnownValues[j];
      option.text = allKnownIDs[j];
      if (spawnData[i].id == allKnownValues[j]) {
        option.selected = true;
      }
      select.appendChild(option);
    }
    select.onchange = function() {
      this.blur();
      let selectedValue = parseInt(select.value);
      spawnData[i].id = selectedValue;
      refreshSpawnData(index);
    }
    divForID.appendChild(select);
    
    divForID.appendChild(makePTagOfText("Raw Value:", true));
    let valueInput = makeFixedNumInput(spawnData[i].id, -32768, 65535, 1, index, i, "id");
    valueInput.className = "AdvancedOnly";
    valueInput.value = spawnData[i].id;
    divForID.appendChild(valueInput);

    gridDiv.appendChild(divForID);

    // Other Box
    gridDiv.appendChild(makeOtherBox(i != 0, i+1 != spawnData.length, index, i, spawnData.length));

    // update the value of the select box
    select.value = spawnData[i].id;
  }
}
function refreshSpawnData_SpawnLimit(index) {
  if (AllSpawnData[index].type != "Spawn Limit") {
    console.error("Tried to refresh spawn limit data, but type is not spawn limit! Type: " + AllSpawnData[index].type);
    return;
  }

  const numColumns = 3;
  let spawnData = AllSpawnData[index].spawns;
  let gridDiv = document.getElementsByClassName("gridOfSpawnInfoGeneric")[index];

  // delete all elements not in the first row
  while (gridDiv.children.length > numColumns) {
    gridDiv.removeChild(gridDiv.lastChild);
  }

  // add new elements for each spawn
  for (let i = 0; i < spawnData.length; i++) {
    // row number
    gridDiv.appendChild(makePTagOfText(i+1, i == 0));

    // max amount of spawns manipulation
    let divForAmt = document.createElement("div");
    divForAmt.appendChild(makeFixedNumInput(spawnData[i].val, 0, 255, 1, index, i, "val"));
    if (i == 0) { divForAmt.className = "AdvancedOnly"; }
    gridDiv.appendChild(divForAmt);

    // Other Box
    let otherBox = makeOtherBox(i != 0, i+1 != spawnData.length, index, i, spawnData.length);
    otherBox.className = "AdvancedOnly";
    gridDiv.appendChild(otherBox);
  }
}
function refreshSpawnData_PlayerSpawn(index) {
  if (AllSpawnData[index].type != "Player Spawn") {
    console.error("Tried to refresh player spawn data, but type is not Player Spawn! Type: " + AllSpawnData[index].type);
    return;
  }

  const numColumns = 7;
  let spawnData = AllSpawnData[index].spawns;
  let gridDiv = document.getElementsByClassName("gridOfSpawnInfoGeneric")[index];

  // delete all elements not in the first row
  while (gridDiv.children.length > numColumns) {
    gridDiv.removeChild(gridDiv.lastChild);
  }

  // add new elements for each spawn
  for (let i = 0; i < spawnData.length; i++) {
    // row number
    gridDiv.appendChild(makePTagOfText(i+1, false));

    // x y and z pos manipulation
    gridDiv.appendChild(makePositionElements(spawnData[i].x_pos, index, i, "x_pos"));
    gridDiv.appendChild(makePositionElements(spawnData[i].y_pos, index, i, "y_pos"));
    gridDiv.appendChild(makePositionElements(spawnData[i].z_pos, index, i, "z_pos"));

    // unused 2 bytes
    let divForUnused2Bytes = document.createElement("div");
    divForUnused2Bytes.className = "AdvancedOnly";
    divForUnused2Bytes.appendChild(makeFixedNumInput(spawnData[i].unused_2_bytes, -32768, 65535, 1, index, i, "unused_2_bytes"));
    gridDiv.appendChild(divForUnused2Bytes);

    // angle
    let divForAngle = document.createElement("div");
    divForAngle.appendChild(makeFixedNumInput(spawnData[i].angle, 0, 65535, 1, index, i, "angle"));
    gridDiv.appendChild(divForAngle);

    // Other Box
    gridDiv.appendChild(makeOtherBox(i != 0, i+1 != spawnData.length, index, i, spawnData.length));
  }
}
function refreshSpawnData_Custom16Type(index) {
  if (AllSpawnData[index].type != "Custom 16 bytes") {
    console.error("Tried to refresh Custom 16 bytes data, but type is not Custom 16 bytes! Type: " + AllSpawnData[index].type);
    return;
  }

  const numColumns = 9;
  let spawnData = AllSpawnData[index].spawns;
  let gridDiv = document.getElementsByClassName("gridOfSpawnInfoGeneric")[index];

  // delete all elements not in the first row
  while (gridDiv.children.length > numColumns) {
    gridDiv.removeChild(gridDiv.lastChild);
  }

  // add new elements for each spawn
  for (let i = 0; i < spawnData.length; i++) {
    // row number
    gridDiv.appendChild(makePTagOfText(i+1, false));

    // x y and z pos manipulation
    gridDiv.appendChild(makePositionElements(spawnData[i].x_pos, index, i, "x_pos"));
    gridDiv.appendChild(makePositionElements(spawnData[i].y_pos, index, i, "y_pos"));
    gridDiv.appendChild(makePositionElements(spawnData[i].z_pos, index, i, "z_pos"));

    // byte 13
    let byte13Div = document.createElement("div");
    byte13Div.appendChild(makeFixedNumInput(spawnData[i].byte_13, -128, 255, 1, index, i, "byte_13"));
    gridDiv.appendChild(byte13Div);

    // byte 14
    let byte14Div = document.createElement("div");
    byte14Div.appendChild(makeFixedNumInput(spawnData[i].byte_14, -128, 255, 1, index, i, "byte_14"));
    gridDiv.appendChild(byte14Div);

    // byte 15
    let byte15Div = document.createElement("div");
    byte15Div.appendChild(makeFixedNumInput(spawnData[i].byte_15, -128, 255, 1, index, i, "byte_15"));
    gridDiv.appendChild(byte15Div);

    // byte 16
    let byte16Div = document.createElement("div");
    byte16Div.appendChild(makeFixedNumInput(spawnData[i].byte_16, -128, 255, 1, index, i, "byte_16"));
    gridDiv.appendChild(byte16Div);

    // Other Box
    gridDiv.appendChild(makeOtherBox(i != 0, i+1 != spawnData.length, index, i, spawnData.length));
  }
}
function AddButtonAtBottom() {
  let masterDiv = document.createElement("div");

  let buttonAddCustom = document.createElement("button");
  buttonAddCustom.className = "CustomAddSpawnButton AdvancedOnly";
  buttonAddCustom.innerHTML = "Add Custom Spawn Type";
  buttonAddCustom.onclick = function() {
    this.blur();
    addCustom16BytesToSpawnData();
    DisplayAllSpawnDataFromScratch();
  }
  masterDiv.appendChild(buttonAddCustom);

  document.getElementById("SpawnInfoBox").appendChild(masterDiv);
}

function DisplayAllSpawnDataFromScratch() {
  // since everything is removed and added again, we need to remember which spawn types were opened
  let OpenedDetails = new Array(AllSpawnData.length).fill(false);
  const allDetails = document.getElementById("SpawnInfoBox").getElementsByTagName("details");
  for (let i = 0; i < Math.min(allDetails.length, AllSpawnData.length); i++) {
    OpenedDetails[i] = allDetails[i].open;
  }

  // remove and add everything again
  WipeDisplayedSpawnData();
  AddButtonsAtTop();
  for (let i = 0; i < AllSpawnData.length; i++) {
    DisplaySpawnDataFromScratch(i);
    refreshSpawnData(i, false);
  }
  AddButtonAtBottom();
  recalculateFileContents();

  // Reopen details the user already opened
  const newDetails = document.getElementById("SpawnInfoBox").getElementsByTagName("details");
  for (let i = 0; i < newDetails.length; i++) {
    newDetails[i].open = OpenedDetails[i];
  }

  // For 3D viewer (if even present)
  if (document.getElementById("UnloadedThreeJSButton") == null) {
    document.getElementsByClassName("ThreeJSKey")[8].style.display = (AllSpawnData.length > 12) ? "" : "none";
    makeAllShapesFromScratch();
  }
}

// ---------------------------- File Logic  --------------------------

function updateFileNum(newFilNum) {
  fileNum = newFilNum;
  document.getElementById("MapSelector").value = newFilNum;
  let mapName = document.getElementById("MapSelector").selectedOptions[0].text;
  mapName = mapName.substring(0, mapName.indexOf("(")-1).trim();
  if (mapName == "----") mapName = "all maps"

  allButtons = document.getElementById("ButtonsAtBottomOfScreen").getElementsByTagName("button");
  allButtons[0].innerText = "Download (" + fileNumToStr() + ".bin)";
  allButtons[1].innerText = "Copy as Gecko code into Clipboard (" + mapName + ")";
}

function fileChange(file) {
  if (file == undefined) { return; }

  let filename = file.name;
  valid = /_vs_A[0-9]{2}.bin$/.test(filename);
  if (!valid) {
    let response = confirm("The file name '" + filename + "' seems incorrect. Are you sure you want to proceed?");
    if (!response) { return; }
  }
  let newFileNum = parseInt(filename.replace(/\D+/g, ''));
  if (isNaN(newFileNum) || newFileNum == undefined || newFileNum < 0 || newFileNum > 17) newFileNum = 0;
  updateFileNum(newFileNum);

  let mapName = document.getElementById("MapSelector").selectedOptions[0].text;
  mapName = mapName.substring(0, mapName.indexOf("(")-1).trim();
  
  document.getElementById('labelFile').innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" height="80px" viewBox="0 -960 960 960" width="80px" fill="var(--font-color)"><path d="M450-313v-371L330-564l-43-43 193-193 193 193-43 43-120-120v371h-60ZM220-160q-24 0-42-18t-18-42v-143h60v143h520v-143h60v143q0 24-18 42t-42 18H220Z"/></svg>'
  document.getElementById('labelFile').innerHTML += filename + " (Detected Map: " + mapName + ")";
  parseFile(file);
  document.getElementById("file").value = "";
}
function parseFile(file) {
  const reader = new FileReader();
  reader.onload = function (e) {
    let AllSpawnData_backup = JSON.parse(JSON.stringify(AllSpawnData));
    const view = new DataView(e.target.result);
    initializeSpawnData(false);

    const totalNumberSpawns = view.getUint32(0);
    let warnedAboutSize = false;
    // First 12 vanilla spawns
    for (let i = 0; i < Math.min(12, totalNumberSpawns); i++) {
      let neededOffset = view.getUint32(4+(4*i));
      const numberOfSpawns = view.getUint32(4+(12*4)+(4*i));

      if (!warnedAboutSize && (numberOfSpawns > 30 || totalNumberSpawns > 30)) {
        let response = confirm("There seems to be a lot of spawns to load (" + numberOfSpawns + " spawn types with one having " + totalNumberSpawns + " spawns). You sure you want to continue?");
        if (!response) {
          AllSpawnData = AllSpawnData_backup;
          return;
        }
      }

      for (let j = 0; j < numberOfSpawns; j++) {
        try {
          switch (AllSpawnData[i].type) {
            case "Player Spawn":
            case "Vehicle Spawn":
              addNewSpawn(i, view.getFloat32(neededOffset), view.getFloat32(neededOffset + 4), view.getFloat32(neededOffset + 8), view.getUint16(neededOffset + 12), view.getUint16(neededOffset + 14));
              break;
            case "Weapon Spawn":
            case "Crown Spawn":
              addNewSpawn(i, view.getFloat32(neededOffset), view.getFloat32(neededOffset + 4), view.getFloat32(neededOffset + 8), view.getUint32(neededOffset + 12));
              break;
            case "Spawn Limit":
              addNewSpawn(i, view.getUint8(neededOffset));
              break;
            case "Custom 16 bytes":
            default:
              AllSpawnData = AllSpawnData_backup;
              console.error("Unknown/Invalid spawn type:", AllSpawnData[i].type);
              return;
          }
        } catch (error) {
          console.error(error);
          alert("Error loading your file, It's probably just an invalid file.\n" + error);
          AllSpawnData = AllSpawnData_backup;
          return;
        }
        neededOffset += AllSpawnData[i].byte_length;
      }
    }

    // Any Custom spawns if user is loading their own file they made from this site
    for (let i = 12; i < totalNumberSpawns; i++) {
      addCustom16BytesToSpawnData(false);
      let neededOffset = view.getUint32(4+(12*8)+(8*(i-12)));
      const numberOfSpawns = view.getUint32(4+(12*8)+(8*(i-12))+4);
      for (let j = 0; j < numberOfSpawns; j++) {
        switch (AllSpawnData[i].type) {
          case "Custom 16 bytes":
            addNewSpawn(i, view.getFloat32(neededOffset), view.getFloat32(neededOffset + 4), view.getFloat32(neededOffset + 8), view.getUint8(neededOffset + 12), view.getUint8(neededOffset + 13), view.getUint8(neededOffset + 14), view.getUint8(neededOffset + 15));
            break;
          case "Player Spawn":
          case "Vehicle Spawn":
          case "Weapon Spawn":
          case "Crown Spawn":
          case "Spawn Limit":
          default:
            AllSpawnData = AllSpawnData_backup;
            console.error("Unknown/Invalid spawn type:", AllSpawnData[i].type);
            return;
        }
        neededOffset += AllSpawnData[i].byte_length;
      }
    }
    DisplayAllSpawnDataFromScratch();
    wasFileChanged = false;
  };
  reader.readAsArrayBuffer(file);
}
function dropHandler(ev) {  
  ev.preventDefault();
  fileChange(ev.dataTransfer.items[0].getAsFile());
}

// --------------------------------- Downloading Logic ------------------------------- */

function fileNumToStr() {
  return "_vs_A" + ((""+fileNum).padStart(2, "0"));
}
function downloadBin() {
  const blob = new Blob([fileDownloadContents], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = fileNumToStr()+".bin";
  document.body.appendChild(a);
  a.click();

  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
function geckoCodeCopy() {
  const MapIDstr = (""+((fileNum-1) & 0xFF).toString(16).toUpperCase()).padStart(2, "0")
  let toSetClipboard = "";
  let startingAddress;
  if (GameVersion == 0) { // USA
    toSetClipboard = "282A2C9C FF000001\n20D40974 0000000D\n";
    if (MapIDstr != "FF") toSetClipboard += "282A2C9E 00FF" + MapIDstr + "00\n";
    startingAddress = 0x802A50C0;
  }
  if (GameVersion == 1) { // Japan
    toSetClipboard = "282A72DC FF000001\n20D44F54 0000000D\n"
    if (MapIDstr != "FF") toSetClipboard += "282A72DE 00FF" + MapIDstr + "00\n";
    startingAddress = 0x802A9700;
  } 
  if (GameVersion == 2) { // PAL
    toSetClipboard = "282BD05C FF000001\n20D796D4 0000000D\n"
    if (MapIDstr != "FF") toSetClipboard += "282BD05E 00FF" + MapIDstr + "00\n";
    startingAddress = 0x802BF480;
  }

  toSetClipboard += "06"+(startingAddress&0xFFFFFF).toString(16).toUpperCase() + " " + (fileDownloadContents.length.toString(16).toUpperCase().padStart(8, "0"));
  for (let i = 0; i < fileDownloadContents.length; i++) {
    if (i % 8 == 0) { toSetClipboard += "\n"; }
    else if (i % 4 == 0) { toSetClipboard += " "; }
    toSetClipboard += fileDownloadContents[i].toString(16).toUpperCase().padStart(2, "0");
  }
  
  if (MapIDstr != "FF") toSetClipboard += "\nE2000003 00000000"
  else                  toSetClipboard += "\nE2000002 00000000"

  let mapName = document.getElementById("MapSelector").selectedOptions[0].text;
  mapName = mapName.substring(0, mapName.indexOf("(")-1).trim();

  let advancedModeText = "";
  if (advancedMode) {
    advancedModeText = "\n\nCode Explanation: First line check if in Vs mode, second line checks if on the loading screen menu,";
    if (MapIDstr != "FF") advancedModeText += "third line checks if map id is the map you wanted,";
    advancedModeText += " the last line is to end all if statements, and everything in between is for setting the proper memory addresses to the values they need to be to load this file.";
  }

  navigator.clipboard.writeText(toSetClipboard)
  .then(() => {
    if (MapIDstr != "FF") alert("Success! It will only work for the map: " + mapName + "." + advancedModeText);
    else                  alert("Success! It will work for all maps." + advancedModeText);
  })
  .catch(err => {
    alert("Failed to copy to clipboard. Error:", err);
  });
}
function downloadJSON() {
  const jsonString = JSON.stringify(AllSpawnData, null, 2);
  const blob = new Blob([jsonString], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = fileNumToStr()+".json";
  document.body.appendChild(a);
  a.click();

  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ------------ General Purpose Functions ------------ */

// chatGPT function
function floatToHex(float) {
  const view = new DataView(new ArrayBuffer(4));
  view.setFloat32(0, float, false); // false = big-endian
  return [...new Uint8Array(view.buffer)]
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
// chatGPT function
function hexToFloat(hex) {
  if (hex.length !== 8) {
    throw new Error("Hex must be exactly 8 characters (4 bytes)");
  }
  const bytes = new Uint8Array(4);
  for (let i = 0; i < 4; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  const view = new DataView(bytes.buffer);
  return view.getFloat32(0, false); // false = big-endian
}

function clampValue(initial, min, max) {
  let value = initial;
  if (isNaN(value)) {
    value = 0;
  }
  value = Math.max(min, Math.min(max, value));
  return value;
}

/* ------------ On GameMode change ------------ */

function updateGeckoCodes() {
  const fourVeh = document.getElementById("4VehCode");
  const rev = document.getElementById("ReversalCode");

  if (GameVersion == 0) { // USA
    fourVeh.innerHTML = "282A2C9C FF000001<br>002A2E45 000000FF<br>E2000001 00000000";
    rev.innerHTML = "002A658A 00000001<br>C2084D04 00000004<br>A0DE023A 38C60001<br>2C060003 41800008<br>38C00003 B0DE023A<br>887E01FA 00000000";
  }
  if (GameVersion == 1) { // Japan
    fourVeh.innerHTML = "282A72DC FF000001<br>002A7485 000000FF<br>E2000001 00000000";
    rev.innerHTML = "002AABCA 00000001<br>C2084604 00000004<br>A0DE023A 38C60001<br>2C060003 41800008<br>38C00003 B0DE023A<br>887E01FA 00000000";
  }
  if (GameVersion == 2) { // PAL
    fourVeh.innerHTML = "282BD05C FF000001<br>002BD205 000000FF<br>E2000001 00000000";
    rev.innerHTML = "002C094A 00000001<br>C2085768 00000004<br>A0DE023A 38C60001<br>2C060003 41800008<br>38C00003 B0DE023A<br>887E01FA 00000000";
  }

  updateFilePreview();
}

/* ------------- For File preview and Download ---------------- */

function write4BytesContents(value, colorValue, index) {
  fileDownloadContents[index+0] = (value >> 24) & 0xFF;
  fileDownloadContents[index+1] = (value >> 16) & 0xFF;
  fileDownloadContents[index+2] = (value >> 8) & 0xFF;
  fileDownloadContents[index+3] = (value >> 0) & 0xFF;
  write4BytesColor(colorValue, index);
}
function write4BytesColor(value, index) {
  fileDownloadSegmentColor[index+0] = value;
  fileDownloadSegmentColor[index+1] = value;
  fileDownloadSegmentColor[index+2] = value;
  fileDownloadSegmentColor[index+3] = value;
}
function recalculateFileContents() {
  let totalFileSizeInByte = 4 + (AllSpawnData.length * 2 * 4);
  for (let i = 0; i < AllSpawnData.length; i++) {
    totalFileSizeInByte += AllSpawnData[i].byte_length * AllSpawnData[i].spawns.length;
    if (totalFileSizeInByte % 4 != 0) totalFileSizeInByte += 4 - (totalFileSizeInByte % 4); //enforce alignment
  }
  if (totalFileSizeInByte % 16) {
    totalFileSizeInByte += 16 - (totalFileSizeInByte % 16);
  }
  fileDownloadContents = new Uint8Array(totalFileSizeInByte);
  fileDownloadSegmentColor = new Uint8Array(totalFileSizeInByte);

  // Amount of spawns
  write4BytesContents(AllSpawnData.length, 0, 0);

  // Vanilla 12 Spawns
  let curOffset = 4 + (AllSpawnData.length * 2 * 4);
  for (let i = 0; i < Math.min(12, AllSpawnData.length); i++) {
    write4BytesContents(curOffset, i+1, 4 + (4 * i));
    write4BytesContents(AllSpawnData[i].spawns.length, i+1, (4 + (12 * 4)) + (4 * i));

    curOffset += AllSpawnData[i].byte_length * AllSpawnData[i].spawns.length;
    if (curOffset % 4 != 0) curOffset += 4 - (curOffset % 4); //enforce alignment
  }
  // Custom Spawn Types
  let writeToIndexStart = 4 + (12 * 2 * 4);
  for (let i = 12; i < AllSpawnData.length; i++) {
    write4BytesContents(curOffset, i+1, writeToIndexStart);
    write4BytesContents(AllSpawnData[i].spawns.length, i+1, writeToIndexStart + 4);

    curOffset += AllSpawnData[i].byte_length * AllSpawnData[i].spawns.length;
    if (curOffset % 4 != 0) curOffset += 4 - (curOffset % 4); //enforce alignment
    writeToIndexStart += 8;
  }

  // Loop through all spawn types
  let writeToIndex = 4 + (AllSpawnData.length * 2 * 4);
  for (let i = 0; i < AllSpawnData.length; i++) {
    for (let j = 0; j < AllSpawnData[i].spawns.length; j++) {
      switch (AllSpawnData[i].type) {
        case "Player Spawn":
          write4BytesContents(  parseInt(floatToHex(AllSpawnData[i].spawns[j].x_pos),16)  , i+1, writeToIndex);
          write4BytesContents(  parseInt(floatToHex(AllSpawnData[i].spawns[j].y_pos),16)  , i+1, writeToIndex+4);
          write4BytesContents(  parseInt(floatToHex(AllSpawnData[i].spawns[j].z_pos),16)  , i+1, writeToIndex+8);
          write4BytesContents(  ((AllSpawnData[i].spawns[j].unused_2_bytes & 0xFFFF) << 16) | (AllSpawnData[i].spawns[j].angle & 0xFFFF) , i+1, writeToIndex+12);
          break;
        case "Vehicle Spawn":
          write4BytesContents(  parseInt(floatToHex(AllSpawnData[i].spawns[j].x_pos),16)  , i+1, writeToIndex);
          write4BytesContents(  parseInt(floatToHex(AllSpawnData[i].spawns[j].y_pos),16)  , i+1, writeToIndex+4);
          write4BytesContents(  parseInt(floatToHex(AllSpawnData[i].spawns[j].z_pos),16)  , i+1, writeToIndex+8);
          write4BytesContents(  ((AllSpawnData[i].spawns[j].angle & 0xFFFF) << 16) | (AllSpawnData[i].spawns[j].id & 0xFFFF) , i+1, writeToIndex+12);
          break;
        case "Weapon Spawn":
          write4BytesContents(  parseInt(floatToHex(AllSpawnData[i].spawns[j].x_pos),16)  , i+1, writeToIndex);
          write4BytesContents(  parseInt(floatToHex(AllSpawnData[i].spawns[j].y_pos),16)  , i+1, writeToIndex+4);
          write4BytesContents(  parseInt(floatToHex(AllSpawnData[i].spawns[j].z_pos),16)  , i+1, writeToIndex+8);
          write4BytesContents(  (AllSpawnData[i].spawns[j].id & 0xFFFFFFFF)  , i+1, writeToIndex+12);
          break;
        case "Crown Spawn":
          write4BytesContents(  parseInt(floatToHex(AllSpawnData[i].spawns[j].x_pos),16)  , i+1, writeToIndex);
          write4BytesContents(  parseInt(floatToHex(AllSpawnData[i].spawns[j].y_pos),16)  , i+1, writeToIndex+4);
          write4BytesContents(  parseInt(floatToHex(AllSpawnData[i].spawns[j].z_pos),16)  , i+1, writeToIndex+8);
          write4BytesContents(  (AllSpawnData[i].spawns[j].unused_4_bytes & 0xFFFFFFFF)  , i+1, writeToIndex+12);
          break;
        case "Spawn Limit":
          fileDownloadContents[writeToIndex] = AllSpawnData[i].spawns[j].val & 0xFF;
          fileDownloadSegmentColor[writeToIndex] = i + 1;
          break;
        case "Custom 16 bytes":
          write4BytesContents(  parseInt(floatToHex(AllSpawnData[i].spawns[j].x_pos),16)  , i+1, writeToIndex);
          write4BytesContents(  parseInt(floatToHex(AllSpawnData[i].spawns[j].y_pos),16)  , i+1, writeToIndex+4);
          write4BytesContents(  parseInt(floatToHex(AllSpawnData[i].spawns[j].z_pos),16)  , i+1, writeToIndex+8);
          write4BytesContents(  ((AllSpawnData[i].spawns[j].byte_13 & 0xFF) << 24) | ((AllSpawnData[i].spawns[j].byte_14 & 0xFF) << 16) | ((AllSpawnData[i].spawns[j].byte_15 & 0xFF) << 8) | ((AllSpawnData[i].spawns[j].byte_16 & 0xFF)) , i+1, writeToIndex+12);
          break;
        default:
          console.error("Unknown type");
      }
      writeToIndex += AllSpawnData[i].byte_length;
    }
    if (writeToIndex % 4 != 0) writeToIndex += 4 - (writeToIndex % 4); //enforce alignment
  }

  updateFilePreview();
}

function pTagColor(text, bgColorIndex = 0) {
  const highlightColors = ["01", "05", "09", "13", "17", "02", "06", "10", "14", "18", "03", "07", "11", "15", "04", "08", "12", "16"];

  let pTag = document.createElement("p");
  pTag.innerText = text;
  if (bgColorIndex != 0)
    pTag.style.backgroundColor = "var(--highlightColor-" + (highlightColors[(bgColorIndex-1) % highlightColors.length]) + ")";
  return pTag;
}
function updateFilePreview() {
  let startingAddress;
  if (GameVersion == 0) { startingAddress = 0x802A50C0; } // USA
  if (GameVersion == 1) { startingAddress = 0x802A9700; } // Japan
  if (GameVersion == 2) { startingAddress = 0x802BF480; } // PAL

  // ---------------------------- File Contents Preview ----------------------- */
  const gridElement = document.getElementById("FilePreviewGrid");
  gridElement.replaceChildren();

  const row1Contents = ["Memory Address (in game)", "Offset", ".0", ".1", ".2", ".3", ".4", ".5", ".6", ".7", ".8", ".9", ".A", ".B", ".C", ".D", ".E", ".F"];
  for (let i = 0; i < row1Contents.length; i++) {
    gridElement.appendChild(pTagColor(row1Contents[i]));
  }

  for (let i = 0; i < fileDownloadContents.length; i++) {
    if (i % 16 == 0) {
      gridElement.appendChild(pTagColor("0x" + (startingAddress + i).toString(16).toUpperCase()));
      gridElement.appendChild(pTagColor("+0x" + (i).toString(16).toUpperCase()));
    }
    gridElement.appendChild(pTagColor(fileDownloadContents[i].toString(16).padStart(2, "0").toUpperCase(), fileDownloadSegmentColor[i]));
  }

  // ---------------------------- Offset Description ----------------------- */
  const offsetElement = document.getElementById("OffsetDescriptionGrid");
  offsetElement.replaceChildren();

  const staticContents = ["Memory Address (in game)", "Offset", "Variable Type", "Description", "0x"+startingAddress.toString(16).toUpperCase(), "+0x0", "4 Byte Integer", "Total number of spawns (always 0xC in vanilla game; game never reads this value)"];
  for (let i = 0; i < staticContents.length; i++) {
    offsetElement.appendChild(pTagColor(staticContents[i]));
  }

  // offsets to first 12 spawns (all vanilla ones)
  let curOffset = 4;
  for (let i = 0; i < Math.min(12, AllSpawnData.length); i++) {
    offsetElement.appendChild(pTagColor("0x" + (startingAddress + curOffset).toString(16).toUpperCase(), fileDownloadSegmentColor[curOffset]));
    offsetElement.appendChild(pTagColor("+0x" + (curOffset).toString(16).toUpperCase(), fileDownloadSegmentColor[curOffset]));
    offsetElement.appendChild(pTagColor("4 Byte Unsigned  Integer", fileDownloadSegmentColor[curOffset]));
    offsetElement.appendChild(pTagColor("Offset to start of spawn type: " + AllSpawnData[i].name, fileDownloadSegmentColor[curOffset]));
    curOffset += 4;
  }

  // sizes to first 12 spawns (all vanilla ones)
  for (let i = 0; i < Math.min(12, AllSpawnData.length); i++) {
    offsetElement.appendChild(pTagColor("0x" + (startingAddress + curOffset).toString(16).toUpperCase(), fileDownloadSegmentColor[curOffset]));
    offsetElement.appendChild(pTagColor("+0x" + (curOffset).toString(16).toUpperCase(), fileDownloadSegmentColor[curOffset]));
    offsetElement.appendChild(pTagColor("4 Byte Integer", fileDownloadSegmentColor[curOffset]));
    offsetElement.appendChild(pTagColor("Number of spawns for: " + AllSpawnData[i].name, fileDownloadSegmentColor[curOffset]));
    curOffset += 4;
  }

  // All custom spawns (if any)
  for (let i = 12; i < AllSpawnData.length; i++) {
    offsetElement.appendChild(pTagColor("0x" + (startingAddress + curOffset).toString(16).toUpperCase(), fileDownloadSegmentColor[curOffset]));
    offsetElement.appendChild(pTagColor("+0x" + (curOffset).toString(16).toUpperCase(), fileDownloadSegmentColor[curOffset]));
    offsetElement.appendChild(pTagColor("4 Byte Unsigned Integer", fileDownloadSegmentColor[curOffset]));
    offsetElement.appendChild(pTagColor("Offset to start of spawn type: " + AllSpawnData[i].name, fileDownloadSegmentColor[curOffset]));
    curOffset += 4;
    offsetElement.appendChild(pTagColor("0x" + (startingAddress + curOffset).toString(16).toUpperCase(), fileDownloadSegmentColor[curOffset]));
    offsetElement.appendChild(pTagColor("+0x" + (curOffset).toString(16).toUpperCase(), fileDownloadSegmentColor[curOffset]));
    offsetElement.appendChild(pTagColor("4 Byte Integer", fileDownloadSegmentColor[curOffset]));
    offsetElement.appendChild(pTagColor("Number of spawns for: " + AllSpawnData[i].name, fileDownloadSegmentColor[curOffset]));
    curOffset += 4;
  }

  // Contents for All Spawns
  for (let i = 0; i < AllSpawnData.length; i++) {
    for (let j = 0; j < AllSpawnData[i].spawns.length; j++) {
      if (AllSpawnData[i].type != "Spawn Limit") {
        offsetElement.appendChild(pTagColor("0x" + (startingAddress + curOffset).toString(16).toUpperCase(), fileDownloadSegmentColor[curOffset]));
        offsetElement.appendChild(pTagColor("+0x" + (curOffset).toString(16).toUpperCase(), fileDownloadSegmentColor[curOffset]));
        offsetElement.appendChild(pTagColor("4 Byte Float", fileDownloadSegmentColor[curOffset]));
        offsetElement.appendChild(pTagColor(AllSpawnData[i].name + " - " + j + ": Spawn X position", fileDownloadSegmentColor[curOffset]));
        curOffset += 4;
        offsetElement.appendChild(pTagColor("0x" + (startingAddress + curOffset).toString(16).toUpperCase(), fileDownloadSegmentColor[curOffset]));
        offsetElement.appendChild(pTagColor("+0x" + (curOffset).toString(16).toUpperCase(), fileDownloadSegmentColor[curOffset]));
        offsetElement.appendChild(pTagColor("4 Byte Float", fileDownloadSegmentColor[curOffset]));
        offsetElement.appendChild(pTagColor(AllSpawnData[i].name + " - " + j + ": Spawn Y position", fileDownloadSegmentColor[curOffset]));
        curOffset += 4;
        offsetElement.appendChild(pTagColor("0x" + (startingAddress + curOffset).toString(16).toUpperCase(), fileDownloadSegmentColor[curOffset]));
        offsetElement.appendChild(pTagColor("+0x" + (curOffset).toString(16).toUpperCase(), fileDownloadSegmentColor[curOffset]));
        offsetElement.appendChild(pTagColor("4 Byte Float", fileDownloadSegmentColor[curOffset]));
        offsetElement.appendChild(pTagColor(AllSpawnData[i].name + " - " + j + ": Spawn Z position", fileDownloadSegmentColor[curOffset]));
        curOffset += 4;
      }

      switch (AllSpawnData[i].type) {
        case "Player Spawn":
          offsetElement.appendChild(pTagColor("0x" + (startingAddress + curOffset).toString(16).toUpperCase(), fileDownloadSegmentColor[curOffset]));
          offsetElement.appendChild(pTagColor("+0x" + (curOffset).toString(16).toUpperCase(), fileDownloadSegmentColor[curOffset]));
          offsetElement.appendChild(pTagColor("2 byte Padding", fileDownloadSegmentColor[curOffset]));
          offsetElement.appendChild(pTagColor(AllSpawnData[i].name + " - " + j + ": Unused 2 bytes (Read but unused)", fileDownloadSegmentColor[curOffset]));
          curOffset += 2;
          offsetElement.appendChild(pTagColor("0x" + (startingAddress + curOffset).toString(16).toUpperCase(), fileDownloadSegmentColor[curOffset]));
          offsetElement.appendChild(pTagColor("+0x" + (curOffset).toString(16).toUpperCase(), fileDownloadSegmentColor[curOffset]));
          offsetElement.appendChild(pTagColor("2 byte Unsigned Integer", fileDownloadSegmentColor[curOffset]));
          offsetElement.appendChild(pTagColor(AllSpawnData[i].name + " - " + j + ": Spawn Angle", fileDownloadSegmentColor[curOffset]));
          curOffset += 2;
          break;
        case "Vehicle Spawn":
          offsetElement.appendChild(pTagColor("0x" + (startingAddress + curOffset).toString(16).toUpperCase(), fileDownloadSegmentColor[curOffset]));
          offsetElement.appendChild(pTagColor("+0x" + (curOffset).toString(16).toUpperCase(), fileDownloadSegmentColor[curOffset]));
          offsetElement.appendChild(pTagColor("2 byte Unsigned Integer", fileDownloadSegmentColor[curOffset]));
          offsetElement.appendChild(pTagColor(AllSpawnData[i].name + " - " + j + ": Spawn Angle", fileDownloadSegmentColor[curOffset]));
          curOffset += 2;
          offsetElement.appendChild(pTagColor("0x" + (startingAddress + curOffset).toString(16).toUpperCase(), fileDownloadSegmentColor[curOffset]));
          offsetElement.appendChild(pTagColor("+0x" + (curOffset).toString(16).toUpperCase(), fileDownloadSegmentColor[curOffset]));
          offsetElement.appendChild(pTagColor("2 byte Signed Integer", fileDownloadSegmentColor[curOffset]));
          offsetElement.appendChild(pTagColor(AllSpawnData[i].name + " - " + j + ": Vehicle ID", fileDownloadSegmentColor[curOffset]));
          curOffset += 2;
          break;
        case "Weapon Spawn":
          offsetElement.appendChild(pTagColor("0x" + (startingAddress + curOffset).toString(16).toUpperCase(), fileDownloadSegmentColor[curOffset]));
          offsetElement.appendChild(pTagColor("+0x" + (curOffset).toString(16).toUpperCase(), fileDownloadSegmentColor[curOffset]));
          offsetElement.appendChild(pTagColor("4 byte Signed Integer", fileDownloadSegmentColor[curOffset]));
          offsetElement.appendChild(pTagColor(AllSpawnData[i].name + " - " + j + ": Pickup/PowerUp ID", fileDownloadSegmentColor[curOffset]));
          curOffset += 4;
          break;
        case "Crown Spawn":
          offsetElement.appendChild(pTagColor("0x" + (startingAddress + curOffset).toString(16).toUpperCase(), fileDownloadSegmentColor[curOffset]));
          offsetElement.appendChild(pTagColor("+0x" + (curOffset).toString(16).toUpperCase(), fileDownloadSegmentColor[curOffset]));
          offsetElement.appendChild(pTagColor("4 byte Padding", fileDownloadSegmentColor[curOffset]));
          offsetElement.appendChild(pTagColor(AllSpawnData[i].name + " - " + j + ": Unused 4 bytes", fileDownloadSegmentColor[curOffset]));
          curOffset += 4;
          break;
        case "Spawn Limit":
          offsetElement.appendChild(pTagColor("0x" + (startingAddress + curOffset).toString(16).toUpperCase(), fileDownloadSegmentColor[curOffset]));
          offsetElement.appendChild(pTagColor("+0x" + (curOffset).toString(16).toUpperCase(), fileDownloadSegmentColor[curOffset]));
          offsetElement.appendChild(pTagColor("1 Byte Integer", fileDownloadSegmentColor[curOffset]));
          offsetElement.appendChild(pTagColor(AllSpawnData[i].name + " - " + (j+1) + " Player Game: Max amount to spawn", fileDownloadSegmentColor[curOffset]));
          curOffset += 1;
          break;
        case "Custom 16 bytes":
          offsetElement.appendChild(pTagColor("0x" + (startingAddress + curOffset).toString(16).toUpperCase(), fileDownloadSegmentColor[curOffset]));
          offsetElement.appendChild(pTagColor("+0x" + (curOffset).toString(16).toUpperCase(), fileDownloadSegmentColor[curOffset]));
          offsetElement.appendChild(pTagColor("1 Byte Integer", fileDownloadSegmentColor[curOffset]));
          offsetElement.appendChild(pTagColor(AllSpawnData[i].name + " - " + j + " Custom 13th Byte Value", fileDownloadSegmentColor[curOffset]));
          curOffset += 1;
          offsetElement.appendChild(pTagColor("0x" + (startingAddress + curOffset).toString(16).toUpperCase(), fileDownloadSegmentColor[curOffset]));
          offsetElement.appendChild(pTagColor("+0x" + (curOffset).toString(16).toUpperCase(), fileDownloadSegmentColor[curOffset]));
          offsetElement.appendChild(pTagColor("1 Byte Integer", fileDownloadSegmentColor[curOffset]));
          offsetElement.appendChild(pTagColor(AllSpawnData[i].name + " - " + j + " Custom 14th Byte Value", fileDownloadSegmentColor[curOffset]));
          curOffset += 1;
          offsetElement.appendChild(pTagColor("0x" + (startingAddress + curOffset).toString(16).toUpperCase(), fileDownloadSegmentColor[curOffset]));
          offsetElement.appendChild(pTagColor("+0x" + (curOffset).toString(16).toUpperCase(), fileDownloadSegmentColor[curOffset]));
          offsetElement.appendChild(pTagColor("1 Byte Integer", fileDownloadSegmentColor[curOffset]));
          offsetElement.appendChild(pTagColor(AllSpawnData[i].name + " - " + j + " Custom 15th Byte Value", fileDownloadSegmentColor[curOffset]));
          curOffset += 1;
          offsetElement.appendChild(pTagColor("0x" + (startingAddress + curOffset).toString(16).toUpperCase(), fileDownloadSegmentColor[curOffset]));
          offsetElement.appendChild(pTagColor("+0x" + (curOffset).toString(16).toUpperCase(), fileDownloadSegmentColor[curOffset]));
          offsetElement.appendChild(pTagColor("1 Byte Integer", fileDownloadSegmentColor[curOffset]));
          offsetElement.appendChild(pTagColor(AllSpawnData[i].name + " - " + j + " Custom 16th Byte Value", fileDownloadSegmentColor[curOffset]));
          curOffset += 1;
          break;
        default:
          console.error("Unknown type");
      }
    }
    if (curOffset % 4 != 0) curOffset += 4 - (curOffset % 4); //enforce alignment
  }
}

/* ------------ Create 3D Display (download more files) ------------ */

function initialize3DDisplay() {
  const containerAll = document.getElementById("ThreeJsDisplay");
  document.getElementById("UnloadedThreeJSButton").remove();
  const allChildren = containerAll.querySelectorAll("*");
  allChildren.forEach(elem => {
    elem.style.display = "";
  });
  document.getElementsByClassName("ThreeJSKey")[8].style.display = (AllSpawnData.length > 12) ? "" : "none"; // hide custom spawn key if none exists

  const containerRelevant = document.getElementById("ThreeJSRightBar");
  
  const moduleScript = document.createElement("script");
  moduleScript.type = "module";
  moduleScript.textContent = `
    import * as THREE from '../Resources/three.js/build/three.module.min.js';
    import { PointerLockControls } from '../Resources/three.js/examples/jsm/controls/PointerLockControls.js';
    window.THREE = THREE;
    window.PointerLockControls = PointerLockControls;
    window.dispatchEvent(new Event('threejs-module-ready'));
  `;
  containerRelevant.appendChild(moduleScript);

  window.addEventListener('threejs-module-ready', () => {
    const externalScript = document.createElement("script");
    externalScript.src = "./render.js";
    containerRelevant.appendChild(externalScript);

    document.getElementById("ThreeJsDisplay").ondragover = function (event) { event.preventDefault(); };
    document.getElementById("ThreeJsDisplay").ondrop = function (event) {
      event.preventDefault();
      mapDraggedIn(event);
    };
  }, { once: true });
}

/* ------------ Run on startup ------------ */

// wait for full html load
window.addEventListener("load", function() {
  initializeSpawnData();
  DisplayAllSpawnDataFromScratch();
  updateGeckoCodes();
  updateFileNum(0);
  wasFileChanged = false;
});
window.addEventListener("beforeunload", (event) => {
  if (wasFileChanged) {
    event.preventDefault();
    event.returnValue = "";
  }
});