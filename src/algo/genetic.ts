import Entry from "./entry.ts"
import {Input} from "./input.ts"
import {Student} from "./student.ts"

export const MAX_STUDENTS_TO_MOVE = 50
export const CLASS_WRONG_SIZE_MULTIPLIER = 100
export const CLASS_WRONG_AMOUNT_MULTIPLIER = 1000
export const MIN_LEVEL = 0
export const MAX_LEVEL = 5
export const PRECISION_RANGE = 1
// const GENERATIONS = 1000
const GENERATED_CHILDREN_PER_GENERATION = 50
const GENERATION_SIZE = 50

export default class Genetic {
	// Liste complète des options existantes.
	private levels: string[] = []
	// Nombre d'élèves qui ont chaque option.
	private levelsCount: {[levelKey: string]: number} = {}

	public get getLevels() {
		return this.levels
	}

	public getLevelCount(levelKey: string): number {
		return levelKey in this.levelsCount ? this.levelsCount[levelKey] : 0
	}

	private calculate(students: Student[]) {
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
	}

	public solve(students: Student[], input: Input): Entry {
		const startTime = Date.now()

		this.calculate(students)

		const entries = [Entry.from(this, students, input.counts.max_students)]
		let bestValue = entries[0].getValue(input)

		let j = 0
		console.log(entries[0].toString("allemand"), entries[0].getValue(input))
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

			++j
			if (j % 50 === 0) console.log(entries[0].toString("allemand"), bestValue)
			if (j > 200) break;
		}
		console.log("duration: ", ((Date.now() - startTime) / 1000).toString() + "s")
		return entries[0]
	}
}
