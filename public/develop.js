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

(async () => {
    let minecraftStableVersions = await getMinecraftStableVersions("gen1");
    let minecraftAllVersions = await getMinecraftVersions("gen1");

    let possibleVersions;

    const loaderSelectorRadios = {
        fabric: document.getElementById("mod-loader-fabric"),
        quilt: document.getElementById("mod-loader-quilt")
    }
    const genSelectorRadios = {
        gen1: document.getElementById("generation-gen1"),
        gen2: document.getElementById("generation-gen2")
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
            document.getElementById("ornithe-dependencies").innerText = await constructOrnitheDependenciesMessage();
        } else {
            document.getElementById("ornithe-dependencies").innerText = "Please select a valid Minecraft version!";
            setExtraMsg("");
        }
    }

    async function constructOrnitheDependenciesMessage() {
        setExtraMsg("");

        let lines = [
            "### <project root>/gradle.properties",
            "# Dependencies"
        ];

        const loader = Object.entries(loaderSelectorRadios).find(([_, button]) => button.checked)[0];
        const gen = Object.entries(genSelectorRadios).find(([_, button]) => button.checked)[0];

        const minecraftVersion = versionSelectorInput.value;
        const loaderVersion = await getLatestLoader(loader);
        const oslVersion = await getLatestOsl();

        lines.push(
            `minecraft_version = ${minecraftVersion}`,
            `loader_version = ${loaderVersion}`,
            `osl_version = ${oslVersion}`
        );

        const featherBuild = await getLatestFeatherBuild(gen, minecraftVersion);

        if (featherBuild !== null) {
            // for gen1, Feather builds for Minecraft 1.3+ are for all sides
            // for gen2, Feather builds for all Minecraft versions are for all sides
            await addOrnitheDependenciesForBothSides(lines, gen, minecraftVersion, featherBuild);
            // Raven, Sparrow, Nests builds for Minecraft versions between b1.0 and 1.3
            // are for one side only, regardless of the intermediary gen
            await addOrnitheDependenciesForOneSide(lines, gen, minecraftVersion, "client", null);
            await addOrnitheDependenciesForOneSide(lines, gen, minecraftVersion, "server", null);
        } else {
            // this block is only reached for gen1 for Minecraft versions older than 1.3
            // where Feather builds are for one side only
            const clientFeatherBuild = await getLatestFeatherBuild(gen,`${minecraftVersion}-client`);
            const serverFeatherBuild = await getLatestFeatherBuild(gen,`${minecraftVersion}-server`);

            await addOrnitheDependenciesForOneSide(lines, gen, minecraftVersion, "client", clientFeatherBuild);
            await addOrnitheDependenciesForOneSide(lines, gen, minecraftVersion, "server", serverFeatherBuild);

            // Raven, Sparrow, Nests builds for Minecraft versions older than b1.0
            // or newer than 1.3 are for all sides, regardless of the intermediary gen
            await addOrnitheDependenciesForBothSides(lines, gen, minecraftVersion, null);
        }

        if (gen === "gen2") {
            addExtraMsg("Make sure to use the \"gen2\" mod template!");
        } else if (featherBuild !== null) {
            addExtraMsg("Make sure to use the \"merged\" mod template for this Minecraft version!");
        } else {
            addExtraMsg("Make sure to use the \"split\" mod template for this Minecraft version!");
        }

        return lines.join("\n");
    }

    async function addOrnitheDependenciesForBothSides(lines, gen, minecraftVersion, featherBuild) {
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
    }

    async function addOrnitheDependenciesForOneSide(lines, gen, minecraftVersion, environment, featherBuild) {
        const ravenBuild = await getLatestRavenBuild(`${minecraftVersion}-${environment}`);
        const sparrowBuild = await getLatestSparrowBuild(`${minecraftVersion}-${environment}`);
        const nestsBuild = await getLatestNestsBuild(`${minecraftVersion}-${environment}`);

        if (featherBuild !== null || ravenBuild !== null || sparrowBuild !== null || nestsBuild !== null) {
            lines.push("");
            if (gen === "gen1") {
                lines.push(`### <project root>/${environment}/gradle.properties`)
                lines.push(`environment = ${environment}`)
            }

            // the gen1 mod template uses a subproject structure
            // similar properties can have the same name in different subprojects
            const prefix = gen === "gen1" ? "" : `${environment}_`;

            if (featherBuild !== null) {
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
        }
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
