/* ---------------------- Making Table ----------------------------- */

var JsonFile = null;
var JsonFile_ProjectileIDsNames = null;

function removeAllChildrenAndParentElement(parent) {
    while (parent.firstChild) {
        parent.firstChild.remove();
    }
    parent.remove();
}
function wipeTable(id, childrenToKeep) {
    var table = document.getElementById(id);
    var children = table.children;
    for (var i = childrenToKeep; i < children.length; i) {
        table.removeChild(children[i]);
    }
}

function resetTable() {
    wipeTable("tableGrid", 18);
    wipeTable("tableGrid_hc", 4);
    makeTable();
    makeTable_hc();
    resetHelpText(); //address to functions at bottom of page
}
function makeTable() {
    damageString = getGameVersionString();

    relevent = JsonFile["BaseAddress"+damageString]

    toAdd = "";
    for (var i = 0; i < JsonFile.WeaponIDs.length; i++) {
        id = JsonFile.WeaponIDs[i].ID;
        
        // Probably need to make the divs and such in a less lazy way, but I lack time
        toAdd += "<p>" + JsonFile_ProjectileIDsNames[id].replaceAll("+","<br>+") + "</p>";
        toAdd += "<p>" + id + "<span class=\"AdvancedOnly\">&#160(" +  id.toString(16).toUpperCase() + ")</span></p>";
        curString = "_Singleplayer";
        for (var k = 0; k < 2; k++) {
            for (var j = 0; j < 3; j++) {
                DirectDamageValue = JsonFile.WeaponIDs[i]["Damage"+curString+damageString][j];
                DirectDamageAddress = (relevent+(40*id)+14+(j*2)).toString(16).toUpperCase();
                SplashDamageValue = JsonFile.WeaponIDs[i]["Damage"+curString+"_Splash"+damageString][j];
                SplashDamageAddress = (relevent+(40*id)+20+(j*2)).toString(16).toUpperCase();
                toAdd += "<p>" + DirectDamageValue + "<span class=\"AdvancedOnly\">&#160(" + DirectDamageAddress + ") </span>";
                toAdd += " / ";
                toAdd += "" + SplashDamageValue + "<span class=\"AdvancedOnly\">&#160(" + SplashDamageAddress + ")</span>";
                // if (SplashDamageValue != DirectDamageAddress) toAdd += "<span> / " + SplashDamageValue + "</span> <span class=\"AdvancedOnly\"> (" + SplashDamageAddress + ") </span>";
                toAdd += "</p>";
            }
            curString = "_VsMode";
        }
        toAdd += "<p>" + JsonFile.WeaponIDs[i]["Notes"] + "</p>"
    }
    document.getElementById("tableGrid").innerHTML += toAdd;
}
function makeTable_hc() {
    damageString = getGameVersionString();

    toAdd = "";
    for (var i = 0; i < JsonFile.HardcodedDamage.length; i++) {
        Type = JsonFile.HardcodedDamage[i].Type;
        Damage = JsonFile.HardcodedDamage[i]["Damage"+damageString];
        Address = JsonFile.HardcodedDamage[i]["Address"+damageString];
        Notes = JsonFile.HardcodedDamage[i].Notes;
        toAdd += "<p>" + i + "</p>";
        toAdd += "<p>" + Type + "</p>";
        toAdd += "<p>" + Damage + "<span class=\"AdvancedOnly\">&#160(" + Address.toString(16).toUpperCase() + ")</span></p>";
        toAdd += "<p>" + Notes + "</p>";
    }
    document.getElementById("tableGrid_hc").innerHTML += toAdd;
}
function LoadJSONFile(indexReplace = -1) {
    fetch('../../Documentation/ProjectileIDs_names.json')
    .then(response1 => response1.json())
    .then(data1 => {
        JsonFile_ProjectileIDsNames = data1;
        fetch('../../Documentation/ProjectileIDs_legacy.json')
        .then(response2 => response2.json())
        .then(data2 => {
            JsonFile = data2;
            makeTable(indexReplace);
            makeTable_hc(indexReplace);
            resetHelpText();
        })
        .catch(error => { console.error('Error reading JSON file: ', error); });
    })
    .catch(error => { console.error('Error reading JSON file: ', error); });
    // fetch('IDs.json')
    // .then(response => response.json())
    // .then(data => { JsonFile = data; makeTable(indexReplace); makeTable_hc(indexReplace); resetHelpText(); })
    // .catch(error => { console.error('Error reading JSON file: ', error); });
}
LoadJSONFile();

/* ---------------------- Other ---------------------- */

/**
 * Gives index value to get to a specific weapon ID. Looks at the index value of ID first to see if it's the same as the ID.
 * If not the entire JSON file is searched for the ID.
 * @param {Integer} id = weapon ID of interest
 * @returns index value of where that weapon ID is. -1 otherwise.
 */
function searchJSONForID(id) {
    if (JsonFile == null) return -1;

    if (JsonFile.WeaponIDs[id] != null && JsonFile.WeaponIDs[id].ID == id) return id;

    for (var i = 0; i < JsonFile.WeaponIDs.length; i++) {
        if (JsonFile.WeaponIDs[i].ID == id) {
            return JsonFile.WeaponIDs[i];
        }
    }
    return -1;
}

/**
 * Gives String for gameversion. Returns "_USA" if GameVersion is 0, "_Japan" if GameVersion is 1, "_PAL" if GameVersion is 2.
 * @returns {String} the game version string based on the GameVersion variable
 */
function getGameVersionString() {
    if (GameVersion == 0) return "_USA";
    if (GameVersion == 1) return "_JAPAN";
    if (GameVersion == 2) return "_PAL";
    return "ERROR!!!!";
}

/* ---------------------- Making Codes ----------------------------- */

var numOfCodes = 0;
var usedIds = [];
var timerForDoubleClick = null;
function clampInputField(inputObject) {
    var min = parseInt(inputObject.min);
    if (!isNaN(min) && parseInt(inputObject.value) < min) {
        inputObject.value = min;
    }
    var max = parseInt(inputObject.max);
    if (!isNaN(max) && parseInt(inputObject.value) > max) {
        inputObject.value = max;
    }
}
function removeAllWeaponCodes() {
    for (var i = 0; i < usedIds.length; i++) {
        document.getElementById("Weapon_Select_" + usedIds[i]).remove();
        document.getElementById("GameMode_Select_" + usedIds[i]).remove();
        document.getElementById("WeaponDamage_Pilot_" + usedIds[i]).remove();
        document.getElementById("WeaponDamage_Arwing_" + usedIds[i]).remove();
        document.getElementById("WeaponDamage_LandMaster_" + usedIds[i]).remove();
        document.getElementById("Other_Box_" + usedIds[i]).remove();
    }
    usedIds = [];
    numOfCodes = 0;
}
function removeAllWeaponCodes_DoubleClickHandler(obj) {
    obj.classList.toggle("removeAllBackgroundTransition");
    if (timerForDoubleClick != null) { removeAllWeaponCodes(); clearTimeout(timerForDoubleClick); timerForDoubleClick = null; return;}
    timerForDoubleClick = setTimeout(function() {
        clearTimeout(timerForDoubleClick);
        timerForDoubleClick = null;
        obj.classList.remove("removeAllBackgroundTransition");
    }, 300);
    
}

function updateDropdownOrInputField(idNum, idToLookFor, typeToUpdate) {
    var select = document.getElementById(idToLookFor + idNum).getElementsByTagName("select")[0];
    var input = document.getElementById(idToLookFor + idNum).getElementsByTagName("input")[0];

    if (typeToUpdate == 0) { input.value = select.value; }
    else { select.value = input.value; }

    // Search JSON for weapon with id
    if (idToLookFor == "GameMode_Select_") return;
    if (select.value == "") return;
    var index = searchJSONForID(parseInt(select.value));
    if (index == -1) return;
    var extraOffset = document.getElementById("Other_Box_" + idNum).getElementsByTagName("input")[0];
    extraOffset.value = 0;
}

