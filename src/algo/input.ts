import {Student} from "./student.ts"
import {Rule} from "./rules/rule.ts"
import {GatherOptionRule} from "./rules/gather_option.ts"
import {MaximizeClassSizeRule} from "./rules/maximize_class_size.ts"
import {MaximizeClassesRule} from "./rules/maximize_classes.ts"
import {BalanceCountRule} from "./rules/balance_count.ts"
import {BalanceOptionsClassLevelRule} from "./rules/balance_option_class_level.ts"

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

export type LevelRuleType =
	// Maximiser le nombre d'élèves dans chaque classe, en respectant les contraintes.
	// Règle inverse de "maximize_classes", ne peut pas être utilisé en même temps.
	| "maximize_class_size"
	// Maximiser le nombre de classes, en respectant les contraintes.
	// Règle inverse de "maximize_class_size", ne peut pas être utilisé en même temps.
	| "maximize_classes"
	// Répartir équitablement le nombre d'élèves dans chaque classe.
	// Si une option est associée à la règle, alors seulement cette option sera prise en compte.
	// C'est une règle complémentaire qui ne peut pas exister seule.
	| "balance_count"
	// Regrouper une certaine option dans un minimum de classes.
	| "gather_option"
	// Interdire plusieurs options d'être dans une classe commune.
	| "conflicting_options"
	// Équilibrer le dénombrement de plusieurs options dans un maximum de classes.
	| "balance_options_class_count"
	// Équilibrer le niveau d'une certaine option dans chaque classe qui possède l'option.
	// C'est une règle complémentaire qui ne peut pas exister seule.
	| "balance_option_class_level"
	// Respecter les relations positives entre élèves qui veulent être dans la même classe.
	// Respecte une certaine hiérarchie, par exemple lien familial ou simple ami.
	| "positive_relationships"
	// Respecter les relations négatives entre élèves qui ne veulent pas être dans la même classe.
	| "negative_relationships"

const RuleOrder: {[ruleKey: string]: {rule: {new (rawRule: RawRule): Rule}; priority: number}} = {
	gather_option: {rule: GatherOptionRule, priority: 2},
	maximize_class_size: {rule: MaximizeClassSizeRule, priority: 2},
	maximize_classes: {rule: MaximizeClassesRule, priority: 2},
	balance_count: {rule: BalanceCountRule, priority: 1},
	balance_option_class_level: {rule: BalanceOptionsClassLevelRule, priority: 1},
}

export class Input {
	private readonly input: RawInput

	// Liste complète des instances de règles, dans l'ordre défini par les priorités de l'utilisateur et les nôtres.
	private _rules: Rule[] = []
	// Liste complète des options existantes.
	private _options: string[] = []
	// Liste des règles, regroupées par clé.
	private _rulesByKey: {[ruleKey: string]: Rule[]} = {}
	// Nombre d'élèves qui ont chaque option.
	private _optionCount: {[option: string]: number} = {}
	// Niveau minimal des d'options.
	private _minLevel: number = Number.MAX_VALUE
	// Niveau maximal des options.
	private _maxLevel: number = Number.MIN_VALUE

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
			for (const [option, level] of Object.entries(s.levels())) {
				if (level > this._maxLevel) this._maxLevel = level
				if (level < this._minLevel) this._minLevel = level

				if (!this._options.includes(option)) {
					this._options.push(option)
					this._optionCount[option] = 1
					continue
				}

				this._optionCount[option]++
			}
		}

		for (const rawRule of Object.values(this.input.rules)) {
			let rule
			this._rules.push((rule = new RuleOrder[rawRule.rule].rule(rawRule)))

			if (!(rawRule.rule in this._rulesByKey)) this._rulesByKey[rawRule.rule] = []
			this._rulesByKey[rawRule.rule].push(rule)
		}

		this._rules.sort((r1, r2) => {
			// On vérifie d'abord si notre priorité peut les départager.
			if (RuleOrder[r1.key()].priority != RuleOrder[r2.key()].priority)
				return RuleOrder[r2.key()].priority - RuleOrder[r1.key()].priority
			// Si notre priorité est la même pour les deux, on les départage avec la priorité de l'utilisateur.
			return r2.priority() - r1.priority()
		})
	}

	public classSize(): number {
		return this.input.constraints.class_size_limit
	}

	public classAmount(): number {
		return this.input.constraints.class_amount_limit
	}

	public minLevel(): number {
		return this._minLevel
	}

	public maxLevel(): number {
		return this._maxLevel
	}
}
