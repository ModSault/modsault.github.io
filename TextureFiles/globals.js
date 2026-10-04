// This file is for global variables and document listeners


// I want to believe I've gotten better at making these tools over time. Then I slowly need to accommodate for more and the spaghetti starts to form.
/*
This is the massive data structure that has literally everything for each texture. So size, id, colors, etc.
This global variable is pretty much used everywhere.

This is an example of its data with fake numbers
[
  {
    "name": "texture 1",          // just used on file downloads and displaying it to the user
    "width": 256,
    "height": 256,
    "colorOnly": false,           // Used normally for player textures only. This just means that this texture file has no pixel data
    "colorType": 2,               // How the colors are encoded (only needed for compression types called `X total colors`)
    "TextureLayer": 6,            // This is the compression type. The name came from an error Dolphin gave this one time
    "id": 0x10004234,             // The ID used so that the game can store and find this specific texture from using a binary tree. Highly recommended to be a unique value.
    "pixels": [                   // This contains all uncompressed pixels. This is an array of an array. First array is the mipmap/palette number. The second is just the pixels and their color
      [
        {
          "r": 3,
          "g": 5,
          "b": 5,
          "a": 1
        },
        ... other pixel's color in this mip map
      ],
      ... other mip maps
    ],
    "colors": [                   // Color data can be separate in some files. This isn't used anywhere aside from just showing it to the user. This is only here for those who want the information from the file 
      {
        "r": 3,
        "g": 5,
        "b": 5,
        "a": 1,
        "replaceable": true
      },
      ... other colors
    ]
  },
  ... other texture files
]
*/
var g_AllTextureData = []

/*
The first index (index 0) is always the file header information. All other indices match the above data structure. So index 1 in this is the same as index 0 in the above one.


A variable to have all info after processing the texture data from the above variable. So what will be downloaded, and information to show the user in Advanced mode, etc.
Example data
[
  {
    "downloadSegment": new ArrayBuffer(), // contains info in the file when its downloaded
    "downloadSegmentColors": new Uint8Array(), // for the bottom of the screen this contains what color it should appear as
    "descriptions": { "10": "size of file" }, // for the bottom of the screen this contains what the description is for each offset
    "warnings": [ "can't do that" ], // all warnings found when processing the file
    "errors": [ "I can't let you do that Star Fox" ], // all errors found when processing the file
    "compressedImage": [new Uint8Array(0), ...] // contains the actual compressed image so it can be shown to the user to see the differences. Uncompressed rgba 0-255 each
    "offsetToStartOfPixels": 0, // for quality of life. Points to pixel data
    "offsetToStartOfColors": 0, // for quality of life. Points to color data
    "fileSize": 0 // for quality of life. does as it says
    "indexToColor": [[ {0: {r: 0, g: 0, b: 0, a: 0 }} ], ...] // My solution to external palettes. Just save all the information in this. It contains arrays of arrays. First array is which file id it belongs to. So index 0 is for this file, 1 is for the next, etc. Then its just a std::map with ids and their color
    "biggestPalette_size":                                    // My solution to external palettes. Save number of colors here
  }
]
*/
var g_allFileProcessedInformation = [];

var g_fileNum = 0; // used for getting correct filename on an export. Values > 78 are logo files.
var g_wasFileChanged = false; // used for popup to prevent closing browser
var g_JSON_filenames = null; // used to determine what filenames are for what. Loaded on page load

// these are used in the image display to know what to render
var g_currentTextureToShow = -1;
var g_currentTextureMipMap = 0;
var g_currentPixel = 0;
var g_mouseOverPixel = -1;

// resize canvas for image
var g_resizeTimeout = setTimeout(() => {}, 10);
var g_isResizing = false;

// timer for changing textures by holding click
var textureChangeTimer = null;
function stopTextureTimer() {
  clearInterval(textureChangeTimer);
  textureChangeTimer = null;
}
function useTextureTimer(func) {
  stopTextureTimer();
  func();
  textureChangeTimer = setInterval(func, 1000 / (document.getElementById("TextureScrollCountInput").value));
}

