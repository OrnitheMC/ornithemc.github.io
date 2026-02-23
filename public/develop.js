import {
    getMinecraftVersions,
    getLatestLoaderVersion,
    getLatestOslVersion,
    getLatestFeatherBuilds,
    getLatestRavenBuilds,
    getLatestSparrowBuilds,
    getLatestNestsBuilds,
    getLoomVersions,
    getPloceusVersions,
    getVersionDetails,
    isSharedVersioning
} from "./meta_maven_utils.js";

import { normalizeMinecraftVersion } from "./minecraft_semver.js";

(async () => {
    const FABRIC_LOOM = "net.fabricmc.fabric-loom-remap"
    const QUILT_LOOM = "org.quiltmc.loom.remap"
    const PLOCEUS = "ploceus"

    const FABRIC_LOADER = "net.fabricmc:fabric-loader"
    const QUILT_LOADER = "org.quiltmc:quilt-loader"

    const minecraftVersionSelector = document.getElementById("mc-version");
    const minecraftVersionList = document.getElementById("version-list");
    const calamusGenSelector = document.getElementById("calamus-gen-selectors");
    const calamusGenSelectorRadios = {
        gen1: document.getElementById("generation-gen1"),
        gen2: document.getElementById("generation-gen2")
    }
    const modLoaderSelector = document.getElementById("mod-loader-selectors");
    const modLoaderSelectorRadios = {
        fabric: document.getElementById("mod-loader-fabric"),
        quilt: document.getElementById("mod-loader-quilt")
    }
    const dependencyManagementSelector = document.getElementById("dependency-management-selectors");
    const dependencyManagementSelectorRadios = {
        propertiesFile: document.getElementById("dependency-properties-file"),
        versionCatalog: document.getElementById("dependency-version-catalog")
    }
    
    let minecraftVersions = [];

    function selectedMinecraftVersion() {
        return minecraftVersionSelector.value;
    }

    function selectedCalamusGeneration() {
        return Object.entries(calamusGenSelectorRadios).find(([_, button]) => button.checked)[0];
    }

    function selectedModLoader() {
        return Object.entries(modLoaderSelectorRadios).find(([_, button]) => button.checked)[0];
    }

    function selectedDependencyManagement() {
        return Object.entries(dependencyManagementSelectorRadios).find(([_, button]) => button.checked)[0];
    }

    function isStable(version) {
        return !version.includes("-");
    }

    function significantPrefix(version) {
        return version.split(".").splice(0, 2).join(".");
    }

    function highestCompatibleVersions(loomVersions, ploceusVersions) {
        // Map of major.minor -> latest patch of the same major.minor
        const ploceusLookup = new Map(ploceusVersions.reverse().filter(isStable).map(version => {
            return [significantPrefix(version), version];
        }));

        for (const loomVersion of loomVersions) {
            if (!isStable(loomVersion)) {
                continue;
            }

            const prefix = significantPrefix(loomVersion);
            const ploceusVersion = ploceusLookup.get(prefix);

            if (ploceusVersion) {
                return [loomVersion, ploceusVersion];
            }
        }

        throw new Error("Unable to compute recommended Loom and Ploceus versions");
    }

    async function updateDisplayedElements() {
        const minecraftVersion = selectedMinecraftVersion();
        const intermediaryGen = selectedCalamusGeneration();
        const modLoader = selectedModLoader();
        const dependencyManagement = selectedDependencyManagement();

        if (minecraftVersions.includes(minecraftVersion)) {
            const versionDetails = await getVersionDetails(intermediaryGen, minecraftVersion);

            const [loaderVersion, loomVersions, ploceusVersions, featherBuilds, ravenBuilds, sparrowBuilds, nestsBuilds, oslVersion] = await Promise.all(
                [
                    getLatestLoaderVersion(modLoader),
                    getLoomVersions(modLoader),
                    getPloceusVersions(),
                    getLatestFeatherBuilds(intermediaryGen, versionDetails),
                    getLatestRavenBuilds(versionDetails),
                    getLatestSparrowBuilds(versionDetails),
                    getLatestNestsBuilds(versionDetails),
                    getLatestOslVersion(intermediaryGen),
                ]
            );

            const sharedVersioning = isSharedVersioning(versionDetails);
            const [loomVersion, ploceusVersion] = highestCompatibleVersions(loomVersions, ploceusVersions);

            // wait for requests to finish to avoid flicker
            hideElements();
            wipeElementContents();

            showElement("build.gradle");

            switch (dependencyManagement) {
                case "propertiesFile":
                    showElement("gradle.properties");
                    break;
                case "versionCatalog":
                    showElement("version-catalog");
                    await displayVersionCatalog(versionDetails, intermediaryGen, modLoader, loaderVersion, loomVersion, ploceusVersion, featherBuilds, ravenBuilds, sparrowBuilds, nestsBuilds, oslVersion);
                    break;
                default:
                    throw new Error(`Unknown dependency management type ${dependencyManagement}`);
            }

            const singleProject = (intermediaryGen != "gen1" || !sharedVersioning || versionDetails.sharedMappings || !versionDetails.client || !versionDetails.server);

            if (singleProject) {
                await displayBuildScript(versionDetails, intermediaryGen, modLoader, loaderVersion, loomVersion, ploceusVersion, featherBuilds, ravenBuilds, sparrowBuilds, nestsBuilds, oslVersion, dependencyManagement);

                if (dependencyManagement === "propertiesFile") {
                    await displayProjectProperties(versionDetails, intermediaryGen, modLoader, loaderVersion, featherBuilds, ravenBuilds, sparrowBuilds, nestsBuilds, oslVersion);
                }
            } else {
                await displayBuildScriptForGen1Split("root", versionDetails, intermediaryGen, modLoader, loaderVersion, loomVersion, ploceusVersion, featherBuilds, ravenBuilds, sparrowBuilds, nestsBuilds, oslVersion, dependencyManagement);

                if (dependencyManagement === "propertiesFile") {
                    await displayProjectPropertiesForGen1Split("root", versionDetails, intermediaryGen, modLoader, loaderVersion, featherBuilds, ravenBuilds, sparrowBuilds, nestsBuilds, oslVersion, dependencyManagement);
                }

                if (versionDetails.client) {
                    showElement("client.build.gradle");
                    showElement("client.gradle.properties");

                    await displayBuildScriptForGen1Split("client", versionDetails, intermediaryGen, modLoader, loaderVersion, loomVersion, ploceusVersion, featherBuilds, ravenBuilds, sparrowBuilds, nestsBuilds, oslVersion, dependencyManagement);
                    await displayProjectPropertiesForGen1Split("client", versionDetails, intermediaryGen, modLoader, loaderVersion, featherBuilds, ravenBuilds, sparrowBuilds, nestsBuilds, oslVersion, dependencyManagement);
                }
                if (versionDetails.server) {
                    showElement("server.build.gradle");
                    showElement("server.gradle.properties");

                    await displayBuildScriptForGen1Split("server", versionDetails, intermediaryGen, modLoader, loaderVersion, loomVersion, ploceusVersion, featherBuilds, ravenBuilds, sparrowBuilds, nestsBuilds, oslVersion, dependencyManagement);
                    await displayProjectPropertiesForGen1Split("server", versionDetails, intermediaryGen, modLoader, loaderVersion, featherBuilds, ravenBuilds, sparrowBuilds, nestsBuilds, oslVersion, dependencyManagement);
                }
            }

            switch (modLoader) {
                case "fabric":
                    showElement("fabric.mod.json");
                    await displayFabricModMetadata(versionDetails, intermediaryGen, modLoader, loaderVersion, featherBuilds, ravenBuilds, sparrowBuilds, nestsBuilds, oslVersion);
                    break;
                case "quilt":
                    showElement("quilt.mod.json");
                    await displayQuiltModMetadata(versionDetails, intermediaryGen, modLoader, loaderVersion, featherBuilds, ravenBuilds, sparrowBuilds, nestsBuilds, oslVersion);
                    break;
                default:
                    throw new Error("unknown mod loader " + modLoader);
            }
        } else {
            hideElements();
        }
    }

    function generatePluginDefinition(id, alias, version, dependencyManagement, apply = true) {
        switch (dependencyManagement) {
            case "versionCatalog":
                if (apply) {
                    return `alias(libs.plugins.${alias})`
                } else {
                    return `alias(libs.plugins.${alias}).apply(false)`
                }
            case "propertiesFile":
                if (apply) {
                    return `id '${id}' version '${version}'`
                } else {
                    return `id '${id}' version '${version}' apply false`
                }
            default:
                throw new Error(`Unknown dependency management type ${dependencyManagement}`);
        }
    }

    function generateVersionAccessor(property, dependencyManagement, alias = null, useProject = false) {
        switch (dependencyManagement) {
            case "propertiesFile":
                return `project.${property}`
            case "versionCatalog":
                if (!alias) {
                    alias = property.replace(/_/g, ".");
                }

                const prefix = useProject ? "project." : "";
                return `${prefix}libs.versions.${alias}.get()`
            default:
                throw new Error(`Unknown dependency management type ${dependencyManagement}`);
        }
    }

    function generateDependencyDefinition(id, alias, version, dependencyManagement, useProject = false) {
        switch (dependencyManagement) {
            case "versionCatalog":
                const prefix = useProject ? "project." : "";
                return `${prefix}libs.${alias}`
            case "propertiesFile":
                return `"${id}:${version}"`
            default:
                throw new Error(`Unknown dependency management type ${dependencyManagement}`);
        }
    }

    async function displayBuildScript(minecraftVersion, intermediaryGen, modLoader, loaderVersion, loomVersion, ploceusVersion, featherBuilds, ravenBuilds, sparrowBuilds, nestsBuilds, oslVersion, dependencyManagement) {
        const sharedVersioning = isSharedVersioning(minecraftVersion);
        const elementId = "build.gradle.content";

        const plugins = [
            "\tid 'java'"
        ];

        switch (modLoader) {
            case "fabric":
                plugins.push(`\t${generatePluginDefinition(FABRIC_LOOM, "loom", loomVersion, dependencyManagement)}`);
                break;
            case "quilt":
                plugins.push(`\t${generatePluginDefinition(QUILT_LOOM, "loom", loomVersion, dependencyManagement)}`);
                break;
            default:
                throw new Error("unknown mod loader " + modLoader);
        }

        plugins.push(`\t${generatePluginDefinition(PLOCEUS, "ploceus", ploceusVersion, dependencyManagement)}`);

        if (plugins) {
            plugins.unshift("plugins {");
            plugins.push("}");

            displayCodeBlockLines(elementId, plugins);
        }

        const loomCommands = [];
        const ploceusCommands = [
            `\tsetIntermediaryGeneration(${intermediaryGen.substring(3)})`
        ]

        if (!minecraftVersion.client || !minecraftVersion.server) {
            if (minecraftVersion.client) {
                loomCommands.push("\tclientOnlyMinecraftJar()");
                if (intermediaryGen == "gen1") {
                    ploceusCommands.push("\tclientOnlyMappings()");
                }
            }
            if (minecraftVersion.server) {
                loomCommands.push("\tserverOnlyMinecraftJar()");
                if (intermediaryGen == "gen1") {
                    ploceusCommands.push("\tserverOnlyMappings()");
                }
            }
        }

        if (loomCommands) {
            loomCommands.unshift("loom {");
            loomCommands.unshift(""); // empty line between blocks
            loomCommands.push("}");

            displayCodeBlockLines(elementId, loomCommands);
        }
        if (ploceusCommands) {
            ploceusCommands.unshift("ploceus {");
            ploceusCommands.unshift(""); // empty line between blocks
            ploceusCommands.push("}");

            displayCodeBlockLines(elementId, ploceusCommands);
        }

        const dependencies = [
            `\tminecraft ${generateDependencyDefinition("com.mojang:minecraft", "minecraft", "${project.minecraft_version}", dependencyManagement)}`
        ];

        switch (modLoader) {
            case "fabric":
                dependencies.push(`\tmodImplementation ${generateDependencyDefinition(FABRIC_LOADER, "loader", "${project.loader_version}", dependencyManagement)}`)
                break;
            case "quilt":
                dependencies.push(`\tmodImplementation ${generateDependencyDefinition(QUILT_LOADER, "loader", "${project.loader_version}", dependencyManagement)}`)
                break;
            default:
                throw new Error("unknown mod loader " + modLoader);
        }

        dependencies.push("");
        dependencies.push(`\tmappings ploceus.featherMappings(${generateVersionAccessor("feather_build", dependencyManagement)})`);
        
        if (ravenBuilds.merged != null) {
            if (sharedVersioning || intermediaryGen != "gen1") {
                dependencies.push(`\texceptions ploceus.raven(${generateVersionAccessor("raven_build", dependencyManagement)})`);
            } else {
                dependencies.push(`\texceptions ploceus.raven(${generateVersionAccessor("raven_build", dependencyManagement)}, '${minecraftVersion.client ? "client" : "server"}')`);
            }
        } else {
            if (ravenBuilds.client != null) {
                dependencies.push(`\tclientExceptions ploceus.raven(${generateVersionAccessor("client_raven_build", dependencyManagement)}, 'client')`);
            }
            if (ravenBuilds.server != null) {
                dependencies.push(`\tserverExceptions ploceus.raven(${generateVersionAccessor("server_raven_build", dependencyManagement)}, 'server')`);
            }
        }

        if (sparrowBuilds.merged != null) {
            if (sharedVersioning || intermediaryGen != "gen1") {
                dependencies.push(`\tsignatures ploceus.sparrow(${generateVersionAccessor("sparrow_build", dependencyManagement)})`);
            } else {
                dependencies.push(`\tsignatures ploceus.sparrow(${generateVersionAccessor("sparrow_build", dependencyManagement)}, '${minecraftVersion.client ? "client" : "server"}')`);
            }
        } else {
            if (sparrowBuilds.client != null) {
                dependencies.push(`\tclientSignatures ploceus.sparrow(${generateVersionAccessor("client_sparrow_build", dependencyManagement)}, 'client')`);
            }
            if (sparrowBuilds.server != null) {
                dependencies.push(`\tserverSignatures ploceus.sparrow(${generateVersionAccessor("server_sparrow_build", dependencyManagement)}, 'server')`);
            }
        }

        if (nestsBuilds.merged != null) {
            if (sharedVersioning || intermediaryGen != "gen1") {
                dependencies.push(`\tnests ploceus.nests(${generateVersionAccessor("nests_build", dependencyManagement)})`);
            } else {
                dependencies.push(`\tnests ploceus.nests(${generateVersionAccessor("nests_build", dependencyManagement)}, '${minecraftVersion.client ? "client" : "server"}')`);
            }
        } else {
            if (nestsBuilds.client != null) {
                dependencies.push(`\tclientNests ploceus.nests(${generateVersionAccessor("client_nests_build", dependencyManagement)}, 'client')`);
            }
            if (nestsBuilds.server != null) {
                dependencies.push(`\tserverNests ploceus.nests(${generateVersionAccessor("server_nests_build", dependencyManagement)}, 'server')`);
            }
        }

        if (oslVersion != null) {
            dependencies.push("");
            dependencies.push(`\tploceus.dependOsl(${generateVersionAccessor("osl_version", dependencyManagement, "osl")})`);
        }

        if (dependencies) {
            dependencies.unshift("dependencies {");
            dependencies.unshift(""); // empty line between blocks
            dependencies.push("}");

            displayCodeBlockLines(elementId, dependencies);
        }
    }

    async function displayBuildScriptForGen1Split(project, minecraftVersion, intermediaryGen, modLoader, loaderVersion, loomVersion, ploceusVersion, featherBuilds, ravenBuilds, sparrowBuilds, nestsBuilds, oslVersion, dependencyManagement) {
        if (project == "root") {
            const elementId = "build.gradle.content";

            let plugins = [
                "\tid 'java'"
            ];

            switch (modLoader) {
                case "fabric":
                    plugins.push(`\t${generatePluginDefinition(FABRIC_LOOM, "loom", loomVersion, dependencyManagement, false)}`);
                    break;
                case "quilt":
                    plugins.push(`\t${generatePluginDefinition(QUILT_LOOM, "loom", loomVersion, dependencyManagement, false)}`);
                    break;
                default:
                    throw new Error("unknown mod loader " + modLoader);
            }

            plugins.push(`\t${generatePluginDefinition(PLOCEUS, "ploceus", ploceusVersion, dependencyManagement, false)}`);

            if (plugins) {
                plugins.unshift("plugins {");
                plugins.push("}");

                displayCodeBlockLines(elementId, plugins);
            }

            displayCodeBlockLines(elementId, [
                "",
                "def configure(project) {"
            ]);

            plugins = [
                "\t\tproject.apply plugin: 'java'"
            ];

            switch (modLoader) {
                case "fabric":
                    plugins.push(`\t\tproject.apply plugin: '${FABRIC_LOOM}'`);
                    break;
                case "quilt":
                    plugins.push(`\t\tproject.apply plugin: '${QUILT_LOOM}'`);
                    break;
                default:
                    throw new Error("unknown mod loader " + modLoader);
            }

            plugins.push(`\t\tproject.apply plugin: '${PLOCEUS}'`);

            if (plugins) {
                plugins.unshift("\tproject.plugins {");
                plugins.push("\t}");

                displayCodeBlockLines(elementId, plugins);
            }

            const loomCommands = [];
            const ploceusCommands = [
                `\t\tsetIntermediaryGeneration(${intermediaryGen.substring(3)})`
            ]

            loomCommands.push("\t\tif (project.environment == 'client') {");
            loomCommands.push("\t\t\tclientOnlyMinecraftJar()");
            loomCommands.push("\t\t}");
            loomCommands.push("\t\tif (project.environment == 'server') {");
            loomCommands.push("\t\t\tserverOnlyMinecraftJar()");
            loomCommands.push("\t\t}");
            
            ploceusCommands.push("");
            ploceusCommands.push("\t\tif (project.environment == 'client') {");
            ploceusCommands.push("\t\t\tclientOnlyMappings()");
            ploceusCommands.push("\t\t}");
            ploceusCommands.push("\t\tif (project.environment == 'server') {");
            ploceusCommands.push("\t\t\tserverOnlyMappings()");
            ploceusCommands.push("\t\t}");

            if (loomCommands) {
                loomCommands.unshift("\tproject.loom {");
                loomCommands.unshift(""); // empty line between blocks
                loomCommands.push("\t}");

                displayCodeBlockLines(elementId, loomCommands);
            }
            if (ploceusCommands) {
                ploceusCommands.unshift("\tproject.ploceus {");
                ploceusCommands.unshift(""); // empty line between blocks
                ploceusCommands.push("\t}");

                displayCodeBlockLines(elementId, ploceusCommands);
            }

            const dependencies = [
                `\t\tminecraft ${generateDependencyDefinition("com.mojang:minecraft", "minecraft", "${project.minecraft_version}", dependencyManagement, true)}`
            ];

            switch (modLoader) {
                case "fabric":
                    dependencies.push(`\t\tmodImplementation ${generateDependencyDefinition(FABRIC_LOADER, "loader", "${project.loader_version}", dependencyManagement, true)}`)
                    break;
                case "quilt":
                    dependencies.push(`\t\tmodImplementation ${generateDependencyDefinition(QUILT_LOADER, "loader", "${project.loader_version}", dependencyManagement, true)}`)
                    break;
                default:
                    throw new Error("unknown mod loader " + modLoader);
            }

            dependencies.push("");

            switch (dependencyManagement) {
                case "propertiesFile":
                    dependencies.push(`\t\tmappings project.ploceus.featherMappings(project.feather_build)`);

                    if (ravenBuilds.client != null || ravenBuilds.server != null) {
                        dependencies.push(`\t\texceptions project.ploceus.raven(project.raven_build)`);
                    }

                    if (sparrowBuilds.client != null || sparrowBuilds.server != null) {
                        dependencies.push(`\t\tsignatures project.ploceus.sparrow(project.sparrow_build)`);
                    }

                    if (nestsBuilds.client != null || nestsBuilds.server != null) {
                        dependencies.push(`\t\tnests project.ploceus.nests(project.nests_build)`);
                    }
                    break;
                case "versionCatalog":
                    dependencies.push("\t\tif (project.environment == 'client') {");

                    if (featherBuilds.client !== null) {
                        dependencies.push(`\t\t\tmappings project.ploceus.featherMappings(project.libs.versions.client.feather.build.get())`);
                    }
                    if (ravenBuilds.client !== null) {
                        dependencies.push(`\t\t\texceptions project.ploceus.raven(project.libs.versions.client.raven.build.get())`);
                    }
                    if (sparrowBuilds.client !== null) {
                        dependencies.push(`\t\t\tsignatures project.ploceus.sparrow(project.libs.versions.client.sparrow.build.get())`);
                    }
                    if (nestsBuilds.client !== null) {
                        dependencies.push(`\t\t\tnests project.ploceus.nests(project.libs.versions.client.nests.build.get())`);
                    }

                    dependencies.push("\t\t}");
                    dependencies.push("\t\tif (project.environment == 'server') {");

                    if (featherBuilds.server !== null) {
                        dependencies.push(`\t\t\tmappings project.ploceus.featherMappings(project.libs.versions.server.feather.build.get())`);
                    }
                    if (ravenBuilds.server !== null) {
                        dependencies.push(`\t\t\texceptions project.ploceus.raven(project.libs.versions.server.raven.build.get())`);
                    }
                    if (sparrowBuilds.server !== null) {
                        dependencies.push(`\t\t\tsignatures project.ploceus.sparrow(project.libs.versions.server.sparrow.build.get())`);
                    }
                    if (nestsBuilds.server !== null) {
                        dependencies.push(`\t\t\tnests project.ploceus.nests(project.libs.versions.server.nests.build.get())`);
                    }

                    dependencies.push("\t\t}");
                    break;
                default:
                    throw new Error(`Unknown dependency management type ${dependencyManagement}`);
            }

            if (oslVersion != null) {
                dependencies.push("");
                dependencies.push(`\t\tproject.ploceus.dependOsl(${generateVersionAccessor("osl_version", dependencyManagement, "osl", true)}, project.environment)`);
            }

            if (dependencies) {
                dependencies.unshift("\tproject.dependencies {");
                dependencies.unshift(""); // empty line between blocks
                dependencies.push("\t}");

                displayCodeBlockLines(elementId, dependencies);
            }

            displayCodeBlockLines(elementId, ["}"]);
        } else {
            const elementId = `${project}.build.gradle.content`;

            displayCodeBlockLines(elementId, ["configure(project)"]);
        }
    }

    async function displayProjectProperties(minecraftVersion, intermediaryGen, modLoader, loaderVersion, featherBuilds, ravenBuilds, sparrowBuilds, nestsBuilds, oslVersion) {
        const elementId = "gradle.properties.content";
        const lines = [];

        lines.push(`minecraft_version = ${minecraftVersion.id}`);
        lines.push(`loader_version = ${loaderVersion}`);
        lines.push("");
        if (featherBuilds.merged != null) {
            lines.push(`feather_build = ${featherBuilds.merged}`);
        } else {
            lines.push(`feather_build = ${minecraftVersion.client ? featherBuilds.client : featherBuilds.server}`);
        }
        if (ravenBuilds.merged != null) {
            lines.push(`raven_build = ${ravenBuilds.merged}`);
        } else {
            if (ravenBuilds.client != null) {
                lines.push(`client_raven_build = ${ravenBuilds.client}`);
            }
            if (ravenBuilds.server != null) {
                lines.push(`server_raven_build = ${ravenBuilds.server}`);
            }
        }
        if (sparrowBuilds.merged != null) {
            lines.push(`sparrow_build = ${sparrowBuilds.merged}`);
        } else {
            if (sparrowBuilds.client != null) {
                lines.push(`client_sparrow_build = ${sparrowBuilds.client}`);
            }
            if (sparrowBuilds.server != null) {
                lines.push(`server_sparrow_build = ${sparrowBuilds.server}`);
            }
        }
        if (nestsBuilds.merged != null) {
            lines.push(`nests_build = ${nestsBuilds.merged}`);
        } else {
            if (nestsBuilds.client != null) {
                lines.push(`client_nests_build = ${nestsBuilds.client}`);
            }
            if (nestsBuilds.server != null) {
                lines.push(`server_nests_build = ${nestsBuilds.server}`);
            }
        }
        if (oslVersion != null) {
            lines.push("");
            lines.push(`osl_version = ${oslVersion}`);
        }

        if (lines) {
            displayCodeBlockLines(elementId, lines);
        }
    }

    async function displayVersionCatalog(minecraftVersion, intermediaryGen, modLoader, loaderVersion, loomVersion, ploceusVersion, featherBuilds, ravenBuilds, sparrowBuilds, nestsBuilds, oslVersion) {
        const elementId = "version-catalog.content";
        const lines = [];

        lines.push(`[versions]`);

        lines.push(`loader = "${loaderVersion}"`);
        lines.push(`minecraft = "${minecraftVersion.id}"`);
        lines.push(`osl = "${oslVersion}"`);

        lines.push(``);

        if (featherBuilds.merged !== null) {
            lines.push(`feather_build = "${featherBuilds.merged}"`)
        }
        if (featherBuilds.client !== null) {
            lines.push(`client_feather_build = "${featherBuilds.client}"`)
        }
        if (featherBuilds.server !== null) {
            lines.push(`server_feather_build = "${featherBuilds.server}"`)
        }

        if (nestsBuilds.merged !== null) {
            lines.push(`nests_build = "${nestsBuilds.merged}"`)
        }
        if (nestsBuilds.client !== null) {
            lines.push(`client_nests_build = "${nestsBuilds.client}"`)
        }
        if (nestsBuilds.server !== null) {
            lines.push(`server_nests_build = "${nestsBuilds.server}"`)
        }

        if (ravenBuilds.merged !== null) {
            lines.push(`raven_build = "${ravenBuilds.merged}"`)
        }
        if (ravenBuilds.client !== null) {
            lines.push(`client_raven_build = "${ravenBuilds.client}"`)
        }
        if (ravenBuilds.server !== null) {
            lines.push(`server_raven_build = "${ravenBuilds.server}"`)
        }

        if (sparrowBuilds.merged !== null) {
            lines.push(`sparrow_build = "${sparrowBuilds.merged}"`)
        }
        if (sparrowBuilds.client !== null) {
            lines.push(`client_sparrow_build = "${sparrowBuilds.client}"`)
        }
        if (sparrowBuilds.server !== null) {
            lines.push(`server_sparrow_build = "${sparrowBuilds.server}"`)
        }

        lines.push(``);
        lines.push(`loom = "${loomVersion}"`);
        lines.push(`ploceus = "${ploceusVersion}"`);

        lines.push(``);
        lines.push(`[libraries]`);

        switch (modLoader) {
            case "fabric":
                lines.push(`loader = { module = "net.fabricmc:fabric-loader", version.ref = "loader" }`);
                break;
            case "quilt":
                lines.push(`loader = { module = "org.quiltmc:quilt-loader", version.ref = "loader" }`);
                break;
            default:
                throw new Error("unknown mod loader " + modLoader);
        }

        lines.push(`minecraft = { module = "com.mojang:minecraft", version.ref = "minecraft" }`)

        lines.push(``);
        lines.push(`[plugins]`);

        lines.push(`ploceus = { id = "ploceus", version.ref = "ploceus" }`)

        switch (modLoader) {
            case "fabric":
                lines.push(`loom = { id = "${FABRIC_LOOM}", version.ref = "loom" }`)
                break;
            case "quilt":
                lines.push(`loom = { id = "${QUILT_LOOM}", version.ref = "loom" }`)
                break;
            default:
                throw new Error("unknown mod loader " + modLoader);
        }


        if (lines) {
            displayCodeBlockLines(elementId, lines);
        }
    }

    async function displayProjectPropertiesForGen1Split(project, minecraftVersion, intermediaryGen, modLoader, loaderVersion, featherBuilds, ravenBuilds, sparrowBuilds, nestsBuilds, oslVersion, dependencyManagement) {
        let elementId;
        const lines = [];
        
        if (project == "root") {
            elementId = "gradle.properties.content";

            lines.push(`minecraft_version = ${minecraftVersion.id}`);
            lines.push(`loader_version = ${loaderVersion}`);
            if (oslVersion != null) {
                lines.push("");
                lines.push(`osl_version = ${oslVersion}`);
            }

        } else {
            elementId = `${project}.gradle.properties.content`;

            lines.push(`environment = ${project}`);

            if (dependencyManagement === "propertiesFile") {
                lines.push("");

                if (project == "client") {
                    lines.push(`feather_build = ${featherBuilds.client}`);
                    if (ravenBuilds.client != null) {
                        lines.push(`raven_build = ${ravenBuilds.client}`);
                    }
                    if (sparrowBuilds.client != null) {
                        lines.push(`sparrow_build = ${sparrowBuilds.client}`);
                    }
                    if (nestsBuilds.client != null) {
                        lines.push(`nests_build = ${nestsBuilds.client}`);
                    }
                }
                if (project == "server") {
                    lines.push(`feather_build = ${featherBuilds.server}`);
                    if (ravenBuilds.server != null) {
                        lines.push(`raven_build = ${ravenBuilds.server}`);
                    }
                    if (sparrowBuilds.server != null) {
                        lines.push(`sparrow_build = ${sparrowBuilds.server}`);
                    }
                    if (nestsBuilds.server != null) {
                        lines.push(`nests_build = ${nestsBuilds.server}`);
                    }
                }
            }
        }

        if (lines) {
            displayCodeBlockLines(elementId, lines);
        }
    }

    async function displayFabricModMetadata(minecraftVersion, intermediaryGen, modLoader, loaderVersion, featherBuilds, ravenBuilds, sparrowBuilds, nestsBuilds, oslVersion) {
        const elementId = "fabric.mod.json.content";
        const lines = [];

        const normalizedVersion = await normalizeMinecraftVersion(minecraftVersion.id);

        lines.push(`{`);
        lines.push(`\t"depends": {`);
        lines.push(`\t\t"minecraft": "${normalizedVersion}"`);
        lines.push(`\t}`);
        lines.push(`}`);
        

        if (lines) {
            displayCodeBlockLines(elementId, lines);
        }
    }

    async function displayQuiltModMetadata(minecraftVersion, intermediaryGen, modLoader, loaderVersion, featherBuilds, ravenBuilds, sparrowBuilds, nestsBuilds, oslVersion) {
        const elementId = "quilt.mod.json.content";
        const lines = [];

        const normalizedVersion = await normalizeMinecraftVersion(minecraftVersion.id);

        lines.push(`{`);
        lines.push(`\t"quilt_loader" {`);
        lines.push(`\t\t"depends": [`);
        lines.push(`\t\t\t{`);
        lines.push(`\t\t\t\t"id": "minecraft"`);
        lines.push(`\t\t\t\t"versions": "${normalizedVersion}"`);
        lines.push(`\t\t\t}`);
        lines.push(`\t\t]`);
        lines.push(`\t}`);
        lines.push(`}`);

        if (lines) {
            displayCodeBlockLines(elementId, lines);
        }
    }

    function hideElements() {
        hideElement("build.gradle");
        hideElement("client.build.gradle");
        hideElement("server.build.gradle");

        hideElement("gradle.properties");
        hideElement("client.gradle.properties");
        hideElement("server.gradle.properties");
        hideElement("version-catalog");

        hideElement("fabric.mod.json");
        hideElement("quilt.mod.json");
    }

    function hideElement(id) {
        let elem = document.getElementById(id);
        elem.style = "display: none;";
    }

    function showElement(id) {
        let elem = document.getElementById(id);
        elem.style = "";
    }

    function wipeElement(id) {
        let elem = document.getElementById(id);
        elem.innerText = "";
    }

    function wipeElementContents() {
        wipeElement("build.gradle.content");
        wipeElement("client.build.gradle.content");
        wipeElement("server.build.gradle.content");

        wipeElement("gradle.properties.content");
        wipeElement("client.gradle.properties.content");
        wipeElement("server.gradle.properties.content");
        wipeElement("version-catalog.content");

        wipeElement("fabric.mod.json.content");
        wipeElement("quilt.mod.json.content");
    }

    function displayCodeBlockLines(id, lines) {
        let elem = document.getElementById(id);
        elem.innerText += lines.join("\n") + "\n";
    }

    function closeCodeBlock(id) {
        let elem = document.getElementById(id);
        while (elem.innerText.charAt(elem.innerText.length - 1) == "\n") {
            elem.innerText = elem.innerText.substring(0, elem.innerText.length - 1);
        }
    }

    function replaceCodeBlockLines(id, from, to, ...lines) {
        let elem = document.getElementById(id);
        let f = elem.innerText.indexOf(from) + from.length;
        let t = elem.innerText.indexOf(to, f);
        let pre = elem.innerText.substring(0, f);
        let suf = elem.innerText.substring(t);
        elem.innerText = pre + lines.join("\n") + "\n" + suf;
    }

    minecraftVersionSelector.addEventListener("blur", async _ => {
        await updateDisplayedElements();
    });
    modLoaderSelector.addEventListener("change", async (e) => {
        await updateDisplayedElements();
    });
    calamusGenSelector.addEventListener("change", async (e) => {
        await fetchVersions();
        await updateVersionList();
        await updateDisplayedElements();
    });
    dependencyManagementSelector.addEventListener("change", async (e) => {
        await updateDisplayedElements();
    });

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

    await fetchVersions();
    await updateVersionList();
    await updateDisplayedElements();

})()
