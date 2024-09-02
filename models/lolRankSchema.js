// models/lolRankSchema.js
const mongoose = require("mongoose");

const lolRankSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  serverId: { type: String, required: true },
  rank: { type: String, required: true },
  line: { type: String, required: true },
});

module.exports = mongoose.model("LolRank", lolRankSchema);
