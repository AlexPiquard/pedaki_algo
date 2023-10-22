import {fixtures} from "./fixtures.ts"
import Genetic from "../src/algo/genetic.ts"
import * as path from "path"
import * as url from "url"
import * as assert from "assert"
import {BalanceLevel} from "../src/algo/rules/balance_level.ts";

export type Module = {
	studentsFile: string
	inputFile: string
	keysMask: string[]
	skip?: boolean
	countOutput: {[levelKey: string]: number}[]
	levelOutput: {[levelKey: string]: number}[]
	showLevel?: boolean
}
const __filename = url.fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

describe("get classes from input", function () {
	fixtures(__dirname, "genetic", async ({module}: {module: Module}) => {
		let {studentsFile, inputFile, keysMask, countOutput, levelOutput, showLevel} = module

		return Promise.all([
			Promise.resolve(import(studentsFile, {assert: {type: "json"}})),
			Promise.resolve(import(inputFile, {assert: {type: "json"}})),
		]).then(([studentsFile, inputFile]) => {
			const students = studentsFile.default
			const input = inputFile.default

			const algo = new Genetic()
			const {entry, duration} = algo.solve(students, input)
			console.log(`value: ${entry.getValue(input)}, duration: ${duration}`)
			console.log(entry.toString(showLevel, ...keysMask))

			const resultCount = entry.toCount(...keysMask).sort()
			const resultLevel = entry.toLevel(...keysMask).sort()
			if (countOutput) assert.equal(countOutput.length, resultCount.length)
			if (levelOutput) assert.equal(levelOutput.length, resultCount.length)

			// On vérifie que chaque classe du résultat était bien dénombrée à l'identique dans le test.
			if (countOutput) {
				for (let entryCount of countOutput) {
					assert.notEqual(
						resultCount.find(v => objectEquals(v, entryCount)),
						undefined
					)
				}
			}

			// On vérifie que chaque classe du résultat respecte bien son éventuel niveau moyen pour chaque option.
			if (levelOutput) {
				for (let entryLevel of levelOutput) {
					assert.notEqual(
						resultLevel.find(v => objectEquals(v, entryLevel, BalanceLevel.ACCURACY)),
						undefined
					)
				}
			}
		})
	})
})

/**
 * Comparer deux objets sans prendre en compte l'ordre des clés.
 */
const objectEquals = (o1: any, o2: any, numbersAccuracy?: number): boolean => {
	if (Object.keys(o1).length !== Object.keys(o2).length) return false

	for (let key of Object.keys(o1)) {
		if (!(key in o2)) return false
		if (typeof o2[key] !== typeof o1[key]) return false
		if (typeof o2[key] === "object") return objectEquals(o1[key], o2[key])
		if (typeof o2[key] === "number" && numbersAccuracy) {
			if (Math.abs(o2[key] - o1[key]) > numbersAccuracy) return false
		}
		else if (o2[key] !== o1[key]) return false
	}
	return true
}
