var advancedMode = false;
var toolTipTimer = null;
var tooltipDiv = null;
var GameVersion = 0; // 0 = USA, 1 = Japan, 2 = PAL
var allGameModeSelectors = [];
var lastFocusedPath = "html"; // used to put focus on right element if it was removed and re-added

// SVG icons I may need (all from https://fonts.google.com/icons)
const eyeInvisibleSVG = '<svg xmlns="http://www.w3.org/2000/svg" height="30px" viewBox="0 -960 960 960" width="30px" fill="var(--font-color)"><path d="m644-428-58-58q9-47-27-88t-93-32l-58-58q17-8 34.5-12t37.5-4q75 0 127.5 52.5T660-500q0 20-4 37.5T644-428Zm128 126-58-56q38-29 67.5-63.5T832-500q-50-101-143.5-160.5T480-720q-29 0-57 4t-55 12l-62-62q41-17 84-25.5t90-8.5q151 0 269 83.5T920-500q-23 59-60.5 109.5T772-302Zm20 246L624-222q-35 11-70.5 16.5T480-200q-151 0-269-83.5T40-500q21-53 53-98.5t73-81.5L56-792l56-56 736 736-56 56ZM222-624q-29 26-53 57t-41 67q50 101 143.5 160.5T480-280q20 0 39-2.5t39-5.5l-36-38q-11 3-21 4.5t-21 1.5q-75 0-127.5-52.5T300-500q0-11 1.5-21t4.5-21l-84-82Zm319 93Zm-151 75Z"/></svg>'
const eyeVisibleSVG = '<svg xmlns="http://www.w3.org/2000/svg" height="30px" viewBox="0 -960 960 960" width="30px" fill="var(--font-color)"><path d="M607.5-372.5Q660-425 660-500t-52.5-127.5Q555-680 480-680t-127.5 52.5Q300-575 300-500t52.5 127.5Q405-320 480-320t127.5-52.5Zm-204-51Q372-455 372-500t31.5-76.5Q435-608 480-608t76.5 31.5Q588-545 588-500t-31.5 76.5Q525-392 480-392t-76.5-31.5ZM214-281.5Q94-363 40-500q54-137 174-218.5T480-800q146 0 266 81.5T920-500q-54 137-174 218.5T480-200q-146 0-266-81.5ZM480-500Zm207.5 160.5Q782-399 832-500q-50-101-144.5-160.5T480-720q-113 0-207.5 59.5T128-500q50 101 144.5 160.5T480-280q113 0 207.5-59.5Z"/></svg>'
const downloadSVG = '<svg xmlns="http://www.w3.org/2000/svg" height="30px" viewBox="0 -960 960 960" width="30px" fill="var(--font-color)"><path d="M480-320 280-520l56-58 104 104v-326h80v326l104-104 56 58-200 200ZM240-160q-33 0-56.5-23.5T160-240v-120h80v120h480v-120h80v120q0 33-23.5 56.5T720-160H240Z"/></svg>'
const uploadSVG = '<svg xmlns="http://www.w3.org/2000/svg" height="80px" viewBox="0 -960 960 960" width="80px" fill="var(--font-color)"><path d="M450-313v-371L330-564l-43-43 193-193 193 193-43 43-120-120v371h-60ZM220-160q-24 0-42-18t-18-42v-143h60v143h520v-143h60v143q0 24-18 42t-42 18H220Z"/></svg>'
const arrowDownwardSVG = '<svg xmlns="http://www.w3.org/2000/svg" height="30px" viewBox="0 -960 960 960" width="30px" fill="var(--font-color)"><path d="M440-800v487L216-537l-56 57 320 320 320-320-56-57-224 224v-487h-80Z"/></svg>'
const XSVG = '<svg xmlns="http://www.w3.org/2000/svg" height="30px" viewBox="0 -960 960 960" width="30px" fill="var(--red-button)"><path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"/></svg>';

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
    for (let i = 0; i < allGameModeSelectors.length; i++) {
        allGameModeSelectors[i].value = GameVersion;
    }
}

// ---------------------------- Advanced Mode --------------------------

