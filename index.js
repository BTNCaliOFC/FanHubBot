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
  0: `🌤️ *Happy Sunday, Cali DreamKeeper!*\n\nTake this beautiful Sunday to rest, reflect, and reset. 🌿\nBut don’t forget — even a little support goes a long way. Your daily task, kind words, or share can make a big difference. 💙\n\nLet’s start the new week strong by showing up for Cali today.\n✨ *You are the dream that keeps Cali going.*\n\n👉 Complete your Sunday task now!`,

  1: `🌟 *Motivation Monday!*\n\nIt’s a brand new week — and a fresh start to chase big dreams! 🌠\nLet’s kick off Monday with positivity, passion, and purpose. 💪\n\nYour support isn’t just appreciated — it’s powerful. Each action you take brings Cali closer to the stage. 🌍\n\n*You were made to shine, Cali DreamKeeper.* 💙\n\n👉 Start your week with Cali!`,

  2: `💪 *Task-Focused Tuesday!*\n\nDreams take action — and Tuesdays are perfect for putting in the work! 🚀\nCali is counting on us, one step at a time. Every completed task brings us closer to our goal. ✨\n\nYour consistency inspires. Your support matters. Your heart shows through.\nLet’s keep moving, keep doing, and keep dreaming. 🎯\n\n👉 Check today’s task list!`,

  3: `🧠 *Wisdom Wednesday!*\n\nIt’s midweek — the perfect time to reflect, reset, and refocus. 💭\nSupporting Cali isn’t just about numbers — it’s about connection, intention, and community. 💙\n\nBe wise with your time. Choose actions that uplift and inspire — for Cali and for yourself. 🌟\n\n🔍 *One click is all it takes to keep the momentum going.*\n\n👉 Support Cali now!`,

  4: `🔥 *Thriving Thursday!*\n\nLook how far you’ve come, DreamKeeper! 💫\nThursdays are for growth — and today is another step toward your dreams *and* Cali’s. 🌱\n\nStay focused. Stay kind. Stay fired up. 🔥\nThe energy you bring is what makes this fandom thrive.\n\nLet’s make today count. Let’s make today magical. 💙\n\n👉 Thrive with Cali today!`,

  5: `🎉 *Feel-Good Friday!*\n\nYou’ve made it through the week — and that’s worth celebrating! 🥳\nBut before we rest, let’s finish strong and give Cali that final push of the week. 💪\n\nA completed task today could mean more points, more rewards, and more support for Cali’s journey. 💖\n\n*So take a moment, show your love, and enjoy that feel-good Friday feeling.*\n\n👉 Wrap up the week with Cali!`,

  6: `🌈 *Supportive Saturday!*\n\nWeekends were made for fandom love and good vibes! ✨\nLet’s spend today sending encouragement, sharing joy, and completing one more meaningful task for Cali. 📣\n\nTogether, we’re building more than a fandom — we’re building a family that supports and uplifts. 💙\n\n💌 *So take a deep breath and spread that Cali DreamKeeper magic.*\n\n👉 Join today’s task & spread the love!`
};

