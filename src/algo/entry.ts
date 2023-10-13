import Class, {ClassWithIndex} from "./class.ts"
import Genetic, {
	CLASS_WRONG_AMOUNT_MULTIPLIER,
	CLASS_WRONG_SIZE_MULTIPLIER,
	MAX_LEVEL,
	MAX_STUDENTS_TO_MOVE,
	MIN_LEVEL,
} from "./genetic.ts"
import {getStudentValue, Student} from "./student.ts"
import {Input} from "./input.ts"
import {groupTogetherValue} from "./rules/group_together.ts"
import {balanceCountValue} from "./rules/balance_count.ts"

export default class Entry {
	public genetic: Genetic
	public classes: Class[]
	private value?: number

	// Nombre d'élèves ayant chaque option dans chaque classe.
	private levelsPerClass: {[levelKey: string]: {[classKey: string]: number}} = {}

	// Somme des niveaux pour chaque option dans chaque classe.
	private levelsSumsPerClass: {[levelKey: string]: {[classKey: string]: number}} = {}

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
				for (const [levelKey, level] of Object.entries(s.levels)) {
					if (!(levelKey in this.levelsPerClass)) {
						this.levelsPerClass[levelKey] = {}
						this.levelsSumsPerClass[levelKey] = {}
					}

					if (!(i in this.levelsPerClass[levelKey])) {
						this.levelsPerClass[levelKey][i] = 1
						this.levelsSumsPerClass[levelKey][i] = level
						continue
					}

					this.levelsPerClass[levelKey][i]++
					this.levelsSumsPerClass[levelKey][i] += level
				}
			}
		}
	}

	public clone() {
		const entry = new Entry(this.genetic, [...this.classes.map(c => new Class([...c.getStudents()]))])

		// Cloner les données d'analyse.
		for (const [levelKey, value] of Object.entries(this.levelsPerClass)) {
			entry.levelsPerClass[levelKey] = Object.assign({}, value)
		}
		for (const [levelKey, value] of Object.entries(this.levelsSumsPerClass)) {
			entry.levelsSumsPerClass[levelKey] = Object.assign({}, value)
		}

		return entry
	}

	public getLevelCountByClass(levelKey: string) {
		return this.levelsPerClass[levelKey]
	}

	public getLevelSumByClass(levelKey: string) {
		return this.levelsSumsPerClass[levelKey]
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
	 * Déplacer un élève dans une autre classe.
	 * Permet d'actualiser les différentes données de la configuration actuelle (sans tout recalculer).
	 */
	public moveStudent(student: Student, from: ClassWithIndex, to: ClassWithIndex) {
		from.class.removeStudent(student)
		to.class.addStudent(student)

		for (const [levelKey, level] of Object.entries(student.levels)) {
			this.levelsPerClass[levelKey][from.index]--
			this.levelsSumsPerClass[levelKey][from.index] -= level

			if (!(to.index in this.levelsPerClass[levelKey])) {
				this.levelsPerClass[levelKey][to.index] = 1
				this.levelsSumsPerClass[levelKey][to.index] = level
			} else {
				this.levelsPerClass[levelKey][to.index]++
				this.levelsSumsPerClass[levelKey][to.index] += level
			}
		}
	}

	public static from(genetic: Genetic, students: Student[], size: number): Entry {
		const classes = Math.ceil(students.length / size)
		const entry = new Entry(
			genetic,
			Array.from({length: classes}, (_v, k) => new Class(students.slice(k * size, k * size + size)))
		)
		entry.calculate()
		return entry
	}

	/**
	 * Faire un changement aléatoire dans la configuration actuelle et retourner une nouvelle disposition.
	 */
	public randomChange(input: Input): Entry {
		// Cloner la configuration actuelle pour en retourner une nouvelle différente.
		const entry = this.clone()
		// Obtenir la liste de tous les élèves.
		const allStudents = entry.classes.map(c => c.getStudents()).flat()
		// Déterminer aléatoirement un nombre maximum de déplacements d'élèves pour ce changement.
		const moves = Math.floor(Math.random() * MAX_STUDENTS_TO_MOVE) + 1

		// Établir la liste des élèves les moins bien placés et n'en garder qu'un certain nombre.
		// On obtient en même temps la liste des destinations idéales pour chaque élève.
		const worseStudents = allStudents
			.map(s => [s, getStudentValue(entry, input, this.genetic, s)] as [Student, [number, Class[]]])
			.filter(([, [value]]) => value > 0)
			.sort((a, b) => b[1][0] - a[1][0])
			.slice(0, moves)

		for (const [student, [, destinations]] of worseStudents) {
			this.randomChangeMove(student, destinations, entry, input)
		}

		return entry
	}

	private randomChangeMove(student: Student, destinations: Class[], entry: Entry, input: Input): Entry {
		// Obtenir la classe actuelle de l'élève qui sera déplacé.
		const studentClass = entry.searchStudent(student) as {class: Class; index: number}

		// On supprime les éventuelles classes supprimées de la liste des destinations.
		destinations = destinations.filter(c => entry.classes.indexOf(c) >= 0)

		// Choisir une autre classe, différente de celle choisie précédemment, en respectant l'éventuelle liste des destinations idéales.
		if (!destinations.length) console.log("empty destinations")
		else console.log("yes")
		let otherClass = !!destinations.length && destinations[Math.floor(Math.random() * destinations.length)]
		if (!otherClass) {
			// Aucune classe idéale n'existe pour cet élève, donc on en crée une nouvelle.
			otherClass = new Class([])
			entry.classes.push(otherClass)
		}

		// Déplacer l'élève dans l'autre classe.
		entry.moveStudent(student, studentClass, {class: otherClass, index: entry.classes.indexOf(otherClass)})

		// On l'échange avec un élève de sa nouvelle classe si elle est pleine.
		if (otherClass.getStudents().length > input.counts.max_students) {
			// Déterminer l'élève de sa nouvelle classe qui est le moins bien placé.
			const otherStudent = otherClass
				.getStudents()
				.map(s => [s, getStudentValue(entry, input, this.genetic, s)] as [Student, [number, Class[]]])
				.reduce((acc, cur) => {
					if (cur[1][0] > acc[1][0]) return cur
					return acc
				})[0]

			// Déplacer cet élève dans la classe initiale du premier élève (échanger).
			entry.moveStudent(otherStudent, {class: otherClass, index: entry.classes.indexOf(otherClass)}, studentClass)
		} else if (studentClass?.class.getStudents().length === 0) {
			// Supprimer la classe s'il n'y a plus d'élèves dedans.
			entry.classes.splice(studentClass?.index, 1)
		}

		return entry
	}

	/**
	 * Évaluer la qualité de cette configuration par rapport aux paramètres d'entrée de l'algorithme.
	 */
	public getValue(input: Input) {
		if (this.value) return this.value
		this.value = 0

		// Respect du nombre de classes.
		if (this.classes.length < (input.counts.min_classes ?? 1) || this.classes.length > input.counts.max_classes)
			this.value += CLASS_WRONG_AMOUNT_MULTIPLIER // TODO rule minimize maximize

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
			const levelsSum: {[level: string]: number} = {}

			for (const s of c.getStudents()) {
				if (s.gender === "M") m++
				else if (s.gender === "F") f++

				for (const levelKey of Object.keys(s.levels)) {
					levelsCount[levelKey] = levelsCount[levelKey] ? levelsCount[levelKey] + 1 : 1
					levelsSum[levelKey] = levelsSum[levelKey]
						? levelsSum[levelKey] + s.levels[levelKey]
						: s.levels[levelKey]
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

			// Respect des niveaux.
			for (const [levelKey, levelInput] of Object.entries(input.levels)) {
				if (!(levelKey in levelsCount)) continue

				// Respect des relations entre niveaux.
				for (const key of levelInput?.relations?.forbidden?.list ?? []) {
					if (key in levelsCount)
						this.value += (levelInput.priority ?? 1) * (levelInput.relations.forbidden?.priority ?? 1)
				}

				// Respect de l'équilibrage des niveaux pour ceux concernés.
				if ("balance_level" in levelInput.rules)
					this.value +=
						Math.abs((MIN_LEVEL + MAX_LEVEL) / 2 - levelsSum[levelKey] / c.getStudents().length) *
						(levelInput.priority ?? 1) *
						(levelInput.rules["balance_level"] ?? 1)
			}
		}

		// TODO rule balance_count : le meme nombre dans chaque classe
		//   -> si en même temps que la règle group_together, ça rassemble sur le minimum de classe mais égalise entre elles

		for (const levelKey of this.genetic.getLevels) {
			if (!(levelKey in input.levels)) continue

			// Respect du regroupement des options, pour celles concernées.
			if ("group_together" in input.levels[levelKey].rules)
				this.value +=
					groupTogetherValue(this, input, levelKey) *
					(input.levels[levelKey].priority ?? 1) *
					(input.levels[levelKey].rules["group_together"] ?? 1)

			// Respect de l'équilibrage des options sur les classes qui possèdent l'option.
			if ("balance_count" in input.levels[levelKey].rules) {
				this.value +=
					balanceCountValue(this, this.genetic, levelKey) *
					(input.levels[levelKey].priority ?? 1) *
					(input.levels[levelKey].rules["balance_count"] ?? 1)
			}
		}

		return this.value
	}

	toCount(...keysMask: string[]) {
		return this.classes.map(c => c.toCount(...keysMask))
	}

	toString(...keysMask: string[]) {
		let str = ""
		for (const c of this.classes) {
			str += "- " + c.toString(...keysMask) + "\n"
		}

		return str
	}
}