// constants
const g_copyrightAlertMessage = "THIS IS STILL COPYRIGHTED MATERIAL!!! DO NOT DISTRIBUTE!!";
const g_JSZipCreditMessage = "Thanks to JSZip for making zipping possible.\nhttps://github.com/Stuk/jszip\nhttps://stuk.github.io/jszip/";

// This is all compression types, their value in the file, and what they are. (Also called TextureLayer in some places)
const allCompressionTypesNames = [
  {
    "val": 1,
    "name": "(2 -) RGB 565"
  },
  {
    "val": 2,
    "name": "(2 -) RGBA and Mode Shifter"
  },
  {
    "val": 3,
    "name": "(4 -) Uncompressed"
  },
  {
    "val": 4,
    "name": "(0.5 -) Blend 2 Colors per 16 Pixels"
  },
  {
    "val": 5,
    "name": "(0.5 2) 16 total colors"
  },
  {
    "val": 6,
    "name": "(1 2) 256 total colors"
  },
  {
    "val": 7,
    "name": "(2 2) 65536 total colors"
  },
  {
    "val": 10,
    "name": "(1 -) Transparent to White Scale"
  },
  {
    "val": 11,
    "name": "(2 -) Brightness and Transparent Options"
  },
  {
    "val": 12,
    "name": "(0.5 -) Same as Blend 2 Colors per 16 Pixels???"
  }
]

// These are all the color types with their value in the file along with what they are. Only really needed for `X total colors` compression types.
const allColorTypes = [
  {
    "val": 0,
    "name": "RGB 0-255 and A 0-255"
  },
  {
    "val": 1,
    "name": "R 0-31, G 0-63, B 0-31, A = 255"
  },
  {
    "val": 2,
    "name": "Support for both RGBA and only RGB per pixel"
  },
  {
    "val": 3,
    "name": "Same as RGB 0-255 and A 0-255 ???"
  },
  {
    "val": 11,
    "name": "Same as RGB 0-255 and A 0-255, again???"
  }
]

/* --------------- Run on Page Load and Close ---------- */

// wait for full html load
window.addEventListener("load", function() {
  Assault_EncodeAll();
  refreshAllFiles();
  updateFileNum(-1); // set export file as template file (tex_pack_xx.nut)
  gameVersionUpdater();
  data_recalculateAllInIndex(-1); // refreshes a lot for me
  g_wasFileChanged = false;

  const container = document.getElementById("flexRowForFilePreview");
  const resizeObserver = new ResizeObserver(entries => {
    for (const entry of entries) {
      resizeImageCanvas();
      break;
    }
  });
  resizeObserver.observe(container);
  resizeImageCanvas();

  fetch('../Documentation/Filenames.json')
  .then(response => response.json())
  .then(data => {
    g_JSON_filenames = data;
    gameVersionUpdater();
  })
  .catch(error => {
    alert(`Failed to load file for filenames. Filenames and what they are will not be presented to you. I recommend a page refresh to fix it. Error: ${error}`);
  });
});
window.addEventListener("beforeunload", (event) => {
  // prevent closing when you changed something
  if (g_wasFileChanged) {
    event.preventDefault();
    event.returnValue = "";
  }
});

// used for keyboard navigation of textures
const keyMap = {
  KeyW: "ChangeToNextTextureButton",     ArrowUp: "ChangeToNextTextureButton",
  KeyS: "ChangeToPreviousTextureButton", ArrowDown: "ChangeToPreviousTextureButton",
  KeyA: "ChangeToPreviousImageButton",   ArrowLeft: "ChangeToPreviousImageButton",
  KeyD: "ChangeToNextImageButton",       ArrowRight: "ChangeToNextImageButton",
};
const fire = (code) => document.getElementById(keyMap[code]).parentElement.onpointerdown();
const isTyping = (t) => t.matches("input, textarea, select") || t.isContentEditable;

window.addEventListener("keydown", (e) => {
  if (e.repeat || !(e.code in keyMap) || isTyping(e.target)) return;
  fire(e.code, "onpointerdown");
});

window.addEventListener("keyup", (e) => {
  if (!(e.code in keyMap)) return;
  stopTextureTimer();
});

window.addEventListener("blur", () => {
  stopTextureTimer();
});