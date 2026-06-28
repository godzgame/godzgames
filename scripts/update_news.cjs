const fs = require('fs');
const path = require('path');
const Parser = require('rss-parser');
const axios = require('axios');
const cheerio = require('cheerio');

const parser = new Parser();

const UPLOADS_DIR = path.join(__dirname, '..', 'public', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const NEWS_FILE = path.join(__dirname, '..', 'src', 'data', 'latest_news.json');
if (!fs.existsSync(path.dirname(NEWS_FILE))) {
  fs.mkdirSync(path.dirname(NEWS_FILE), { recursive: true });
}

const translateToSpanish = async (text) => {
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=es&dt=t&q=${encodeURIComponent(text)}`;
    const res = await axios.get(url, { timeout: 15000 });
    if (res.data && res.data[0]) {
      return res.data[0].map(item => item[0]).join('');
    }
    return text;
  } catch (err) {
    console.error("[Google Translate API] Error:", err.message);
    return text;
  }
};

const downloadImageLocally = async (promptText) => {
  try {
    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(promptText)}?width=800&height=500&nologo=true&seed=${Math.floor(Math.random() * 10000)}`;
    console.log(`Downloading AI image locally: "${promptText.substring(0, 30)}..."`);
    const res = await axios({
      url: imageUrl,
      method: 'GET',
      responseType: 'stream',
      timeout: 20000
    });
    const filename = `news_${Date.now()}_${Math.floor(Math.random() * 1000)}.jpg`;
    const destPath = path.join(UPLOADS_DIR, filename);
    const writer = fs.createWriteStream(destPath);
    res.data.pipe(writer);
    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
    return `https://www.godzgames.com/uploads/${filename}`;
  } catch (err) {
    console.error("Error downloading image:", err.message);
    return `https://image.pollinations.ai/prompt/${encodeURIComponent(promptText)}?width=800&height=500&nologo=true`;
  }
};

const getArticleUrl = async (googleRssUrl) => {
  try {
    const response = await axios.get(googleRssUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36'
      },
      timeout: 6000
    });
    
    const $ = cheerio.load(response.data);
    const data = $('c-wiz[data-p]').attr('data-p');
    if (!data) return googleRssUrl;
    
    const obj = JSON.parse(data.replace('%.@.', '["garturlreq",'));
    const payload = {
      'f.req': JSON.stringify([[
        ['Fbv4je', JSON.stringify([...obj.slice(0, -6), ...obj.slice(-2)]), 'null', 'generic']
      ]])
    };

    const headers = {
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
      'User-Agent': 'Mozilla/5.0'
    };

    const postResponse = await axios.post('https://news.google.com/_/DotsSplashUi/data/batchexecute', 
      new URLSearchParams(payload).toString(), 
      { headers, timeout: 6000 }
    );
    
    let cleaned = postResponse.data;
    if (cleaned.startsWith(")]}'")) {
      cleaned = cleaned.substring(4);
    }
    
    const parsedData = JSON.parse(cleaned);
    const arrayString = parsedData[0][2];
    const decodedObj = JSON.parse(arrayString);
    const articleUrl = decodedObj[1];
    
    return articleUrl || googleRssUrl;
  } catch (err) {
    console.error("Decoding Google News URL error:", err.message);
    return googleRssUrl;
  }
};

const scrapeArticleTextAndImage = async (url) => {
  try {
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0'
      },
      timeout: 8000
    });
    const $ = cheerio.load(data);
    
    let paragraphs = [];
    const selectors = ['article p', '.c-entry-content p', '.article-content p', '.article-body p', '.entry-content p', '.page-content p', 'main p', 'p'];
    
    for (const selector of selectors) {
      const found = $(selector);
      if (found.length > 0) {
        found.each((i, el) => {
          const txt = $(el).text().trim();
          if (txt.length > 60 && !txt.toLowerCase().includes('cookie') && !txt.toLowerCase().includes('privacy') && !txt.toLowerCase().includes('ad blocker')) {
            paragraphs.push(txt);
          }
        });
        if (paragraphs.length > 0) break;
      }
    }
    
    let imageUrl = $('meta[property="og:image"]').attr('content') || $('meta[name="twitter:image"]').attr('content') || '';
    if (imageUrl && imageUrl.startsWith('/')) {
      const urlObj = new URL(url);
      imageUrl = `${urlObj.protocol}//${urlObj.host}${imageUrl}`;
    }
    
    return { text: paragraphs.slice(0, 6).join('\n\n'), imageUrl };
  } catch (error) {
    console.error(`Error scraping URL ${url}:`, error.message);
    return { text: '', imageUrl: '' };
  }
};

