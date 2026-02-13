var advancedMode = false;
var toolTipTimer = null;
var tooltipDiv = null;
var GameVersion = 0; // 0 = USA, 1 = Japan, 2 = PAL
var allGameModeSelectors = [];

// ---------------------------- Load Information from Local Storage  --------------------------

function loadInfo() {
    // set initial values if first load onto site
    if (localStorage.getItem("GameMode") == null) { localStorage.setItem("GameMode", 0); }
    if (localStorage.getItem("AdvancedMode") == null) { localStorage.setItem("AdvancedMode", 'false'); }

    // Game Version
    GameVersion = Math.max(0, Math.min(localStorage.getItem("GameMode"), 2));
    if (isNaN(GameVersion) || (typeof GameVersion) != "number") {
        localStorage.setItem("GameMode", 0);
        GameVersion = 0;
    }
    
    // Advanced Mode
    advancedMode = localStorage.getItem("AdvancedMode").toLowerCase() === 'true';
    localStorage.setItem("AdvancedMode", advancedMode);
}
loadInfo();

// ---------------------------- General Changing Game Versions --------------------------

function changeGameVersion(object) {
    GameVersion = object.value;
    localStorage.setItem("GameMode", object.value);

    // update all game mode selectors to the new value
    for (i = 0; i < allGameModeSelectors.length; i++) {
        allGameModeSelectors[i].value = GameVersion;
    }
}

// ---------------------------- Advanced Mode --------------------------

function toggleAdvanced() {
    button = document.getElementById("AdvancedModeButton");
    text = button.childNodes[1];
    if (advancedMode === true) {
        button.style.backgroundColor = "var(--red-button)";
        text.textContent = "(currently off)";
    } else {
        button.style.backgroundColor = "var(--green-button)";
        text.textContent = "(currently on)";
    }
    advancedMode = !advancedMode
    localStorage.setItem("AdvancedMode", advancedMode);
    document.getElementById("AdvancedModeCheckMark").checked = advancedMode;
}

// ---------------------------- That one tooltip logic  --------------------------

function hoverToolTipStart(object) {
    if (tooltipDiv != null) { tooltipDiv.remove(); }
    tooltipDiv = document.createElement('div');
    tooltipDiv.classList.add('tooltip');
    tooltipDiv.style.left = (object.getBoundingClientRect().left - 25) + 'px';
    tooltipDiv.style.top = object.offsetHeight + object.offsetTop + 'px';
    document.body.appendChild(tooltipDiv);

    //need fade class after element is added to page. Best method I could get (.then didn't work)
    toolTipTimer = setTimeout(function () {
        tooltipDiv.classList.add('fade');
    }, 300);
}
function hoverToolTipEnd() {
    clearTimeout(toolTipTimer);
    if (tooltipDiv != null) {
        tooltipDiv.classList.remove('fade');
        tooltipDiv.remove();
    }
}

// ----------------------------- Making Content between pages consistent -------------------------

function makeNavBar(pathToRoot) {
    // JSON with Navbar contents. Makes it easier to update
    let AllElements = [
        {
            "text": "Home",
            "link": pathToRoot + "/"
        },
        {
            "text": "ID Documentation \u25BC",
            "link": null,
            "dropdownElements": [
                {
                    "text": "Projectile IDs",
                    "link": pathToRoot + "/ProjectileID/Legacy/"
                }
            ]
        }
    ]

    // <div id="NavBar">
    let navBar = document.createElement("div");
    navBar.id = "NavBar";

    for (i = 0; i < AllElements.length; i++) {
        if (AllElements[i]["link"] != null) { // for non-dropdown links
            // <a href="./">Text</a>
            let curLink = document.createElement("a");
            curLink.href = AllElements[i]["link"];
            curLink.text = AllElements[i]["text"];
            navBar.appendChild(curLink);
        } else {
            /*<div class="NavBar_dropdown">
                <p> Section Header </p>
                <div>
                    <a href="#">Link to Page</a>
                    ...
                </div>
              </div>*/
            let curDiv = document.createElement("div");
            curDiv.classList.add("NavBar_dropdown");
            let curHeader = document.createElement("p");
            curHeader.textContent = AllElements[i]["text"];
            curDiv.appendChild(curHeader);
            let divContainer = document.createElement("div");
            for (j = 0; j < AllElements[i]["dropdownElements"].length; j++) {
                let curLink = document.createElement("a");
                curLink.href = AllElements[i]["dropdownElements"][j]["link"];
                curLink.text = AllElements[i]["dropdownElements"][j]["text"];
                divContainer.appendChild(curLink);
            }
            curDiv.appendChild(divContainer);
            navBar.appendChild(curDiv);
        }
    }

    // add navbar to page
    let scriptTag = document.currentScript;
    scriptTag.parentNode.replaceChild(navBar, scriptTag);
}


