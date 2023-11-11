import Entry from "../entry.ts"
import Class from "../class.ts"
import {RawRule} from "../input.ts"
import {Student} from "../student.ts"
import {DEFAULT_PRIORITY} from "../algo.ts"

// Attributs requis pour chaque règle.
const RuleRequirements: {[rule: string]: string[]} = {
	maximize_class_size: [],
	maximize_classes: [],
	balance_count: [],
	gather_option: ["options"],
	conflicting_options: ["options"],
	balance_options_class_count: ["options"],
	balance_option_class_level: ["options"],
	positive_relationships: ["students"],
	negative_relationships: ["students"],
}

export abstract class Rule {
	private readonly rule: RawRule

	protected constructor(rule: RawRule) {
		this.rule = rule

		for (const requirement of RuleRequirements[rule.rule]) {
			if (!(requirement in rule))
				throw new Error(`No required '${requirement}' attribute in rule '${this.rule.rule}'`)
		}
	}

	/**
	 * Obtenir la priorité définie pour cette règle.
	 */
	public priority() {
		return this.rule.priority ?? DEFAULT_PRIORITY
	}

	/**
	 * Obtenir la clé identifiant la règle.
	 */
	public key() {
		return this.rule.rule
	}

	public options(): string[] {
		if (Array.isArray(this.rule.options)) return this.rule.options
		return [this.rule.options] as string[]
	}

	public option(): string {
		if (Array.isArray(this.rule.options)) return this.rule.options[0]
		return this.rule.options as string
	}

	public students(): string[] {
		if (Array.isArray(this.rule.students)) return this.rule.students
		return [this.rule.students] as string[]
	}

	public student(): string {
		if (Array.isArray(this.rule.students)) return this.rule.students[0]
		return this.rule.students as string
	}

	/**
	 * Retourne une valeur pour une certaine configuration, relative à cette règle.
	 */
	public abstract getEntryValue(entry: Entry): number

	/**
	 * Retourne une valeur relative à un élève et cette règle, correspondant à son placement actuel.
	 * Retourne également la liste des classes dans lesquels il ne doit pas être déplacé.
	 */
	public abstract getStudentValue(entry: Entry, student: Student): {value: number; worseClasses: Class[]}
}
