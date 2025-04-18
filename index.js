const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const app = express();

// 🔐 Admin Setup
const ADMINS = ['5999791089'];
function isAdmin(userId) {
  return ADMINS.includes(userId.toString());
}

// 💾 User storage
const USERS_FILE = path.join(__dirname, 'users.json');
function saveUser(chatId) {
  let users = [];
  if (fs.existsSync(USERS_FILE)) {
    users = JSON.parse(fs.readFileSync(USERS_FILE));
  }
  if (!users.includes(chatId)) {
    users.push(chatId);
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    console.log(`✅ New user saved: ${chatId}`);
  }
}

// Load bot token
const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });
console.log("🚀 FanHubBot is starting...");

// Reply Keyboard
const mainMenuKeyboard = {
  reply_markup: {
    keyboard: [
      ['/menu', '/getchatid'],
      ['/profile', '/notifications'],
      ['/support', '/links']
    ],
    resize_keyboard: true,
    one_time_keyboard: false
  }
};

// 🗓️ Daily Message Bank by Day (9AM UTC)
const dailyMessagesByDay = {
  0: `🌤️ *Happy Sunday, DreamKeeper!*\n\nTake time to recharge, but don’t forget — your support fuels Cali’s dreams. 💙\nHead to the hub and check what’s waiting for you today! ✨`,
  1: `🌟 *Motivation Monday is here!*\n\nA new week, a new chance to shine ✨\nComplete your tasks today and show the world your DreamKeeper heart 💙`,
  2: `💪 *Task-Focused Tuesday!*\n\nYou’ve got what it takes to push Cali closer to debut 🌍\nDon’t miss today’s missions in the hub — they make all the difference!`,
  3: `🧠 *Wisdom Wednesday*\n\nMidweek magic starts with one click!\nBe the reason Cali smiles today — check your tasks and rise up the leaderboard 🏆`,
  4: `🔥 *Thriving Thursday!*\n\nAnother chance to grow, support, and lead 🌱\nLet’s show everyone the strength of a united fandom 💙`,
  5: `🎉 *Feel-Good Friday!*\n\nEnd the week strong — complete your tasks and share the love 💌\nYou’re making Cali’s dreams come true, one action at a time ✨`,
  6: `🌈 *Supportive Saturday*\n\nIt’s the weekend! Time to boost Cali with energy and votes ⚡\nTap the button below and power up your tasks 💙`
};

// 🌙 Evening Check-In Pool (8PM UTC)
const eveningCheckIns = [
  `🌙 *How was your day, DreamKeeper?*\n\nWe hope it was filled with joy, progress, and purpose. 💙`,
  `💤 *Before you rest...*\nJust know that showing up matters. Even small steps count. 🌟`,
  `🌌 *The stars are proud of you — and so are we.* 💙\nCheck in, reflect, and keep dreaming big.`
];

// ⏰ Daily Task Broadcast at 9AM UTC
cron.schedule('0 9 * * *', () => {
  if (!fs.existsSync(USERS_FILE)) return;
  const users = JSON.parse(fs.readFileSync(USERS_FILE));
  const today = new Date().getDay();
  const messageText = dailyMessagesByDay[today];

  const options = {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [{ text: "📲 Go to Members Hub", url: "https://dreamkeepers.btncaliofficial.com" }]
      ]
    }
  };

  users.forEach(chatId => {
    bot.sendMessage(chatId, messageText, options);
  });

  console.log(`📆 Sent 9AM task message to ${users.length} users.`);
});

// ⏰ Evening Check-In at 8PM UTC
cron.schedule('0 20 * * *', () => {
  if (!fs.existsSync(USERS_FILE)) return;
  const users = JSON.parse(fs.readFileSync(USERS_FILE));

  const messageText = eveningCheckIns[Math.floor(Math.random() * eveningCheckIns.length)] + `\n\n👉 Tap below to revisit your tasks, check updates, or simply reconnect with your fellow DreamKeepers!`;

  const options = {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [{ text: "📲 Go to Members Hub", url: "https://dreamkeepers.btncaliofficial.com" }]
      ]
    }
  };

  users.forEach(chatId => {
    bot.sendMessage(chatId, messageText, options);
  });

  console.log(`🌙 Sent 8PM check-in to ${users.length} users.`);
});

// /start
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const name = msg.from.first_name || "DreamKeeper";
  saveUser(chatId);
  bot.sendMessage(chatId, `👋 Hey ${name}! Welcome to *BTN Cali Official*! 💙\n\nUse /menu to see what I can do.\n\nTo connect your Telegram for website notifications, use /getchatid to copy your ID!`, {
    parse_mode: "Markdown",
    ...mainMenuKeyboard
  });
});

// /listusers — admin only
bot.onText(/\/listusers/, (msg) => {
  const userId = msg.from.id;
  const chatId = msg.chat.id;

  if (!isAdmin(userId)) {
    return bot.sendMessage(chatId, "🚫 This command is for admins only.");
  }

  let users = [];
  if (fs.existsSync(USERS_FILE)) {
    users = JSON.parse(fs.readFileSync(USERS_FILE));
  }

  const output = users.length
    ? `📋 *Registered Users:* ${users.length}\n` + users.map(id => `• \`${id}\``).join('\n')
    : `⚠️ No users have registered yet.`;

  bot.sendMessage(chatId, output, { parse_mode: "Markdown" });
});

