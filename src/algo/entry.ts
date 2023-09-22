import Class from "./class.ts";
import {
  CHANCE_TO_MOVE_ALONE,
  CLASS_WRONG_AMOUNT_MULTIPLIER,
  CLASS_WRONG_SIZE_MULTIPLIER, MAX_LEVEL,
  MAX_STUDENTS_TO_MOVE, MIN_LEVEL,
} from "./genetic.ts";
import {Student} from "./student.ts";
import {Input} from "./input.ts";
import {groupTogetherValue} from "./rules/group_together.ts";

export default class Entry {
  public classes: Class[]
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

  public static from(students: Student[], size: number): Entry {
    const classes = Math.ceil(students.length / size)
    return new Entry(Array.from({length: classes}, (_v, k) => new Class(students.slice(k * size, k * size + size))))
  }

  /**
   * Faire un changement aléatoire dans la configuration actuelle et retourner une nouvelle disposition.
   */
  public randomChange(maxClasses: number, maxStudents: number): Entry {
    const entry = this.clone()
    const allStudents = entry.classes.map(c => c.getStudents()).flat()
    const moves = Math.floor(Math.random() * MAX_STUDENTS_TO_MOVE) + 1;

    for (let i = 0; i < moves; ++i) {
      this.randomChangeMove(entry, allStudents, maxClasses, maxStudents)
    }

    return entry
  }

  private randomChangeMove(entry: Entry, allStudents: Student[], maxClasses: number, maxStudents: number): Entry {
    // Choisir un élève parmi toutes les classes.
    const student = allStudents[Math.floor(Math.random() * (allStudents.length))]
    const studentClass = entry.searchStudent(student) as {class: Class, index: number}

    // Choisir une autre classe, différente de celle choisie précédemment.
    let otherClass = entry.classes.filter((_c, i) => i !== studentClass?.index)[Math.floor(Math.random() * (entry.classes.length - (maxClasses === entry.classes.length ? 1 : 0)))]
    if (!otherClass) {
      otherClass = new Class([])
      entry.classes.push(otherClass)
    }

    // Si on ne peut pas ajouter d'élève dans la classe choisie, on recommence.
    if (otherClass.getStudents().length >= maxStudents)
      return this.randomChangeMove(entry, allStudents, maxClasses, maxStudents)

    // Déplacer l'élève dans l'autre classe.
    studentClass?.class?.removeStudent(student);
    otherClass.addStudent(student)

    if (otherClass.getStudents().length && Math.random() > CHANCE_TO_MOVE_ALONE) {
      // Echanger l'élève avec un autre de l'autre classe.
      const otherStudent = otherClass.getStudents()[Math.floor(Math.random() * otherClass.getStudents().length)]
      studentClass?.class?.addStudent(otherStudent)
      otherClass.removeStudent(otherStudent)
    } else if (studentClass?.class.getStudents().length === 0) {
      // Supprimer la classe s'il n'y a plus d'élèves dedans.
      entry.classes.splice(studentClass?.index, 1)
    }

    return entry
  }

  /**
   * Evaluer la qualité de cette configuration par rapport aux paramètres d'entrée de l'algorithme.
   */
  public value(input: Input) {
    if (this.v) return this.v
    this.v = 0

    // Respect du nombre de classes.
    if (this.classes.length < (input.counts.min_classes ?? 1) || this.classes.length > input.counts.max_classes)
      this.v += CLASS_WRONG_AMOUNT_MULTIPLIER // TODO rule minimize maximize

    const classesOfLevels: {[level: string]: number[]} = {}

    for (const [i, c] of Object.entries(this.classes)) {
      const classkey = Number.parseInt(i)

      // Respect de la taille des classes.
      if (c.getStudents().length < (input.counts.min_students ?? 1) || (input.counts.max_students && c.getStudents().length > input.counts.max_students))
        this.v += CLASS_WRONG_SIZE_MULTIPLIER

      let m = 0, f = 0
      const levelsCount: {[level: string]: number} = {}
      const levelsSum: {[level: string]: number} = {}

      for (const s of c.getStudents()) {
        if (s.gender === "M") m++
        else if (s.gender === "F") f++

        for (const levelKey of Object.keys(s.levels)) {
          levelsCount[levelKey] = levelsCount[levelKey] ? levelsCount[levelKey] + 1 : 1
          levelsSum[levelKey] = levelsSum[levelKey] ? levelsSum[levelKey] + s.levels[levelKey] : s.levels[levelKey]
          if (!classesOfLevels[levelKey]?.includes?.(classkey) && input.levels[levelKey] && "group_together" in input.levels[levelKey]?.rules) {
            if (!classesOfLevels[levelKey]) classesOfLevels[levelKey] = [classkey]
            else classesOfLevels[levelKey].push(classkey)
          }
        }

        // Respect des relations entre élèves.
        for (const f of (s.relations?.positive ?? [])) {
          if (!c.hasStudent(f)) this.v += (input.relations?.positive_priority ?? 1)
        }
        for (const f of (s.relations?.negative ?? [])) {
          if (c.hasStudent(f)) this.v += (input.relations?.negative_priority ?? 1)
        }
        for (const f of (s.relations?.required ?? [])) {
          if (!c.hasStudent(f)) this.v += (input.relations?.required_priority ?? 1)
        }
        for (const f of (s.relations?.forbidden ?? [])) {
          if (c.hasStudent(f)) this.v += (input.relations?.forbidden_priority ?? 1)
        }
      }

      // Respect de la parité.
      if (input.gender?.parity.M && input.gender.parity.F) {
        this.v += Math.abs(m - (c.getStudents().length * (input.gender?.parity.M / 100))) * (input.gender?.priority ?? 1)
        this.v += Math.abs(f - (c.getStudents().length * (input.gender?.parity.F / 100))) * (input.gender?.priority ?? 1)
      }

      // Respect des niveaux.
      for (const [levelKey, levelInput] of Object.entries(input.levels)) {
        if (!(levelKey in levelsCount)) continue

        // Respect des relations entre niveaux.
        for (const key of levelInput?.relations?.forbidden?.list ?? []) {
          if (key in levelsCount) this.v += (levelInput.priority ?? 1) * (levelInput.relations.forbidden?.priority ?? 1)
        }

        // Respect de l'équilibrage des niveaux pour ceux concernés.
        if ("balance_level" in levelInput.rules)
          this.v += (Math.abs(((MIN_LEVEL + MAX_LEVEL) / 2) - (levelsSum[levelKey] / c.getStudents().length))) * (levelInput.priority ?? 1) * (levelInput.rules["balance_level"] ?? 1)
      }
    }

    // TODO rule divide : le meme nombre dans chaque classe
    //   -> si en même temps que la règle group_together, ça rassemble sur le minimum de classe mais égalise entre elles

    // Respect du regroupement des options, pour celles concernées.
    for (const [levelKey] of Object.entries(classesOfLevels)) {
      this.v += groupTogetherValue(this, input, levelKey)
    }

    return this.v
  }

  toString(...keysMask: string[]) {
    let str = ""
    for (const c of this.classes) {
      str += "- " + c.toString(...keysMask) + "\n"
    }

    return str
  }
}