import Class from "./class.ts";
import {
  CHANCE_TO_MOVE_ALONE, CLASS_SIZE_EQUALITY_MULTIPLIER,
  FRIEND_MULTIPLIER,
  LANGUAGE_MULTIPLIER, LanguageOption, MAX_STUDENTS_TO_MOVE,
  SPECIALIZATION_MULTIPLIER,
  Student
} from "./genetic.ts";

export default class Entry {
  private classes: Class[]
  private v?: number

  constructor(classes: Class[]) {
    this.classes = classes
  }

  public clone() {
    return new Entry([...this.classes.map(c => new Class([...c.getStudents()]))])
  }

  public searchStudent(student: Student): {class: Class, index: number} | null {
    for (const [k, c] of Object.entries(this.classes)) {
      for (const s of c.getStudents()) {
        if (s === student) return {class: c, index: parseInt(k)}
      }
    }

    return null
  }

  public static from(students: Student[], classes: number): Entry {
    const size = Math.ceil(students.length / classes);
    return new Entry(Array.from({length: classes}, (_v, k) => new Class(students.slice(k * size, k * size + size))))
  }

  /**
   * Faire un changement aléatoire dans la configuration actuelle et retourner une nouvelle disposition.
   */
  public randomChange(): Entry {
    const entry = this.clone()
    const allStudents = entry.classes.map(c => c.getStudents()).flat()
    const moves = Math.floor(Math.random() * MAX_STUDENTS_TO_MOVE) + 1;

    for (let i = 0; i < moves; ++i) {
      // Choisir un élève parmi toutes les classes.
      const student = allStudents[Math.floor(Math.random() * (allStudents.length))]
      const studentClass = entry.searchStudent(student)

      // Choisir une autre classe, différente de celle choisie précédemment.
      const otherClass = entry.classes.filter((_c, i) => i !== studentClass?.index)[Math.floor(Math.random() * (entry.classes.length - 1))]

      // Déplacer l'élève dans l'autre classe.
      studentClass?.class?.removeStudent(student)
      otherClass.addStudent(student)

      if (Math.random() > CHANCE_TO_MOVE_ALONE) {
        // Echanger l'élève avec un autre de l'autre classe.
        const otherStudent = otherClass.getStudents()[Math.floor(Math.random() * otherClass.getStudents().length)]
        studentClass?.class?.addStudent(otherStudent)
        otherClass.removeStudent(otherStudent)
      }
    }

    return entry
  }

  /**
   * Evaluer la qualité de cette configuration.
   */
  public value() {
    if (this.v) return this.v
    this.v = 0

    // Egalité de la taille des classes.
    for (const c1 of this.classes) {
      for (const c2 of this.classes) {
        this.v -= Math.abs(c1.getStudents().length - c2.getStudents().length) * CLASS_SIZE_EQUALITY_MULTIPLIER
      }
    }

    // Spécialités regroupées par classe.
    for (const c of this.classes) {
      for (const s1 of c.getStudents()) {
        for (const s2 of c.getStudents()) {
          if (s1 === s2) continue

          if (s1.options.specialization !== s2.options.specialization)
            this.v -= SPECIALIZATION_MULTIPLIER
        }
      }
    }

    // Langues regroupées par classe.
    for (const c of this.classes) {
      // Trouver le nombre de langues différentes
      const languages: LanguageOption[] = []
      for (const student of c.getStudents()) {
        for (const language of student.options.languages) {
          if (!languages.includes(language)) {
            languages.push(language)
            this.v -= LANGUAGE_MULTIPLIER
          }
        }
      }
    }

    // Amitiés regroupées par classe.
    for (const c of this.classes) {
      for (const s of c.getStudents()) {
        for (const f of s.friends) {
          if (!c.hasStudent(f)) this.v -= FRIEND_MULTIPLIER
        }
      }
    }

    return this.v
  }

  toString() {
    let str = ""
    for (const c of this.classes) {
      str += "- " + c.toString() + "\n"
    }

    return str
  }
}