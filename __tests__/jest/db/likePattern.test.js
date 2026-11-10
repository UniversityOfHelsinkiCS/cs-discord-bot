const { escapeLike, unescapeLike } = require("../../../src/db/services/likePattern");

describe("like pattern escaping", () => {
  test("escapes wildcards so they match literally", () => {
    expect(escapeLike("ohtu_2024%")).toBe("ohtu\\_2024\\%");
    expect(escapeLike("a\\b")).toBe("a\\\\b");
  });

  test("unescaping gives back the original name", () => {
    const name = "ohtu_2024%\\x";
    expect(unescapeLike(escapeLike(name))).toBe(name);
  });

  test("leaves missing values alone", () => {
    expect(escapeLike(null)).toBeNull();
  });
});
