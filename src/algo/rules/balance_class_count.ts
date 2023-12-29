import {Rule, RuleType, StudentValue} from "./rule.ts"
import {Input, RawRule} from "../input.ts"
import Entry from "../entry.ts"
import {Student} from "../student.ts"
import Class from "../class.ts"

/**
 * Équilibrer le dénombrement de plusieurs attributs dans un maximum de classes.
 */
export class BalanceClassCountRule extends Rule {
	protected _ruleType = RuleType.ATTRIBUTES

	constructor(rawRule: RawRule, input: Input) {
		super(rawRule, input)
	}

	/**
	 * Produit de somme des différences de dénombrement des attributs de chaque classe.
	 * La première différence est incrémentée de 1 pour éviter la multiplication par 0.
	 */
	override getEntryValue(entry: Entry): number {
		// On compte la différence entre le dénombrement de chaque attribut dans chaque classe.
		let values: number[] = []
		for (let c of entry.classes()) {
			if (!this.hasClassAttributes(c)) continue
			values.push(this.getClassValue(c))
		}

		// On trie la liste dans un ordre croissant.
		values = values.sort((a, b) => a - b)

		// On effectue le produit, en incrémentant la première valeur pour se débarrasser du 0.
		let value = 0
		for (let v of values) {
			if (value === 0) value = v + 1
			else value *= v
		}
		return value
	}

	/**
	 * La valeur correspond à différence totale de dénombrement de chaque attribut de l'élève sa classe.
	 */
	override getStudentValue(entry: Entry, student: Student): StudentValue {
		const c = entry.searchStudent(student)?.class!

		// Somme des différences de dénombrement des attributs que l'élève possède.
		// L'objectif pris en compte est l'entier inférieur, afin de ne pas rester bloqué avec trop d'attributs.
		const goal = Math.floor(this.getClassAvgCount(c))
		let value = 0
		for (let attribute of student.attributes()) {
			if (!this.attributes().includes(attribute)) continue
			value += Math.abs(this.getDifference(c.count(attribute), goal))
		}

		return {
			value: value,
			// Il n'y a aucune pire classe.
			worseClasses: [],
		}
	}

	/**
	 * Obtenir l'objectif de dénombrement de chaque attribut dans une certaine classe.
	 * Correspond à la moyenne de dénombrement des attributs dans la classe.
	 */
	private getClassAvgCount(c: Class): number {
		let sum = 0
		for (let attribute of this.attributes()) {
			sum += c.count(attribute)
		}
		return sum / this.attributes().length
	}

	/**
	 * Valeur d'une classe, correspondant à la différence de dénombrement de chaque attribut.
	 */
	private getClassValue(c: Class) {
		let value = 0
		const goal = this.getClassAvgCount(c)
		for (let attribute of this.attributes()) {
			// On incrémente la différence entre le dénombrement de l'attribut et l'objectif,
			// en acceptant l'intervalle de l'objectif décimal.
			value += Math.abs(this.getDifference(c.count(attribute), goal))
		}
		return value
	}

	/**
	 * Détermine une certaine classe possède au moins un attribut concerné.
	 */
	private hasClassAttributes(c: Class): boolean {
		for (let attribute of this.attributes()) {
			if (c.count(attribute) > 0) return true
		}

		return false
	}
}
