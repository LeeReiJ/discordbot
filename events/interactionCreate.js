const { Events } = require("discord.js");
const profileModel = require("../models/profileSchema");
const LolRank = require("../models/lolRankSchema");

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    // Handle command interactions
    if (interaction.isChatInputCommand()) {
      let profileData;
      try {
        profileData = await profileModel.findOne({
          userId: interaction.user.id,
        });
        if (!profileData) {
          profileData = await profileModel.create({
            userId: interaction.user.id,
            serverId: interaction.guild.id,
          });
        }
      } catch (err) {
        console.error("Error fetching or creating profile data:", err);
      }

      const command = interaction.client.commands.get(interaction.commandName);

      if (!command) {
        console.error(
          `No command matching ${interaction.commandName} was found.`
        );
        return;
      }

      try {
        await command.execute(interaction, profileData);
      } catch (error) {
        console.error(`Error executing ${interaction.commandName}:`, error);
        await interaction.reply({
          content:
            "There was an error executing this command. Please try again later.",
          ephemeral: true,
        });
      }
    }

    // Handle button interactions
    else if (interaction.isButton()) {
      const [action, userId] = interaction.customId.split("_");

      if (action === "confirm") {
        const user = await interaction.guild.members.fetch(userId);

        if (!interaction.member.permissions.has("ADMINISTRATOR")) {
          return interaction.reply({
            content: "이 버튼은 관리자만 사용할 수 있습니다.",
            ephemeral: true,
          });
        }

        const requestLogMessage = interaction.message;
        const rankLineText = requestLogMessage.content.match(
          /랭크: \*\*(.*?)\*\*, 라인: \*\*(.*?)\*\*/
        );

        if (!rankLineText) {
          return interaction.reply({
            content: "랭크와 라인 정보를 찾을 수 없습니다.",
            ephemeral: true,
          });
        }

        const [rank, line] = rankLineText.slice(1);

        try {
          await LolRank.findOneAndUpdate(
            { userId: userId, serverId: interaction.guild.id },
            { rank, line },
            { upsert: true, new: true }
          );

          await interaction.update({
            content: `✅ ${user.user.username}님의 랭크와 라인이 성공적으로 등록되었습니다.`,
            components: [],
          });
        } catch (error) {
          console.error("Error updating rank and lane:", error);
          await interaction.update({
            content: "등록 중 오류가 발생했습니다. 나중에 다시 시도해주세요.",
            components: [],
          });
        }
      }
    }
  },
};