function addSelectForAllWeapons(idToLookFor, forGameModes, startValue = 0) {
    var select = document.createElement("select");
    select.className = "WeaponTypeDropdown";

    if (forGameModes == false) {
        for (var i = 0; i < JsonFile.WeaponIDs.length; i++) {
            weaponJSON = JsonFile.WeaponIDs[i];
            var option = document.createElement("option");
            option.text = JsonFile_ProjectileIDsNames[weaponJSON.ID].substring(0, 100);
            if (option.text == "-") option.text = "(id: " + weaponJSON.ID + ")";
            option.value = weaponJSON.ID;
            if (weaponJSON.Unused == 1) option.className = "AdvancedOnly";
            select.appendChild(option);
        }
    } if (forGameModes == true) {
        allGameModes = ["All", "Single Player", "Vs Mode"];
        for (var i = 0; i < allGameModes.length; i++) {
            var option = document.createElement("option");
            option.text = allGameModes[i];
            option.value = i-1;
            select.appendChild(option);
        }
    }
    select.value = startValue;

    var numOfCodes_copy = numOfCodes;
    var idToLookFor_copy = idToLookFor;
    select.onchange = function() {
        updateDropdownOrInputField(numOfCodes_copy, idToLookFor_copy, 0);
    }

    return select;
}
function addSelectForAllWeapons_AdanvedModeInput(idToLookFor, forGameModes, startValue = 0) {
    var input = document.createElement("input");
    input.type = "number";
    input.className = "AdvancedOnly WeaponTypeDropdown_Advanced_TextInput";
    if (forGameModes == false) input.min = "0";
    if (forGameModes == true) { input.min = "-1"; input.max = "255"; }
    input.value = startValue;

    var numOfCodes_copy = numOfCodes;
    var idToLookFor_copy = idToLookFor;
    input.onchange = function() {
        clampInputField(this);
        updateDropdownOrInputField(numOfCodes_copy, idToLookFor_copy, 1);
    }

    return input;
}
function addWeaponDamageAmount(idToLookFor, startValue = 0) {
    var input = document.createElement("input");
    input.type = "number";
    input.className = "WeaponDamage_TextInput";
    input.min = "-32768";
    input.max = "32767";
    input.value = startValue;
    input.onchange = function() {
        clampInputField(this);
    }
    return input;
}
function addOtherStuff_DeleteButton() {
    var button = document.createElement("button");
    button.innerHTML = "Remove";
    button.className = "DeleteWeaponCodeButton";

    var numOfCodes_copy = numOfCodes;
    button.onclick = function() {
        document.getElementById("Weapon_Select_" + numOfCodes_copy).remove();
        document.getElementById("GameMode_Select_" + numOfCodes_copy).remove();
        document.getElementById("WeaponDamage_Pilot_" + numOfCodes_copy).remove();
        document.getElementById("WeaponDamage_Arwing_" + numOfCodes_copy).remove();
        document.getElementById("WeaponDamage_LandMaster_" + numOfCodes_copy).remove();
        document.getElementById("Other_Box_" + numOfCodes_copy).remove();
        usedIds.splice(usedIds.indexOf(numOfCodes_copy), 1);
    }
    return button;
}
function addOtherStuff_ExtraOffsetThing(startValue = 0) {
    var input = document.createElement("input");
    input.type = "number";
    input.className = "ExtraOffsetAdvancedThing AdvancedOnly";
    input.min = "-14";
    input.max = "40";
    input.value = startValue;
    input.onchange = function() {
        clampInputField(this);
        if (this.value % 2 != 0) this.value++;
    }

    return input;
}
function addSpanWithSlash() {
    var span = document.createElement("span");
    span.innerHTML = " / ";
    return span;
}

function AddCustomCodeWeaponButton(WeaponId = 0, GameMode = -1, PilotDirectDmg = "", PilotSplashDmg = "", ArwingDirectDmg = "", ArwingSplashDmg = "", LandMasterDirectDmg = "", LandMasterSplashDmg = "", OtherBoxAmt = 0) {
    var code = document.getElementById("CustomWeaponDamageContainer");

    var div = document.createElement("div");
    div.appendChild(addSelectForAllWeapons("Weapon_Select_", false, WeaponId));
    div.appendChild(addSelectForAllWeapons_AdanvedModeInput("Weapon_Select_", false, WeaponId));
    div.id = "Weapon_Select_" + numOfCodes;
    code.appendChild(div);

    div = document.createElement("div");
    // div.style.paddingLeft = "10%"; div.style.paddingRight = "10%";
    div.appendChild(addSelectForAllWeapons("GameMode_Select_", true, GameMode));
    div.appendChild(addSelectForAllWeapons_AdanvedModeInput("GameMode_Select_", true, GameMode));
    div.id = "GameMode_Select_" + numOfCodes;
    code.appendChild(div);

    div = document.createElement("div");
    div.appendChild(addWeaponDamageAmount("WeaponDamage_Pilot_", PilotDirectDmg));
    div.appendChild(addSpanWithSlash());
    div.appendChild(addWeaponDamageAmount("WeaponDamage_Pilot_", PilotSplashDmg));
    div.id = "WeaponDamage_Pilot_" + numOfCodes;
    code.appendChild(div);

    div = document.createElement("div");
    div.appendChild(addWeaponDamageAmount("WeaponDamage_Arwing_", ArwingDirectDmg));
    div.appendChild(addSpanWithSlash());
    div.appendChild(addWeaponDamageAmount("WeaponDamage_Arwing_", ArwingSplashDmg));
    div.id = "WeaponDamage_Arwing_" + numOfCodes;
    code.appendChild(div);

    div = document.createElement("div");
    div.appendChild(addWeaponDamageAmount("WeaponDamage_LandMaster_", LandMasterDirectDmg));
    div.appendChild(addSpanWithSlash());
    div.appendChild(addWeaponDamageAmount("WeaponDamage_LandMaster_", LandMasterSplashDmg));
    div.id = "WeaponDamage_LandMaster_" + numOfCodes;
    code.appendChild(div);

    div = document.createElement("div");
    div.appendChild(addOtherStuff_DeleteButton());
    div.appendChild(addOtherStuff_ExtraOffsetThing(OtherBoxAmt));
    div.id = "Other_Box_" + numOfCodes;
    code.appendChild(div);

    usedIds.push(numOfCodes);
    numOfCodes++;
}

/* ------------------------- Change HardCoded Damage ----------------------- */

var usedIds_hc = [];
var numOfCodes_hc = 0;
var timerForDoubleClick_hc = null;

function updateDropdownOrInputField_hc(idNum, idToLookFor, typeToUpdate) {
    var select = document.getElementById(idToLookFor + idNum).getElementsByTagName("select")[0];
    var input = document.getElementById(idToLookFor + idNum).getElementsByTagName("input")[0];

    if (typeToUpdate == 0) { input.value = select.value; }
    else { select.value = input.value; }
}
function removeAllWeaponCodes_hc() {
    for (var i = 0; i < usedIds_hc.length; i++) {
        document.getElementById("HardCodedType_" + usedIds_hc[i]).remove();
        document.getElementById("GameMode_" + usedIds_hc[i]).remove();
        document.getElementById("Damage_" + usedIds_hc[i]).remove();
        document.getElementById("Other_" + usedIds_hc[i]).remove();
    }
    usedIds_hc = [];
    numOfCodes_hc = 0;
}
function removeAllWeaponCodes_DoubleClickHandler_hc(obj) {
    obj.classList.toggle("removeAllBackgroundTransition");
    if (timerForDoubleClick_hc != null) { removeAllWeaponCodes_hc(); clearTimeout(timerForDoubleClick_hc); timerForDoubleClick_hc = null; return;}
    timerForDoubleClick_hc = setTimeout(function() {
        clearTimeout(timerForDoubleClick_hc);
        timerForDoubleClick_hc = null;
        obj.classList.remove("removeAllBackgroundTransition");
    }, 300);
    
}

