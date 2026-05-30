/* ------------------------------- Loading user files (thanks chatGPT) ------------------------- */

const loaderImports = {
  gltf: () => import('../Resources/three.js/examples/jsm/loaders/GLTFLoader.js').then(m => m.GLTFLoader),
  glb: () => import('../Resources/three.js/examples/jsm/loaders/GLTFLoader.js').then(m => m.GLTFLoader),
  obj: () => import('../Resources/three.js/examples/jsm/loaders/OBJLoader.js').then(m => m.OBJLoader),
  mtl: () => import('../Resources/three.js/examples/jsm/loaders/MTLLoader.js').then(m => m.MTLLoader),
  fbx: () => import('../Resources/three.js/examples/jsm/loaders/FBXLoader.js').then(m => m.FBXLoader),
  dae: () => import('../Resources/three.js/examples/jsm/loaders/ColladaLoader.js').then(m => m.ColladaLoader),
  stl: () => import('../Resources/three.js/examples/jsm/loaders/STLLoader.js').then(m => m.STLLoader),
  ply: () => import('../Resources/three.js/examples/jsm/loaders/PLYLoader.js').then(m => m.PLYLoader),
  "3mf": () => import('../Resources/three.js/examples/jsm/loaders/3MFLoader.js').then(m => m.ThreeMFLoader),
  amf: () => import('../Resources/three.js/examples/jsm/loaders/AMFLoader.js').then(m => m.AMFLoader),
  vtk: () => import('../Resources/three.js/examples/jsm/loaders/VTKLoader.js').then(m => m.VTKLoader),
  vtp: () => import('../Resources/three.js/examples/jsm/loaders/VTKLoader.js').then(m => m.VTKLoader),
  usdz: () => import('../Resources/three.js/examples/jsm/loaders/USDZLoader.js').then(m => m.USDZLoader),
};

export async function General3JS_Importer(file) {
  if (!file) return { "type": "error", "message": "Invalid File" };
  const filename = file.name;
  const ext = filename.substring(filename.lastIndexOf(".") + 1).toLowerCase();

  const importLoader = loaderImports[ext];
  if (!importLoader) {
    alert("Unsupported file extension: " + ext);
    return {
        "type": "error",
        "message": "Unsupported file extension: " + ext
    };
  }

  try {
    // Dynamically import the loader
    const LoaderClass = await importLoader();
    const loader = new LoaderClass();

    // Read the file
    const textFormats = ["obj", "mtl", "dae", "amf", "gltf"];
    const reader = new FileReader();
    const isText = textFormats.includes(ext);

    const fileContent = await new Promise((resolve, reject) => {
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => {
        return {
            "type": "error",
            "message": "Failed to read file"
        };
        reject(reader.error);
      };
      reader.onabort = () => {
        return {
            "type": "error",
            "message": "Aborted read file"
        };
        reject(new Error("File read aborted"));
      };
      if (isText) reader.readAsText(file);
      else reader.readAsArrayBuffer(file);
    });

    // Parse the model depending on loader
    let object;
    switch (ext) {
      case "gltf":
      case "glb":
        object = await new Promise((resolve, reject) => {
          loader.parse(fileContent, "", gltf => resolve(gltf.scene), err => reject(err));
        });
        break;

      case "obj":
      case "mtl":
      case "fbx":
      case "amf":
        object = loader.parse(fileContent);
        break;

      case "dae":
      case "3mf":
        object = loader.parse(fileContent).scene;
        break;

      case "stl":
        const geometry = loader.parse(fileContent);
        object = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: 0x7777ff }));
        break;

      case "ply":
        const plyGeometry = loader.parse(fileContent);
        object = new THREE.Mesh(plyGeometry, new THREE.MeshStandardMaterial({ color: 0x7777ff }));
        break;

      case "vtk":
      case "vtp":
      case "usdz":
        object = loader.parse(fileContent);
        break;

      default:
        throw new Error("Unsupported loader logic for extension: " + ext);
    }

    return {
        "type": "model",
        "message": object
    };
  } catch (err) {
    alert("Failed to load model: " + err.message);
    return {
        "type": "error",
        "message": "Failed to load model: " + err.message
    };
  }
}

