import Entry from "../entry.ts"
import {Rule} from "./Rule.ts"
import {Input} from "../input.ts"
import Class from "../class.ts"
import {Student} from "../student.ts"

/**
 * Répartir équitablement le nombre d'élèves ayant une option dans chaque classe possédant cette option.
 * C'est une règle complémentaire qui ne peut pas exister seule.
 */
class BalanceCountRule extends Rule {
	/**
	 * Associer une valeur relative à la règle d'équilibrage des options sur les classes qui ont l'option, en fonction d'une certaine disposition.
	 * Définit le nombre d'élèves ayant l'option idéal par classe qui possède l'option, puis incrémente la valeur pour chaque dénombrement différent.
	 * On autorise une marge d'imprécision à définir.
	 */
	override getEntryValue(entry: Entry, _input: Input, levelKey: string): number {
		const countGoal = this.getCountPerClass(entry, levelKey)
		let value = 0
		for (const classKey of Object.keys(entry.classes)) {
			const count = entry.getLevelCountByClass(levelKey)[classKey]

			// Si personne n'a l'option dans cette classe, on l'ignore.
			if (!count) continue

			// On incrémente la différence entre le nombre d'élèves et l'objectif.
			value += Math.abs(this.getDifference(count, countGoal))
		}
		return value
	}

	/**
	 * @inheritDoc
	 */
	override getStudentValue(entry: Entry, input: Input, student: Student): [number, Class[]] {
		let value = 0

		const levelGoals: {[level: string]: number} = {}
		const studentClassIndex = entry.searchStudent(student)?.index!
		let worseClasses: Class[] = []

		for (const [levelKey, levelInput] of Object.entries(input.levels)) {
			for (const [ruleKey] of Object.entries(levelInput.rules)) {
				if (ruleKey === "balance_count") {
					if (levelKey in levelGoals) continue
					levelGoals[levelKey] = this.getCountPerClass(entry, levelKey)
				}
			}
		}

		for (let levelKey of Object.keys(student.levels)) {
			// Si son option n'a pas un nombre idéal défini par classe, on ne fait rien.
			if (!(levelKey in levelGoals)) continue

			// On récupère le nombre d'élèves ayant cette option dans sa classe.
			const count = entry.getLevelCountByClass(levelKey)[studentClassIndex]
			// Si cette valeur est supérieure à l'objectif, alors on incrémente la différence.
			const diff = this.getDifference(count, levelGoals[levelKey])
			if (diff > 0)
				value +=
					diff * (input.levels[levelKey].priority ?? 1) * (input.levels[levelKey].rules["balance_count"] ?? 1)

			// On exclut les classes qui ont trop l'option, de la liste de celles idéales pour l'élève.
			worseClasses.push(
				...entry.classes.filter(
					(_c, classKey) =>
						this.getDifference(
							entry.getLevelCountByClass(levelKey)?.[classKey] ?? 0,
							levelGoals[levelKey]
						) >= 0
				)
			)
		}

		return [value, worseClasses]
	}

	/**
	 * Obtenir le nombre idéal d'élèves ayant l'option par classe.
	 */
	public getCountPerClass = (entry: Entry, level: string) => {
		return entry.genetic.getLevelCount(level) / Object.keys(entry.getLevelCountByClass(level)).length
	}

	/**
	 * Obtenir la différence d'un nombre d'élèves par rapport à un objectif.
	 * Prend en compte un objectif décimal (autorise les deux entiers).
	 */
	public getDifference = (value: number, goal: number) => {
		// Si l'objectif est un nombre entier, on le compare directement
		if (goal % 1 === 0) return value - goal
		// Si l'objectif est décimal, on autorise les deux nombres entiers.
		else if (value > Math.ceil(goal)) return value - Math.ceil(goal)
		else if (value < Math.floor(goal)) return value - Math.floor(goal)

		return 0
	}
}

export const BalanceCount = new BalanceCountRule()
