
// Converting Minecraft versions to SemVer: 
// https://github.com/FabricMC/fabric-loader/blob/0462eb84f3cb5d5dd9f69e151b2b916b6952d471/minecraft/src/main/java/net/fabricmc/loader/impl/game/minecraft/McVersionLookup.java

const VERSION_PATTERN = new RegExp("0\\.\\d+(\\.\\d+)?a?(_\\d+)?|" // match classic versions first: 0.1.2a_34
    + "\\d+\\.\\d+(\\.\\d+)?(-pre\\d+| Pre-[Rr]elease \\d+)?|" // modern non-snapshot: 1.2, 1.2.3, optional -preN or " Pre-Release N" suffix
    + "\\d+\\.\\d+(\\.\\d+)?(-rc\\d+| [Rr]elease Candidate \\d+)?|" // 1.16+ Release Candidate
    + "\\d+w\\d+[a-z]|" // modern snapshot: 12w34a
    + "[a-c]\\d\\.\\d+(\\.\\d+)?[a-z]?(_\\d+)?[a-z]?|" // alpha/beta a1.2.3_45
    + "(Alpha|Beta) v?\\d+\\.\\d+(\\.\\d+)?[a-z]?(_\\d+)?[a-z]?|" // long alpha/beta names: Alpha v1.2.3_45
    + "Inf?dev (0\\.31 )?\\d+(-\\d+)?|" // long indev/infdev names: Infdev 12345678-9
    + "(rd|inf?)-\\d+|" // early rd-123, in-20100223, inf-123
    + "1\\.RV-Pre1|3D Shareware v1\\.34|23w13a_or_b|24w14potato|25w14craftmine|" // odd exceptions
    + "(.*[Ee]xperimental [Ss]napshot )(\\d+)" // Experimental versions.)
);
const RELEASE_PATTERN = new RegExp("\\d+\\.\\d+(\\.\\d+)?");
const PRE_RELEASE_PATTERN = new RegExp(".+(?:-pre| Pre-[Rr]elease )(\\d+)");
const RELEASE_CANDIDATE_PATTERN = new RegExp(".+(?:-rc| [Rr]elease Candidate )(\\d+)");
const SNAPSHOT_PATTERN = new RegExp("(?:Snapshot )?(\\d+)w0?(0|[1-9]\\d*)([a-z])");
const EXPERIMENTAL_PATTERN = new RegExp("(?:.*[Ee]xperimental [Ss]napshot )(\\d+)");
const BETA_PATTERN = new RegExp("(?:b|Beta v?)1\\.(\\d+(\\.\\d+)?[a-z]?(_\\d+)?[a-z]?)");
const ALPHA_PATTERN = new RegExp("(?:a|Alpha v?)[01]\\.(\\d+(\\.\\d+)?[a-z]?(_\\d+)?[a-z]?)");
const INDEV_PATTERN = new RegExp("(?:inf?-|Inf?dev )(?:0\\.31 )?(\\d+(-\\d+)?)");

export async function getMinecraftSemverVersion(version) {
    let release = getRelease(version);
    return normalizeVersion(version, release);
}

