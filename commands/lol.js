const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const LolRank = require("../models/lolRankSchema");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("롤등록")
    .setDescription("롤 랭크 및 라인을 등록합니다.")
    .addStringOption((option) =>
      option
        .setName("rank")
        .setDescription(
          "3시즌 내 최고티어와 현재티어를 입력하세요 (예: MASTER 300/DIAMOND 4, CHALLENGER 1200/IRON 3 등)"
        )
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("line")
        .setDescription(
          "주라인과 부라인을 입력하세요 (예: TOP/MID, MID/SUP, ADC/JG 등)."
        )
        .setRequired(true)
    ),

  async execute(interaction) {
    const user = interaction.user;
    const rank = interaction.options.getString("rank");
    const line = interaction.options.getString("line");

    const requestLogChannel = interaction.guild.channels.cache.find(
      (channel) => channel.name === "request-log"
    );
    if (!requestLogChannel) {
      return interaction.reply({
        content: "요청 로그 채널을 찾을 수 없습니다.",
        ephemeral: true,
      });
    }

    const confirmButton = new ButtonBuilder()
      .setCustomId(`confirm_${user.id}`)
      .setLabel("확인 / Confirm")
      .setStyle(ButtonStyle.Primary);

    const actionRow = new ActionRowBuilder().addComponents(confirmButton);

    await requestLogChannel.send({
      content: `${user}님이 롤 랭크: **${rank}**, 라인: **${line}** 를 등록하려고 합니다. 확인을 위해 아래 버튼을 클릭하세요.`,
      components: [actionRow],
    });

    interaction.reply({
      content:
        "요청이 성공적으로 전송되었습니다. 관리자가 확인할 때까지 기다려주세요.",
      ephemeral: true,
    });
  },
};
