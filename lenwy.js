const Ai4Chat = require('./scrape/Ai4Chat');

module.exports = async (lenwy, m) => {
  const msg = m.messages[0];
  if (!msg.message || msg.key.fromMe) return;

  const sender = msg.key.remoteJid;
  const isGroup = sender.endsWith("@g.us");
  const body = msg.message.conversation ||
               msg.message.extendedTextMessage?.text ||
               msg.message.imageMessage?.caption ||
               msg.message.videoMessage?.caption ||
               "";
  const text = body.trim().toLowerCase();
  const pushname = msg.pushName || "Lenwy";
  const participant = msg.key.participant || sender;

  // Ambil yang di-mention
  const mentionedJid = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];

  // Cek apakah bot disebut/tag
  const botNumber = lenwy.user.id.split(":")[0] + "@s.whatsapp.net";
  const isMentioned = mentionedJid.includes(botNumber);

  // ⛔ Jika di grup tapi tidak men-tag bot, abaikan
  if (isGroup && !isMentioned) return;

  // ✅ Fitur: Halo
  if (text.startsWith("halo")) {
    await lenwy.sendMessage(sender, {
      text: `Halo juga, @${participant.split("@")[0]}!`,
      contextInfo: { mentionedJid: [participant] }
    });
    return;
  }

  // ✅ Fitur: Ping
  if (text.startsWith("ping")) {
    await lenwy.sendMessage(sender, {
      text: `Pong 🏓`,
    });
    return;
  }

  // ✅ Fitur: AI Chat
  if (text.startsWith("ai")) {
    const prompt = body.slice(2).trim(); // teks setelah "ai"
    if (!prompt) {
      await lenwy.sendMessage(sender, {
        text: `Mau tanya apa sama AI?\nContoh: ai siapa presiden Indonesia?`
      });
      return;
    }

    try {
      const response = await Ai4Chat(prompt);
      const resultText = typeof response === "string" ? response : response?.result || "Format tidak didukung.";

      await lenwy.sendMessage(sender, {
        text: `@${participant.split("@")[0]} ${resultText}`,
        contextInfo: { mentionedJid: [participant] }
      });
      return;
    } catch (error) {
      console.error("AI Error:", error);
      await lenwy.sendMessage(sender, {
        text: `Terjadi kesalahan: ${error.message}`
      });
      return;
    }
  }

  // ✅ Fallback: lempar semua ke AI (hanya jika tag di grup atau chat pribadi)
  try {
    const response = await Ai4Chat(body);
    await lenwy.sendMessage(sender, {
      text: `@${participant.split("@")[0]} ${response}`,
      contextInfo: { mentionedJid: [participant] }
    });
  } catch (error) {
    console.error("AI Error:", error);
    await lenwy.sendMessage(sender, {
      text: `Terjadi kesalahan saat menjawab: ${error.message}`
    });
  }
};