function addSelectForAllTypesOfDamage(startValue = 0) {
    var select = document.createElement("select");
    select.className = "WeaponTypeDropdown";

    for (var i = 0; i < JsonFile.HardcodedDamage.length; i++) {
        releventJSON = JsonFile.HardcodedDamage[i];
        var option = document.createElement("option");
        option.text = releventJSON.Type;
        option.value = i;
        if (releventJSON.Unused == 1) option.className = "AdvancedOnly";
        select.appendChild(option);
    }
    select.value = startValue;

    var numOfCodes_hc_copy = numOfCodes_hc;
    select.onchange = function() {
        //Since landmaster damage is negative, we need to change the min and max of the input field
        if (JsonFile.HardcodedDamage[this.value]["SpecialHandling"] != null) {
            document.getElementById("Damage_" + numOfCodes_hc_copy).getElementsByTagName("input")[0].min = "-32767";
            document.getElementById("Damage_" + numOfCodes_hc_copy).getElementsByTagName("input")[0].max = "32768";
        } else {
            document.getElementById("Damage_" + numOfCodes_hc_copy).getElementsByTagName("input")[0].min = "-32768";
            document.getElementById("Damage_" + numOfCodes_hc_copy).getElementsByTagName("input")[0].max = "32767";
        }
        clampInputField(document.getElementById("Damage_" + numOfCodes_hc_copy).getElementsByTagName("input")[0]);
    }
    return select;
}
function addGameModeSelector_hc(idToLookFor, startValue = -1, typeOfVal = 0) {
    var select = document.createElement("select");
    select.className = "WeaponTypeDropdown";

    allGameModes = ["All", "Single Player", "Vs Mode"];
    for (var i = 0; i < allGameModes.length; i++) {
        var option = document.createElement("option");
        option.text = allGameModes[i];
        option.value = i-1;
        select.appendChild(option);
    }
    select.value = startValue;

    var numOfCodes_copy;
    if (typeOfVal == 0) numOfCodes_copy = numOfCodes_hc;
    if (typeOfVal == 1) numOfCodes_copy = numOfCodes_random;
    var idToLookFor_copy = idToLookFor;
    select.onchange = function() {
        updateDropdownOrInputField_hc(numOfCodes_copy, idToLookFor_copy, 0);
    }

    return select;
}
function addGameModeSelector_hc_AdanvedModeInput(idToLookFor, startValue = -1, typeOfVal = 0) {
    var input = document.createElement("input");
    input.type = "number";
    input.className = "AdvancedOnly WeaponTypeDropdown_Advanced_TextInput";
    input.min = "-1";
    input.max = "255";
    input.value = startValue;

    var numOfCodes_copy;
    if (typeOfVal == 0) numOfCodes_copy = numOfCodes_hc;
    if (typeOfVal == 1) numOfCodes_copy = numOfCodes_random;
    var idToLookFor_copy = idToLookFor;
    input.onchange = function() {
        clampInputField(this);
        updateDropdownOrInputField_hc(numOfCodes_copy, idToLookFor_copy, 1);
    }

    return input;
}
function addWeaponDamageAmount_hc(startValue = 0) {
    var input = document.createElement("input");
    input.type = "number";
    input.className = "WeaponDamage_TextInput";
    input.min = "-32768";
    input.max = "32767";
    input.value = startValue;
    input.onchange = function() {
        clampInputField(this);
    }
    return input;
}
function addOtherStuff_DeleteButton_hc() {
    var button = document.createElement("button");
    button.innerHTML = "Remove";
    button.className = "DeleteWeaponCodeButton";

    var numOfCodes_copy = numOfCodes_hc;
    button.onclick = function() {
        document.getElementById("HardCodedType_" + numOfCodes_copy).remove();
        document.getElementById("GameMode_" + numOfCodes_copy).remove();
        document.getElementById("Damage_" + numOfCodes_copy).remove();
        document.getElementById("Other_" + numOfCodes_copy).remove();
        usedIds_hc.splice(usedIds_hc.indexOf(numOfCodes_copy), 1);
    }
    return button;
}

function AddCustomHardCodedButton(Type = 0, GameMode = -1, Damage = "") {
    var code = document.getElementById("CustomHardCodedContainer");

    var div = document.createElement("div");
    div.appendChild(addSelectForAllTypesOfDamage(Type));
    div.id = "HardCodedType_" + numOfCodes_hc;
    code.appendChild(div);

    div = document.createElement("div");
    div.appendChild(addGameModeSelector_hc("GameMode_", GameMode));
    div.appendChild(addGameModeSelector_hc_AdanvedModeInput("GameMode_", GameMode));
    div.id = "GameMode_" + numOfCodes_hc;
    code.appendChild(div);

    div = document.createElement("div");
    div.appendChild(addWeaponDamageAmount_hc(Damage));
    div.id = "Damage_" + numOfCodes_hc;
    code.appendChild(div);

    div = document.createElement("div");
    div.appendChild(addOtherStuff_DeleteButton_hc());
    div.id = "Other_" + numOfCodes_hc;
    code.appendChild(div);

    usedIds_hc.push(numOfCodes_hc);
    numOfCodes_hc++;
}


/* ------------------------- Code Conversions --------------------------------------- */

/**
 * Returns useful information for equal values in the same weapon.
 * @param {Array of Integers} ArrayOfDamageValues = Array of the damage values for the current Row in the table sorted by what their address will be (Pilot Direct, Arwing Direct, Landmaster Direct, Pilot Splash, Arwing Splash, Landmaster Splash)
 * @returns {JSON, key is index from ArrayOfDamageValues, value is int of number of adjacent indexes with the same value} examples:
 *      { 0: 0, 1: 0, 2: 0 } for no repeats
 *      { 0: 1, 2: 0 } for Pilot and Arwing having same value, but not Landmaster
 *      { 0: 2 } for all having same value
 *      { 0: 0, 1: 1} for Arwing and Landmaster having same damage, but not Pilot
 */
function GetRepeatValues(ArrayOfDamageValues) {
    var toReturn = {};
    for (var i = 0; i < ArrayOfDamageValues.length; i++) {
        var damageCur = ArrayOfDamageValues[i];
        damageCur = parseInt(damageCur);
        var repeats = 0;
        for (var j = i+1; j < ArrayOfDamageValues.length; j++) {
            var damageNxt = ArrayOfDamageValues[j];
            damageNxt = parseInt(damageNxt);
            if (isNaN(damageCur) || isNaN(damageNxt)) break;
            if (damageCur != damageNxt) break;
            repeats++;
        }
        toReturn[i] = repeats;
        i += repeats;
    }
    return toReturn;
}

/**
 * Returns just the string for a single weapon's damage values. This function is made for The random and normal code genreator
 * @param {*} addressOfInterest - Address of where the weapon's damage values are stored
 * @param {*} allDamageValues - Array of all the damage values for the current Row in the table sorted by what their address will be (Pilot Direct, Arwing Direct, Landmaster Direct, Pilot Splash, Arwing Splash, Landmaster Splash)
 * @param {*} extraOffsetAmt - Extra offset amount for the weapon
 * @returns {String} the Gecko Code for the game mode (All the 0x02 opcodes)
 */
function getCodeForGameMode_Helper(addressOfInterest, allDamageValues, extraOffsetAmt) {
    var toReturn = "";
    var RepeatValues = GetRepeatValues(allDamageValues);
    for (var j in RepeatValues) {
        var damage = parseInt(allDamageValues[j]);
        if (isNaN(damage)) continue;
        if (damage < 0) damage = 65535 + damage + 1; //negative damage handling, turning it into large positive value
        var thisLine = (0x02000000 + addressOfInterest + (j*2) + extraOffsetAmt).toString(16).toUpperCase().padStart(8, "0") + " " + RepeatValues[j].toString(16).toUpperCase().padStart(4, "0") + damage.toString(16).toUpperCase().padStart(4, "0") + "\n";
        toReturn += thisLine;
    }
    return toReturn;
}
/**
 * Makes the Gecko Code for the game mode (All the 0x02 opcodes)
 * @param {Array of Integers} ArrayOfIds = Array of all the IDs of elements on the page for changing Weapon Damage Values
 * @return {String} the Gecko Code for the game mode (All the 0x02 opcodes)
 */
function getCodeForGameMode(ArrayOfIds) {
    if (ArrayOfIds == null || ArrayOfIds.length == 0) return "";
    var gameVerString = getGameVersionString();
    toReturn = "";
    for (var i = 0; i < ArrayOfIds.length; i++) {
        var curID = ArrayOfIds[i];
        var weaponID = document.getElementById("Weapon_Select_" + curID).getElementsByTagName("input")[0].value;
        var addressOfInterest = parseInt(JsonFile["BaseAddress" + gameVerString] + (40*weaponID) + 14 - 0x80000000);

        //Get all damage values for this weapon
        var allTypesOfDamageIds = ["WeaponDamage_Pilot_", "WeaponDamage_Arwing_", "WeaponDamage_LandMaster_"];
        var allDamageValues = [];
        for (var j = 0; j < allTypesOfDamageIds.length*2; j++) {
            var val = document.getElementById(allTypesOfDamageIds[j%3] + curID).getElementsByTagName("input")[parseInt(j/3)].value;
            allDamageValues.push(val);
        }
        var extraOffsetAmt = parseInt(document.getElementById("Other_Box_" + curID).getElementsByTagName("input")[0].value);
        if (isNaN(extraOffsetAmt)) extraOffsetAmt = 0;
        toReturn += getCodeForGameMode_Helper(addressOfInterest, allDamageValues, extraOffsetAmt);
    }
    return toReturn;
}

