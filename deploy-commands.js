require("dotenv").config();
const { REST, Routes } = require("discord.js");

const commands = [
  {
    name: "userinfo",
    description: "Get Cartii user info",
    options: [
      {
        name: "username",
        description: "Cartii username",
        type: 3,
        required: true
      }
    ]
  }
];

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log("⏳ Deploying slash commands...");

    if (process.env.GUILD_ID) {
      // GUILD commands (instant)
      await rest.put(
        Routes.applicationGuildCommands(
          process.env.CLIENT_ID,
          process.env.GUILD_ID
        ),
        { body: commands }
      );
      console.log("✅ Guild slash commands deployed");
    } else {
      // GLOBAL commands (slow, but everywhere)
      await rest.put(
        Routes.applicationCommands(process.env.CLIENT_ID),
        { body: commands }
      );
      console.log("🌍 Global slash commands deployed");
    }

  } catch (error) {
    console.error(error);
  }
})();
