import Class, {ClassWithIndex} from "./class.ts"
import Genetic, {MAX_STUDENTS_TO_MOVE, RuleOrder} from "./genetic.ts"
import {Student} from "./student.ts"

export default class Entry {
	public genetic: Genetic
	public classes: Class[]
	private value?: number

	// Nombre d'élèves ayant chaque option dans chaque classe.
	private optionsPerClass: {[option: string]: {[classKey: string]: number}} = {}

	// Somme des niveaux pour chaque option dans chaque classe.
	private levelSumsPerClass: {[option: string]: {[classKey: string]: number}} = {}

	constructor(genetic: Genetic, classes: Class[]) {
		this.genetic = genetic
		this.classes = classes
	}

	/**
	 * Calculer les différentes données d'analyse.
	 * N'est calculé entièrement qu'une seule fois.
	 */
	private calculate() {
		for (const [i, c] of Object.entries(this.classes)) {
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
		const entry = new Entry(this.genetic, [...this.classes.map(c => new Class([...c.getStudents()]))])

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
		for (const [k, c] of Object.entries(this.classes)) {
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
		this.classes.splice(classIndex, 1)

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

	public static default(genetic: Genetic): Entry {
		const length = Math.ceil(genetic.students().length / genetic.input().classSize())
		const entry = new Entry(
			genetic,
			Array.from(
				{length},
				(_v, k) =>
					new Class(
						genetic
							.students()
							.slice(
								k * genetic.input().classSize(),
								k * genetic.input().classSize() + genetic.input().classSize()
							)
					)
			)
		)
		entry.calculate()
		return entry
	}

	/**
	 * Faire un changement aléatoire dans la configuration actuelle et retourner une nouvelle disposition.
	 */
	public randomChange(): Entry {
		// Cloner la configuration actuelle pour en retourner une nouvelle différente.
		const entry = this.clone()
		// Obtenir la liste de tous les élèves.
		const allStudents = entry.classes.map(c => c.getStudents()).flat()
		// Déterminer aléatoirement un nombre maximum de déplacements d'élèves pour ce changement.
		const moves = Math.floor(Math.random() * MAX_STUDENTS_TO_MOVE) + 1

		// Établir la liste des élèves les moins bien placés et n'en garder qu'un certain nombre.
		// On obtient en même temps la liste des destinations idéales pour chaque élève.
		const worseStudents = allStudents
			.map(s => ({student: s, ...s.value(entry)}))
			.filter(({value}) => value > 0)
			.sort((a, b) => b.value - a.value)
			.slice(0, moves)

		for (const {student, bestClasses} of worseStudents) {
			this.randomChangeMove(student, bestClasses, entry)
		}

		return entry
	}

	private randomChangeMove(student: Student, destinations: Class[], entry: Entry): Entry {
		// Obtenir la classe actuelle de l'élève qui sera déplacé.
		const studentClass = entry.searchStudent(student) as {class: Class; index: number}

		// On supprime les éventuelles classes supprimées de la liste des destinations.
		destinations = destinations.filter(c => entry.classes.indexOf(c) >= 0)

		// Choisir une autre classe, différente de celle choisie précédemment, en respectant l'éventuelle liste des destinations idéales.
		let otherClass = !!destinations.length && destinations[Math.floor(Math.random() * destinations.length)]
		if (!otherClass) {
			// Aucune classe idéale n'existe pour cet élève, donc on en crée une nouvelle.
			otherClass = new Class([])
			entry.classes.push(otherClass)
		}

		// Déplacer l'élève dans l'autre classe.
		entry.moveStudent(student, studentClass, {class: otherClass, index: entry.classes.indexOf(otherClass)})

		// On l'échange avec un élève de sa nouvelle classe si elle est pleine.
		if (otherClass.getStudents().length > this.genetic.input().classSize()) {
			// Déterminer l'élève de sa nouvelle classe qui est le moins bien placé.
			const otherStudent = otherClass
				.getStudents()
				.map(s => ({student: s, ...s.value(entry)}))
				.reduce((acc, cur) => {
					if (cur.value > acc.value) return cur
					return acc
				}).student

			// Déplacer cet élève dans la classe initiale du premier élève (échanger).
			entry.moveStudent(otherStudent, {class: otherClass, index: entry.classes.indexOf(otherClass)}, studentClass)
		} else if (studentClass?.class.getStudents().length === 0) {
			// Supprimer la classe s'il n'y a plus d'élèves dedans.
			entry.deleteClass(studentClass.index)
		}

		return entry
	}

	/**
	 * Évaluer la qualité de cette configuration par rapport aux paramètres d'entrée de l'algorithme.
	 */
	public getValue() {
		if (this.value) return this.value
		this.value = 0

		// Respect du nombre de classes.
		/*if (this.classes.length < (input.counts.min_classes ?? 1) || this.classes.length > input.counts.max_classes)
			this.value += CLASS_WRONG_AMOUNT_MULTIPLIER

		for (const [, c] of Object.entries(this.classes)) {
			// Respect de la taille des classes.
			if (
				c.getStudents().length < (input.counts.min_students ?? 1) ||
				(input.counts.max_students && c.getStudents().length > input.counts.max_students)
			)
				this.value += CLASS_WRONG_SIZE_MULTIPLIER

			let m = 0,
				f = 0
			const levelsCount: {[level: string]: number} = {}

			for (const s of c.getStudents()) {
				if (s.gender === "M") m++
				else if (s.gender === "F") f++

				for (const levelKey of Object.keys(s.levels)) {
					levelsCount[levelKey] = levelsCount[levelKey] ? levelsCount[levelKey] + 1 : 1
				}

				// Respect des relations entre élèves.
				for (const f of s.relations?.positive ?? []) {
					if (!c.hasStudent(f)) this.value += input.relations?.positive_priority ?? 1
				}
				for (const f of s.relations?.negative ?? []) {
					if (c.hasStudent(f)) this.value += input.relations?.negative_priority ?? 1
				}
				for (const f of s.relations?.required ?? []) {
					if (!c.hasStudent(f)) this.value += input.relations?.required_priority ?? 1
				}
				for (const f of s.relations?.forbidden ?? []) {
					if (c.hasStudent(f)) this.value += input.relations?.forbidden_priority ?? 1
				}
			}

			// Respect de la parité.
			if (input.gender?.parity.M && input.gender.parity.F) {
				this.value +=
					Math.abs(m - c.getStudents().length * (input.gender?.parity.M / 100)) *
					(input.gender?.priority ?? 1)
				this.value +=
					Math.abs(f - c.getStudents().length * (input.gender?.parity.F / 100)) *
					(input.gender?.priority ?? 1)
			}

			// Respect des options.
			for (const [levelKey, levelInput] of Object.entries(input.levels)) {
				if (!(levelKey in levelsCount)) continue

				// Respect des relations entre options.
				for (const key of levelInput?.relations?.forbidden?.list ?? []) {
					if (key in levelsCount)
						this.value += (levelInput.priority ?? 1) * (levelInput.relations.forbidden?.priority ?? 1)
				}
			}
		}*/

		// On applique toutes les règles.
		for (const inputRule of this.genetic.input().rules()) {
			if (!(inputRule.key() in RuleOrder)) continue
			const {rule, priority} = RuleOrder[inputRule.key()]
			this.value += rule.getEntryValue(this, inputRule) * priority * inputRule.priority()
		}

		return this.value
	}

	toCount(...keysMask: string[]) {
		return this.classes.map(c => c.toCount(...keysMask))
	}

	toLevel(...keysMask: string[]) {
		return this.classes.map(c => c.toLevel(...keysMask))
	}

	toString(showLevel?: boolean, ...keysMask: string[]) {
		let str = ""
		for (const c of this.classes) {
			str += "- " + c.toString(showLevel, ...keysMask) + "\n"
		}

		return str
	}
}
