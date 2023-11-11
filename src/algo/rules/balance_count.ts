import Entry from "../entry.ts"
import {Rule} from "./rule.ts"
import Class from "../class.ts"
import {Student} from "../student.ts"
import {RawRule} from "../input.ts"

/**
 * Répartir équitablement le nombre d'élèves dans chaque classe.
 * Si une option est associée à la règle, alors seulement cette option sera prise en compte.
 * C'est une règle complémentaire qui ne peut pas exister seule.
 */
export class BalanceCountRule extends Rule {
	constructor(rawRule: RawRule) {
		super(rawRule)
	}

	/**
	 * Associer une valeur relative à la règle d'équilibrage, en fonction d'une certaine disposition.
	 * Définit le nombre d'élèves idéal par classe, puis incrémente la valeur pour chaque dénombrement différent.
	 */
	override getEntryValue(entry: Entry): number {
		const countGoal = this.getCountPerClass(entry, this.option() ?? undefined)
		let value = 0
		for (const classKey of Object.keys(entry.classes())) {
			const count = this.getRelatedStudentsOfClass(entry, parseInt(classKey))

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
	 * Dans ce cas, il ne doit pas être déplacé dans les classes qui ont déjà trop l'option.
	 * Pénalisation de la valeur si l'élève ne possède une option pas assez présente dans une classe.
	 * Dans ce cas, il ne doit pas être déplacé dans les classes qui n'ont pas assez l'option.
	 */
	override getStudentValue(entry: Entry, student: Student): {value: number; worseClasses: Class[]} {
		// Récupération de l'objectif de nombre d'élèves concernés.
		const countGoal = this.getCountPerClass(entry, this.option())

		// On récupère la différence entre nombre d'élèves concernés dans sa classe et l'objectif.
		const diff = this.getDifference(
			this.getRelatedStudentsOfClass(entry, entry.searchStudent(student)!.index),
			countGoal
		)
		const hasAndMore = diff > 0 && (!this.option() || this.option() in student.levels())
		const hasNotAndLess =
			diff < 0 &&
			(!this.option() ||
				(!(this.option() in student.levels()) &&
					entry.getOptionCountOfClass(this.option())[entry.searchStudent(student)?.index!]))

		return {
			value: hasAndMore || hasNotAndLess ? Math.abs(diff) : 0,
			worseClasses: entry.classes().filter((_c, classKey) => {
				const classDiff = this.getDifference(this.getRelatedStudentsOfClass(entry, classKey), countGoal)
				return !this.option() || this.option() in student.levels() ? classDiff >= 0 : classDiff < 0
			}),
		}
	}

	/**
	 * Obtenir le nombre idéal d'élèves par classe.
	 * Prend en compte une éventuelle option.
	 */
	public getCountPerClass = (entry: Entry, option?: string) => {
		if (!option) return entry.algo().students().length / entry.classes().length
		return entry.algo().input().optionCount(option) / Object.keys(entry.getOptionCountOfClass(option)).length
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
	private getRelatedStudentsOfClass = (entry: Entry, classKey: number) => {
		if (!this.option()) return entry.classes()[classKey].getStudents().length
		return entry.getOptionCountOfClass(this.option())?.[classKey] ?? 0
	}
}
