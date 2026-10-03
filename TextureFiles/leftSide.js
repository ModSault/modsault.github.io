// This file contains all info to display user info on left side of screen (raw values and names)

/* ---------------- update information on front end (left size) to visualize the data in the file --------------- */

// updates everything on left side (called when adding/removing a new texture file)
function refreshAllFiles() {
  const elem = document.getElementById("Editor_Contents");
  const fragment = document.createDocumentFragment();
  document.activeElement.blur(); // prevent auto scrolling

  // helper
  const makeSummaryAndDetails = function(index) {
    const toReturn = DOM_addAny("div");

    const details = DOM_addAny("details");
    details.appendChild(DOM_addAny("summary", {
      "innerText": "... To fill in later ...",
      "onclick": function() { showTextureInfoLeftPanel(index); }
    }));
    toReturn.appendChild(details);

    const SVGContainer = DOM_addAny("div", { "className": "FileQuickOptions" });
    SVGContainer.innerHTML = arrowDownwardSVG + arrowDownwardSVG + eyeVisibleSVG + eyeInvisibleSVG + downloadSVG + XSVG;
    const allSVGs = SVGContainer.getElementsByTagName("svg");
    allSVGs[0].classList.add("rotate180");
    allSVGs[0].onclick = function() { // move up button
      const l1 = date_getReEncodeListOnChange(index);
      const l2 = date_getReEncodeListOnChange(index-1);

      [g_AllTextureData[index], g_AllTextureData[index-1]] = [g_AllTextureData[index-1], g_AllTextureData[index]];
      [g_allFileProcessedInformation[index+1], g_allFileProcessedInformation[index-1+1]] = [g_allFileProcessedInformation[index-1+1], g_allFileProcessedInformation[index+1]];
      refreshAllFiles();

      const l3 = date_getReEncodeListOnChange(index);
      const l4 = date_getReEncodeListOnChange(index-1);
      const merged = [...new Set([...l1, ...l2, ...l3, ...l4])].sort((x, y) => x - y);

      data_recalculateAllInIndex(index, false, merged);
    }
    allSVGs[1].onclick = function() { // move down button
      const l1 = date_getReEncodeListOnChange(index);
      const l2 = date_getReEncodeListOnChange(index-1);

      [g_AllTextureData[index], g_AllTextureData[index+1]] = [g_AllTextureData[index+1], g_AllTextureData[index]];
      [g_allFileProcessedInformation[index+1], g_allFileProcessedInformation[index+1+1]] = [g_allFileProcessedInformation[index+1+1], g_allFileProcessedInformation[index+1]];
      refreshAllFiles();

      const l3 = date_getReEncodeListOnChange(index);
      const l4 = date_getReEncodeListOnChange(index+1);
      const merged = [...new Set([...l1, ...l2, ...l3, ...l4])].sort((x, y) => x - y);

      data_recalculateAllInIndex(index, false, merged);
    }
    allSVGs[2].onclick = function() { changeCurrentTexture(-1); } // hide button
    allSVGs[3].onclick = function() { changeCurrentTexture(index); } // show button
    allSVGs[4].onclick = async function() { // download button
      alert(g_copyrightAlertMessage);

      const zip = new JSZip();
      for (let j = 0; j < g_AllTextureData[index].pixels.length; j++) {
        const blob = await getBlobForFileMipMap(index, j);
        const fileName = sanitizeFilename(g_AllTextureData[index].name + `_${j}.png`);
        zip.file(fileName, blob);
      }
      zip.file("credit.txt", g_JSZipCreditMessage);

      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = getFileName(".zip");
      a.click();
      URL.revokeObjectURL(url);
    }
    allSVGs[5].onclick = function() { // delete button
      const response = confirm(`Delete '[${index}; ${data_getIDPretty(index)}] ${g_AllTextureData[index].name}' that is ${g_AllTextureData[index].width}x${g_AllTextureData[index].height} pixels`);
      if (!response) { return; }

      const l1 = date_getReEncodeListOnChange(index);

      g_AllTextureData.splice(index, 1);
      g_allFileProcessedInformation.splice(index+1, 1);
      Assault_Encode_updateFileHeader();
      refreshAllFiles();

      const l2 = date_getReEncodeListOnChange(index);
      const merged = [...new Set([...l1, ...l2])].sort((x, y) => x - y);
      data_recalculateAllInIndex(index, false, merged);
    }
    // hide arrows if first/last file
    if (index == 0) allSVGs[0].style.display = "none";
    if (index == g_AllTextureData.length - 1) allSVGs[1].style.display = "none";
    toReturn.appendChild(SVGContainer);

    return toReturn;
  }

  for (let i = 0; i < g_AllTextureData.length; i++) {
    fragment.appendChild(makeSummaryAndDetails(i));
  }
  
  // add all elements to screen and ensure everything on screen is up to date
  elem.replaceChildren(fragment);
  focusOnElement(lastFocusedPath); // refocus on last focused element incase it was deleted and readded

  // select no texture for display
  changeCurrentTexture(-1);

  // update name of summary tag
  for (let i = 0; i < g_AllTextureData.length; i++) {
    refreshFileHeaderInfo(i);
  }

  // show "download all individually" button only if at least two textures exist
  const showButton = g_AllTextureData.length > 1;
  document.querySelector("#Editor_BottomBar > span > button:nth-child(2)").style.display = showButton ? "" : "none";
}

