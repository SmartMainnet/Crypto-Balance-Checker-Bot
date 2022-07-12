require('dotenv').config()
const { STICKER, BOT_API, ETH_API, BNB_API, MATIC_API, AVAX_API, FTM_API, MONGODB_PASSWORD } = process.env

const TelegramApi = require('node-telegram-bot-api')
const Web3 = require('web3')

const { MongoClient } = require('mongodb')
const url = `mongodb+srv://admin:${MONGODB_PASSWORD}@database.owkg3.mongodb.net/test`

const client = new MongoClient(url)
client.connect()

const db = client.db('crypto-balance-checker-bot')

const users = db.collection('users')
const info = db.collection('info')

const token = BOT_API
const bot = new TelegramApi(token, { polling: true })

bot.on('message', async (msg) => {

    const text = msg.text;
    const chatId = msg.chat.id;

    if (text === '/start') {

        await bot.sendSticker(chatId, STICKER)
        await bot.sendMessage(chatId,
            `Hello ${msg.from.first_name}${(msg.from.last_name === undefined) ? '': ` ${msg.from.last_name}`}!`
            + '\n' +
            'This is a Crypto Balance Checker Bot.'
            + '\n' +
            'Author: @SmartMainnet'
        )
        await bot.sendMessage(chatId,
            'Send the address of the wallet\nwhose balance you want to check.'
            + '\n' +
            '---------------------------------------------------'
            + '\n' +
            'Отправьте адрес кошелька,\nбаланс которого вы хотите проверить.'
        )

        const document = await users.findOne({ id: chatId })

        if (document === null) {
            await users.insertOne({
                id: chatId,
                username: msg.from.username,
                first_name: msg.from.first_name,
                last_name: msg.from.last_name,
            })
            await info.updateOne({}, { $inc: { users: 1 } })
        }
    
    } else {

        try {
            
            let web3 = new Web3(BNB_API)
            let isAddress = await web3.utils.isAddress(text)

            if(isAddress) {
                let botMsg = await bot.sendMessage(chatId, 'Checking...')
                let botMsgId = botMsg.message_id
            
                web3 = new Web3(ETH_API)
                let eth = await web3.eth.getBalance(text, (err, wei) => { return wei })
                
                web3 = new Web3(BNB_API)
                let bnb = await web3.eth.getBalance(text, (err, wei) => { return wei })

                web3 = new Web3(MATIC_API)
                let matic = await web3.eth.getBalance(text, (err, wei) => { return wei })
                
                web3 = new Web3(AVAX_API)
                let avax = await web3.eth.getBalance(text, (err, wei) => { return wei })
                
                web3 = new Web3(FTM_API)
                let ftm = await web3.eth.getBalance(text, (err, wei) => { return wei })
                
                bot.deleteMessage(chatId, botMsgId)
                bot.sendMessage(chatId,
                    web3.utils.fromWei(eth, 'ether') + ' ETH'
                    + '\n' +
                    web3.utils.fromWei(bnb, 'ether') + ' BNB'
                    + '\n' +
                    web3.utils.fromWei(matic, 'ether') + ' MATIC'
                    + '\n' +
                    web3.utils.fromWei(avax, 'ether') + ' AVAX'
                    + '\n' +
                    web3.utils.fromWei(ftm, 'ether') + ' FTM'
                )

                await users.updateOne({ id: chatId },
                    {
                        $set: {
                            id: chatId,
                            username: msg.from.username,
                            first_name: msg.from.first_name,
                            last_name: msg.from.last_name,
                        },
                        $inc: { calls: 1 },
                    }
                )
                await info.updateOne({}, { $inc: { calls: 1 } })

            } else {
                bot.sendMessage(chatId,
                    'This is not an address'
                    + '\n' +
                    '--------------------------------'
                    + '\n' +
                    'Это не адрес'
                )
            }

        } catch (err) {
            bot.sendMessage(chatId, 'Error')
        }

    }

})