const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const fetch = require("node-fetch");

const BASE = "https://cartii.fit";

const headers = {
  "User-Agent": "CartiiDiscordBot/1.0",
  "Accept": "application/json",
  "Content-Type": "application/json",
  "Origin": "https://cartii.fit",
  "Referer": "https://cartii.fit/"
};

// ---- API HELPERS ----

async function searchUser(username) {
  const r = await fetch(
    `${BASE}/search/users/results?keyword=${encodeURIComponent(username)}&maxRows=1`,
    { headers }
  );
  const j = await r.json();
  return j.UserSearchResults?.[0] || null;
}

async function getProfile(id) {
  return (await fetch(`${BASE}/apisite/users/v1/users/${id}`, { headers })).json();
}

async function getPresence(id) {
  const r = await fetch(
    `${BASE}/apisite/presence/v1/presence/users`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({ userIds: [id] })
    }
  );
  const j = await r.json();
  return j.userPresences?.[0] || null;
}

async function getAvatar(id) {
  const r = await fetch(
    `${BASE}/apisite/thumbnails/v1/users/avatar?userIds=${id}&size=420x420&format=Png&isCircular=false`,
    { headers }
  );
  const j = await r.json();
  const img = j.data?.[0]?.imageUrl;
  return img ? `${BASE}${img}` : null;
}

async function getUsernameHistory(id) {
  const r = await fetch(
    `${BASE}/apisite/users/v1/users/${id}/username-history?limit=100&cursor=`,
    { headers }
  );
  return (await r.json()).data || [];
}

async function getFriendsCount(id) {
  const r = await fetch(
    `${BASE}/apisite/friends/v1/users/${id}/friends`,
    { headers }
  );
  return (await r.json()).data?.length || 0;
}

async function getFollowersCount(id) {
  return (await (await fetch(
    `${BASE}/apisite/friends/v1/users/${id}/followers/count`,
    { headers }
  )).json()).count || 0;
}

async function getFollowingsCount(id) {
  return (await (await fetch(
    `${BASE}/apisite/friends/v1/users/${id}/followings/count`,
    { headers }
  )).json()).count || 0;
}

// ---- SLASH COMMAND ----

module.exports = {
  data: new SlashCommandBuilder()
    .setName("userinfo")
    .setDescription("Get Cartii user info")
    .addStringOption(o =>
      o.setName("username").setDescription("Username").setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const username = interaction.options.getString("username");
    const search = await searchUser(username);
    if (!search) return interaction.editReply("❌ User not found.");

    const id = search.UserId;

    const [
      profile,
      presence,
      avatar,
      history,
      friends,
      followers,
      followings
    ] = await Promise.all([
      getProfile(id),
      getPresence(id),
      getAvatar(id),
      getUsernameHistory(id),
      getFriendsCount(id),
      getFollowersCount(id),
      getFollowingsCount(id)
    ]);

    const joined = `<t:${Math.floor(new Date(profile.created).getTime() / 1000)}:R>`;

    const presenceType = presence?.userPresenceType || "Offline";
    const location = presence?.lastLocation || "Offline";
    const lastOnline = presence?.lastOnline
      ? `<t:${Math.floor(new Date(presence.lastOnline).getTime() / 1000)}:R>`
      : "Unknown";

    let historyText = "None";
    if (history.length) {
      historyText = history.map(h => h.name).slice(0, 10).join(", ");
      if (history.length > 10) historyText += ` (+${history.length - 10} more)`;
    }

    const embed = new EmbedBuilder()
      .setTitle(`${profile.displayName} (@${profile.name})`)
      .setURL(`https://cartii.fit/users/${id}/profile`)
      .setThumbnail(avatar)
      .setColor(presenceType === "Online" ? 0x2ecc71 : 0x95a5a6)
      .addFields(
        { name: "User ID", value: id.toString(), inline: true },
        { name: "Joined", value: joined, inline: true },
        { name: "Verified", value: profile.isVerified ? "Yes" : "No", inline: true },
        { name: "Banned", value: profile.isBanned ? "Yes" : "No", inline: true },
        { name: "RAP", value: profile.totalrap.toString(), inline: true },
        { name: "Status", value: presenceType, inline: true },
        { name: "Location", value: location, inline: true },
        { name: "Last Online", value: lastOnline, inline: true },
        { name: "Friends", value: friends.toString(), inline: true },
        { name: "Followers", value: followers.toString(), inline: true },
        { name: "Following", value: followings.toString(), inline: true },
        { name: "Username History", value: historyText }
      );

    await interaction.editReply({ embeds: [embed] });
  }
};
