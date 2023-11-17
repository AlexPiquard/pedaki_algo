import Entry from "./entry.ts"
import {Input, RawInput} from "./input.ts"
import {RawStudent, Student} from "./student.ts"

export const DEFAULT_PRIORITY = 1

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
		let entry = Entry.default(this)

		// On fait respecter chaque règle en respectant l'ordre de priorité.
		for (let rule of this.input().rules()) {
			// On fait des changements semi-aléatoires jusqu'à ce que cette règle soit respectée.
			while (rule.getEntryValue(entry) > 0) {
				// On fait un changement semi-aléatoire.
				entry = entry.randomChange(rule)
			}
		}

		// TODO gérer les règles qui ne sont pas compatibles (qui vont boucler à l'infini)
		// TODO retourner un status pour chaque règle (pris en compte - ignoré)
		// TODO s'assurer qu'il n'y a jamais de régression d'une règle à l'autre, c'est pas censé arriver mais il faut sécuriser
		// TODO traduire les "extra" des élèves en options (donc le niveau c'est max ou min)
		// TODO fusionner équilibre de dénombrement et de niveau : spécifier les numéros de niveau à équilibrer dans le dénombrement (balance_option_class_level n'existe plus)
		return {entry: entry, duration: (Date.now() - startTime) / 1000}
	}
}
