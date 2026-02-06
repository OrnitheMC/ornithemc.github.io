
// Converting Minecraft versions to SemVer: 
// https://github.com/FabricMC/fabric-loader/blob/088e1fe3487f64ae3b36eb0b3499def3167b944b/minecraft/src/main/java/net/fabricmc/loader/impl/game/minecraft/McVersionLookup.java

const RELEASE_PATTERN = new RegExp("(1\\.(\\d+)(?:\\.(\\d+))?)(?:-(\\d+))?"); // 1.6, 1.16.5, 1,16+231620, 1.21.11_unobfuscated
const TEST_BUILD_PATTERN = new RegExp(".+(?:-tb| Test Build )(\\d+)?(?:-(\\d+))?"); // ... Test Build 1, ...-tb2, ...-tb3-1234
const PRE_RELEASE_PATTERN = new RegExp(".+(?:-pre| Pre-?[Rr]elease ?)(?:(\\d+)(?: ;\\))?)?(?:-(\\d+))?"); // ... Prerelease, ... Pre-release 1, ... Pre-Release 2, ...-pre3, ...-pre4-1234, ...-pre1_unobfuscated
const RELEASE_CANDIDATE_PATTERN = new RegExp(".+(?:-rc| RC| [Rr]elease Candidate )(\\d+)(?:-(\\d+))?"); // ... RC1, ... Release Candidate 2, ...-rc3, ...-rc4-1234, ...-rc1_unobfuscated
const SNAPSHOT_PATTERN = new RegExp("(?:Snapshot )?(\\d+)w0?(0|[1-9]\\d*)([a-z])(?:-(\\d+)|[ _]([Uu]nobfuscated))?"); // Snapshot 16w02a, 20w13b, 22w18c-1234, 25w45a Unobfuscated
const EXPERIMENTAL_PATTERN = new RegExp(".+(?:-exp|(?:_deep_dark)?_experimental[_-]snapshot-|(?: Deep Dark)? [Ee]xperimental [Ss]napshot )(\\d+)"); // 1.18 Experimental Snapshot 1, 1.18_experimental-snapshot-2, 1.18-exp3, 1.19 Deep Dark Experimental Snapshot 1
const BETA_PATTERN = new RegExp("(?:b|Beta v?)1\\.((\\d+)(?:\\.(\\d+))?(_0\\d)?)([a-z])?(?:-(\\d+))?(?:-(launcher))?"); // Beta 1.2, b1.2_02-launcher, b1.3b, b1.3-1731, Beta v1.5_02, b1.8.1
const ALPHA_PATTERN = new RegExp("(?:(?:server-)?a|Alpha v?)[01]\\.(\\d+\\.\\d+(?:_0\\d)?)([a-z])?(?:-(\\d+))?(?:-(launcher))?"); // Alpha v1.0.1, Alpha 1.0.1_01, a1.0.4-launcher, a1.1.0-131933, a1.2.2a, a1.2.3_05, Alpha 0.1.0, server-a0.2.8
const INDEV_PATTERN = new RegExp("(?:inf?-|Inf?dev )(?:0\\.31 )?(\\d+)(?:-(\\d+))?"); // Indev 0.31 200100110, in-20100124-2310, Infdev 0.31 20100227-1433, inf-20100611
const CLASSIC_SERVER_PATTERN = new RegExp("(?:(?:server-)?c)1\\.(\\d\\d?(?:\\.\\d)?)(?:-(\\d+))?"); // c1.0, server-c1.3, server-c1.5-1301, c1.8.1, c1.10.1
const LATE_CLASSIC_PATTERN = new RegExp("(?:c?0\\.)(\\d\\d?)(?:_0(\\d))?(?:_st)?(?:_0(\\d))?([a-z])?(?:-([cs]))?(?:-(\\d+))?(?:-(renew))?"); // c0.24_st, 0.24_st_03, 0.25_st-1658, c0.25_05_st, 0.29, c0.30-s, 0.30-c-renew, c0.30_01c
const EARLY_CLASSIC_PATTERN = new RegExp("(?:c?0\\.0\\.)(\\d\\d?)a(?:_0(\\d))?(?:-(\\d+))?(?:-(launcher))?"); // c0.0.11a, c0.0.13a_03-launcher, c0.0.17a-2014, 0.0.18a_02
const PRE_CLASSIC_PATTERN = new RegExp("(?:rd|pc)-(\\d+)(?:-(launcher))?"); // rd-132211, pc-132011-launcher
const TIMESTAMP_PATTERN = new RegExp("(.+)(?:-(\\d+))");
const VERSION_PATTERN = new RegExp(
	PRE_CLASSIC_PATTERN.source
	+ "|" + EARLY_CLASSIC_PATTERN.source
	+ "|" + LATE_CLASSIC_PATTERN.source
	+ "|" + CLASSIC_SERVER_PATTERN.source
	+ "|" + INDEV_PATTERN.source
	+ "|" + ALPHA_PATTERN.source
	+ "|" + BETA_PATTERN.source
	+ "(" + TEST_BUILD_PATTERN.source.substring(2) + ")?"
	+ "(" + PRE_RELEASE_PATTERN.source.substring(2) + ")?"
	+ "(" + RELEASE_CANDIDATE_PATTERN.source.substring(2) + ")?"
	+ "|" + RELEASE_PATTERN.source
	+ "(" + TEST_BUILD_PATTERN.source.substring(2) + ")?"
	+ "(" + PRE_RELEASE_PATTERN.source.substring(2) + ")?"
	+ "(" + RELEASE_CANDIDATE_PATTERN.source.substring(2) + ")?"
	+ "(" + EXPERIMENTAL_PATTERN.source.substring(2) + ")?"
	+ "|" + SNAPSHOT_PATTERN.source
	+ "|" + "[Cc]ombat(?: Test )?\\d[a-z]?" // combat snapshots
	+ "|" + "Minecraft RC\\d" // special case for 1.0.0 release candidates
	+ "|" + "2.0|1\\.RV-Pre1|3D Shareware v1\\.34" // odd exceptions
	+ "(" + TIMESTAMP_PATTERN.source + ")?");

