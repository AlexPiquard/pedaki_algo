import {Input} from "../input.ts"
import Entry from "../entry.ts"
import {Rule} from "./Rule.ts"
import Class from "../class.ts"
import {Student} from "../student.ts"

/**
 * Regrouper une certaine option dans un minimum de classes.
 */
class GroupTogetherRule extends Rule {
	/**
	 * Associer une valeur relative à la règle de regroupement d'une option en fonction d'une certaine disposition.
	 * Prend en compte une liste de classes qui doivent contenir l'option, et incrémente la valeur pour chaque élève mal placé.
	 */
	override getEntryValue(entry: Entry, input: Input, levelKey: string): number {
		let sum = 0
		for (const [, levelValue] of this.getExcludedClasses(entry, input, levelKey)) {
			sum += levelValue ?? 0
		}

		return sum
	}

	/**
	 * @inheritDoc
	 */
	override getStudentValue(entry: Entry, input: Input, student: Student): [number, Class[]] {
		let value = 0

		const levelExcludedClasses: {[level: string]: [string, number][]} = {}
		const studentClassIndex = entry.searchStudent(student)?.index!
		let worseClasses: Class[] = []

		for (const [levelKey, levelInput] of Object.entries(input.levels)) {
			for (const [ruleKey] of Object.entries(levelInput.rules)) {
				if (ruleKey === "group_together") {
					if (levelKey in levelExcludedClasses) continue
					levelExcludedClasses[levelKey] = this.getExcludedClasses(entry, input, levelKey)
				}
			}
		}

		for (const levelKey of Object.keys(student.levels)) {
			// S'il n'est pas dans une classe qui ne doit pas contenir son option, on ne fait rien.
			if (!(levelKey in levelExcludedClasses)) continue

			// On récupère le nombre d'élèves qui ont son option dans sa classe.
			const studentsWithSameOptionInClass = levelExcludedClasses[levelKey].find(
				([i]: [string, number]) => parseInt(i) == studentClassIndex
			)?.[1]
			if (!studentsWithSameOptionInClass) continue

			// On incrémente l'inverse du nombre d'élèves ayant encore cette option, à la valeur retournée.
			value +=
				(input.counts.max_students - studentsWithSameOptionInClass) *
				(input.levels[levelKey].priority ?? 1) *
				(input.levels[levelKey].rules["group_together"] ?? 1)

			// On exclut toutes les classes qui ne doivent pas contenir l'option.
			worseClasses.push(
				...Object.values(levelExcludedClasses[levelKey])
					.map(([classKey]) => entry.classes[parseInt(classKey)])
					.filter(c => !worseClasses.includes(c))
			)
		}

		// S'il est dans une classe regroupant des options sans les avoir, on ajoute l'inverse du nombre d'élèves qui ne l'ont également pas.
		for (const [levelKey, excludedClasses] of Object.entries(levelExcludedClasses)) {
			// Si l'élève est dans une classe qui doit avoir l'option, mais qu'il ne l'a pas...
			// TODO il doit avoir aucune option de toutes les options réservées à cette classe, pas seulement une
			if (
				!excludedClasses.find(([classIndex]: [string, number]) => parseInt(classIndex) == studentClassIndex) &&
				!(levelKey in student.levels)
			) {
				// On incrémente le nombre d'élèves ayant la bonne option dans la classe, à la valeur retournée.
				value +=
					entry.getLevelCountByClass(levelKey)[studentClassIndex] *
					(input.levels[levelKey].priority ?? 1) *
					(input.levels[levelKey].rules["group_together"] ?? 1)

				// On exclut toutes les classes qui doivent contenir l'option.
				worseClasses.push(
					...entry.classes.filter(
						(c, classKey) =>
							!worseClasses.includes(c) &&
							!excludedClasses.find(([excludedClassKey]) => classKey === parseInt(excludedClassKey))
					)
				)
			}
		}

		return [value, worseClasses]
	}

	/**
	 * Retourne la liste des classes qui ne doivent pas contenir une certaine option.
	 * Associe à chaque indice de classe, le nombre d'élèves qui ont l'option (et qui ne devraient donc pas l'avoir).
	 */
	public getExcludedClasses = (entry: Entry, input: Input, level: string): [string, number][] => {
		// Estimer le nombre de classes minimum si on regroupe correctement.
		const classesForLevel = Math.ceil(entry.genetic.getLevelCount(level) / input.counts.max_students)

		// Exclure les classes ayant le plus l'option.
		return Object.keys(entry.classes)
			.map(classKey => [classKey, entry.getLevelCountByClass(level)[classKey] ?? 0] as [string, number])
			.sort((a, b) => a[1] - b[1])
			.slice(0, -classesForLevel)
	}
}

export const GroupTogether = new GroupTogetherRule()
