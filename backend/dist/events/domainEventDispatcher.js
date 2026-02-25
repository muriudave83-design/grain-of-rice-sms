"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class DomainEventDispatcher {
    static register(handler) {
        this.handlers.push(handler);
    }
    static async dispatch(event) {
        for (const handler of this.handlers) {
            try {
                await handler(event);
            }
            catch {
                // swallow errors — NEVER block domain logic
            }
        }
    }
}
DomainEventDispatcher.handlers = [];
exports.default = DomainEventDispatcher;
