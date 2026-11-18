const escapeLike = (value) => (typeof value === "string" ? value.replace(/[\\%_]/g, "\\$&") : value);

const unescapeLike = (pattern) => pattern.replace(/\\(.)/g, "$1");

module.exports = { escapeLike, unescapeLike };