function getCodeForHardCoded_Helper(gameVerString, TypeOfDamage, damageAmt, warningTextID = "WarningText") {
    var toReturn = "";
    if (JsonFile.HardcodedDamage[TypeOfDamage]["SpecialHandling"] != null) {
        var ifcmplwiDmg = damageAmt;
        if (ifcmplwiDmg < 0) ifcmplwiDmg = 65535 + ifcmplwiDmg + 1; //negative damage handling, turning it into large positive value
        thisLine = (0x04000000 + JsonFile.HardcodedDamage[TypeOfDamage]["SpecialHandling"]["Address" + gameVerString] - 0x80000000).toString(16).toUpperCase().padStart(8, "0") + " " + JsonFile.HardcodedDamage[TypeOfDamage]["SpecialHandling"]["First16BitsOfInstruction" + gameVerString] + ifcmplwiDmg.toString(16).toUpperCase().padStart(4, "0") + "\n";
        toReturn += thisLine; // changes if statement above subtraction
        damageAmt *= -1;  //Landmaster damage is done with subtraction of an immediate value. This handles that case
    }
    if (damageAmt < 0) damageAmt = 65535 + damageAmt + 1; //negative damage handling, turning it into large positive value
    if (damageAmt != 0 && damageAmt < 32768 && JsonFile.HardcodedDamage[TypeOfDamage]["SpecialHandling"] != null) { //Warning for how Landmaster damage is handled
        document.getElementById(warningTextID).innerHTML = "Warning: The Landmaster damage when running over an enemy is done like this: 'if (health > 100) { health += -100; } else { health = 0; }'. The code maker changes the value of both 100, but the if statement uses unsigned values, so the landmaster is always destroyed with negative damage. Rewriting the games code can fix it, but this tool only changes damage amounts."
    }
    var thisLine = (0x04000000 + JsonFile.HardcodedDamage[TypeOfDamage]["Address" + gameVerString] - 0x80000000).toString(16).toUpperCase().padStart(8, "0") + " " + JsonFile.HardcodedDamage[TypeOfDamage]["First16BitsOfInstruction" + gameVerString] + damageAmt.toString(16).toUpperCase().padStart(4, "0") + "\n";
    toReturn += thisLine;
    return toReturn;
}
/**
 * Makes the Gecko Code for the game mode (All the 0x04 opcodes)
 * @param {Array of Integers} ArrayOfIds = Array of all the IDs of elements on the page for changing Weapon Damage Values
 * @return {String} the Gecko Code for the game mode (All the 0x04 opcodes)
 */
function getCodeForHardCoded(ArrayOfIds) {
    if (ArrayOfIds == null || ArrayOfIds.length == 0) return "";
    var gameVerString = getGameVersionString();
    toReturn = "";
    for (var i = 0; i < ArrayOfIds.length; i++) {
        var curID = ArrayOfIds[i];
        
        TypeOfDamage = document.getElementById("HardCodedType_" + curID).getElementsByTagName("select")[0].value;
        damageAmt = parseInt(document.getElementById("Damage_" + curID).getElementsByTagName("input")[0].value);
        if (isNaN(damageAmt)) continue;
        
        toReturn += getCodeForHardCoded_Helper(gameVerString, TypeOfDamage, damageAmt);
    }
    return toReturn;
}
function convertInfoToCode() {
    //Get text to display error (if any)
    var errorText = document.getElementById("ErrorText");
    errorText.innerHTML = "";
    var warningText = document.getElementById("WarningText");
    warningText.innerHTML = "";
    if (usedIds.length == 0 && usedIds_hc.length == 0) {
        errorText.innerHTML = "No custom weapon damage values to convert. Click the green 'Add Row' button above to add some.";
        return;
    }
    var placedAnything = false;

    //Get gameversion string and Address for gamemode
    var gameVerString = getGameVersionString();
    var gameModeAddress = JsonFile["GameModeAddress" + gameVerString]-0x80000001;

    var allGameModes = new Set();
    var gameModeAll = false;
    //Make JSON key the gamemode type, and value an array of all usedIDs that have that gamemode
    var usedIdsSortedByGamemode = {};
    for (var i = 0; i < usedIds.length; i++) {
        var gameMode = document.getElementById("GameMode_Select_" + usedIds[i]).getElementsByTagName("input")[0].value;
        if (usedIdsSortedByGamemode[gameMode] == null) usedIdsSortedByGamemode[gameMode] = [];
        usedIdsSortedByGamemode[gameMode].push(usedIds[i]);
        if (gameMode != -1) allGameModes.add(gameMode);
        else gameModeAll = true;
    }

    //Make JSON key the gamemode type, and value an array of all usedIDs_hc that have that gamemode
    var usedIdsSortedByGamemode_hc = {};
    for (var i = 0; i < usedIds_hc.length; i++) {
        var gameMode = document.getElementById("GameMode_" + usedIds_hc[i]).getElementsByTagName("input")[0].value;
        if (usedIdsSortedByGamemode_hc[gameMode] == null) usedIdsSortedByGamemode_hc[gameMode] = [];
        usedIdsSortedByGamemode_hc[gameMode].push(usedIds_hc[i]);
        if (gameMode != -1) allGameModes.add(gameMode);
        else gameModeAll = true;
    }
    if (gameModeAll) allGameModes.add(-1);

    //iterate through usedIdsSortedByGamemode and make the code
    var codeString = "";
    var inIfStatement = 0;
    for (var gamemode of allGameModes) {
        gamemode = parseInt(gamemode);
        addedIfStatement = false;

        var WeaponCodeForThisGameMode;
        var HardCodedForThisGameMode;
        var WeaponCodeForThisGameMode = getCodeForGameMode(usedIdsSortedByGamemode[gamemode]);
        var HardCodedForThisGameMode = getCodeForHardCoded(usedIdsSortedByGamemode_hc[gamemode]);
        if (HardCodedForThisGameMode == "" && WeaponCodeForThisGameMode == "") continue;
        if (gamemode == -1) {
            if (inIfStatement) { codeString += "E2000001 00000000\n"; inIfStatement = false; }
            codeString = WeaponCodeForThisGameMode + HardCodedForThisGameMode + codeString;
        } else {
            codeString += (0x28000000 + gameModeAddress + inIfStatement).toString(16).toUpperCase().padStart(8, "0") + " FF0000" + gamemode.toString(16).toUpperCase().padStart(2, "0") + "\n";
            inIfStatement = 1;
            codeString += WeaponCodeForThisGameMode + HardCodedForThisGameMode;
        }
        placedAnything = true;
    }
    if (inIfStatement) { codeString += "E2000001 00000000\n"; inIfStatement = false; }
    codeString.replace(/\n$/, ""); //Remove last newline character
    document.getElementById("CustomWeaponDamageCode").value = codeString;

    if (!placedAnything) {
        errorText.innerHTML = "No custom weapon damage values to convert. Click the input fields below a type of damage to make some.";
    }

    //Check if there is a default value for hardcoded values
    var AllInfo_hc = readCode_hc();
    var HaveDefaultValues = new Set();
    if (AllInfo_hc[-1] != null) {
        for (var i = 0; i < AllInfo_hc[-1].length; i++) {
            HaveDefaultValues.add(AllInfo_hc[-1][i].TypeIndex);
        }
    }
    var MissingDefaultFor = false;
    for (var gameMode in AllInfo_hc) {
        if (gameMode == -1) continue;
        for (var i = 0; i < AllInfo_hc[gameMode].length; i++) {
            MissingDefaultFor = MissingDefaultFor | !HaveDefaultValues.has(AllInfo_hc[gameMode][i].TypeIndex);
        }
    }
    if (MissingDefaultFor) {
        if (warningText.innerHTML != "") { warningText.innerHTML += "<br>"; }
        warningText.innerHTML += "Warning: At least one hardcoded damage type isn't set for all gamemodes. While not needed, that means its damage could be inconsistent and change depending on the last played gamemode.";
    }
}




