// diffMappings, printDiff, diffMemberArray from https://github.com/modmuss50/YarnDiff/tree/master

import {
  getFeatherBuildMaven,
  getFeatherVersionMeta,
  getMinecraftStableVersions,
  getMinecraftVersions,
} from "./meta_maven_utils.js";

import * as tiny from "./tiny_mappings.js";

(async () => {
  let minecraftStableVersions = await getMinecraftStableVersions("gen1");
  let minecraftAllVersions = await getMinecraftVersions("gen1");

  let possibleVersions;

  const genSelectorRadios = {
    gen1: document.getElementById("generation-gen1"),
    gen2: document.getElementById("generation-gen2")
  }

  const versionSelectorInput = document.getElementById("mc-version");
  const versionListElement = document.getElementById("version-list");
  const allowSnapshotsCheck = document.getElementById("allow-snapshots");
  const featherGenSelector = document.getElementById("calamus-gen-selectors");

  const buildSourceElement = document.getElementById("build-source");
  const buildTargetElement = document.getElementById("build-target");
  const diffViewerElement = document.getElementById("diff-viewer");

  const hidePackage = document.getElementById("hide-package");

  async function updateFeatherBuilds() {
    if (
      possibleVersions.some((version) => versionSelectorInput.value === version)
    ) {
      const gen = Object.entries(genSelectorRadios).find(([_, button]) => button.checked)[0];
      await getFeatherVersionMeta(gen, versionSelectorInput.value).then(
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
    } else {
      buildSourceElement.innerHTML = "";
      buildTargetElement.innerHTML = "";
      diffViewerElement.style.display = "none";
    }
  }

  async function getTinyMappings(version) {
    const gen = Object.entries(genSelectorRadios).find(([_, button]) => button.checked)[0];
    let arrayBuf = await getFeatherBuildMaven(gen, version)
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
    printDiff(diffMemberArray(source.classes, target, hidePackage.checked), "classes-diff")
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
    updateVersionList();
  });

  featherGenSelector.addEventListener("change", async (e) => {
    const gen = Object.entries(genSelectorRadios).find(([_, button]) => button === e.target)[0];
    minecraftStableVersions = await getMinecraftStableVersions(gen);
    minecraftAllVersions = await getMinecraftVersions(gen);

    updateVersionList();
  })

  buildSourceElement.addEventListener(
    "change",
    async (_) => await updateFeatherDiff(),
  );

  buildTargetElement.addEventListener(
    "change",
    async (_) => await updateFeatherDiff(),
  );

  hidePackage.addEventListener("change", async (_) => {
    await updateFeatherDiff();
  });

  function updateVersionList() {
    if (allowSnapshotsCheck.checked) {
      possibleVersions = minecraftAllVersions;
    } else {
      possibleVersions = minecraftStableVersions;
    }

    while (versionListElement.firstChild)
      versionListElement.removeChild(versionListElement.lastChild);
    possibleVersions.forEach((e) => {
      const opt = new Option();
      opt.value = e;
      versionListElement.appendChild(opt);
    });
  }

  updateVersionList();
  await updateFeatherBuilds();
})();