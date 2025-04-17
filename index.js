const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const app = express();

// 🔐 Admin Setup
const ADMINS = ['5999791089']; // Marti is the admin
function isAdmin(userId) {
  return ADMINS.includes(userId.toString());
}

// Load bot token from environment
const token = process.env.BOT_TOKEN;

// Initialize bot
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

// /start
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const name = msg.from.first_name || "DreamKeeper";
  bot.sendMessage(chatId, `👋 Hey ${name}! Welcome to *BTN Cali Official*! 💙\n\nUse /menu to see what I can do.\n\nTo connect your Telegram for website notifications, use /getchatid to copy your ID!`, {
    parse_mode: "Markdown",
    ...mainMenuKeyboard
  });
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
/broadcast – 📢 (Admin only)
  `;
  bot.sendMessage(chatId, menu, { parse_mode: "Markdown", ...mainMenuKeyboard });
});

// /getchatid
bot.onText(/\/getchatid/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, `🆔 *Your Chat ID is:* \`${chatId}\`\n\nCopy this and paste it into the Telegram Chat ID box on our site!
`, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            { text: "⚒️🔔 Setup Notifications", url: "https://dreamkeepers.btncaliofficial.com/settings" }
          ]
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

// 🔐 /broadcast – Admin-only
bot.onText(/\/broadcast (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  if (!isAdmin(userId)) {
    return bot.sendMessage(chatId, "🚫 This command is only for admins.");
  }

  const messageToSend = match[1];

  // Future: Loop through all users from a DB
  bot.sendMessage(chatId, `📢 *Broadcast Preview:*\n\n${messageToSend}`, {
    parse_mode: "Markdown"
  });
});

// Express web server to keep alive
app.get('/', (req, res) => {
  res.send('🤖 Cali Bot is alive!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌐 Web server running on port ${PORT}`);
});

console.log("🤖 Bot is running...");