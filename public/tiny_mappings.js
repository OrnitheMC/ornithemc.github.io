// Adapted from https://github.com/modmuss50/YarnDiff/tree/master
//

'use strict';

export class Mapping {
    calamus
    feather

    constructor(calamus, feather) {
        this.calamus = calamus;
        this.feather = feather;
    }
}

export class Mappings {
    classes
    fields
    methods

    constructor() {
        this.classes = new Map();
        this.fields = new Map();
        this.methods = new Map();
    }

    find(name) {
        let type = name.split("_")[0].split("/").pop()
        switch (type) {
            case "C":
                return this.classes.get(name)
            case "m":
                return this.methods.get(name)
            case "f":
                return this.fields.get(name)
            default:
            //throw `Unsupported intermediary type ${type} for input ${name}`;
        }
    }

    add(nameable, mapping) {
        nameable.set(mapping.calamus, mapping);
    }
}

export function parseTiny(input) {
    const mappings = new Mappings()

    let foundHeader = false;
    let namespace = {};

    input.split("\n").map(function (value) {
        return value.split("\t")
    }).forEach(function (split) {

        //Reads the header to find the coloum of the mapping format
        if (!foundHeader) {
            if (split[0] !== 'v1') {
                throw "Unsupported mapping format"
            }
            foundHeader = true;
            for (let i = 1; i < split.length; i++) {
                namespace[split[i]] = i - 1
            }
            return
        }

        switch (split[0]) {
            case "CLASS":
                mappings.add(mappings.classes, new Mapping(split[namespace.intermediary + 1], split[namespace.named + 1]))
                break
            case "FIELD":
                mappings.add(mappings.fields, new Mapping(split[namespace.intermediary + 3], split[namespace.named + 3]))
                break
            case "METHOD":
                mappings.add(mappings.methods, new Mapping(split[namespace.intermediary + 3], split[namespace.named + 3]))
                break
            default:
            //Nope
        }
    })

    console.log(`Loaded ${mappings.classes.size} classes, ${mappings.fields.size} fields, ${mappings.methods.size} methods`)
    return mappings
}