import {Student} from "./student.ts"
import {Attribute} from "./attribute.ts"
import Entry from "./entry.ts"
import {Rule} from "./rules/rule.ts"

export type ClassWithIndex = {class: Class; index: number}

export default class Class {
	private students: Student[] = []

	// Nombre d'élèves ayant chaque attribut dans la classe.
	private attributesCount: {[attribute: number]: number} = {}

	constructor(students: Student[]) {
		for (let student of students) {
			this.addStudent(student)
		}
	}

	/**
	 * Obtenir la liste des élèves présents dans cette classe.
	 */
	public getStudents(): Student[] {
		return this.students
	}

	/**
	 * Obtenir le nombre d'élèves qui possède un certain attribut dans la classe.
	 */
	public count(attribute: Attribute | number): number {
		return this.attributesCount[typeof attribute === "number" ? attribute : attribute.key()] ?? 0
	}

	/**
	 * Retirer un élève de la classe.
	 */
	public removeStudent(student: Student) {
		this.students.splice(
			this.students.findIndex(s => s === student),
			1
		)

		for (const attribute of student.attributes()) {
			this.attributesCount[attribute.key()]--
			if (this.attributesCount[attribute.key()] <= 0) delete this.attributesCount[attribute.key()]
		}
	}

	/**
	 * Ajouter un élève à la classe.
	 */
	public addStudent(student: Student) {
		this.students.push(student)

		for (const attribute of student.attributes()) {
			this.attributesCount[attribute.key()] =
				attribute.key() in this.attributesCount ? this.attributesCount[attribute.key()] + 1 : 1
		}
	}

	/**
	 * Déterminer si cette classe contient un certain élève.
	 */
	public hasStudent(id: string) {
		for (const student of this.students) {
			if (student.id() === id) return true
		}

		return false
	}

	/**
	 * Déterminer si cette classe est égale à une autre, en comparant la liste des élèves.
	 */
	public equals(other: Class): boolean {
		if (other.getStudents().length != this.students.length) return false

		for (let s1 of this.students) {
			if (!other.getStudents().includes(s1)) return false
		}

		return true
	}

	/**
	 * Déterminer si cette classe est égale à une autre, en ne comparant que les dénombrements.
	 */
	public equalsCount(other: Class): boolean {
		for (const [attribute, count] of Object.entries(this.attributesCount)) {
			if (other.count(parseInt(attribute)) != count) return false
		}

		return true
	}

	/**
	 * Trouver l'élève idéal pour aller dans cette classe.
	 * Doit prendre en compte les précédentes règles et leur priorité.
	 */
	public findBestStudentFor(entry: Entry, students: Student[], toRule?: Rule): Student {
		// On récupère une liste réduite d'élèves, mais qui contient quand même l'ensemble des cas.
		const sample = entry.getStudentSample(students)
		let bestValues: number[] | undefined = undefined
		let bestStudent: Student | undefined = undefined

		// On teste le nombre de règles respectées pour chaque élève, s'il est déplacé dans la classe.
		for (const studentIndex in sample) {
			const student = sample[studentIndex]

			// On effectue le déplacement de l'élève dans cette classe.
			const newEntry = entry.clone()
			newEntry.moveStudent(student, newEntry.searchStudent(student)!, {
				class: newEntry.class(entry.classes().indexOf(this))!,
				index: entry.classes().indexOf(this),
			})

			const values: number[] = []
			for (let index in newEntry.algo().input().rules()) {
				const rule = newEntry.algo().input().rules()[index]

				// Si la valeur est déjà supérieure à la meilleure, on abandonne cette configuration.
				if (bestValues && newEntry.value(rule) > bestValues[index]) break

				// On définit la valeur de cette règle avec cette configuration.
				values[index] = newEntry.value(rule)

				// Si on a atteint la règle limite, on ne va pas plus loin pour cette configuration.
				if (rule === toRule) break
			}

			if (!bestValues || values.length === bestValues.length) {
				bestValues = values
				bestStudent = student
			}
		}

		return bestStudent!
	}

	/**
	 * Uniquement utilisé dans les tests, pas besoin de stocker la valeur.
	 * Permet de s'assurer que le dénombrement stocké est correct.
	 */
	manualCount(option: string, level?: number | string): number {
		return this.students.filter(s => option in s.levels() && (level === undefined || s.levels()[option] == level))
			.length
	}

	toString(showLevel?: boolean, ...keysMask: string[]) {
		const attributeCount: {[attribute: string]: number} = {}
		const levelCount: {[attribute: string]: {[level: number]: number}} = {}

		for (const student of this.students) {
			for (const [attribute, level] of Object.entries(student.levels())) {
				attributeCount[attribute] = attributeCount[attribute] ? attributeCount[attribute] + 1 : 1
				if (!levelCount[attribute]) levelCount[attribute] = {}
				levelCount[attribute][level] = levelCount[attribute][level] ? levelCount[attribute][level] + 1 : 1
			}
		}

		let str = `Class{students: ${this.students.length}, `

		for (const [option, count] of Object.entries(attributeCount)) {
			if (!keysMask.includes(option)) continue
			str += `${option}: ${count}`
			if (showLevel && Object.keys(levelCount[option]).length > 1) {
				str += " ("
				for (let [level, c] of Object.entries(levelCount[option])) {
					str += `${level}: ${c}, `
				}
				str = str.slice(0, -2) + ")"
			}
			str += ", "
		}

		return str.slice(0, -2) + "}"
	}
}
