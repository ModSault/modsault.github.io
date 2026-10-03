/* ------------- parse uploaded PNG files ------------- */

function replacePixelsWithPNG_DropHandler(ev) {
  ev.preventDefault();
  if (g_currentTextureToShow == -1 || g_currentTextureMipMap == -1)
    return;
  replacePixelsWithPNG(g_currentTextureToShow, g_currentTextureMipMap, ev.dataTransfer.items[0].getAsFile());
}
function replacePixelsWithPNG(index, mipmapIndex, file) {
  if (file == undefined) { return; }
  const elemInLeftHandSide = document.getElementById(`inputPNGButton_${index}`);
  if (elemInLeftHandSide) elemInLeftHandSide.value = ""; //ensure same file can be uploaded again if needed

  const reader = new FileReader();
  reader.onload = function(e) {
    const img = new Image();
    img.onload = function() {
      // check width and height
      const width = img.naturalWidth;
      const height = img.naturalHeight;
      const expected_width = data_hasColorData(index) ? g_AllTextureData[index].width : g_AllTextureData[index].width >> mipmapIndex;
      const expected_height = data_hasColorData(index) ? g_AllTextureData[index].height : g_AllTextureData[index].height >> mipmapIndex;
      if (width != expected_width || height != expected_height) {
        alert(`Your image is ${width}x${height} when your image needed to match that of what you're replacing ${expected_width}x${expected_height}. Resize the image yourself then reupload it.`);
        return;
      } 

      // Create an off-screen canvas to decode the PNG
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      // Grab raw pixel data: a flat array of [r,g,b,a, r,g,b,a, ...]
      const imageData = ctx.getImageData(0, 0, width, height);
      const pixels = imageData.data; // Uint8ClampedArray, length = width*height*4

      // Example: read pixel at (x, y)
      function getPixel(x, y) {
        const offset = (y * width + x) * 4;
        return {
          r: pixels[offset],
          g: pixels[offset + 1],
          b: pixels[offset + 2],
          a: pixels[offset + 3]
        };
      }

      // Example: iterate over every pixel
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const p = getPixel(x, y);
          data_setPixel(index, mipmapIndex, (y * width + x), "r", p.r);
          data_setPixel(index, mipmapIndex, (y * width + x), "g", p.g);
          data_setPixel(index, mipmapIndex, (y * width + x), "b", p.b);
          data_setPixel(index, mipmapIndex, (y * width + x), "a", p.a);
        }
      }

      // set png to lower res mipmaps if user wants that
      if (document.getElementById("PNGUpload_MipMapCheckbox").checked) {
        for (let i = mipmapIndex; i < g_AllTextureData[index].pixels.length && !data_hasColorData(index); i++) {
          data_setMipMapToMatchHigherRes(index, i);
        }
      }
      data_recalculateAllInIndex(index);
    };
    img.src = e.target.result; // data URL from FileReader
  };
  reader.readAsDataURL(file);
}