import Entry from "../entry.ts"
import {Rule} from "./rule.ts"
import Class from "../class.ts"
import {Student} from "../student.ts"
import {Input, RawRule} from "../input.ts"
import {Attribute} from "../attribute.ts";

/**
 * Répartir équitablement le nombre d'élèves dans chaque classe.
 * Si un attribut est associée à la règle, alors seulement cet attribut sera pris en compte.
 * C'est une règle complémentaire qui ne peut pas exister seule.
 */
export class BalanceCountRule extends Rule {
	constructor(rawRule: RawRule, input: Input) {
		super(rawRule, input)
	}

	/**
	 * Associer une valeur relative à la règle d'équilibrage, en fonction d'une certaine disposition.
	 * Définit le nombre d'élèves idéal par classe, puis incrémente la valeur pour chaque dénombrement différent.
	 */
	override getEntryValue(entry: Entry): number {
		const countGoal = this.getCountPerClass(entry, this.attribute())
		let value = 0
		for (const classKey of Object.keys(entry.classes())) {
			const count = this.getRelatedStudentsOfClass(entry, classKey)

			// Si personne n'est concerné dans cette classe, on ne fait rien.
			if (!count) continue

			// On incrémente la différence entre le nombre d'élèves et l'objectif.
			value += Math.abs(this.getDifference(count, countGoal))
		}
		return value
	}

	/**
	 * @inheritDoc
	 * Pénalisation de la valeur si l'élève possède un attribut déjà trop présent dans sa classe.
	 * Dans ce cas, il ne doit pas être déplacé dans les classes qui ont déjà trop l'attribut.
	 * Pénalisation de la valeur si l'élève ne possède pas un attribut pas assez présent dans une classe.
	 * Dans ce cas, il ne doit pas être déplacé dans les classes qui n'ont pas assez l'attribut.
	 */
	override getStudentValue(entry: Entry, student: Student): {value: number; worseClasses: Class[]} {
		// Récupération de l'objectif de nombre d'élèves concernés.
		const countGoal = this.getCountPerClass(entry, this.attribute())

		// On récupère la différence entre nombre d'élèves concernés dans sa classe et l'objectif.
		const diff = this.getDifference(
			this.getRelatedStudentsOfClass(entry, entry.searchStudent(student)!.index),
			countGoal
		)
		const hasAndMore = diff > 0 && (!this.attribute() || student.hasAttribute(this.attribute()!))

		// On n'attribue pas de mauvaise valeur à ceux qui ont un faible niveau dans une classe trop faible,
		// parce qu'on n'est pas sûr qu'il sera échangé avec quelqu'un du même attribut, il y a trop de risques de tout casser.
		return {
			value: hasAndMore? Math.abs(diff) : 0,
			worseClasses: entry.classes().filter((_c, classKey) => {
				const classDiff = this.getDifference(this.getRelatedStudentsOfClass(entry, classKey), countGoal)
				return !this.attribute() || student.hasAttribute(this.attribute()!) ? classDiff > 0 : classDiff < 0
			}),
		}
	}

	/**
	 * Obtenir le nombre idéal d'élèves par classe.
	 * Prend en compte un éventuel attribut.
	 */
	public getCountPerClass = (entry: Entry, attribute?: Attribute): number => {
		if (!attribute) return entry.algo().input().students().length / entry.classes().length
		return attribute.count() / entry.getClassesWithAttribute(attribute).length
	}

	/**
	 * Obtenir la différence d'un nombre d'élèves par rapport à un objectif.
	 * Prend en compte un objectif décimal (autorise les deux entiers).
	 */
	public getDifference = (value: number, goal: number) => {
		// Si l'objectif est un nombre entier, on le compare directement
		if (goal % 1 === 0) return value - goal
		// Si l'objectif est décimal, on autorise les deux nombres entiers.
		else if ( value > Math.ceil(goal)) return value - Math.ceil(goal)
		else if (value < Math.floor(goal)) return value - Math.floor(goal)

		return 0
	}

	/**
	 * Obtenir le nombre d'élèves concernés par la règle dans une classe.
	 * C'est-à-dire tous les élèves, ou ceux possédant un éventuel attribut défini.
	 */
	private getRelatedStudentsOfClass = (entry: Entry, classKey: number | string): number => {
		if (!this.attribute()) return entry.class(classKey)!.getStudents().length
		return entry.class(classKey)!.count(this.attribute()!)
	}
}
