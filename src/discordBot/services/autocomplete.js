const DISCORD_MAX_CHOICES = 25;
const DISCORD_MAX_TEXT_LENGTH = 100;

const respondWithChoices = async (interaction, choices) => {
  const typed = interaction.options.getFocused().toLowerCase().trim();
  const matches = choices
    .filter((c) => c.name.toLowerCase().includes(typed) || c.value.toLowerCase().includes(typed))
    .slice(0, DISCORD_MAX_CHOICES)
    .map((c) => ({ name: c.name.slice(0, DISCORD_MAX_TEXT_LENGTH), value: c.value.slice(0, DISCORD_MAX_TEXT_LENGTH) }));
  await interaction.respond(matches);
};

const capitalizeFirstLetter = (text) => text.charAt(0).toUpperCase() + text.slice(1);

const uppercaseLeadingLetters = (code) => {
  const leadingLetters = /^[^0-9]*/.exec(code)[0];
  return leadingLetters.toUpperCase() + code.slice(leadingLetters.length);
};

const courseToChoice = (course) => ({
  name: `${capitalizeFirstLetter(course.fullName)} - ${course.name} - ${uppercaseLeadingLetters(course.code)}`,
  value: course.name
});

const respondWithCourses = async (interaction, courses) => {
  await respondWithChoices(interaction, courses.map(courseToChoice));
};

module.exports = { respondWithChoices, respondWithCourses };
