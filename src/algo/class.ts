import {Student} from "./genetic.ts";

export default class Class {
  private students: Student[]

  constructor(students: Student[]) {
    this.students = students
  }

  public getStudents(): Student[] {
    return this.students
  }

  public removeStudent(student: Student) {
    this.students = this.students.splice(this.students.findIndex(s => s === student), 1)
  }

  public addStudent(student: Student) {
    this.students.push(student)
  }

  public hasStudent(id: string) {
    for (let student of this.students) {
      if (student.id === id) return true
    }

    return false
  }

  toString() {
    let str = "Class : "
    for (let s of this.students) {
      str += s.id + ", "
    }

    return str
  }
}