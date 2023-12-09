import Class, {ClassWithIndex} from "./class.ts"
import Algo from "./algo.ts"
import {Student} from "./student.ts"
import {Rule} from "./rules/rule.ts"
import {Attribute} from "./attribute.ts"

/**
 * Instance de solution possible au problème.
 * Représente donc une liste de classes.
 */
export default class Entry {
	private readonly _algo: Algo
	private _classes: Class[]

	// La valeur actuelle de cette configuration pour chaque règle. Elle est invalidée à chaque modification.
	private _values: {[rule: string]: number} = {}

	constructor(algo: Algo, classes: Class[]) {
		this._algo = algo
		this._classes = classes
	}

	public classes() {
		return this._classes
	}

	public algo() {
		return this._algo
	}

	public clone() {
		return new Entry(this.algo(), [...this.classes().map(c => new Class([...c.getStudents()]))])
	}

	public class(index: number | string): Class | null {
		const intIndex: number = typeof index === "string" ? parseInt(index) : index

		if (!(intIndex in this._classes)) return null
		return this._classes[intIndex]
	}

	public getClassesWithAttribute(attribute: Attribute) {
		return this.classes().filter(c => c.count(attribute))
	}

	public searchStudent(student: Student): ClassWithIndex | null {
		for (const [k, c] of Object.entries(this.classes())) {
			for (const s of c.getStudents()) {
				if (s === student) return {class: c, index: parseInt(k)}
			}
		}

		return null
	}

	/**
	 * Obtenir la valeur de cette configuration, relative à une règle.
	 */
	public value(rule: Rule): number {
		const index = this.algo().input().rules().indexOf(rule)
		if (!(index in this._values)) this._values[index] = rule.getEntryValue(this)
		return this._values[index]
	}

	/**
	 * Suppression d'une classe dans cette configuration.
	 */
	public deleteClass(classIndex: number) {
		this.classes().splice(classIndex, 1)
	}

	/**
	 * Déplacer un élève dans une autre classe.
	 * Permet d'actualiser les différentes données de la configuration actuelle (sans tout recalculer).
	 */
	public moveStudent(student: Student, from: ClassWithIndex, to: ClassWithIndex) {
		from.class.removeStudent(student)
		to.class.addStudent(student)

		// On invalide la valeur de la configuration puisqu'elle a changé.
		this._values = {}
	}

	public static default(algo: Algo): Entry {
		const length = Math.ceil(algo.input().students().length / algo.input().classSize())
		return new Entry(
			algo,
			Array.from(
				{length},
				(_v, k) =>
					new Class(
						algo
							.input()
							.students()
							.slice(
								k * algo.input().classSize(),
								k * algo.input().classSize() + algo.input().classSize()
							)
					)
			)
		)
	}

	/**
	 * Déplacer les élèves mal placés la configuration actuelle et retourner une nouvelle disposition.
	 * Prend en compte une règle d'objectif qui va tenter d'être respectée.
	 * Retourne le nombre de déplacements effectués (chaque déplacement améliore le respect de la règle).
	 */
	public moveStudents(rule: Rule): {entry: Entry; moves: number} {
		// Cloner la configuration actuelle pour en retourner une nouvelle différente.
		const entry = this.clone()
		// Obtenir la liste de tous les élèves.
		const allStudents = entry
			.classes()
			.map(c => c.getStudents())
			.flat()

		// On compte le nombre de déplacements réalisés (ils ne sont réalisés que s'ils sont bénéfiques).
		let moves = 0

		// On déplace tous les élèves mal placés dans des classes suggérées.
		for (let student of allStudents) {
			// On applique un changement relatif à cet élève et cette règle
			if (entry.applyRuleForStudent(student, rule)) moves++

			// Si le changement précédent a permis de respecter la règle, on s'arrête là.
			if (entry.value(rule) === 0) break
		}

		return {entry, moves}
	}

	/**
	 * Obtenir la liste des classes envisageables pour un élève.
	 * S'il ne doit pas être déplacé, rien n'est retourné.
	 */
	private getStudentBestClasses(student: Student, rule: Rule): Class[] | undefined {
		// Récupération de la valeur de placement de l'élève, relative à la règle courante, ainsi que la liste des classes à éviter.
		const {value, worseClasses} = rule.getStudentValue(this, student)

		// Si l'élève est déjà bien placé, on ne fait rien de plus.
		if (value <= 0) return undefined

		// On ajoute la classe actuelle de l'élève dans les classes ignorées.
		if (!worseClasses.includes(this.searchStudent(student)?.class!)) {
			worseClasses.push(this.searchStudent(student)?.class!)
		}

		// Ajouter des pires classes des règles précédentes.
		for (let r of this.algo().input().rules()) {
			if (r === rule) break
			worseClasses.push(...r.getStudentValue(this, student).worseClasses.filter(c => !worseClasses.includes(c)))
		}

		return this.classes().filter(c => !worseClasses.includes(c))
	}

