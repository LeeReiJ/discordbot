const { SlashCommandBuilder } = require("discord.js");
const profileModel = require("../models/profileSchema");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("레벨랭킹")
    .setDescription(
      "유저의 츄르 개수를 확인하거나 다른 유저에게 츄르를 주는 기능입니다."
    ),

  async execute(interaction, profileData) {
    await interaction.deferReply();

    // Create a collector to listen for interactions
    const collector = interaction.channel.createMessageComponentCollector({
      filter: (i) => i.user.id === interaction.user.id,
      time: 30000, // Timeout after 30 seconds of inactivity
    });

    collector.on("collect", async () => {
      // If any interaction is collected, reset the timeout
      resetTimeout();
    });

    collector.on("end", async () => {
      // When the collector ends (due to timeout), delete the interaction reply
      try {
        await interaction.deleteReply();
      } catch (error) {
        console.error("Failed to delete interaction reply:", error);
      }
    });

    // Function to reset the timeout
    function resetTimeout() {
      collector.resetTimer();
    }

    const { id } = interaction.user;
    const { level } = profileData;

    let leaderboardEmbed = {
      title: "👑  **TOP 랭킹 레벨**  👑",
      color: 0xfae5c2,
    };

    const members = await profileModel
      .find()
      .sort({ level: -1 })
      .catch((err) => console.log(err));

    const memberIdx = members.findIndex((member) => member.userId === id);

    const member = interaction.guild.members.cache.get(id);
    const displayName = member ? member.displayName : "Unknown";

    leaderboardEmbed.footer = {
      text: `${displayName}님은 레벨 ${level} 로, 랭킹 #${
        memberIdx + 1
      }등 입니다!`,
    };

    const topTen = members.slice(0, 10);

    let desc = "";
    for (let i = 0; i < topTen.length; i++) {
      let { user } = await interaction.guild.members.fetch(topTen[i].userId);
      if (!user) return;
      let userBalance = topTen[i].level;
      desc += `**${i + 1}. ${user.toString()}: Level ${userBalance} **\n`;
    }
    if (desc !== "") {
      leaderboardEmbed.fields = [{ name: "", value: desc }];
    }
    await interaction.editReply({ embeds: [leaderboardEmbed] });
  },
};
