import {Gender, LanguageOption, SpecializationOption, Student} from "./genetic.ts";

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

  toString() {
    const countGender: number[] = [];
    const countLanguage: number[] = [];
    const countSpecialization: number[] = [];

    for (const student of this.students) {
      countGender[student.gender] = countGender[student.gender] ? countGender[student.gender] + 1 : 1

      for (const language of student.options.languages) {
        countLanguage[language] = countLanguage[language] ? countLanguage[language] + 1 : 1
      }

      for (const specialization of student.options.specialization) {
        countSpecialization[specialization] = countSpecialization[specialization] ? countSpecialization[specialization] + 1 : 1
      }
    }

    let str = `Class{students: ${this.students.length}, `

    for (const gender of Object.keys(Gender)) {
      if (!(parseInt(gender) in Gender)) continue
      if (!countGender[Gender[parseInt(gender)] as unknown as number]) continue;
      str += `${Gender[parseInt(gender)]}: ${countGender[Gender[parseInt(gender)] as unknown as number]}, `
    }

    for (const language of Object.keys(LanguageOption)) {
      if (!(parseInt(language) in LanguageOption)) continue
      if (!countLanguage[LanguageOption[parseInt(language)] as unknown as number]) continue;
      str += `${LanguageOption[parseInt(language)]}: ${countLanguage[LanguageOption[parseInt(language)] as unknown as number]}, `
    }

    for (const specialization of Object.keys(SpecializationOption)) {
      if (!(parseInt(specialization) in SpecializationOption)) continue
      if (!countSpecialization[SpecializationOption[parseInt(specialization)] as unknown as number]) continue;
      str += `${SpecializationOption[parseInt(specialization)]}: ${countSpecialization[SpecializationOption[parseInt(specialization)] as unknown as number]}, `
    }

    return str.substring(0, str.length - 2) + "}"
  }
}