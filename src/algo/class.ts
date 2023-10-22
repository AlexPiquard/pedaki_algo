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
			if (student.id === id) return true
		}

		return false
	}

	toCount(...keysMask: string[]) {
		// TODO cache
		const countLevel: {[level: string]: number} = {}
		for (const student of this.students) {
			for (const levelKey of Object.keys(student.levels)) {
				if (!keysMask.includes(levelKey)) continue
				countLevel[levelKey] = countLevel[levelKey] ? countLevel[levelKey] + 1 : 1
			}
		}
		return countLevel
	}

	toLevel(...keysMask: string[]) {
		// TODO à utiliser
		// TODO cache
		const countLevel = this.toCount(...keysMask)
		const sumLevel: {[levelKey: string]: number} = {}
		for (const student of this.students) {
			for (const [levelKey, level] of Object.entries(student.levels)) {
				if (!keysMask.includes(levelKey)) continue
				sumLevel[levelKey] = sumLevel[levelKey] ? sumLevel[levelKey] + level : level
			}
		}

		for (let [levelKey, sum] of Object.entries(sumLevel)) {
			sumLevel[levelKey] = Math.round((sum / countLevel[levelKey]) * 10) / 10
		}

		return sumLevel
	}

	toString(showLevel?: boolean, ...keysMask: string[]) {
		const countGender: {[gender: string]: number} = {}
		const countLevel: {[level: string]: number} = {}
		const sumLevel: {[level: string]: number} = {}

		for (const student of this.students) {
			countGender[student.gender] = countGender[student.gender] ? countGender[student.gender] + 1 : 1

			for (const [levelKey, level] of Object.entries(student.levels)) {
				countLevel[levelKey] = countLevel[levelKey] ? countLevel[levelKey] + 1 : 1
				sumLevel[levelKey] = sumLevel[levelKey] ? sumLevel[levelKey] + level : level
			}
		}

		let str = `Class{students: ${this.students.length}, `

		for (const gender of ["M", "F"]) {
			if (!keysMask.includes(gender)) continue
			str += `${gender}: ${countGender[gender]}, `
		}

		for (const [levelKey, count] of Object.entries(countLevel)) {
			if (!keysMask.includes(levelKey)) continue
			str += `${levelKey}: ${count}`
			if (showLevel) str += ` (${Math.round((sumLevel[levelKey] / countLevel[levelKey]) * 10) / 10})`
			str += ", "
		}

		return str.substring(0, str.length - 2) + "}"
	}
}
