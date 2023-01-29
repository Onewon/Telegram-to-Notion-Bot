const reply = require('../../scripts/reply');

function auth(ctx) {
  ctx.session.waitingForAuthCode = true;

  reply(ctx, 'Tap here 👇 for authorize the bot on Notion and paste the resulting code', {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: 'Authorize',
            url: `https://api.notion.com/v1/oauth/authorize?client_id=${process.env.NOTION_INTEGRATION_ID}&response_type=code&owner=user&redirect_uri=${process.env.WEBSITE_URL}`,
          },
        ],
      ],
    },
  });
}

module.exports = auth;
