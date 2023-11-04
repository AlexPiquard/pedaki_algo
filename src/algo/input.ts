import {DEFAULT_PRIORITY} from "./genetic.ts"
import {Student} from "./student.ts"

export type LevelRuleType =
	// Regrouper une certaine option dans un minimum de classes.
	| "gather_option"
	// Interdire plusieurs options d'être dans une classe commune.
	| "conflicting_options"
	// Équilibrer le dénombrement de plusieurs options dans un maximum de classes.
	| "balance_options_class_count"
	// Équilibrer le niveau d'une certaine option dans chaque classe qui possède l'option.
	// C'est une règle complémentaire qui ne peut pas exister sans "gather_option".
	| "balance_option_class_level"
	// Répartir équitablement le nombre d'élèves ayant une option dans chaque classe possédant cette option.
	// C'est une règle complémentaire qui ne peut pas exister sans "gather_option".
	| "balance_option_count"
	// Maximiser le nombre d'élèves dans chaque classe, en respectant les contraintes.
	// Règle inverse de "maximize_classes", ne peut pas être utilisé en même temps.
	| "maximize_class_size"
	// Maximiser le nombre de classes, en respectant les contraintes.
	// Règle inverse de "maximize_class_size", ne peut pas être utilisé en même temps.
	| "maximize_classes"
	// Respecter les relations positives entre élèves qui veulent être dans la même classe.
	// Respecte une certaine hiérarchie, par exemple lien familial ou simple ami.
	| "positive_relationships"
	// Respecter les relations négatives entre élèves qui ne veulent pas être dans la même classe.
	| "negative_relationships"

// Attributs requis pour chaque règle.
const RuleRequirements: {[rule: string]: string[]} = {
	gather_option: ["options"],
	conflicting_options: ["options"],
	balance_options_class_count: ["options"],
	balance_option_class_level: ["options"],
	balance_option_count: ["options"],
	maximize_class_size: [],
	maximise_classes: [],
	positive_relationships: ["students"],
	negative_relationships: ["students"],
}

export interface RawInput {
	constraints: {
		class_size_limit: number
		class_amount_limit: number
	}
	rules: RawRule[]
}

export interface RawRule {
	rule: LevelRuleType
	priority?: number
	// Éventuelles options relatives à la règle.
	options?: string[] | string
	// Éventuels élèves relatifs à la règle.
	students?: string[] | string
}

export class InputRule {
	private readonly rule: RawRule

	constructor(rule: RawRule) {
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
}

export class Input {
	private readonly input: RawInput

	// Liste complète des instances de règles.
	private _rules: InputRule[] = []
	// Liste complète des options existantes.
	private _options: string[] = []
	// Liste des règles, regroupées par clé.
	private _rulesByKey: {[ruleKey: string]: InputRule[]} = {}
	// Nombre d'élèves qui ont chaque option.
	private _optionCount: {[option: string]: number} = {}

	constructor(input: RawInput, students: Student[]) {
		this.input = input
		this.calculate(students)
	}

	/**
	 * Obtenir la liste complète des options existantes.
	 */
	public options() {
		return this._options
	}

	/**
	 * Obtenir la liste des règles.
	 */
	public rules() {
		return this._rules
	}

	public rulesOfKey(key: string) {
		return this._rulesByKey[key] ?? []
	}

	/**
	 * Obtenir le nombre d'élèves qui ont une certaine option.
	 */
	public optionCount(optionKey: string): number {
		return optionKey in this._optionCount ? this._optionCount[optionKey] : 0
	}

	/**
	 * Calculer les statistiques relatives aux données initiales, une seule fois.
	 */
	private calculate(students: Student[]) {
		for (const s of students) {
			for (const option of Object.keys(s.levels())) {
				if (!this._options.includes(option)) {
					this._options.push(option)
					this._optionCount[option] = 1
					continue
				}

				this._optionCount[option]++
			}
		}

		for (const rule of Object.values(this.input.rules)) {
			let inputRule
			this._rules.push((inputRule = new InputRule(rule)))

			if (!(rule.rule in this._rulesByKey)) this._rulesByKey[rule.rule] = []
			this._rulesByKey[rule.rule].push(inputRule)
		}
	}

	public classSize(): number {
		return this.input.constraints.class_size_limit
	}

	public classAmount(): number {
		return this.input.constraints.class_amount_limit
	}
}
