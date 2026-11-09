require("dotenv").config({ quiet: true });

const backendUrl =
  process.env.NODE_ENV === "production"
    ? `${process.env.BACKEND_SERVER_URL}`
    : `${process.env.BACKEND_SERVER_URL}:${process.env.PORT}`;

module.exports = { backendUrl };
