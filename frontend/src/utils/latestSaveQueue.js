export function enqueueLatestSave(queues, key, job, worker) {
  const queue = queues[key] ?? { running: false, pending: null, promise: null };
  queues[key] = queue;
  queue.pending = job;
  if (queue.running) return queue.promise;

  queue.running = true;
  queue.promise = (async () => {
    while (queue.pending) {
      const next = queue.pending;
      queue.pending = null;
      if (!await worker(next)) {
        queue.pending = null;
        break;
      }
    }
  })().finally(() => {
    queue.running = false;
    if (queues[key] === queue) delete queues[key];
  });
  return queue.promise;
}