function displayError(errorText, textArea, numberOfLines, lineNumber, startHighlight, endHighlight, textToDisplay) {
    textArea.focus();
    textArea.setSelectionRange(startHighlight, endHighlight);
    var lineHeight = textArea.scrollHeight / numberOfLines;
    var scrollTop = (lineNumber - (textArea.offsetHeight/lineHeight/2)) * lineHeight;
    textArea.scrollTop = scrollTop;
    errorText.innerHTML = textToDisplay;
}
function checkIfLinesAreValid() {
    var errorText = document.getElementById("ErrorText");
    errorText.innerHTML = "";
    var warningText = document.getElementById("WarningText");
    warningText.innerHTML = "";
    var textArea = document.getElementById("CustomWeaponDamageCode");
    var code = textArea.value;
    var allLines = code.split("\n");

    //Get gameversion string and address for if statement
    var gameVerString = getGameVersionString();
    var gameModeAddress = JsonFile["GameModeAddress" + gameVerString]-0x80000001;

   
    //Validates all lines
    var anyValidLines = false;
    var inIfStatement = false;
    var LandmasterLine1Seen = 0;
    for (var i = 0; i < allLines.length; i++) {
        if (allLines[i] == "") continue;
        anyValidLines = true;
        //makes sure they are of valid format (8 hex characters, space, 8 hex characters)
        if (!(/^[0-9A-Fa-f]{8} [0-9A-Fa-f]{8}$/.test(allLines[i]))) {
            displayError(errorText, textArea, allLines.length, i, (18*i), (18*i) + allLines[i].length, "This line isn't in a valid format (needs 8 hex characters, a space, and 8 more hex characters).");
            return true;
        }
        //checks for all opcodes and makes sure they are valid
        var opCode = (parseInt(allLines[i].split(" ")[0], 16) & 0xFE000000) >>> 24;
        if (opCode != 0x02 && opCode != 0x28 && opCode != 0xE2 && opCode != 0x04) {
            displayError(errorText, textArea, allLines.length, i, (18*i), (18*i) + 2, "This opCode isn't valid. Only acceptable ones are 0x02, 0x04, 0x28, and 0xE2.");
            return true;
        }
        //Check format for End if (no else, ends 1 if statement, last 8 characters can be anything)
        if (opCode == 0xE2) {
            if (!inIfStatement) {
                displayError(errorText, textArea, allLines.length, i, (18*i), (18*i) + allLines[i].length, "An End if was seen outside of an if statement. Remove this line or fix formating.");
                return true;
            }
            if (allLines[i].split(" ")[0] != "E2000001") {
                displayError(errorText, textArea, allLines.length, i, (18*i), (18*i) + 8, "When doing an End if only end 1 if statement and make sure there is no else statement. Expected: 'E2000001'.");
                return true;
            }
            if (allLines[i].split(" ")[1] != "00000000") {
                displayError(errorText, textArea, allLines.length, i, (18*i) + 9, (18*i) + 17, "The last 8 characters aren't saved anywhere. Make sure they are all zeros. Expected: '00000000'.");
                return true;
            }
            inIfStatement = false;
        }
        //Check for endIf within if statement
        if (opCode == 0x28 && (parseInt(allLines[i].split(" ")[0], 16) & 0x00000001) == 1) {
            if (!inIfStatement) {
                displayError(errorText, textArea, allLines.length, i, (18*i)+7, (18*i)+8, "An End if was seen outside of an if statement. Remove the rightmost bit here or fix the formating.");
                return true;
            }
            inIfStatement = false;
        }
        //Check for If Statement
        if (opCode == 0x28) {
            if (inIfStatement) {
                displayError(errorText, textArea, allLines.length, i, (18*i), (18*i)+17, "A nested If statement was found.");
                return true;
            }
            if (allLines[i].split(" ")[1].substring(0,4) != "FF00") {
                displayError(errorText, textArea, allLines.length, i, (18*i)+9, (18*i)+13, "The mask isn't as expected. The mask is needed to 'mute' the first address in the 2 address value check. Expected: FF00");
                return true;
            }
            if (allLines[i].split(" ")[1].substring(4,6) != "00") {
                displayError(errorText, textArea, allLines.length, i, (18*i)+13, (18*i)+15, "The first address check needs to be 00 as the mask will always make it 00. Expected: 00");
                return true;
            }


            var actual = parseInt(allLines[i].split(" ")[0], 16) & 0xFFFFFFFE;
            var expected = 0x28000000 + gameModeAddress;
            if (actual != expected) {
                displayError(errorText, textArea, allLines.length, i, (18*i), (18*i)+8, "The if statement isn't for the expected address. Expected: " + expected.toString(16).toUpperCase());
                return true;
            }
            inIfStatement = true;
        }
        //Check if 16 bit write is to even address
        if (opCode == 0x02) {
            if ((parseInt(allLines[i].split(" ")[0], 16) & 0x00000001) == 1) {
                displayError(errorText, textArea, allLines.length, i, (18*i)+7, (18*i)+8, "The address isn't even. Make sure the address is even.");
                return true;
            }
        }   
        //Check if 32 bit write is to a valid HardCoded address. And makes sure the first 16bits of the instruction is correct
        if (opCode == 0x04) {
            var address = (parseInt(allLines[i].split(" ")[0], 16) & 0x01FFFFFF) + 0x80000000;
            var first16Bits = allLines[i].split(" ")[1].substring(0, 4).toUpperCase();
            var j = 0;
            var specialOne = false;
            for (; j < JsonFile.HardcodedDamage.length; j++) {
                if (JsonFile.HardcodedDamage[j]["SpecialHandling"] != null) {
                    if (address == JsonFile.HardcodedDamage[j]["Address" + gameVerString]) { LandmasterLine1Seen += 1; break; }
                    if (address == JsonFile.HardcodedDamage[j]["SpecialHandling"]["Address" + gameVerString]) { specialOne = true; LandmasterLine1Seen -= 1; break; }
                } else {
                    if (address == JsonFile.HardcodedDamage[j]["Address" + gameVerString]) break;
                }
            }
            if (j == JsonFile.HardcodedDamage.length) {
                displayError(errorText, textArea, allLines.length, i, (18*i)+2, (18*i)+8, "The address isn't any of the valid HardCoded address. Make sure you are on the right gamemode (Dropdown at top right of page).");
                return true;
            }
            var releventJSON = JsonFile.HardcodedDamage[j];
            if (specialOne) releventJSON = releventJSON["SpecialHandling"];
            if (first16Bits != releventJSON["First16BitsOfInstruction" + gameVerString].toUpperCase()) {
                displayError(errorText, textArea, allLines.length, i, (18*i)+9, (18*i)+13, "The first 16 bits of the instruction aren't as expected. Expected: " + releventJSON["First16BitsOfInstruction" + gameVerString].toString(16).toUpperCase());
                return true;
            }
        }
    }

    if (!anyValidLines) {
        errorText.innerHTML = "The input field below is empty. Paste or write a Gecko Code below.";
        return true;
    }
    if (LandmasterLine1Seen != 0) {
        warningText.innerHTML += "There aren't an even amount of lines for the Hardcoded value used on the Landmaster crashing into an enemy. This can be ignored, but it might cause problems.";
    }

    return false;
}
/**
 * Reads the code from the text area and returns a JSON object with the information in a sorted JSON object for ease of use.
 * If two address are the same the first is removed.
 * @returns {JSON, key is the gamemode, value is an array of JSON objects with Address and Damage} example:
 *      {
 *          0: [ { "Address": 0x12345678, "Damage": 100 }, { "Address": 0x1234567A, "Damage": 100 } ],
 *          20: [ { "Address": 0x62345678, "Damage": 100 }, { "Address": 0x6234567A, "Damage": 100 } ],
 *      }
 */
