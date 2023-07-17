import Class from "./class.ts";
import {Student} from "./genetic.ts";

export default class Entry {
  private classes: Class[];

  constructor(classes: Class[]) {
    this.classes = classes
  }

  public static from(students: Student[]): Entry {
    return new Entry([new Class(students)])
  }

  /**
   * Faire un changement aléatoire dans la configuration actuelle.
   */
  public randomChange(students: Student[]): Entry {
    // Choisir un élève parmis toutes les classes.
    const student = students[Math.random() * students.length]

    // Le déplacer ou l'échanger de classe avec quelqu'un d'autre.
    return this;
  }

  /**
   * Evaluer la qualité de cette configuration.
   */
  public value() {
    // Différence des spécialités dans chaque classe.

    // Différence des langues dans chaque classes.

    // Amitiés non respectées dans chaque classe.
    return 0
  }
}