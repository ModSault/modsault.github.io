var jsonData = null

function makeText(text, link = "", bgColor = -1) {
  let toReturn;
  if (link != "") {
    toReturn = document.createElement("a");
    toReturn.href = link;
  }
  if (link == "") { toReturn = document.createElement("p"); }
  toReturn.innerText = text;
  if (bgColor == 0) { toReturn.style.background = "var(--red-button-inverse)"; }
  if (bgColor == 1) { toReturn.style.background = "var(--green-button-inverse)"; }
  return toReturn;
}

function resetTable() {
  if (jsonData == null) return;

  // remove all elements in grid
  const grid = document.getElementById("GridWithAllInfo");
  grid.replaceChildren();

  // get all filenames and sort by folders then alphabetically
  let sortedNames = Object.keys(jsonData);
  sortedNames.sort((a, b) => {
    if (a.indexOf("/") != -1 && b.indexOf("/") == -1) return -1;
    if (a.indexOf("/") == -1 && b.indexOf("/") != -1) return 1;
    return a.toLowerCase().localeCompare(b.toLowerCase())
  });

  // Make top row of grid
  const topRowElements = ["Name", "Description", "Parser (if any)", "USA", "Japan", "PAL"];
  for (let i = 0; i < topRowElements.length; i++) {
    grid.appendChild(makeText(topRowElements[i]));
  }

  // make All other rows
  for (let i = 0; i < sortedNames.length; i++) {
    const relevant = jsonData[sortedNames[i]];
    grid.appendChild(makeText(sortedNames[i]));

    if (relevant["IsSameAllVersions"]) {
      grid.appendChild(makeText(relevant["Description"]));
    } else {
      if (GameVersion == 0) grid.appendChild(makeText(relevant["Description_USA"]));
      if (GameVersion == 1) grid.appendChild(makeText(relevant["Description_Japan"]));
      if (GameVersion == 2) grid.appendChild(makeText(relevant["Description_PAL"]));
    }

    if (!relevant["IsParsable"]) {
      grid.appendChild(makeText(""));
    } else {
      grid.appendChild(makeText(relevant["ParsableTool_Text"], relevant["ParsableTool_Link"]));
    }

    const allExt = ["USA", "Japan", "PAL"];
    for (let j = 0; j < allExt.length; j++) {
      if (relevant["Isfile_"+allExt[j]] == true) {
        grid.appendChild(makeText("Yes", "", 1));
      } else {
        grid.appendChild(makeText("No", "", 0));
      }
    }
  }
}


fetch('../Documentation/Filenames.json')
.then(response => response.json())
.then(data => {
  jsonData = data;
  resetTable();
})
.catch(error => {
  alert("Failed to load file. No information on this page will be presented to you. I recommend a page refresh. Error: " + error)
});