function readCode() {
    var textArea = document.getElementById("CustomWeaponDamageCode");
    var code = textArea.value;
    var allLines = code.split("\n");
    var toReturn = {};
    
    var Gamemode = -1;
    for (var i = 0; i < allLines.length; i++) {
        if (allLines[i] == "") continue;
        var opCode = (parseInt(allLines[i].split(" ")[0], 16) & 0xFE000000) >>> 24;
        if (opCode == 0x28) {
            Gamemode = parseInt(allLines[i].split(" ")[1], 16) & 0x000000FF;
            continue;
        }
        if (opCode == 0xE2) {
            Gamemode = -1;
            continue;
        }
        if (opCode == 0x04) { continue; }
        var address = (parseInt(allLines[i].split(" ")[0], 16) & 0x01FFFFFF);
        var damage = (parseInt(allLines[i].split(" ")[1], 16) & 0x0000FFFF);
        if (damage > 32767) damage = damage - 65535 - 1; //negative damage handling, turning it into a negative positive value
        var repeats = (parseInt(allLines[i].split(" ")[1], 16) & 0xFFFF0000) >>> 16;
        for (var j = 0; j <= repeats; j++) {
            if (toReturn[Gamemode] == null) toReturn[Gamemode] = [];
            toReturn[Gamemode].push({ "Address": address, "Damage": damage});
            address += 2;
        }
    }
    for (var key in toReturn) {
        toReturn[key].sort(function(a, b) { return a.Address - b.Address; });
        for (var i = 0; i < toReturn[key].length-1; i++) {
            if (toReturn[key][i].Address == toReturn[key][i+1].Address) {
                toReturn[key].splice(i, 1);
                i--;
            }
        }
    }
    return toReturn;
}
/**
 * Takes the JSON object from readCode() and organizes it into a more friendly format for the user to see on screen.
 * Specifically it'll decide what damage values are for what type, so Pilot, Arwing, and Landmaster damage values are grouped together when posssible.
 * Meant to ensure transforming from User info and code back to user info gives the same result. Changed extra offset values in advanced
 * mode won't be guarenteed to be restored properly since they could be anything.
 * @param {*} AllInfoFromCode = An array from a return from readCode()
 * @returns {Array of JSON objects (contain weapon ID, gamemode, damage values, extra offset value)} example:
 *     [
 *        { "ID": 0, "GameMode": 0, "Pilot": 100, "Arwing": 100, "LandMaster": 100, "Extra_Offset": 0 },
 *        { "ID": 1, "GameMode": 0, "Pilot": 100, "Arwing": 100, "LandMaster": 100, "Extra_Offset": 0 },
 *     ]
 */
function organizeCodeInfo(AllInfoFromCode) {
    var toReturn = [];

    //Get gameversion string and address for where weapon IDs start
    var gameVerString = getGameVersionString();
    var AddressStart = JsonFile["BaseAddress" + gameVerString]-0x80000000;

    for (var gameMode in AllInfoFromCode) {
        for (var i = 0; i < AllInfoFromCode[gameMode].length; i++) {
            var curInfo = AllInfoFromCode[gameMode][i];
            var curAddress = curInfo.Address;
            if (curAddress == -1) continue;

            var damageValues = [curInfo.Damage];
            var lastReleventAddress = curAddress;
            for (var j = i+1; j < AllInfoFromCode[gameMode].length; j++) {
                if (lastReleventAddress == AllInfoFromCode[gameMode][j].Address || AllInfoFromCode[gameMode][j].Address == -1) continue;
                if (AllInfoFromCode[gameMode][j].Address - lastReleventAddress > 2*(6-damageValues.length)) break;
                while (AllInfoFromCode[gameMode][j].Address - lastReleventAddress > 2) {
                    damageValues.push("");
                    lastReleventAddress += 2;
                }
                damageValues.push(AllInfoFromCode[gameMode][j].Damage);
                lastReleventAddress = AllInfoFromCode[gameMode][j].Address;
                AllInfoFromCode[gameMode][j].Address = -1;
                if (damageValues.length == 6) break;
            }

            var weaponID = Math.floor((curAddress - 14 - AddressStart) / 40);

            var shiftDamageValues = 0;
            if (weaponID % 2 == 0) {
                //there is probably like some equation I use instead of this, but this is easier to understand
                if ((curAddress & 0x0000000F) == 0xE) shiftDamageValues = 0;
                if ((curAddress & 0x0000000F) == 0x0) shiftDamageValues = 1;
                if ((curAddress & 0x0000000F) == 0x2) shiftDamageValues = 2;
                if ((curAddress & 0x0000000F) == 0x4) shiftDamageValues = 3;
                if ((curAddress & 0x0000000F) == 0x6) shiftDamageValues = 4;
                if ((curAddress & 0x0000000F) == 0x8) shiftDamageValues = 5;
            } else {
                if ((curAddress & 0x0000000F) == 0x6) shiftDamageValues = 0;
                if ((curAddress & 0x0000000F) == 0x8) shiftDamageValues = 1;
                if ((curAddress & 0x0000000F) == 0xA) shiftDamageValues = 2;
                if ((curAddress & 0x0000000F) == 0xC) shiftDamageValues = 3;
                if ((curAddress & 0x0000000F) == 0xE) shiftDamageValues = 4;
                if ((curAddress & 0x0000000F) == 0x0) shiftDamageValues = 5;
            }
            shiftDamageValues = Math.min(shiftDamageValues, 6-damageValues.length);

            var extraOffset = Math.round((Math.abs((curAddress - 14 - AddressStart) / 40) % 1) * 40) - (2*shiftDamageValues);
            if (weaponID < 0 && extraOffset != 0) extraOffset = 40 - extraOffset - (4*shiftDamageValues); //Negative ID support
            var JSONToAdd = {
                "ID": weaponID,
                "GameMode": gameMode,
                "Pilot_Direct": "",
                "Arwing_Direct": "",
                "LandMaster_Direct": "",
                "Pilot_Splash": "",
                "Arwing_Splash": "",
                "LandMaster_Splash": "",
                "Extra_Offset": extraOffset
            };
            AlldmgTypes = ["Pilot_Direct", "Arwing_Direct", "LandMaster_Direct", "Pilot_Splash", "Arwing_Splash", "LandMaster_Splash"];
            for (var j = 0; j < damageValues.length; j++) {
                JSONToAdd[AlldmgTypes[((j+shiftDamageValues) % 6)]] = damageValues[j];
            }
            toReturn.push(JSONToAdd);
        }
    }
    return toReturn;
}
/**
 * Reads the code from the text area and returns a JSON object with the information in a sorted JSON object for ease of use. Only grabs info
 * for hardcoded damage values in the game. For the Landmaster damage, it'll prevent duplicates.
 * @returns {JSON, key is the gamemode, value is an array of JSON objects with Address and Damage} example:
 *      {
 *          -1: [ { "TypeIndex": 3, "Damage": 100 }, { "TypeIndex": 4, "Damage": 100 } ],
 *          20: [ { "TypeIndex": 4, "Damage": 200 }, { "TypeIndex": 6, "Damage": 55 } ],
 *      }
 */
