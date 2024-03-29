import {Rule, RuleType, StudentValue} from "./rule.ts"
import Entry, {StudentWithClass} from "../entry.ts"
import {Input, RawRule} from "../input.ts"

/**
 * Maximiser le nombre de classes, en respectant les contraintes.
 * Règle inverse de "maximize_class_size", ne peut pas être utilisé en même temps.
 */
export class MaximizeClassesRule extends Rule {
	protected _ruleType = RuleType.CONSTRAINTS

	constructor(rawRule: RawRule, input: Input) {
		super(rawRule, input)
	}

	/**
	 * On compte une pénalité par rapport à la différence avec le nombre maximum de classes.
	 */
	override getEntryValue(entry: Entry): number {
		return entry.algo().input().classAmount() - entry.classes().length
	}

	/**
	 * @inheritDoc
	 * La valeur correspond au nombre d'élèves dans la classe, il en faut le moins possible.
	 * Les pires classe sont alors celles qui ont plus d'élèves que celle actuelle, ou toutes si on n'a pas atteint le nombre maximum de classes.
	 */
	override getStudentValue(entry: Entry, student: StudentWithClass): StudentValue {
		return {
			value: student.studentClass.class.getStudents().length,
			worseClasses:
				entry.classes().length < entry.algo().input().classAmount()
					? entry.classes()
					: entry
							.classes()
							.filter(c => c.getStudents().length > student.studentClass.class.getStudents().length),
		}
	}
}