// /removeuser [chatId] — admin only
bot.onText(/\/removeuser (\d+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  if (!isAdmin(userId)) {
    return bot.sendMessage(chatId, "🚫 This command is for admins only.");
  }

  const idToRemove = match[1];
  if (!fs.existsSync(USERS_FILE)) {
    return bot.sendMessage(chatId, "⚠️ User list not found.");
  }

  let users = JSON.parse(fs.readFileSync(USERS_FILE));
  if (!users.includes(idToRemove)) {
    return bot.sendMessage(chatId, `⚠️ Chat ID \`${idToRemove}\` not found in the user list.`, { parse_mode: "Markdown" });
  }

  users = users.filter(id => id !== idToRemove);
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));

  bot.sendMessage(chatId, `✅ Removed user \`${idToRemove}\` from the list.`, { parse_mode: "Markdown" });
});

// /menu
bot.onText(/\/menu/, (msg) => {
  const chatId = msg.chat.id;
  const menu = `
📋 *Cali Bot Menu*

/start – 👋 Welcome message  
/menu – 📋 See what I can do  
/getchatid – 🆔 Get your Telegram Chat ID  
/profile – 📸 About BTN Cali Official  
/support – 🛠️ Need Help?  
/links – 🔗 Official links  
/notifications – 🔔 Available alerts  
/listusers – 📋 Show all saved users (admin)  
/removeuser [chatId] – ❌ Remove user (admin)  
/broadcast – 📢 Send preview (admin only)
  `;
  bot.sendMessage(chatId, menu, { parse_mode: "Markdown", ...mainMenuKeyboard });
});

// /getchatid
bot.onText(/\/getchatid/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, `🆔 *Your Chat ID is:* \`${chatId}\`\n\nCopy this and paste it into the Telegram Chat ID box on our site!`, {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [{ text: "⚒️🔔 Setup Notifications", url: "https://dreamkeepers.btncaliofficial.com/settings" }]
      ]
    }
  });
});

// /profile
bot.onText(/\/profile/, (msg) => {
  const chatId = msg.chat.id;
  const info = `
📸 *BTN Cali Official*

BTN Cali Official is a global fan-driven support hub created by Cali DreamKeepers 💙  
Our goal is to promote, support, and uplift Cali's journey as he aims to debut through *Be The Next 9 Dreamers*.

We share tasks, voting guides, media, and updates to help you support Cali — together, we're unstoppable! 🌟
  `;
  bot.sendMessage(chatId, info, { parse_mode: "Markdown", ...mainMenuKeyboard });
});

// /support
bot.onText(/\/support/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, `
❓ *Need Help?*

If you’re experiencing any issues, questions, or need assistance with the site or your account, feel free to contact us.

📩 Email: hello@btncaliofficial.com

We’re here for you, Cali DreamKeeper! 💙
  `, { parse_mode: "Markdown", ...mainMenuKeyboard });
});

// /links
bot.onText(/\/links/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, `
🔗 *BTN Cali Official Links*

📸 Instagram: https://instagram.com/btncaliofficial  
🐦 Twitter/X: https://x.com/btncaliofficial  
📺 YouTube: https://youtube.com/@btncaliofficial  
📲 Vote App: https://btnvote.com  
🌐 Website: https://btncaliofficial.com  
🧑‍🤝‍🧑 Members-Only Hub: https://dreamkeepers.btncaliofficial.com
  `, {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [
          { text: "🌐 Visit Website", url: "https://btncaliofficial.com" },
          { text: "🧑‍🤝‍🧑 Members Hub", url: "https://dreamkeepers.btncaliofficial.com" }
        ]
      ]
    }
  });
});

// /notifications
bot.onText(/\/notifications/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, `
🔔 *Available Notifications*

✅ *Task Updates* – when a submission is reviewed  
📢 *New Announcements* – major updates  
🏆 *Leaderboard Updates* – your rank changes  
💬 *@Mentions* – when someone mentions you  
🗨️ *Talkspace Alerts* – for replies & likes  
📤 *Pending Approvals* – for submitted content

You can manage these from your website profile! 💙
  `, { parse_mode: "Markdown", ...mainMenuKeyboard });
});

// /broadcast — admin only
bot.onText(/\/broadcast (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  if (!isAdmin(userId)) {
    return bot.sendMessage(chatId, "🚫 This command is only for admins.");
  }

  const messageToSend = match[1];

  bot.sendMessage(chatId, `📢 *Broadcast Preview:*\n\n${messageToSend}`, {
    parse_mode: "Markdown"
  });
});

// Keep-alive
app.get('/', (req, res) => {
  res.send('🤖 Cali Bot is alive!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌐 Web server running on port ${PORT}`);
});

console.log("🤖 Bot is running...");