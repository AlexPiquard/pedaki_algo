import {Rule} from "./rule.ts"
import Entry from "../entry.ts"
import Class from "../class.ts"
import {MAX_LEVEL, MIN_LEVEL} from "../algo.ts"
import {Student} from "../student.ts"
import {RawRule} from "../input.ts"

/**
 * Équilibrer le niveau d'une certaine option dans chaque classe qui possède l'option.
 * C'est une règle complémentaire qui ne peut pas exister seule.
 */
export class BalanceOptionsClassLevelRule extends Rule {
	public static readonly ACCURACY = 0.5

	constructor(rawRule: RawRule) {
		super(rawRule)
	}

	/**
	 * Associer une valeur relative à la règle d'équilibrage du niveau d'une option sur les classes qui ont l'option, en fonction d'une certaine disposition.
	 * Incrémente la valeur de retour de chaque différence de niveau moyen.
	 */
	override getEntryValue(entry: Entry): number {
		let sum = 0

		for (const classKey of Object.keys(entry.classes())) {
			sum += Math.abs(this.getDifference(this.getAverageLevelForClass(entry, this.option(), classKey)))
		}

		return sum
	}

	/**
	 * @inheritDoc
	 * Pénalisation de la valeur si le niveau de l'élève fait trop monter celui de la classe, ou s'il le fait trop diminuer.
	 * Il ne doit pas être déplacé dans les classes dans lesquelles il aggraverait l'équilibre du niveau.
	 */
	override getStudentValue(entry: Entry, student: Student): {value: number; worseClasses: Class[]} {
		const studentClassIndex = entry.searchStudent(student)?.index!

		// Récupération de la différence entre le niveau de l'élève et la moyenne requise.
		const studentDiff = this.getDifference(student.levels()[this.option()])

		// Récupération de la différence entre le niveau moyen de la classe et la moyenne requise.
		const classDiff = this.getDifference(
			this.getAverageLevelForClass(entry, this.option(), studentClassIndex.toString())
		)

		// On retourne la différence avec le niveau de la classe, ainsi que les classes dans lesquelles il n'améliorerait pas le niveau.
		return {
			value:
				(studentDiff < 0 && classDiff < 0) || (studentDiff > 0 && classDiff > 0) ? Math.floor(studentDiff) : 0,
			worseClasses: Object.entries(entry.classes())
				.filter(([classKey]) => {
					// On conserve cette classe si l'élève n'améliore pas le niveau.
					const studentDiff = this.getDifference(student.levels()[this.option()])
					const classDiff = this.getDifference(this.getAverageLevelForClass(entry, this.option(), classKey))
					return (studentDiff < 0 && classDiff < 0) || (studentDiff > 0 && classDiff > 0)
				})
				.map(([, c]) => c),
		}
	}

	/**
	 * Obtenir le niveau moyen d'une option dans une classe.
	 */
	public getAverageLevelForClass(entry: Entry, option: string, classKey: string) {
		return entry.getLevelSumOfClass(option)[classKey] / entry.getOptionCountOfClass(option)[classKey]
	}

	/**
	 * Obtenir la différence entre l'objectif de niveau moyen et un quelconque niveau.
	 * Prend en compte un degré de précision accepté.
	 */
	public getDifference = (value: number) => {
		const avgLevel = (MIN_LEVEL + MAX_LEVEL) / 2
		if (value > avgLevel + BalanceOptionsClassLevelRule.ACCURACY)
			return value - (avgLevel + BalanceOptionsClassLevelRule.ACCURACY)
		else if (value < avgLevel - BalanceOptionsClassLevelRule.ACCURACY)
			return value - (avgLevel - BalanceOptionsClassLevelRule.ACCURACY)

		return 0
	}
}
