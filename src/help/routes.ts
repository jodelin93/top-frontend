import type { HelpTopic } from './types';

/**
 * How well a topic route ("/admin/inventory", "/admin/inventory?tab=transfers") matches
 * the current location. 0 = no match; longer paths and matching query values win.
 * A route with query values only matches when every value is present.
 */
export function routeScore(route: string, pathname: string, search: URLSearchParams | string = ''): number {
  const [path, query = ''] = route.split('?');
  const cleanPath = path.replace(/\/+$/, '') || '/';
  const current = pathname.replace(/\/+$/, '') || '/';
  if (current !== cleanPath && !(cleanPath !== '/' && current.startsWith(cleanPath + '/'))) return 0;
  const params = typeof search === 'string' ? new URLSearchParams(search) : search;
  let score = cleanPath.length * 10 + (current === cleanPath ? 5 : 0);
  if (query) {
    for (const [key, value] of new URLSearchParams(query)) {
      if (params.get(key) !== value) return 0;
      score += 1000;
    }
  }
  return score;
}

/**
 * The topic that documents this location best. Among equally good matches, the topic
 * whose FIRST route matches (its main page) wins, then the lowest order.
 */
export function topicForRoute(
  topics: HelpTopic[],
  pathname: string,
  search: URLSearchParams | string = ''
): HelpTopic | null {
  let best: HelpTopic | null = null;
  let bestScore = 0;
  for (const topic of topics) {
    topic.routes.forEach((route, index) => {
      const score = routeScore(route, pathname, search);
      if (!score) return;
      const total = score + (index === 0 ? 2 : 0);
      if (total > bestScore || (total === bestScore && best && topic.order < best.order)) {
        best = topic;
        bestScore = total;
      }
    });
  }
  return best;
}

/** Every topic documenting this location, best first */
export function topicsForRoute(topics: HelpTopic[], pathname: string, search: URLSearchParams | string = ''): HelpTopic[] {
  return topics
    .map((topic) => ({
      topic,
      score: Math.max(0, ...topic.routes.map((route, i) => (routeScore(route, pathname, search) || -99) + (i === 0 ? 2 : 0))),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.topic.order - b.topic.order)
    .map((entry) => entry.topic);
}

const cleanPath = (path: string) => path.replace(/\/+$/, '') || '/';

/**
 * Topics of the page's section: every topic with a route on exactly this path, whatever
 * the tab (?tab=...), so the Stock page lists all the stock topics but not the topics of
 * /admin (the admin overview). Help home order.
 */
export function topicsForPage(topics: HelpTopic[], pathname: string): HelpTopic[] {
  const current = cleanPath(pathname);
  return topics.filter((topic) => topic.routes.some((route) => cleanPath(route.split('?')[0]) === current));
}