function toggleAdvanced() {
    const button = document.getElementById("AdvancedModeButton");
    let text = button.childNodes[1];
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
    // Redirect all network calls (for security to block requests outside the github site)
    makeServiceWorkers(pathToRoot);

    // JSON with Navbar contents. Makes it easier to update
    const AllElements = [
        {
            "text": "Home",
            "link": pathToRoot + "/"
        },
        {
            "text": "Filenames",
            "link": pathToRoot + "/Filenames/"
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
        },
        {
            "text": "Game File Parsers \u25BC",
            "link": null,
            "dropdownElements": [
                {
                    "text": "VsMode Spawns (_vs_Axx.bin)",
                    "link": pathToRoot + "/VSModeSpawns/"
                },
                {
                    "text": "Collision Files (hit_pack_xx.pac)",
                    "link": pathToRoot + "/CollisionFiles/"
                },
                {
                    "text": "VsMode Intro Camera Files (ts_cammotxxy.bin)",
                    "link": pathToRoot + "/VSModeIntro/"
                },
                {
                    "text": "Level Boundary Files (ts_mapdataxx.bin)",
                    "link": pathToRoot + "/LevelBoundaryFiles/"
                }
            ]
        },
        {
            "text": "External Resources \u25BC",
            "link": null,
            "dropdownElements": [
                {
                    "text": "All Assault Voice lines",
                    "link": "https://starfox.org/games/star-fox-assault/audio/voice-acting/"
                },
                {
                    "text": "Speedrun page",
                    "link": "https://www.speedrun.com/sfassault"
                },
                {
                    "text": "High Score Runs",
                    "link": "https://cyberscore.me.uk/games/282"
                },
                {
                    "text": "Gecko/AR Codes for Assault",
                    "link": "https://gamehacking.org/game/54239"
                },
                {
                    "text": "The Cutting Room Floor",
                    "link": "https://tcrf.net/Star_Fox:_Assault"
                },
                {
                    "text": "Models Resource",
                    "link": "https://models.spriters-resource.com/gamecube/starfoxassault/"
                },
                {
                    "text": "Sounds Resource",
                    "link": "https://sounds.spriters-resource.com/gamecube/starfoxassault/"
                }
            ]
        }
    ]

    // <div id="NavBar">
    const navBar = document.createElement("div");
    navBar.id = "NavBar";

    for (let i = 0; i < AllElements.length; i++) {
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
    const topLevel = document.createElement("select");
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
    for (let i = 0; i < all_values.length; i++) {
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
function makeHeader(title, funcToCall = null, makeGameModeSelector = true, makeAdvancedModeButton = true) {
    // <div class = "flexContainer">
    const topLevel = document.createElement("div");
    topLevel.classList.add("flexContainer");

    // -<h1 id = "Title"> title </h1>
    const header = document.createElement("h1");
    header.id = "Title";
    header.textContent = title;
    topLevel.appendChild(header);

    // -<div id="TopRightOfScreen">
    const topRightDiv = document.createElement("div");
    topRightDiv.id = "TopRightOfScreen";
    topLevel.appendChild(topRightDiv);

    if (makeGameModeSelector) {
        // --<script>makeGameModeSelector(funcToCall);</script>
        const gameModeSelector = document.createElement("script");
        gameModeSelector.textContent = "makeGameModeSelector("+funcToCall+");";
        topRightDiv.appendChild(gameModeSelector);
    }

    if (makeAdvancedModeButton) {
        // --<button id = "AdvancedModeButton" onmouseover = "hoverToolTipStart(this);" onmouseleave = "hoverToolTipEnd();" onclick = "toggleAdvanced();" style = "background-color: var(--red-button);"></button>
        const advancedModeButton = document.createElement("button");
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
        const advancedModeText_1 = document.createElement("span");
        advancedModeText_1.textContent = "Advanced Mode";
        advancedModeButton.appendChild(advancedModeText_1);

        // ---<span>(currently on/off)</span>
        const advancedModeText_2 = document.createElement("span");
        advancedModeText_2.textContent = "(currently " + (advancedMode ? "on" : "off") + ")";
        advancedModeButton.appendChild(advancedModeText_2);
    }

    // add header to page
    let scriptTag = document.currentScript;
    scriptTag.parentNode.replaceChild(topLevel, scriptTag);
}

// --------------- All in one DOM creation -----------------

function DOM_addAny(domtype, jsonExtras) {
    let toReturn = document.createElement(domtype);
    for (const key in jsonExtras) {
        toReturn[key] = jsonExtras[key];
    }
    return toReturn;
}

// ---------------- If I remove and add elements (like what I usually do) these can be used to refocus on the right element ------------ */

// thanks Claude for both
function getFocusedElementPath() {
    let el = document.activeElement;
    const path = [];
    while (el && el.nodeType === Node.ELEMENT_NODE) {
        let selector = el.tagName.toLowerCase();
        if (el.id) {
            selector += `#${el.id}`;
        } else {
            const index = [...el.parentNode.children].indexOf(el) + 1;
            selector += `:nth-child(${index})`;
            if (el.className) selector += `.${[...el.classList].join(".")}`;
        }
        path.unshift(selector);
        el = el.parentNode;
    }
    return path.join(" > ");
}
function focusOnElement(selector) {
  const el = document.querySelector(selector);
  if (el) el.focus({ preventScroll: true });
}

// ---------------------------- Update last focused element with listener  --------------------------

document.addEventListener("focusin", (e) => {
    lastFocusedPath = getFocusedElementPath();
});

// --------------- Security related things ------------------

// all network calls go through a service worker to block those from outside the github site
async function makeServiceWorkers(pathToRoot) {
    if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.register(pathToRoot + '/sw.js');
        
        // If there's a new SW waiting, activate it immediately
        if (reg.waiting) {
            reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        }

        // Wait until SW is active and controlling the page
        await navigator.serviceWorker.ready;

        // If page isn't already controlled, reload so SW takes over
        if (!navigator.serviceWorker.controller) {
            window.location.reload();
        }

        navigator.serviceWorker.register = function() { return Promise.reject(new Error('serviceWorker disabled')); };
    }
}

// Block anything and everything network related that I don't use (thanks Claude)
function removeNetworkFeatures() {
    navigator.sendBeacon = () => false;
    window.WebSocket = function() { throw new Error('WebSocket disabled'); };
    window.EventSource = function() { throw new Error('EventSource disabled'); };
    window.RTCPeerConnection = function() { throw new Error('WebRTC disabled'); };
    window.SharedWorker = function() { throw new Error('SharedWorker disabled'); };
    window.RTCPeerConnection = function() { throw new Error('RTCPeerConnection disabled'); };
    window.RTCDataChannel = function() { throw new Error('RTCDataChannel disabled'); };
    window.Worker = function() { throw new Error('Worker disabled'); };
    window.SharedWorker = function() { throw new Error('SharedWorker disabled'); };
    window.BroadcastChannel = function() { throw new Error('BroadcastChannel disabled'); };
    window.XMLHttpRequest.prototype.open = function(method, url, ...rest) { throw new Error('XMLHttpRequest disabled'); };

    // fetch blocks all requests outside of the current url origin
    const originalFetch = window.fetch;
    window.fetch = function(url, options) {
        if (url[0] == '/' || /^(blob:|data:|\/\/|https?:\/\/)/i.test(url.toString())) {
            return Promise.reject(new Error(`Promise blocked: ${url}`));
        }
        return originalFetch(url, options);
    };
}

// claude written filename sanitizer
const sanitizeFilename = (name) => name
  .replaceAll(/[<>:"/\\|?*\x00-\x1F]/g, '')  // Remove illegal chars
  .replaceAll(/[\s.]+$/g, '')                  // Strip trailing spaces/dots
  .trim()                                       // Strip leading/trailing whitespace
  || 'download';                                // Fallback if name is empty

// claude written localhost tester
const isLocalhost = 
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1" ||
  window.location.hostname === "[::1]" || // IPv6 localhost
  window.location.hostname === "";        // sometimes empty for file:// URLs

// got ASCII art from Claude. Made this cause I am not looking at security of my tools that much
function printWarningToConsole() {
    if (isLocalhost) return; // hide in localhost cause its big and annoying

    const warning = `
██╗    ██╗ █████╗ ██████╗ ███╗   ██╗██╗███╗   ██╗ ██████╗ ██╗
██║    ██║██╔══██╗██╔══██╗████╗  ██║██║████╗  ██║██╔════╝ ██║
██║ █╗ ██║███████║██████╔╝██╔██╗ ██║██║██╔██╗ ██║██║  ███╗██║
██║███╗██║██╔══██║██╔══██╗██║╚██╗██║██║██║╚██╗██║██║   ██║╚═╝
╚███╔███╔╝██║  ██║██║  ██║██║ ╚████║██║██║ ╚████║╚██████╔╝██╗
 ╚══╝╚══╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝╚═╝╚═╝  ╚═══╝ ╚═════╝ ╚═╝`
    console.log(warning, "\nBE AWARE OF WHAT YOU COPY AND PASTE IF YOU GOT IT FROM SOMEONE ELSE. SECURITY PROBLEMS CAN OCCUR!!!")
}
printWarningToConsole();
removeNetworkFeatures();