function matchExact(s, expr) {
    const matches = s.match(expr);
    if (matches == null || s != matches[0]) {
        return null;
    }
    return matches;
}

function getRelease(version) {
    // 1.6, 1.16.5, 1,16+231620
    let matches = matchExact(version, RELEASE_PATTERN);

    if (matches != null) {
        // return name without timestamp
        return matches[1];
    }

    // version ids as found in versions manifest
    // ... as in 1.19_deep_dark_experimental_snapshot-1
    let pos = version.indexOf("_deep_dark_experimental_snapshot-");
    if (pos >= 0) return version.substring(0, pos);

    // ... as in 1.18_experimental-snapshot-1
    pos = version.indexOf("_experimental-snapshot-");
    if (pos >= 0) return version.substring(0, pos);

    // ... as in 1.18-exp1
    pos = version.indexOf("-exp");
    if (pos >= 0) return version.substring(0, pos);

    // ... as in b1.6-tb3
    pos = version.indexOf("-tb");
    if (pos >= 0) return version.substring(0, pos);

    // ... as in 1.21.6-pre1
    pos = version.indexOf("-pre");
    if (pos >= 0) return version.substring(0, pos);

    // ... as in 1.21.6-rc1
    pos = version.indexOf("-rc");
    if (pos >= 0) return version.substring(0, pos);

    // version names as extracted from the jar
    // ... as in 1.19 Deep Dark Experimental Snapshot 1
    pos = version.indexOf(" Deep Dark Experimental Snapshot");
    if (pos >= 0) return version.substring(0, pos);

    // ... as in 1.18 Experimental Snapshot 1
    pos = version.indexOf(" Experimental Snapshot");
    if (pos >= 0) return version.substring(0, pos);

    // ... as in 1.18 experimental snapshot 2
    pos = version.indexOf(" experimental snapshot ");
    if (pos >= 0) return version.substring(0, pos);

    // ... as in Beta 1.6 Test Build 3
    pos = version.indexOf(" Test Build");
    if (pos >= 0) return version.substring(0, pos);

    // ... as in 1.21.6 Pre-Release 1
    pos = version.indexOf(" Pre-Release");
    if (pos >= 0) return version.substring(0, pos);

    // ... as in Beta 1.8 Pre-release 1
    pos = version.indexOf(" Pre-release");
    if (pos >= 0) return version.substring(0, pos);

    // ... as in Beta 1.9 Prerelease 2
    pos = version.indexOf(" Prerelease");
    if (pos >= 0) return version.substring(0, pos);

    // ... as in Minecraft RC1
    pos = version.indexOf(" RC");
    if (pos >= 0) return version.substring(0, pos);

    // ... as in 1.21.6 Release Candidate 1
    pos = version.indexOf(" Release Candidate");
    if (pos >= 0) return version.substring(0, pos);

    matches = matchExact(version, SNAPSHOT_PATTERN); // Snapshot 16w02a, 20w13b, 22w18c-1234, 25w45a Unobfuscated

    if (matches != null) {
        let year = matches[1];
        let week = matches[2];

        if (year > 19) {
            throw new Error("hey now, Ornithe does not support Minecraft versions that new!");
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

export async function normalizeMinecraftVersion(name) {
    let release = getRelease(name);
    return normalizeVersion(name, release);
}

function normalizeVersion(name, release) {
    if (release == null || name == release) {
        let ret = normalizeSpecialVersion(name);
        if (ret != null) {
            return ret;
        }
        return normalizeReleaseOrOldVersion(name);
    }
    
    let normalizedRelease = normalizeReleaseOrOldVersion(release);
    // timestamps distinguish between re-uploads of the same version
    let timestamp = null;
    
    let ret = [];
    ret.push(normalizedRelease);
    ret.push('-');
    
    let matches;
    
    if ((matches = matchExact(name, RELEASE_PATTERN)) != null) { // 1.6, 1.16.5, 1.16+131620
        timestamp = matches[4];
        
        // remove - separator
        ret.pop();
    } else if ((matches = matchExact(name, EXPERIMENTAL_PATTERN)) != null) { // 1.18 Experimental Snapshot 1, 1.18 experimental snapshot 2, 1.18-exp3
        ret.push("Experimental.");
        ret.push(matches[1]); // exp build nr
    } else if (name.startsWith(release)) {
        if ((matches = matchExact(name, RELEASE_CANDIDATE_PATTERN)) != null) { // ... RC1, ... Release Candidate 2, ...-rc3, ...-rc4-1234
            let rcBuild = matches[1];
            timestamp = matches[2];

            // 1.0.0 release candidates are simply known as eg. 'Minecraft RC1' in the jar
            if (release == "Minecraft") {
                ret[0] = ret[0].replace(0, "Minecraft".length, "1.0.0");
            }

            ret.push("rc.");
            ret.push(rcBuild);
        } else if ((matches = matchExact(name, PRE_RELEASE_PATTERN)) != null) { // ... Prerelease, ... Pre-release 1, ... Pre-Release 2, ...-pre3, ...-pre4-1234
            // Pre-releases in Beta need special treatment
            let releaseMatches = matchExact(release, BETA_PATTERN); // Beta 1.2, b1.3-1731, Beta v1.5_02, b1.8.1

            if (releaseMatches != null) {
                // Beta versions with pre-releases end with .r after normalization
                // for pre-releases, the pre-release nr is put in that place instead
                if (normalizedRelease.charAt(normalizedRelease.length - 1) != 'r') {
                    throw new Error("improperly normalized release " + release + " to " + normalizedRelease + " for pre-release " + name);
                }

                let prBuild = matches[1];
                timestamp = matches[2];

                // pre-release 1 is sometimes just called 'Prerelease'
                if (prBuild == null) {
                    prBuild = "1";
                }

                // remove the - separator and replace the final r
                // of the normalized release version
                ret.pop();
                ret[0] = ret[0].substring(0, ret[0].length - 1);
                ret.push(prBuild);
            } else {
                let prBuild = matches[1];
                timestamp = matches[2];

                if (prBuild == null) {
                    // between 1.2 and 1.7, regular release ids were used for
                    // pre-releases, yet omniarchive marks these versions with
                    // a 'pre' identifier
                    // we won't do that here because it would be inconsistent
                    // with the snapshot release targets

                    releaseMatches = matchExact(release, RELEASE_PATTERN); // 1.6, 1.16.5, 1.16+131620

                    if (releaseMatches == null) {
                        throw new Error("version " + name + " is a pre-release targeting neither a Beta version, nor a release version?!");
                    }

                    let minor = parseInt(releaseMatches[2]);
                    let patch = (releaseMatches[3] == null)
                                        ? 0 // use 0 if no patch version is given (1.7 -> 1.7.0)
                                        : parseInt(releaseMatches[3]);

                    let showAsRelease = (minor == 2 && patch == 0) // 1.2
                                        || (minor == 3 && patch == 0) // 1.3
                                        || (minor == 4 && (patch == 0 || patch == 1 || patch == 3)) // 1.4, 1.4.1, 1.4.3
                                        || (minor == 6 && (patch == 0 || patch == 3)) // 1.6, 1.6.3
                                        || (minor == 7 && (patch == 0 || patch == 1 || patch == 3)); // 1.7, 1.7.1, 1.7.3

                    if (showAsRelease) {
                        // remove the - separator
                        ret.pop();
                    } else {
                        // then there are also actual pre-releases that use regular
                        // release ids that were later re-used for the actual release
                        // e.g. 1.6.3-pre and 1.7.4-pre

                        // use 'rc' to be consistent with other pre-releases
                        // for versions older than 1.16
                        ret.push("rc");
                    }
                } else {
                    // Mark pre-releases as 'beta' versions, except for version 1.16 and before, where they are 'rc'
                    ret.push("rc.");
                    ret.push(prBuild);
                }
            }
        } else if ((matches = matchExact(name, TEST_BUILD_PATTERN)) != null) { // ... Test Build 1, ...-tb2, ...-tb3-1234
            // Test builds in Beta need special treatment
            let releaseMatches = matchExact(release, BETA_PATTERN); // Beta 1.2, b1.3-1731, Beta v1.5_02, b1.8.1

            if (releaseMatches != null) {
                // Beta versions with test builds end with .r after normalization
                // for test builds, the build nr is put in that place instead
                if (normalizedRelease.charAt(normalizedRelease.length - 1) != 'r') {
                    throw new Error("improperly normalized release " + release + " to " + normalizedRelease + " for test build " + name);
                }

                let tbBuild = matches[1];
                timestamp = matches[2];

                // remove the - separator and replace the final r
                // of the normalized release version
                ret.pop();
                ret[0] = ret[0].substring(0, ret[0].length - 1);
                ret.push(tbBuild);
            } else {
                let tbBuild = matches[1];
                timestamp = matches[2];

                ret.push("test.");
                ret.push(tbBuild);
            }
        } else {
            let normalized = normalizeSpecialVersion(name);
            if (normalized != null) return normalized;
        }
    } else if ((matches = matchExact(name, SNAPSHOT_PATTERN)) != null) { // Snapshot 16w02a, 20w13b, 22w18c-1234
        timestamp = matches[4];

        ret.push("alpha.");
        ret.push(matches[1]); // year
        ret.push('.');
        ret.push(matches[2]); // week
        ret.push('.');
        ret.push(matches[3]); // patch
    } else {
        // Try short-circuiting special versions which are complete on their own
        let normalized = normalizeSpecialVersion(name);
        if (normalized != null) return normalized;

        ret.push(normalizeVersion(name));
    }

    // add timestamp as extra build information
    if (timestamp != null) {
        ret.push('+');
        ret.push(timestamp);
    }

    return ret.join("");
}

function normalizeReleaseOrOldVersion(version) {
    // timestamps distinguish between re-uploads of the same version
    let timestamp = null;
    // omniarchive marks some versions with a -launcher suffix
    // and there is one classic version marked -renew
    let suffix = null;

    let prepl = [];

    // old version normalization scheme
    // do this before the main part of normalization as we can get crazy strings like "Indev 0.31 12345678-9"
    let matches;

    if ((matches = matchExact(version, BETA_PATTERN)) != null) { // Beta 1.2, b1.3-1731, Beta v1.5_02, b1.8.1
        let trail = matches[5];
        timestamp = matches[6];
        suffix = matches[7];

        prepl.push("1.0.0-beta.");
        prepl.push(matches[1]);

        // there are pre-releases in Beta too, and they
        // are annoying to normalize
        // the solution we use is to use the pre-release
        // numbers as patch numbers, then for the 'release'
        // version, use some text - the letter 'r' - instead
        // to ensure it is sorted after the pre-releases
        // for this to work, a minor number must be present
        // but it is only necessary for b1.6, b1.8 and b1.9
        // the minor version is also set to 0 to ensure
        // following minor versions are sorted after
        if (matches[3] == null && matches[4] == null) {
            let maj = parseInt(matches[2]);

            if (maj == 6 || maj == 8 || maj == 9) {
                prepl.push(".0.r"); // 'r' for 'release'
            }
        }

        // in the launcher manifest, some Beta versions have
        // trailing alphabetic chars
        if (trail != null) {
            // if no minor version is given, set it to 0 to
            // ensure this version is sorted before subsequent
            // minor updates
            if (matches[3] == null && matches[4] == null) {
                prepl.push(".0");
            }

            prepl.push('.');
            prepl.push(trail);
        }
    } else if ((matches = matchExact(version, ALPHA_PATTERN)) != null) { // Alpha v1.0.1, Alpha 1.0.1_01, a1.1.0-131933, a1.2.3_05, Alpha 0.1.0, a0.2.8
        let trail = matches[2];
        timestamp = matches[3];
        suffix = matches[4];

        prepl.push("1.0.0-alpha.");
        prepl.push(matches[1]);

        // in the launcher manifest, some Alpha versions have
        // trailing alphabetic chars
        if (trail != null) {
            prepl.push('.');
            prepl.push(trail);
        }
    } else if ((matches = matchExact(version, INDEV_PATTERN)) != null) { // Indev 0.31 200100110, in-20100124-2310, Infdev 0.31 20100227-1433, inf-20100611
        let date = matches[1];
        // multiple releases could occur on the same day!
        let time = matches[2];

        prepl.push("0.31.");
        prepl.push(date);
        if (time != null) {
            prepl.push('-');
            prepl.push(time);
        }
    } else if ((matches = matchExact(version, EARLY_CLASSIC_PATTERN)) != null // c0.0.11a, c0.0.17a-2014, 0.0.18a_02
            || (matches = matchExact(version, LATE_CLASSIC_PATTERN)) != null) { // c0.24_st, 0.24_st_03, 0.25_st-1658, c0.25_05_st, 0.29, c0.30-s, 0.30-c-renew
        let late = matchExact(version, LATE_CLASSIC_PATTERN) != null;

        let minor = matches[1];
        let patch = matches[2];
        let trail = late ? matches[4] : null;
        let type = late ? matches[5] : null;
        timestamp = matches[late ? 6 : 3];
        suffix = matches[late ? 7 : 4];

        // in late classic, sometimes the patch number appears before
        // the survival test identifier (_st), and sometimes after it
        if (late && patch == null) {
            patch = matches[3];
        }

        prepl.push("0.");
        prepl.push(minor);
        if (patch != null) {
            prepl.push('.');
            prepl.push(patch);
        }
        // in the launcher manifest, some Classic versions have trailing alphabetic chars
        if (trail != null) {
            prepl.push('-');
            prepl.push(trail);
        }
        // in the Omniarchive manifest, some classic versions releases for creative and survival
        if (type != null) {
            prepl.push('-');
            prepl.push(type);
        }
    } else if ((matches = matchExact(version, CLASSIC_SERVER_PATTERN)) != null) {
        let release = matches[1];
        timestamp = matches[2];

        prepl.push("0.");
        prepl.push(release);
    } else if ((matches = matchExact(version, PRE_CLASSIC_PATTERN)) != null) { // rd-132211
        let build = matches[1];
        suffix = matches[2];

        // account for a weird exception to the pre-classic versioning scheme
        if (build == "20090515") {
            build = "150000";
        }

        prepl.push("0.0.0-rd.");
        prepl.push(build);
    } else {
        prepl.push(version);
    }

    let prep = prepl.join("");
    let retl = [];
    let lastIsDigit = false;
    let lastIsLeadingZero = false;
    let lastIsSeparator = false;

    for (let i = 0, max = prep.length; i < max; i++) {
        let c = prep.charAt(i);

        if (c >= '0' && c <= '9') {
            if (i > 0 && !lastIsDigit && !lastIsSeparator) { // no separator between non-number and number, add one
                retl.push('.');
            } else if (lastIsDigit && lastIsLeadingZero) { // leading zero in output -> strip
                retl.pop();
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
            if (lastIsDigit) retl.push('.'); // no separator between number and non-number, add one

            lastIsSeparator = false;
            lastIsDigit = false;
        }

        retl.push(c);
    }

    let ret = retl.join("");

    // strip leading and trailing .

    let start = 0;
    while (start < ret.length && ret.charAt(start) == '.') start++;

    let end = ret.length;
    while (end > start && ret.charAt(end - 1) == '.') end--;

    ret = ret.substring(start, end);
    retl = []

    // add timestamp and suffix as extra build information
    if (timestamp != null || suffix != null) {
        retl.push('+');

        if (timestamp != null) {
            retl.push(timestamp);
            if (suffix != null) retl.push('.');
        }

        if (suffix != null) {
            retl.push(suffix);
        }
    }

    return ret + retl.join("");
}

function normalizeSpecialVersion(version) {
    // first attempt to normalize the version as-is
    let normalized = normalizeSpecialVersionBase(version);

    // only if that yields no result, check if it's a re-upload from Omniarchive
    if (normalized == null) {
        // timestamps distinguish between re-uploads of the same version
        let timestamp = null;

        let matches = matchExact(version, TIMESTAMP_PATTERN);

        if (matches != null) {
            version = matches[1];
            timestamp = matches[2];
        }

        normalized = normalizeSpecialVersionBase(version);

        // add timestamp as extra build information
        if (normalized != null && timestamp != null) {
            normalized += "+" + timestamp;
        }
    }

    return normalized;
}

function normalizeSpecialVersionBase(version) {
    switch (version) {
    case "b1.2_02-dev":
        // a dev version of b1.2
        return "1.0.0-beta.2.dev";
    case "b1.3-demo":
        // a demo version of b1.3 given to PC Gamer magazine
        return "1.0.0-beta.3.demo";
    case "b1.6-trailer":
    case "b1.6-pre-trailer":
        // pre-release version used for the Beta 1.6 trailer
        return "1.0.0-beta.6.0.0"; // sort it before the test builds

    case "13w02a-whitetexturefix":
        // a fork from 13w02a to attempt to fix a white texture glitch
        return "1.5-alpha.13.2.a.whitetexturefix";
    case "13w04a-whitelinefix":
        // a fork from 13w04a to attempt to fix a white line glitch
        return "1.5-alpha.13.4.a.whitelinefix";
    case "1.5-whitelinefix":
    case "1.5-pre-whitelinefix":
        // a pre-release for 1.5 to attempt to fix a white line glitch
        return "1.5-rc.whitelinefix";
    case "13w12~":
        // A pair of debug snapshots immediately before 1.5.1-pre
        return "1.5.1-alpha.13.12.a";

    case "2.0":
        // 2.0 update version as known in the jar, forked from 1.5.1
        return "1.5.2-2.0";

    case "2.0-preview":
        // a preview for the 2.0 april fools version, similar to blue
        return "1.5.2-2.0+preview"

    case "2.0-red":
    case "2point0_red":
    case "af-2013-red":
        // 2.0 update version red, forked from 1.5.1
        return "1.5.2-2.0+red";

    case "2.0-purple":
    case "2point0_purple":
    case "af-2013-purple":
        // 2.0 update version purple, forked from 1.5.1
        return "1.5.2-2.0+purple";

    case "2.0-blue":
    case "2point0_blue":
    case "af-2013-blue":
        // 2.0 update version blue, forked from 1.5.1
        return "1.5.2-2.0+blue";

    case "15w14a":
    case "af-2015":
        // The Love and Hugs Update, forked from 1.8.3
        return "1.8.4-alpha.15.14.a+loveandhugs";

    case "1.RV-Pre1":
    case "af-2016":
        // The Trendy Update, probably forked from 1.9.2 (although the protocol/data versions immediately follow 1.9.1-pre3)
        return "1.9.2-rv+trendy";

    case "3D Shareware v1.34":
    case "af-2019":
        // Minecraft 3D, forked from 19w13b
        return "1.14-alpha.19.13.shareware";

    case "1.14_combat-212796":
    case "1.14.3 - Combat Test":
    case "combat1":
        // The first Combat Test, forked from 1.14.3 Pre-Release 4
        return "1.14.3-rc.4.combat.1";

    case "1.14_combat-0":
    case "Combat Test 2":
    case "combat2":
        // The second Combat Test, forked from 1.14.4
        return "1.14.5-combat.2";

    case "1.14_combat-3":
    case "Combat Test 3":
    case "combat3":
        // The third Combat Test, forked from 1.14.4
        return "1.14.5-combat.3";

    case "1.15_combat-1":
    case "Combat Test 4":
    case "combat4":
        // The fourth Combat Test, forked from 1.15 Pre-release 3
        return "1.15-rc.3.combat.4";

    case "1.15_combat-6":
    case "Combat Test 5":
    case "combat5":
        // The fifth Combat Test, forked from 1.15.2 Pre-release 2
        return "1.15.2-rc.2.combat.5";

    default:
        return null; //Don't recognise the version
    }
}

function isProbableVersion(version) {
    return VERSION_PATTERN.test(version);
}