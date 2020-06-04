const { RTMClient } = require('@slack/rtm-api');
const axios = require('axios');
var Chance = require('chance');

var chance = new Chance();

const config = require('./config.json');

// state

let data = {
    botId: '',
    activeThread: null,
}

// func

async function getText(input, size = 30) {
    const res = await axios.post('https://models.dobro.ai/gpt2/medium/', {
        length: size,
        num_samples: 1,
        prompt: input,
    });
    return res.data.replies[0];
}

function formatPost(text) {
    let res = text.replace(/\s+$/, '');
    if (res[res.length - 1] !== '.' && res[res.length - 1] !== '?' && res[res.length - 1] !== '!') {
        res = res + '.';
    }
    return res;
}

function searchName(text) {
    let message = text.toLowerCase();
    return message.includes('анчик') || message.includes('анус') || message.includes('анчоус');
}

async function checkPost(event) {
    if (event.text.length > 150) {
        return;
    }
    const themes = [
        {
            core: 'У меня идея: приложение для',
            label: 'Я дропнул старый проект и удалил репозиторий. Теперь у меня новый проект - я делаю приложение для',
        },
        {
            core: 'Вчера я выпил бутылку',
            label: 'У меня такая история случилась. Вчера я выпил бутылку',
        },
        {
            core: 'Я делал ремонт в своей комнате, как вдруг',
            label: 'Блять, как же они меня заебали. Я делал ремонт в своей комнате, как вдруг',
        },
        {
            core: 'Я не могу пойти на работу, потому что',
            label: 'Я уже устал вам объяснять. Я не могу пойти на работу, потому что',
        },
    ]
    const num = chance.natural({ min: 1, max: 100 });
    if (num > 50) {
        const theme = chance.natural({ min: 0, max: 3 });
        const text = await getText(themes[theme].core);
        rtm.sendMessage(`${themes[theme].label}${text}`, event.channel);
    } else {
        const text = await getText(formatPost(event.text));
        rtm.sendMessage(text, event.channel);
    }
}

const rtm = new RTMClient(config.token);

rtm.on('message', async (event) => {
    if (event.thread_ts && event.thread_ts === data.activeThread) {
        const resp = await getText(formatPost(event.text));
        rtm.addOutgoingEvent(true, 'message', { 
            text: resp, 
            channel: event.channel, 
            thread_ts: event.thread_ts 
        });
    } else if (event.subtype === 'message_replied' && event.message.user === data.botId) {
        data.activeThread = event.message.thread_ts;
    } else if (event.subtype !== 'message_replied' && !event.thread_ts && event.type === 'message' && !event.subtype) {
        if (searchName(event.text)) {
            const text = await getText(formatPost(event.text));
            rtm.sendMessage(text, event.channel);
        } else {
            const num = chance.natural({ min: 1, max: 100 });
            if (num < 6) {
                await checkPost(event);
            }
        }
    }
});

rtm.on('member_joined_channel', async (event) => {
    const response = await getText('Анон вступил к нам.');
    await rtm.sendMessage(`К нам вступил <@${event.user}>. ${response}`, event.channel);
});

rtm.on('member_left_channel', async (event) => {
    const response = await getText('Анон покинул нас.');
    await rtm.sendMessage(`Нас покинул <@${event.user}>. ${response}`, event.channel);
});

(async () => {
    // Connect to Slack
    const { self, team } = await rtm.start();
    data.botId = self.id;
    // await rtm.sendMessage(`Привет2`, channel);
})();