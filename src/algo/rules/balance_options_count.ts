import Entry from "../entry.ts"
import {Rule} from "./rule.ts"
import {InputRule} from "../input.ts"
import Class from "../class.ts"
import {Student} from "../student.ts"

/**
 * Répartir équitablement le nombre d'élèves ayant une option dans chaque classe possédant cette option.
 * C'est une règle complémentaire qui ne peut pas exister seule.
 */
class BalanceOptionsCountRule extends Rule {
	/**
	 * Associer une valeur relative à la règle d'équilibrage des options sur les classes qui ont l'option, en fonction d'une certaine disposition.
	 * Définit le nombre d'élèves ayant l'option idéal par classe qui possède l'option, puis incrémente la valeur pour chaque dénombrement différent.
	 */
	override getEntryValue(entry: Entry, rule: InputRule): number {
		const countGoal = this.getCountPerClass(entry, rule.option())
		let value = 0
		for (const classKey of Object.keys(entry.classes)) {
			const count = entry.getOptionCountOfClass(rule.option())[classKey]

			// Si personne n'a l'option dans cette classe, on l'ignore.
			if (!count) continue

			// On incrémente la différence entre le nombre d'élèves et l'objectif.
			value += Math.abs(this.getDifference(count, countGoal))
		}
		return value
	}

	/**
	 * @inheritDoc
	 * Pénalisation de la valeur si le joueur possède une option déjà trop présente dans sa classe.
	 * Il ne doit pas être déplacé dans les classes qui ont déjà trop l'option.
	 */
	override getStudentValue(entry: Entry, rule: InputRule, student: Student): {value: number; worseClasses: Class[]} {
		let value = 0

		const levelGoal = this.getCountPerClass(entry, rule.option())
		const studentClassIndex = entry.searchStudent(student)?.index!
		let worseClasses: Class[] = []

		// On récupère le nombre d'élèves ayant cette option dans sa classe.
		const count = entry.getOptionCountOfClass(rule.option())[studentClassIndex]

		// Si cette valeur est supérieure à l'objectif, alors on incrémente la différence.
		const diff = this.getDifference(count, levelGoal)
		if (diff > 0) value += diff

		// On exclut les classes qui ont trop l'option, de la liste de celles idéales pour l'élève.
		worseClasses.push(
			...entry.classes.filter(
				(_c, classKey) =>
					this.getDifference(entry.getOptionCountOfClass(rule.option())?.[classKey] ?? 0, levelGoal) >= 0
			)
		)

		return {value, worseClasses}
	}

	/**
	 * Obtenir le nombre idéal d'élèves ayant l'option par classe.
	 */
	public getCountPerClass = (entry: Entry, option: string) => {
		return entry.genetic.input().optionCount(option) / Object.keys(entry.getOptionCountOfClass(option)).length
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

export const BalanceOptionsCount = new BalanceOptionsCountRule()
