import Entry from "../entry.ts";
import Genetic from "../genetic.ts";

/**
 * Associer une valeur relative à la règle d'équilibrage des options sur les classes qui ont l'option, en fonction d'une certaine disposition.
 * Définit le nombre d'élèves ayant l'option idéal par classe qui possède l'option, puis incrémente la valeur pour chaque dénombrement différent.
 * On autorise une marge d'imprécision à définir.
 */
export const balanceCountValue = (entry: Entry, genetic: Genetic, level: string) => {
  const countGoal = balanceCountGetCountPerClass(entry, genetic, level)
  console.log("goal",countGoal)
  let value = 0
  for (const classKey of Object.keys(entry.classes)) {
    const count = entry.getLevelCountByClass(level)[classKey]

    // Si personne n'a l'option dans cette classe, on l'ignore.
    if (!count) continue

    // On incrémente la différence entre le nombre d'élèves et l'objectif.
    value += Math.abs(balanceCountGetDifference(count, countGoal))
  }
  return value
}

/**
 * Obtenir le nombre idéal d'élèves ayant l'option par classe.
 */
export const balanceCountGetCountPerClass = (entry: Entry, genetic: Genetic, level: string) => {
  // console.log(genetic.getLevelCount(level), Object.keys(entry.getLevelCountByClass(level)).length, genetic.getLevelCount(level) / Object.keys(entry.getLevelCountByClass(level)).length)
  // console.log(Object.keys(entry.getLevelCountByClass(level)))
  return genetic.getLevelCount(level) / Object.keys(entry.getLevelCountByClass(level)).length
}

/**
 * Obtenir la différence d'un nombre d'élèves par rapport à un objectif.
 * Prend en compte un objectif décimal (autorise les deux entiers).
 */
export const balanceCountGetDifference = (value: number, goal: number) => {
  // Si l'objectif est un nombre entier, on le compare directement
  if (goal % 1 === 0) return value - goal

  // Si l'objectif est décimal, on autorise les deux nombres entiers.
  else if (value > Math.ceil(goal)) return value - Math.ceil(goal)
  else if (value < Math.floor(goal)) return value - Math.floor(goal)

  return 0
}