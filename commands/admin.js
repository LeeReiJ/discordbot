const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const profileModel = require("../models/profileSchema");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("어드민")
    .setDescription("어드민 권한 커맨드")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((subcommand) =>
      subcommand
        .setName("add")
        .setDescription("츄르를 유저에게 추가하기\n\n")
        .addUserOption((option) =>
          option.setName("user").setDescription("유저").setRequired(true)
        )
        .addIntegerOption((option) =>
          option
            .setName("amount")
            .setDescription("추가할 츄르 개수")
            .setRequired(true)
            .setMinValue(1)
        )
        .addStringOption((option) =>
          option
            .setName("reason")
            .setDescription("츄르를 추가하는 이유")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("subtract")
        .setDescription("유저의 츄르를 빼기\n\n")
        .addUserOption((option) =>
          option.setName("user").setDescription("유저").setRequired(true)
        )
        .addIntegerOption((option) =>
          option
            .setName("amount")
            .setDescription("뺄 츄르 개수")
            .setRequired(true)
            .setMinValue(1)
        )
        .addStringOption((option) =>
          option
            .setName("reason")
            .setDescription("츄르를 제거하는 이유")
            .setRequired(true)
        )
    ),
  async execute(interaction) {
    await interaction.deferReply();
    const adminSubcommand = interaction.options.getSubcommand();

    if (adminSubcommand === "add") {
      const user = interaction.options.getUser("user");
      const amount = interaction.options.getInteger("amount");
      const reason = interaction.options.getString("reason");

      await profileModel.findOneAndUpdate(
        {
          userId: user.id,
        },
        {
          $inc: {
            churu: amount,
          },
        }
      );

      const embed = {
        color: 0x00ff00,
        title: "츄르 추가",
        description: `🍪 츄르 ${amount}개를 ${user.username}에게 추가했습니다`,
        footer: {
          text: `이유: ${reason}`,
        },
      };

      await interaction.editReply({ embeds: [embed] });

      // Sending message to churu-logs channel
      sendToChuruLogs(interaction.guild, embed);
    }

    if (adminSubcommand === "subtract") {
      const user = interaction.options.getUser("user");
      const amount = interaction.options.getInteger("amount");
      const reason = interaction.options.getString("reason");

      await profileModel.findOneAndUpdate(
        {
          userId: user.id,
        },
        {
          $inc: {
            churu: -amount,
          },
        }
      );

      const embed = {
        color: 0xff0000,
        title: "츄르 제거",
        description: `🍪 츄르 ${amount}개를 ${user.username}으로부터 제거했습니다`,
        footer: {
          text: `이유: ${reason}`,
        },
      };

      await interaction.editReply({ embeds: [embed] });

      // Sending message to churu-logs channel
      sendToChuruLogs(interaction.guild, embed);
    }
  },
};

async function sendToChuruLogs(guild, embed) {
  const churuLogsChannel = guild.channels.cache.find(
    (channel) => channel.name === "churu-logs"
  );
  if (churuLogsChannel) {
    churuLogsChannel.send({ embeds: [embed] });
  }
}
