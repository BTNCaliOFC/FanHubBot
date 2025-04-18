const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const https = require('https');
const csv = require('csv-parser');
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
  0: `🌤️ *Happy Sunday, Cali DreamKeeper!*\n\nTake time to recharge, but don’t forget — your support fuels Cali’s dreams. 💙`,
  1: `🌟 *Motivation Monday!*\n\nA new week, a new chance to shine ✨`,
  2: `💪 *Task-Focused Tuesday!*\n\nYou’ve got what it takes to push Cali closer to debut 🌍`,
  3: `🧠 *Wisdom Wednesday*\n\nMidweek magic starts with one click!`,
  4: `🔥 *Thriving Thursday!*\n\nAnother chance to grow, support, and lead 🌱`,
  5: `🎉 *Feel-Good Friday!*\n\nEnd the week strong — complete your tasks 💌`,
  6: `🌈 *Supportive Saturday*\n\nTime to boost Cali with energy and votes ⚡`
};

// 🌙 Evening Check-In Pool (8PM UTC)
const eveningCheckIns = [
  `🌙 *How was your day, DreamKeeper?* We hope it was filled with joy and purpose. 💙`,
  `💤 *Before you rest...* Just know that showing up matters. 🌟`,
  `🌌 *The stars are proud of you — and so are we.* 💙 Keep dreaming big.`,
  `🌌 Time to slow down, Cali DreamKeeper. How was your day today?`,
  `🧸 Hope your heart feels light tonight. Wanna share how your day went?`,
  `✨ Another day done! Sending hugs and good vibes your way. 💙`,
  `💤 The stars are out. Take a moment for yourself tonight, you deserve it.`,
  `🌙 It’s okay to have off days. Just know we’re proud of you, always.`,
  `📖 Before the day ends, tell me one good thing that happened today.`,
  `🌃 The night is calm and you’re safe here. How was your day, Cali DreamKeeper?`,
  `🕯️ Even small wins today count. You did great! Rest well later.`,
  `💬 Let’s end the day on a kind note. Want to tell me your highlight today?`,
  `🫶 You matter. Just checking in — how are you really feeling tonight?`,
  `🛏️ Remember, it’s okay to take breaks. Even stars need to rest.`,
  `🌠 Quiet nights are perfect for reflection. Did anything surprise you today?`,
  `😌 Another chapter ends today. Let’s write a better one tomorrow.`,
  `💙 Cali’s proud of you — and so are we. Good night, DreamKeeper.`,
  `🌜 Think of one thing that made you smile today. Hold on to it.`
];

// ✅ DAILY TASK BROADCAST – 9AM UTC
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

// ✅ EVENING CHECK-IN – 8PM UTC
cron.schedule('0 20 * * *', () => {
  if (!fs.existsSync(USERS_FILE)) return;
  const users = JSON.parse(fs.readFileSync(USERS_FILE));
  const messageText = eveningCheckIns[Math.floor(Math.random() * eveningCheckIns.length)] + `\n\n👉 Tap below to revisit your tasks or reconnect 💙`;

  const options = {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [{ text: "📲 Go to Fan Hub", url: "https://dreamkeepers.btncaliofficial.com" }]
      ]
    }
  };

  users.forEach(chatId => {
    bot.sendMessage(chatId, messageText, options);
  });
  console.log(`🌙 Sent 8PM check-in to ${users.length} users.`);
});

// ✅ GOOGLE SHEET REMINDERS – every 5 mins
const EVENT_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTddey2pYPf7EV0nEQfv1fUMmHMctWLxH1itFA1SjThWu4ygpNUDxM021-L38c2F1C8HufC51I8FPw3/pub?output=csv";

cron.schedule('*/5 * * * *', () => {
  const currentUTC = new Date();
  const currentDate = currentUTC.toISOString().split('T')[0]; // YYYY-MM-DD
  const currentTime = currentUTC.toISOString().split('T')[1].substring(0, 5); // HH:MM

  const events = [];

  https.get(EVENT_CSV_URL, (res) => {
    res.pipe(csv())
      .on('data', (row) => {
        const rowDate = row["Date"];
        const rowTime = row["Time"];
        const message = row["Message"];

        if (rowDate === currentDate && rowTime === currentTime) {
          events.push(message);
        }
      })
      .on('end', () => {
        if (events.length && fs.existsSync(USERS_FILE)) {
          const users = JSON.parse(fs.readFileSync(USERS_FILE));

          events.forEach(msgText => {
            users.forEach(chatId => {
              bot.sendMessage(chatId, `📣 *Event Reminder!*\n\n${msgText}`, {
                parse_mode: "Markdown"
              });
            });
            console.log(`📅 Sent reminder: ${msgText}`);
          });
        }
      });
  });
});

// ✅ /start
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const name = msg.from.first_name || "DreamKeeper";
  saveUser(chatId);
  bot.sendMessage(chatId, `👋 Hey ${name}! Welcome to *BTN Cali Official*! 💙\n\nUse /menu to see what I can do.\n\nUse /getchatid to connect your notifications!`, {
    parse_mode: "Markdown",
    ...mainMenuKeyboard
  });
});

