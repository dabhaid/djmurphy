import { AtpAgent } from '@atproto/api';
import Parser from 'rss-parser';
import { decode } from 'html-entities';
import fs from 'fs';

const parser = new Parser();
const CACHE_FILE = 'cache.json';

async function run() {
  const identifier = process.env.BLUESKY_IDENTIFIER;
  const password = process.env.BLUESKY_PASSWORD;
  const rssUrl = 'https://djmurphy.net/rss.xml';

  if (!identifier || !password) {
    console.error('Missing BLUESKY_IDENTIFIER or BLUESKY_PASSWORD');
    process.exit(1);
  }

  // Load cache
  let cache = [];
  if (fs.existsSync(CACHE_FILE)) {
    cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
  }

  const feed = await parser.parseURL(rssUrl);
  const agent = new AtpAgent({ service: 'https://bsky.social' });


  await agent.login({ identifier, password });

  for (const item of feed.items.reverse()) { // Process from oldest to newest
    if (!cache.includes(item.link)) {
      const decodedTitle = decode(item.title);
      const text = decodedTitle;

      console.log(`Posting: ${text}`);
      
      try {
        await agent.post({
          text: text,
          facets: [
            {
              index: {
                byteStart: 0,
                byteEnd: Buffer.from(text).length,
              },
              features: [
                {
                  $type: 'app.bsky.richtext.facet#link',
                  uri: item.link,
                },
              ],
            },
          ],
          createdAt: new Date().toISOString(),
        });
        cache.push(item.link);
      } catch (err) {
        console.error(`Failed to post ${item.link}:`, err);
      }
    }
  }

  // Save cache
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
}

run().catch(console.error);
