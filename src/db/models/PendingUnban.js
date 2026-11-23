const { encrypt, decrypt } = require("../crypto");

module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    "pending_unban",
    {
      discordId: {
        type: DataTypes.TEXT,
        allowNull: false,
        set(value) {
          this.setDataValue("discordId", encrypt(value));
        },
        get() {
          return decrypt(this.getDataValue("discordId"));
        }
      },
      unbanAt: {
        type: DataTypes.DATE,
        allowNull: false
      }
    },
    {
      timestamps: false,
      freezeTableName: true
    }
  );
};
