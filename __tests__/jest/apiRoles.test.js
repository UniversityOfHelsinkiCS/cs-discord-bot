const { getRoles, clearRoleCache } = require("../../src/server/api/api");

const roles = [{ id: "1", name: "wepa" }];
let fetch;

beforeEach(() => {
  clearRoleCache();
  fetch = jest.spyOn(global, "fetch").mockImplementation(async () => new Response(JSON.stringify(roles)));
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

describe("getRoles", () => {
  test("repeated requests within a minute ask Discord only once", async () => {
    await Promise.all([getRoles(), getRoles()]);
    await getRoles();

    expect(fetch).toHaveBeenCalledTimes(1);
  });

  test("asks Discord again after a minute", async () => {
    jest.useFakeTimers({ now: 0 });
    await getRoles();
    jest.setSystemTime(60 * 1000);
    await getRoles();

    expect(fetch).toHaveBeenCalledTimes(2);
  });

  test("a failed request is not cached", async () => {
    fetch.mockResolvedValueOnce(new Response("rate limited", { status: 429 }));

    await expect(getRoles()).rejects.toThrow("status 429");
    await expect(getRoles()).resolves.toEqual(roles);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
