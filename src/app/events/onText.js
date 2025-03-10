/* eslint-disable no-tabs */
const moment = require('moment');

const AppController = require('../../controller/AppController');
const DatabaseQuerys = require('../../controller/DatabaseQuerys');
const deleteMessage = require('../../scripts/deleteMessage');
const reply = require('../../scripts/reply');

async function onText(ctx) {
  if (ctx.session.waitingForPropiertyValue) {
    const { index } = ctx.session.waitingForPropiertyValue;
    const propiertyID = ctx.session.waitingForPropiertyValue.id;

    let userInput = ctx.message.text.trim();

    // If not exists the properties values propierty, create it
    if (!ctx.session.dataForAdd[index].propertiesValues) {
      ctx.session.dataForAdd[index].propertiesValues = {};
    }

    const propierty = Object.values(
      ctx.session.dataForAdd[index].properties,
    ).find((prop) => prop.id === propiertyID);

    const urlReg = new RegExp(
      '^(https?:\\/\\/)?' // protocol
					+ '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|' // domain name
					+ '((\\d{1,3}\\.){3}\\d{1,3}))' // OR ip (v4) address
					+ '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' // port and path
					+ '(\\?[;&a-z\\d%_.~+=-]*)?' // query string
					+ '(\\#[-a-z\\d_]*)?$',
      'i',
    ); // fragment locator
    // Credits: https://stackoverflow.com/a/5717133/18740899

    // Check if the value is valid
    let message;

    switch (propierty.type) {
      case 'files':
        if (!urlReg.test(userInput)) {
          message = "This don't look like a URL";
        }
        break;

      case 'number':
        if (Number.isNaN(parseInt(userInput, 10))) {
          message = "That's not a number";
        }
        break;

      case 'url':
        if (!urlReg.test(userInput)) {
          message = "This don't look like a URL";
        }
        break;

      case 'date':
        userInput = moment(userInput).format().toString();
        if (!moment(userInput).isValid()) {
          message = "This don't look like a date";
        }
        break;

      default:
        break;
    }

    if (message) {
      await reply(ctx, message);
      return;
    }

    // Parse text
    switch (propierty.type) {
      case 'files':
        userInput = [
          {
            type: 'external',
            name: userInput,
            external: {
              url: userInput,
            },
          },
        ];
        break;
      case 'number':
        userInput = parseInt(userInput, 10);
        break;

      case 'rich_text':
        userInput = [{ type: 'text', text: { content: userInput } }];
        break;

      case 'title':
        ctx.session.dataForAdd[index].data.title = userInput;
        userInput = [{ text: { content: userInput } }];
        break;

      case 'date':
        userInput = { start: userInput };
        break;
      default:
        break;
    }

    // Save value on storage
    ctx.session.dataForAdd[index].propertiesValues[propiertyID] = userInput;

    // Confirm to user the saved prop
    try {
      await reply(ctx, `Data added to ${propierty.name}`);
      await deleteMessage(ctx, ctx.update.message.message_id - 1);
    } catch (err) {
      console.log(err);
    }
    // Return the list of properties to user
    AppController.t_response(ctx).properties(
      ctx.from.id,
      ctx.session.dataForAdd[index].listOfpropertiesQuery,
    );

    // App not longer waits for propierty value...
    ctx.session.waitingForPropiertyValue = false;

    return;
  }

  const defaultDatabase = await DatabaseQuerys().getDefaultDatabase(ctx?.from?.id);
  if (defaultDatabase?.defaultDatabaseId) {
    const { defaultDatabaseId, defaultDatabaseName } = defaultDatabase;
    ctx.session.dataForAdd.push({ type: 'text', data: { title: ctx.message.text.trim() } });
    await AppController.t_response(ctx).properties(ctx?.from?.id, `db_${defaultDatabaseId}dt_textin_${ctx.session.dataForAdd.length - 1}`, defaultDatabaseName);
    return;
  }
  const databases = await AppController.notion.getDatabases(ctx?.from?.id);

  if (databases.status === 'error') {
    switch (databases.message) {
      case 'no auth code':
        reply(ctx, 'No auth code provided\n*Use the /auth command for provide it*', { parse_mode: 'MarkdownV2' });
        break;

      default:
        reply(ctx, 'Unknow error\n*Try again later*', { parse_mode: 'MarkdownV2' });
        break;
    }

    return;
  }

  // Add text to array of texts
  const text = ctx.message.text.trim();
  const obj = { type: 'text', data: { title: text } };
  ctx.session.dataForAdd.push(obj);

  const botReply = text.length > 20 ? `\n\n${text}` : text;

  // Generate Keyboard from the databases
  const keyboard = AppController.generateKeyboard.databases(databases.results, null, 'text', ctx.session.dataForAdd);

  try {
    await reply(ctx, `Select the <strong>database</strong> to save <strong>${botReply}</strong>`, { ...keyboard, parse_mode: 'HTML' });
  } catch (err) {
    console.log(err);
  }
}

module.exports = onText;
