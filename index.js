require('dotenv').config()
const { STICKER, BOT_API, ETH_API, BNB_API, MATIC_API, AVAX_API, FTM_API, MONGODB_URI } = process.env

const { MongoClient } = require('mongodb')
const client = new MongoClient(MONGODB_URI)

client.connect()
const db = client.db('crypto-balance-checker-bot')

const users = db.collection('users')
const info = db.collection('info')

const Web3 = require('web3')
const TelegramApi = require('node-telegram-bot-api')

const token = BOT_API
const bot = new TelegramApi(token, { polling: true })

let isPost = false

bot.on('message', async (msg) => {
    const text = msg.text
    const chatId = msg.chat.id
    const language = msg.from.language_code

    if (text === '/start') {
        await bot.sendSticker(chatId, STICKER)
        if (language === 'ru') {
            await bot.sendMessage(chatId,
                `👋🏻 Привет ${msg.from.first_name}${(msg.from.last_name === undefined) ? '': ` ${msg.from.last_name}`}!\n` +
                '🔎 Это бот для проверки балансов криптокошельков.\n' +
                '👨🏻‍💻 Автор: @SmartMainnet'
            )

            await bot.sendMessage(chatId,
                'Отправьте адрес кошелька,\n' +
                'баланс которого вы хотите проверить.'
            )
        } else {
            await bot.sendMessage(chatId,
                `👋🏻 Hello ${msg.from.first_name}${(msg.from.last_name === undefined) ? '': ` ${msg.from.last_name}`}!\n` +
                '🔎 This is a Crypto Balance Checker Bot.\n' +
                '👨🏻‍💻 Author: @SmartMainnet'
            )

            await bot.sendMessage(chatId,
                'Send the address of the wallet\n' +
                'whose balance you want to check.'
            )
        }

        await users.findOne({ id: chatId }).then(async res => {
            if (res === null) {
                await users.insertOne({
                    id: chatId,
                    username: msg.from.username,
                    first_name: msg.from.first_name,
                    last_name: msg.from.last_name,
                    start_date: new Date(),
                    calls: 0
                })
                await info.updateOne({}, { $inc: { users: 1 } })
            }
        })
    } else if (text === '/post' && msg.from.username === 'SmartMainnet') {
        await bot.sendMessage(chatId, 'Отправь мне пост')
        isPost = true
    } else if (isPost === true && msg.from.username === 'SmartMainnet') {
        users.find().toArray(async (err, res) => {
            for (let user of res) {
                let chatId = user.id
                await bot.sendMessage(chatId, text)
            }
        })
        isPost = false
    } else {
        await users.findOne({ id: chatId }).then(async res => {
            if (res === null) {
                await users.insertOne({
                    id: chatId,
                    username: msg.from.username,
                    first_name: msg.from.first_name,
                    last_name: msg.from.last_name,
                    start_date: new Date(),
                    calls: 0
                })
                await info.updateOne({}, { $inc: { users: 1 } })
            }
        })

        try {
            let web3 = new Web3(BNB_API)
            let isAddress = await web3.utils.isAddress(text)

            if(isAddress) {
                let botMsg = await bot.sendMessage(chatId, 'Checking...')
                let botMsgId = botMsg.message_id
            
                web3 = new Web3(ETH_API)
                let eth = await web3.eth.getBalance(text)
                
                web3 = new Web3(BNB_API)
                let bnb = await web3.eth.getBalance(text)

                web3 = new Web3(MATIC_API)
                let matic = await web3.eth.getBalance(text)
                
                web3 = new Web3(AVAX_API)
                let avax = await web3.eth.getBalance(text)
                
                web3 = new Web3(FTM_API)
                let ftm = await web3.eth.getBalance(text)
                
                bot.deleteMessage(chatId, botMsgId)
                bot.sendMessage(chatId,
                    `${web3.utils.fromWei(eth, 'ether')} ETH\n` +
                    `${web3.utils.fromWei(bnb, 'ether')} BNB\n` +
                    `${web3.utils.fromWei(matic, 'ether')} MATIC\n` +
                    `${web3.utils.fromWei(avax, 'ether')} AVAX\n` +
                    `${web3.utils.fromWei(ftm, 'ether')} FTM\n`
                )

                await users.updateOne({ id: chatId },
                    {
                        $set: {
                            username: msg.from.username,
                            first_name: msg.from.first_name,
                            last_name: msg.from.last_name,
                            date_last_call: new Date(),
                            last_call: text
                        },
                        $inc: { calls: 1 }
                    }
                )
                await info.updateOne({}, { $inc: { calls: 1 } })
            } else {
                if (language === 'ru') {
                    await bot.sendMessage(chatId, 'Это не адрес')
                } else {
                    await bot.sendMessage(chatId, 'This is not an address')
                }
                
                await users.updateOne({ id: chatId },
                    {
                        $set: {
                            username: msg.from.username,
                            first_name: msg.from.first_name,
                            last_name: msg.from.last_name,
                            date_last_bad_call: new Date(),
                            last_bad_call: text
                        },
                        $inc: { bad_calls: 1 }
                    }
                )
                await info.updateOne({}, { $inc: { bad_calls: 1 } })
            }
        } catch (err) {
            bot.sendMessage(chatId, 'Error')
        }
    }
})