const rewriteArticleBilingual = async (title, originalText) => {
  try {
    const translatedTitle = await translateToSpanish(title);
    const translatedBody = await translateToSpanish(originalText);

    return {
      en: { title: title, body: originalText },
      es: { title: translatedTitle, body: translatedBody }
    };
  } catch (error) {
    console.error("Error in translation process:", error.message);
    return {
      en: { title: title, body: originalText },
      es: { title: title, body: originalText }
    };
  }
};

const generateNews = async () => {
  console.log("Iniciando generación bilingüe de noticias...");
  
  try {
    const query = encodeURIComponent('video games');
    const url = `https://news.google.com/rss/search?q=${query}&hl=en-US&gl=US&ceid=US:en`;
    
    const feed = await parser.parseURL(url);
    if (!feed || !feed.items || feed.items.length === 0) {
      console.log("No items found in Google News feed.");
      return;
    }
    
    const newsData = [];
    const titlesSet = new Set();
    
    for (const item of feed.items) {
      if (newsData.length === 3) break;
      
      let cleanTitle = item.title;
      const lastDash = cleanTitle.lastIndexOf(' - ');
      if (lastDash !== -1) cleanTitle = cleanTitle.substring(0, lastDash).trim();
      
      const titlePrefix = cleanTitle.toLowerCase().substring(0, 18);
      if (titlesSet.has(titlePrefix)) continue;
      titlesSet.add(titlePrefix);
      
      try {
        console.log(`Processing: ${cleanTitle}`);
        const resolvedUrl = await getArticleUrl(item.link);
        const { text: originalText, imageUrl: scrapedImageUrl } = await scrapeArticleTextAndImage(resolvedUrl);
        const textToRewrite = originalText || item.contentSnippet || item.content || '';
        
        if (!textToRewrite || textToRewrite.trim().length < 50) continue;
        
        const rewritten = await rewriteArticleBilingual(cleanTitle, textToRewrite);
        if (!rewritten.en.body || !rewritten.es.body || rewritten.en.body.trim().length < 50) continue;
        
        let finalImageUrl = scrapedImageUrl;
        if (!finalImageUrl) {
          const cleanTitleForImage = rewritten.en.title.replace(/[^a-zA-Z0-9 ]/g, "").substring(0, 60);
          const imagePrompt = `Epic, striking, dynamic video game concept art representing the news: ${cleanTitleForImage}. Vibrant colors, dramatic cinematic lighting, 8k resolution, highly detailed masterpiece. No text.`;
          finalImageUrl = await downloadImageLocally(imagePrompt);
        }
        
        let enDesc = rewritten.en.body.split('\n')[0] || '';
        if (enDesc.length > 150) enDesc = enDesc.substring(0, 147) + '...';
        
        let esDesc = rewritten.es.body.split('\n')[0] || '';
        if (esDesc.length > 150) esDesc = esDesc.substring(0, 147) + '...';
        
        newsData.push({
          id: `news-${newsData.length}`,
          tag: 'NEWS',
          image: finalImageUrl,
          link: resolvedUrl,
          en: { title: rewritten.en.title, description: enDesc, fullContent: rewritten.en.body },
          es: { title: rewritten.es.title, description: esDesc, fullContent: rewritten.es.body }
        });
      } catch (itemErr) {
        console.error(`Error processing individual item "${cleanTitle}":`, itemErr.message);
      }
    }
    
    if (newsData.length >= 3) {
      fs.writeFileSync(NEWS_FILE, JSON.stringify({
        updatedAt: Date.now(),
        articles: newsData
      }, null, 2));
      console.log("Noticias actualizadas con éxito.");
    } else {
      console.warn("Only generated", newsData.length, "news items. Keeping previous news.");
    }
  } catch (error) {
    console.error("Error general en generateNews:", error.message);
  }
};

generateNews();
