const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const https = require('https');
const csv = require('csv-parser');
const moment = require('moment-timezone');
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

// 🌞 Daily Morning Messages
const dailyMessagesByDay = {
  0: `🌤️ *Happy Sunday, Cali DreamKeeper!*\n\nTake time to recharge, but don’t forget — your support fuels Cali’s dreams. 💙`,
  1: `🌟 *Motivation Monday!*\n\nA new week, a new chance to shine ✨`,
  2: `💪 *Task-Focused Tuesday!*\n\nYou’ve got what it takes to push Cali closer to debut 🌍`,
  3: `🧠 *Wisdom Wednesday*\n\nMidweek magic starts with one click!`,
  4: `🔥 *Thriving Thursday!*\n\nAnother chance to grow, support, and lead 🌱`,
  5: `🎉 *Feel-Good Friday!*\n\nEnd the week strong — complete your tasks 💌`,
  6: `🌈 *Supportive Saturday*\n\nTime to boost Cali with energy and good vibes ⚡`
};

// 🌙 Evening Check-Ins
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

// 9AM Broadcast (Manila Time) → 1:00 AM UTC
cron.schedule('0 1 * * *', () => {
  if (!fs.existsSync(USERS_FILE)) return;

  const users = JSON.parse(fs.readFileSync(USERS_FILE));
  const messageText = dailyMessagesByDay[new Date().getDay()];
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

  const utcNow = moment.utc().format('YYYY-MM-DD HH:mm:ss');
  const manilaNow = moment().tz("Asia/Manila").format('YYYY-MM-DD HH:mm:ss');

  console.log(`📆 Sent 9AM (Manila) task message to ${users.length} users.`);
  console.log(`🕒 Time now - UTC: ${utcNow}, Manila: ${manilaNow}`);
});

// 8PM Check-in (Manila Time) → 12:00 PM UTC
cron.schedule('0 12 * * *', () => {
  if (!fs.existsSync(USERS_FILE)) return;

  const users = JSON.parse(fs.readFileSync(USERS_FILE));
  const messageText =
    eveningCheckIns[Math.floor(Math.random() * eveningCheckIns.length)] +
    `\n\n👉 Tap below to revisit your tasks or reconnect 💙`;

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

  const utcNow = moment.utc().format('YYYY-MM-DD HH:mm:ss');
  const manilaNow = moment().tz("Asia/Manila").format('YYYY-MM-DD HH:mm:ss');

  console.log(`🌙 Sent 8PM (Manila) check-in to ${users.length} users.`);
  console.log(`🕒 Time now - UTC: ${utcNow}, Manila: ${manilaNow}`);
});

// 📅 Google Sheet Event Reminders
const EVENT_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTddey2pYPf7EV0nEQfv1fUMmHMctWLxH1itFA1SjThWu4ygpNUDxM021-L38c2F1C8HufC51I8FPw3/pub?output=csv";

cron.schedule('*/5 * * * *', () => {
  const currentUTC = new Date();
  const currentDate = currentUTC.toISOString().split('T')[0];
  const currentTime = currentUTC.toISOString().split('T')[1].substring(0, 5);
  const events = [];

  https.get(EVENT_CSV_URL, (res) => {
    res.pipe(csv())
      .on('data', (row) => {
        if (row["Date"] === currentDate && row["Time"] === currentTime) {
          events.push(row["Message"]);
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

// 🔘 BOT COMMANDS
bot.onText(/\/start/, (msg) => {
  saveUser(msg.chat.id);
  bot.sendMessage(msg.chat.id, `👋 Hey ${msg.from.first_name || "DreamKeeper"}! Welcome to *BTN Cali Official*! 💙\n\nUse /menu to see what I can do.`, {
    parse_mode: "Markdown",
    ...mainMenuKeyboard
  });
});

bot.onText(/\/getchatid/, (msg) => {
  bot.sendMessage(msg.chat.id, `🆔 *Your Chat ID is:* \`${msg.chat.id}\`\n\nPaste this into your profile at dreamkeepers.btncaliofficial.com.`, {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [{ text: "⚒️🔔 Setup Notifications", url: "https://dreamkeepers.btncaliofficial.com/settings" }]
      ]
    }
  });
});

bot.onText(/\/menu/, (msg) => {
  bot.sendMessage(msg.chat.id, `
📋 *BTN Cali Fan Hub Bot Menu*

/start – 👋 Welcome message  
/menu – 📋 Show commands  
/getchatid – 🆔 Get your Telegram Chat ID  
/profile – 📸 About BTN Cali Official  
/support – 🛠️ Need Help?  
/links – 🔗 Official links  
/notifications – 🔔 Alerts info  
/listusers – 👥 View saved users (admin)  
/removeuser [chatId] – ❌ Remove user (admin)  
/broadcast – 🗣️ Preview message (admin)  
/broadcastall – 🗣️ Send message to all users (admin)  
  `);
});

bot.onText(/\/broadcastall (.+)/, (msg, match) => {
  const text = match[1];

  if (isAdmin(msg.from.id)) {
    if (!fs.existsSync(USERS_FILE)) return;

    const users = JSON.parse(fs.readFileSync(USERS_FILE));
    users.forEach(chatId => {
      bot.sendMessage(chatId, text, { parse_mode: "Markdown" });
    });

    bot.sendMessage(msg.chat.id, `📢 Message broadcasted to ${users.length} users.`);
  } else {
    bot.sendMessage(msg.chat.id, "🚫 You do not have permission to use this command.");
  }
});

// Admin: List all saved users
bot.onText(/\/listusers/, (msg) => {
  if (isAdmin(msg.from.id)) {
    if (fs.existsSync(USERS_FILE)) {
      const users = JSON.parse(fs.readFileSync(USERS_FILE));
      let userList = users.join('\n');
      bot.sendMessage(msg.chat.id, `👥 List of saved users:\n\n${userList}`);
    } else {
      bot.sendMessage(msg.chat.id, "🔴 No users found.");
    }
  } else {
    bot.sendMessage(msg.chat.id, "🚫 You do not have permission to view the user list.");
  }
});