function readCode_hc() {
    var textArea = document.getElementById("CustomWeaponDamageCode");
    var code = textArea.value;
    var allLines = code.split("\n");
    var toReturn = {};
    var gameVerString = getGameVersionString();
    
    var Gamemode = -1;
    for (var i = 0; i < allLines.length; i++) {
        if (allLines[i] == "") continue;
        var opCode = (parseInt(allLines[i].split(" ")[0], 16) & 0xFE000000) >>> 24;
        if (opCode == 0x28) {
            Gamemode = parseInt(allLines[i].split(" ")[1], 16) & 0x000000FF;
            continue;
        }
        if (opCode == 0xE2) {
            Gamemode = -1;
            continue;
        }
        if (opCode == 0x02) { continue; }

        var address = (parseInt(allLines[i].split(" ")[0], 16) & 0x01FFFFFF) + 0x80000000;
        var index = -1;
        var damage = (parseInt(allLines[i].split(" ")[1], 16) & 0x0000FFFF);
        if (damage > 32767) damage = damage - 65535 - 1; //negative damage handling, turning it into a negative positive value
        for (var j = 0; j < JsonFile.HardcodedDamage.length; j++) {
            if (JsonFile.HardcodedDamage[j]["SpecialHandling"] != null) {
                if (address == JsonFile.HardcodedDamage[j]["SpecialHandling"]["Address" + gameVerString]) {
                    if (damage == -32768) damage = 32768;
                    index = j;
                    break;
                }
                if (address == JsonFile.HardcodedDamage[j]["Address" + gameVerString]) {
                    damage = -1 * damage;
                    index = j;
                    break;
                }
            } else {
                if (address == JsonFile.HardcodedDamage[j]["Address" + gameVerString]) { index = j; break; }
            }
        }
        
        if (toReturn[Gamemode] == null) toReturn[Gamemode] = [];
        toReturn[Gamemode].push({ "TypeIndex": index, "Damage": damage });
    }
    for (var key in toReturn) {
        toReturn[key].sort(function(a, b) { return a.TypeIndex - b.TypeIndex; });
        for (var i = 0; i < toReturn[key].length-1; i++) {
            if (toReturn[key][i].TypeIndex == toReturn[key][i+1].TypeIndex) {
                toReturn[key].splice(i, 1);
                i--;
            }
        }
    }
    return toReturn;
}
function convertCodeToInfo() {
    if (checkIfLinesAreValid()) return;
    
    var AllInfoFromCode = readCode();
    var NeededInfo = organizeCodeInfo(AllInfoFromCode);

    var AllInfo_hc = readCode_hc();

    for (var i = 0; i < NeededInfo.length; i++) {
        AddCustomCodeWeaponButton(NeededInfo[i].ID, NeededInfo[i].GameMode,
            NeededInfo[i].Pilot_Direct, NeededInfo[i].Pilot_Splash, NeededInfo[i].Arwing_Direct,
            NeededInfo[i].Arwing_Splash, NeededInfo[i].LandMaster_Direct, NeededInfo[i].LandMaster_Splash,
            NeededInfo[i].Extra_Offset);
    }
    for (var gameMode in AllInfo_hc) {
        for (var i = 0; i < AllInfo_hc[gameMode].length; i++) {
            AddCustomHardCodedButton(AllInfo_hc[gameMode][i].TypeIndex, gameMode, AllInfo_hc[gameMode][i].Damage);
        }
    }
}

/* -------------------------- Help Text for Function Locations --------------------------- */

function resetHelpText() {
    var gameVerString = getGameVersionString();

    var helpText = document.getElementById("HelpText");
    helpText.innerHTML = "Function for calculating Weapon Damage:<br>";
    helpText.innerHTML += "&emsp;Pilot: 0x" + JsonFile["FunctionStarts"+gameVerString].Pilot.toString(16).toUpperCase() + " <br>";
    helpText.innerHTML += "&emsp;Arwing/Wolfen: 0x" + JsonFile["FunctionStarts"+gameVerString].Arwing.toString(16).toUpperCase() + " <br>";
    helpText.innerHTML += "&emsp;Landmaster: 0x" + JsonFile["FunctionStarts"+gameVerString].Landmaster.toString(16).toUpperCase() + " <br>";
    helpText.innerHTML += "&emsp;Enemies: 0x" + JsonFile["FunctionStarts"+gameVerString].Enemy.toString(16).toUpperCase() + " <br>";
    helpText.innerHTML += "&emsp;??? (I don't know what's this for): 0x" + JsonFile["FunctionStarts"+gameVerString].Unknown.toString(16).toUpperCase() + " <br>";
}

/* -------------------------- Random Damage Value Logic --- making Rows --------------------------- */

var usedIds_random = [];
var numOfCodes_random = 0;
var timerForDoubleClick_random = null;
function removeAllWeaponCodes_Random() {
    for (var i = 0; i < usedIds_random.length; i++) {
        document.getElementById("RandomType_" + usedIds_random[i]).remove();
        document.getElementById("RandomGameMode_" + usedIds_random[i]).remove();
        document.getElementById("RandomIdRange_" + usedIds_random[i]).remove();
        document.getElementById("RandomDamageRange_" + usedIds_random[i]).remove();
        document.getElementById("RandomDamageTypes_" + usedIds_random[i]).remove();
        document.getElementById("RandomOther_" + usedIds_random[i]).remove();
    }
    usedIds_random = [];
    numOfCodes_random = 0;
}
function removeAllWeaponCodes_DoubleClickHandler_Random(obj) {
    obj.classList.toggle("removeAllBackgroundTransition");
    if (timerForDoubleClick_random != null) { removeAllWeaponCodes_Random(); clearTimeout(timerForDoubleClick_random); timerForDoubleClick_random = null; return;}
    timerForDoubleClick_random = setTimeout(function() {
        clearTimeout(timerForDoubleClick_random);
        timerForDoubleClick_random = null;
        obj.classList.remove("removeAllBackgroundTransition");
    }, 300);
}

function addWeaponTypeDropdown_Random() {
    var select = document.createElement("select");
    select.className = "WeaponTypeDropdown";

    var array = ["Hardcoded Values", "Weapon IDs"];
    for (var i = 0; i < array.length; i++) {
        var option = document.createElement("option");
        option.text = array[i];
        option.value = i;
        select.appendChild(option);
    }
    select.value = 1;

    var numOfCodes_random_copy = numOfCodes_random;
    select.onchange = function() {
        //Update ID ranges
        var input1 = document.getElementById("RandomIdRange_"+numOfCodes_random_copy).getElementsByTagName("input")[0];
        var input2 = document.getElementById("RandomIdRange_"+numOfCodes_random_copy).getElementsByTagName("input")[1];
        if (this.value == 0) {
            input1.min = "0";
            input1.max = JsonFile.HardcodedDamage.length-1;
            clampInputField(input1);
            input2.min = input1.value;
            input2.max = JsonFile.HardcodedDamage.length-1;
        } else {
            input1.min = "0";
            input1.max = JsonFile.WeaponIDs.length-1;
            clampInputField(input1);
            input2.min = input1.value;
            input2.max = JsonFile.WeaponIDs.length-1;
        }
        clampInputField(input2);

        //Update Transparancy on checkmarks
        var newVal = "10%";
        if (this.value == 1) newVal = "100%";

        var checkboxes = document.getElementById("RandomDamageTypes_"+numOfCodes_random_copy).getElementsByTagName("input");
        for (var i = 0; i < checkboxes.length; i++) {
            checkboxes[i].parentNode.style.opacity = newVal;
        }
        var checkbox = document.getElementById("RandomOther_"+numOfCodes_random_copy).getElementsByTagName("input")[0];
        checkbox.parentNode.style.opacity = newVal;
    }
    return select;
}
function addNumberRange_Random(forIds = true, updateMinInOther = true) {
    var input = document.createElement("input");
    input.type = "number";
    input.className = "WeaponDamage_TextInput";
    if (forIds) {
        input.min = "0";
        input.max = JsonFile.WeaponIDs.length-1;
    } else {
        input.min = "-32768";
        input.max = "32767";
    }
    input.value = 0;

    input.onchange = function() {
        clampInputField(this);
        if (updateMinInOther) {
            var otherInput = this.parentElement.getElementsByTagName("input")[1];
            otherInput.min = this.value;
            clampInputField(otherInput);
        }
    }
    return input;
}
function addSpanWithDash() {
    var span = document.createElement("span");
    span.innerHTML = " - ";
    span.style.margin = "auto 0";
    return span;
}
function addDamageTypes_Random(arrayOfDamageText, indexOfRelaventDamage) {
    var div = document.createElement("div");

    var input = document.createElement("input");
    input.type = "checkbox";
    input.id = "RandomDamageTypes_CheckMark_" + numOfCodes_random + "_" + indexOfRelaventDamage;
    input.value = indexOfRelaventDamage*2;
    div.appendChild(input);

    var label = document.createElement("label");
    label.htmlFor = input.id;
    label.innerHTML = arrayOfDamageText[indexOfRelaventDamage];
    div.appendChild(label);

    return div;
}
function AddDeleteButton_Random() {
    var button = document.createElement("button");
    button.innerHTML = "Remove";
    button.className = "DeleteWeaponCodeButton";

    var numOfCodes_copy = numOfCodes_random;
    button.onclick = function() {
        document.getElementById("RandomType_" + numOfCodes_copy).remove();
        document.getElementById("RandomGameMode_" + numOfCodes_copy).remove();
        document.getElementById("RandomIdRange_" + numOfCodes_copy).remove();
        document.getElementById("RandomDamageRange_" + numOfCodes_copy).remove();
        document.getElementById("RandomDamageTypes_" + numOfCodes_copy).remove();
        document.getElementById("RandomOther_" + numOfCodes_copy).remove();
        usedIds_random.splice(usedIds_random.indexOf(numOfCodes_copy), 1);
    }
    return button;
}

