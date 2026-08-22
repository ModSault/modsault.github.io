var jsonData = null

function resetTable() {
  if (jsonData == null) return;

  // document fragment with all grid info
  const frag = document.createDocumentFragment();

  // sort by ID number (just in case its out of order)
  let sortedNames = Object.keys(jsonData);
  sortedNames.sort((a, b) => { parseInt(a) > parseInt(b) });

  // make top row of grid
  const topRowElements = ["ID (real)", "ID (shorthand)", "Name / Description"];
  for (let i = 0; i < topRowElements.length; i++) {
    frag.appendChild(DOM_addAny("p", { innerText: topRowElements[i] }));
  }

  // make All other rows
  for (let i = 0; i < sortedNames.length; i++) {
    const curID = parseInt(sortedNames[i]);
    console.assert(curID <= 0xFFFF);
    if (jsonData[curID] === "-" || jsonData[curID] === "") continue; // don't show unused IDs

    const ID_real = 0x10000000 | curID;
    frag.appendChild(DOM_addAny("p", {
      innerText: `0x${ID_real.toString(16).toUpperCase()} (${ID_real})`
    }));

    frag.appendChild(DOM_addAny("p", {
      innerText: `0x${curID.toString(16).padStart(4,"0").toUpperCase()} (${curID})`
    }));

    frag.appendChild(DOM_addAny("p", {
      innerText: jsonData[curID]
    }));
  }

  // update whole table
  document.getElementById("GridWithAllInfo").replaceChildren(frag);
}


fetch('../Documentation/TextureIDs_names.json')
.then(response => response.json())
.then(data => {
  jsonData = data;
  resetTable();
})
.catch(error => {
  alert(`Failed to load file of all Texture IDs. No information on this page will be presented to you. I recommend a page refresh. Error: ${error}`)
});