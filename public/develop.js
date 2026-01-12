import {
    getMinecraftStableVersions,
    getMinecraftVersions,
    getLatestLoader,
    getLatestOsl,
    getLatestFeatherBuild,
    getLatestRavenBuild,
    getLatestSparrowBuild,
    getLatestNestsBuild
} from "./meta_maven_utils.js";

import { normalizeMinecraftVersion } from "./minecraft_semver.js";

(async () => {
    const genSelectorRadios = {
        gen1: document.getElementById("generation-gen1"),
        gen2: document.getElementById("generation-gen2")
    }

    const gen = Object.entries(genSelectorRadios).find(([_, button]) => button.checked)[0];
    let minecraftStableVersions = await getMinecraftStableVersions(gen);
    let minecraftAllVersions = await getMinecraftVersions(gen);

    let possibleVersions;

    const loaderSelectorRadios = {
        fabric: document.getElementById("mod-loader-fabric"),
        quilt: document.getElementById("mod-loader-quilt")
    }
    const versionSelectorInput = document.getElementById("mc-version");
    const versionListElement = document.getElementById("version-list");
    const allowSnapshotsCheck = document.getElementById("allow-snapshots");
    const featherGenSelector = document.getElementById("calamus-gen-selectors");

    function setExtraMsg(message) {
        document.getElementById("dependencies-extra-message").innerText = message;
    }

    function getExtraMsg() {
        return document.getElementById("dependencies-extra-message").innerText;
    }

    function addExtraMsg(message) {
        setExtraMsg(getExtraMsg() + (getExtraMsg() !== "" ? "\n" : "") + message)
    }

    async function updateOrnitheDependencies() {
        if (possibleVersions.some(version => versionSelectorInput.value === version)) {
            const minecraftVersion = versionSelectorInput.value;
            setExtraMsg("");

            setDependencyBlockLines("ornithe-dependencies", await constructOrnitheDependenciesMessage(minecraftVersion));

            const gen = Object.entries(genSelectorRadios).find(([_, button]) => button.checked)[0];

            const mergedFeatherBuild = await getLatestFeatherBuild(gen, minecraftVersion);

            if (mergedFeatherBuild != null) {
                hideDependencyBlock("ornithe-dependencies-client");
                hideDependencyBlock("ornithe-dependencies-server");
            }


            if (mergedFeatherBuild != null) {
                // for gen1, Feather builds for Minecraft 1.3+ are for all sides
                // for gen2, Feather builds for all Minecraft versions are for all sides
                appendDependencyBlockLines("ornithe-dependencies", await getOrnitheDependenciesForMerged(gen, minecraftVersion, mergedFeatherBuild));

                // Raven, Sparrow, Nests builds for Minecraft versions between b1.0 and 1.3
                // are for one side only, regardless of the intermediary gen
                appendDependencyBlockLines("ornithe-dependencies", await getOrnitheDependenciesForSplit(gen, minecraftVersion, "client", null));
                appendDependencyBlockLines("ornithe-dependencies", await getOrnitheDependenciesForSplit(gen, minecraftVersion, "server", null));
            } else {
                // this block is only reached for gen1 for Minecraft versions older than 1.3
                // where Feather builds are for one side only
                const clientFeatherBuild = await getLatestFeatherBuild(gen, `${minecraftVersion}-client`);
                const serverFeatherBuild = await getLatestFeatherBuild(gen, `${minecraftVersion}-server`);
                setDependencyBlockLines("ornithe-dependencies-client", await getOrnitheDependenciesForSplit(gen, minecraftVersion, "client", clientFeatherBuild));
                setDependencyBlockLines("ornithe-dependencies-server", await getOrnitheDependenciesForSplit(gen, minecraftVersion, "server", serverFeatherBuild));

                // Raven, Sparrow, Nests builds for Minecraft versions older than b1.0
                // or newer than 1.3 are for all sides, regardless of the intermediary gen
                appendDependencyBlockLines("ornithe-dependencies", await getOrnitheDependenciesForMerged(gen, minecraftVersion, null));
            }

            if (gen === "gen2") {
                addExtraMsg("Make sure to use the \"gen2\" mod template!");
            } else if (mergedFeatherBuild != null) {
                addExtraMsg("Make sure to use the \"merged\" mod template for this Minecraft version!");
            } else {
                addExtraMsg("Make sure to use the \"split\" mod template for this Minecraft version!");
            }
            setDependencyBlockLines("ornithe-dependencies-fmj", await getFmjDependenciesNote(minecraftVersion));
        } else {
            document.getElementById("ornithe-dependencies").innerText = "Please select a valid Minecraft version!";
            hideDependencyBlock("ornithe-dependencies-client");
            hideDependencyBlock("ornithe-dependencies-server");
            hideDependencyBlock("ornithe-dependencies-fmj");
            setExtraMsg("");
        }
    }

    function appendDependencyBlockLines(blockId, lines) {
        let elem = document.getElementById(blockId);
        elem.innerText = (elem.innerText.split("\n").concat(lines)).join("\n");
    }

    function setDependencyBlockLines(blockId, lines) {
        let elem = document.getElementById(blockId);
        elem.style = "";
        elem.innerText = lines.join("\n");
    }

    function hideDependencyBlock(blockId) {
        let elem = document.getElementById(blockId);
        elem.style = "display: none;"
        elem.innerText = "";
    }

    async function getFmjDependenciesNote(minecraftVersion) {
        let version = await normalizeMinecraftVersion(minecraftVersion);

        let text = ["### fabric.mod.json "];
        text.push(`"minecraft": "${version}"`);
        return text;
    }

    async function constructOrnitheDependenciesMessage(minecraftVersion) {
        let lines = [
            "### <project root>/gradle.properties",
            "# Dependencies"
        ];

        const loader = Object.entries(loaderSelectorRadios).find(([_, button]) => button.checked)[0];

        const loaderVersion = await getLatestLoader(loader);
        const oslVersion = await getLatestOsl();

        lines.push(
            `minecraft_version = ${minecraftVersion}`,
            `loader_version = ${loaderVersion}`,
            `osl_version = ${oslVersion}`
        );

        return lines;
    }

    async function getOrnitheDependenciesForMerged(gen, minecraftVersion, featherBuild) {
        const lines = [];

        const ravenBuild = await getLatestRavenBuild(minecraftVersion);
        const sparrowBuild = await getLatestSparrowBuild(minecraftVersion);
        const nestsBuild = await getLatestNestsBuild(minecraftVersion);

        if (featherBuild !== null) {
            lines.push(`feather_build = ${featherBuild}`);
        }
        if (ravenBuild !== null) {
            lines.push(`raven_build = ${ravenBuild}`);
        }
        if (sparrowBuild !== null) {
            lines.push(`sparrow_build = ${sparrowBuild}`);
        }
        if (nestsBuild !== null) {
            lines.push(`nests_build = ${nestsBuild}`);
        }
        return lines
    }

    async function getOrnitheDependenciesForSplit(gen, minecraftVersion, environment, featherBuild) {
        const ravenBuild = await getLatestRavenBuild(`${minecraftVersion}-${environment}`);
        const sparrowBuild = await getLatestSparrowBuild(`${minecraftVersion}-${environment}`);
        const nestsBuild = await getLatestNestsBuild(`${minecraftVersion}-${environment}`);

        if (featherBuild !== null || ravenBuild !== null || sparrowBuild !== null || nestsBuild !== null) {
            let lines = [];
            if (gen === "gen1") {
                lines.push(`### <project root>/${environment}/gradle.properties`)
                lines.push(`environment = ${environment}`)
            } else {
                lines.push("")
            }

            // the gen1 mod template uses a subproject structure
            // similar properties can have the same name in different subprojects
            const prefix = gen === "gen1" ? "" : `${environment}_`;

            if (featherBuild != null) {
                lines.push(`feather_build = ${featherBuild}`);
            }
            if (ravenBuild !== null) {
                lines.push(`${prefix}raven_build = ${ravenBuild}`);
            }
            if (sparrowBuild !== null) {
                lines.push(`${prefix}sparrow_build = ${sparrowBuild}`);
            }
            if (nestsBuild !== null) {
                lines.push(`${prefix}nests_build = ${nestsBuild}`);
            }
            return lines;
        }
        return [];
    }

    Object.entries(loaderSelectorRadios).forEach(([_, button]) => button.addEventListener("change", async _ => await updateOrnitheDependencies()));

    versionSelectorInput.addEventListener("input", async _ => await updateOrnitheDependencies())

    allowSnapshotsCheck.addEventListener("change", async _ => {
        updateVersionList();
        await updateOrnitheDependencies();
    })

    featherGenSelector.addEventListener("change", async (e) => {
        const gen = Object.entries(genSelectorRadios).find(([_, button]) => button === e.target)[0];
        minecraftStableVersions = await getMinecraftStableVersions(gen);
        minecraftAllVersions = await getMinecraftVersions(gen);

        updateVersionList();
        // Update the dependencies message since it depends on the feather gen
        await updateOrnitheDependencies();
    })

    function updateVersionList() {
        if (allowSnapshotsCheck.checked) {
            possibleVersions = minecraftAllVersions;
        } else {
            possibleVersions = minecraftStableVersions;
        }

        while (versionListElement.firstChild) versionListElement.removeChild(versionListElement.lastChild);
        possibleVersions.forEach(e => {
            const opt = new Option();
            opt.value = e;
            versionListElement.appendChild(opt);
        });
    }

    updateVersionList()
    await updateOrnitheDependencies()

})()