function getRelease(version) {
    if (RELEASE_PATTERN.test(version)) {
        return version;
    }

    if (!isProbableVersion(version)) {
        throw new Error("Not a valid version: " + version);
    }

    let pos = version.indexOf("-pre");
    if (pos >= 0) return version.substring(0, pos);

    pos = version.indexOf(" Pre-Release ");
    if (pos >= 0) return version.substring(0, pos);

    pos = version.indexOf(" Pre-release ");
    if (pos >= 0) return version.substring(0, pos);

    pos = version.indexOf(" Release Candidate ");
    if (pos >= 0) return version.substring(0, pos);

    let matches = version.match(SNAPSHOT_PATTERN);

    if (matches != null) {
        let year = matches[1];
        let week = matches[2];

        if (year == 25 && week >= 15 || year > 25) {
            return "1.21.6";
        } else if (year == 25 && week >= 2 && week <= 10) {
            return "1.21.5";
        } else if (year == 24 && week >= 44) {
            return "1.21.4";
        } else if (year == 24 && week >= 33 && week <= 40) {
            return "1.21.2";
        } else if (year == 24 && week >= 18 && week <= 21) {
            return "1.21";
        } else if (year == 23 && week >= 51 || year == 24 && week <= 14) {
            return "1.20.5";
        } else if (year == 23 && week >= 40 && week <= 46) {
            return "1.20.3";
        } else if (year == 23 && week >= 31 && week <= 35) {
            return "1.20.2";
        } else if (year == 23 && week >= 12 && week <= 18) {
            return "1.20";
        } else if (year == 23 && week <= 7) {
            return "1.19.4";
        } else if (year == 22 && week >= 42) {
            return "1.19.3";
        } else if (year == 22 && week == 24) {
            return "1.19.1";
        } else if (year == 22 && week >= 11 && week <= 19) {
            return "1.19";
        } else if (year == 22 && week >= 3 && week <= 7) {
            return "1.18.2";
        } else if (year == 21 && week >= 37 && week <= 44) {
            return "1.18";
        } else if (year == 20 && week >= 45 || year == 21 && week <= 20) {
            return "1.17";
        } else if (year == 20 && week >= 27 && week <= 30) {
            return "1.16.2";
        } else if (year == 20 && week >= 6 && week <= 22) {
            return "1.16";
        } else if (year == 19 && week >= 34) {
            return "1.15";
        } else if (year == 18 && week >= 43 || year == 19 && week <= 14) {
            return "1.14";
        } else if (year == 18 && week >= 30 && week <= 33) {
            return "1.13.1";
        } else if (year == 17 && week >= 43 || year == 18 && week <= 22) {
            return "1.13";
        } else if (year == 17 && week == 31) {
            return "1.12.1";
        } else if (year == 17 && week >= 6 && week <= 18) {
            return "1.12";
        } else if (year == 16 && week == 50) {
            return "1.11.1";
        } else if (year == 16 && week >= 32 && week <= 44) {
            return "1.11";
        } else if (year == 16 && week >= 20 && week <= 21) {
            return "1.10";
        } else if (year == 16 && week >= 14 && week <= 15) {
            return "1.9.3";
        } else if (year == 15 && week >= 31 || year == 16 && week <= 7) {
            return "1.9";
        } else if (year == 14 && week >= 2 && week <= 34) {
            return "1.8";
        } else if (year == 13 && week >= 47 && week <= 49) {
            return "1.7.3";
        } else if (year == 13 && week >= 36 && week <= 43) {
            return "1.7";
        } else if (year == 13 && week >= 16 && week <= 26) {
            return "1.6";
        } else if (year == 13 && week >= 11 && week <= 12) {
            return "1.5.1";
        } else if (year == 13 && week >= 1 && week <= 10) {
            return "1.5";
        } else if (year == 12 && week >= 49 && week <= 50) {
            return "1.4.6";
        } else if (year == 12 && week >= 32 && week <= 42) {
            return "1.4";
        } else if (year == 12 && week >= 15 && week <= 30) {
            return "1.3";
        } else if (year == 12 && week >= 3 && week <= 8) {
            return "1.2";
        } else if (year == 11 && week >= 47 || year == 12 && week <= 1) {
            return "1.1";
        }
    }

    return null;
}

function normalizeVersion(name, release) {
    if (release == null || name == release) {
        let ret = normalizeSpecialVersion(name);
        if (ret != null) {
            return ret;
        }
        return normalizeOldVersion(name);
    }

    let matches;

    if ((matches = name.match(EXPERIMENTAL_PATTERN)) != null) {
        return release + "-Experimental." + matches[1];
    } else if (name.startsWith(release)) {
        matches = name.match(RELEASE_CANDIDATE_PATTERN);

        if (matches != null) {
            let rcBuild = matches[1];

            // This is a hack to fake 1.16's new release candidates to follow on from the 8 pre releases.
            if (release == "1.16") {
                let build = rcBuild;
                rcBuild = 8 + build;
            }

            name = "rc." + rcBuild;
        } else {
            matches = name.match(PRE_RELEASE_PATTERN);

            if (matches != null) {
                let legacyVersion = release.match("\d+\.(\d+).*")[1] <= 16;
                // Mark pre-releases as 'beta' versions, except for version 1.16 and before, where they are 'rc'
                if (legacyVersion) {
                    name = "rc." + matches[1];
                } else {
                    name = "beta." + matches[1];
                }
            } else {
                let ret = normalizeSpecialVersion(name);
                if (ret != null) {
                    return ret;
                }
                return normalizeOldVersion(name);
            }
        }
    } else if ((matches = name.match(SNAPSHOT_PATTERN)) != null) {
        name = "alpha." + matches[1] + matches[2] + matches[3];
    } else {
        // Try short-circuiting special versions which are complete on their own
        let ret = normalizeSpecialVersion(name);
        if (ret != null) {
            return ret;
        }
        return normalizeOldVersion(name);
    }

    return release + "-" + name;
}

