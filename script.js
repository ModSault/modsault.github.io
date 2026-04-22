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

// fetch blocks all but those that I want (so usually loading JSON files for data and information)
const originalFetch = window.fetch;
window.fetch = function(url, options) {
  if (url[0] == '/' || /^(blob:|data:|\/\/|https?:\/\/)/i.test(url.toString())) {
    return Promise.reject(new Error(`Promise blocked: ${url}`));
  }
  return originalFetch(url, options);
};

// claude written filename sanitizer
const sanitizeFilename = (name) => name
  .replaceAll(/[<>:"/\\|?*\x00-\x1F]/g, '')  // Remove illegal chars
  .replaceAll(/[\s.]+$/g, '')                  // Strip trailing spaces/dots
  .trim()                                       // Strip leading/trailing whitespace
  || 'download';                                // Fallback if name is empty

// got ASCII art from Claude. Made this cause I am not looking at security of my tools that much
function printWarningToConsole() {
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