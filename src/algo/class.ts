import {Student} from "./student.ts"
import {Attribute} from "./attribute.ts"
import Entry from "./entry.ts";
import {Rule} from "./rules/rule.ts";

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

	public shuffleStudents() {
		// TODO trouver mieux que ça ?
		this.students.sort(() => 0.5 - Math.random())
	}

	public getStudents(): Student[] {
		return this.students
	}

	public count(attribute: Attribute): number {
		return this.attributesCount[attribute.key()]
	}

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

	public addStudent(student: Student) {
		this.students.push(student)

		for (const attribute of student.attributes()) {
			this.attributesCount[attribute.key()] =
				attribute.key() in this.attributesCount ? this.attributesCount[attribute.key()] + 1 : 1
		}
	}

	public hasStudent(id: string) {
		for (const student of this.students) {
			if (student.id() === id) return true
		}

		return false
	}

	/**
	 * Trouver l'élève idéal pour aller dans cette classe.
	 * Doit prendre en compte les précédentes règles et leur priorité.
	 */
	public findBestStudentFor(entry: Entry, students: Student[], toRule?: Rule): Student {
		// On récupère une liste réduite d'élèves, mais qui contient quand même l'ensemble des cas.
		const sample = entry.getStudentSample(students)
		const results: number[] = []

		// On teste le nombre de règles respectés pour chaque élève, s'il est déplacé dans la classe.
		for (const studentIndex in sample) {
			const student = sample[studentIndex]

			// On effectue le déplacement de l'élève dans cette classe.
			const newEntry = entry.clone()
			newEntry.moveStudent(student, newEntry.searchStudent(student)!, {class: newEntry.class(entry.classes().indexOf(this))!, index: entry.classes().indexOf(this)})
			results[studentIndex] = 0

			for (let rule of newEntry.algo().input().rules()) {
				// Si cette règle n'est pas respectée, on s'arrête là.
				if (rule.getEntryValue(newEntry) != 0) break

				// On incrémente le nombre de règles respectées avec cet élève.
				results[studentIndex] = studentIndex in results ? results[studentIndex] + 1 : 1

				// Si on a trouvé un élève dont le déplacement respecte l'ensemble des règles, on le retourne tout de suite.
				if (rule === toRule) return student
			}
		}

		// On cherche l'élève dont le déplacement a respecté le plus de règles.
		let bestValue = - Number.MAX_VALUE
		let bestStudent = null
		for (const studentIndex in results) {
			if (results[studentIndex] > bestValue) {
				bestStudent = sample[studentIndex]
				bestValue = results[studentIndex]
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
