import {Student} from "./student.ts";

export default class Class {
  private students: Student[]

  constructor(students: Student[]) {
    this.students = students
  }

  public getStudents(): Student[] {
    return this.students
  }

  public removeStudent(student: Student) {
    this.students.splice(this.students.findIndex(s => s === student), 1)
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

  toString(...keysMask: string[]) {
    const countGender: {[gender: string]: number} = {};
    const countLevel: {[level: string]: number} = {}

    for (const student of this.students) {
      countGender[student.gender] = countGender[student.gender] ? countGender[student.gender] + 1 : 1

      for (const levelKey of Object.keys(student.levels)) {
        countLevel[levelKey] = countLevel[levelKey] ? countLevel[levelKey] + 1 : 1
      }
    }

    let str = `Class{students: ${this.students.length}, `

    for (const gender of ["M", "F"]) {
      if (!keysMask.includes(gender)) continue
      str += `${gender}: ${countGender[gender]}, `
    }

    for (const [levelKey, count] of Object.entries(countLevel)) {
      if (!keysMask.includes(levelKey)) continue
      str += `${levelKey}: ${count}, `
    }

    return str.substring(0, str.length - 2) + "}"
  }
}