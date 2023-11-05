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

	// Liste des options de l'élève, qui contient également son genre, associé à chaque niveau.
	private readonly _levels: {[option: string]: number}

	constructor(student: RawStudent) {
		this.student = student

		this._levels = {...this.student.levels, [this.student.gender]: 5}
	}

	public id(): string {
		return this.student.id
	}

	public levels(): {[option: string]: number} {
		return this._levels
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
		const defaultClassList = entry.classes().filter((_c, i) => i !== studentClassIndex)
		let bestClasses = defaultClassList

		for (const [ruleKey, {rule, priority}] of Object.entries(RuleOrder)) {
			// On retourne tout de suite la valeur sans prendre en compte les règles suivante si la valeur est supérieure à 0 et que la priorité de la prochaine règle est inférieure.
			if (value > 0 && currentPriority != priority) return {value, bestClasses}
			// Si la priorité a changé, on réinitialise la liste des classes.
			if (currentPriority != priority) bestClasses = defaultClassList

			// Réaliser les calculs pour chaque présence de cette règle dans l'input.
			const worseClasses: Class[] = []
			let commonWorseClasses: Class[] = defaultClassList
			for (const inputRule of entry.genetic().input().rulesOfKey(ruleKey)) {
				const studentValue = rule.getStudentValue(entry, inputRule, this)
				value += studentValue.value * priority * inputRule.priority()
				worseClasses.push(...studentValue.worseClasses.filter(c => !worseClasses.includes(c)))
				commonWorseClasses = commonWorseClasses.filter(c => studentValue.worseClasses.includes(c))
			}

			// Si plusieurs options sont concernées et qu'il ne reste aucune classe de destination, on garde celles qui sont la meilleure d'au moins une option.
			bestClasses = bestClasses.filter(c => {
				if (
					entry.genetic().input().rulesOfKey(ruleKey).length > 1 &&
					worseClasses.length >= defaultClassList.length
				)
					return !commonWorseClasses.includes(c)
				return !worseClasses.includes(c)
			})

			currentPriority = priority
		}

		return {value, bestClasses}
	}
}
