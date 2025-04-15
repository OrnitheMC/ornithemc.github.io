(async () => {
    let downloadDiv = document.getElementById("platform-download");
    let platform = getPlatform();

    if (platform != "") {
        let html = "<a class=\"no-underline hover:underline\" href=\"https://maven.ornithemc.net/api/maven/latest/file/releases/net/ornithemc/ornithe-installer-rs/"+platform+"?extension="+getPlatformExtension(platform)+"\">"+
                        "<div class=\"bg-ornithe-button-bg w-fit p-2 px-4\">Download native installer for "+getPlatformName(platform)+"</div>"+
                    "</a>";
        downloadDiv.innerHTML = html;
        downloadDiv.style = "";
    }

    let nativeVersion = await getLatestVersion(platform, "ornithe-installer-rs/"+platform+"?extension="+getPlatformExtension(platform));
    setLatestVersion("native", nativeVersion.version);
    let jarVersion = await getLatestVersion(platform, "ornithe-installer");
    setLatestVersion("jar", jarVersion.version);

    async function getLatestVersion(platform, artifact) {
        const res = await fetch("https://maven.ornithemc.net/api/maven/latest/version/releases/net/ornithemc/"+artifact);
        return res.json();
    }
    
    function setLatestVersion(sort, version) {
        let div = document.getElementById("latest-version-"+sort);
        if (div != null) {
            div.style = "";
            div.innerHTML = "Latest Version: "+version;
        }
    }

    function getPlatform(){
        var appVersion = navigator.userAgent;
        if(appVersion.indexOf("Linux")!=-1 || appVersion.indexOf("X11")!=-1){
            return "linux-x86";
        } else if(appVersion.indexOf("Win")!=-1){
            return "windows-x86";
        } else if(appVersion.indexOf("Mac")!=-1){
            return "macos-aarch64"
        }
        return "";
    }
    
    function getPlatformName(platform){
        if(platform == "linux-x86"){
            return "Linux"
        } else if(platform == "windows-x86"){
            return "Windows"
        } else if (platform == "macos-x64" || platform == "macos-aarch64"){
            return "MacOS"
        }
        return ""
    }
    
    function getPlatformExtension(platform){
        if(platform == "windows-x86"){
            return "exe"
        }
        return "bin"
    }

})()