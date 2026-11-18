module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    "scam_image",
    {
      scamName: {
        type: DataTypes.STRING,
        allowNull: false
      },
      imageName: {
        type: DataTypes.STRING,
        allowNull: false
      },
      hashes: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        allowNull: false
      }
    },
    {
      timestamps: true,
      updatedAt: false,
      freezeTableName: true
    }
  );
};
