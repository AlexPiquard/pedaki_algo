import Class from "./class.ts";
import Entry from "./entry.ts";

type Gender = "Male" | "Female"
type LanguageOption = "French" | "English" | "German" | "Greek" | "Spanish"
type SpecializationOption = "Science" | "Social" | "Sport" | "Math" | "Technology"

export interface Student {
  id: string
  friends: string[]
  gender: Gender
  options: {languages: LanguageOption, specialization: SpecializationOption}
}

const LANGUAGE_MULTIPLIER = 1
const SPECIALIZATION_MULTIPLIER = 1
const FRIEND_MULTIPLIER = 1
const GENERATIONS = 1000
const GENERATION_SIZE = 50

export default class Genetic {

  public solve(students: Student[]): Entry {

    let entries = [Entry.from(students)]
    for (let i = 0; i < GENERATIONS; i++) {
      // On fait un changement aléatoire dans chaque configuration.
      for (let entry of entries) {
        entries.push(entry.randomChange());
      }

      // On ne garde que les meilleurs.
      entries = entries.sort((a, b) => a.value() - b.value()).splice(0, GENERATION_SIZE);
    }

    return entries[0];
  }

}