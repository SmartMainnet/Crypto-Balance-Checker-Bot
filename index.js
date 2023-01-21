require('dotenv').config()
const { STICKER, BOT_API, ETH_API, BNB_API, MATIC_API, AVAX_API, FTM_API, MONGODB_URI } = process.env

const { MongoClient } = require('mongodb')
const client = new MongoClient(MONGODB_URI)

client.connect()

const db = client.db('crypto-balance-checker-bot')
const users = db.collection('users')

const Web3 = require('web3')
const TelegramApi = require('node-telegram-bot-api')

const token = BOT_API
const bot = new TelegramApi(token, { polling: true })

const ethWeb3 = new Web3(ETH_API)
const bnbWeb3 = new Web3(BNB_API)
const maticWeb3 = new Web3(MATIC_API)
const avaxWeb3 = new Web3(AVAX_API)
const ftmWeb3 = new Web3(FTM_API)

bot.on('message', async msg => {
  const text = msg.text
  const chatId = msg.chat.id
  const language = msg.from.language_code

  try {
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
        if (!res) {
          await users.insertOne({
            id: chatId,
            username: msg.from.username,
            first_name: msg.from.first_name,
            last_name: msg.from.last_name,
            start_date: new Date()
          })
        }
      })
    } else {
      await users.findOne({ id: chatId }).then(async res => {
        if (!res) {
          await users.insertOne({
            id: chatId,
            username: msg.from.username,
            first_name: msg.from.first_name,
            last_name: msg.from.last_name,
            start_date: new Date()
          })
        }
      })

      const isAddress = await bnbWeb3.utils.isAddress(text)

      if(isAddress) {
        const botMsg = await bot.sendMessage(chatId, 'Checking...')
        const botMsgId = botMsg.message_id

        const eth = await ethWeb3.eth.getBalance(text)
        const bnb = await bnbWeb3.eth.getBalance(text)
        const matic = await maticWeb3.eth.getBalance(text)
        const avax = await avaxWeb3.eth.getBalance(text)
        const ftm = await ftmWeb3.eth.getBalance(text)
        
        bot.deleteMessage(chatId, botMsgId)
        bot.sendMessage(chatId,
          `${bnbWeb3.utils.fromWei(eth, 'ether')} ETH\n` +
          `${bnbWeb3.utils.fromWei(bnb, 'ether')} BNB\n` +
          `${bnbWeb3.utils.fromWei(matic, 'ether')} MATIC\n` +
          `${bnbWeb3.utils.fromWei(avax, 'ether')} AVAX\n` +
          `${bnbWeb3.utils.fromWei(ftm, 'ether')} FTM\n`
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
            $inc: { number_calls: 1 },
            $push: {
              calls: {
                call: text,
                date: new Date()
              }
            }
          }
        )
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
            $inc: { number_bad_calls: 1 },
            $push: {
              bad_calls: {
                call: text,
                date: new Date()
              }
            }
          }
        )
      }
    }
  } catch (err) {
    bot.sendMessage(chatId, 'Error')
  }
})