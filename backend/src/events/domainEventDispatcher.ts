export type DomainEvent<T = any> = {
  name: string;
  payload: T;
  occurredAt: Date;
};

type EventHandler = (event: DomainEvent) => Promise<void>;

class DomainEventDispatcher {
  private static handlers: EventHandler[] = [];

  static register(handler: EventHandler) {
    this.handlers.push(handler);
  }

  static async dispatch(event: DomainEvent) {
    for (const handler of this.handlers) {
      try {
        await handler(event);
      } catch {
        // swallow errors — NEVER block domain logic
      }
    }
  }
}

export default DomainEventDispatcher;
