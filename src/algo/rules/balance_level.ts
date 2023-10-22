import {Rule} from "./Rule.ts"
import Entry from "../entry.ts"
import {Input} from "../input.ts"
import {Student} from "../student.ts"
import Class from "../class.ts"
import {MAX_LEVEL, MIN_LEVEL} from "../genetic.ts"

/**
 * Équilibrer le niveau d'une certaine option dans chaque classe qui possède l'option.
 * C'est une règle complémentaire qui ne peut pas exister seule.
 */
class BalanceLevelRule extends Rule {
	public readonly ACCURACY = 0.5

	/**
	 * Associer une valeur relative à la règle d'équilibrage du niveau d'une option sur les classes qui ont l'option, en fonction d'une certaine disposition.
	 * Incrémente la valeur de retour de chaque différence de niveau moyen.
	 */
	override getEntryValue(entry: Entry, _input: Input, levelKey: string): number {
		let sum = 0

		for (let classKey of Object.keys(entry.classes)) {
			sum += Math.abs(this.getDifference(this.getAverageLevelForClass(entry, levelKey, classKey)))
		}

		return sum
	}

	/**
	 * @inheritDoc
	 * Pénalisation de la valeur si le niveau de l'élève fait trop monter celui de la classe, ou s'il fait le fait trop diminuer.
	 * Il ne doit pas être déplacé dans les classes dans lesquelles il aggraverait l'équilibre du niveau.
	 */
	override getStudentValue(entry: Entry, input: Input, student: Student): {value: number; worseClasses: Class[]} {
		let value = 0

		const classLevelDiff: {[levelKey: string]: {[classKey: string]: number}} = {}
		const studentClassIndex = entry.searchStudent(student)?.index!

		// Obtenir le niveau moyen d'une option dans une classe.
		const classLevelDiffCache = (levelKey: string, classKey: string) => {
			if (levelKey in classLevelDiff && classKey in classLevelDiff[levelKey])
				return classLevelDiff[levelKey][classKey]
			else {
				const classDiff = this.getDifference(this.getAverageLevelForClass(entry, levelKey, classKey))
				if (!(levelKey in classLevelDiff)) classLevelDiff[levelKey] = {}
				classLevelDiff[levelKey][classKey] = classDiff
				return classDiff
			}
		}

		for (let levelKey in student.levels) {
			// Si ce niveau n'utilise pas cette règle, on ne fait rien.
			if (!(levelKey in input.levels) || !("balance_level" in input.levels[levelKey])) continue

			// Récupération de la différence entre le niveau du joueur et la moyenne requise.
			const studentDiff = this.getDifference(student.levels[levelKey])

			// Récupération de la différence entre le niveau moyen de la classe et la moyenne requise.
			const classDiff = classLevelDiffCache(levelKey, studentClassIndex.toString())

			// Si l'élève augmente un niveau de classe déjà trop haut, ou diminue un niveau déjà trop bas, on incrémente la valeur par rapport à la différence.
			if ((studentDiff < 0 && classDiff < 0) || (studentDiff > 0 && classDiff > 0))
				value +=
					Math.floor(studentDiff) *
					(input.levels[levelKey].priority ?? 1) *
					(input.levels[levelKey].rules["balance_level"] ?? 1)
		}

		// L'élève doit être déplacé dans les classes dans lesquelles il améliorerait l'équilibre du niveau.
		const worseClasses = Object.entries(entry.classes)
			.filter(([classKey]) => {
				// Il peut aller dans cette classe s'il améliore l'équilibre de tous ses niveaux.
				// Donc il n'y va pas s'il y a un niveau qu'il n'améliore pas.
				return entry.genetic.getLevelsOfRule("balance_level").find(levelKey => {
					const studentDiff = this.getDifference(student.levels[levelKey])
					const classDiff = classLevelDiffCache(levelKey, classKey)
					return (studentDiff < 0 && classDiff < 0) || (studentDiff > 0 && classDiff > 0)
				})
			})
			.map(([, c]) => c)

		return {value, worseClasses}
	}

	/**
	 * Obtenir le niveau moyen d'une option dans une classe.
	 */
	public getAverageLevelForClass(entry: Entry, levelKey: string, classKey: string) {
		return entry.getLevelSumByClass(levelKey)[classKey] / entry.getLevelCountByClass(levelKey)[classKey]
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

export const BalanceLevel = new BalanceLevelRule()
