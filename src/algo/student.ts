import Entry from "./entry.ts"
import {Input} from "./input.ts"
import Class from "./class.ts"
import {RuleOrder} from "./genetic.ts"

export interface Student {
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

/**
 * Attribuer une note à un étudiant en fonction de son placement dans sa classe.
 * Plus la valeur retournée est proche de 0, plus le placement de l'élève est parfait.
 * On lui attribue aussi une liste de classes qui sont idéales pour lui.
 */
export const getStudentValue = (entry: Entry, input: Input, student: Student): [number, Class[]] => {
	let value = 0
	let currentPriority = 0

	const studentClassIndex = entry.searchStudent(student)?.index!
	const defaultClassList = entry.classes.filter((_c, i) => i !== studentClassIndex)
	let bestClasses = defaultClassList

	for (let {rule, priority} of Object.values(RuleOrder)) {
		// On retourne tout de suite la valeur sans prendre en compte les règles suivante si la valeur est supérieure à 0 et que la priorité de la prochaine règle est inférieure.
		if (value > 0 && currentPriority != priority) return [value, bestClasses]
		// Si la priorité a changé, on réinitialise la liste des classes.
		if (currentPriority != priority) bestClasses = defaultClassList

		const studentValue = rule.getStudentValue(entry, input, student)
		value += studentValue[0]
		bestClasses = bestClasses.filter(c => !studentValue[1].includes(c))
		currentPriority = priority
	}

	return [value, bestClasses]
}
