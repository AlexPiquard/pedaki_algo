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
		for (const {levelCount} of this.getExcludedClasses(entry, input, levelKey)) {
			sum += levelCount ?? 0
		}

		return sum
	}

	/**
	 * @inheritDoc
	 * L'élève peut être déplacé dans les classes qui regroupent une ou plusieurs de ses options.
	 * Si aucune classe n'est concernée, alors on lui fait éviter les classes qui regroupent une option.
	 */
	override getStudentValue(entry: Entry, input: Input, student: Student): {value: number; worseClasses: Class[]} {
		let value = 0

		const levelExcludedClasses: {[level: string]: {classKey: string; levelCount: number}[]} = {}
		const studentClassIndex = entry.searchStudent(student)?.index!
		let worseClasses: Class[] = entry.classes

		for (let levelKey of entry.genetic.getLevelsOfRule("group_together")) {
			levelExcludedClasses[levelKey] = this.getExcludedClasses(entry, input, levelKey)
		}

		// Il ne doit pas être dans une classe qui ne regroupe aucune de ses options
		for (const levelKey of Object.keys(student.levels)) {
			// Si cette option ne privilégie aucune classe, on ne fait rien.
			if (!(levelKey in levelExcludedClasses)) continue

			// On exclut toutes les classes qui ne contiennent aucune de ses options à regrouper.
			// Donc, on retire de la liste les classes qui doivent contenir son option.
			worseClasses = worseClasses.filter(c =>
				levelExcludedClasses[levelKey].find(({classKey}) => entry.classes[parseInt(classKey)] === c)
			)

			// On récupère le nombre d'élèves qui ont son option dans sa classe.
			const studentsWithSameOptionInClass = levelExcludedClasses[levelKey].find(
				({classKey}) => parseInt(classKey) == studentClassIndex
			)?.levelCount
			if (!studentsWithSameOptionInClass) continue

			// On incrémente le nombre d'élèves bien placés, à la valeur retournée (s'il est le seul mal placé, il est vraiment très mal placé).
			value +=
				(input.counts.max_students - studentsWithSameOptionInClass) *
				(input.levels[levelKey].priority ?? 1) *
				(input.levels[levelKey].rules["group_together"] ?? 1)
		}

		// Si aucune classe de destination n'a été trouvée, on ajoute celles qui ne regroupent aucune option.
		if (worseClasses.length === entry.classes.length) {
			worseClasses = worseClasses.filter(c => {
				const classKey = entry.classes.indexOf(c)
				// On garde la classe si elle regroupe au moins une option, donc si elle n'apparait pas dans au moins une liste de classes exclues.
				return Object.values(levelExcludedClasses).find(
					excludedClasses =>
						!excludedClasses.find(excludedObject => parseInt(excludedObject.classKey) === classKey)
				)
			})
		}

		// Il ne doit pas être dans une classe regroupant des options s'il ne les a pas.
		for (const [levelKey, excludedClasses] of Object.entries(levelExcludedClasses)) {
			// Si l'élève a cette option, on ne fait rien.
			if (levelKey in student.levels) continue

			// Si l'élève est dans une classe qui ne doit pas avoir l'option, on ne fait rien non plus.
			if (excludedClasses.find(({classKey}) => parseInt(classKey) == studentClassIndex)) continue

			// On incrémente le nombre d'élèves ayant la bonne option dans la classe, à la valeur retournée.
			value +=
				entry.getLevelCountByClass(levelKey)[studentClassIndex] *
				(input.levels[levelKey].priority ?? 1) *
				(input.levels[levelKey].rules["group_together"] ?? 1)
		}

		return {value, worseClasses}
	}

	/**
	 * Retourne la liste des classes qui ne doivent pas contenir une certaine option.
	 * Associe à chaque indice de classe, le nombre d'élèves qui ont l'option (et qui ne devraient donc pas l'avoir).
	 */
	public getExcludedClasses = (
		entry: Entry,
		input: Input,
		level: string
	): {classKey: string; levelCount: number}[] => {
		// Estimer le nombre de classes minimum si on regroupe correctement.
		const classesForLevel = Math.ceil(entry.genetic.getLevelCount(level) / input.counts.max_students)

		// Exclure les classes ayant le plus l'option.
		return Object.keys(entry.classes)
			.map(classKey => ({classKey, levelCount: entry.getLevelCountByClass(level)[classKey] ?? 0}))
			.sort((a, b) => a.levelCount - b.levelCount)
			.slice(0, -classesForLevel)
	}
}

export const GroupTogether = new GroupTogetherRule()
