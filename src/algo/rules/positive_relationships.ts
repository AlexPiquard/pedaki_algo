import {Rule} from "./rule.ts"
import Entry from "../entry.ts"
import {Student} from "../student.ts"
import Class from "../class.ts"
import {Input, RawRule} from "../input.ts"

/**
 * Respecter les relations positives entre élèves qui veulent être dans la même classe.
 * Respecte une certaine hiérarchie, par exemple lien familial ou simple ami.
 */
export class PositiveRelationshipsRule extends Rule {
	public constructor(rule: RawRule, input: Input) {
		super(rule, input)
	}

	/**
	 * Somme des valeurs de chaque élève.
	 */
	override getEntryValue(entry: Entry): number {
		return entry
			.algo()
			.input()
			.students()
			.map(s => this.getStudentValue(entry, s).value)
			.reduce((acc, cur) => acc + cur)
	}

	/**
	 * La valeur correspond au nombre de relations positives non respectées.
	 * Les pires classes sont alors celles ne respectant pas non plus les relations.
	 */
	override getStudentValue(entry: Entry, student: Student): {value: number; worseClasses: Class[]} {
		let value = 0
		const worseClasses = [...entry.classes()]
		const studentClassIndex = entry.searchStudent(student)?.index!
		for (const [relationValue, otherStudents] of Object.entries(student.relationships())) {
			// On ne prend en compte que les relations positives.
			if (parseInt(relationValue) <= 0) continue

			for (const otherStudent of otherStudents) {
				const otherStudentClassIndex = entry.searchStudent(otherStudent)?.index!
				// S'ils ne sont pas dans la même classe alors qu'il s'agit d'une relation positive...
				if (studentClassIndex != otherStudentClassIndex) {
					value++
					// Il doit aller dans cette classe, donc on la retire de celles exclues, si ce n'est pas déjà fait.
					const currentIndex = worseClasses.indexOf(entry.class(otherStudentClassIndex)!)
					if (currentIndex >= 0) worseClasses.splice(currentIndex, 1)
				}
			}
		}

		return {value, worseClasses}
	}
}
