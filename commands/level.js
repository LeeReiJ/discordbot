const { SlashCommandBuilder, AttachmentBuilder } = require("discord.js");
const Level = require("../models/profileSchema");
const { Font, RankCardBuilder } = require("canvacord");
const calculateLevelXp = require("../utils/calculateLevelXp");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("레벨")
    .setDescription("나의 레벨을 확인하다")
    .addUserOption((option) =>
      option.setName("user").setDescription("유저").setRequired(true)
    ),

  async execute(interaction) {
    if (!interaction.inGuild()) {
      interaction.reply("이 명령어는 서버 내에서만 사용할 수 있습니다.");
      return;
    }
    await interaction.deferReply();

    const mentionUserId = interaction.options.get("user")?.value;
    if (!mentionUserId) {
      interaction
        .editReply("디스코드 유저를 제공하지 않았습니다.")
        .then((msg) => {
          setTimeout(() => msg.delete(), 10000); // Delete after 10 seconds
        });
      return;
    }
    const targetUserId = mentionUserId || interaction.member.id;
    const targetUserObj = await interaction.guild.members.fetch(targetUserId);
    const fetchedLevel = await Level.findOne({
      userId: targetUserId,
      serverId: interaction.guild.id,
    });
    if (!fetchedLevel) {
      interaction
        .editReply(
          mentionUserId
            ? `${targetUserObj.user.tag}님은 아직 레벨이 없습니다. 대화가 더 활발해지면 다시 시도해 보세요.`
            : "아직 레벨이 없습니다. 대화가 더 활발해지면 다시 시도해 보세요."
        )
        .then((msg) => {
          setTimeout(() => msg.delete(), 10000); // Delete after 10 seconds
        });
      return;
    }
    let allLevels = await Level.find({ serverId: interaction.guild.id }).select(
      "-_id userId level xp"
    );

    allLevels.sort((a, b) => {
      if (a.level === b.level) {
        return b.xp - a.xp;
      } else {
        return b.level - a.level;
      }
    });

    let currentRank =
      allLevels.findIndex((lvl) => lvl.userId === targetUserId) + 1;
    Font.loadDefault();
    const rank = new RankCardBuilder()
      .setUsername(targetUserObj.user.username)
      .setDisplayName(targetUserObj.user.username)
      .setAvatar("https://cdn-icons-png.flaticon.com/512/763/763775.png")
      .setRank(currentRank)
      .setLevel(fetchedLevel.level)
      .setCurrentXP(fetchedLevel.xp)
      .setRequiredXP(calculateLevelXp(fetchedLevel.level))
      .setBackground(
        "https://cdn.discordapp.com/attachments/1230274643693142018/1230398758961942528/image-removebg-preview_5.png?ex=66332d23&is=6620b823&hm=332335ccd5b20efc59a3887a68acc186b4f57d0b7971b85c6467b20bdd13daed&"
      )
      .setTextStyles({
        level: "Level:",
        xp: "XP:",
        rank: "Rank:",
      });

    const image = await rank.build({ format: "png" });
    const attachment = new AttachmentBuilder(image);
    interaction.editReply({ files: [attachment] }).then((msg) => {
      setTimeout(() => msg.delete(), 10000); // Delete after 10 seconds
    });
  },
};
