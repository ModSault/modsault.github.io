// This file contains all function used to update the right half of the screen (texture preview)

/* ---------------- update information on front end (right side) to visualize the data in the file --------------- */

// updates the giant text at the top saying what texture you're looking at
function updateRightHalfFileName() {
  if (g_currentTextureToShow == -1) {
    document.getElementById("CurrentFileOnDisplayH2").innerText = "No File Selected";
    document.getElementById("flexRowForFilePreview").style.display = "none";
  } else {
    document.getElementById("CurrentFileOnDisplayH2").innerText = `[${g_currentTextureToShow}; ${data_getIDPretty(g_currentTextureToShow)}] ${g_AllTextureData[g_currentTextureToShow].name}`;
    document.getElementById("flexRowForFilePreview").style.display = "";
  }
}

// If user wants to view another texture file, this changes it
function changeCurrentTexture(newTexture) {
  g_currentTextureToShow = Math.min(g_AllTextureData.length, Math.max(-1, newTexture));
  changeCurrentMipMap(0, false);
  changeCurrentPixelID(0, false);

  // change eye icons on all files
  const allDivs = document.querySelectorAll("#Editor_Contents > div");
  for (let i = 0; i < allDivs.length; i++) {
    const allSVGs = allDivs[i].getElementsByClassName("FileQuickOptions")[0].getElementsByTagName("button");
    allSVGs[2].style.display = "none";
    allSVGs[3].style.display = "none";
    if (g_AllTextureData[i].numPixels != 0) {
      if (i == newTexture) {
        allSVGs[2].style.display = "";
      } else {
        allSVGs[3].style.display = "";
      }
    }
  }

  // hide arrows if you can't increment by 1 or -1
  const prevTexture = document.getElementById("ChangeToPreviousImageButton").parentElement;
  const nextTexture = document.getElementById("ChangeToNextImageButton").parentElement;
  prevTexture.style.display = "";
  nextTexture.style.display = "";
  if (g_currentTextureToShow == 0) {
    prevTexture.style.display = "none";
  }
  if (g_currentTextureToShow == g_AllTextureData.length - 1) {
    nextTexture.style.display = "none";
  }

  // change display on right half of screen
  if (newTexture == -1) {
    document.getElementById("CurrentFileOnDisplayH2").innerText = "No File Selected";
    document.getElementById("flexRowForFilePreview").style.display = "none";
  } else {
    document.getElementById("CurrentFileOnDisplayH2").innerText = `[${newTexture}; ${data_getIDPretty(newTexture)}] ${g_AllTextureData[newTexture].name}`;
    document.getElementById("flexRowForFilePreview").style.display = "";
  }

  updateAllInfoInRightFilePreview();
}

