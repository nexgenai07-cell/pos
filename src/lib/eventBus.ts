/**
 * Same-tab pub/sub plus a BroadcastChannel transport for cross-tab/cross-device
 * delivery on the same origin (e.g. POS on one screen, KDS on another).
 * See docs/architecture-plan.md §08. The on()/emit() interface is deliberately
 * WebSocket-shaped — swapping in a real socket later only changes what's
 * inside emit(), not any subscriber.
 */

export type EventName = "order:updated" | "table:updated" | "inventory:updated" | "product:updated";

export interface EventPayload {
  id: string;
}

type Listener = (payload: EventPayload) => void;

const listeners = new Map<EventName, Set<Listener>>();

const channel: BroadcastChannel | null =
  typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("smoke-and-char-admin") : null;

function dispatchLocal(name: EventName, payload: EventPayload) {
  listeners.get(name)?.forEach((listener) => listener(payload));
}

if (channel) {
  channel.onmessage = (event: MessageEvent<{ name: EventName; payload: EventPayload }>) => {
    dispatchLocal(event.data.name, event.data.payload);
  };
}

export function emit(name: EventName, payload: EventPayload): void {
  dispatchLocal(name, payload);
  channel?.postMessage({ name, payload });
}

export function on(name: EventName, listener: Listener): () => void {
  if (!listeners.has(name)) listeners.set(name, new Set());
  listeners.get(name)!.add(listener);
  return () => listeners.get(name)?.delete(listener);
}
