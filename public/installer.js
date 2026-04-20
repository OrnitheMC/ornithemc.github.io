(async () => {
    let webInstallerDiv = document.getElementById("web-installer");
    let downloadDiv = document.getElementById("platform-download");
    let platform = getPlatform();

    if (platform != "") {
        webInstallerDiv.innerHTML = "<a class=\"no-underline hover:underline\" style=\"display:inline-block\" href=\"/ornithe-installer-rs\">" +
            "<div class=\"bg-ornithe-button-bg w-fit p-2 px-4\">Install From The Web</div>" +
            "</a>";
        webInstallerDiv.style = "";

        downloadDiv.innerHTML = "<a class=\"no-underline hover:underline\" style=\"display:inline-block\" href=\"https://maven.ornithemc.net/api/maven/latest/file/releases/net/ornithemc/ornithe-installer-rs/ornithe-installer-rs-" + platform + "?extension=" + getPlatformExtension(platform) + "\">" +
            "<div class=\"bg-ornithe-button-bg w-fit p-2 px-4\">Download native installer for " + getPlatformName(platform) + "</div>" +
            "</a>";
        downloadDiv.style = "";
    }

    let nativeVersion = await getLatestVersion(platform, "ornithe-installer-rs/ornithe-installer-rs-" + platform + "?extension=" + getPlatformExtension(platform));
    setLatestVersion("native", nativeVersion.version);
    let jarVersion = await getLatestVersion(platform, "ornithe-installer");
    setLatestVersion("jar", jarVersion.version);

    async function getLatestVersion(platform, artifact) {
        const res = await fetch("https://maven.ornithemc.net/api/maven/latest/version/releases/net/ornithemc/" + artifact);
        return res.json();
    }

    function setLatestVersion(sort, version) {
        let div = document.getElementById("latest-version-" + sort);
        if (div != null) {
            div.style = "";
            div.innerHTML = "Latest Installer Version: " + version;
        }
    }

    function getPlatform() {
        let platform;
        if (navigator.userAgentData != null) {
            platform = navigator.userAgentData.platform;
        } else {
            platform = navigator.platform;
        }
        if (platform.indexOf("Linux") != -1 || platform.indexOf("X11") != -1) {
            if (platform.indexOf("aarch64") != -1) {
                return "linux-aarch64"
            }
            return "linux-x86_64";
        } else if (platform.indexOf("Win") != -1) {
            if (platform.indexOf("x86") != -1 && platform.indexOf("x86-64") == -1) {
                return "windows-x86";
            }
            if (platform.indexOf("aarch64") != -1) {
                return "windows-aarch64"
            }
            return "windows-x86_64"
        } else if (platform.indexOf("Mac") != -1) {
            return "macos-universal2"
        }
        return "";
    }

    function getPlatformName(platform) {
        if (platform.startsWith("linux")) {
            return "Linux (" + platform.substring(6) + ")"
        } else if (platform.startsWith("windows")) {
            return "Windows (" + platform.substring(8) + ")"
        } else if (platform.startsWith("macos")) {
            return "MacOS (Universal)"
        }
        return ""
    }

    function getPlatformExtension(platform) {
        if (platform.startsWith("windows")) {
            return "exe"
        }
        return "bin"
    }

})()