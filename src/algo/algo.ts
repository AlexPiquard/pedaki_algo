import Entry from "./entry.ts"
import {Input, RawInput} from "./input.ts"
import {RawStudent, Student} from "./student.ts"

export const MIN_LEVEL = 0
export const MAX_LEVEL = 5
export const DEFAULT_PRIORITY = 1
const GENERATED_CHILDREN_PER_GENERATION = 1
const GENERATION_SIZE = 1

export type Result = {entry: Entry; duration: number}

/**
 * On exécute une liste de règles dans un certain ordre.
 * On attend que chaque règle soit entièrement respectée, ou déclarée non compatible, pour passer à la suite.
 * La validation d'une règle se détermine par la valeur de la solution qui doit être nulle.
 * La modification des solutions est guidée par des valeurs associées à chaque élève,
 * relative à son placement et à la règle courante, ainsi qu'une liste de destinations envisageables.
 */
export default class Algo {
	private readonly _students: Student[]
	private readonly _input: Input

	constructor(students: RawStudent[], rawInput: RawInput) {
		this._students = students.map(student => new Student(student))
		this._input = new Input(rawInput, this._students)
	}

	public students() {
		return this._students
	}

	public input() {
		return this._input
	}

	public solve(): Result {
		const startTime = Date.now()
		let entries = [Entry.default(this)]

		// On fait respecter chaque règle en respectant l'ordre de priorité.
		for (let rule of this.input().rules()) {
			let bestValue = rule.getEntryValue(entries[0])

			// On fait des changements semi-aléatoires jusqu'à ce que cette règle soit respectée.
			while (bestValue > 0) {
				// On fait un changement semi-aléatoire dans chaque configuration.
				for (let i = 0; i < GENERATED_CHILDREN_PER_GENERATION; ++i) {
					entries.push(entries[i % entries.length].randomChange(rule))
				}

				// On ne garde que les meilleurs.
				entries
					.sort((a, b) => rule.getEntryValue(a) - rule.getEntryValue(b))
					.splice(GENERATION_SIZE, GENERATED_CHILDREN_PER_GENERATION)

				bestValue = rule.getEntryValue(entries[0])
			}

			entries = [entries[0]]
		}

		// TODO gérer les règles qui ne sont pas compatibles (qui vont boucler à l'infini)
		// TODO retourner un status pour chaque règle (pris en compte - ignoré)
		// TODO s'assurer qu'il n'y a jamais de régression d'une règle à l'autre, c'est pas censé arriver mais il faut sécuriser
		// TODO voir pourquoi la règle de maximisation et équilibrage a besoin de 10 séquences de changement
		return {entry: entries[0], duration: (Date.now() - startTime) / 1000}
	}
}
