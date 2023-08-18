import Class from "./class.ts";
import {
  CHANCE_TO_MOVE_ALONE,
  FRIEND_MULTIPLIER,
  LANGUAGE_MULTIPLIER,
  SPECIALIZATION_MULTIPLIER,
  Student
} from "./genetic.ts";

export default class Entry {
  private classes: Class[]

  constructor(classes: Class[]) {
    this.classes = classes
  }

  public searchStudent(student: Student): {class: Class, index: number} | null {
    for (let k in this.classes) {
      const c = this.classes[k];
      for (let s of c.getStudents()) {
        if (s === student) return {class: c, index: parseInt(k)}
      }
    }

    return null
  }

  public static from(students: Student[], classes: number): Entry {
    const entry = new Entry([new Class(students)])
    for (let k= 0; k < classes - 1; ++k) {
      entry.classes.push(new Class([]))
    }
    return entry
  }

  /**
   * Faire un changement aléatoire dans la configuration actuelle.
   */
  public randomChange(): Entry {
    const allStudents = this.classes.map(c => c.getStudents()).flat()

    // Choisir un élève parmis toutes les classes.
    const student = allStudents[Math.random() * allStudents.length]
    const studentClass = this.searchStudent(student)

    // Choisir une autre classe, différente de celle choisie précédemment.
    const otherClass = this.classes.filter((_c, i) => i !== studentClass?.index)[Math.random() * this.classes.length - 1]

    // Déplacer l'élève dans l'autre classe.
    studentClass?.class?.removeStudent(student)
    otherClass.addStudent(student)

    if (Math.random() > CHANCE_TO_MOVE_ALONE) {
      // Echanger l'élève avec un autre de l'autre classe.
      const otherStudent = otherClass.getStudents()[Math.random() * otherClass.getStudents().length]
      studentClass?.class?.addStudent(otherStudent)
      otherClass.removeStudent(otherStudent)
    }

    return this
  }

  /**
   * Evaluer la qualité de cette configuration.
   */
  public value() {
    let value = 0

    // Différence des spécialités dans chaque classe.
    // On additionne chaque spécialité qui correspond.
    for (let c of this.classes) {
      for (let s1 of c.getStudents()) {
        for (let s2 of c.getStudents()) {
          if (s1 === s2) continue

          if (s1.options.specialization === s2.options.specialization)
            value += SPECIALIZATION_MULTIPLIER
        }
      }
    }

    // Différence des langues dans chaque classe.
    // On additionne chaque langue qui correspond.
    for (let c of this.classes) {
      for (let s1 of c.getStudents()) {
        for (let s2 of c.getStudents()) {
          if (s1 === s2) continue

          for (let l1 of s1.options.languages) {
            for (let l2 of s2.options.languages) {
              if (l1 === l2)
                value += LANGUAGE_MULTIPLIER
            }
          }
        }
      }
    }

    // Amitiés non respectées dans chaque classe.
    // On additionne chaque amitié respectée.
    for (let c of this.classes) {
      for (let s of c.getStudents()) {
        for (let f of s.friends) {
          if (c.hasStudent(f)) value += FRIEND_MULTIPLIER
        }
      }
    }

    return value
  }

  toString() {
    let str = ""
    for (let c of this.classes) {
      str += c + ", "
    }

    return str
  }
}