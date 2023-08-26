import Entry from "./entry.ts";
import students from "../../data/data.json" assert {type: "json"}

export enum Gender {Male, Female}
export enum LanguageOption {French, English, German, Greek, Spanish}
export enum SpecializationOption {Science, Social, Sport, Math, Technology}

export interface Student {
  id: string
  friends: string[]
  gender: Gender
  options: {languages: LanguageOption[], specialization: SpecializationOption[]}
}

export const CHANCE_TO_MOVE_ALONE = 0.33;
export const MAX_STUDENTS_TO_MOVE = 5
export const LANGUAGE_MULTIPLIER = 1
export const SPECIALIZATION_MULTIPLIER = 0
export const FRIEND_MULTIPLIER = 0
export const CLASS_SIZE_EQUALITY_MULTIPLIER = 0
const GENERATIONS = 10000
const GENERATED_CHILDREN_PER_GENERATION = 1000;
const GENERATION_SIZE = 100

export default class Genetic {

  public solve(students: Student[], classes: number): Entry {
    const startTime = Date.now()

    let entries = [Entry.from(students, classes)]
    for (let i = 0; i < GENERATIONS; i++) {
      // On fait un changement aléatoire dans chaque configuration.
      for (let i = 0; i < GENERATED_CHILDREN_PER_GENERATION; ++i) {
        entries.push(entries[i % entries.length].randomChange())
      }

      // On ne garde que les meilleurs.
      entries = entries.sort((a, b) => b.value() - a.value()).slice(0, GENERATION_SIZE)

      console.log(entries[0].value())
    }

    console.log("duration: ", ((Date.now() - startTime) / 1000).toString() + "s")
    return entries[0]
  }
}

const algo = new Genetic()
const entry = algo.solve(students as unknown as Student[], 3)
console.log(entry.toString())
