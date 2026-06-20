// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────

export class Queue {
  private items: any[] = [];

  enqueue(item: any): void {
    this.items.push(item);
  }

  dequeue(): any {
    if (this.isEmpty()) {
      throw new Error("queue empty");
    }
    return this.items.shift();
  }

  front(): any {
    if (this.isEmpty()) return undefined;
    return this.items[0];
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }

  size(): number {
    return this.items.length;
  }

  clear(): void {
    this.items = [];
  }
}
