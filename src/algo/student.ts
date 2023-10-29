import Entry from "./entry.ts"
import Class from "./class.ts"
import {RuleOrder} from "./genetic.ts"

export interface RawStudent {
	id: string
	birthdate: Date
	gender: string
	relations?: {
		positive?: string[]
		negative?: string[]
		required?: string[]
		forbidden?: string[]
	}
	// Je pars du principe que les niveaux présents indiquent les options choisies
	levels: {[key: string]: number}
	extra?: {[key: string]: boolean}
}

export class Student {
	private student: RawStudent

	// Liste des options de l'élève, qui contient également son genre.
	private readonly _options: {[option: string]: number}

	constructor(student: RawStudent) {
		this.student = student

		this._options = {...this.student.levels, [this.student.gender]: 5}
	}

	public id(): string {
		return this.student.id
	}

	public options(): {[option: string]: number} {
		return this._options
	}

	/**
	 * Attribuer une note à un étudiant en fonction de son placement dans sa classe.
	 * Plus la valeur retournée est proche de 0, plus le placement de l'élève est parfait.
	 * On lui attribue aussi une liste de classes qui sont idéales pour lui.
	 */
	public value(entry: Entry): {value: number; bestClasses: Class[]} {
		let value = 0
		let currentPriority = 0

		const studentClassIndex = entry.searchStudent(this)?.index!
		const defaultClassList = entry.classes.filter((_c, i) => i !== studentClassIndex)
		let bestClasses = defaultClassList

		for (const [ruleKey, {rule, priority}] of Object.entries(RuleOrder)) {
			// On retourne tout de suite la valeur sans prendre en compte les règles suivante si la valeur est supérieure à 0 et que la priorité de la prochaine règle est inférieure.
			if (value > 0 && currentPriority != priority) return {value, bestClasses}
			// Si la priorité a changé, on réinitialise la liste des classes.
			if (currentPriority != priority) bestClasses = defaultClassList

			// Réaliser les calculs pour chaque présence de cette règle dans l'input.
			for (const inputRule of entry.genetic.input().rulesOfKey(ruleKey)) {
				const studentValue = rule.getStudentValue(entry, inputRule, this)
				value += studentValue.value * priority * inputRule.priority()
				bestClasses = bestClasses.filter(c => !studentValue.worseClasses.includes(c))
			}

			currentPriority = priority
		}

		return {value, bestClasses}
	}
}
