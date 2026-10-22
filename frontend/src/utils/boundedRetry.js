export async function withBoundedRetry(worker, shouldRetry, delays = [250, 750, 1500], wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))) {
  let attempt = 0;
  while (true) {
    try {
      return await worker(attempt);
    } catch (error) {
      if (attempt >= delays.length || !shouldRetry(error)) throw error;
      await wait(delays[attempt]);
      attempt += 1;
    }
  }
}

export function isRetryableSaveError(error) {
  const status = error?.response?.status;
  return !error?.response || status === 408 || status === 429 || status === 502 || status === 503 || status === 504;
}
