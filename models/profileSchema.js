const mongoose = require("mongoose");

const profileSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  serverId: { type: String, required: true },
  churu: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  xp: { type: Number, default: 0 },
  lastDaily: { type: Date, required: false },
  dailyStack: { type: Number, default: 0 }, // New field for daily stack
});

const model = mongoose.model("churrodb", profileSchema);

module.exports = model;
