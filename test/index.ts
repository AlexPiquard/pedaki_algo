import {fixtures} from "./fixtures.ts"
import Algo from "../src/algo/algo.ts"
import * as path from "path"
import * as url from "url"
import * as assert from "assert"
import {BalanceOptionsClassLevelRule} from "../src/algo/rules/balance_option_class_level.ts"

export type Module = {
	studentsFile: string
	inputFile: string
	keysMask: string[]
	skip?: boolean
	countOutput: {[option: string]: number}[]
	levelOutput: {[option: string]: number}[]
	showLevel?: boolean
	description?: string
}
const __filename = url.fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

describe("get classes from input", function () {
	fixtures(__dirname, "algo", async ({module}: {module: Module}) => {
		let {studentsFile, inputFile, keysMask, countOutput, levelOutput, showLevel} = module

		return Promise.all([
			Promise.resolve(import(studentsFile, {assert: {type: "json"}})),
			Promise.resolve(import(inputFile, {assert: {type: "json"}})),
		]).then(([studentsFile, inputFile]) => {
			const students = studentsFile.default
			const input = inputFile.default

			const algo = new Algo(students, input)
			const {entry, duration} = algo.solve()
			console.log(module.description)
			console.log(`duration: ${duration}`)
			console.log(entry.toString(showLevel, ...keysMask))

			const resultCount = entry.toCount(...keysMask).sort()
			const resultLevel = entry.toLevel(...keysMask).sort()
			if (countOutput) assert.equal(countOutput.length, resultCount.length)
			if (levelOutput) assert.equal(levelOutput.length, resultCount.length)

			// On vérifie que chaque classe du résultat était bien dénombrée à l'identique dans le test.
			if (countOutput) {
				for (const entryCount of countOutput) {
					const validClass = resultCount.findIndex(v => v && isClassValid(v, entryCount))
					if (validClass != -1) delete resultCount[validClass]
					assert.notEqual(validClass, -1, "Cant find a valid count model for a resulted class")
				}
			}

			// On vérifie que chaque classe du résultat respecte bien son éventuel niveau moyen pour chaque option.
			if (levelOutput) {
				for (const entryLevel of levelOutput) {
					const validClass = resultLevel.findIndex(v => v && isClassValid(v, toLevelModel(entryLevel)))
					if (validClass != -1) delete resultLevel[validClass]
					assert.notEqual(validClass, -1, "Cant find a valid level model for a resulted class")
				}
			}
		})
	})
})

/**
 * Comparer deux objets sans prendre en compte l'ordre des clés.
 */
const isClassValid = (c: Record<string, number>, model: Record<string, any>): boolean => {
	for (let [attribute, value] of Object.entries(model)) {
		// Si une valeur valide du model n'est pas dans la classe, cela ne correspond pas.
		if (!(attribute in c) && value) return false

		// Si la valeur est une liste de deux nombres, on accepte l'intervalle.
		if (
			Array.isArray(value) &&
			value.length === 2 &&
			typeof value[0] === "number" &&
			typeof value[1] === "number"
		) {
			// On accepte l'intervalle.
			const min = Math.min(value[0], value[1])
			const max = Math.max(value[0], value[1])
			if (c[attribute] < min || c[attribute] > max) return false
		}

		// Si c'est une liste de plus de 2 nombres, ce sont uniquement eux qu'on accepte.
		else if (Array.isArray(value) && value.length > 2 && !value.includes(c[attribute])) return false
		// Si la valeur est un nombre, on les compare
		else if (typeof value === "number" && value != c[attribute]) return false
	}

	return true
}

/**
 * Transformer un modèle de classe de comparaison de niveau, pour y inclure l'intervalle d'incertitude.
 */
const toLevelModel = (model: Record<string, number>): Record<string, number[]> => {
	const newModel: Record<string, number[]> = {}
	for (let [attribute, value] of Object.entries(model)) {
		newModel[attribute] = [value - BalanceOptionsClassLevelRule.ACCURACY, value + BalanceOptionsClassLevelRule.ACCURACY]
	}
	return newModel
}
