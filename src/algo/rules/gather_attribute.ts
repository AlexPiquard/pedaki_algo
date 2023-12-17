import Entry from "../entry.ts"
import {Rule} from "./rule.ts"
import Class from "../class.ts"
import {Student} from "../student.ts"
import {Input, RawRule} from "../input.ts"
import {Attribute} from "../attribute.ts"

/**
 * Regrouper un certain attribut dans un minimum de classes.
 */
export class GatherAttributeRule extends Rule {
	constructor(rawRule: RawRule, input: Input) {
		super(rawRule, input)
	}

	/**
	 * Associer une valeur relative à la règle de regroupement d'un attribut en fonction d'une certaine disposition.
	 * Prend en compte une liste de classes qui doivent contenir l'attribut, et incrémente la valeur pour chaque élève mal placé.
	 */
	override getEntryValue(entry: Entry): number {
		return Object.values(this.getExcludedClasses(entry, this.attribute()!)).reduce((acc, cur) => acc + cur, 0)
	}

	/**
	 * @inheritDoc
	 * L'élève peut être déplacé dans les classes qui regroupent une ou plusieurs de ses attributs.
	 * Si aucune classe n'est concernée, alors on lui fait éviter les classes qui regroupent un attribut.
	 */
	override getStudentValue(entry: Entry, student: Student): {value: number; worseClasses: Class[]} {
		// Récupération des classes qui ne doivent pas contenir l'attribut.
		const excludedClasses = this.getExcludedClasses(entry, this.attribute()!)

		// Récupération de l'identifiant de la classe actuelle de l'élève.
		const studentClassIndex = entry.searchStudent(student)?.index?.toString()!

		// S'il a l'attribut, il ne doit pas être dans une classe qui ne le regroupe pas.
		if (student.hasAttribute(this.attribute()!)) {
			// S'il est dans une classe qui regroupe l'attribut, il est déjà bien placé.
			// Sinon, on retourne le nombre d'élèves bien placés (s'il est le seul mal placé, il est vraiment très mal placé).
			// Les pires classes sont celles qui ne regroupent pas l'attribut.
			return {
				value: !(studentClassIndex in excludedClasses)
					? 0
					: entry.algo().input().classSize() - excludedClasses[studentClassIndex],
				worseClasses: Object.keys(excludedClasses).map(classKey => entry.class(classKey)!),
			}
		}

		// Dans tous les autres cas, il est bien placé et n'a pas de classe interdite.
		return {
			value: 0,
			worseClasses: [],
		}
	}

	/**
	 * Retourne la liste des classes qui ne doivent pas contenir un certain attribut.
	 * Associe à chaque indice de classe, le nombre d'élèves qui ont l'attribut (et qui ne devraient donc pas l'avoir).
	 */
	public getExcludedClasses = (entry: Entry, attribute: Attribute): {[classKey: string]: number} => {
		// Estimer le nombre de classes minimum si on regroupe correctement.
		const classesForLevel = Math.ceil(attribute.count() / entry.algo().input().classSize())

		// Exclure les classes ayant le plus l'attribut
		return Object.fromEntries(
			Object.keys(entry.classes())
				.map(classKey => [classKey, entry.class(classKey)?.count(this.attribute()!) ?? 0] as [string, number])
				.sort((a, b) => a[1] - b[1])
				.slice(0, -classesForLevel)
		)
	}
}
