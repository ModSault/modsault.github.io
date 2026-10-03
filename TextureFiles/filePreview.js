/* ----------------- Functions for File preview part of the site -------------------- */

// Shows all texture files and what offsets they are within the file.
function showFileOffsetsInFilePreview() {
  const frag = document.createDocumentFragment();
  const hexify = function(value) {
    return value.toString(16).toUpperCase();
  }

  const topRow = ['Name', 'Size (bytes)', 'Header of File', 'Pixel Data', 'Color Data'];
  for (const innerText of topRow) {
    frag.appendChild(DOM_addAny("p", { innerText }));
  }

  let currentOffset = 0;
  for (let i = 0; i < g_allFileProcessedInformation.length; i++) {
    const curSize = g_allFileProcessedInformation[i].downloadSegment.byteLength;
    const name = (i === 0) ? "Header" : `[${i-1}; ${data_getIDPretty(i-1)}] ${g_AllTextureData[i-1].name}`;
    frag.appendChild(DOM_addAny("p", { innerText: name }));
    frag.appendChild(DOM_addAny("p", { innerText: `0x${hexify(curSize)}` }));

    const startOffset = currentOffset;
    const endOffset = currentOffset + curSize;
    frag.appendChild(DOM_addAny("p", { innerText: `0x${hexify(startOffset)} - 0x${hexify(endOffset)}` }));

    const pixelDataStart = startOffset + g_allFileProcessedInformation[i].offsetToStartOfPixels;
    const pixelDataEnd = pixelDataStart + g_allFileProcessedInformation[i].offsetToStartOfColors - g_allFileProcessedInformation[i].offsetToStartOfPixels;
    if (pixelDataStart <= 0 || pixelDataStart == pixelDataEnd) {
      frag.appendChild(DOM_addAny("p", { innerText: '---' }));
    } else {
      frag.appendChild(DOM_addAny("p", { innerText: `0x${hexify(pixelDataStart)} - 0x${hexify(pixelDataEnd)}` }));
    }

    const colorDataStart = startOffset + g_allFileProcessedInformation[i].offsetToStartOfColors;
    const colorDataEnd = endOffset;
    if (colorDataStart <= 0 || colorDataStart == colorDataEnd) {
      frag.appendChild(DOM_addAny("p", { innerText: '---' }));
    } else {
      frag.appendChild(DOM_addAny("p", { innerText: `0x${hexify(colorDataStart)} - 0x${hexify(colorDataEnd)}` }));
    }

    currentOffset += curSize;
  }

  document.getElementById("OffsetAmtsForFiles").replaceChildren(frag);
}

// called when the user wants to view a different range within the file (or when the file size changes)
function updateOffsetBound(isHigherBoundChanging = true) {
  const allowedDifference = 0x500; // max range between max and min. Values too high cause too much lag
  const lowerBoundElem = document.getElementById('OffsetLowerBound');
  const higherBoundElem = document.getElementById('OffsetHigherBound');
  lowerBoundElem.value = lowerBoundElem.value.replace(/[^0-9a-fA-F]/g, "").toUpperCase();
  higherBoundElem.value = higherBoundElem.value.replace(/[^0-9a-fA-F]/g, "").toUpperCase();
  const totalFileSize = g_allFileProcessedInformation.reduce((sum, f) => sum + f.downloadSegment.byteLength, 0);

  let lowerValue = Math.max(0, Math.min(totalFileSize-1, parseInt(lowerBoundElem.value, 16)));
  let higherValue = Math.max(0, Math.min(totalFileSize-1, parseInt(higherBoundElem.value, 16)));
  if (isHigherBoundChanging) {
    lowerValue = Math.max(higherValue - allowedDifference, Math.min(lowerValue, higherValue));
  } else {
    higherValue = Math.min(lowerValue + allowedDifference, Math.max(lowerValue, higherValue));
  }
  lowerBoundElem.value = lowerValue.toString(16).toUpperCase();
  higherBoundElem.value = higherValue.toString(16).toUpperCase();

  UpdateFilePreview(lowerValue, higherValue);
}

