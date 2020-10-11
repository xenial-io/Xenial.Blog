---
 layout: post 
 title: Comment system on static sites with dotnet core and Github actions
 tags: [dotnet, dotnetcore, asp, aspnet, .NET, git, github, "GHActions", "Jekyll", "Pretzel"]
 github: Xenial.Commentator
 author-github: xenial-io
---

When designing the new blog I finally decided to replace the comment system previously provided by [disqus](https://disqus.com/) with a much leaner one.

I played around with several options like [staticman](https://staticman.net/), but I was never really convinced to adopt some of them. So I thought why not build my self one?

Most of the tools use git issues, or some own database, or are using [jekyll's data file features](https://jekyllrb.com/docs/datafiles/) and commit directly to the repository.  
This is per se not an issue, but I like to have _data_ separated from the content in the repository.

I came across an library called [Appy.GitDb](https://github.com/YellowLineParking/Appy.GitDb) that uses git as a key value store. I think this is a perfect use case for this library so I thought I give it a try a shot and came up with a simple but I think powerful and robust solution.

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