// Called when expanding info on a texture (allows for creating less elements if its never opened)
function showTextureInfoLeftPanel(index) {
  const details = document.getElementById("Editor_Contents").getElementsByTagName("details")[index];
  const needToDelete = details.open;

  // deletes everything if closing
  if (needToDelete) {
    for (let i = 0; i < details.children.length; i++) {
      const child = details.children[i];
      if (child.tagName.toLowerCase() !== "summary") {
        details.removeChild(child);
        i--;
      }
    }
    return;
  }

  // otherwise add everything
  const frag = document.createDocumentFragment();
  frag.appendChild(DOM_addAny("h4", {
    "innerText": "File Header Data"
  }));
  frag.appendChild(DOM_addAny("div", {
    "className": "fileHeaderTable"
  }));
  frag.appendChild(DOM_addAny("h4", {
    "innerText": "Pixels"
  }));

  const pixelToShow_text = DOM_addAny("div", {
    "className": "flexRow pixelInfoContainer_text"
  });
  pixelToShow_text.appendChild(document.createTextNode("Mipmap Number To Show (1-): "));
  pixelToShow_text.appendChild(DOM_addAny("input", {
    "step": 1,
    "type": "number",
    "name": "Texture_Num_Selector",
    "onchange": function() { refreshFilePixelInfo(index); },
    "value": 0
  }));
  frag.appendChild(pixelToShow_text);

  const pixelToShow_pixel = DOM_addAny("div", {
    "className": "flexRow pixelInfoContainer_pixel"
  });
  pixelToShow_pixel.appendChild(document.createTextNode("Mipmap Pixel IDs To Show (0-): "));
  pixelToShow_pixel.appendChild(DOM_addAny("input", {
    "step": 1,
    "type": "number",
    "name": "Texture_Pixel_Selector_Low",
    "onchange": function() { refreshFilePixelInfo(index); },
    "value": 0
  }));
  pixelToShow_pixel.appendChild(document.createTextNode(" - "));
  pixelToShow_pixel.appendChild(DOM_addAny("input", {
    "step": 1,
    "type": "number",
    "name": "Texture_Pixel_Selector_High",
    "onchange": function() { refreshFilePixelInfo(index, false); },
    "value": 0
  }));
  frag.appendChild(pixelToShow_pixel);

  frag.appendChild(DOM_addAny("div", {
    "className": "PixelsTable"
  }));

  frag.appendChild(DOM_addAny("input", {
    "type": "file",
    "id": `inputPNGButton_${index}`,
    "name": `inputPNGButton_${index}`,
    "accept": ".png",
    "hidden": true
  }));
  frag.appendChild(DOM_addAny("button", {
    "className": "uploadPNGButton",
    "innerText": "Replace all Pixels with uploaded PNG",
    "onclick": function() { document.getElementById(`inputPNGButton_${index}`).click(); }
  }));

  // ---------------------------- Color information --------------------------------
  frag.appendChild(DOM_addAny("h4", {
    "innerText": "Colors",
    "className": "AdvancedOnly"
  }));
  frag.appendChild(DOM_addAny("p", {
    "innerText": "I had trouble with the logos and thought it was because I wasn't preserving all colors (even those that aren't used). " +
    "Well thats fake news. However to allow for seeing all colors in the file easily I decided to keep this feature even if these aren't used for anything. " +
    "So here are all the colors within this file that were found and if they were used or not.",
    "className": "AdvancedOnly"
  }));
  frag.appendChild(DOM_addAny("br"));
  frag.appendChild(DOM_addAny("p", {
    "className": "ColorsInfoText AdvancedOnly",
    "innerText": "No info to show."
  }));

  const colorPaletteToShow = DOM_addAny("div", {
    "className": "flexRow colorPaletteInfoContainer AdvancedOnly"
  });
  const numberOfColors = g_AllTextureData[index].colors.length;
  if (numberOfColors == 0)
    colorPaletteToShow.appendChild(document.createTextNode(`Palette Number to show (N/A): `));
  else
    colorPaletteToShow.appendChild(document.createTextNode(`Palette Number to show (1-${numberOfColors}): `));
  colorPaletteToShow.appendChild(DOM_addAny("input", {
    "step": 1,
    "type": "number",
    "name": "Texture_ColorPalette_Selector",
    "onchange": function() { refreshFileColorInfo(index); },
    "value": 1
  }));
  frag.appendChild(colorPaletteToShow);


  const colorToShow = DOM_addAny("div", {
    "className": "flexRow colorInfoContainer AdvancedOnly"
  });
  colorToShow.appendChild(document.createTextNode("Color Index to show (0-): "));
  colorToShow.appendChild(DOM_addAny("input", {
    "step": 1,
    "type": "number",
    "name": "Texture_Color_Selector_Low",
    "onchange": function() { refreshFileColorInfo(index); },
    "value": 0
  }));
  colorToShow.appendChild(document.createTextNode(" - "));
  colorToShow.appendChild(DOM_addAny("input", {
    "step": 1,
    "type": "number",
    "name": "Texture_Color_Selector_High",
    "onchange": function() { refreshFileColorInfo(index, false); },
    "value": 0
  }));
  frag.appendChild(colorToShow);

  frag.appendChild(DOM_addAny("div", {
    "className": "ColorsTable AdvancedOnly"
  }));

  details.appendChild(frag);

  // have these function show more specific data
  refreshFileHeaderInfo(index);
  refreshFilePixelInfo(index);
  refreshFileColorInfo(index);
}

