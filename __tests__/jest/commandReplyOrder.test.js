const fs = require("fs");
const path = require("path");

const commandsDir = path.join(__dirname, "../../src/discordBot/commands");
const commandFiles = fs
  .readdirSync(commandsDir, { withFileTypes: true })
  .filter((dirent) => dirent.isDirectory())
  .flatMap((dirent) =>
    fs
      .readdirSync(path.join(commandsDir, dirent.name))
      .filter((file) => file.endsWith(".js"))
      .map((file) => `${dirent.name}/${file}`)
  );

const firstAwaitInExecute = (source) => {
  const executeStart = source.indexOf("const execute = async");
  return source
    .slice(executeStart)
    .split("\n")
    .slice(1)
    .find((line) => line.includes("await"));
};

describe("command reply order", () => {
  test.each(commandFiles)("%s replies before doing any other work", (file) => {
    const source = fs.readFileSync(path.join(commandsDir, file), "utf8");
    expect(firstAwaitInExecute(source)).toMatch(
      /await (sendEphemeral|interaction\.deferReply|interaction\.showModal)\(/
    );
  });
});
