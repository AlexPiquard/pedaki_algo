import {Rule} from "./rule.ts"
import Entry from "../entry.ts"
import {InputRule} from "../input.ts"
import Class from "../class.ts"
import {MAX_LEVEL, MIN_LEVEL} from "../genetic.ts"
import {Student} from "../student.ts"

/**
 * Équilibrer le niveau d'une certaine option dans chaque classe qui possède l'option.
 * C'est une règle complémentaire qui ne peut pas exister seule.
 */
class BalanceOptionsClassLevelRule extends Rule {
	public readonly ACCURACY = 0.5

	/**
	 * Associer une valeur relative à la règle d'équilibrage du niveau d'une option sur les classes qui ont l'option, en fonction d'une certaine disposition.
	 * Incrémente la valeur de retour de chaque différence de niveau moyen.
	 */
	override getEntryValue(entry: Entry, rule: InputRule): number {
		let sum = 0

		for (const classKey of Object.keys(entry.classes)) {
			sum += Math.abs(this.getDifference(this.getAverageLevelForClass(entry, rule.option(), classKey)))
		}

		return sum
	}

	/**
	 * @inheritDoc
	 * Pénalisation de la valeur si le niveau de l'élève fait trop monter celui de la classe, ou s'il le fait trop diminuer.
	 * Il ne doit pas être déplacé dans les classes dans lesquelles il aggraverait l'équilibre du niveau.
	 */
	override getStudentValue(entry: Entry, rule: InputRule, student: Student): {value: number; worseClasses: Class[]} {
		let value = 0

		const classLevelDiff: {[option: string]: {[classKey: string]: number}} = {}
		const studentClassIndex = entry.searchStudent(student)?.index!

		// Obtenir le niveau moyen d'une option dans une classe.
		const classLevelDiffCache = (option: string, classKey: string) => {
			if (option in classLevelDiff && classKey in classLevelDiff[option]) return classLevelDiff[option][classKey]
			else {
				const classDiff = this.getDifference(this.getAverageLevelForClass(entry, option, classKey))
				if (!(option in classLevelDiff)) classLevelDiff[option] = {}
				classLevelDiff[option][classKey] = classDiff
				return classDiff
			}
		}

		// Récupération de la différence entre le niveau du joueur et la moyenne requise.
		const studentDiff = this.getDifference(student.options()[rule.option()])

		// Récupération de la différence entre le niveau moyen de la classe et la moyenne requise.
		const classDiff = classLevelDiffCache(rule.option(), studentClassIndex.toString())

		// Si l'élève augmente un niveau de classe déjà trop haut, ou diminue un niveau déjà trop bas, on incrémente la valeur par rapport à la différence.
		if ((studentDiff < 0 && classDiff < 0) || (studentDiff > 0 && classDiff > 0)) value += Math.floor(studentDiff)

		// L'élève doit être déplacé dans les classes dans lesquelles il améliorerait l'équilibre du niveau.
		const worseClasses = Object.entries(entry.classes)
			.filter(([classKey]) => {
				// Il peut aller dans cette classe s'il améliore l'équilibre de tous ses niveaux.
				// Donc il n'y va pas s'il y a un niveau qu'il n'améliore pas.
				return entry.genetic
					.input()
					.ruleOptions("balance_options_class_level")
					.find(option => {
						const studentDiff = this.getDifference(student.options()[option])
						const classDiff = classLevelDiffCache(option, classKey)
						return (studentDiff < 0 && classDiff < 0) || (studentDiff > 0 && classDiff > 0)
					})
			})
			.map(([, c]) => c)

		return {value, worseClasses}
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
		if (value > avgLevel + this.ACCURACY) return value - (avgLevel + this.ACCURACY)
		else if (value < avgLevel - this.ACCURACY) return value - (avgLevel - this.ACCURACY)

		return 0
	}
}

export const BalanceOptionsClassLevel = new BalanceOptionsClassLevelRule()
