import {fixtures} from "./fixtures.ts";
import Genetic from "../src/algo/genetic.ts";
import * as path from "path";
import * as url from "url";
import * as assert from "assert";

export type Module = {studentsFile: string, inputFile: string, keysMask: string[], skip?: boolean, output: {[levelKey: string]: number}[]}
const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('get genetic classes from input', function () {
    fixtures(__dirname, "genetic", async ({module}: { module: Module }) => {
        let {studentsFile, inputFile, keysMask, output} = module
        const students = (await import(studentsFile, {assert: {type: "json"}})).default
        const input = (await import(inputFile, {assert: {type: "json"}})).default

        const algo = new Genetic()
        const entry = algo.solve(students, input)
        console.log(entry.toString(...keysMask))

        const resultCount = entry.toCount(...keysMask).sort()
        assert.equal(output.length, resultCount.length)

        for (let entryCount of output) {
            assert.notEqual(resultCount.find(v => objectEquals(v, entryCount)), undefined)
        }
    })
});

/**
 * Comparer deux objets sans prendre en compte l'ordre des clés.
 */
const objectEquals = (o1: any, o2: any): boolean => {
    if (Object.keys(o1).length !== Object.keys(o2).length) return false

    for (let key of Object.keys(o1)) {
        if (!(key in o2)) return false
        if (typeof o2[key] !== typeof o1[key]) return false
        if (typeof o2[key] === "object") return objectEquals(o1[key], o2[key])
        if (o2[key] !== o1[key]) return false
    }
    return true
}