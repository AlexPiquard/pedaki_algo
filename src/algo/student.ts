export interface RawStudent {
	id: string
	birthdate: Date
	gender: string
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

export class Student {
	private student: RawStudent

	// Liste des options de l'élève, qui contient également son genre, associé à chaque niveau.
	private readonly _levels: {[option: string]: number}

	constructor(student: RawStudent) {
		this.student = student

		this._levels = {...this.student.levels, [this.student.gender]: 5}
	}

	public id(): string {
		return this.student.id
	}

	public levels(): {[option: string]: number} {
		return this._levels
	}
}
