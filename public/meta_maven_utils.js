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

async function getVersionsFromMeta(...pathComponents) {
    let response = await getFromMeta("versions", ...pathComponents);
    return response;
}

async function getVersionsWithGenFromMeta(intermediaryGen, ...pathComponents) {
    let response = await getVersionsFromMeta(intermediaryGen, ...pathComponents);
    return response;
}

async function getMinecraftVersionsMeta(intermediaryGen) {
    return await getVersionsWithGenFromMeta(intermediaryGen, "game");
}

export async function getFeatherVersionMeta(intermediaryGen, sidedMcVersion) {
    return await getVersionsWithGenFromMeta(intermediaryGen, "feather", sidedMcVersion);
}

async function getRavenVersionMeta(sidedMcVersion) {
    return await getVersionsFromMeta("raven", sidedMcVersion);
}

async function getSparrowVersionMeta(sidedMcVersion) {
    return await getVersionsFromMeta("sparrow", sidedMcVersion);
}

async function getNestsVersionMeta(sidedMcVersion) {
    return await getVersionsFromMeta("nests", sidedMcVersion);
}

async function getLoaderVersionsMeta(loader) {
    return await getVersionsFromMeta(loader + "-loader");
}

async function getOslVersionsMeta(intermediaryGen) {
    return await getVersionsWithGenFromMeta(intermediaryGen, "osl");
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

export async function getMinecraftVersions(intermediaryGen) {
    return await getMinecraftVersionsMeta(intermediaryGen)
        .then(l => l.map(v => v.version));
}

export async function getMinecraftStableVersions(intermediaryGen) {
    return await getMinecraftVersionsMeta(intermediaryGen)
        .then(l => l.filter(v => v.stable))
        .then(l => l.map(v => v.version));
}

export async function getLatestFeatherBuilds(intermediaryGen, minecraftVersion) {
    return {
        merged: (intermediaryGen == "gen1" && !minecraftVersion.sharedMappings) ? null : await getLatestFeatherBuild(intermediaryGen, minecraftVersion.id),
        client: (intermediaryGen != "gen1" || minecraftVersion.sharedMappings || !minecraftVersion.client) ? null : await getLatestFeatherBuild(intermediaryGen, `${minecraftVersion.id}-client`),
        server: (intermediaryGen != "gen1" || minecraftVersion.sharedMappings || !minecraftVersion.server) ? null : await getLatestFeatherBuild(intermediaryGen, `${minecraftVersion.id}-server`)
    };
}

export async function getLatestFeatherBuild(intermediaryGen, sidedMcVersion) {
    return await getFeatherVersionMeta(intermediaryGen, sidedMcVersion)
        .then(l => l.sort((e1, e2) => e2.build - e1.build))
        .then(s => {
            console.log(s);
            return s;
        })
        .then(([head, ..._]) => head)
        .then(e => e !== undefined ? e.build : null);
}

export async function getLatestRavenBuilds(minecraftVersion) {
    const sharedVersioning = isSharedVersioning(minecraftVersion);

    return {
        merged: (sharedVersioning && !minecraftVersion.sharedMappings) ? null : await getLatestRavenBuild(minecraftVersion.id),
        client: (!sharedVersioning || minecraftVersion.sharedMappings || !minecraftVersion.client) ? null : await getLatestRavenBuild(`${minecraftVersion.id}-client`),
        server: (!sharedVersioning || minecraftVersion.sharedMappings || !minecraftVersion.server) ? null : await getLatestRavenBuild(`${minecraftVersion.id}-server`)
    };
}

export async function getLatestRavenBuild(sidedMcVersion) {
    return await getRavenVersionMeta(sidedMcVersion)
        .then(l => l.sort((e1, e2) => e2.build - e1.build))
        .then(([head, ..._]) => head)
        .then(e => e !== undefined ? e.build : null);
}

export async function getLatestSparrowBuilds(minecraftVersion) {
    const sharedVersioning = isSharedVersioning(minecraftVersion);

    return {
        merged: (sharedVersioning && !minecraftVersion.sharedMappings) ? null : await getLatestSparrowBuild(minecraftVersion.id),
        client: (!sharedVersioning || minecraftVersion.sharedMappings || !minecraftVersion.client) ? null : await getLatestSparrowBuild(`${minecraftVersion.id}-client`),
        server: (!sharedVersioning || minecraftVersion.sharedMappings || !minecraftVersion.server) ? null : await getLatestSparrowBuild(`${minecraftVersion.id}-server`)
    };
}

export async function getLatestSparrowBuild(sidedMcVersion) {
    return await getSparrowVersionMeta(sidedMcVersion)
        .then(l => l.sort((e1, e2) => e2.build - e1.build))
        .then(([head, ..._]) => head)
        .then(e => e !== undefined ? e.build : null);
}

export async function getLatestNestsBuilds(minecraftVersion) {
    const sharedVersioning = isSharedVersioning(minecraftVersion);

    return {
        merged: (sharedVersioning && !minecraftVersion.sharedMappings) ? null : await getLatestNestsBuild(minecraftVersion.id),
        client: (!sharedVersioning || minecraftVersion.sharedMappings || !minecraftVersion.client) ? null : await getLatestNestsBuild(`${minecraftVersion.id}-client`),
        server: (!sharedVersioning || minecraftVersion.sharedMappings || !minecraftVersion.server) ? null : await getLatestNestsBuild(`${minecraftVersion.id}-server`)
    };
}

export async function getLatestNestsBuild(sidedMcVersion) {
    return await getNestsVersionMeta(sidedMcVersion)
        .then(l => l.sort((e1, e2) => e2.build - e1.build))
        .then(([head, ..._]) => head)
        .then(e => e !== undefined ? e.build : null);
}

export async function getLatestLoaderVersion(loader) {
    return await getLoaderVersionsMeta(loader)
        .then(l => l.filter(e => e.stable))
        .then(([head, ..._]) => head)
        .then(e => e.version);
}

export async function getLatestOslVersion(intermediaryGen) {
    return await getOslVersionsMeta(intermediaryGen)
        .then(l => l.sort((e1, e2) => compareVersion(e1.version, e2.version)))
        .then(([head, ..._]) => head)
        .then(e => e.version);
}

const MAVEN = "maven." + URL;

function makeMavenUrl(...pathComponents) {
    let url = MAVEN + "/releases";
    for (const pathComponent of pathComponents) {
        url += "/";
        url += pathComponent;
    }
    return "https://" + url;
}

function makeOrnitheMavenUrl(...pathComponents) {
    return makeMavenUrl("net/ornithemc", ...pathComponents);
}

export async function getFeatherBuildMaven(intermediaryGen, sidedMcVersion) {
    let feather;
    switch (intermediaryGen) {
        case "gen1": {
            feather = "feather";
            break;
        }
        case "gen2": {
            feather = "feather-gen2";
            break;
        }
        default: {
            throw new Error("Invalid generation: " + intermediaryGen);
        }
    }
    const url = makeOrnitheMavenUrl(feather, sidedMcVersion, feather + "-" + sidedMcVersion + "-tiny.gz");
    return await fetch(url);
}

const MANIFEST = URL + "/mc-versions"

export async function getVersionDetails(intermediaryGen, minecraftVersion) {
    const url = "https://" + MANIFEST + "/" + intermediaryGen + "/version/" + minecraftVersion + ".json";
    const response = await fetch(url);
    return response.json();
}

export function isSharedVersioning(minecraftVersion) {
    const fc = minecraftVersion.id.charAt(0);
    return !(fc == 'r' || fc == 'p' || fc == 'c' || fc == 'i' || fc == 'a' || fc == 's');
}

async function getVersionsFromMavenMetadata(url) {
    const response = await fetch(url);
    const data = await response.text();

    const parser = new DOMParser();
    const document = parser.parseFromString(data, "text/xml");
    const versions = document.getElementsByTagName("version");

    const results = [];

    for (const version of versions) {
        results.push(version.textContent);
    }

    return results.sort((left, right) => compareVersion(left, right));
}

export async function getLoomVersions(modLoader) {
    let base;

    switch (modLoader) {
        case "fabric":
            base = "https://maven.fabricmc.net/net/fabricmc/fabric-loom-remap/net.fabricmc.fabric-loom-remap.gradle.plugin";
            break;
        case "quilt":
            base = "https://maven.quiltmc.org/repository/release/org/quiltmc/loom/remap/org.quiltmc.loom.remap.gradle.plugin";
            break;
        default:
            throw new Error("unknown mod loader " + modLoader);
    }

    return await getVersionsFromMavenMetadata(`${base}/maven-metadata.xml`);
}

export async function getPloceusVersions() {
    const url = `https://${MAVEN}/releases/net/ornithemc/ploceus/maven-metadata.xml`;
    return await getVersionsFromMavenMetadata(url);
}
