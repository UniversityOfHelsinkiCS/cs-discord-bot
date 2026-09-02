const { encrypt, decrypt, blindIndex } = require("../crypto");

module.exports = (sequelize, DataTypes) => {
  return sequelize.define("user", {
    name: {
      type: DataTypes.TEXT,
      allowNull: false,
      unique: false,
      set(value) {
        this.setDataValue("name", encrypt(value));
      },
      get() {
        return decrypt(this.getDataValue("name"));
      },
    },
    admin: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      unique: false,
    },
    faculty: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      unique: false,
    },
    discordId: {
      type: DataTypes.TEXT,
      allowNull: false,
      unique: false,
      set(value) {
        // Uniqueness and equality lookups live on the discordIdHash blind index;
        // the ciphertext itself is randomized and never queried by value.
        this.setDataValue("discordId", encrypt(value));
        this.setDataValue("discordIdHash", blindIndex(value));
      },
      get() {
        return decrypt(this.getDataValue("discordId"));
      },
    },
    discordIdHash: {
      type: DataTypes.CHAR(64),
      allowNull: false,
      unique: true,
    },
  }, {
    freezeTableName: true,
    timestamps: true,
    updatedAt: false,
    tableName: "joined_users",
  });
};
