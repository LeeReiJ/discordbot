const { SlashCommandBuilder } = require("discord.js");
const profileModel = require("../models/profileSchema");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("츄르")
    .setDescription(
      "유저의 츄르 개수를 확인하거나 다른 유저에게 츄르를 주는 기능입니다."
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("확인")
        .setDescription("츄르 개수를 확인할 유저를 선택하세요.")
        .addUserOption((option) =>
          option
            .setName("user")
            .setDescription("츄르 개수를 확인할 유저를 선택하세요.")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("주기")
        .setDescription("다른 유저에게 츄르를 주는 기능입니다.")
        .addUserOption((option) =>
          option
            .setName("receiver")
            .setDescription("츄르를 받을 유저를 선택하세요.")
            .setRequired(true)
        )
        .addIntegerOption((option) =>
          option
            .setName("amount")
            .setDescription("주고 싶은 츄르의 양을 입력하세요.")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("랭킹").setDescription("TOP 랭커 만츄르를 보여준다")
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

    if (interaction.options.getSubcommand() === "확인") {
      const user = interaction.options.getUser("user");

      // Find the user's profile in the database
      let userProfile = await profileModel.findOne({ userId: user.id });
      if (!userProfile) {
        try {
          userProfile = await profileModel.create({
            userId: user.id,
            serverId: interaction.guild.id,
          });
        } catch (err) {
          console.log(err);
        }
      }

      const churuBalance = userProfile.churu;

      const embed = {
        color: 0xfae5c2, // Updated color to #fae5c2
        title: "🏦츄르 뱅크🏦",
        description:
          `이름: ${
            interaction.guild.members.cache.get(user.id).displayName
          }\n` +
          "──────────────\n" + // Line separator
          `🍪 ${churuBalance}\n` +
          "──────────────", // Line separator
        thumbnail: {
          url: user.displayAvatarURL({
            dynamic: true,
            format: "png",
            size: 256,
          }), // Get user's avatar image URL
        },
      };
      await interaction.editReply({ embeds: [embed] });
    } else if (interaction.options.getSubcommand() === "주기") {
      const sender = interaction.user;
      const receiver = interaction.options.getUser("receiver");
      const amount = interaction.options.getInteger("amount");

      // Find the sender's profile in the database
      let senderProfile = await profileModel.findOne({ userId: sender.id });

      if (!senderProfile || senderProfile.churu < amount) {
        const embed = {
          color: 0xff0000,
          title: "👛츄르 부족🍪",
          description: "츄르가 부족합니다.",
        };

        await interaction.editReply({ embeds: [embed] });
        return;
      }

      // Find the receiver's profile in the database
      let receiverProfile = await profileModel.findOne({ userId: receiver.id });

      if (!receiverProfile) {
        try {
          receiverProfile = await profileModel.create({
            userId: receiver.id,
            serverId: interaction.guild.id,
          });
        } catch (err) {
          console.log(err);
        }
      }

      senderProfile.churu -= amount;
      receiverProfile.churu += amount;

      try {
        await senderProfile.save();
        await receiverProfile.save();
        const embed = {
          color: 0xf2aaaa,
          title: "🎁츄르 선물🎁",
          description: `${sender.displayName} 님이 ${receiver.displayName} 님에게 🍪 ${amount}개의 츄르를 선물했습니다.`,
        };

        await interaction.editReply({ embeds: [embed] });
      } catch (err) {
        console.log(err);
        const embed = {
          color: 0xff0000,
          title: "⚠️오류 발생⚠️",
          description: "츄르를 선물하는 도중에 오류가 발생했습니다.",
        };

        await interaction.editReply({ embeds: [embed] });
        sendToChuruLogs(interaction.guild, embed);
      }
    } else if (interaction.options.getSubcommand() === "랭킹") {
      const { id } = interaction.user;
      const { churu } = profileData;

      let leaderboardEmbed = {
        title: "💰  **TOP 랭킹 만츄르**  👑",
        color: 0xfae5c2,
      };

      const members = await profileModel
        .find()
        .sort({ churu: -1 })
        .catch((err) => console.log(err));

      const memberIdx = members.findIndex((member) => member.userId === id);

      const member = interaction.guild.members.cache.get(id);
      const displayName = member ? member.displayName : "Unknown";

      leaderboardEmbed.footer = {
        text: `${displayName}님은 츄르가 🍪 ${churu}개 로, 랭킹 #${
          memberIdx + 1
        }등 입니다!`,
      };

      const topTen = members.slice(0, 10);

      let desc = "";
      for (let i = 0; i < topTen.length; i++) {
        let { user } = await interaction.guild.members.fetch(topTen[i].userId);
        if (!user) return;
        let userBalance = topTen[i].churu;
        desc += `**${i + 1}. ${user.toString()}: 🍪 ${userBalance} 츄르**\n`;
      }
      if (desc !== "") {
        leaderboardEmbed.fields = [{ name: "", value: desc }];
      }
      await interaction.editReply({ embeds: [leaderboardEmbed] });
    }
  },
};
