export interface Input {
    counts: {
        min_classes?: number
        max_classes: number
        min_students?: number
        max_students: number
    }
    relations?: {
        positive_priority?: number
        negative_priority?: number
        required_priority?: number
        forbidden_priority?: number
    }
    gender?: {
        priority?: number
        parity: {
            M?: number
            F?: number
        }
    }
    levels: {
        [key: string]: {
            priority?: number
            sort: string
            count?: {
                min?: number,
                max?: number,
                priority?: number
            }
            relations: {
                forbidden?: {
                    priority?: number
                    list?: string[]
                }
            }
        }
    }
}