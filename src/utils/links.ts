export interface ExtractedLink {
  text: string;
  url: string;
}

export function extractLinks(content: string): ExtractedLink[] {
  const links: ExtractedLink[] = [];
  const seenUrls = new Set<string>();

  // Regex for Markdown links [text](url)
  const mdRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let match;
  while ((match = mdRegex.exec(content)) !== null) {
    const text = match[1];
    const url = match[2];
    if (!seenUrls.has(url)) {
      links.push({ text, url });
      seenUrls.add(url);
    }
  }

  // Regex for HTML links <a href="url">text</a>
  // This is a basic regex and might miss some complex cases, but it should cover the ones seen in the blog posts.
  const htmlRegex = /<a\s+[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
  while ((match = htmlRegex.exec(content)) !== null) {
    const url = match[1];
    const text = match[2].replace(/<[^>]*>/g, '').trim(); // Remove nested HTML tags from text
    if (!seenUrls.has(url) && url.startsWith('http')) { // Focus on external links generally or any link if needed
        // For now, let's include all non-duplicate URLs
        links.push({ text: text || url, url });
        seenUrls.add(url);
    } else if (!seenUrls.has(url)) {
        links.push({ text: text || url, url });
        seenUrls.add(url);
    }
  }

  return links;
}