// If user wants to view another mipmap / palette within their current texture file, this changes it
function changeCurrentMipMap(newMipMap, refreshAll = true, viewWholeImage = true) {
  if (g_currentTextureToShow == -1) return;
  const curData = g_AllTextureData[g_currentTextureToShow];
  const highestPossibleValue = curData.pixels.length - 1;
  g_currentTextureMipMap = Math.min(highestPossibleValue, Math.max(0, newMipMap));
  changeCurrentPixelID(g_currentPixel, false); // ensure current pixel is valid

  // hide arrows if you can't increment by 1 or -1
  const prevMipMap = document.getElementById("ChangeToPreviousTextureButton").parentElement;
  const nextMipMap = document.getElementById("ChangeToNextTextureButton").parentElement;
  prevMipMap.style.display = "";
  nextMipMap.style.display = "";
  if (g_currentTextureMipMap == 0) {
    prevMipMap.style.display = "none";
  }
  if (g_currentTextureMipMap == highestPossibleValue) {
    nextMipMap.style.display = "none";
  }

  // change text of text above image previews (mainly to show resolution and Texture/Mip map texture)
  const containerForH3 = document.getElementById("flexRowForBothCanvas");
  const H3_1 = containerForH3.getElementsByClassName("flexColumn")[0].getElementsByTagName("h3")[0];
  const H3_2 = containerForH3.getElementsByClassName("flexColumn")[1].getElementsByTagName("h3")[0];
  const totalNum = curData.pixels.length;
  if (!data_hasColorData(g_currentTextureToShow)) {
    const ImageResolutionText = (["Full", "Half", `1/${Math.pow(2, g_currentTextureMipMap)}`])[Math.min(2, g_currentTextureMipMap)];
    const width = curData.width >> g_currentTextureMipMap;
    const height = curData.height >> g_currentTextureMipMap;
    H3_1.innerText = `The User's Mipmap ${g_currentTextureMipMap+1} of ${totalNum} (${ImageResolutionText} Res, ${width}x${height})`;
    H3_2.innerText = `Compressed Mipmap ${g_currentTextureMipMap+1} of ${totalNum} (${ImageResolutionText} Res, ${width}x${height})`;
  } else {
    const width = curData.width;
    const height = curData.height;
    H3_1.innerText = `The User's Palette ${g_currentTextureMipMap+1} of ${totalNum} (Full Res, ${width}x${height})`;
    H3_2.innerText = `Compressed Palette ${g_currentTextureMipMap+1} of ${totalNum} (Full Res, ${width}x${height})`;
  }


  // show updated info
  if (viewWholeImage)
    changeImageGridToView(-1, false);
  if (refreshAll) {
    updateAllInfoInRightFilePreview();
    resizeImageCanvas(0);
  }
}

// if user clicks on a pixel this changes that and shows its colors to the user
function changeCurrentPixelID(newPixelID, refreshAll = true) {
  if (g_currentTextureToShow == -1) return;
  const curData = g_AllTextureData[g_currentTextureToShow];
  const highestPossibleValue = curData.pixels[g_currentTextureMipMap].length - 1;
  g_currentPixel = Math.max(0, Math.min(highestPossibleValue, newPixelID));

  // show updated info
  if (refreshAll) {
    updateAllInfoInRightFilePreview();
  }
}