// ✅ /getchatid
bot.onText(/\/getchatid/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, `🆔 *Your Chat ID is:* \`${chatId}\`\n\nPaste this into your profile at dreamkeepers.btncaliofficial.com.`, {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [{ text: "⚒️🔔 Setup Notifications", url: "https://dreamkeepers.btncaliofficial.com/settings" }]
      ]
    }
  });
});

// ✅ /menu
bot.onText(/\/menu/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, `
📋 *Cali Bot Menu*

/start – 👋 Welcome message  
/menu – 📋 Show commands  
/getchatid – 🆔 Get your Telegram Chat ID  
/profile – 📸 About BTN Cali Official  
/support – 🛠️ Need Help?  
/links – 🔗 Official links  
/notifications – 🔔 Alerts info  
/listusers – 👥 View saved users (admin)  
/removeuser [chatId] – ❌ Remove user (admin)  
/broadcast – 🗣️ Preview message (admin only)  
/broadcastall [message] – 📢 Send to all users
`, { parse_mode: "Markdown", ...mainMenuKeyboard });
});

// ✅ /profile
bot.onText(/\/profile/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, `
📸 *BTN Cali Official*

We’re a fan-driven support hub for Cali’s journey on *Be The Next 9 Dreamers*.  
Join us in tasks, voting, media, and uplifting Cali's dream! 💙
`, { parse_mode: "Markdown", ...mainMenuKeyboard });
});

// ✅ /support
bot.onText(/\/support/, (msg) => {
  bot.sendMessage(msg.chat.id, `
❓ *Need Help?*

📩 Email: hello@btncaliofficial.com  
We’re here for you, Cali DreamKeeper! 💙
`, { parse_mode: "Markdown", ...mainMenuKeyboard });
});

// ✅ /links
bot.onText(/\/links/, (msg) => {
  bot.sendMessage(msg.chat.id, `
🔗 *BTN Cali Official Links*

📸 Instagram: https://instagram.com/btncaliofficial  
🐦 X: https://x.com/btncaliofficial  
📺 YouTube: https://youtube.com/@btncaliofficial  
📲 Vote App: https://btnvote.com  
🌐 Website: https://btncaliofficial.com  
🧑‍🤝‍🧑 Hub: https://dreamkeepers.btncaliofficial.com
`, {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [{ text: "🌐 Visit Website", url: "https://btncaliofficial.com" }],
        [{ text: "🧑‍🤝‍🧑 Members Hub", url: "https://dreamkeepers.btncaliofficial.com" }]
      ]
    }
  });
});

// ✅ /notifications
bot.onText(/\/notifications/, (msg) => {
  bot.sendMessage(msg.chat.id, `
🔔 *Available Notifications*

✅ Task Updates  
📢 Announcements  
🏆 Leaderboard Changes  
💬 Mentions & Replies  
📤 Pending Submissions
`, { parse_mode: "Markdown", ...mainMenuKeyboard });
});

// ✅ /listusers (admin)
bot.onText(/\/listusers/, (msg) => {
  if (!isAdmin(msg.from.id)) return bot.sendMessage(msg.chat.id, "🚫 Admin only.");
  const users = fs.existsSync(USERS_FILE) ? JSON.parse(fs.readFileSync(USERS_FILE)) : [];
  const out = users.length ? `👥 *Users:* ${users.length}\n` + users.map(u => `• \`${u}\``).join('\n') : `⚠️ No users found.`;
  bot.sendMessage(msg.chat.id, out, { parse_mode: "Markdown" });
});

// ✅ /removeuser [chatId] (admin)
bot.onText(/\/removeuser (\d+)/, (msg, match) => {
  if (!isAdmin(msg.from.id)) return bot.sendMessage(msg.chat.id, "🚫 Admin only.");
  const idToRemove = match[1];
  let users = fs.existsSync(USERS_FILE) ? JSON.parse(fs.readFileSync(USERS_FILE)) : [];

  if (!users.includes(idToRemove)) {
    return bot.sendMessage(msg.chat.id, `❌ ID \`${idToRemove}\` not found.`, { parse_mode: "Markdown" });
  }

  users = users.filter(id => id !== idToRemove);
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
  bot.sendMessage(msg.chat.id, `✅ Removed \`${idToRemove}\` from user list.`, { parse_mode: "Markdown" });
});

// ✅ /broadcast (admin preview)
bot.onText(/\/broadcast (.+)/, (msg, match) => {
  if (!isAdmin(msg.from.id)) return bot.sendMessage(msg.chat.id, "🚫 Admin only.");
  const messageToSend = match[1];
  bot.sendMessage(msg.chat.id, `📢 *Preview:*\n\n${messageToSend}`, { parse_mode: "Markdown" });
});

// ✅ /broadcastall [message]
bot.onText(/\/broadcastall (.+)/, (msg, match) => {
  if (!isAdmin(msg.from.id)) return bot.sendMessage(msg.chat.id, "🚫 Admin only.");
  const users = fs.existsSync(USERS_FILE) ? JSON.parse(fs.readFileSync(USERS_FILE)) : [];
  const message = match[1];

  users.forEach(id => {
    bot.sendMessage(id, message);
  });

  bot.sendMessage(msg.chat.id, `📣 Broadcast sent to ${users.length} users.`);
});

// 🌐 Keep-alive
app.get('/', (req, res) => {
  res.send('🤖 Cali Bot is alive!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌐 Web server running on port ${PORT}`);
});

console.log("🤖 Bot is running...");