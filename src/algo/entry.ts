import Class, {ClassWithIndex} from "./class.ts"
import Algo from "./algo.ts"
import {Student} from "./student.ts"
import {Rule} from "./rules/rule.ts"

/**
 * Instance de solution possible au problème.
 * Représente donc une liste de classes.
 */
export default class Entry {
	private _algo: Algo
	private _classes: Class[]

	// Nombre d'élèves ayant chaque option dans chaque classe.
	private optionsPerClass: {[option: string]: {[classKey: string]: number}} = {}

	// Somme des niveaux pour chaque option dans chaque classe.
	private levelSumsPerClass: {[option: string]: {[classKey: string]: number}} = {}

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

	/**
	 * Calculer les différentes données d'analyse.
	 * N'est calculé entièrement qu'une seule fois.
	 */
	private calculate() {
		for (const [i, c] of Object.entries(this.classes())) {
			for (const s of c.getStudents()) {
				for (const [option, level] of Object.entries(s.levels())) {
					if (!(option in this.optionsPerClass)) {
						this.optionsPerClass[option] = {}
						this.levelSumsPerClass[option] = {}
					}

					if (!(i in this.optionsPerClass[option])) {
						this.optionsPerClass[option][i] = 1
						this.levelSumsPerClass[option][i] = level
						continue
					}

					this.optionsPerClass[option][i]++
					this.levelSumsPerClass[option][i] += level
				}
			}
		}
	}

	public clone() {
		const entry = new Entry(this.algo(), [...this.classes().map(c => new Class([...c.getStudents()]))])

		// Cloner les données d'analyse.
		for (const [option, value] of Object.entries(this.optionsPerClass)) {
			entry.optionsPerClass[option] = Object.assign({}, value)
		}
		for (const [option, value] of Object.entries(this.levelSumsPerClass)) {
			entry.levelSumsPerClass[option] = Object.assign({}, value)
		}

		return entry
	}

	public getOptionCountOfClass(option: string) {
		return this.optionsPerClass[option]
	}

	public getLevelSumOfClass(option: string) {
		return this.levelSumsPerClass[option]
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
	 * Entraine la modification des données d'analyse puisque les identifiants des classes vont changer.
	 */
	public deleteClass(classIndex: number) {
		this.classes().splice(classIndex, 1)

		// Les identifiants de classe ont changé.
		const moveClassIndexes = (object: {[p: string]: {[p: string]: number}}) => {
			for (const [option, oldObject] of Object.entries(object)) {
				const newObject: {[option: string]: number} = {}
				for (const [classKey, value] of Object.entries(oldObject)) {
					newObject[parseInt(classKey) > classIndex ? parseInt(classKey) - 1 : parseInt(classKey)] = value
				}
				object[option] = newObject
			}
		}

		moveClassIndexes(this.optionsPerClass)
		moveClassIndexes(this.levelSumsPerClass)
	}

	/**
	 * Déplacer un élève dans une autre classe.
	 * Permet d'actualiser les différentes données de la configuration actuelle (sans tout recalculer).
	 */
	public moveStudent(student: Student, from: ClassWithIndex, to: ClassWithIndex) {
		from.class.removeStudent(student)
		to.class.addStudent(student)

		for (const [option, level] of Object.entries(student.levels())) {
			this.optionsPerClass[option][from.index]--
			this.levelSumsPerClass[option][from.index] -= level

			if (this.optionsPerClass[option][from.index] === 0) delete this.optionsPerClass[option][from.index]
			if (this.levelSumsPerClass[option][from.index] === 0) delete this.levelSumsPerClass[option][from.index]

			if (!(to.index in this.optionsPerClass[option])) {
				this.optionsPerClass[option][to.index] = 1
				this.levelSumsPerClass[option][to.index] = level
			} else {
				this.optionsPerClass[option][to.index]++
				this.levelSumsPerClass[option][to.index] += level
			}
		}
	}

	public static default(algo: Algo): Entry {
		const length = Math.ceil(algo.students().length / algo.input().classSize())
		const entry = new Entry(
			algo,
			Array.from(
				{length},
				(_v, k) =>
					new Class(
						algo
							.students()
							.slice(
								k * algo.input().classSize(),
								k * algo.input().classSize() + algo.input().classSize()
							)
					)
			)
		)
		entry.calculate()
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
		const studentClass = entry.searchStudent(student) as {class: Class; index: number}

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
			const otherStudent = otherClass
				.getStudents()
				.map(s => ({student: s, ...rule.getStudentValue(entry, s)}))
				.reduce((acc, cur) => {
					if (cur.value > acc.value) return cur
					return acc
				}).student

			// Déplacer cet élève dans la classe initiale du premier élève (échanger).
			entry.moveStudent(
				otherStudent,
				{class: otherClass, index: entry.classes().indexOf(otherClass)},
				studentClass
			)
		} else if (studentClass?.class.getStudents().length === 0) {
			// Supprimer la classe s'il n'y a plus d'élèves dedans.
			entry.deleteClass(studentClass.index)
		}

		return entry
	}

	toCount(...keysMask: string[]) {
		return this.classes().map(c => c.toCount(...keysMask))
	}

	toLevel(...keysMask: string[]) {
		return this.classes().map(c => c.toLevel(...keysMask))
	}

	toString(showLevel?: boolean, ...keysMask: string[]) {
		let str = ""
		for (const c of this.classes()) {
			str += "- " + c.toString(showLevel, ...keysMask) + "\n"
		}

		return str
	}
}
