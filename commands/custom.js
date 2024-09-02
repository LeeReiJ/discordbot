const { SlashCommandBuilder } = require("discord.js");
const Churro = require("../models/profileSchema");
const LolRank = require("../models/lolRankSchema");

let joinedUsers = {
  탑: [],
  정글: [],
  미드: [],
  원딜: [],
  서폿: [],
};

module.exports = {
  data: new SlashCommandBuilder().setName("내전").setDescription("내전 참여"),
  async execute(interaction) {
    let matchEnded = false;

    const embed = {
      color: 0xfae5c2,
      title: "-------------내전 신청서-------------",
      description: createInitialEmbedDescription(
        joinedUsers,
        interaction.guild
      ),
    };

    const roleOptions = [
      { label: "🛡️탑", value: "탑" },
      { label: "🔪정글", value: "정글" },
      { label: "🪄미드", value: "미드" },
      { label: "🔫원딜", value: "원딜" },
      { label: "💉서폿", value: "서폿" },
      { label: "❌내전 참가 취소", value: "cancel" },
      { label: "🏁내전 종료", value: "end" },
    ];

    const actionRow = {
      type: 1,
      components: [
        {
          type: 3, // Select menu
          custom_id: "내전_role_select",
          options: roleOptions,
          placeholder: "역할을 선택하세요.",
        },
      ],
    };

    const message = await interaction.reply({
      embeds: [embed],
      components: [actionRow],
      fetchReply: true,
    });

    const najeonRole = interaction.guild.roles.cache.find(
      (role) => role.name === "내전"
    );
    if (najeonRole) {
      await interaction.followUp(
        `${najeonRole}, 내전이 시작되었습니다! 역할을 선택하세요.`
      );
    }

    const filter = (i) => i.customId === "내전_role_select";

    const collector = interaction.channel.createMessageComponentCollector({
      filter,
      // No `time` property, so it will run indefinitely
    });

    collector.on("collect", async (i) => {
      try {
        // Acknowledge the interaction to prevent timeout
        await i.deferUpdate();

        const selectedRole = i.values[0];

        if (selectedRole === "end") {
          if (!interaction.member.permissions.has("ADMINISTRATOR")) {
            await i.followUp({
              content: "이 명령어를 사용하려면 관리자 권한이 필요합니다.",
              ephemeral: true,
            });
            return;
          }

          matchEnded = true;
          embed.title = "내전 신청이 마감되었습니다.";
          embed.description = createEmbedDescription(
            joinedUsers,
            interaction.guild
          );
          await message.edit({ embeds: [embed], components: [] });
          collector.stop("end");
          return;
        }

        if (selectedRole === "cancel") {
          let roleRemoved = false;
          for (const role in joinedUsers) {
            const index = joinedUsers[role].findIndex(
              (user) => user.id === i.user.id
            );
            if (index !== -1) {
              joinedUsers[role].splice(index, 1);
              await updateChuru(i.user.id, interaction.guild.id, -5);
              roleRemoved = true;
              break;
            }
          }

          if (!roleRemoved) {
            await i.followUp({
              content: "내전 참여자가 아닙니다.",
              ephemeral: true,
            });
            return;
          }

          embed.description = createEmbedDescription(
            joinedUsers,
            interaction.guild
          );
          await message.edit({ embeds: [embed] });
          return;
        }

        if (matchEnded) {
          await i.followUp({
            content: "내전이 종료되었습니다.",
            ephemeral: true,
          });
          return;
        }

        // Handle role assignment
        let currentRoleFound = false;
        for (const role in joinedUsers) {
          const index = joinedUsers[role].findIndex(
            (user) => user.id === i.user.id
          );
          if (index !== -1) {
            joinedUsers[role].splice(index, 1);
            currentRoleFound = true;
            break;
          }
        }

        if (currentRoleFound && selectedRole !== "cancel") {
          if (joinedUsers[selectedRole]) {
            joinedUsers[selectedRole].push({
              id: i.user.id,
              rank: await getUserRank(i.user.id, interaction.guild.id),
              lane: selectedRole,
            });

            embed.description = createEmbedDescription(
              joinedUsers,
              interaction.guild
            );
            await message.edit({ embeds: [embed] });
            return;
          }
        }

        const userRank = await LolRank.findOne({
          userId: i.user.id,
          serverId: interaction.guild.id,
        });

        if (!userRank) {
          await i.followUp({
            content: "랭크와 라인을 등록해야 내전에 참여할 수 있습니다.",
            ephemeral: true,
          });
          return;
        }

        await updateChuru(i.user.id, interaction.guild.id, 5);

        joinedUsers[selectedRole].push({
          id: i.user.id,
          rank: userRank.rank,
          lane: selectedRole,
        });

        embed.description = createEmbedDescription(
          joinedUsers,
          interaction.guild
        );
        await message.edit({ embeds: [embed] });
      } catch (error) {
        console.error("Failed to process interaction:", error);

        if (!i.deferred && !i.replied) {
          try {
            await i.followUp({
              content:
                "Something went wrong while processing your request. Please try again.",
              ephemeral: true,
            });
          } catch (followUpError) {
            console.error("Failed to send follow-up message:", followUpError);
          }
        }
      }
    });

    collector.on("end", (collected, reason) => {
      if (reason === "end") {
        // Do not reset the joinedUsers object or update the embed
        // Just stop the collector, which will disable further interactions
        // Optionally, you can add a follow-up message saying the match has ended
        interaction.followUp("내전이 종료되었습니다. 최종 상태가 유지됩니다.");
      }
    });
  },
};

// Function to create the initial embed description with columns
function createInitialEmbedDescription(joinedUsers, guild) {
  const columns = ["탑", "정글", "미드", "원딜", "서폿"];
  let description = columns
    .map((role) => {
      return `${role}:\n${
        joinedUsers[role]
          .map(
            (user, index) =>
              `${index + 1}. ${
                guild.members.cache.get(user.id)?.displayName || "Unknown"
              } (Rank: ${user.rank})`
          )
          .join("\n") || "없음"
      }`;
    })
    .join("\n\n");
  return description;
}

// Function to create the embed description with columns
function createEmbedDescription(joinedUsers, guild) {
  const columns = ["탑", "정글", "미드", "원딜", "서폿"];
  let description = columns
    .map((role) => {
      return `${role}:\n${
        joinedUsers[role]
          .map(
            (user, index) =>
              `${index + 1}. ${
                guild.members.cache.get(user.id)?.displayName || "Unknown"
              } (Rank: ${user.rank})`
          )
          .join("\n") || "없음"
      }`;
    })
    .join("\n\n");
  return description;
}

// Function to get the user's rank
async function getUserRank(userId, serverId) {
  const userRank = await LolRank.findOne({ userId, serverId });
  return userRank ? userRank.rank : "Unknown";
}

// Function to update Churu balance
async function updateChuru(userId, serverId, churuChange) {
  let churuUser = await Churro.findOne({ userId, serverId });

  // If user doesn't have a profile, create one
  if (!churuUser) {
    churuUser = await Churro.create({
      userId,
      serverId,
      churu: 0,
      level: 1,
      xp: 0,
      lastDaily: null,
    });
  }

  churuUser.churu += churuChange;

  if (churuUser.churu < 0) {
    churuUser.churu = 0; // Ensure churu doesn't go below 0
  }

  await churuUser.save();
}
