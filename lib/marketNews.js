function formatMarketNews(newsList, dateStr) {
  if (!newsList || newsList.length === 0) {
    return `🗓️ *${dateStr}*\nHôm nay không có sự kiện kinh tế quan trọng nào. Chúc bạn một ngày giao dịch hiệu quả!`;
  }

  let formattedNews = `🗓️ *${dateStr}*\n📊 *Thị trường hôm nay có các sự kiện kinh tế đáng chú ý:*\n\n`;

  newsList.forEach(news => {
    const flag = news.countryFlag || '';
    const time = news.time || '--:--';
    const title = news.title || 'Chỉ số kinh tế';
    const impact = news.impact || '';
    const actual = news.actual || '—';
    const forecast = news.forecast || '—';
    const previous = news.previous || '—';

    formattedNews += `${flag} **${time} – ${title}**\n`;
    formattedNews += `**💥 Tác động: ${impact}**\n`;
    formattedNews += `Thực tế: ${actual} | Dự báo: ${forecast} | Trước đó: ${previous}\n`;
    formattedNews += `──────────────\n`;
  });

  formattedNews += `\n*Bot gửi lúc 07:00 – Cập nhật tự động.*`;

  return formattedNews.trim();
}
