const { Events } = require("discord.js");
const Level = require("../models/profileSchema");
const calculateLevelXp = require("../utils/calculateLevelXp");
const cooldowns = new Set();

// 레벨 마일스톤과 해당 역할 ID를 포함한 역할 목록 정의
const roleList = [
  { level: 5, roleId: "1232860836498767882", churu: 5 },
  { level: 10, roleId: "1232860927964217455", churu: 10 },
  { level: 20, roleId: "1232861314528051202", churu: 15 },
  { level: 50, roleId: "1232861363488034901", churu: 25 },
  { level: 100, roleId: "1232861425232510976", churu: 35 },
  { level: 200, roleId: "1232861455171326015", churu: 50 },
  { level: 400, roleId: "1232861519663071333", churu: 75 },
  { level: 1004, roleId: "1232861563812053032", churu: 250 },
  // 필요한 레벨 마일스톤과 역할 ID를 추가하세요
];

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    if (
      !message.guild ||
      message.author.bot ||
      cooldowns.has(message.author.id)
    )
      return;

    const xpToGive = getRandomXp(10, 30);

    const query = {
      userId: message.author.id,
      serverId: message.guild.id,
    };
    try {
      let level = await Level.findOne(query);
      if (level) {
        level.xp += xpToGive;
        const nextLevelXp = calculateLevelXp(level.level);
        if (level.xp >= nextLevelXp) {
          level.xp -= nextLevelXp;
          level.level += 1;

          // 사용자의 레벨이 역할 목록의 마일스톤과 일치하는지 확인
          for (const milestone of roleList) {
            if (level.level == milestone.level) {
              const role = message.guild.roles.cache.get(milestone.roleId);
              if (role) {
                message.member.roles
                  .add(role)
                  .then(() =>
                    console.log(
                      `레벨 ${level.level}에서 ${message.author.tag} 사용자에게 역할 ${role.name} 할당됨`
                    )
                  )
                  .catch(console.error);
                level.churu += milestone.churu;
                await level.save();
                console.log(
                  `${message.member}님이 ${milestone.churu} 츄르를 받았습니다: 현재 츄르 ${level.churu}`
                );
                const levelUpChannel = message.guild.channels.cache.find(
                  (channel) => channel.name === "레벨🙀"
                );
                levelUpChannel.send(
                  `${message.member}님이 **${role.name}** 역할을 획득했습니다!`
                );
              } else {
                console.error(
                  `ID가 ${milestone.roleId}인 역할을 찾을 수 없습니다.`
                );
              }
            }
          }

          const levelUpChannel = message.guild.channels.cache.find(
            (channel) => channel.name === "레벨🙀"
          );
          if (levelUpChannel) {
            levelUpChannel.send(
              `${message.member}님이 **레벨 ${level.level}**로 상승했습니다!`
            );
          } else {
            console.error(`레벨 상승 채널을 찾을 수 없습니다.`);
          }
        }
      } else {
        level = new Level({
          userId: message.author.id,
          serverId: message.guild.id,
          xp: xpToGive,
        });
      }
      await level.save();
      cooldowns.add(message.author.id);
      setTimeout(() => {
        cooldowns.delete(message.author.id);
      }, 60000);
    } catch (error) {
      console.log(`경험치 제공 중 오류 발생: ${error}`);
    }
  },
};

function getRandomXp(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
