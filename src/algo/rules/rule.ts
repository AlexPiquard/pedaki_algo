import Entry, {StudentWithClass} from "../entry.ts"
import Class from "../class.ts"
import {Input, RawRule} from "../input.ts"
import {DEFAULT_PRIORITY} from "../algo.ts"
import {Attribute} from "../attribute.ts"

export type StudentValue = {value: number; worseClasses: Class[]}

export enum RuleType {
	ATTRIBUTES,
	RELATIONSHIPS,
	CONSTRAINTS,
}

export abstract class Rule {
	private readonly rule: RawRule
	private readonly _attributes: Attribute[]
	private readonly _initialIndex: number

	protected abstract _ruleType: RuleType

	protected constructor(rule: RawRule, input: Input) {
		this.rule = rule
		this._attributes = rule.attributes?.map(a => new Attribute(a, input)) ?? []
		this._initialIndex = input.raw().rules.indexOf(rule)
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
	 * Obtenir l'indice initial de cette règle dans la liste donnée.
	 */
	public initialIndex(): number {
		return this._initialIndex
	}

	/**
	 * Obtenir le type de la règle.
	 */
	public ruleType() {
		return this._ruleType
	}

	/**
	 * Retourne une valeur pour une certaine configuration, relative à cette règle.
	 * Par défaut, on retourne la somme des valeurs de chaque élève.
	 */
	public getEntryValue(entry: Entry): number {
		return entry
			.getStudents()
			.map(student => entry.studentValue(student, this).value)
			.reduce((acc, cur) => acc + cur)
	}

	/**
	 * Retourne une valeur relative à un élève et cette règle, correspondant à son placement actuel.
	 * Retourne également la liste des classes dans lesquels il ne doit pas être déplacé.
	 */
	public abstract getStudentValue(entry: Entry, student: StudentWithClass): StudentValue

	/**
	 * Obtenir le pourcentage de respect de cette règle pour une certaine configuration.
	 * Correspond au nombre d'élèves bien placés par rapport au nombre total.
	 */
	public getRespectPercent(entry: Entry): number {
		const percent =
			entry.getStudents().filter(student => entry.studentValue(student, this).value <= 0).length /
			entry.algo().input().students().length
		return Math.round(percent * 100) / 100
	}

	/**
	 * Obtenir la différence d'une valeur par rapport à un objectif.
	 * Prend en compte un objectif décimal (autorise les deux entiers).
	 */
	public getDifference = (value: number, goal: number) => {
		// Si l'objectif est un nombre entier, on le compare directement
		if (goal % 1 === 0) return value - goal
		// Si l'objectif est décimal, on autorise les deux nombres entiers.
		else if (value > Math.ceil(goal)) return value - Math.ceil(goal)
		else if (value < Math.floor(goal)) return value - Math.floor(goal)

		return 0
	}
}
