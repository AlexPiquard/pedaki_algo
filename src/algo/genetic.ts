import Entry from "./entry.ts"
import {Input} from "./input.ts"
import {Student} from "./student.ts"
import students from "../../data/pedaki-user-json-500.json" assert {type: "json"}
import input from "../../data/input.json" assert {type: "json"}

export const MAX_STUDENTS_TO_MOVE = 50
export const CLASS_WRONG_SIZE_MULTIPLIER = 100
export const CLASS_WRONG_AMOUNT_MULTIPLIER = 1000
export const MIN_LEVEL = 0
export const MAX_LEVEL = 5
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
		// for (let i = 0; i < GENERATIONS; i++) {
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
		console.log("duration: ", ((Date.now() - startTime) / 1000).toString() + "s")
		return entries[0]
	}
}

const algo = new Genetic()
const entry = algo.solve(students as unknown as Student[], input as unknown as Input)
console.log(entry.toString("allemand"))