function addRandomRowButton() {
    var code = document.getElementById("RandomizeDamageContainer");

    var div = document.createElement("div");
    div.appendChild(addWeaponTypeDropdown_Random());
    div.id = "RandomType_" + numOfCodes_random;
    code.appendChild(div);

    div = document.createElement("div");
    div.appendChild(addGameModeSelector_hc("RandomGameMode_", -1, 1));
    div.appendChild(addGameModeSelector_hc_AdanvedModeInput("RandomGameMode_", -1, 1));
    div.id = "RandomGameMode_" + numOfCodes_random;
    code.appendChild(div);

    div = document.createElement("div");
    div.appendChild(addNumberRange_Random(true, true));
    div.appendChild(addSpanWithDash());
    div.appendChild(addNumberRange_Random(true, false));
    div.id = "RandomIdRange_" + numOfCodes_random;
    code.appendChild(div);

    div = document.createElement("div");
    div.appendChild(addNumberRange_Random(false, true));
    div.appendChild(addSpanWithDash());
    div.appendChild(addNumberRange_Random(false, false));
    div.id = "RandomDamageRange_" + numOfCodes_random;
    code.appendChild(div);

    div = document.createElement("div");
    var damageTypes = ["Pilot Direct", "Arwing Direct", "Landmaster Direct", "Pilot Splash", "Arwing Splash", "Landmaster Splash", "Force Direct to equal Splash damage", "Force all damage in this row to be equal"];
    for (var i = 0; i < damageTypes.length-2; i++) {
        div.appendChild(addDamageTypes_Random(damageTypes, i));
        // div.appendChild(addDamageTypes_Random(damageTypes, i+3));
    }
    div.id = "RandomDamageTypes_" + numOfCodes_random;
    div.className = "Random_DamageType";
    code.appendChild(div);

    div = document.createElement("div");
    div.appendChild(addDamageTypes_Random(damageTypes, 6));
    var temp = addDamageTypes_Random(damageTypes, 7);
    temp.style.opacity = "1";
    div.appendChild(temp);
    div.appendChild(AddDeleteButton_Random());
    div.className = "Random_OtherBox";
    div.id = "RandomOther_" + numOfCodes_random;
    code.appendChild(div);

    usedIds_random.push(numOfCodes_random);
    numOfCodes_random++;
}

/* -------------------------- Random Damage Value Logic --- Making Codes --------------------------- */

function convertRandomToCode() {
    //Get text to display error (if any)
    var errorText = document.getElementById("ErrorText2");
    errorText.innerHTML = "";
    var warningText = document.getElementById("WarningText2");
    warningText.innerHTML = "";
    if (usedIds_random.length == 0) {
        errorText.innerHTML = "No random weapon damage values to convert. Click the green 'Add Row' button above to add some.";
        return;
    }
    var placedAnything = false;

    //Get gameversion string and Address for gamemode
    var gameVerString = getGameVersionString();
    var gameModeAddress = JsonFile["GameModeAddress" + gameVerString]-0x80000001;

    //Used to Verify all Hardcoded values have a default value
    var hardCodedIDsNotForAllGamemods = new Set();
    var hardCodedIDsForAllGamemods = new Set();

    //Make JSON key the gamemode type, and value an array of all usedIDs that have that gamemode
    var usedIdsSortedByGamemode = {};
    for (var i = 0; i < usedIds_random.length; i++) {
        var gameMode = document.getElementById("RandomGameMode_" + usedIds_random[i]).getElementsByTagName("input")[0].value;
        if (usedIdsSortedByGamemode[gameMode] == null) usedIdsSortedByGamemode[gameMode] = [];
        usedIdsSortedByGamemode[gameMode].push(usedIds_random[i]);
    }

    //iterate through usedIdsSortedByGamemode and make the code
    var codeString = "";
    var inIfStatement = 0;
    for (var gamemode in usedIdsSortedByGamemode) {
        gamemode = parseInt(gamemode);
        var code = "";

        for (var i = 0; i < usedIdsSortedByGamemode[gamemode].length; i++) {
            var curID = usedIdsSortedByGamemode[gamemode][i];
            var Type = document.getElementById("RandomType_" + curID).getElementsByTagName("select")[0].value;

            var damageLowerBound = parseInt(document.getElementById("RandomDamageRange_" + curID).getElementsByTagName("input")[0].value);
            var damageUpperBound = parseInt(document.getElementById("RandomDamageRange_" + curID).getElementsByTagName("input")[1].value);

            var idLowerBound = parseInt(document.getElementById("RandomIdRange_" + curID).getElementsByTagName("input")[0].value);
            var idUpperBound = parseInt(document.getElementById("RandomIdRange_" + curID).getElementsByTagName("input")[1].value);

            var ForceDirectToEqualSplash = document.getElementById("RandomOther_" + curID).getElementsByTagName("input")[0].checked;
            var ForceAllSameDamage = document.getElementById("RandomOther_" + curID).getElementsByTagName("input")[1].checked;
            var damageForAll = 0;
            if (ForceAllSameDamage) damageForAll = Math.floor(Math.random() * (damageUpperBound-damageLowerBound+1)) + damageLowerBound

            var containerForCheckmarks = document.getElementById("RandomDamageTypes_" + curID);          
            if (Type == 1) //Weapon IDs
            {
                for (var weaponID = idLowerBound; weaponID <= idUpperBound; weaponID++) {
                    var damageValues = [];
                    for (var j = 0; j < 6; j++) {
                        if (!containerForCheckmarks.getElementsByTagName("input")[j].checked) { //check if user DOESN'T wants to randomize this value
                            damageValues.push("");
                            continue;
                        }
                        if (j > 2 && ForceDirectToEqualSplash) {
                            damageValues.push(damageValues[j-3]);
                            continue;
                        }
                        damageValues.push(ForceAllSameDamage ? damageForAll : Math.floor(Math.random() * (damageUpperBound-damageLowerBound+1)) + damageLowerBound);
                    }

                    var addressOfInterest = parseInt(JsonFile["BaseAddress" + gameVerString] + (40*weaponID) + 14 - 0x80000000);
                    code += getCodeForGameMode_Helper(addressOfInterest, damageValues, 0);
                }
            }
            else if (Type == 0) //HardCoded Damage Types
            {
                for (var HardcodedType = idLowerBound; HardcodedType <= idUpperBound; HardcodedType++) {
                    if (gamemode == -1) hardCodedIDsForAllGamemods.add(HardcodedType);
                    else hardCodedIDsNotForAllGamemods.add(HardcodedType);

                    damage = ForceAllSameDamage ? damageForAll : Math.floor(Math.random() * (damageUpperBound-damageLowerBound+1)) + damageLowerBound;
                    if (JsonFile.HardcodedDamage[HardcodedType]["SpecialHandling"] != null && damage == -32768) damage = damage * -1; //Special case for Landmaster crashing into an enemy damage. -32768 is invalid, but 32768 is valid
                    code += getCodeForHardCoded_Helper(gameVerString, HardcodedType, damage, "WarningText2");
                }
            }
        }
        if (code == "") continue;
        if (gamemode == -1) {
            if (inIfStatement) { codeString += "E2000001 00000000\n"; inIfStatement = false; }
            codeString = code + codeString;
        } else {
            codeString += (0x28000000 + gameModeAddress + inIfStatement).toString(16).toUpperCase().padStart(8, "0") + " FF0000" + gamemode.toString(16).toUpperCase().padStart(2, "0") + "\n";
            inIfStatement = 1;
            codeString += code;
        }
        placedAnything = true;
    }
    if (inIfStatement) { codeString += "E2000001 00000000\n"; inIfStatement = false; }
    codeString.replace(/\n$/, ""); //Remove last newline character
    document.getElementById("RandomWeaponDamageCode").value = codeString;

    if (!placedAnything) {
        errorText.innerHTML = "No custom weapon damage values to convert. Click the input fields below a type of damage to make some.";
    }

    //Check if there is a default value for hardcoded values
    for (var curHardCodeID of hardCodedIDsNotForAllGamemods) {
        if (!hardCodedIDsForAllGamemods.has(curHardCodeID)) {
            if (warningText.innerHTML != "") warningText.innerHTML += "<br>";
            warningText.innerHTML += "Warning: At least one hardcoded damage type isn't set for all gamemodes. While not needed, that means its damage could be inconsistent and change depending on the last played gamemode.";
            break;
        }
    }
}