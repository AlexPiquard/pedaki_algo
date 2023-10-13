import {Input} from "../input.ts"
import Entry from "../entry.ts"

/**
 * Associer une valeur relative à la règle de regroupement d'une option en fonction d'une certaine disposition.
 * Prend en compte une liste de classes qui doivent contenir l'option, et incrémente la valeur pour chaque élève mal placé.
 */
export const groupTogetherValue = (entry: Entry, input: Input, level: string) => {
	let sum = 0
	for (const [, levelValue] of groupTogetherGetExcludedClasses(entry, input, level)) {
		sum += levelValue ?? 0
	}

	return sum
}

/**
 * Retourne la liste des classes qui ne doivent pas contenir une certaine option.
 * Associe à chaque indice de classe, le nombre d'élèves qui ont l'option (et qui ne devraient donc pas l'avoir).
 */
export const groupTogetherGetExcludedClasses = (entry: Entry, input: Input, level: string) => {
	// Estimer le nombre de classes minimum si on regroupe correctement.
	const classesForLevel = Math.ceil(entry.genetic.getLevelCount(level) / input.counts.max_students)

	// Exclure les classes ayant le plus l'option.
	return Object.entries(entry.getLevelCountByClass(level))
		.sort((a, b) => a[1] - b[1])
		.slice(0, -classesForLevel)
}
