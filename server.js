import express from 'express';
import { Client, GatewayIntentBits, ChannelType } from 'discord.js';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
app.use(express.json());

const bot = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates] });
const TOKEN = process.env.TOKEN;
const GUILD_ID = process.env.GUILD_ID;

app.post('/webhook', async (req, res) => {
  const body = req.body;
  if (!body.content) return res.status(400).send('No content');

  const ids = body.content.split(';').map(x => x.trim());
  const guild = bot.guilds.cache.get(GUILD_ID);
  if (!guild) return res.status(500).send('Guild not found');

  const userInfos = [];
  for (const id of ids) {
    try {
      const member = await guild.members.fetch(id);
      userInfos.push({ id, member });
    } catch {
      return res.status(404).send({ error: `User ${id} not found` });
    }
  }

  const name1 = userInfos[0].member.user.username;
  const name2 = userInfos[1].member.user.username;
  const channelName = `CallRoom_${name1}_${name2}`;

  let voiceChannel = guild.channels.cache.find(
    c => c.name === channelName && c.type === ChannelType.GuildVoice
  );

  if (!voiceChannel) {
    voiceChannel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildVoice,
      reason: 'Panggilan otomatis'
    });
  }

  for (const { member } of userInfos) {
    await member.voice.setChannel(voiceChannel);
  }

  res.json({ status: 'OK', channel: channelName });
});

bot.on('voiceStateUpdate', async (oldState) => {
  const left = oldState.channel;
  if (left && left.name.startsWith('CallRoom_') && left.members.size === 0) {
    await left.delete('Kosong, auto delete');
  }
});

app.listen(3000, () => console.log('🌐 Webhook aktif di port 3000'));
bot.login(TOKEN);
