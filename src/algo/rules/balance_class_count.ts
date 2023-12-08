import {Rule} from "./rule.ts"
import {Input, RawRule} from "../input.ts"
import Entry from "../entry.ts"
import {Student} from "../student.ts"
import Class from "../class.ts"

/**
 * Équilibrer le dénombrement de plusieurs attributs dans un maximum de classes.
 */
export class BalanceClassCountRule extends Rule {
	constructor(rawRule: RawRule, input: Input) {
		super(rawRule, input)
	}

	/**
	 * On dénombre chaque attribut dans chaque classe, et on additionne les différences.
	 * On ignore les classes non concernées.
	 */
	override getEntryValue(entry: Entry): number {
		// On compte la différence entre le dénombrement de chaque attribut dans chaque classe.
		let value = 0
		for (let c of this.getRelatedClasses(entry)) {
			value += this.getClassValue(c)
		}
		return value
	}

	/**
	 * La valeur correspond au nombre d'élèves qui ont un attribut trop présent dans la classe.
	 * Les pires classes sont celles qui ont trop au moins l'un des attributs de l'élève, parmi celles à prendre en compte.
	 */
	override getStudentValue(entry: Entry, student: Student): {value: number; worseClasses: Class[]} {
		const c = entry.searchStudent(student)?.class!

		// Méthode qui retourne la valeur de placement de l'élève dans une certaine classe.
		// C'est la somme des différences de dénombrement des attributs que l'élève possède, qui sont supérieurs à l'objectif.
		// L'objectif pris en compte est l'entier inférieur, afin de ne pas rester bloqué avec trop d'attributs.
		const getValue = (c: Class): number => {
			const goal = Math.floor(this.getClassAvgCount(c))
			let value = 0
			for (let attribute of student.attributes()) {
				if (!this.attributes().includes(attribute)) continue
				if (c.count(attribute) > goal) value += this.getDifference(c.count(attribute), goal)
			}
			return value
		}

		return {
			value: getValue(c),
			// Les pires classes sont les classes concernées dans lesquelles la valeur serait positive.
			worseClasses: this.getRelatedClasses(entry).filter(c => getValue(c) > 0),
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
	 * Obtenir les classes concernées par la règle.
	 */
	private getRelatedClasses(entry: Entry): Class[] {
		// Trier les classes par nombre d'attributs de la règle inclus, croissant.
		const classesCount = entry
			.classes()
			.map(c => ({class: c, attributes: this.attributes().filter(a => c.count(a) > 0)}))
			.filter(c => c.attributes.length > 1)
			.sort((a, b) => {
				// On trie par nombre d'attributs possédés, et sinon par différence de dénombrement
				if (a.attributes.length === b.attributes.length)
					return this.getClassValue(b.class) - this.getClassValue(a.class)
				return a.attributes.length - b.attributes.length
			})
			.map(c => c.class)

		// Si toutes les classes sont concernées, il y a forcément au moins une classe à ignorer s'il n'y a pas le même dénombrement de chaque attribut par défaut.
		// On détermine les classes ignorées avec le nombre d'élèves en trop et le nombre d'élèves maximum par classe.
		// On détermine donc le dénombrement minimal parmi tous les attributs.
		let minAttributeCount = Number.MAX_VALUE
		for (let attribute of this.attributes()) {
			if (attribute.count() < minAttributeCount) minAttributeCount = attribute.count()
		}

		// On détermine le nombre d'élèves qui seront exclus des classes équilibrées.
		let ignoredStudents = 0
		for (let attribute of this.attributes()) {
			if (attribute.count() > minAttributeCount) ignoredStudents += attribute.count() - minAttributeCount
		}

		// Déterminer le nombre de classes qui ne pourront pas être équilibrées.
		const ignoredClasses = Math.ceil(ignoredStudents / entry.algo().input().classSize())

		// On retire les classes à ignorer qui possèdent le moins d'attributs liés.
		return classesCount.slice(ignoredClasses, classesCount.length)
	}
}