function normalizeOldVersion(version) {
    // old version normalization scheme
    // do this before the main part of normalization as we can get crazy strings like "Indev 0.31 12345678-9"
    let matches;

    if ((matches = version.match(BETA_PATTERN)) != null) { // beta 1.2.3: 1.0.0-beta.2
        version = "1.0.0-beta." + matches[1];
    } else if ((matches = version.match(ALPHA_PATTERN)) != null) { // alpha 1.2.3: 1.0.0-alpha.2.3
        version = "1.0.0-alpha." + matches[1];
    } else if ((matches = version.match(INDEV_PATTERN)) != null) { // indev/infdev 12345678: 0.31.12345678
        version = "0.31." + matches[1];
    } else if (version.startsWith("c0.")) { // classic: unchanged, except remove prefix
        version = version.substring(1);
    } else if (version.startsWith("rd-")) { // pre-classic
        version = version.substring("rd-".length);
        if ("20090515" === version) version = "150000"; // account for a weird exception to the pre-classic versioning scheme
        version = "0.0.0-rd." + version;
    }

    let ret = "";
    let lastIsDigit = false;
    let lastIsLeadingZero = false;
    let lastIsSeparator = false;

    for (let i = 0, max = version.length; i < max; i++) {
        let c = version.charAt(i);

        if (c >= '0' && c <= '9') {
            if (i > 0 && !lastIsDigit && !lastIsSeparator) { // no separator between non-number and number, add one
                ret += ".";
            } else if (lastIsDigit && lastIsLeadingZero) { // leading zero in output -> strip
                ret = ret.substring(0, ret.length - 1);
            }

            lastIsLeadingZero = c == '0' && (!lastIsDigit || lastIsLeadingZero); // leading or continued leading zero(es)
            lastIsSeparator = false;
            lastIsDigit = true;
        } else if (c == '.' || c == '-') { // keep . and - separators
            if (lastIsSeparator) continue;

            lastIsSeparator = true;
            lastIsDigit = false;
        } else if ((c < 'A' || c > 'Z') && (c < 'a' || c > 'z')) { // replace remaining non-alphanumeric with .
            if (lastIsSeparator) continue;

            c = '.';
            lastIsSeparator = true;
            lastIsDigit = false;
        } else { // keep other characters (alpha)
            if (lastIsDigit) ret += "."; // no separator between number and non-number, add one

            lastIsSeparator = false;
            lastIsDigit = false;
        }

        ret += c;
    }

    let start = 0;
    while (start < ret.length && ret.charAt(start) == '.') start++;

    let end = ret.length;
    while (end > start && ret.charAt(end - 1) == '.') end--;

    return ret.substring(start, end);
}

function normalizeSpecialVersion(version) {
    switch (version) {
        case "13w12~":
            // A pair of debug snapshots immediately before 1.5.1-pre
            return "1.5.1-alpha.13.12.a";

        case "15w14a":
            // The Love and Hugs Update, forked from 1.8.3
            return "1.8.4-alpha.15.14.a+loveandhugs";

        case "1.RV-Pre1":
            // The Trendy Update, probably forked from 1.9.2 (although the protocol/data versions immediately follow 1.9.1-pre3)
            return "1.9.2-rv+trendy";

        case "3D Shareware v1.34":
            // Minecraft 3D, forked from 19w13b
            return "1.14-alpha.19.13.shareware";

        case "20w14~":
            // The Ultimate Content update, forked from 20w13b
            return "1.16-alpha.20.13.inf"; // Not to be confused with the actual 20w14a

        case "1.14.3 - Combat Test":
            // The first Combat Test, forked from 1.14.3 Pre-Release 4
            return "1.14.3-rc.4.combat.1";

        case "Combat Test 2":
            // The second Combat Test, forked from 1.14.4
            return "1.14.5-combat.2";

        case "Combat Test 3":
            // The third Combat Test, forked from 1.14.4
            return "1.14.5-combat.3";

        case "Combat Test 4":
            // The fourth Combat Test, forked from 1.15 Pre-release 3
            return "1.15-rc.3.combat.4";

        case "Combat Test 5":
            // The fifth Combat Test, forked from 1.15.2 Pre-release 2
            return "1.15.2-rc.2.combat.5";

        case "Combat Test 6":
            // The sixth Combat Test, forked from 1.16.2 Pre-release 3
            return "1.16.2-beta.3.combat.6";

        case "Combat Test 7":
            // Private testing Combat Test 7, forked from 1.16.2
            return "1.16.3-combat.7";

        case "1.16_combat-2":
            // Private testing Combat Test 7b, forked from 1.16.2
            return "1.16.3-combat.7.b";

        case "1.16_combat-3":
            // The seventh Combat Test 7c, forked from 1.16.2
            return "1.16.3-combat.7.c";

        case "1.16_combat-4":
            // Private testing Combat Test 8(a?), forked from 1.16.2
            return "1.16.3-combat.8";

        case "1.16_combat-5":
            // The eighth Combat Test 8b, forked from 1.16.2
            return "1.16.3-combat.8.b";

        case "1.16_combat-6":
            // The ninth Combat Test 8c, forked from 1.16.2
            return "1.16.3-combat.8.c";

        case "2point0_red":
            // 2.0 update version red, forked from 1.5.1
            return "1.5.2-red";

        case "2point0_purple":
            // 2.0 update version purple, forked from 1.5.1
            return "1.5.2-purple";

        case "2point0_blue":
            // 2.0 update version blue, forked from 1.5.1
            return "1.5.2-blue";

        case "23w13a_or_b":
            // Minecraft 23w13a_or_b, forked from 23w13a
            return "1.20-alpha.23.13.ab";

        case "24w14potato":
            // Minecraft 24w14potato, forked from 24w12a
            return "1.20.5-alpha.24.12.potato";

        case "25w14craftmine":
            // Minecraft 25w14craftmine, forked from 1.21.5
            return "1.21.6-alpha.25.14.craftmine";

        default:
            return null; //Don't recognise the version
    }
}

function isProbableVersion(version) {
    return VERSION_PATTERN.test(version);
}