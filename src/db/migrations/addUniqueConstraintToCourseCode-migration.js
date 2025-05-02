"use strict";

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.addConstraint("course", {
      fields: ["code"],
      type: "unique",
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeConstraint("course", "unique_course_code_constraint");
  },
};
