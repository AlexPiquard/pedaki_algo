import Entry from "../entry.ts"
import Class from "../class.ts"
import {InputRule} from "../input.ts"
import {Student} from "../student.ts"

export abstract class Rule {
	/**
	 * Retourne une valeur pour une certaine configuration, relative à une option et une règle.
	 */
	public abstract getEntryValue(entry: Entry, rule: InputRule): number

	/**
	 * Retourne une valeur relative à un élève et une règle, correspondant à son placement actuel.
	 * Retourne également la liste des classes dans lesquels il ne doit pas être déplacé.
	 */
	public abstract getStudentValue(
		entry: Entry,
		rule: InputRule,
		student: Student
	): {value: number; worseClasses: Class[]}
}