// 🌙 Evening Check-Ins
const eveningCheckIns = [
  `🌙 *How was your day, Cali DreamKeeper?*\n\nWe hope it was filled with little joys and moments that made your heart smile. No matter how today went, thank you for showing up and continuing to dream with us. 💙\n\n📝 *Share your day in our Fan Hub — someone out there needs your story too!*`,

  `💤 *Before you rest...*\n\nJust a reminder that every small effort counts. Even simply showing up is a powerful act of love and commitment. You’re doing great, even if it doesn’t always feel that way. 🌟\n\n💬 *Drop by the group chat and tell us one moment that made you smile today!*`,

  `🌌 *The stars are proud of you — and so are we.* 💙\n\nYou've made it through another day. Rest tonight knowing that your energy, love, and support are shaping something beautiful. Keep dreaming big, CaliDreamKeeper.\n\n🌟 *Mention someone in the group chat who inspired you this week!*`,

  `🌌 *Time to slow down, Cali DreamKeeper.*\n\nTake a deep breath. The day is done, and you’ve done your part. Let go of the weight you’re carrying — we’re here for you.\n\n🧘 *Check in with the Fan Hub before bed and let us know how you’re feeling tonight.*`,

  `🧸 *Hope your heart feels light tonight.*\n\nNo matter what today brought, you are enough. We’re proud of your strength and your softness. Wanna talk about your day?\n\n📝 *Write a mini journal entry in our Fan Hub — we’d love to hear your thoughts.*`,

  `✨ *Another day done!*\n\nYou’ve carried so much with grace. Whether you laughed, cried, or just took a breath — it all matters. Rest now and know you are appreciated.\n\n📸 *Share a moment from your day in our Group Chat that brought you joy.*`,

  `💤 *The stars are out, and so is your light.*\n\nYou deserve calm, comfort, and rest. Let the night wrap around you gently. You did your best today. 🌠\n\n💌 *Say goodnight to the fandom in the chat — let’s rest together with hearts full.*`,

  `🌙 *It’s okay to have off days.*\n\nYou don’t have to be perfect to be powerful. You showed up — and that’s everything. We’re always proud of you.\n\n🤝 *Send an encouraging message to someone in our group chat tonight.*`,

  `📖 *Before the day ends...*\n\nCan you name one thing that made you feel grateful today? Big or small, it all counts. Gratitude fuels peace. 💭\n\n📥 *Drop your gratitude moment in the Fan Hub — let’s uplift each other!*`,

  `🌃 *The night is calm and you’re safe here.*\n\nYou don’t have to go through things alone. As you settle in, remember: this is a space built on love and trust. 💙\n\n👂 *Pop into the chat and let us know how your day went — we’re here to listen.*`,

  `🕯️ *Even the small wins count.*\n\nMaybe you rested. Maybe you helped someone. Maybe you just survived. That’s still worthy of celebration. You did great. 💪\n\n🎉 *Celebrate one small win in the Fan Hub tonight!*`,

  `💬 *Let’s end the day on a kind note.*\n\nYou made someone’s life better today — maybe even just by being there. Kindness matters. Connection matters.\n\n🗣️ *Tell us in the group chat: what was the kindest thing you experienced today?*`,

  `🫶 *You matter.*\n\nHow are you really feeling tonight? Your emotions are valid, your presence is powerful, and you’re never alone here.\n\n📲 *Head over to our Group Chat in the Fan Hub and let us know your vibe tonight.*`,

  `🛏️ *Even stars need rest.*\n\nYou don’t need to earn your rest. You deserve it just by being here and being human. Let go of the guilt — you are doing enough. 🌙\n\n🌌 *Say goodnight in the group chat and send someone a virtual hug!*`,

  `🌠 *Quiet nights are for reflection.*\n\nWhat surprised you today? A small moment, a lesson, a laugh? Those tiny sparks add magic to the journey.\n\n🔍 *Share your surprise of the day in the Fan Hub — let’s reflect together.*`,

  `😌 *Another chapter ends today.*\n\nEvery ending makes room for something new. No matter what this day held, tomorrow is yours to shape. We’re rooting for you.\n\n🖋️ *Write your hope or intention for tomorrow in our Dream Wall thread.*`,

  `💙 *Cali’s proud of you — and so are we.*\n\nYou’re part of something special. Even when you feel small, your support echoes through our dreams. Sleep tight knowing you made a difference today. 💫\n\n🌈 *Send a message of appreciation in our Fan Hub before you log off.*`,

  `🌜 *Think of one thing that made you smile today.*\n\nA word, a laugh, a moment of peace — keep that close as you rest. Let it be your anchor for tonight.\n\n🎶 *Drop a photo, a quote, or a song in the group chat that lifted your spirit today!*`
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