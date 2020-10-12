---
 layout: post 
 title: Comment system on static sites with dotnet core and Github actions
 tags: [dotnet, dotnetcore, asp, aspnet, .NET, git, github, "GHActions", "Jekyll", "Pretzel"]
 github: Xenial.Commentator
 author-github: xenial-io
 series: migrating-from-funnelweb-to-pretzel
---

When designing the new blog I finally decided to replace the comment system previously provided by [disqus](https://disqus.com/) with a much leaner one.

I played around with several options like [staticman](https://staticman.net/), but I was never really convinced to adopt any of them. So I thought why not build one myself?

Most of the tools use git issues, some proprietary database or are using [jekyll's data file features](https://jekyllrb.com/docs/datafiles/) and commit directly to the repository.  
This is not an issue per se, but I like to have _data_ separated from the content in the repository.

I came across a library called [Appy.GitDb](https://github.com/YellowLineParking/Appy.GitDb) that uses git as a key value store. I thought this was a perfect use case for this library, so I gave it a shot and came up with what I believe to be a simple, but also a powerful and robust solution.

<!--more-->

## Architecture

<pre><code>@@sequence napkin
note left of Blog.Repo
Clone Comments Repository
Prepares data directory
end note 
Blog.Repo->Blog.Repo: Build content of blog
Blog.Repo->Blog: Upload via FTP
Blog->Api: POST comment
Api->Blog: 200 OK
Api->Background Task: Queue comment
note left of Background Task
Lookup github avatar
Validate contents
end note
Comments.Repo->Background Task: Pull
Background Task->Background Task: Commit changes
Background Task->Comments.Repo: Push
Comments.Repo->Blog.Repo: Trigger build
</code></pre>

Let's talk a little bit about the moving components:

- [Blog.Repo]({{ site.site-repo }}): This is the github repo where the contents of this blog are stored
  - There is an [Github Action]({{ site.site-repo }}/blob/main/.github/workflows/Xenial.Blog.yml) that builds the contents.  
     It fetches the [Comments.Repo]({{ site.comment-url }}) and prepares the `_data` directory.
- [Blog]({{ site.site-url }}) this is this site. There is a simple FTP static host somewhere.
- [Api](https://www.github.com/xenial-io/Xenial.Commentator) is a simple aspnet core api application.
  - It has a background task that drains a queue.  
    Does the hard work of fetching the [Comments.Repo]({{ site.comment-url }}) and commiting any new comment
- [Comments.Repo]({{ site.comment-url }}) holds the data for each post and a [Github action]({{ site.comment-url }}/blob/main/.github/workflows/new-comment.yml) that triggers the workflow in the [Blog.Repo]({{ site.site-repo }})

## Code

Let's start with the heart of this: The `API` and `Background Task`.

```cs
namespace Xenial.Commentator.Api.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class CommentsController : ControllerBase
    {
        private readonly ILogger<CommentsController> _logger;
        private readonly ConcurrentQueue<PageWorkModel> _queue;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly GithubAvatarHelper _githubAvatarHelper;

        public CommentsController(ILogger<CommentsController> logger, ConcurrentQueue<PageWorkModel> queue, IHttpClientFactory httpClientFactory, GithubAvatarHelper githubAvatarHelper)
            => (_logger, _queue, _httpClientFactory, _githubAvatarHelper) = (logger, queue, httpClientFactory, githubAvatarHelper);

        [HttpPost]
        [ProducesResponseType(typeof(Page), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> Post([FromBody] PageInputModel pageInput)
        {
            _queue.Enqueue(new PageWorkModel
            {
                Id = pageInput.Id, //this corresponds to the page where the comment was made. For example 2012/07/19/hello-blog
                InReplyTo = pageInput.InReplyTo, //this is for supporting nested threads. Is empty by default
                Comment = new Comment
                {
                    Content = StringHelper.StripMarkdownTags(pageInput.Content), //Strip out malicious content to protect from XSS attacks
                    GithubOrEmail = pageInput.GithubOrEmail, //This corresponds to the commentators github username or email
                    Name = string.IsNullOrWhiteSpace(pageInput.Name) ? null : pageInput.Name.Trim(),
                    Homepage = string.IsNullOrWhiteSpace(pageInput.Homepage) ? null : pageInput.Homepage.Trim(),
                    Date = DateTime.Now,
                }
            });

            return await Ok(pageInput);
        }
    }
}
```

As you can see we put the comment directly onto a queue when it's correct. Let's check the validation:

```cs
public class PageInputModel
{
    [Required]
    public string Id { get; set; }
    [Required]
    public string Name { get; set; }
    public string GithubOrEmail { get; set; }
    public string Homepage { get; set; }
    [Required]
    public string Content { get; set; }

    [Required]
    public int A { get; set; }
    [Required]
    public int B { get; set; }
    [Required]
    [ValidateOperation]
    public string Operation { get; set; }
    [Required]
    [CheckCaptcha]
    public int Answer { get; set; }
    public string InReplyTo { get; set; }
}

public class ValidateOperationAttribute : ValidationAttribute
{
    protected override ValidationResult IsValid(object value,
        ValidationContext validationContext)
    {
        var pageInput = (PageInputModel)validationContext.ObjectInstance;

        if (string.IsNullOrEmpty(pageInput.Operation) || (pageInput.Operation != "+" && pageInput.Operation != "-"))
        {
            return new ValidationResult("Operation is out of range. Only can be + or -.");
        }

        return ValidationResult.Success;
    }
}

public class CheckCaptchaAttribute : ValidationAttribute
{
    protected override ValidationResult IsValid(object value,
        ValidationContext validationContext)
    {
        var pageInput = (PageInputModel)validationContext.ObjectInstance;

        var answer = pageInput.Operation == "+"
            ? pageInput.A + pageInput.B
            : pageInput.A - pageInput.B;

        if (answer != pageInput.Answer)
        {
            return new ValidationResult("Captcha is wrong.");
        }

        return ValidationResult.Success;
    }
}
```

This code is for the simple math `Captcha` you have to solve. It's no rocket science, but it does the job.

Now we need to look at `Startup.cs` and register the queue:

```cs
public class Startup
{
    public void ConfigureServices(IServiceCollection services)
    {
        services.AddHostedService<PushChangesWorker>(); //We register the background worker
        services.AddHttpClient(nameof(PushChangesWorker)); //We use named clients to prevent socket exhaustion
        services.AddHttpClient(nameof(CommentsController));
        services.AddSingleton<ConcurrentQueue<PageWorkModel>>(); //Register the queue as a singleton
        services.AddSingleton<GithubAvatarHelper>(); //This helps to fetch the avatar from github
        services.AddCors(); //We need cors, because the API will be hosted on a different subdomain
        services.AddControllers(); //Register API Controllers
    }

    public void Configure(IApplicationBuilder app, IWebHostEnvironment env)
    {
        app.UseHttpsRedirection(); //Make sure we are on https

        app.UseCors(b => b //Allow request from any url with any method and headers
            .AllowAnyOrigin()
            .AllowAnyMethod()
            .AllowAnyHeader()
        );

        app.UseRouting(); //Use routing

        app.UseEndpoints(endpoints =>
        {
            endpoints.MapControllers(); //Use API Controllers
        });
    }
}
```

And now we look at the `Background Task` that does all the hard work.

```cs
public class PushChangesWorker : IHostedService, IDisposable
{
    private readonly ILogger<PushChangesWorker> _logger;
    private readonly ConcurrentQueue<PageWorkModel> _queue;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly GithubAvatarHelper _githubAvatarHelper;
    private readonly IConfiguration _configuration;

    private Timer _timer;
    private Lazy<string> repositoryLocation;
    public PushChangesWorker(
        ILogger<PushChangesWorker> logger,
        ConcurrentQueue<PageWorkModel> queue,
        IHttpClientFactory httpClientFactory,
        GithubAvatarHelper githubAvatarHelper,
        IConfiguration configuration
        )
        => (_logger, _queue, _httpClientFactory, repositoryLocation, _githubAvatarHelper, _configuration)
            = (logger, queue, httpClientFactory, new Lazy<string>(() => CloneRepository()), githubAvatarHelper, configuration);

    private string repoUrl => _configuration.GetValue<string>("CommentsRepo");
    private string branchName => _configuration.GetValue<string>("CommentsBranchName");
    private string authorName => _configuration.GetValue<string>("CommentsAuthorName");
    private string authorEmail => _configuration.GetValue<string>("CommentsAuthorEmail");

    //Check if the queue has any new records every 5 seconds
    public Task StartAsync(CancellationToken cancellationToken)
    {
        _logger.LogInformation("Push Changes Service is running.");

        _timer = new Timer(DoWork, null, TimeSpan.Zero, TimeSpan.FromSeconds(5));

        return Task.CompletedTask;
    }

    //We use LibGit2Sharp to clone the repository. We cache the repo in a Lazy<T> to improve performance
    private string CloneRepository()
    {
        var dir = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString());

        var repoPath = Repository.Clone(repoUrl, dir, new CloneOptions
        {
            //Appy.GitDb.Local preferres bare repos to work with
            IsBare = true
        });

        return repoPath;
    }

    private async void DoWork(object state)
    {
        if (_queue.TryDequeue(out var page))
        {
            try
            {
                using IGitDb db = new LocalGitDb(repositoryLocation.Value);
                var id = page.Id.TrimStart('/');
                //This is the page id. For example 2012/07/19/hello-blog
                //We prefix with comments, cause we can use the database for other data as well
                var key = $"comments/{id}";
                //Check if we have any comment for the page
                var pageInDb = await db.Get<Page>(branchName, key);

                if (pageInDb == null) //If not, just create a new one
                {
                    pageInDb = new Page { Id = id };
                }

                //Create a unique ID for the comment, to support multiple threads
                page.Comment.Id = CryptoRandom.CreateUniqueId();
                page.Comment.Content = StringHelper.StripMarkdownTags(page.Comment.Content);

                //We fetch the github avatar
                var client = _httpClientFactory.CreateClient(nameof(PushChangesWorker));
                page.Comment.AvatarUrl = await _githubAvatarHelper.FetchAvatarFromGithub(client, _logger, page.Comment.GithubOrEmail);

                //In case of an error, we need to remember the users github name or email
                var githubOrEmail = page.Comment.GithubOrEmail;

                try
                {
                    //We don't want to store the email to not breach the users email
                    page.Comment.GithubOrEmail = null;
                    if (string.IsNullOrWhiteSpace(page.Comment.Homepage))
                    {
                        page.Comment.Homepage = null;
                    }

                    //This is only for supporting multiple threads.
                    if (string.IsNullOrEmpty(page.InReplyTo))
                    {
                        pageInDb.Comments.Add(page.Comment);
                    }
                    else
                    {
                        var commentToReplyTo = Flatten(pageInDb).FirstOrDefault(c => c.Id == page.InReplyTo);
                        if (commentToReplyTo != null)
                        {
                            commentToReplyTo.Comments.Add(page.Comment);
                        }
                        else //In case we just don't find it, add it to the page instead.
                        {
                            pageInDb.Comments.Add(page.Comment);
                        }
                    }

                    //Commit the changes in the local git repository
                    await db.Save(branchName, $"feat: new comment in {page.Id}", new Document<Page>
                    {
                        Key = key,
                        Value = pageInDb
                    }, new Author(authorName, authorEmail));


                    //Push the changes to github
                    using var repo = new Repository(repositoryLocation.Value);

                    var creds = new UsernamePasswordCredentials
                    {
                        //This is the github access token, just use this and auth will work as documented
                        Username = Environment.GetEnvironmentVariable("GITHUB_API_KEY"),
                        Password = string.Empty
                    };

                    var remote = repo.Network.Remotes["origin"];
                    var options = new PushOptions();
                    options.CredentialsProvider = (_url, _user, _cred) => creds;
                    repo.Network.Push(remote, $@"refs/heads/{branchName}", options);
                }
                finally
                {
                    //Restore the email in case of an error on push
                    page.Comment.GithubOrEmail = githubOrEmail;
                }
            }
            catch (NonFastForwardException ex) //Somebody has pushed changes to the repo (for example an edit). Retry by cloning a new repo and putting the comment back on the queue
            {
                _logger.LogWarning("Could not push changes cause there is a non fast forward. Clone the repo and try again. {page} {ex}", page, ex);
                repositoryLocation = new Lazy<string>(() => CloneRepository());
                _queue.Enqueue(page);
            }
            catch (Exception ex) //in case of any error, put the comment back on the queue
            {
                _logger.LogError("Could not commit comment in {page} {ex}", page, ex);
                _queue.Enqueue(page);
            }
        }
    }

    public Task StopAsync(CancellationToken cancellationToken)
    {
        _logger.LogInformation("Push Changes Service is stopping.");

        _timer?.Change(Timeout.Infinite, 0);

        return Task.CompletedTask;
    }

    public void Dispose() => _timer?.Dispose();

    // Helper methods to iterate over a comments tree
    IEnumerable<Comment> Flatten(Comment comment)
    {
        foreach (var comment2 in comment.Comments)
        {
            yield return comment2;
        }
    }

    IEnumerable<Comment> Flatten(Page page)
    {
        foreach (var comment in page.Comments)
        {
            foreach (var comment2 in Flatten(comment))
            {
                yield return comment2;
            }
            yield return comment;
        }
    }
}
```

To access the data from the [Comments.Repo]({{ site.comment-url }}) we need some code to clone the repository and do some little transformation so we can use it in [jekyll](https://jekyllrb.com/) or [pretzel](https://github.com/xenial-io/Xenial.Pretzel).

```cs
//Read just the config from the blog to avoid duplication
var config = await ReadConfig();
var repository = config["comment-repo"].ToString();
var branchName = config["comment-branch"].ToString();

//Clone the comments repository
var repoPath = Repository.Clone(repository, Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString()), new CloneOptions
{
    //This time we want to have a fully checked out repo
    IsBare = false
});

//Enumerate all posts to know for what id's we are looking
var posts = Directory.EnumerateFiles(postsDirectory);
//We prefix with comments, cause we can use the database for other data as well
var postIds = posts.Select(GetPostId).Select(p => $"comments/{p}").ToList();
using IGitDb db = new LocalGitDb(repoPath);

foreach (var postId in postIds)
{
    //This is the page id. For example 2012/07/19/hello-blog
    var pageInDb = await db.Get<Page>(branchName, postId);
    if (pageInDb != null)
    {
        //Just order the posts, and do some transformation to support multiple treads
        var comments = pageInDb.Comments.OrderBy(m => m.Date).ToList();

        foreach (var comment in Flatten(pageInDb))
        {
            comment.Comments = comment.Comments.OrderBy(m => m.Date).ToList();
        }

        foreach (var comment in pageInDb.Comments)
        {
            comment.isRoot = true;

            var lastInList = comment.Comments.LastOrDefault();
            if (lastInList != null)
            {
                lastInList.isLast = true;
                lastInList.replyTo = comment.Id;
            }
            else
            {
                comment.isLast = true;
                comment.replyTo = comment.Id;
            }
        }

        //Write the file in the _data directory
        var data = new
        {
            commentsCount = Flatten(pageInDb).Count(),
            comments = comments
        };
        var dataFile = Path.Combine(dataDirectory, $"{postId}.json");
        Directory.CreateDirectory(Path.GetDirectoryName(dataFile));
        var json = Newtonsoft.Json.JsonConvert.SerializeObject(data, Newtonsoft.Json.Formatting.Indented, new JsonSerializerSettings
        {
            ContractResolver = new CamelCasePropertyNamesContractResolver()
        });
        await File.WriteAllTextAsync(dataFile, json);
    }
}

//the filename contains everything for the post id for example: 2012-07-19-hello-blog.md
string GetPostId(string post)
{
    var postName = Path.GetFileNameWithoutExtension(post);

    var year = postName[0..4];
    var month = postName[5..7];
    var day = postName[8..10];
    var name = postName[11..];

    return $"{year}/{month}/{day}/{name}";
}
```

## Render the posts and a form

Now we have anything for data entry and retrieval. Now we need to render the posts and do a basic form for data entry.

{% raw %}

```html
<ul>
  {% for comment in site.data['comments'][page.id].comments %}
  <li>
    <div>
      {{ comment.homepage }} {{ comment.avatarUrl }} {{ comment.name }} {{
      comment.date | date: "%e %b %Y %H:%M" }} {% if comment.homepage != 'null'
      %}
      <a
        href="{{ site.comment-url }}/edit/main/comments{{ page.id }}"
        title="Edit comment"
        target="_blank"
        >Edit Comment</a
      >
    </div>
    <div>{{ comment.content }}</div>
  </li>
  {% endfor %}
</ul>
```

{% endraw %}

The comment form is rather boring

{% raw %}

```html
<div id="comment-form">
  <ul name="comments-inputs">
    <li>
      <input data-field="id" type="hidden" value="{{ page.id }}" />
      <input data-field="a" type="hidden" />
      <input data-field="b" type="hidden" />
      <input data-field="operation" type="hidden" />
      <label for="comments-name">Name</label>
      <input data-field="name" type="text" placeholder="Name" required />
    </li>

    <li>
      <label for="comments-githubOrEmail">Github / Email</label>
      <input
        data-field="githubOrEmail"
        id="comments-githubOrEmail"
        type="text"
        placeholder="Github username or E-mail (optional)"
        title="This is only to show your github profile picture and will not be stored anywhere"
      />
    </li>
    <li>
      <label for="comments-homepage">Homepage</label>
      <input
        data-field="homepage"
        id="comments-homepage"
        type="text"
        placeholder="Your homepage or blog (optional)"
      />
    </li>
    <li>
      <label for="comments-answer"></label>
      <input data-field="answer" id="comments-answer" type="number" required />
    </li>
    <li>
      <label for="comments-content">Content</label>
      <textarea
        data-field="content"
        id="comments-content"
        placeholder="Markdown is allowed"
      ></textarea>
    </li>
    <li>
      <button name="submit">Submit</button>
    </li>
  </ul>
</div>
```

{% endraw %}

And we use some javascript/typescript to post the comment

```ts
function getFieldValue(el: Element, fieldName: string): string {
  const element = el.querySelector(`*[data-field="${fieldName}"]`);
  if (element) {
    const inputElement = <HTMLInputElement>element;
    return inputElement.value;
  }
  return "";
}

const mapFields = (el: Element): PageInputModel => {
  const answer = parseInt(getFieldValue(el, "answer"));
  return {
    id: getFieldValue(el, "id"),
    operation: getFieldValue(el, "operation"),
    name: getFieldValue(el, "name"),
    githubOrEmail: getFieldValue(el, "githubOrEmail"),
    content: getFieldValue(el, "content"),
    homepage: getValidUrl(getFieldValue(el, "homepage")),
    inReplyTo: getFieldValue(el, "inReplyTo"),
    a: parseInt(getFieldValue(el, "a")),
    b: parseInt(getFieldValue(el, "b")),
    answer: isNaN(answer) ? 0 : answer,
  };
};

const comment = (
  r: Element,
  defaults: {
    name?: string;
    homepage?: string;
    githubOrEmail?: string;
    captcha: CaptchaModel;
  }
) => {
  const submitButton = <HTMLButtonElement>(
    r.querySelector(`button[name="submit"]`)
  );
  if (submitButton) {
    submitButton.onclick = async () => {
      try {
        const values = mapFields(r);
        //This is the POST to the API, the rest is more or less boilerplate
        const result = await CommentsService.postCommentsService(values);
      } catch (e) {
        console.error(e);
      }
    };
  }
};

const comments = async () => {
  const body = document.querySelector("body");
  //This is the base url to the comments API
  OpenAPI.BASE = body.getAttribute("data-comment-api");

  const rootClassName = "comment-form";

  for (const root of document.getElementsByClassName(rootClassName)) {
    comment(root);
  }
};
```

It's not that complicated, but basically we are making an simple API request to the comments API.

> We could use also simple formdata and post directly to the API and avoid all javascript. We need it only for the reply feature. But then the controller code would look slightly different.  
Let me know in the comments if would like to see a sample of that.

## Github actions

The last pieces missing are the two github actions to make the circle finished. Let's start with the comments:

```yml
# Xenial.Blog.Comments/.github/workflows/new-comment.yml
name: new-comment

# Controls when the action will run. Triggers the workflow on push
# events but only for the main branch
on:
  push:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Repository Dispatch
        uses: peter-evans/repository-dispatch@v1
        with:
          # Trigger a event in the blog repo
          token: ${{ secrets.REPO_ACCESS_TOKEN }}
          repository: xenial-io/Xenial.Blog
          event-type: new-comment
```

The last piece is the github action that will build and publish the blog.

```yml
# Xenial.Blog/.github/workflows/Xenial.Blog.yml
name: Xenial.Blog

on:
  push:
    branches: [main]
  #Build when triggered by event
  repository_dispatch:
    types: [new-comment]

jobs:
  build:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v2
      - name: Fetch all history for all tags and branches
        run: git fetch --prune --unshallow
      - uses: actions/setup-node@v1
        with:
          node-version: 12
      - name: Setup .NET Core
        uses: actions/setup-dotnet@v1
        with:
          dotnet-version: 5.0.100-rc.1.20452.10
      - name: Install dependencies
        run: dotnet restore build/build.csproj
      #Build the blog
      - name: Build
        run: dotnet run --project build/build.csproj
      - uses: actions/upload-artifact@v2
        with:
          name: _site
          path: _site/

  deploy-packages:
    runs-on: ubuntu-latest
    needs: [build]
    if: github.event.pull_request == false
    steps:
      - uses: actions/download-artifact@v2
        with:
          name: _site
          path: _site/
      # upload via FTP
```

# Recap

This was really easy!  
After a comment it takes about 2-4 minutes for the comment to appear, but for a simple blog like this one, I think that is absolutely fine.

Let me know in the comments below what you think about this solution!

Stay awesome!  
Manuel