// update all texture info (width, id, etc).
function updateAllInfoInRightFilePreview() {
  const curData = g_AllTextureData[g_currentTextureToShow];
  if (curData == undefined) return;
  
  // ensure mipmap value and pixel value to make sure it is accurate
  changeCurrentMipMap(g_currentTextureMipMap, false, false);
  changeCurrentPixelID(g_currentPixel, false);

  // grid above image previews
  const { w, h } = getGridSizes(curData.TextureLayer);
  document.getElementById("ImageDisplay_ID").value = curData.id.toString(16).toUpperCase().padStart(8, "0");
  document.getElementById("ImageDisplay_Width").value = curData.width;
  document.getElementById("ImageDisplay_Width").step = w;
  document.getElementById("ImageDisplay_Height").value = curData.height;
  document.getElementById("ImageDisplay_Height").step = h;
  document.getElementById("ImageDisplay_NumTextures").value = curData.pixels.length;
  document.getElementById("ImageDisplay_NumTextures_p").innerText = data_hasColorData(g_currentTextureToShow) ? "# of Palettes:" : "# of Mipmaps:"
  document.getElementById("ImageDisplay_CompressionType").value = curData.TextureLayer;
  document.getElementById("ImageDisplay_CompressionType2").value = curData.TextureLayer;
  document.getElementById("ImageDisplay_ColorType").value = curData.colorType;
  document.getElementById("ImageDisplay_ColorType2").value = curData.colorType;
  document.getElementById("ImageDisplay_ColorOnly").checked = curData.colorOnly;

  // hide certain compression if they aren't needed for selected algorithm
  document.getElementById("ImageDisplay_ColorType").parentElement.style.display = "";
  document.getElementById("ImageDisplay_ColorOnly").parentElement.style.display = "";
  if (!data_hasColorData(g_currentTextureToShow)) {
    document.getElementById("ImageDisplay_ColorType").parentElement.style.display = "none";
    document.getElementById("ImageDisplay_ColorOnly").parentElement.style.display = "none";
  }

  // ensure the name shown to the user to correct (mainly on ID change)
  updateRightHalfFileName();

  // grid below image previews
  updatePixelInfoRightFilePreview(g_currentPixel);

  // redraw image if it changed
  resizeImageCanvas(0);
}
// Show `pixelID` rgba colors to user. Used when mouse is over canvas and when a user selects a pixel
function updatePixelInfoRightFilePreview(pixelID) {
  const curData = g_AllTextureData[g_currentTextureToShow];
  const curPixel = curData.pixels[g_currentTextureMipMap][pixelID];
  const compressedPixels = g_allFileProcessedInformation[g_currentTextureToShow+1].compressedImage[g_currentTextureMipMap];
  const neededGrid1 = document.getElementById("PixelPreviewGrid1");
  const neededGrid2 = document.getElementById("PixelPreviewGrid2");
  const currentGrid = pixelIDtoGrid(curData.width >> (!data_hasColorData(g_currentTextureToShow) * g_currentTextureMipMap), curData.TextureLayer, pixelID);
  neededGrid1.getElementsByTagName("p")[5].innerText = `${pixelID} (${currentGrid})`;
  neededGrid1.getElementsByTagName("div")[0].getElementsByTagName("input")[0].value = curPixel == undefined ? 'N/A' : Math.round(curPixel.r);
  neededGrid1.getElementsByTagName("div")[1].getElementsByTagName("input")[0].value = curPixel == undefined ? 'N/A' : Math.round(curPixel.g);
  neededGrid1.getElementsByTagName("div")[2].getElementsByTagName("input")[0].value = curPixel == undefined ? 'N/A' : Math.round(curPixel.b);
  neededGrid1.getElementsByTagName("div")[3].getElementsByTagName("input")[0].value = curPixel == undefined ? 'N/A' : Math.round(curPixel.a);
  neededGrid2.getElementsByTagName("p")[5].innerText = `${pixelID} (${currentGrid})`;
  neededGrid2.getElementsByTagName("p")[6].innerText = curPixel == undefined ? 'N/A' : compressedPixels[pixelID*4+0];
  neededGrid2.getElementsByTagName("p")[7].innerText = curPixel == undefined ? 'N/A' : compressedPixels[pixelID*4+1];
  neededGrid2.getElementsByTagName("p")[8].innerText = curPixel == undefined ? 'N/A' : compressedPixels[pixelID*4+2];
  neededGrid2.getElementsByTagName("p")[9].innerText = curPixel == undefined ? 'N/A' : compressedPixels[pixelID*4+3];

  // on change handlers
  const onChangeSetPixelHandler = function(type, value) {
    data_setPixel(g_currentTextureToShow, g_currentTextureMipMap, pixelID, type, value);
    data_recalculateAllInIndex(g_currentTextureToShow);
  }
  if (curPixel == undefined) {
    neededGrid1.getElementsByTagName("div")[0].getElementsByTagName("input")[0].onchange = undefined;
    neededGrid1.getElementsByTagName("div")[1].getElementsByTagName("input")[0].onchange = undefined;
    neededGrid1.getElementsByTagName("div")[2].getElementsByTagName("input")[0].onchange = undefined;
    neededGrid1.getElementsByTagName("div")[3].getElementsByTagName("input")[0].onchange = undefined;
  } else {
    neededGrid1.getElementsByTagName("div")[0].getElementsByTagName("input")[0].onchange = function(event) { onChangeSetPixelHandler('r', event.target.value); }
    neededGrid1.getElementsByTagName("div")[1].getElementsByTagName("input")[0].onchange = function(event) { onChangeSetPixelHandler('g', event.target.value); }
    neededGrid1.getElementsByTagName("div")[2].getElementsByTagName("input")[0].onchange = function(event) { onChangeSetPixelHandler('b', event.target.value); }
    neededGrid1.getElementsByTagName("div")[3].getElementsByTagName("input")[0].onchange = function(event) { onChangeSetPixelHandler('a', event.target.value); }
  }
}

