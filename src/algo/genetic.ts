import Entry from "./entry.ts";
import {Input} from "./input.ts";
import {Student} from "./student.ts";
import students from "../../data/pedaki-user-json-500.json" assert {type: "json"}
import input from "../../data/input.json" assert {type: "json"}

export const CHANCE_TO_MOVE_ALONE = 0.33;
export const MAX_STUDENTS_TO_MOVE = 50
export const CLASS_WRONG_SIZE_MULTIPLIER = 100
export const CLASS_WRONG_AMOUNT_MULTIPLIER = 1000
export const MIN_LEVEL = 0
export const MAX_LEVEL = 5
// const GENERATIONS = 1000
const GENERATED_CHILDREN_PER_GENERATION = 50;
const GENERATION_SIZE = 50

// TODO equilibrer les classes depuis input

export default class Genetic {

  public solve(students: Student[], input: Input): Entry {
    const startTime = Date.now()

    const entries = [Entry.from(students, input.counts.max_students)]
    let bestValue = 9999999999999999999, i = 0
    // for (let i = 0; i < GENERATIONS; i++) {
    while (bestValue > 0) {
      ++i
      // On fait un changement aléatoire dans chaque configuration.
      for (let i = 0; i < GENERATED_CHILDREN_PER_GENERATION; ++i) {
        entries.push(entries[i % entries.length].randomChange(input))
      }

      // On ne garde que les meilleurs.
      entries.sort((a, b) => a.value(input) - b.value(input)).splice(GENERATION_SIZE, GENERATED_CHILDREN_PER_GENERATION)

      bestValue = entries[0].value(input)

      if (i % 50 === 0)
        console.log(entries[0].toString("allemand"), bestValue)
    }

    console.log("duration: ", ((Date.now() - startTime) / 1000).toString() + "s")
    return entries[0]
  }
}

const algo = new Genetic()
const entry = algo.solve(students as unknown as Student[], input as unknown as Input)
console.log(entry.toString("allemand"))

// TODO attribuer une note par eleve en fonction de son placement dans la classe
//   -> dans les changements aléatoires, prendre les x les moins bien placés en priorité
// TODO faire pareil pour les classes les moins bien, pour déterminer où déplacer les élèves (ça risque de trop contraindre)