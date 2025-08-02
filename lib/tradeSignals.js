const axios = require('axios');
const config = require('../config.json');
const { sendMessage } = require('./sendMessage');

function formatVND(number) {
  return Number(number).toLocaleString('vi-VN') + '₫';
}

function getStrengthLabel(score) {
  if (score >= 70) return '📊 Mạnh';
  if (score >= 50) return '📊 Tiêu chuẩn';
  return '📊 Yếu #ThamKhảo';
}

function getDirectionText(direction) {
  return direction.toLowerCase() === 'long' ? '🟢 MUA' : '🔴 BÁN';
}

function getEntryType(entryType) {
  return entryType.toLowerCase() === 'limit' ? 'Limit' : 'Market';
}

function generateSignalMessage(signals) {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  let message = `⚡ ${timeStr} — Tín hiệu mới từ ONUS Futures:\n\n`;

  signals.forEach((s, index) => {
    const strength = getStrengthLabel(s.strength);
    const dir = getDirectionText(s.direction);
    const entry = formatVND(s.entry);
    const tp = formatVND(s.tp);
    const sl = formatVND(s.sl);

    message += `🪙 ${index + 1}. ${s.symbol}\n`;
    message += `${dir} (${getEntryType(s.type)}) — ${strength}\n`;
    message += `Entry: ${entry}\nTP: ${tp} | SL: ${sl}\n`;
    message += `Lý do: ${s.reason}\n`;
    message += `──────────────\n`;
  });

  return message.trim();
}

async function fetchSignalsFromGoonus() {
  try {
    const res = await axios.get('https://goonus.io/api/futures/signals');
    return res.data || [];
  } catch (err) {
    console.error('[LỖI] Không thể lấy dữ liệu từ Goonus:', err.message);
    return [];
  }
}

function filterValidSignals(allSignals) {
  const requiredFields = ['symbol', 'type', 'direction', 'entry', 'tp', 'sl', 'reason', 'strength'];
  return allSignals.filter(s =>
    requiredFields.every(field => s[field]) &&
    typeof s.strength === 'number' &&
    s.strength >= 30 // Tín hiệu yếu dưới 30 loại bỏ luôn
  );
}

async function sendTradeSignals() {
  const allSignals = await fetchSignalsFromGoonus();
  const validSignals = filterValidSignals(allSignals);

  // Ưu tiên lọc 3 Scalping + 2 Swing
  const scalping = validSignals.filter(s => s.style?.toLowerCase() === 'scalping').slice(0, 3);
  const swing = validSignals.filter(s => s.style?.toLowerCase() === 'swing').slice(0, 2);
  const selectedSignals = [...scalping, ...swing];

  if (selectedSignals.length === 0) {
    console.log('[Bot] Không có tín hiệu phù hợp.');
    return;
  }

  const msg = generateSignalMessage(selectedSignals);

  for (const uid of config.userIDs) {
    await sendMessage(uid, msg);
  }

  console.log('[Bot] Đã gửi tín hiệu futures thành công.');
}

module.exports = { sendTradeSignals };
