// diffMappings, printDiff, diffMemberArray from https://github.com/modmuss50/YarnDiff/tree/master

import {
  getFeatherBuildMaven,
  getFeatherVersionMeta,
  getMinecraftStableVersions,
  getMinecraftVersions,
} from "./meta_maven_utils.js";

import * as tiny from "./tiny_mappings.js";

(async () => {
  const minecraftStableVersions = await getMinecraftStableVersions();
  const minecraftAllVersions = await getMinecraftVersions();

  let possibleVersions;

  const versionSelectorInput = document.getElementById("mc-version");
  const versionListElement = document.getElementById("version-list");
  const allowSnapshotsCheck = document.getElementById("allow-snapshots");

  const buildSourceElement = document.getElementById("build-source");
  const buildTargetElement = document.getElementById("build-target");
  const diffViewerElement = document.getElementById("diff-viewer");

  const hideClassPath = document.getElementById("hide-class-path");

  async function updateFeatherBuilds() {
    if (
      possibleVersions.some((version) => versionSelectorInput.value === version)
    ) {
      await getFeatherVersionMeta(versionSelectorInput.value).then(
        (featherVersionMeta) => {
          buildSourceElement.innerHTML = "";
          buildTargetElement.innerHTML = "";
          for (const featherVersion of featherVersionMeta) {
            const featherVersionElement = document.createElement("option");
            featherVersionElement.innerText = "Build " + featherVersion.build;
            featherVersionElement.value = featherVersion.version;
            buildSourceElement.appendChild(featherVersionElement);
            buildTargetElement.appendChild(
              featherVersionElement.cloneNode(true),
            );
          }
        },
      );

      // Hide the diff viewer bc the source and target builds are the same
      diffViewerElement.style.display = "none";
    }
  }

  async function getTinyMappings(version) {
    let arrayBuf = await getFeatherBuildMaven(version)
      .then((response) => response.blob()) // Get response as a Blob
      .then(async (blob) => {
        const arrayBuffer = await blob.arrayBuffer(); // Convert Blob to ArrayBuffer
        // Convert to Uint8Array
        return new Uint8Array(arrayBuffer);
      });

    const readableStream = new ReadableStream({
      start(controller) {
        controller.enqueue(arrayBuf);
        controller.close();
      }
    });
    const ds = new DecompressionStream("gzip");
    const tds = new TextDecoderStream("utf-8")

    let file = '';
    const reader = readableStream.pipeThrough(ds).pipeThrough(tds).getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      file += value;
    }

    return tiny.parseTiny(file);
  }

  async function updateFeatherDiff() {
    const source = buildSourceElement.value;
    const target = buildTargetElement.value;

    if (source === target) {
      console.log("Source and target builds are the same");
      // Hide the diff viewer
      diffViewerElement.style.display = "none";
      return;
    }
    // Display the diff viewer
    diffViewerElement.style.display = "inline";

    const sourceMappings = await getTinyMappings(source);
    const targetMappings = await getTinyMappings(target);

    diffMappings(sourceMappings, targetMappings);
  }

  function diffMappings(source, target) {
    printDiff(diffMemberArray(source.classes, target, hideClassPath.checked), "classes-diff")
    printDiff(diffMemberArray(source.methods, target), "methods-diff")
    printDiff(diffMemberArray(source.fields, target), "fields-diff")
  }

  function printDiff(diff, elementID) {
    document.getElementById(elementID).innerText = diff.map(value => `${value.source} -> ${value.target}`).join("\n")
  }

  function diffMemberArray(source, targetMappings, stripPath = false) {
    let diff = []

    source.forEach(source => {
      let target = targetMappings.find(source.calamus)

      if (target !== undefined && source.feather !== target.feather) {
        let sourceFeather = source.feather;
        let targetFeather = target.feather;

        if (stripPath) {
          if (sourceFeather.substring(0, sourceFeather.lastIndexOf('/')) === targetFeather.substring(0, targetFeather.lastIndexOf('/'))) {
            sourceFeather = sourceFeather.split('/').pop();
            targetFeather = targetFeather.split('/').pop();
          }
        }

        diff.push({
          source: sourceFeather,
          target: targetFeather
        })
      }
    })
    return diff
  }

  versionSelectorInput.addEventListener(
    "input",
    async (_) => await updateFeatherBuilds(),
  );

  allowSnapshotsCheck.addEventListener("change", (_) => {
    if (allowSnapshotsCheck.checked) {
      possibleVersions = minecraftAllVersions;
    } else {
      possibleVersions = minecraftStableVersions;
    }
    updateVersionList();
  });

  buildSourceElement.addEventListener(
    "change",
    async (_) => await updateFeatherDiff(),
  );

  buildTargetElement.addEventListener(
    "change",
    async (_) => await updateFeatherDiff(),
  );

  hideClassPath.addEventListener("change", async (_) => {
    await updateFeatherDiff();
  });

  function updateVersionList() {
    const list = possibleVersions;
    while (versionListElement.firstChild)
      versionListElement.removeChild(versionListElement.lastChild);
    list.forEach((e) => {
      const opt = new Option();
      opt.value = e;
      versionListElement.appendChild(opt);
    });
  }

  possibleVersions = minecraftStableVersions;
  updateVersionList();
  await updateFeatherBuilds();
})();