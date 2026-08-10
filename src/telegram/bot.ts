/** Telegram adapter: web app never depends on the token. */
if(!process.env.TELEGRAM_BOT_TOKEN){console.log("TELEGRAM_BOT_TOKEN не задан — бот отключён.");process.exit(0)}
console.log("Telegram adapter is configured. Install a bot transport before production use.");