// changes background of image on user's request
function updateFilePreviewBackgroundColor() {
  const backgroundColorType_generic = document.getElementById("ImageDisplay_bg_generic").checked;
  const backgroundColorType_select = document.getElementById("ImageDisplay_bg_select").checked;
  const userSelectedColor = document.getElementById("ImageDisplay_bg_select_color").value;

  // timeouts were needed because otherwise going from a user color to generic transparent background wouldn't work. idk why
  // makes the code look ugly too
  document.getElementById("ImageCanvas1").classList.remove("ImageCanvasBackground_generic");
  document.getElementById("ImageCanvas2").classList.remove("ImageCanvasBackground_generic");
  document.getElementById("ImageCanvas1").style.backgroundColor = "";
  document.getElementById("ImageCanvas2").style.backgroundColor = "";
  if (backgroundColorType_generic) {
    g_resizeTimeout = setTimeout(() => {
      document.getElementById("ImageCanvas1").classList.add("ImageCanvasBackground_generic");
      document.getElementById("ImageCanvas2").classList.add("ImageCanvasBackground_generic");
    }, 0);
  }
  else if (backgroundColorType_select) {
    g_resizeTimeout = setTimeout(() => {
      document.getElementById("ImageCanvas1").style.backgroundColor = userSelectedColor;
      document.getElementById("ImageCanvas2").style.backgroundColor = userSelectedColor;
    }, 0);
  }

  resizeImageCanvas(0);
}

// --------------------- Button and mouse handlers ----------------------

// If user wants to see a specific grid instead of the entire image, this changes that
function changeImageGridToView(gridToSee, refreshAll = true) {
  const curData = g_AllTextureData[g_currentTextureToShow];
  const width = curData.width >> g_currentTextureMipMap;
  const height = curData.height >> g_currentTextureMipMap;
  const { w, h } = getGridSizes(curData.TextureLayer);
  const highestGrid = (width / w) * (height / h) - 1;
  gridToSee = Math.max(-1, Math.min(highestGrid, gridToSee));
  if (highestGrid === Infinity || isNaN(highestGrid))
    gridToSee = -1;

  document.getElementById("ImageDisplay_gridToSee").value = gridToSee;
  if (gridToSee == -1) {
    document.getElementById("ImageDisplay_viewType_all").checked = true;
    document.getElementById("ImageDisplay_gridToSee").parentElement.style.display = "none";
  } else {
    document.getElementById("ImageDisplay_viewType_grid").checked = true;
    document.getElementById("ImageDisplay_gridToSee").parentElement.style.display = "";
  }

  if (refreshAll) {
    resizeImageCanvas(0);
  }
}

// Shows the grids visually on the image. (default color is green)
function ImagePreviewGridVisibilityChange(enabled) {
  const displayType = enabled ? "" : "none";
  document.getElementById("GridBackground1").style.display = displayType;
  document.getElementById("GridBackground2").style.display = displayType;
}

// change colors of elements on image to whatever use wants. Allows it to not blend in with image
function ImagePreviewGridColorChange(color) {
  document.documentElement.style.setProperty('--TextureFiles-GridColor', color);
}
function ImagePreviewMouseOverChange(color) {
  document.documentElement.style.setProperty('--TextureFiles-MouseOverColor', color);
}
function ImagePreviewSelectedChange(color) {
  document.documentElement.style.setProperty('--TextureFiles-SelectedColor', color);
  resizeImageCanvas(0);
}

