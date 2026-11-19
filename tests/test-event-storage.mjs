import { AsyncLocalStorage } from "node:async_hooks";

const GLOBAL_EVENT_STORAGE_KEY = Symbol.for("tanstack-start:event-storage");
const storage = new AsyncLocalStorage();
globalThis[GLOBAL_EVENT_STORAGE_KEY] = storage;

const fakeReq = new Request("https://midiaos.online/test", {
  headers: {
    Authorization: "Bearer test_token_xyz"
  }
});

storage.run({ h3Event: { req: fakeReq } }, () => {
  const currentStore = globalThis[GLOBAL_EVENT_STORAGE_KEY]?.getStore();
  const req = currentStore?.h3Event?.req;
  console.log("Req found:", !!req);
  console.log("Auth header:", req?.headers.get("authorization"));
});