	/**
	 * Déplacer un élève dans une autre classe, en prenant en compte l'éventuel échange nécessaire.
	 */
	private moveAndExchangeStudent(student: Student, rule: Rule, origin: ClassWithIndex, destination?: Class): boolean {
		if (!destination) {
			// Si on a atteint le nombre maximum de classes, on ne fait rien.
			if (this.classes().length >= this.algo().input().classAmount()) return false
			// Création d'une nouvelle classe si aucune n'est définie.
			destination = new Class([])
			this.classes().push(destination)
		}

		// Déplacer l'élève dans l'autre classe.
		this.moveStudent(student, origin, {class: destination, index: this.classes().indexOf(destination)})

		// On l'échange avec un élève de sa nouvelle classe si elle est pleine.
		if (destination.getStudents().length > this.algo().input().classSize()) {
			// Déterminer l'élève de sa nouvelle classe qui est le moins bien placé (on randomise la liste pour éviter de choisir toujours le même élève).
			destination.shuffleStudents()

			// Déterminer l'élève de la classe de destination avec qui échanger.
			const otherStudent: Student | null = origin.class.findBestStudentFor(this, destination.getStudents(), rule)

			// Déplacer cet élève dans la classe initiale du premier élève (échanger).
			this.moveStudent(otherStudent!, {class: destination, index: this.classes().indexOf(destination)}, origin)
		}

		// Supprimer la classe s'il n'y a plus d'élèves dedans.
		if (origin?.class.getStudents().length === 0) this.deleteClass(origin.index)

		return true
	}

	/**
	 * Appliquer une règle sur un élève afin de le déplacer dans la bonne classe.
	 * Un éventuel échange est effectué pour respecter la limite de taille de classe.
	 * Chaque destination envisageable est testée pour que la meilleure soit choisie.
	 */
	private applyRuleForStudent(student: Student, rule: Rule): boolean {
		// Obtenir la liste des destinations envisageables pour l'élève.
		const destinations: (Class | undefined)[] | undefined = this.getStudentBestClasses(student, rule)
		if (!destinations) return false
		if (!destinations.length) destinations.push(undefined)

		// Obtenir la classe actuelle de l'élève qui sera déplacé.
		const origin = this.searchStudent(student)!

		// Création des variables de recherche de la meilleure configuration.
		let bestEntry = null,
			bestValue = Number.MAX_VALUE

		// On réalise le déplacement dans chaque destination séparément et on prend le meilleur résultat.
		for (let destination of destinations) {
			// Création d'une nouvelle configuration à partir de celle-ci.
			const entry = this.clone()

			// Réalisation du déplacement, avec un potentiel échange.
			origin.class = entry.class(origin.index)!
			if (destination) destination = entry.class(this.classes().indexOf(destination))!
			if (!entry.moveAndExchangeStudent(student, rule, origin, destination)) continue

			// On compare cette nouvelle configuration pour trouver la meilleure.
			if (entry.value(rule) < bestValue) {
				bestEntry = entry
				bestValue = entry.value(rule)
			}
		}

		// On indique en retour si ce changement a été bénéfique ou non.
		if (bestValue < this.value(rule)) {
			// On applique les modifications dans cette configuration.
			this._classes = bestEntry!.classes()
			this._values[this.algo().input().rules().indexOf(rule)] = bestEntry!.value(rule)
			return true
		}

		return false
	}

	/**
	 * Obtenir un échantillon d'élèves qui représente l'ensemble des cas.
	 */
	public getStudentSample(students: Student[]): Student[] {
		// On supprime tous les doublons d'élèves qui ont les mêmes attributs.
		return students.reduce((acc, cur) => {
			// Si la liste d'attributs de cet élève n'est pas encore représentée dans la liste, on ajoute l'élève.
			if (
				!acc.some(
					s =>
						s.attributes().length === cur.attributes().length &&
						!s.attributes().some(a => !cur.attributes().includes(a))
				)
			)
				acc.push(cur)
			return acc
		}, [] as Student[])
	}

	/**
	 * Déterminer si une classe est égale à une autre.
	 * Peut ne prendre en compte que les dénombrements.
	 */
	public equals(entry: Entry, onlyCount?: boolean): boolean {
		if (entry.classes().length != this.classes().length) return false

		for (let c1 of this.classes()) {
			for (let c2 of entry.classes()) {
				if (!onlyCount && !c1.equals(c2)) return false
				if (onlyCount && !c1.equalsCount(c2)) return false
			}
		}

		return true
	}

	toString(showLevel?: boolean, ...keysMask: string[]) {
		let str = ""
		for (const c of this.classes()) {
			str += "- " + c.toString(showLevel, ...keysMask) + "\n"
		}

		return str
	}
}
