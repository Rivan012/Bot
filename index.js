const { makeWASocket, useMultiFileAuthState } = require("@whiskeysockets/baileys");
const pino = require("pino");
const chalk = require("chalk");
const readline = require("readline");

const usePairingCode = false; // false = scan QR, true = pairing code

async function question(prompt) {
  process.stdout.write(prompt);
  const r1 = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => r1.question("", (ans) => {
    r1.close();
    resolve(ans);
  }));
}

function extractText(msg) {
  return (
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    msg.message?.imageMessage?.caption ||
    msg.message?.videoMessage?.caption ||
    ""
  );
}

async function connectToWhatsApp() {
  console.log(chalk.blue("🎁 Memulai Koneksi Ke WhatsApp"));

  const { state, saveCreds } = await useMultiFileAuthState("./LenwySesi");

  const lenwy = makeWASocket({
    logger: pino({ level: "info" }),
    printQRInTerminal: !usePairingCode,
    auth: state,
    browser: ["Ubuntu", "Chrome", "20.0.04"],
    version: [2, 3000, 1015901307],
  });

  if (usePairingCode && !lenwy.authState.creds.registered) {
    console.log(chalk.green("☘ Masukkan Nomor Dengan Awal 62"));
    const phoneNumber = await question("> ");
    const code = await lenwy.requestPairingCode(phoneNumber.trim());
    console.log(chalk.cyan(`🎁 Pairing Code : ${code}`));
  }

  lenwy.ev.on("creds.update", saveCreds);

  lenwy.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === "close") {
      console.log(chalk.red("❌ Koneksi Terputus, Mencoba Menyambung Ulang"));
      connectToWhatsApp();
    } else if (connection === "open") {
      console.log(chalk.green("✔ Bot Berhasil Terhubung Ke WhatsApp"));
    }
  });

  lenwy.ev.on("messages.upsert", async (m) => {
    const msg = m.messages[0];
    if (!msg.message) return;

    const body = extractText(msg);
    // if (!body.startsWith("!")) return;

    const sender = msg.key.remoteJid;
    const pushname = msg.pushName || "Lenwy";

    const listColor = ["red", "green", "yellow", "magenta", "cyan", "white", "blue"];
    const randomColor = listColor[Math.floor(Math.random() * listColor.length)];

    console.log(
      chalk.yellow.bold("Credit : Lenwy"),
      chalk.green.bold("[ WhatsApp ]"),
      chalk[randomColor](pushname),
      chalk[randomColor](" : "),
      chalk.white(body)
    );

    try {
      require("./lenwy")(lenwy, m);
    } catch (err) {
      console.error("Error handler lenwy:", err);
    }
  });
}

connectToWhatsApp();
