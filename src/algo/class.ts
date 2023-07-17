import {Student} from "./genetic.ts";

export default class Class {
  private students: Student[];

  constructor(students: Student[]) {
    this.students = students;
  }
}