export interface Student {
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