// update name of texture, and info like width and compression type
function refreshFileHeaderInfo(index) {
  const curData = g_AllTextureData[index];
  const details = document.getElementById("Editor_Contents").getElementsByTagName("details")[index];
  details.getElementsByTagName("summary")[0].innerText = `[${index}; ${data_getIDPretty(index)}] ${curData.name} (${curData.pixels.length} - ${curData.width}x${curData.height})`;
  details.getElementsByTagName("summary")[0].style.marginLeft = (data_hasColorData(index) && curData.colorOnly) ? "30px" : "";
  const tableNeeded = details.getElementsByClassName("fileHeaderTable")[0];
  if (tableNeeded == null) return; // not there
  const frag = document.createDocumentFragment();
  document.activeElement.blur(); // prevent auto scrolling

  const tableHeaders = ["id", "Compression/Encoding", "Width", "Height", data_hasColorData(index) ? "Number of Palettes" : "Number of Mipmaps", "Color Type", "Save Only Colors?"];
  for (let i = 0; i < tableHeaders.length; i++) {
    if (!(data_hasColorData(index)) && i >= 5) continue; // these compressions don't support color modes or being color only. Only hide certain table rows if so
    frag.appendChild(DOM_addAny("p", { "innerText": tableHeaders[i] }));

    const toAdd = DOM_addAny("div");
    if (i == 0) { // id
      toAdd.appendChild(document.createTextNode("This is a value used to find the texture within a binary tree data structure setup by the game during runtime. The first 4 characters should be '1000' otherwise the game may be unable to find the texture."));
      toAdd.appendChild(document.createElement("br"));
      toAdd.appendChild(document.createElement("br"));
      toAdd.appendChild(document.createTextNode("id in hex:"));
      toAdd.appendChild(DOM_addAny("input", {
        "value": curData.id.toString(16).toUpperCase().padStart(8, "0"),
        "name": "Texture_ID",
        "onchange": function(e) { data_setTextureID(index, event.target.value); data_recalculateAllInIndex(index); }
      }));
    }
    if (i == 1) { // compression/encoding
      toAdd.appendChild(document.createTextNode("This is the way the image is compressed. They have a different range of colors they can show and memory sizes. The parenthesis shows the number of bytes per pixel. If there is a second number that means the colors are saved separately and the bytes per color is shown. If you don't know what that means just leave it as is assuming you loaded a game file. This is also called a Texture Layer for some reason."));
      toAdd.appendChild(document.createElement("br"));
      toAdd.appendChild(document.createElement("br"));
      
      const select = DOM_addAny("select", {
        "name": "Texture_Compression_Select",
        "onchange": function(e) { data_setTextureLayer(index, event.target.value); data_recalculateAllInIndex(index, true); }
      });
      for (const curCompression of allCompressionTypesNames) {
        select.appendChild(DOM_addAny("option", {
          "value": curCompression.val,
          "innerText": curCompression.name
        }));
      }
      select.value = curData.TextureLayer;
      toAdd.appendChild(select);

      toAdd.appendChild(DOM_addAny("br", { "className": "AdvancedOnly" }));
      toAdd.appendChild(DOM_addAny("span", { "innerText": "Raw value:", "className": "AdvancedOnly" }));
      toAdd.appendChild(DOM_addAny("input", {
        "value": curData.TextureLayer,
        "type": "number",
        "className": "AdvancedOnly",
        "step": "1",
        "name": "Texture_Compression_Value",
        "onchange": function(e) { data_setTextureLayer(index, event.target.value); data_recalculateAllInIndex(index, true); }
      }));

      toAdd.appendChild(DOM_addAny("br"));
      switch (curData.TextureLayer) {
        case 1:
          toAdd.appendChild(document.createTextNode("Each pixel has its own color. 32 possible red values, 64 possible green values, and 32 possible blue values. No transparency support."));
          toAdd.appendChild(DOM_addAny("span", { "innerText": " (Written as 4 in game)", "className": "AdvancedOnly" }));
          break;
        case 2:
          toAdd.appendChild(document.createTextNode("Each pixel has its own color. If the mode is 1, then there are 32 values for red, green, and blue. If the mode bit is 0, then there are 16 values for red, green, and blue and 8 values for alpha. The tool automatically picks what is best."));
          toAdd.appendChild(DOM_addAny("span", { "innerText": " (Written as 5 in game)", "className": "AdvancedOnly" }));
          break;
        case 3:
          toAdd.appendChild(document.createTextNode("Each pixel has its own color. The red, blue, green, and alpha channels all have 256 values. This takes the most space but is guaranteed to not change the image."));
          toAdd.appendChild(DOM_addAny("span", { "innerText": " (Written as 6 in game)", "className": "AdvancedOnly" }));
          break;
        case 4:
          toAdd.appendChild(document.createTextNode("Every 16 pixels in a 4x4 grid shares 2 colors. The colors should be roughly the same in the area as the 2 colors are mixed in 5 different ways to create multiple colors in a small area. This takes up the least space on the disk."));
          toAdd.appendChild(DOM_addAny("span", { "innerText": " (Written as 14 in game)", "className": "AdvancedOnly" }));
          break;
        case 5:
          toAdd.appendChild(document.createTextNode("The entire image has a total of 16 colors and the pixels just point to an index of an array of the colors. The formatting of the colors can change with the color type."));
          toAdd.appendChild(DOM_addAny("span", { "innerText": " (Written as 8 in game)", "className": "AdvancedOnly" }));
          break;
        case 6:
          toAdd.appendChild(document.createTextNode("The entire image has a total of 256 colors and the pixels just point to an index of an array of the colors. The formatting of the colors can change with the color type."));
          toAdd.appendChild(DOM_addAny("span", { "innerText": " (Written as 9 in game)", "className": "AdvancedOnly" }));
          break;
        case 7:
          toAdd.appendChild(document.createTextNode("(Unused in game) The entire image has a total of 65536 colors and the pixels just point to an index of an array of the colors. The formatting of the colors can change with the color type."));
          toAdd.appendChild(DOM_addAny("span", { "innerText": " (Written as 10 in game)", "className": "AdvancedOnly" }));
          break;
        case 10:
          toAdd.appendChild(document.createTextNode("Each pixel is one 0-255 value. The red, green, blue, and alpha channel are all set to that value. Recommended for images of a single color."));
          toAdd.appendChild(DOM_addAny("span", { "innerText": " (Written as 1 in game)", "className": "AdvancedOnly" }));
          break;
        case 11:
          toAdd.appendChild(document.createTextNode("Each pixel has 2 0-255 values. One of them is set to all the red, green, and blue channels. The other is set to the alpha channel."));
          toAdd.appendChild(DOM_addAny("span", { "innerText": " (Written as 3 in game)", "className": "AdvancedOnly" }));
          break;
        case 12:
          toAdd.appendChild(document.createTextNode("(Unused in game) It seems identical to another compression type and as of writing this thats all I can say."));
          toAdd.appendChild(DOM_addAny("span", { "innerText": " (Written as 14 in game)", "className": "AdvancedOnly" }));
          break;
        default:
          toAdd.appendChild(document.createTextNode("(Unused in game) You set this yourself I see. Can't help you on how it works but it should literally be nothing then."));
          break;
      }
    }
    if (i == 2) { // width
      const { w, h } = getGridSizes(curData.TextureLayer);
      toAdd.appendChild(document.createTextNode(`Due to the compression algorithm selected this must be divisible by ${w}`));
      toAdd.appendChild(DOM_addAny("br"));
      toAdd.appendChild(DOM_addAny("input", {
        "value": curData.width,
        "type": "number",
        "step": w,
        "name": "Texture_Width",
        "onchange": function(e) { data_setWidth(index, event.target.value); data_recalculateAllInIndex(index); }
      }));
    }
    if (i == 3) { // height
      const { w, h } = getGridSizes(curData.TextureLayer);
      toAdd.appendChild(document.createTextNode(`Due to the compression algorithm selected this must be divisible by ${h}`));
      toAdd.appendChild(DOM_addAny("br"));
      toAdd.appendChild(DOM_addAny("input", {
        "value": curData.height,
        "type": "number",
        "step": h,
        "name": "Texture_Height",
        "onchange": function(e) { data_setHeight(index, event.target.value); data_recalculateAllInIndex(index); }
      }));
    }
    if (i == 4) { // mip maps
      const lowerMipMap = data_getMipMapMaxCount(index);

      if (data_hasColorData(index)) {
        toAdd.appendChild(document.createTextNode(`The game has different colored versions of the same texture. They have separate color data but the same pixel data. I recommend increasing this value if you want multiple of a similar looking texture that only differ by color.`));
      } else {
        toAdd.appendChild(document.createTextNode(`The game has smaller versions of terrain textures for performance reasons. Each one is half the size of the previous one This lets you select the amount you want. Value range: 1-${lowerMipMap}.`));
      }
      toAdd.appendChild(DOM_addAny("br"));
      toAdd.appendChild(DOM_addAny("input", {
        "value": curData.pixels.length,
        "type": "number",
        "step": "1",
        "name": "Texture_Count",
        "onchange": function(e) { data_setNumberTextures(index, event.target.value); data_recalculateAllInIndex(index); }
      }));
    }
    if (i == 5) { // color type
      toAdd.appendChild(document.createTextNode(`3 Compression types have their colors and pixels separate. Because of this we can change how the colors are read by the game. Each color takes 2 bytes of space no matter what.`));
      toAdd.appendChild(document.createElement("br"));
      toAdd.appendChild(document.createElement("br"));

      const select = DOM_addAny("select", {
        "name": "Texture_Compression_Select",
        "onchange": function(e) { data_setColorType(index, event.target.value); data_recalculateAllInIndex(index); },
        "name": "Texture_Layer"
      });
      for (const curCompression of allColorTypes) {
        select.appendChild(DOM_addAny("option", {
          "value": curCompression.val,
          "innerText": curCompression.name,
        }));
      }
      select.value = curData.colorType;
      toAdd.appendChild(select);

      toAdd.appendChild(DOM_addAny("br", { "className": "AdvancedOnly" }));
      toAdd.appendChild(DOM_addAny("span", { "innerText": "Raw value:", "className": "AdvancedOnly" }));
      toAdd.appendChild(DOM_addAny("input", {
        "value": curData.colorType,
        "type": "number",
        "className": "AdvancedOnly",
        "step": "1",
        "name": "Texture_Color_Type",
        "onchange": function(e) { data_setColorType(index, event.target.value); data_recalculateAllInIndex(index); }
      }));

      toAdd.appendChild(DOM_addAny("br"));
      switch (curData.colorType) {
        case 0:
        case 3:
        case 11:
          toAdd.appendChild(document.createTextNode("One 0-255 value is set to all the red, green, and blue channels. The other 0-255 value is set to the alpha channel."));
          break;
        case 1:
          toAdd.appendChild(document.createTextNode("32 possible red value, 64 possible green values, and 32 possible blue values. No transparency support."));
          break;
        case 2:
          toAdd.appendChild(document.createTextNode("Each pixel has its own color. If the mode is 1, then there are 32 values for red, green, and blue. If the mode bit is 0, then there are 16 values for red, green, and blue and 8 values for alpha. The tool automatically picks what is best."));
          break;
        default:
          toAdd.appendChild(document.createTextNode("(Unused in game) You set this yourself I see. Can't help you on how it works but it should loop around and be one of the options in the dropdown you avoided."));
          break;
      }
    }
    if (i == 6) { // color only
      toAdd.appendChild(document.createTextNode(`Exclusive to Vs mode player character textures, the recolors only save the color information and not the pixel information. I recommend never using this outside of that case as you can just add more palettes to the same texture instead, but if you do it'll look for the first 'X total colors' texture compression above it and base itself of that texture.`));
      toAdd.appendChild(DOM_addAny("br"));
      toAdd.appendChild(DOM_addAny("br"));
      toAdd.appendChild(DOM_addAny("input", {
        "checked": curData.colorOnly,
        "type": "checkbox",
        "id": `Texture_isColorOnly_${index}`,
        "name": "Texture_isColorOnly",
        "onchange": function(e) { data_setIsColorOnly(index, event.target.checked); data_recalculateAllInIndex(index); }
      }));
      toAdd.appendChild(DOM_addAny("label", {
        "innerText": "Only Save Color Information",
        "htmlFor": `Texture_isColorOnly_${index}`
      }));
    }
    frag.appendChild(toAdd);
  }

  tableNeeded.replaceChildren(frag);
  focusOnElement(lastFocusedPath);
}


