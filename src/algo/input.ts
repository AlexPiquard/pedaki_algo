export type LevelRuleType = "balance_level" | "divide" | "group_together"
export type CountRule = "minimize" | "maximize"

export interface Input {
    counts: {
        min_classes?: number
        max_classes: number
        min_students?: number
        max_students: number
        rule: CountRule
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
            rules: {[rule in LevelRuleType]: number}
            relations: {
                forbidden?: {
                    priority?: number
                    list?: string[]
                }
            }
        }
    }
}