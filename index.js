require("dotenv").config();
const fs = require("node:fs");
const path = require("node:path");
const mongoose = require("mongoose");
const Level = require("../SLK Discord Bot/models/profileSchema");
const { DISCORD_TOKEN: token, MONGODB_SRV: database } = process.env;
const calculateLevelXp = require("../SLK Discord Bot/utils/calculateLevelXp");

// Require the necessary discord.js classes
const { Client, GatewayIntentBits, Collection } = require("discord.js");

// Create a new client instance
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

// Define XPIntervals object to keep track of voice chat XP intervals
const XPIntervals = {};
const roleList = [
  { level: 5, roleId: "1232860836498767882", churu: 5 },
  { level: 10, roleId: "1232860927964217455", churu: 10 },
  { level: 20, roleId: "1232861314528051202", churu: 15 },
  { level: 50, roleId: "1232861363488034901", churu: 25 },
  { level: 100, roleId: "1232861425232510976", churu: 35 },
  { level: 200, roleId: "1232861455171326015", churu: 50 },
  { level: 400, roleId: "1232861519663071333", churu: 75 },
  { level: 1004, roleId: "1232861563812053032", churu: 250 },
  // Add more level milestones and role IDs as needed
];
// Voice chat XP giving function
// Voice chat XP giving function
// Assuming `member` should be passed as a parameter
async function giveVoiceChatXP(member) {
  try {
    const { id: userId, guild } = member; // Extract the userId from member.id
    const query = { userId: userId, serverId: guild.id };

    let userLevel = await Level.findOne(query);
    if (!userLevel) {
      userLevel = new Level({ ...query, xp: 0, level: 1 });
    }

    userLevel.xp += 2;
    const nextLevelXp = calculateLevelXp(userLevel.level);

    if (userLevel.xp >= nextLevelXp) {
      userLevel.xp -= nextLevelXp;
      userLevel.level++;
      await updateRolesAndAnnounce(userLevel, member);
    }

    await userLevel.save();
  } catch (error) {
    console.error(`Error updating XP for user ${member.user.tag}: ${error}`);
  }
}

async function updateRolesAndAnnounce(userLevel, member) {
  for (const milestone of roleList) {
    if (userLevel.level === milestone.level) {
      const role = member.guild.roles.cache.get(milestone.roleId);
      if (role) {
        try {
          await member.roles.add(role);
          console.log(
            `Assigned role ${role.name} to user ${member.user.tag} at level ${userLevel.level}`
          );
          const levelUpChannel = member.guild.channels.cache.find(
            (channel) => channel.name === "레벨🙀"
          );
          if (levelUpChannel) {
            levelUpChannel.send(`${member} has become **${role.name}**!`);
          }
          userLevel.churu += milestone.churu;
          await userLevel.save();
          console.log(
            `${member.user.tag} has received ${milestone.churu} : Now ${userLevel.churu}`
          );
        } catch (error) {
          console.error(`Failed to assign role or announce level up: ${error}`);
        }
      } else {
        console.error(`Role with ID ${milestone.roleId} not found.`);
      }
    }
  }
}

client.on("voiceStateUpdate", (oldState, newState) => {
  const connected = newState.channelId,
    member = newState.member; // Use newState.member to get the member object

  if (connected) {
    // User joined a voice channel
    if (typeof XPIntervals[member.id] === "undefined") {
      // Start interval to give XP every minute
      XPIntervals[member.id] = setInterval(() => {
        giveVoiceChatXP(member); // Pass the member object to the function
      }, 60 * 1000); // 1 minute in milliseconds
    }
  } else {
    // User left or disconnected from voice channel
    if (XPIntervals[member.id]) {
      // Clear interval if it exists
      clearInterval(XPIntervals[member.id]);
      delete XPIntervals[member.id];
    }
  }
});

// Load the events files on startup
const eventsPath = path.join(__dirname, "events");
const eventFiles = fs
  .readdirSync(eventsPath)
  .filter((file) => file.endsWith(".js"));

for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file);
  const event = require(filePath);
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args));
  } else {
    client.on(event.name, (...args) => event.execute(...args));
  }
}

// Load the command files on startup
client.commands = new Collection();
const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs
  .readdirSync(commandsPath)
  .filter((file) => file.endsWith(".js"));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  if ("data" in command && "execute" in command) {
    client.commands.set(command.data.name, command);
  } else {
    console.log(
      `[WARNING] The command at ${filePath} is missing a required "data" or "execute property"`
    );
  }
}

// Connect to MongoDB database
mongoose
  .connect(database)
  .then(() => {
    console.log("Connected to the database!");
  })
  .catch((err) => {
    console.log(err);
  });

// Log in to Discord with the bot token
client.login(token);