// updates color coded offset and file preview area.
function UpdateFilePreview(lowerBound, higherBound) {
  lowerBound = parseInt(lowerBound) & ~(0xF);
  higherBound = parseInt(higherBound) & ~(0xF);
  const pTagColor = function(text, bgColorIndex = 0) {
    const highlightColors = ["01", "05", "09", "13", "17", "02", "06", "10", "14", "18", "03", "07", "11", "15", "04", "08", "12", "16"];
    let pTag = document.createElement("p");
    pTag.innerText = text;
    if (bgColorIndex != 0)
      pTag.style.backgroundColor = "var(--highlightColor-" + (highlightColors[(bgColorIndex-1) % highlightColors.length]) + ")";
    return pTag;
  }

  // Make document fragments
  const fragment_file = document.createDocumentFragment();
  const fragment_offsets = document.createDocumentFragment();
  if (lowerBound < 0 && higherBound < 0) {
    document.getElementById("FilePreviewGrid").replaceChildren(fragment_file);
    document.getElementById("OffsetDescriptionGrid").replaceChildren(fragment_offsets);
    return;
  }

  // add top row
  const row1Contents_file = ["Offset", "File's Offset", "File id", ".0", ".1", ".2", ".3", ".4", ".5", ".6", ".7", ".8", ".9", ".A", ".B", ".C", ".D", ".E", ".F"];
  for (let i = 0; i < row1Contents_file.length; i++) {
    fragment_file.appendChild(pTagColor(row1Contents_file[i]));
  }
  const row1Contents_offsets = ["Offset", "File's Offset", "File id", "Variable Type", "Description"];
  for (let i = 0; i < row1Contents_offsets.length; i++) {
    fragment_offsets.appendChild(pTagColor(row1Contents_offsets[i]));
  }

  // append binary of file (go through all files)
  let currentOffset = 0;
  for (let i = 0; i < g_allFileProcessedInformation.length; i++) {
    const curSize = g_allFileProcessedInformation[i].downloadSegment.byteLength;
    if (curSize + currentOffset < lowerBound) {
      currentOffset += curSize;
      continue;
    }

    const view = new DataView(g_allFileProcessedInformation[i].downloadSegment);
    const segmentColors = g_allFileProcessedInformation[i].downloadSegmentColors;
    const description = g_allFileProcessedInformation[i].descriptions;
    const colorIndex = (i % 2) + 1;

    // if file is within user specified range, show info for it
    for (let j = Math.max(0, lowerBound-currentOffset); j < Math.min(higherBound-currentOffset+0x10, curSize); j++) {
      let totalOffset = currentOffset + j;

      // add new row for file hex preview
      if (j % 16 === 0) {
        fragment_file.appendChild(pTagColor("+0x" + (totalOffset).toString(16).toUpperCase()));
        fragment_file.appendChild(pTagColor("+0x" + (j).toString(16).toUpperCase()));
        fragment_file.appendChild(pTagColor((i == 0) ? "Header" : (i-1).toString(), colorIndex));
      }
      fragment_file.appendChild(pTagColor(view.getUint8(j).toString(16).padStart(2, "0").toUpperCase(), segmentColors[j]));
      
      // add offset data if present at this address
      if (description[j] != undefined) {
        const desc = description[j].description;
        const type = description[j].type;

        fragment_offsets.appendChild(pTagColor("+0x" + (totalOffset).toString(16).toUpperCase()));
        fragment_offsets.appendChild(pTagColor("+0x" + (j).toString(16).toUpperCase()));
        fragment_offsets.appendChild(pTagColor((i == 0) ? "Header" : (i-1).toString(), colorIndex));
        fragment_offsets.appendChild(pTagColor(type, segmentColors[j]));
        fragment_offsets.appendChild(pTagColor(desc, segmentColors[j]));
      }
    }

    currentOffset += curSize;
    if (currentOffset >= higherBound + 0x10) break;
  }

  // add all children
  document.getElementById("FilePreviewGrid").replaceChildren(fragment_file);
  document.getElementById("OffsetDescriptionGrid").replaceChildren(fragment_offsets);
}