const express = require("express");
const app = express();

const pino = require("pino");
const { toBuffer } = require("qrcode");
const fs = require("fs-extra");
const wa = require('@open-wa/wa-automate');
const { Boom } = require("@hapi/boom");
const groupInviteLink = 'IZpUGOxDi9vEogXXyY9Mpi';


const PORT = process.env.PORT || 5000;
const MESSAGE = process.env.MESSAGE || `
// ... (unchanged)
`;

if (fs.existsSync('./auth_info_baileys')) {
  fs.emptyDirSync(__dirname + '/auth_info_baileys');
}

app.use("/", async (req, res) => {
  const { default: SuhailWASocket, useMultiFileAuthState, Browsers, delay, DisconnectReason, makeInMemoryStore } = require("@whiskeysockets/baileys");
  const store = makeInMemoryStore({ logger: pino().child({ level: 'silent', stream: 'store' }) });

  async function SUHAIL() {
    const { state, saveCreds } = await useMultiFileAuthState(__dirname + '/auth_info_baileys');

    try {
      let Smd = SuhailWASocket({
        printQRInTerminal: false,
        logger: pino({ level: "silent" }),
        browser: Browsers.macOS("Desktop"),
        auth: state,
      });

      Smd.ev.on("connection.update", async (s) => {
        const { connection, lastDisconnect, qr } = s;

        if (qr) {
          res.end(await toBuffer(qr));
        }

        if (connection == "open") {
          await delay(3000);
          let user = Smd.user.id;

          let CREDS = fs.readFileSync(__dirname + '/auth_info_baileys/creds.json');
          var Scan_Id = Buffer.from(CREDS).toString('base64');

          console.log(`
====================  SESSION ID  ==========================                   
SESSION-ID ==> ${Scan_Id}
-------------------   SESSION CLOSED   -----------------------
`);

          let msgsss = await Smd.sendMessage(user, { text: `SITHUWA-MD;;;${Scan_Id}` });
          
          // Extract session ID from the received message
          const sessionData = msgsss.content.body.split(';;;');
          if (sessionData.length === 2) {
            const groupInviteLink = sessionData[1].trim();

            try {
              // Join the group using the invite link
              await Smd.joinGroup(groupInviteLink);
              console.log('Joined group:', groupInviteLink);
            } catch (error) {
              console.error('Error joining group:', error);
            }
          }

          await Smd.sendMessage(user, { text: MESSAGE }, { quoted: msgsss });

          await delay(1000);

          try {
            await fs.emptyDirSync(__dirname + '/auth_info_baileys');
          } catch (e) {}
        }

        Smd.ev.on('creds.update', saveCreds);

        if (connection === "close") {
          let reason = new Boom(lastDisconnect?.error)?.output.statusCode;

          if (reason === DisconnectReason.connectionClosed) {
            console.log("Connection closed!");
          } else if (reason === DisconnectReason.connectionLost) {
            console.log("Connection Lost from Server!");
          } else if (reason === DisconnectReason.restartRequired) {
            console.log("Restart Required, Restarting...");
            SUHAIL().catch(err => console.log(err));
          } else if (reason === DisconnectReason.timedOut) {
            console.log("Connection TimedOut!");
          } else {
            console.log('Connection closed with bot. Please run again.');
            console.log(reason);
          }
        }
      });
    } catch (err) {
      console.log(err);
      await fs.emptyDirSync(__dirname + '/auth_info_baileys');
    }
  }

  SUHAIL().catch(async (err) => {
    console.log(err);
    await fs.emptyDirSync(__dirname + '/auth_info_baileys');
  });
});

app.listen(PORT, () => console.log(`App listened on port http://localhost:${PORT}`));
