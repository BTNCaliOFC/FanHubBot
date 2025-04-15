const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const app = express();

// Replace with your actual Bot Token
const token = process.env.BOT_TOKEN;

const bot = new TelegramBot(token, { polling: true });

// Telegram command handler
bot.onText(/\/getchatid/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, `Your Chat ID is: ${chatId}`);
});

// Add a simple web server to keep the repl alive
app.get('/', (req, res) => {
  res.send('🤖 Bot is alive!');
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌐 Web server running on port ${PORT}`);
});

console.log('🤖 Bot is running...');