// determines what pixel the user's mouse is over, leaves, and selects a pixel on click.
function mouseOverCanvas(event, num) {
  const canvas_es = [document.getElementById("ImageCanvas1"), document.getElementById("ImageCanvas2")];
  const mouserOver_es = [document.getElementById("MouseOverOutline1"), document.getElementById("MouseOverOutline2")];
  const image_width = canvas_es[0].width;
  const image_height = canvas_es[0].height;
  const canvas_width = parseInt(canvas_es[0].style.width);
  const canvas_height = parseInt(canvas_es[0].style.height); // both canvas should be same size
  const pixelXSize = canvas_width / image_width;
  const pixelYSize = canvas_height / image_height;

  // find which x and y pixel the mouse is over
  const relX = event.clientX - canvas_es[num].getBoundingClientRect().left;
  const relY = event.clientY - canvas_es[num].getBoundingClientRect().top;
  const topValue = Math.floor(relY / pixelYSize) * pixelYSize;
  const leftValue = Math.floor(relX / pixelXSize) * pixelXSize;
  if (topValue < 0 || leftValue < 0) {
    mouseLeaveCanvas();
    return;
  }

  // update visual of selected pixel on both compressed and uncompressed image
  for (let i = 0; i < 2; i++) {
    const style = window.getComputedStyle(canvas_es[i]);
    const marginTop = parseInt(style.marginTop);
    const marginLeft = parseInt(style.marginLeft);
    const borderWidth = Math.min(2, pixelXSize / 3, pixelYSize / 3); 

    mouserOver_es[i].style.borderWidth = `${borderWidth}px`;
    mouserOver_es[i].style.top = `${topValue+marginTop}px`;
    mouserOver_es[i].style.left = `${leftValue+marginLeft}px`;
    mouserOver_es[i].style.width = `${pixelXSize-(2*borderWidth)}px`;
    mouserOver_es[i].style.height = `${pixelYSize-(2*borderWidth)}px`;

    if (document.getElementById("ImageDisplay_viewType_Selected").checked)
      mouserOver_es[i].style.display = "";
  }

  // get pixelID
  const gridToSee = document.getElementById("ImageDisplay_gridToSee").value;
  let pixelID;
  if (gridToSee == -1) {
    pixelID = (Math.floor(relY / pixelYSize) * image_width) + Math.floor(relX / pixelXSize);
  } else {
    const curData = g_AllTextureData[g_currentTextureToShow];
    const topLeftPixelIDofGrid = gridToPixelID(curData.width, curData.TextureLayer, gridToSee);
    pixelID = (Math.floor(relY / pixelYSize) * curData.width) + Math.floor(relX / pixelXSize) + topLeftPixelIDofGrid;
  }
  updatePixelInfoRightFilePreview(pixelID);
  g_mouseOverPixel = pixelID;
}
function mouseLeaveCanvas() {
  document.getElementById("MouseOverOutline1").style.display = "none";
  document.getElementById("MouseOverOutline2").style.display = "none";
  updatePixelInfoRightFilePreview(g_currentPixel);
  g_mouseOverPixel = -1;
}
function mouseClickCanvas() {
  changeCurrentPixelID(g_mouseOverPixel, false);
  resizeImageCanvas(0);
}

/* --------------- Canvas Drawing -------------- */

