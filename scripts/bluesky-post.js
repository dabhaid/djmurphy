import { AtpAgent } from '@atproto/api';
import Parser from 'rss-parser';
import { decode } from 'html-entities';

const parser = new Parser();

async function run() {
  const identifier = process.env.BLUESKY_IDENTIFIER;
  const password = process.env.BLUESKY_PASSWORD;
  const rssUrl = 'https://djmurphy.net/rss.xml';
  const dryRun = process.argv.includes('--dry-run');

  if (!identifier || !password) {
    console.error('Missing BLUESKY_IDENTIFIER or BLUESKY_PASSWORD');
    process.exit(1);
  }

  if (dryRun) {
    console.log('DRY RUN: No posts will be created.');
  }

  const agent = new AtpAgent({ service: 'https://bsky.social' });
  await agent.login({ identifier, password });

  // Fetch recent posts to avoid duplicates
  console.log(`Fetching recent posts for ${identifier}...`);
  const authorFeed = await agent.getAuthorFeed({ actor: identifier, limit: 50 });
  const existingLinks = new Set();

  for (const { post } of authorFeed.data.feed) {
    // Check facets for links
    if (post.record.facets) {
      for (const facet of post.record.facets) {
        for (const feature of facet.features) {
          if (feature.$type === 'app.bsky.richtext.facet#link') {
            existingLinks.add(feature.uri);
          }
        }
      }
    }
    // Check external embeds for links
    if (post.record.embed?.$type === 'app.bsky.embed.external') {
      existingLinks.add(post.record.embed.external.uri);
    }
  }

  const feed = await parser.parseURL(rssUrl);

  for (const item of feed.items.reverse()) { // Process from oldest to newest
    if (!existingLinks.has(item.link)) {
      const decodedTitle = decode(item.title);
      const text = decodedTitle;

      if (dryRun) {
        console.log(`[DRY RUN] Would post: ${text} (${item.link})`);
        continue;
      }

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
      } catch (err) {
        console.error(`Failed to post ${item.link}:`, err);
      }
    } else {
      console.log(`Skipping already posted link: ${item.link}`);
    }
  }
}

run().catch(console.error);
