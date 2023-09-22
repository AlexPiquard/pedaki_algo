import {Input} from "../input.ts";
import Entry from "../entry.ts";

/**
 * Estimer le nombre de classes nécessaires au regroupement d'une option dans une certaine configuration existante.
 */
export const groupTogetherValue = (entry: Entry, input: Input, level: string) => {
  // Compter le nombre d'élèves qui ont l'option // TODO pas recompter à chaque fois
  let amount = 0;
  const levelsPerClass: { [c: string]: number } = {}
  for (let [i, c] of Object.entries(entry.classes)) {
    for (let s of c.getStudents()) {
      if (level in s.levels) {
        amount++
        levelsPerClass[i] = i in levelsPerClass ? levelsPerClass[i] + 1 : 1
      }
    }
  }

  // Estimer le nombre de classes minimum si on regroupe correctement.
  const classesForLevel = Math.ceil(amount / input.counts.max_students)

  // Exclure les classes ayant le plus l'option.
  const classes = Object.entries(levelsPerClass).sort((a, b) => a[1] - b[1]).slice(0, -classesForLevel)

  let sum = 0
  for (let [i] of classes) {
    sum += levelsPerClass[i] ?? 0
  }

  return sum
}