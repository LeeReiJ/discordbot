const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const Churro = require("../models/profileSchema");

const shopItems = [
  { label: "$10 RP LOL/VAL", value: "1", price: 100 },
  { label: "$25 RP - LOL/VAL", value: "2", price: 250 },
  { label: "$50 RP - LOL/VAL", value: "3", price: 500 },
  { label: "$100 RP - LOL/VAL", value: "4", price: 1000 },
  { label: "미스터리 박스", value: "5", price: 50 },
  { label: "프리미엄 미박", value: "6", price: 75 },
];

const RECEIPT_CHANNEL_NAME = "shop-receipt"; // Name of the receipt channel

module.exports = {
  data: new SlashCommandBuilder()
    .setName("츄르상점")
    .setDescription("츄르 상점에서 아이템을 구매하세요."),
  async execute(interaction) {
    const itemOptions = shopItems.map((item) => ({
      label: item.label,
      value: item.value,
      description: `가격: ${item.price} 츄르`,
    }));

    const selectMenu = {
      type: 3, // Select menu
      custom_id: "item_select",
      options: itemOptions,
      placeholder: "구매할 아이템을 선택하세요.",
    };

    const actionRow = {
      type: 1,
      components: [selectMenu],
    };

    const embed = new EmbedBuilder()
      .setColor(0xfae5c2)
      .setTitle("츄르 상점")
      .setDescription("아래 선택 메뉴에서 구매할 아이템을 선택하세요.");

    const message = await interaction.reply({
      embeds: [embed],
      components: [actionRow],
      fetchReply: true,
    });

    // Set a timeout to delete the message after 50 seconds
    setTimeout(async () => {
      try {
        await message.delete();
      } catch (error) {
        console.error("Failed to delete message:", error);
      }
    }, 50000); // 50 seconds

    const filter = (i) =>
      i.customId === "item_select" && i.user.id === interaction.user.id;

    const collector = interaction.channel.createMessageComponentCollector({
      filter,
      time: 15000, // 15 seconds to select an item
    });

    collector.on("collect", async (i) => {
      await i.deferUpdate();

      const selectedItem = i.values[0];
      const item = shopItems.find((item) => item.value === selectedItem);

      if (!item) {
        await i.followUp({
          content: "선택된 아이템이 유효하지 않습니다.",
          ephemeral: true,
        });
        return;
      }

      // Check user's Churu balance
      const userChuru = await Churro.findOne({
        userId: i.user.id,
        serverId: interaction.guild.id,
      });

      if (!userChuru || userChuru.churu < item.price) {
        await i.followUp({
          content: `츄르가 부족합니다. 현재 보유한 츄르: ${
            userChuru ? userChuru.churu : 0
          }`,
          ephemeral: true,
        });
        return;
      }

      // Deduct Churu and save the user's profile
      userChuru.churu -= item.price;
      await userChuru.save();

      await i.followUp({
        content: `아이템 "${item.label}"을(를) 성공적으로 구매했습니다!`,
        ephemeral: true,
      });

      // Send purchase details to the shop-receipt channel
      try {
        const receiptChannel = interaction.guild.channels.cache.find(
          (channel) =>
            channel.name === RECEIPT_CHANNEL_NAME && channel.type === 0 // 0 is for text channels
        );

        if (receiptChannel) {
          const receiptEmbed = new EmbedBuilder()
            .setColor(0x00ff00)
            .setTitle("구매 영수증")
            .setDescription(
              `<@${i.user.id}>님이 "${item.label}"을(를) 구매하셨습니다.`
            )
            .addFields(
              { name: "아이템", value: item.label },
              { name: "가격", value: `${item.price} 츄르` },
              { name: "구매자", value: `<@${i.user.id}>` } // Mention the user
            )
            .setTimestamp();

          await receiptChannel.send({ embeds: [receiptEmbed] });
        } else {
          console.error("Failed to find the receipt channel by name.");
        }
      } catch (error) {
        console.error("Failed to send message to receipt channel:", error);
      }
    });

    collector.on("end", (collected, reason) => {
      if (reason === "time") {
        interaction.editReply({
          components: [],
        });
      }
    });
  },
};
