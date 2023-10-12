export type LevelRuleType =
	// Équilibrer le niveau d'une certaine option dans chaque classe qui possède l'option.
	"balance_level"
	// Répartir équitablement le nombre d'élèves ayant une option dans chaque classe possédant cette option.
	| "balance_count"
	// Regrouper une certaine option dans un minimum de classes.
	| "group_together"

export type CountRule =
	// Minimiser le nombre de classes.
	"minimize"
	// Maximiser le nombre de classes.
	| "maximize"

export interface Input {
	counts: {
		min_classes?: number
		max_classes: number
		min_students?: number
		max_students: number
		rule: CountRule
	}
	relations?: {
		positive_priority?: number
		negative_priority?: number
		required_priority?: number
		forbidden_priority?: number
	}
	gender?: {
		priority?: number
		parity: {
			M?: number
			F?: number
		}
	}
	levels: {
		[key: string]: {
			priority?: number
			rules: {[rule in LevelRuleType]: number}
			relations: {
				forbidden?: {
					priority?: number
					list?: string[]
				}
			}
		}
	}
}