// render all colors of uncompressed and compressed image to user
function redrawCanvas() {
  if (g_currentTextureToShow == -1) return;
  const curData = g_AllTextureData[g_currentTextureToShow];
  const { w, h } = getGridSizes(curData.TextureLayer);
  const gridToSee = document.getElementById("ImageDisplay_gridToSee").value;
  const pixels = curData.pixels[g_currentTextureMipMap];
  const compressedPixels = g_allFileProcessedInformation[g_currentTextureToShow+1].compressedImage[g_currentTextureMipMap];

  const hasColorData = data_hasColorData(g_currentTextureToShow);
  const fullWidth = curData.width >> (g_currentTextureMipMap * !hasColorData);
  const fullHeight = curData.height >> (g_currentTextureMipMap * !hasColorData);
  const width = gridToSee == -1 ? fullWidth : w;
  const height = gridToSee == -1 ? fullHeight : h;

  if (width == 0 || height == 0) return;

  const canvas1 = document.getElementById('ImageCanvas1');
  const ctx1 = canvas1.getContext('2d');
  const imageData1 = ctx1.createImageData(width, height);
  const data1 = imageData1.data;

  const canvas2 = document.getElementById('ImageCanvas2');
  const ctx2 = canvas2.getContext('2d');
  const imageData2 = ctx2.createImageData(width, height);
  const data2 = imageData2.data;

  const gridsNumHor = fullWidth / w;
  const startOffset = gridToSee == -1 ?
      0 :
      (Math.floor(gridToSee / gridsNumHor) * h * fullWidth) + (w * (gridToSee % gridsNumHor));

  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const srcIndex = startOffset + row * fullWidth + col;
      const dstOffset = (row * width + col) * 4;
      if (pixels[srcIndex] == undefined) {
        console.error("Trying to read a pixel that doesn't exist.");
        return;
      }
      data1[dstOffset]     = pixels[srcIndex].r;
      data1[dstOffset + 1] = pixels[srcIndex].g;
      data1[dstOffset + 2] = pixels[srcIndex].b;
      data1[dstOffset + 3] = pixels[srcIndex].a;

      const compressedOffset = gridToSee == -1 ?
        dstOffset :
        srcIndex * 4
      data2[dstOffset]     = compressedPixels[compressedOffset];
      data2[dstOffset + 1] = compressedPixels[compressedOffset + 1];
      data2[dstOffset + 2] = compressedPixels[compressedOffset + 2];
      data2[dstOffset + 3] = compressedPixels[compressedOffset + 3];
    }
  }

  ctx1.putImageData(imageData1, 0, 0);
  ctx2.putImageData(imageData2, 0, 0);
}

