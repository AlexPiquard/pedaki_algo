import Entry from "./entry.ts"
import {Input} from "./input.ts"
import {groupTogetherGetExcludedClasses} from "./rules/group_together.ts"
import Class from "./class.ts"

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
 */
export const getStudentValue = (entry: Entry, input: Input, student: Student): [number, Class[]] => {
	let value = 0

	const levelExcludedClasses: {[level: string]: [string, number][]} = {}
	const studentClassIndex = entry.searchStudent(student)?.index
	let bestClasses = entry.classes.filter((_c, i) => i !== studentClassIndex)

	for (const [levelKey, levelInput] of Object.entries(input.levels)) {
		for (const [ruleKey] of Object.entries(levelInput.rules)) {
			if (ruleKey === "group_together") {
				if (levelKey in levelExcludedClasses) continue
				levelExcludedClasses[levelKey] = groupTogetherGetExcludedClasses(entry, input, levelKey)
			}
		}
	}

	/**
	 * Il est dans une classe qui regroupe ses options qui doivent l'être.
	 */

	for (const [levelKey] of Object.entries(student.levels)) {
		// S'il est dans une classe qui ne doit pas contenir son option, on ajoute l'inverse du nombre d'élèves qui l'ont.
		if (levelKey in levelExcludedClasses) {
			const studentsWithSameOptionInClass = levelExcludedClasses[levelKey].find(
				([i]) => parseInt(i) == studentClassIndex
			)?.[1]
			if (studentsWithSameOptionInClass) {
				// On incrémente l'inverse du nombre d'élèves ayant encore cette option, à la valeur retournée.
				value +=
					(input.counts.max_students - studentsWithSameOptionInClass) *
					(input.levels[levelKey].priority ?? 1) *
					(input.levels[levelKey].rules["group_together"] ?? 1)

				// On exclut toutes les classes qui ne doivent pas contenir l'option de la liste des classes idéales pour cet élève.
				bestClasses = bestClasses.filter(
					c =>
						!levelExcludedClasses[levelKey].find(
							([classIndex]) => entry.classes[classIndex as unknown as number] === c
						)
				)
			}
		}
	}

	// S'il est dans une classe regroupant des options sans les avoir, on ajoute l'inverse du nombre d'élèves qui ne l'ont également pas.
	for (const [levelKey, excludedClasses] of Object.entries(levelExcludedClasses)) {
		// Si l'élève est dans une classe qui doit avoir l'option, mais qu'il ne l'a pas...
		if (
			!excludedClasses.find(([classIndex]) => parseInt(classIndex) == studentClassIndex) &&
			!(levelKey in student.levels)
		) {
			// On incrémente le nombre d'élèves ayant la bonne option dans la classe, à la valeur retournée.
			value +=
				entry.getLevelCountByClass(levelKey)[studentClassIndex as number] *
				(input.levels[levelKey].priority ?? 1) *
				(input.levels[levelKey].rules["group_together"] ?? 1)

			// On exclut toutes les classes qui doivent contenir l'option de la liste des classes idéales pour cet élève.
			bestClasses = bestClasses.filter(c =>
				levelExcludedClasses[levelKey].find(
					([classIndex]) => entry.classes[classIndex as unknown as number] === c
				)
			)
		}
	}

	// Son niveau n'influence pas un niveau moyen de la classe trop gros.
	// Son niveau n'influence pas un niveau moyen de la classe trop faible.
	// Il n'est pas dans une classe qui contient trop de fois une de ses options qui doit être répartie.

	return [value, bestClasses]
}
