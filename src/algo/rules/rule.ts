import Entry from "../entry.ts"
import Class from "../class.ts"
import {Input, RawRule} from "../input.ts"
import {Student} from "../student.ts"
import {DEFAULT_PRIORITY} from "../algo.ts"
import {Attribute} from "../attribute.ts";

export abstract class Rule {
	private readonly rule: RawRule
	private readonly _attributes: Attribute[]

	protected constructor(rule: RawRule, input: Input) {
		this.rule = rule
		this._attributes = rule.attributes?.map(a => new Attribute(a, input)) ?? []
	}

	/**
	 * Obtenir la liste des attributs associés à la règle.
	 */
	public attributes(): Attribute[] {
		return this._attributes
	}

	/**
	 * Obtenir l'unique attribut associé à la règle.
	 */
	public attribute(): Attribute | undefined {
		if (!this._attributes.length) return undefined
		return this._attributes[0]
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
