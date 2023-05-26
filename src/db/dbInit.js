require("dotenv").config();
const Sequelize = require("sequelize");

const dbUrl = process.env.DATABASE_URL;

const sequelize = new Sequelize(dbUrl, { logging: false });

const Course = require("./models/Course")(sequelize, Sequelize.DataTypes);
const Channel = require("./models/Channel")(sequelize, Sequelize.DataTypes);
const User = require("./models/User")(sequelize, Sequelize.DataTypes);
const CourseMember = require("./models/CourseMember")(sequelize, Sequelize.DataTypes);

Channel.belongsTo(Course, {
  foreignKeyConstraint: true, onDelete: "cascade",
});

CourseMember.belongsTo(User, {
  foreignKeyConstraint: true, onDelete: "cascade",
});

CourseMember.belongsTo(Course, {
  foreignKeyConstraint: true, onDelete: "cascade",
});

module.exports = {
  Course,
  Channel,
  User,
  CourseMember,
  sequelize };
