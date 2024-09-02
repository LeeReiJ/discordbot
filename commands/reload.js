const { SlashCommandBuilder } = require("discord.js");
const fs = require("node:fs");
const { Collection } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("reload")
    .setDescription("Reloads all the command files."),

  async execute(interaction) {
    // Check if the user has the Administrator permission
    if (!interaction.member.permissions.has("ADMINISTRATOR")) {
      return interaction.reply({
        content: "You don't have permission to use this command.",
        ephemeral: true,
      });
    }

    const commandFiles = fs
      .readdirSync("./commands")
      .filter((file) => file.endsWith(".js"));

    interaction.client.commands = new Collection();

    for (const file of commandFiles) {
      delete require.cache[require.resolve(`./${file}`)];
      const command = require(`./${file}`);
      interaction.client.commands.set(command.data.name, command);
    }

    await interaction.reply("Commands reloaded!");
  },
};
