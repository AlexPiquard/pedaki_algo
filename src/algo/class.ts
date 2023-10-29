import {Student} from "./student.ts"

export type ClassWithIndex = {class: Class; index: number}

export default class Class {
	private students: Student[]

	constructor(students: Student[]) {
		this.students = students
	}

	public getStudents(): Student[] {
		return this.students
	}

	public removeStudent(student: Student) {
		this.students.splice(
			this.students.findIndex(s => s === student),
			1
		)
	}

	public addStudent(student: Student) {
		this.students.push(student)
	}

	public hasStudent(id: string) {
		for (const student of this.students) {
			if (student.id() === id) return true
		}

		return false
	}

	toCount(...keysMask: string[]) {
		// TODO cache
		const countLevel: {[level: string]: number} = {}
		for (const student of this.students) {
			for (const option of Object.keys(student.options())) {
				if (!keysMask.includes(option)) continue
				countLevel[option] = countLevel[option] ? countLevel[option] + 1 : 1
			}
		}
		return countLevel
	}

	toLevel(...keysMask: string[]) {
		// TODO à utiliser
		// TODO cache
		const countLevel = this.toCount(...keysMask)
		const sumLevel: {[option: string]: number} = {}
		for (const student of this.students) {
			for (const [option, level] of Object.entries(student.options())) {
				if (!keysMask.includes(option)) continue
				sumLevel[option] = sumLevel[option] ? sumLevel[option] + level : level
			}
		}

		for (const [option, sum] of Object.entries(sumLevel)) {
			sumLevel[option] = Math.round((sum / countLevel[option]) * 10) / 10
		}

		return sumLevel
	}

	toString(showLevel?: boolean, ...keysMask: string[]) {
		const countLevel: {[level: string]: number} = {}
		const sumLevel: {[level: string]: number} = {}

		for (const student of this.students) {
			for (const [option, level] of Object.entries(student.options())) {
				countLevel[option] = countLevel[option] ? countLevel[option] + 1 : 1
				sumLevel[option] = sumLevel[option] ? sumLevel[option] + level : level
			}
		}

		let str = `Class{students: ${this.students.length}, `

		for (const [option, count] of Object.entries(countLevel)) {
			if (!keysMask.includes(option)) continue
			str += `${option}: ${count}`
			if (showLevel) str += ` (${Math.round((sumLevel[option] / countLevel[option]) * 10) / 10})`
			str += ", "
		}

		return str.substring(0, str.length - 2) + "}"
	}
}