/* ------------------------------- Export ThreeJs Scene (thanks Claude) ------------------------- */

const exporterImports = {
  glb:  () => import('../Resources/three.js/examples/jsm/exporters/GLTFExporter.js').then(m => m.GLTFExporter),
  gltf: () => import('../Resources/three.js/examples/jsm/exporters/GLTFExporter.js').then(m => m.GLTFExporter),
  obj:  () => import('../Resources/three.js/examples/jsm/exporters/OBJExporter.js').then(m => m.OBJExporter),
  stl:  () => import('../Resources/three.js/examples/jsm/exporters/STLExporter.js').then(m => m.STLExporter),
  ply:  () => import('../Resources/three.js/examples/jsm/exporters/PLYExporter.js').then(m => m.PLYExporter),
  dae:  () => import('../Resources/three.js/examples/jsm/exporters/ColladaExporter.js').then(m => m.ColladaExporter),
  usdz: () => import('../Resources/three.js/examples/jsm/exporters/USDZExporter.js').then(m => m.USDZExporter),
  draco: () => import('../Resources/three.js/examples/jsm/exporters/DRACOExporter.js').then(m => m.DRACOExporter),
};

export async function General3JS_Exporter(object, filename = "export.glb") {
  alert("I don't know what you're exporting but keep in mind it might still be copyrighted if you imported a game file. DO NOT DISTRIBUTE IF THAT IS THE CASE!")
  if (!object) return { type: "error", message: "No object provided" };

  const ext = filename.substring(filename.lastIndexOf(".") + 1).toLowerCase();

  const importExporter = exporterImports[ext];
  if (!importExporter) {
    alert("Unsupported export format: " + ext);
    return { type: "error", message: "Unsupported export format: " + ext };
  }

  try {
    const ExporterClass = await importExporter();
    const exporter = new ExporterClass();

    let result;

    switch (ext) {
      case "glb":
        result = await new Promise((resolve, reject) => {
          exporter.parse(object, resolve, reject, { binary: true });
        });
        downloadFile(result, filename, "application/octet-stream");
        break;

      case "gltf":
        result = await new Promise((resolve, reject) => {
          exporter.parse(object, resolve, reject, { binary: false });
        });
        const gltfBlob = new Blob([JSON.stringify(result)], { type: "application/json" });
        downloadBlob(gltfBlob, filename);
        break;

      case "obj":
        result = exporter.parse(object);
        downloadFile(result, filename, "text/plain");
        break;

      case "stl":
        result = exporter.parse(object, { binary: true });
        downloadFile(result, filename, "application/octet-stream");
        break;

      case "ply":
        result = exporter.parse(object, { binary: true });
        downloadFile(result, filename, "application/octet-stream");
        break;

      case "dae":
        result = exporter.parse(object).data;
        downloadFile(result, filename, "text/plain");
        break;

      case "usdz":
        result = await exporter.parseAsync(object);
        downloadFile(result, filename, "model/vnd.usdz+zip");
        break;

      case "draco":
        result = exporter.parse(object);
        downloadFile(result, filename, "application/octet-stream");
        break;

      default:
        throw new Error("Unsupported exporter logic for extension: " + ext);
    }

    return { type: "success", message: "Exported " + filename };

  } catch (err) {
    alert("Failed to export model: " + err.message);
    return { type: "error", message: "Failed to export model: " + err.message };
  }
}

/* ------ Helpers (thanks Claude again) ------ */

function downloadFile(data, filename, mimeType) {
  const blob = data instanceof Blob ? data : new Blob([data], { type: mimeType });
  downloadBlob(blob, filename);
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}