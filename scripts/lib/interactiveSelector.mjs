// import inquirer from "inquirer";
// import Parser from "rss-parser";

// /**
//  * Interactive selector:
//  * Topic → Feed → Article
//  */
// export async function selectTopicFeedArticle(feedsConfig) {
//   // HARD GUARD — prevents blank menus forever
//   if (!feedsConfig || !Array.isArray(feedsConfig.topics)) {
//     throw new Error(
//       "interactiveSelector: feedsConfig.topics is missing or invalid",
//     );
//   }

//   /* -------------------- STEP 1: TOPIC -------------------- */

//   const topicChoices = feedsConfig.topics.map((topic, index) => ({
//     name: `${topic.name} (${topic.feeds.length} feeds, ${topic.keywords.length} keywords)`,
//     value: index,
//   }));

//   const { topicIndex } = await inquirer.prompt([
//     {
//       type: "list",
//       name: "topicIndex",
//       message: "Which topic would you like to generate content for?",
//       choices: topicChoices,
//       default: 0, // 🔑 prevents undefined
//       pageSize: 10, // forces render
//       loop: false, // avoids silent wrap
//     },
//   ]);

//   const topic = feedsConfig.topics[topicIndex];

//   /* -------------------- STEP 2: FEED -------------------- */

//   const feedChoices = topic.feeds.map((feedUrl, index) => ({
//     name: feedUrl,
//     value: index,
//   }));

//   const { feedIndex } = await inquirer.prompt([
//     {
//       type: "list",
//       name: "feedIndex",
//       message: "Select a feed:",
//       choices: feedChoices,
//     },
//   ]);

//   const feedUrl = topic.feeds[feedIndex];

//   /* -------------------- STEP 3: ARTICLE -------------------- */

//   const parser = new Parser();
//   const feed = await parser.parseURL(feedUrl);

//   if (!feed.items || feed.items.length === 0) {
//     throw new Error("No articles found in selected feed.");
//   }

//   const articleChoices = feed.items.map((item, index) => ({
//     name: `${item.title}`,
//     value: index,
//   }));

//   const { articleIndex } = await inquirer.prompt([
//     {
//       type: "list",
//       name: "articleIndex",
//       message: `Select an article (${feed.items.length} available):`,
//       pageSize: 15,
//       choices: articleChoices,
//     },
//   ]);

//   const item = feed.items[articleIndex];

//   /* -------------------- KEYWORD MATCHING -------------------- */

//   const matchedKeywords = topic.keywords.filter((kw) =>
//     `${item.title} ${item.contentSnippet || ""}`.toLowerCase().includes(kw),
//   );

//   return {
//     topic,
//     feedUrl,
//     item,
//     matchedKeywords,
//   };
// }