// show user info on pixels within the image. fixHigh means user updated the lower end of the pixels they want to see
function refreshFilePixelInfo(index, fixHigh = true) {
  const details = document.getElementById("Editor_Contents").getElementsByTagName("details")[index];
  const userSelected_Textures = details.getElementsByClassName("pixelInfoContainer_text")[0];
  const userSelected_Pixels = details.getElementsByClassName("pixelInfoContainer_pixel")[0];
  const uploadPNGButtonInput = document.getElementById(`inputPNGButton_${index}`);
  const uploadPNGButton = details.getElementsByClassName("uploadPNGButton")[0];
  const tableNeeded = details.getElementsByClassName("PixelsTable")[0];
  if (tableNeeded == null) return; // not there
  const frag = document.createDocumentFragment();
  document.activeElement.blur(); // prevent auto scrolling

  // change text for number of textures possible
  const maxNumberTexture = g_AllTextureData[index].pixels.length;
  userSelected_Textures.firstChild.textContent = `Texture Mipmap To Show (1-${maxNumberTexture}): `;
  const text_user = userSelected_Textures.getElementsByTagName('input')[0].value;
  const text_cur = Math.max(1, Math.min(maxNumberTexture, text_user));
  userSelected_Textures.getElementsByTagName('input')[0].value = text_cur;

  // change text for number of pixels possible
  const maxNumberPixels = g_AllTextureData[index].pixels[text_cur-1].length - 1;
  userSelected_Pixels.firstChild.textContent = `Texture Pixel IDs To Show (0-${Math.max(0, maxNumberPixels)}): `;
  const pixel_low_user = userSelected_Pixels.getElementsByTagName('input')[0].value;
  const pixel_high_user = userSelected_Pixels.getElementsByTagName('input')[1].value;
  let pixel_low_cur = Math.max(0, Math.min(maxNumberPixels, pixel_low_user));
  let pixel_high_cur = Math.max(0, Math.min(maxNumberPixels, pixel_high_user));
  if (fixHigh && pixel_high_cur < pixel_low_cur)                  pixel_high_cur = pixel_low_cur;
  if (fixHigh && Math.abs(pixel_high_cur - pixel_low_cur) > 50)   pixel_high_cur = pixel_low_cur + 50;
  if (!fixHigh && pixel_high_cur < pixel_low_cur)                 pixel_low_cur = pixel_high_cur;
  if (!fixHigh && Math.abs(pixel_high_cur - pixel_low_cur) > 50)  pixel_low_cur = pixel_high_cur - 50;
  userSelected_Pixels.getElementsByTagName('input')[0].value = pixel_low_cur;
  userSelected_Pixels.getElementsByTagName('input')[1].value = pixel_high_cur;

  // show pixels the user wanted. Hide table if image is 0x0
  uploadPNGButton.style.display = "none";
  if (maxNumberPixels != -1) {
    uploadPNGButton.style.display = "";
    uploadPNGButtonInput.onchange = function(event) { replacePixelsWithPNG(index, text_cur-1, event.target.files[0]); };
    const tableTopRow = ["id (grid)", "r (0-255)", "g (0-255)", "b (0-255)", "a (0-255)"];
    for (const elem of tableTopRow) {
      frag.appendChild(DOM_addAny("p", { "innerText": elem }));
    }

    const width = data_hasColorData(index) ? g_AllTextureData[index].width : g_AllTextureData[index].width >> (text_cur-1);
    for (let i = pixel_low_cur; i <= pixel_high_cur; i++) {
      const makeContainerWithInput = function(colorUser, colorCompressed, colorType) {
        const toReturn = DOM_addAny("div");

        toReturn.appendChild(DOM_addAny("input", {
          "value": colorUser,
          "type": "number",
          "step": "1",
          "name": "Texture_Color_"+colorType,
          "onchange": function(event) { data_setPixel(index, text_cur-1, i, colorType, event.target.value); data_recalculateAllInIndex(index); }
        }));
        toReturn.appendChild(DOM_addAny("br"));
        toReturn.appendChild(document.createTextNode(`Compressed: ${colorCompressed}`));

        return toReturn;
      }
      const curPixel = g_AllTextureData[index].pixels[text_cur-1][i];
      const compressedPixels = g_allFileProcessedInformation[index+1].compressedImage[text_cur-1];

      frag.appendChild(DOM_addAny("p", {
        "innerText": `${i}
        (${pixelIDtoGrid(width, g_AllTextureData[index].TextureLayer, i)})`
      }));
      frag.appendChild(makeContainerWithInput(curPixel.r, compressedPixels[i*4+0], "r"));
      frag.appendChild(makeContainerWithInput(curPixel.g, compressedPixels[i*4+1], "g"));
      frag.appendChild(makeContainerWithInput(curPixel.b, compressedPixels[i*4+2], "b"));
      frag.appendChild(makeContainerWithInput(curPixel.a, compressedPixels[i*4+3], "a"));
    }
  }

  tableNeeded.replaceChildren(frag);
  focusOnElement(lastFocusedPath);
}

