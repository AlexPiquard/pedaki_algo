import {Rule} from "./rule.ts"
import Entry from "../entry.ts"
import {InputRule} from "../input.ts"
import {Student} from "../student.ts"
import Class from "../class.ts"

/**
 * Maximiser le nombre d'élèves dans chaque classe, en respectant les contraintes.
 * Règle inverse de "maximize_classes", ne peut pas être utilisé en même temps.
 */
class MaximizeClassSizeRule extends Rule {
	/**
	 * On compte une pénalité pour chaque classe qui n'est pas au maximum, relative à la place restante.
	 */
	override getEntryValue(entry: Entry, _rule: InputRule): number {
		// On retourne la somme de la place libre dans chaque classe.
		return entry
			.classes()
			.map(c => entry.genetic().input().classSize() - c.getStudents().length)
			.reduce((acc, cur) => acc + cur, 0)
	}

	/**
	 * La valeur retournée correspond au nombre de places vides dans la classe.
	 * Les pires classe sont alors toutes celles qui ont moins d'élèves que celle actuelle.
	 */
	override getStudentValue(entry: Entry, _rule: InputRule, student: Student): {value: number; worseClasses: Class[]} {
		// Récupération de l'identifiant de la classe actuelle de l'élève.
		const studentClass = entry.searchStudent(student)?.class!

		return {
			value: entry.genetic().input().classSize() - studentClass.getStudents().length,
			worseClasses: entry.classes().filter(c => c.getStudents().length < studentClass.getStudents().length),
		}
	}
}

export const MaximizeClassSize = new MaximizeClassSizeRule()
