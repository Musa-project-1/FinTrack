// Exercise the offline-store adapter through asynchronous IDB request callbacks.
export const installMockIndexedDB = () => {
  const rows = new Map();
  let nextId = 1;
  const request = (result) => {
    const req = { result };
    queueMicrotask(() => req.onsuccess?.({ target: req }));
    return req;
  };
  const store = {
    add(item) {
      const id = nextId++;
      rows.set(id, structuredClone({ ...item, id }));
      return request(id);
    },
    getAll: () => request(structuredClone([...rows.values()])),
    delete: (id) => request(rows.delete(id))
  };
  globalThis.indexedDB = {
    open: () => request({ transaction: () => ({ objectStore: () => store }) })
  };
};
