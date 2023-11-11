import Entry from "../entry.ts"
import {Rule} from "./rule.ts"
import Class from "../class.ts"
import {Student} from "../student.ts"
import {RawRule} from "../input.ts"

/**
 * Regrouper une certaine option dans un minimum de classes.
 */
export class GatherOptionRule extends Rule {
	constructor(rawRule: RawRule) {
		super(rawRule)
	}

	/**
	 * Associer une valeur relative à la règle de regroupement d'une option en fonction d'une certaine disposition.
	 * Prend en compte une liste de classes qui doivent contenir l'option, et incrémente la valeur pour chaque élève mal placé.
	 */
	override getEntryValue(entry: Entry): number {
		return Object.values(this.getExcludedClasses(entry, this.option())).reduce((acc, cur) => acc + cur, 0)
	}

	/**
	 * @inheritDoc
	 * L'élève peut être déplacé dans les classes qui regroupent une ou plusieurs de ses options.
	 * Si aucune classe n'est concernée, alors on lui fait éviter les classes qui regroupent une option.
	 */
	override getStudentValue(entry: Entry, student: Student): {value: number; worseClasses: Class[]} {
		// Récupération des classes qui ne doivent pas contenir l'option.
		const excludedClasses = this.getExcludedClasses(entry, this.option())

		// Récupération de l'identifiant de la classe actuelle de l'élève.
		const studentClassIndex = entry.searchStudent(student)?.index?.toString()!

		// S'il a l'option, il ne doit pas être dans une classe qui ne la regroupe pas.
		if (this.option() in student.levels()) {
			// S'il est dans une classe qui regroupe l'option, il est déjà bien placé.
			// Sinon, on retourne le nombre d'élèves bien placés (s'il est le seul mal placé, il est vraiment très mal placé).
			// Les pires classes sont celles qui ne regroupent pas l'option.
			return {
				value: !(studentClassIndex in excludedClasses)
					? 0
					: entry.algo().input().classSize() - excludedClasses[studentClassIndex],
				worseClasses: Object.keys(excludedClasses).map(classKey => entry.classes()[parseInt(classKey)]),
			}
		}
		// S'il n'a pas l'option, il ne doit pas être dans une classe qui la regroupe.
		else {
			// S'il n'est pas dans une classe qui regroupe l'option, il est déjà bien placé.
			// Sinon, on retourne le nombre d'élèves ayant la bonne option dans la classe.
			// Les pires classes sont celles qui regroupent l'option.
			return {
				value:
					studentClassIndex in excludedClasses
						? 0
						: entry.getOptionCountOfClass(this.option())?.[studentClassIndex],
				worseClasses: entry.classes().filter((_c, i) => !(i in excludedClasses)),
			}
		}
	}

	/**
	 * Retourne la liste des classes qui ne doivent pas contenir une certaine option.
	 * Associe à chaque indice de classe, le nombre d'élèves qui ont l'option (et qui ne devraient donc pas l'avoir).
	 */
	public getExcludedClasses = (entry: Entry, option: string): {[classKey: string]: number} => {
		// Estimer le nombre de classes minimum si on regroupe correctement.
		const classesForLevel = Math.ceil(entry.algo().input().optionCount(option) / entry.algo().input().classSize())

		// Exclure les classes ayant le plus l'option.
		return Object.fromEntries(
			Object.keys(entry.classes())
				.map(classKey => [classKey, entry.getOptionCountOfClass(option)[classKey] ?? 0] as [string, number])
				.sort((a, b) => a[1] - b[1])
				.slice(0, -classesForLevel)
		)
	}
}
