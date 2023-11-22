import Class, {ClassWithIndex} from "./class.ts"
import Algo from "./algo.ts"
import {Student} from "./student.ts"
import {Rule} from "./rules/rule.ts"
import {Attribute} from "./attribute.ts";

/**
 * Instance de solution possible au problème.
 * Représente donc une liste de classes.
 */
export default class Entry {
	private readonly _algo: Algo
	private readonly _classes: Class[]

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
	}

	public static default(algo: Algo): Entry {
		const length = Math.ceil(algo.input().students().length / algo.input().classSize())
		const entry = new Entry(
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
		return entry
	}

	/**
	 * Déplacer les élèves mal placés la configuration actuelle et retourner une nouvelle disposition.
	 * Prend en compte une règle d'objectif qui va tenter d'être respectée.
	 */
	public randomChange(rule: Rule): Entry {
		// Cloner la configuration actuelle pour en retourner une nouvelle différente.
		const entry = this.clone()
		// Obtenir la liste de tous les élèves.
		const allStudents = entry
			.classes()
			.map(c => c.getStudents())
			.flat()

		// On déplace tous les élèves mal placés dans des classes suggérées.
		for (let student of allStudents) {
			// Récupération de la valeur de placement de l'élève, relative à la règle courante, ainsi que la liste des classes à éviter.
			const {value, worseClasses} = rule.getStudentValue(entry, student)

			// Si l'élève est déjà bien placé, on ne fait rien de plus.
			if (value <= 0) continue

			// On ajoute la classe actuelle de l'élève dans les classes ignorées.
			if (!worseClasses.includes(entry.searchStudent(student)?.class!)) {
				worseClasses.push(entry.searchStudent(student)?.class!)
			}

			// Ajouter des pires classes des règles précédentes.
			for (let r of entry.algo().input().rules()) {
				if (r === rule) break
				worseClasses.push(
					...r.getStudentValue(entry, student).worseClasses.filter(c => !worseClasses.includes(c))
				)
			}

			// On applique un changement relatif à cet élève et à ses classes idéales.
			this.randomChangeMove(
				student,
				entry.classes().filter(c => !worseClasses.includes(c)),
				entry,
				rule
			)

			// Si le changement précédent a permis de respecter la règle, on s'arrête là.
			if (rule.getEntryValue(entry) === 0) break
		}

		return entry
	}

	private randomChangeMove(student: Student, destinations: Class[], entry: Entry, rule: Rule): Entry {
		// Obtenir la classe actuelle de l'élève qui sera déplacé.
		const studentClass = entry.searchStudent(student)!

		// On supprime les éventuelles classes supprimées de la liste des destinations.
		destinations = destinations.filter(c => entry.classes().indexOf(c) >= 0)

		// Choisir une autre classe, différente de celle choisie précédemment, en respectant l'éventuelle liste des destinations idéales.
		let otherClass = !!destinations.length && destinations[Math.floor(Math.random() * destinations.length)]
		if (!otherClass) {
			// Si on a atteint le nombre maximum de classes, on ne fait rien.
			if (entry.classes().length >= entry.algo().input().classAmount()) return entry
			// Aucune classe idéale n'existe pour cet élève, donc on en crée une nouvelle.
			otherClass = new Class([])
			entry.classes().push(otherClass)
		}

		// Déplacer l'élève dans l'autre classe.
		entry.moveStudent(student, studentClass, {class: otherClass, index: entry.classes().indexOf(otherClass)})

		// On l'échange avec un élève de sa nouvelle classe si elle est pleine.
		if (otherClass.getStudents().length > this.algo().input().classSize()) {
			// Déterminer l'élève de sa nouvelle classe qui est le moins bien placé (on randomise la liste pour éviter de choisir toujours le même élève).
			otherClass.shuffleStudents()

			// Déterminer l'élève de la classe de destination avec qui échanger.
			const otherStudent: Student | null = studentClass.class.findBestStudentFor(entry, otherClass.getStudents(), rule)

			// Déplacer cet élève dans la classe initiale du premier élève (échanger).
			entry.moveStudent(
				otherStudent!,
				{class: otherClass, index: entry.classes().indexOf(otherClass)},
				studentClass
			)
		} else if (studentClass?.class.getStudents().length === 0) {
			// Supprimer la classe s'il n'y a plus d'élèves dedans.
			entry.deleteClass(studentClass.index)
		}

		return entry
	}

	/**
	 * Obtenir un échantillon d'élèves qui représente l'ensemble des cas.
	 * Cette fonction n'est pas déterministe.
	 */
	public getStudentSample(students: Student[]): Student[] {
		const list: Student[] = []
		for (let attribute of this.algo().input().attributes()) {
			const relatedStudents = attribute.students().filter(s => !list.includes(s) && students.includes(s))
			if (!relatedStudents.length) continue
			list.push(relatedStudents[Math.floor(Math.random()*relatedStudents.length)])
		}
		const otherStudents = students.filter(s => !s.attributes().length && !list.includes(s))
		while (list.length < this.algo().input().attributes().length + 1 && otherStudents.length) {
			const choice = Math.floor(Math.random()*otherStudents.length)
			list.push(otherStudents[choice])
			otherStudents.splice(choice, 1)
		}
		return list
	}

	toString(showLevel?: boolean, ...keysMask: string[]) {
		let str = ""
		for (const c of this.classes()) {
			str += "- " + c.toString(showLevel, ...keysMask) + "\n"
		}

		return str
	}
}
