import {InputRule} from "../input.ts"
import Entry from "../entry.ts"
import {Rule} from "./rule.ts"
import Class from "../class.ts"
import {Student} from "../student.ts"

/**
 * Regrouper une certaine option dans un minimum de classes.
 */
class GatherOptionRule extends Rule {
	/**
	 * Associer une valeur relative à la règle de regroupement d'une option en fonction d'une certaine disposition.
	 * Prend en compte une liste de classes qui doivent contenir l'option, et incrémente la valeur pour chaque élève mal placé.
	 */
	override getEntryValue(entry: Entry, rule: InputRule): number {
		let sum = 0
		for (const {optionCount} of this.getExcludedClasses(entry, rule.option())) {
			sum += optionCount ?? 0
		}

		return sum
	}

	/**
	 * @inheritDoc
	 * L'élève peut être déplacé dans les classes qui regroupent une ou plusieurs de ses options.
	 * Si aucune classe n'est concernée, alors on lui fait éviter les classes qui regroupent une option.
	 */
	override getStudentValue(entry: Entry, _rule: InputRule, student: Student): {value: number; worseClasses: Class[]} {
		let value = 0

		const optionExcludedClasses: {[option: string]: {classKey: string; optionCount: number}[]} = {}
		const studentClassIndex = entry.searchStudent(student)?.index!
		let worseClasses: Class[] = entry.classes

		for (const option of entry.genetic.input().ruleOptions("gather_option")) {
			optionExcludedClasses[option] = this.getExcludedClasses(entry, option)
		}

		// TODO cela ne doit prendre en compte que l'option de la règle concernée, sinon on fait tout en double pour rien.
		// Il ne doit pas être dans une classe qui ne regroupe aucune de ses options
		for (const option of Object.keys(student.options())) {
			// Si cette option ne privilégie aucune classe, on ne fait rien.
			if (!(option in optionExcludedClasses)) continue

			// On exclut toutes les classes qui ne contiennent aucune de ses options à regrouper.
			// Donc, on retire de la liste les classes qui doivent contenir son option.
			worseClasses = worseClasses.filter(c =>
				optionExcludedClasses[option].find(({classKey}) => entry.classes[parseInt(classKey)] === c)
			)

			// On récupère le nombre d'élèves qui ont son option dans sa classe.
			const studentsWithSameOptionInClass = optionExcludedClasses[option].find(
				({classKey}) => parseInt(classKey) == studentClassIndex
			)?.optionCount
			if (!studentsWithSameOptionInClass) continue

			// On incrémente le nombre d'élèves bien placés, à la valeur retournée (s'il est le seul mal placé, il est vraiment très mal placé).
			value += entry.genetic.input().classSize() - studentsWithSameOptionInClass
		}

		// Si aucune classe de destination n'a été trouvée, on ajoute celles qui ne regroupent aucune option.
		if (worseClasses.length === entry.classes.length) {
			worseClasses = worseClasses.filter(c => {
				const classKey = entry.classes.indexOf(c)
				// On garde la classe si elle regroupe au moins une option, donc si elle n'apparait pas dans au moins une liste de classes exclues.
				return Object.values(optionExcludedClasses).find(
					excludedClasses =>
						!excludedClasses.find(excludedObject => parseInt(excludedObject.classKey) === classKey)
				)
			})
		}

		// Il ne doit pas être dans une classe regroupant des options s'il ne les a pas.
		for (const [option, excludedClasses] of Object.entries(optionExcludedClasses)) {
			// Si l'élève a cette option, on ne fait rien.
			if (option in student.options()) continue

			// Si l'élève est dans une classe qui ne doit pas avoir l'option, on ne fait rien non plus.
			if (excludedClasses.find(({classKey}) => parseInt(classKey) == studentClassIndex)) continue

			// On incrémente le nombre d'élèves ayant la bonne option dans la classe, à la valeur retournée.
			value += entry.getOptionCountOfClass(option)?.[studentClassIndex]
		}

		return {value, worseClasses}
	}

	/**
	 * Retourne la liste des classes qui ne doivent pas contenir une certaine option.
	 * Associe à chaque indice de classe, le nombre d'élèves qui ont l'option (et qui ne devraient donc pas l'avoir).
	 */
	public getExcludedClasses = (entry: Entry, option: string): {classKey: string; optionCount: number}[] => {
		// Estimer le nombre de classes minimum si on regroupe correctement.
		const classesForLevel = Math.ceil(entry.genetic.input().optionCount(option) / entry.genetic.input().classSize())

		// Exclure les classes ayant le plus l'option.
		return Object.keys(entry.classes)
			.map(classKey => ({classKey, optionCount: entry.getOptionCountOfClass(option)[classKey] ?? 0}))
			.sort((a, b) => a.optionCount - b.optionCount)
			.slice(0, -classesForLevel)
	}
}

export const GatherOption = new GatherOptionRule()
