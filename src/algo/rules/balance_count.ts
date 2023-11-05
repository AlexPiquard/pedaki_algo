import Entry from "../entry.ts"
import {Rule} from "./rule.ts"
import {InputRule} from "../input.ts"
import Class from "../class.ts"
import {Student} from "../student.ts"

/**
 * Répartir équitablement le nombre d'élèves dans chaque classe.
 * Si une option est associée à la règle, alors seulement cette option sera prise en compte.
 * C'est une règle complémentaire qui ne peut pas exister seule.
 */
class BalanceCountRule extends Rule {
	/**
	 * Associer une valeur relative à la règle d'équilibrage, en fonction d'une certaine disposition.
	 * Définit le nombre d'élèves idéal par classe, puis incrémente la valeur pour chaque dénombrement différent.
	 */
	override getEntryValue(entry: Entry, rule: InputRule): number {
		const countGoal = this.getCountPerClass(entry, rule.option() ?? undefined)
		let value = 0
		for (const classKey of Object.keys(entry.classes())) {
			const count = this.getRelatedStudentsOfClass(entry, rule, parseInt(classKey))

			// Si personne n'est concerné dans cette classe, on ne fait rien.
			if (!count) continue

			// On incrémente la différence entre le nombre d'élèves et l'objectif.
			value += Math.abs(this.getDifference(count, countGoal))
		}
		return value
	}

	/**
	 * @inheritDoc
	 * Pénalisation de la valeur si l'élève possède une option déjà trop présente dans sa classe.
	 * Il ne doit pas être déplacé dans les classes qui ont déjà trop l'option.
	 */
	override getStudentValue(entry: Entry, rule: InputRule, student: Student): {value: number; worseClasses: Class[]} {
		// Récupération de l'objectif de nombre d'élèves concernés.
		const countGoal = this.getCountPerClass(entry, rule.option())

		// On récupère le nombre d'élèves concernés dans sa classe.
		const count = this.getRelatedStudentsOfClass(entry, rule, entry.searchStudent(student)!.index)

		// On retourne la différence entre la valeur et l'objectif, ainsi que les classes qui ont trop d'élèves concernés.
		return {
			value: Math.max(0, this.getDifference(count, countGoal)),
			worseClasses: entry
				.classes()
				.filter(
					(_c, classKey) =>
						this.getDifference(this.getRelatedStudentsOfClass(entry, rule, classKey), countGoal) >= 0
				),
		}
	}

	/**
	 * Obtenir le nombre idéal d'élèves par classe.
	 * Prend en compte une éventuelle option.
	 */
	public getCountPerClass = (entry: Entry, option?: string) => {
		if (!option) return entry.genetic().students().length / entry.classes().length
		return entry.genetic().input().optionCount(option) / Object.keys(entry.getOptionCountOfClass(option)).length
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

	/**
	 * Obtenir le nombre d'élèves concernés par la règle dans une classe.
	 * C'est-à-dire tous les élèves, ou ceux possédant une éventuelle option définie.
	 */
	private getRelatedStudentsOfClass = (entry: Entry, rule: InputRule, classKey: number) => {
		if (!rule.option()) return entry.classes()[classKey].getStudents().length
		return entry.getOptionCountOfClass(rule.option())?.[classKey] ?? 0
	}
}

export const BalanceCount = new BalanceCountRule()
