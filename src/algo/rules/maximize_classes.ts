import {Rule} from "./rule.ts"
import Entry from "../entry.ts"
import {InputRule} from "../input.ts"
import {Student} from "../student.ts"
import Class from "../class.ts"

/**
 * Maximiser le nombre de classes, en respectant les contraintes.
 * Règle inverse de "maximize_class_size", ne peut pas être utilisé en même temps.
 */
class MaximizeClassesRule extends Rule {
	/**
	 * On compte une pénalité par rapport à la différence avec le nombre maximum de classes.
	 */
	override getEntryValue(entry: Entry, _rule: InputRule): number {
		return entry.genetic().input().classAmount() - entry.classes().length
	}

	/**
	 * La valeur correspond au nombre d'élèves dans la classe, il en faut le moins possible.
	 * Les pires classe sont alors celles qui ont plus d'élèves que celle actuelle, ou toutes si on n'a pas atteint le nombre maximum de classes.
	 */
	override getStudentValue(entry: Entry, _rule: InputRule, student: Student): {value: number; worseClasses: Class[]} {
		const studentClass = entry.searchStudent(student)?.class!

		return {
			value: studentClass.getStudents().length,
			worseClasses:
				entry.classes().length < entry.genetic().input().classAmount()
					? entry.classes()
					: entry.classes().filter(c => c.getStudents().length > studentClass.getStudents().length),
		}
	}
}

export const MaximizeClasses = new MaximizeClassesRule()
