import {Input} from "./input.ts"
import {Attribute} from "./attribute.ts";

export interface RawStudent {
	id: string
	birthdate: Date
	gender: Gender | Gender[]
	relations?: {
		positive?: string[]
		negative?: string[]
		required?: string[]
		forbidden?: string[]
	}
	// Je pars du principe que les niveaux présents indiquent les options choisies
	levels: {[key: string]: number}
	extra?: {[key: string]: boolean}
}

export type Gender = "F" | "M"

export class Student {
	private readonly student: RawStudent
	private readonly input: Input

	// Liste des "caractéristiques" de l'élève, associé à chaque niveau.
	// Contient les options, genres et extras.
	private readonly _levels: {[option: string]: number}
	
	// Liste des attributs correspondants à l'élève.
	private _attributes: Attribute[] | null = null

	constructor(student: RawStudent, input: Input) {
		this.student = student
		this.input = input

		this._levels = this.student.levels
		for (let gender of this.genders()) {
			this._levels = {...this._levels, [gender as string]: input.maxLevel()}
		}
		for (let extra of this.extras()) {
			this._levels = {...this._levels, [extra]: input.maxLevel()}
		}
	}

	public id(): string {
		return this.student.id
	}

	public levels(): {[option: string]: number} {
		return this._levels
	}

	public genders(): Gender[] {
		if (Array.isArray(this.student.gender)) return this.student.gender
		return [this.student.gender]
	}

	public extras(): string[] {
		if (!this.student.extra) return []
		return Object.entries(this.student.extra).filter(([,bool]) => !!bool).map(([key]) => key)
	}

	/**
	 * Obtenir la liste des attributs de règles qui correspondent à l'élève.
	 */
	public attributes(): Attribute[] {
		// On ne définit qu'une seule fois la liste des attributs.
		if (!this._attributes) {
			this._attributes = []
			for (const attribute of this.input.attributes()) {
				if (attribute.students().includes(this)) this._attributes.push(attribute)
			}
		}

		return this._attributes
	}

	public hasAttribute(attribute: Attribute): boolean {
		return this._attributes?.includes(attribute) ?? false
	}
}
