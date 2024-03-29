import {Rule, RuleType, StudentValue} from "./rule.ts"
import {Input, RawRule} from "../input.ts"
import Entry, {StudentWithClass} from "../entry.ts"
import Class from "../class.ts"

/**
 * Équilibrer le dénombrement de plusieurs attributs dans un maximum de classes.
 * Elle est faite après les répartitions d'attributs.
 */
export class BalanceClassCountRule extends Rule {
	protected _ruleType = RuleType.ATTRIBUTES

	constructor(rawRule: RawRule, input: Input) {
		super(rawRule, input)
	}

	/**
	 * Produit de somme des différences de dénombrement des attributs de chaque classe.
	 */
	override getEntryValue(entry: Entry): number {
		// On compte la différence entre le dénombrement de chaque attribut dans chaque classe.
		let value = 0
		for (const c of entry.classes()) {
			if (!this.hasClassAttributes(c)) continue
			if (!this.canBalanceClass(entry, c)) continue
			const classValue = this.getClassValue(c)
			// Il faut éviter de multiplier par 0, et 0 et 1 doivent bien provoquer une différence.
			// On ne fait donc rien pour le 0, et on incrémente les autres valeurs pour ne pas faire *1.
			if (classValue) {
				if (!value) value = classValue + 1
				else value *= classValue + 1
			}
		}

		return value
	}

	/**
	 * @inheritDoc
	 * La valeur correspond à la différence totale de dénombrement de chaque attribut de l'élève dans sa classe.
	 */
	override getStudentValue(_entry: Entry, student: StudentWithClass): StudentValue {
		// Somme des différences de dénombrement des attributs que l'élève possède.
		// L'objectif pris en compte est l'entier inférieur, afin de ne pas rester bloqué avec trop d'attributs.
		const goal = Math.floor(this.getClassAvgCount(student.studentClass.class))
		let value = 0
		for (let attribute of student.student.attributes()) {
			if (!this.attributes().includes(attribute)) continue
			value += Math.abs(this.getDifference(student.studentClass.class.count(attribute), goal))
		}

		return {
			value: value,
			// Il n'y a aucune pire classe, on n'est pas capable de les définir.
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
	 * On détermine si les attributs concernés peuvent être équilibrés dans une classe.
	 * Pour cela, on dénombre les attributs concernés, parmi ceux non concernés présents dans la classe.
	 * Cela signifie que l'on pourrait faire des déplacements pour modifier le dénombrement des attributs concernés,
	 * sans changer le dénombrement de ceux non concernés.
	 * Par exemple : avec 10 anglais et 5 allemands dans la classe, il faut trouver 10 anglais et 5 allemands de toutes classes pour équilibrer les attributs concernés.
	 */
	private canBalanceClass(entry: Entry, c: Class): boolean {
		// On compte les attributs non concernés dans la classe, afin de respecter ce dénombrement plus tard.
		const unrelatedAttributesInClass: {[unrelatedAttributesKey: string]: number} = {}
		for (const student of c.getStudents()) {
			const unrelatedAttributesKey = student.attributesKey(...this.attributes())
			if (!(unrelatedAttributesKey in unrelatedAttributesInClass))
				unrelatedAttributesInClass[unrelatedAttributesKey] = 1
			else unrelatedAttributesInClass[unrelatedAttributesKey]++
		}

		// Il faut séparer les attributs non concernés, c'est-à-dire si quelqu'un fait allemand et anglais,
		// il n'est ni dans allemand ni dans anglais, ni dans les deux, mais dans un troisième groupe.
		const attributesAmount: {[unrelatedAttributesKey: string]: {[relatedAttributeKey: string]: number}} = {}

		// On dénombre les attributs concernés dans chaque groupe d'attributs non concernés (dans toutes les classes).
		// On arrête de compter lorsqu'on atteint le dénombrement actuel dans la classe.
		for (const student of entry.algo().input().students()) {
			const unrelatedAttributesKey = student.attributesKey(...this.attributes())
			if (!(unrelatedAttributesKey in attributesAmount)) attributesAmount[unrelatedAttributesKey] = {}
			for (const relatedAttribute of this.attributes()) {
				if (!student.hasAttribute(relatedAttribute)) continue
				if (!(relatedAttribute.key() in attributesAmount[unrelatedAttributesKey]))
					attributesAmount[unrelatedAttributesKey][relatedAttribute.key()] = 0

				if (
					attributesAmount[unrelatedAttributesKey][relatedAttribute.key()] >=
					unrelatedAttributesInClass[unrelatedAttributesKey]
				)
					// On arrête de compter puisqu'on a atteint le dénombrement actuel dans la classe.
					continue

				attributesAmount[unrelatedAttributesKey][relatedAttribute.key()]++
			}
		}

		// Obtention de l'objectif de dénombrement de chaque attribut dans la classe.
		const goal = this.getClassAvgCount(c)

		// On regarde si c'est possible en comptant les attributs concernés. Aucun ne doit être inférieur à l'objectif.
		return !Object.values(
			Object.entries(attributesAmount)
				.filter(([key]) => key in unrelatedAttributesInClass)
				.reduce(
					(acc, cur) => {
						for (const [key, value] of Object.entries(cur[1])) {
							acc[key] = (acc[key] ?? 0) + value
						}
						return acc
					},
					{} as {[relatedAttributeKey: string]: number}
				)
		).some(amount => this.getDifference(amount, goal) < 0)
	}

	/**
	 * Détermine si une certaine classe possède au moins un attribut concerné.
	 */
	private hasClassAttributes(c: Class): boolean {
		for (let attribute of this.attributes()) {
			if (c.count(attribute) > 0) return true
		}

		return false
	}
}
