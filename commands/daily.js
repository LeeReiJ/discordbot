const { SlashCommandBuilder } = require("@discordjs/builders");
const Churro = require("../models/profileSchema");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("출석체크")
    .setDescription("일일 츄르를 받으세요"),

  async execute(interaction) {
    if (!interaction.guild) {
      return interaction.reply({
        content: "이 명령어는 서버 내에서만 사용할 수 있습니다.",
        ephemeral: true,
      });
    }

    const targetUserId = interaction.member.user.id;
    const targetServerId = interaction.guild.id;

    // 사용자의 프로필을 찾습니다
    let churuUser = await Churro.findOne({
      userId: targetUserId,
      serverId: targetServerId,
    });

    // 사용자가 프로필이 없으면 생성합니다
    if (!churuUser) {
      churuUser = await Churro.create({
        userId: targetUserId,
        serverId: targetServerId,
        churu: 0,
        level: 1,
        xp: 0,
        lastDaily: null,
      });
    }

    // Check if the user has already claimed daily churu today
    const lastDaily = churuUser.lastDaily;
    const now = new Date();

    if (lastDaily && isSameDay(lastDaily, now)) {
      return interaction.reply({
        content: "이미 오늘의 츄르를 받으셨습니다.",
        ephemeral: true,
      });
    }

    // Add 1 churu to the user's balance
    churuUser.churu++;

    // Update lastDaily timestamp
    churuUser.lastDaily = now;
    await churuUser.save();

    // Send confirmation message
    interaction.reply({
      content: "일일 츄르를 받아 1 츄르를 획득했습니다.",
      ephemeral: true,
    });
  },
};

// Helper function to check if two dates are on the same day
function isSameDay(date1, date2) {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}
