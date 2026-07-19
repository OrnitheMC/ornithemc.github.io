// diffMappings, printDiff, diffMemberArray from https://github.com/modmuss50/YarnDiff/tree/master

import {
  getLatestIntermediaryGeneration,
  getStableIntermediaryGeneration,
  getFeatherBuildMaven,
  getFeatherVersionMeta,
  getMinecraftVersions,
  getVersionDetails
} from "./meta_maven_utils.js";

import * as tiny from "./tiny_mappings.js";

(async () => {
  const minecraftVersionSelector = document.getElementById("mc-version");
  const minecraftVersionList = document.getElementById("version-list");
  const calamusGenSelector = document.getElementById("calamus-gen-selectors");
  const calamusGenSelectorRadios = {
      // generated
  }
  const gameSideSelector = document.getElementById("game-side-selectors");
  const gameSideSelectorRadios = {
      client: document.getElementById("side-client"),
      server: document.getElementById("side-server")
  }

  const sourceBuildSelector = document.getElementById("build-source");
  const targetBuildSelector = document.getElementById("build-target");
  const hidePackageToggle = document.getElementById("hide-package");
  
  const diffView = document.getElementById("diff-viewer");

  let minecraftVersions = [];
  let selectedVersion = null;

  function selectedMinecraftVersion() {
    return minecraftVersionSelector.value;
  }

  function selectedCalamusGeneration() {
    return Object.entries(calamusGenSelectorRadios).find(([_, button]) => button.checked)[0];
  }

  function selectedGameSide() {
    const selected = Object.entries(gameSideSelectorRadios).find(([_, button]) => button.checked);
    return selected ? selected[0] : undefined;
  }

  function sourceFeatherBuild() {
    return sourceBuildSelector.value;
  }

  function targetFeatherBuild() {
    return targetBuildSelector.value;
  }

  function hidePackageName() {
    return hidePackageToggle.checked;
  }

  function updateSelectedMinecraftVersion() {
    const prevSelectedVersion = selectedVersion;
    selectedVersion = selectedMinecraftVersion();

    return selectedVersion != prevSelectedVersion;
  }

  async function updateGameSides() {
    gameSideSelector.style.display = "none";

    gameSideSelectorRadios.client.checked = false;
    gameSideSelectorRadios.server.checked = false;

    if (minecraftVersions.some((version) => selectedMinecraftVersion() === version)) {
      const intermediaryGen = selectedCalamusGeneration();
      const minecraftVersion = selectedMinecraftVersion();

      if (intermediaryGen == "gen1") {
        const versionDetails = await getVersionDetails(intermediaryGen, minecraftVersion);

        if (!versionDetails.sharedMappings) {
          gameSideSelector.style = "";
          
          gameSideSelectorRadios.client.disabled = !versionDetails.client;
          gameSideSelectorRadios.server.disabled = !versionDetails.server;

          // select client by default unless disabled
          gameSideSelectorRadios.client.checked = versionDetails.client;
          gameSideSelectorRadios.server.checked = !gameSideSelectorRadios.client.checked;
        }
      }
    }
  }

  async function updateFeatherBuilds() {
    const intermediaryGen = selectedCalamusGeneration();
    const minecraftVersion = selectedMinecraftVersion();

    if (minecraftVersions.some((version) => minecraftVersion === version)) {
      const gameSide = selectedGameSide();
      const sidedMinecraftVersion = (gameSide == undefined)
          ? minecraftVersion
          : minecraftVersion + "-" + gameSide;

      await getFeatherVersionMeta(intermediaryGen, sidedMinecraftVersion).then(
        (featherVersionMeta) => {
          sourceBuildSelector.innerHTML = "";
          targetBuildSelector.innerHTML = "";
          for (const featherVersion of featherVersionMeta) {
            const featherVersionElement = document.createElement("option");
            featherVersionElement.innerText = "Build " + featherVersion.build;
            featherVersionElement.value = featherVersion.version;
            sourceBuildSelector.appendChild(featherVersionElement);
            targetBuildSelector.appendChild(
              featherVersionElement.cloneNode(true),
            );
          }
        },
      );

      // Hide the diff viewer bc the source and target builds are the same
      diffView.style.display = "none";
    } else {
      sourceBuildSelector.innerHTML = "";
      targetBuildSelector.innerHTML = "";
      diffView.style.display = "none";
    }
  }

  async function getTinyMappings(version) {
    const gen = selectedCalamusGeneration()
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

  async function updateDiffView() {
    const source = sourceFeatherBuild();
    const target = targetFeatherBuild();

    if (source === target) {
      console.log("Source and target builds are the same");
      // Hide the diff viewer
      diffView.style.display = "none";
      return;
    }
    // Display the diff viewer
    diffView.style.display = "inline";

    const sourceMappings = await getTinyMappings(source);
    const targetMappings = await getTinyMappings(target);

    diffMappings(sourceMappings, targetMappings);
  }

  function diffMappings(source, target) {
    printDiff(diffMemberArray(source.classes, target, hidePackageName()), "classes-diff")
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

  async function init() {
    const latestGen = await getLatestIntermediaryGeneration();
    const stableGen = await getStableIntermediaryGeneration();

    for (let gen = 1; gen <= latestGen; gen++) {
      const intermediaryGen = "gen" + gen;
      const intermediaryGenName = "Gen" + gen;
      const buttonId = "generation-" + intermediaryGen;

      calamusGenSelector.innerHTML += `
          <input type="radio" id="${buttonId}" name="calamus-generation"/>
          <label for="${buttonId}">${intermediaryGenName}</label>
      `;
    }

    for (let gen = 1; gen <= latestGen; gen++) {
      const intermediaryGen = "gen" + gen;
      const buttonId = "generation-" + intermediaryGen;

      calamusGenSelectorRadios[intermediaryGen] = document.getElementById(buttonId);

      if (gen == stableGen) {
        calamusGenSelectorRadios[intermediaryGen].checked = true;
      }
    }

    minecraftVersionSelector.addEventListener("blur", async _ => {
      if (updateSelectedMinecraftVersion()) {
        await updateGameSides();
        await updateFeatherBuilds();
      }
    });
    calamusGenSelector.addEventListener("change", async _ => {
      await fetchVersions()
      await updateVersionList();
      
      await updateGameSides();
      await updateFeatherBuilds();
    });
    gameSideSelector.addEventListener("change", async _ => {
      await updateFeatherBuilds();
    });

    sourceBuildSelector.addEventListener("change", async _ => {
      await updateDiffView();
    });
    targetBuildSelector.addEventListener("change", async _ => {
      await updateDiffView();
    });
    hidePackageToggle.addEventListener("change", async (_) => {
      await updateDiffView();
    });

    // default mc version is 1.7.2 where this selector isn't needed
    gameSideSelector.style.display = "none";
  }

  async function fetchVersions() {
    const intermediaryGen = selectedCalamusGeneration();
    minecraftVersions = await getMinecraftVersions(intermediaryGen);
  }

  async function updateVersionList() {
    while (minecraftVersionList.firstChild) minecraftVersionList.removeChild(minecraftVersionList.lastChild);
    minecraftVersions.forEach(e => {
      const opt = new Option();
      opt.value = e;
      minecraftVersionList.appendChild(opt);
    });
  }

  await init();
  await fetchVersions();
  await updateVersionList();
  await updateFeatherBuilds();
})();