// Show info on colors found within the texture file
function refreshFileColorInfo(index, fixHigh = true) {
  const curData = g_AllTextureData[index];

  const details = document.getElementById("Editor_Contents").getElementsByTagName("details")[index];
  const tableNeeded = details.getElementsByClassName("ColorsTable")[0];
  if (tableNeeded == null) return; // not there

  const colorPaletteElem = details.getElementsByClassName("colorPaletteInfoContainer")[0].getElementsByTagName('input')[0];
  const currentPaletteIndex = Math.min(curData.colors.length, Math.max(1, colorPaletteElem.value));
  colorPaletteElem.value = currentPaletteIndex;

  // update info on total amount of colors used and not used
  let currentSize = 0;
  if (curData.colors[currentPaletteIndex-1] != undefined) {
    const colorsInfoText = details.getElementsByClassName("ColorsInfoText")[0];
    currentSize = curData.colors[currentPaletteIndex-1].length;
    const { amtUsed, amtNotUsed } = data_getUsedAndNot(index, currentPaletteIndex-1);
    colorsInfoText.innerText = `Current Number of Colors per Palette: ${currentSize}
    Used count (current Palette): ${amtUsed}
    Not used count (current Palette): ${amtNotUsed}`;
  }

  // show valid color index to view
  const colorInfoContainer = details.getElementsByClassName("colorInfoContainer")[0];
  if (currentSize > 0)
    colorInfoContainer.firstChild.textContent = `Color id to show (0-${currentSize-1}): `;
  else
    colorInfoContainer.firstChild.textContent = `Color id to show (N/A): `;
  
  // update input fields to be valid numbers
  let color_low_user = colorInfoContainer.getElementsByTagName('input')[0].value;
  let color_high_user = colorInfoContainer.getElementsByTagName('input')[1].value;
  color_low_user = Math.max(0, Math.min(currentSize-1, color_low_user));
  color_high_user = Math.max(0, Math.min(currentSize-1, color_high_user));
  if (fixHigh && color_high_user < color_low_user)                  color_high_user = color_low_user;
  if (fixHigh && Math.abs(color_high_user - color_low_user) > 25)   color_high_user = color_low_user + 25;
  if (!fixHigh && color_high_user < color_low_user)                 color_low_user = color_high_user;
  if (!fixHigh && Math.abs(color_high_user - color_low_user) > 25)  color_low_user = color_high_user - 25;
  colorInfoContainer.getElementsByTagName('input')[0].value = color_low_user;
  colorInfoContainer.getElementsByTagName('input')[1].value = color_high_user;

  // show colors to the user
  const frag = document.createDocumentFragment();
  if (currentSize == 0) {
    tableNeeded.replaceChildren(frag);
    return;
  }

  const topRow = ["id", "r (0-255)", "g (0-255)", "b (0-255)", "a (0-255)", "Is Used?"]
  for (const innerText of topRow) {
    frag.appendChild(DOM_addAny("p", { innerText }));
  }

  for (let i = color_low_user; i <= color_high_user; i++) {
    const curColor = curData.colors[currentPaletteIndex-1][i];

    // id
    frag.appendChild(DOM_addAny("p", { "innerText": `${i}` }));

    // colors
    const makeInput = function(type) {
      const divContainer = DOM_addAny("div");
      divContainer.appendChild(document.createTextNode(`${curColor[type]}`));
      return divContainer;
    }
    frag.appendChild(makeInput("r"));
    frag.appendChild(makeInput("g"));
    frag.appendChild(makeInput("b"));
    frag.appendChild(makeInput("a"));

    // used text
    const makeUsedText = function(used) {
      const divContainer = DOM_addAny("div");
      divContainer.appendChild(document.createTextNode(used ? "yes" : "no"));
      divContainer.style.background = used ? "var(--green-button-inverse)" : "var(--red-button-inverse)";
      return divContainer;
    }
    frag.appendChild(makeUsedText(curColor.used));
  }
  tableNeeded.replaceChildren(frag);
}