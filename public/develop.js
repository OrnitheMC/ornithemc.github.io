(async () => {

    const URL = "ornithemc.net";
    const META = "meta." + URL;
    const VERSION = "v3";


    function makeMetaUrl(...pathComponents) {
        let url = META + "/" + VERSION;
        for (const pathComponent of pathComponents) {
            url += "/";
            url += pathComponent;
        }
        return "https://" + url;
    }

    async function getFromMeta(...pathComponents) {
        const response = await fetch(makeMetaUrl(...pathComponents));
        return response.json();
    }

    async function getMinecraftVersionsMeta() {
        return await getFromMeta("versions", "game");
    }

    async function getFeatherVersionMeta(mcVersion) {
        return await getFromMeta("versions", "feather", mcVersion);
    }

    async function getRavenVersionMeta(mcVersion) {
        return await getFromMeta("versions", "raven", mcVersion);
    }

    async function getSparrowVersionMeta(mcVersion) {
        return await getFromMeta("versions", "sparrow", mcVersion);
    }

    async function getNestsVersionMeta(mcVersion) {
        return await getFromMeta("versions", "nests", mcVersion);
    }

    async function getLoaderVersionsMeta(loader) {
        return await getFromMeta("versions", loader + "-loader");
    }

    async function getOslVersionsMeta() {
        return await getFromMeta("versions", "osl");
    }

    function compareVersion(sv1, sv2) {
        function rec(v1, v2) {
            if (v1.length === 0 && v2.length === 0) return 0;
            if (v1.length === 0) return 1;
            if (v2.length === 0) return -1;
            const [head1, ...tail1] = v1;
            const [head2, ...tail2] = v2;
            const ih1 = parseInt(head1);
            const ih2 = parseInt(head2);
            if (ih1 < ih2) return 1;
            if (ih1 > ih2) return -1;
            return rec(tail1, tail2);
        }

        return rec(sv1.split("."), sv2.split("."));
    }

    async function getMinecraftVersions() {
        return await getMinecraftVersionsMeta()
            .then(l => l.map(v => v.version));
    }

    async function getMinecraftStableVersions() {
        return await getMinecraftVersionsMeta()
            .then(l => l.filter(v => v.stable))
            .then(l => l.map(v => v.version));
    }

    async function getLatestFeatherBuild(mcVersion) {
        return await getFeatherVersionMeta(mcVersion)
            .then(l => l.sort((e1, e2) => e2.build - e1.build))
            .then(s => { console.log(s); return s; })
            .then(([head, ..._]) => head)
            .then(e => e !== undefined ? e.build : null);
    }

    async function getLatestRavenBuild(mcVersion) {
        return await getRavenVersionMeta(mcVersion)
            .then(l => l.sort((e1, e2) => e2.build - e1.build))
            .then(([head, ..._]) => head)
            .then(e => e !== undefined ? e.build : null);
    }

    async function getLatestSparrowBuild(mcVersion) {
        return await getSparrowVersionMeta(mcVersion)
            .then(l => l.sort((e1, e2) => e2.build - e1.build))
            .then(([head, ..._]) => head)
            .then(e => e !== undefined ? e.build : null);
    }

    async function getLatestNestsBuild(mcVersion) {
        return await getNestsVersionMeta(mcVersion)
            .then(l => l.sort((e1, e2) => e2.build - e1.build))
            .then(([head, ..._]) => head)
            .then(e => e !== undefined ? e.build : null);
    }

    async function getLatestLoader(loader) {
        return await getLoaderVersionsMeta(loader)
            .then(l => l.filter(e => e.stable))
            .then(([head, ..._]) => head)
            .then(e => e.version);
    }

    async function getLatestOsl() {
        return await getOslVersionsMeta()
            .then(l => l.sort((e1, e2) => compareVersion(e1.version, e2.version)))
            .then(([head, ..._]) => head)
            .then(e => e.version);
    }

    const minecraftStableVersions = await getMinecraftStableVersions();
    const minecraftAllVersions = await getMinecraftVersions();

    let possibleVersions;

    const loaderSelectorRadios = { fabric: document.getElementById("mod-loader-fabric"), quilt: document.getElementById("mod-loader-quilt") }
    const versionSelectorInput = document.getElementById("mc-version");
    const versionListElement = document.getElementById("version-list");
    const allowSnapshotsCheck = document.getElementById("allow-snapshots");

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
        setExtraMsg("");
        if (possibleVersions.some(version => versionSelectorInput.value === version)) {
            document.getElementById("ornithe-dependencies").innerText = await constructOrnitheDependenciesMessage();
        }
    }

    async function constructOrnitheDependenciesMessage() {
        let lines = [
            "### <project root>/gradle.properties",
            "# Dependencies"
        ];

        const loader = Object.entries(loaderSelectorRadios).find(([_, button]) => button.checked)[0];

        const minecraftVersion = versionSelectorInput.value;
        const loaderVersion = await getLatestLoader(loader);
        const oslVersion = await getLatestOsl();

        lines.push(
            `minecraft_version = ${minecraftVersion}`,
            `loader_version = ${loaderVersion}`,
            `osl_version = ${oslVersion}`
        );

        const featherBuild = await getLatestFeatherBuild(minecraftVersion);

        if (featherBuild !== null) {
            addExtraMsg("Make sure to use the \"merged\" mod template for this Minecraft version!");

            lines = lines.concat(await getOrnitheDependenciesForMerged(minecraftVersion, featherBuild));
        } else {
            addExtraMsg("Make sure to use the \"split\" mod template for this Minecraft version!");

            lines = lines.concat(await getOrnitheDependenciesForSplit(minecraftVersion, "client"));
            lines = lines.concat(await getOrnitheDependenciesForSplit(minecraftVersion, "server"));
        }

        return lines.join("\n");
    }

    async function getOrnitheDependenciesForMerged(minecraftVersion, featherBuild) {
        lines = [];

        const ravenBuild = await getLatestRavenBuild(minecraftVersion);
        const sparrowBuild = await getLatestSparrowBuild(minecraftVersion);
        const nestsBuild = await getLatestNestsBuild(minecraftVersion);

        lines.push(`feather_build = ${featherBuild}`);
        if (ravenBuild !== null) {
            lines.push(`raven_build = ${ravenBuild}`);
        } else {
            addExtraMsg("Raven is unavailable for this Minecraft version - make sure to edit your build.gradle appropriately!");
        }
        if (sparrowBuild !== null) {
            lines.push(`sparrow_build = ${sparrowBuild}`);
        } else {
            addExtraMsg("Sparrow is unavailable for this Minecraft version - make sure to edit your build.gradle appropriately!");
        }
        if (nestsBuild !== null) {
            lines.push(`nests_build = ${nestsBuild}`);
        } else {
            addExtraMsg("Nests are unavailable for this Minecraft version - make sure to edit your build.gradle appropriately!");
        }

        return lines;
    }

    async function getOrnitheDependenciesForSplit(minecraftVersion, environment) {
        const featherBuild = await getLatestFeatherBuild(`${minecraftVersion}-${environment}`);

        if (featherBuild !== null) {
            const lines = [
                "",
                `### <project root>/${environment}/gradle.properties`,
                `environement = ${environment}`
            ];

            const ravenBuild = await getLatestRavenBuild(minecraftVersion);
            if (ravenBuild === null) {
                ravenBuild = await getLatestRavenBuild(`${minecraftVersion}-${environment}`);
            }
            const sparrowBuild = await getLatestSparrowBuild(minecraftVersion);
            if (sparrowBuild === null) {
                sparrowBuild = await getLatestSparrowBuild(`${minecraftVersion}-${environment}`);
            }
            const nestsBuild = await getLatestNestsBuild(minecraftVersion);
            if (nestsBuild === null) {
                nestsBuild = await getLatestNestsBuild(`${minecraftVersion}-${environment}`);
            }

            lines.push(`feather_build = ${featherBuild}`);
            if (ravenBuild !== null) {
                lines.push(`raven_build = ${ravenBuild}`);
            } else {
                addExtraMsg(`Raven is unavailable on the ${environment} for this Minecraft version - make sure to edit your build.gradle appropriately!`);
            }
            if (sparrowBuild !== null) {
                lines.push(`sparrow_build = ${sparrowBuild}`);
            } else {
                addExtraMsg(`Sparrow is unavailable on the ${environment} for this Minecraft version - make sure to edit your build.gradle appropriately!`);
            }
            if (nestsBuild !== null) {
                lines.push(`nests_build = ${nestsBuild}`);
            } else {
                addExtraMsg(`Nests are unavailable on the ${environment} for this Minecraft version - make sure to edit your build.gradle appropriately!`);
            }

            return lines;
        }

        return [];
    }

    Object.entries(loaderSelectorRadios).forEach(([_, button]) => button.addEventListener("change", async _ => await updateOrnitheDependencies()));

    versionSelectorInput.addEventListener("input", async _ => await updateOrnitheDependencies())

    allowSnapshotsCheck.addEventListener("change", _ => {
        if (allowSnapshotsCheck.checked) {
            possibleVersions = minecraftAllVersions;
        } else {
            possibleVersions = minecraftStableVersions;
        }
        updateVersionList();
        updateOrnitheDependencies();
    })

    function updateVersionList() {
        const list = possibleVersions;
        while (versionListElement.firstChild) versionListElement.removeChild(versionListElement.lastChild);
        list.forEach(e => {
            const opt = new Option();
            opt.value = e;
            versionListElement.appendChild(opt);
        });
    }

    possibleVersions = minecraftStableVersions;
    updateVersionList()
    updateOrnitheDependencies()

})()
