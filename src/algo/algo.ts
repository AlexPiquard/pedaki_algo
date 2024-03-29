import Entry from "./entry.ts"
import {Input, RawInput} from "./input.ts"
import {RawStudent} from "./student.ts"

export const DEFAULT_PRIORITY = 1

export type Result = {entry: Entry; duration: number; rules: {respect_percent: number}[]}

/**
 * On exécute une liste de règles dans un certain ordre.
 * On attend que chaque règle soit entièrement respectée, ou déclarée non compatible, pour passer à la suite.
 * La validation d'une règle se détermine par la valeur de la solution qui doit être nulle.
 * La modification des solutions est guidée par des valeurs associées à chaque élève,
 * relative à son placement et à la règle courante, ainsi qu'une liste de destinations envisageables.
 */
export default class Algo {
	private readonly _input: Input

	constructor(students: RawStudent[], rawInput: RawInput) {
		this._input = new Input(rawInput, students)
	}

	public input() {
		return this._input
	}

	public solve(): Result {
		const startTime = Date.now()
		const entry = Entry.default(this)
		const result: Partial<Result> = {}

		// On fait respecter chaque règle en respectant l'ordre de priorité.
		for (const rule of this.input().rules()) {
			// On effectue les déplacements jusqu'à ce que cette règle soit respectée, ou que plus aucun déplacement ne soit possible.
			let moves = Number.MAX_VALUE
			while (entry.value(rule) > 0 && moves > 0) {
				// On effectue les déplacements voulus por la règle courante.
				moves = entry.moveStudents(rule)
			}
			if (!result.rules) result.rules = []
			result.rules[rule.initialIndex()] = {respect_percent: rule.getRespectPercent(entry)}
		}

		result.entry = entry
		result.duration = (Date.now() - startTime) / 1000
		return result as Result
	}
}
