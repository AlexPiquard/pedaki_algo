import Entry from "./entry.ts"
import {Input, RawInput} from "./input.ts"
import {GatherOption} from "./rules/gather_option.ts"
import {BalanceOptionsCount} from "./rules/balance_option_count.ts"
import {Rule} from "./rules/rule.ts"
import {BalanceOptionsClassLevel} from "./rules/balance_option_class_level.ts"
import {RawStudent, Student} from "./student.ts"

export const MAX_STUDENTS_TO_MOVE = 50
export const MIN_LEVEL = 0
export const MAX_LEVEL = 5
export const DEFAULT_PRIORITY = 1
const GENERATED_CHILDREN_PER_GENERATION = 10
const GENERATION_SIZE = 10

export const RuleOrder: {[ruleKey: string]: {rule: Rule; priority: number}} = {
	gather_option: {rule: GatherOption, priority: 2},
	balance_option_count: {rule: BalanceOptionsCount, priority: 1},
	balance_option_class_level: {rule: BalanceOptionsClassLevel, priority: 1},
}

export type Result = {entry: Entry; duration: number}

export default class Genetic {
	private readonly _students: Student[]
	private readonly _input: Input

	constructor(students: RawStudent[], rawInput: RawInput) {
		this._students = students.map(student => new Student(student))
		this._input = new Input(rawInput, this._students)
	}

	public students() {
		return this._students
	}

	public input() {
		return this._input
	}

	public solve(): Result {
		const startTime = Date.now()

		const entries = [Entry.default(this)]
		let bestValue = entries[0].getValue()

		while (bestValue > 0) {
			// On fait un changement aléatoire dans chaque configuration.
			for (let i = 0; i < GENERATED_CHILDREN_PER_GENERATION; ++i) {
				entries.push(entries[i % entries.length].randomChange())
			}

			// On ne garde que les meilleurs.
			entries
				.sort((a, b) => a.getValue() - b.getValue())
				.splice(GENERATION_SIZE, GENERATED_CHILDREN_PER_GENERATION)

			bestValue = entries[0].getValue()
		}

		return {entry: entries[0], duration: (Date.now() - startTime) / 1000}
	}
}
