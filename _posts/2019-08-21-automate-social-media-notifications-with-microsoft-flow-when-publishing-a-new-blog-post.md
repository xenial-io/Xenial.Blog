---
 layout: post 
 title: Automate Social-Media notifications with Microsoft Flow when publishing a new Blog-Post
 comments: true
 tags: ["Microsoft Flow", "Microsoft", "Flow", "Pretzel"]
---

> If you read the Tweet right now and follow the link to the blog right now: This is a WIP.
> So come back later to see the other providers in action.
> Ps.: Never to testing in production ;)

As an interested reader of my blog you may know that I use [Pretzel](//github.com/Code52/pretzel) for my blog. I did a series on migrating my blog from [FunnelWeb to Pretzel](/series/migrating-from-funnelweb-to-pretzel/) in the past. One disadvantages of using a static site generator for blogging is the lack of social media plugins, esp. when publishing a blog. For now I did all the work by hand, by copying the headline as well as the link to the new post, login into several social media services (Twitter, various Facebook pages, Patreon and LinkedIn) add some hashtags. Most of the time I forgotten some platforms, had different casing and wording for "New blog post, New Blog-Post, New Blog post". I wanted to automate that a while back with Azure DevOps in my release pipeline, but I got stuck cause there because the lack of plugins. So a while back I discovered [Microsoft Flow](//flow.microsoft.com) but hadn't time to look into it. Now I had a few moments to play around with it so I thought this would be the perfect time to automate it. So let's get started!

## Microsoft Flow

Flow has a very cool [pricing model](//flow.microsoft.com/pricing/) and you can get started for free and you can execute at the time of writing 750 flows per month which is perfect for me.

### Twitter

So let's start with twitter. I want after publishing a new post tweet. Luckily I got an [RSS feed](/rss.xml) so I started with creating a new flow based on templates and search for `RSS Twitter`:

![Searching for RSS Twitter in the flow templates](/img/posts/2019/2019-08-21-flow-twitter-1.png)

I select `RSS feed news to Twitter`, enter my credentials, hit authorize and after that we hit continue.

![After the twitter template is created](/img/posts/2019/2019-08-21-flow-twitter-2.png)

I enter the RSS url and hit save.

After that I hit the `Test` button in the upper right corner and select the `I'll perform the trigger action` and hit `Save & Test`.

![twitter flow is ready to test](/img/posts/2019/2019-08-21-flow-twitter-3.png)

Now I'm seeing the information `To see it work now, publish an item to the RSS feed. This may take a few moments.`.

![waiting for the RSS feed test](/img/posts/2019/2019-08-21-flow-twitter-4.png)