function makeGameModeSelector(funcToCall) {
    // <select name="GameVersion" id="GameVersionSelector" onChange="changeGameVersion(this); funcToCall();">
    let topLevel = document.createElement("select");
    topLevel.name = "GameVersion";
    topLevel.className = "GameVersionSelector";
    if (funcToCall != null) {
        topLevel.onchange = function () { changeGameVersion(this); funcToCall(); };
    } else {
        topLevel.onchange = function () { changeGameVersion(this); };
    }

    // -<option value=all_values[i]> all_text[i] </option>
    let all_values = [0, 1, 2];
    let all_text = ["NTSC-U (USA)", "NTSC-J (Japan)", "PAL (Europe)"];
    for (i = 0; i < all_values.length; i++) {
        let curOption = document.createElement("option");
        curOption.value = all_values[i];
        curOption.textContent = all_text[i];
        topLevel.appendChild(curOption);
    }

    topLevel.value = GameVersion; // set the default value to the current game version
    allGameModeSelectors.push(topLevel); // add to list of all game mode selectors for updating all later

    // add game mode selector to page
    let scriptTag = document.currentScript;
    scriptTag.parentNode.replaceChild(topLevel, scriptTag);
}
function makeHeader(title, funcToCall = null) {
    // <div class = "flexContainer">
    let topLevel = document.createElement("div");
    topLevel.classList.add("flexContainer");

    // -<h1 id = "Title"> title </h1>
    let header = document.createElement("h1");
    header.id = "Title";
    header.textContent = title;
    topLevel.appendChild(header);

    // -<div id="TopRightOfScreen">
    let topRightDiv = document.createElement("div");
    topRightDiv.id = "TopRightOfScreen";
    topLevel.appendChild(topRightDiv);

    // --<script>makeGameModeSelector(funcToCall);</script>
    let gameModeSelector = document.createElement("script");
    gameModeSelector.textContent = "makeGameModeSelector("+funcToCall+");";
    topRightDiv.appendChild(gameModeSelector);

    // --<button id = "AdvancedModeButton" onmouseover = "hoverToolTipStart(this);" onmouseleave = "hoverToolTipEnd();" onclick = "toggleAdvanced();" style = "background-color: var(--red-button);"></button>
    let advancedModeButton = document.createElement("button");
    advancedModeButton.id = "AdvancedModeButton";
    advancedModeButton.onmouseover = function () { hoverToolTipStart(this); };
    advancedModeButton.onmouseleave = function () { hoverToolTipEnd(); };
    advancedModeButton.onclick = function () { toggleAdvanced(); };
    if (advancedMode === true) {
        advancedModeButton.style.backgroundColor = "var(--green-button)";
        document.getElementById("AdvancedModeCheckMark").checked = advancedMode;
    } else {
        advancedModeButton.style.backgroundColor = "var(--red-button)";
    }
    topRightDiv.appendChild(advancedModeButton);

    // ---<span>Advanced Mode</span>
    let advancedModeText_1 = document.createElement("span");
    advancedModeText_1.textContent = "Advanced Mode";
    advancedModeButton.appendChild(advancedModeText_1);

    // ---<span>(currently on/off)</span>
    let advancedModeText_2 = document.createElement("span");
    advancedModeText_2.textContent = "(currently " + (advancedMode ? "on" : "off") + ")";
    advancedModeButton.appendChild(advancedModeText_2);

    // add header to page
    let scriptTag = document.currentScript;
    scriptTag.parentNode.replaceChild(topLevel, scriptTag);
}