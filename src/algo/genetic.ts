import Entry from "./entry.ts"
import {Input, LevelRuleType} from "./input.ts"
import {Student} from "./student.ts"
import {GroupTogether} from "./rules/group_together.ts"
import {BalanceCount} from "./rules/balance_count.ts"
import {Rule} from "./rules/Rule.ts"
import {BalanceLevel} from "./rules/balance_level.ts"

export const MAX_STUDENTS_TO_MOVE = 50
export const CLASS_WRONG_SIZE_MULTIPLIER = 100
export const CLASS_WRONG_AMOUNT_MULTIPLIER = 1000
export const MIN_LEVEL = 0
export const MAX_LEVEL = 5
// const GENERATIONS = 1000
const GENERATED_CHILDREN_PER_GENERATION = 50
const GENERATION_SIZE = 50

export const RuleOrder: {[ruleKey: string]: {rule: Rule; priority: number}} = {
	group_together: {rule: GroupTogether, priority: 2},
	balance_count: {rule: BalanceCount, priority: 1},
	balance_level: {rule: BalanceLevel, priority: 1},
}

export type Result = {entry: Entry; duration: number}

export default class Genetic {
	// Liste complète des options existantes.
	private levels: string[] = []
	// Nombre d'élèves qui ont chaque option.
	private levelsCount: {[levelKey: string]: number} = {}
	// Liste des options qui utilisent chaque règle.
	private ruleLevels: {[ruleKey: string]: string[]} = {}

	public get getLevels() {
		return this.levels
	}

	public getLevelCount(levelKey: string): number {
		return levelKey in this.levelsCount ? this.levelsCount[levelKey] : 0
	}

	public getLevelsOfRule(ruleKey: LevelRuleType): string[] {
		return this.ruleLevels[ruleKey] ?? []
	}

	private calculate(input: Input, students: Student[]) {
		for (const s of students) {
			for (const levelKey of Object.keys(s.levels)) {
				if (!this.levels.includes(levelKey)) {
					this.levels.push(levelKey)
					this.levelsCount[levelKey] = 1
					continue
				}

				this.levelsCount[levelKey]++
			}
		}

		for (const [levelKey, levelInput] of Object.entries(input.levels)) {
			for (const [ruleKey] of Object.entries(levelInput.rules)) {
				if (!(ruleKey in this.ruleLevels)) this.ruleLevels[ruleKey] = []
				this.ruleLevels[ruleKey].push(levelKey)
			}
		}
	}

	public solve(students: Student[], input: Input): Result {
		const startTime = Date.now()

		this.calculate(input, students)

		const entries = [Entry.from(this, students, input.counts.max_students)]
		let bestValue = entries[0].getValue(input)

		while (bestValue > 0) {
			// On fait un changement aléatoire dans chaque configuration.
			for (let i = 0; i < GENERATED_CHILDREN_PER_GENERATION; ++i) {
				entries.push(entries[i % entries.length].randomChange(input))
			}

			// On ne garde que les meilleurs.
			entries
				.sort((a, b) => a.getValue(input) - b.getValue(input))
				.splice(GENERATION_SIZE, GENERATED_CHILDREN_PER_GENERATION)

			bestValue = entries[0].getValue(input)
		}

		return {entry: entries[0], duration: (Date.now() - startTime) / 1000}
	}
}