// resize images on window size change. Then redraws them
// waitTime being 0 means its an instant redraw of images too
function resizeImageCanvas(waitTime = 250) {
  if (g_isResizing) return;
  g_isResizing = true;
  const canvas1 = document.getElementById("ImageCanvas1");
  const canvas2 = document.getElementById("ImageCanvas2");

  const theActualResizeFunction = function() {
    if (g_currentTextureToShow == -1) {
      g_isResizing = false;
      return;
    }

    const curData = g_AllTextureData[g_currentTextureToShow];
    const { w, h } = getGridSizes(curData.TextureLayer);
    const gridToSee = document.getElementById("ImageDisplay_gridToSee").value;

    const canvas_es = [canvas1, canvas2];
    const container_es = [document.getElementById('ImageCanvasContainer1'), document.getElementById('ImageCanvasContainer2')];
    const grids_es = [document.getElementById("GridBackground1"), document.getElementById("GridBackground2")];
    const selected_es = [document.getElementById("SelectedOutline1"), document.getElementById("SelectedOutline2")];

    for (let i = 0; i < 2; i++) {
      const container = container_es[i];
      const container_width = container.getBoundingClientRect().width;
      const container_height = container.getBoundingClientRect().height;
      const hasColorData = data_hasColorData(g_currentTextureToShow);
      const image_width = (gridToSee == -1) ? curData.width >> (g_currentTextureMipMap * !hasColorData) : w;
      const image_height = (gridToSee == -1) ? curData.height >> (g_currentTextureMipMap * !hasColorData) : h;
      
      canvas_es[i].style.aspectRatio = `${image_width}/${image_height}`;
      canvas_es[i].width = image_width;
      canvas_es[i].height = image_height;

      // container_height / container_width = image_height / image_width
      // * 0.995 to avoid triggering another resize
      const heightIfWidthUsed = (image_height * container_width) / image_width;
      const widthIfHeightUsed = (image_width * container_height) / image_height;
      let widthToSetTo, heightToSetTo;
      if (heightIfWidthUsed - container_height < 1) {
        widthToSetTo = Math.floor(container_width*0.995);
        heightToSetTo = Math.floor(heightIfWidthUsed*0.995);
      } else {
        widthToSetTo = Math.floor(widthIfHeightUsed*0.995);
        heightToSetTo = Math.floor(container_height*0.995);
      }
      if (document.getElementById("ImageDisplay_shrinkMipMaps").checked && !hasColorData) {
        widthToSetTo = widthToSetTo >> (g_currentTextureMipMap);
        heightToSetTo = heightToSetTo >> (g_currentTextureMipMap);
      }
      canvas_es[i].style.width = `${widthToSetTo}px`;
      canvas_es[i].style.height = `${heightToSetTo}px`;

      // setup grids even if the user doesn't want to see them.
      // +1 to allow for seeing grids on edges of image
      grids_es[i].style.width = `${widthToSetTo+1}px`;
      grids_es[i].style.height = `${heightToSetTo+1}px`;
      if (gridToSee != -1) {
        grids_es[i].style.backgroundSize = `${widthToSetTo}px ${heightToSetTo}px`;
      } else {
        const numGridHor = image_width / w;
        const numGridVer = image_height / h;
        const valToSetTo = `${widthToSetTo/numGridHor}px ${heightToSetTo/numGridVer}px`;
        grids_es[i].style.backgroundSize = valToSetTo;
      }

      // show selected pixel even if user doesn't want to see them
      const pixelSelectedGrid = pixelIDtoGrid(image_width, curData.TextureLayer, g_currentPixel);
      const displayType = document.getElementById("ImageDisplay_viewType_Mouse").checked ? "": "none";
      if ((gridToSee > -1 && gridToSee != pixelSelectedGrid) || image_width == 0 || image_height == 0) {
        selected_es[i].style.width = 0;
        selected_es[i].style.height = 0;
        selected_es[i].style.borderWidth = 0;
      } else {
        const style = window.getComputedStyle(canvas_es[i]);
        const marginTop = parseInt(style.marginTop);
        const marginLeft = parseInt(style.marginLeft);
        const pixelXSize = widthToSetTo / image_width;
        const pixelYSize = heightToSetTo / image_height;
        const borderWidth = Math.min(3, pixelXSize / 3, pixelYSize / 3); 

        selected_es[i].style.display = displayType;
        selected_es[i].style.width = `${pixelXSize-(2*borderWidth)}px`;
        selected_es[i].style.height = `${pixelYSize-(2*borderWidth)}px`;
        selected_es[i].style.borderWidth = `${borderWidth}px`;

        let topValue, leftValue;
        if (gridToSee != -1) {
          const { w, h } = getGridSizes(curData.TextureLayer);
          const xOffset = (g_currentPixel % w);
          const yOffset = (Math.floor(g_currentPixel / image_width) % h);
          topValue = yOffset * pixelYSize;
          leftValue = xOffset * pixelXSize;
        } else {
          const xOffset = (g_currentPixel % image_width);
          const yOffset = (Math.floor(g_currentPixel / image_width) % curData.height);
          topValue = yOffset * pixelYSize;
          leftValue = xOffset * pixelXSize;
        }

        selected_es[i].style.top = `${topValue+marginTop}px`;
        selected_es[i].style.left = `${leftValue+marginLeft}px`;
      }
    }

    redrawCanvas();
    g_isResizing = false;
  }

  canvas1.style.width = "0";
  canvas1.style.height = "0";
  canvas2.style.width = "0";
  canvas2.style.height = "0";
  if (waitTime > 0) {
    clearTimeout(g_resizeTimeout);
    g_resizeTimeout = setTimeout(() => { theActualResizeFunction(); }, waitTime);
  } else {
    theActualResizeFunction();
  }
}

