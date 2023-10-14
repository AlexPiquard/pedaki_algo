import Entry from "../entry.ts"
import {Input} from "../input.ts"
import Class from "../class.ts"
import {Student} from "../student.ts"

export abstract class Rule {
	/**
	 * Retourne une valeur pour une certaine configuration, relative à une option et une règle.
	 */
	public abstract getEntryValue(entry: Entry, input: Input, levelKey: string): number

	/**
	 * Retourne une valeur relative à un élève et une règle, correspondant à son placement actuel.
	 * Retourne également la liste des classes dans lesquels il ne doit pas être déplacé.
	 */
	public abstract getStudentValue(entry: Entry, input: Input, student: Student): [number, Class[]]
}
