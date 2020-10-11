---
 layout: post 
 title: Comment system on static sites with dotnet core and Github actions
 tags: [dotnet, dotnetcore, asp, aspnet, .NET, git, github, "GHActions", "Jekyll"]
---

When designing the new blog I finally decided to replace the comment system previously provided by [disqus](https://disqus.com/) with a much leaner one.

I played around with several options like [staticman](https://staticman.net/), but I was never really convinced to adopt some of them. So I thought why not build my self one?

Most of the tools use git issues, or some own database, or are using [jekyll's data file features](https://jekyllrb.com/docs/datafiles/) and commit directly to the repository.  
This is per se not an issue, but I like to have _data_ separated from the content in the repository.

I came across an library called [Appy.GitDb](https://github.com/YellowLineParking/Appy.GitDb) that uses git as a key value store. I think this is a perfect use case for this library so I thought I give it a try a shot and came up with a simple but I think powerful and robust solution.

<!--more-->

## Architecture

<pre><code>@@sequence napkin
note left of Blog.Build
Clone Comments Repository
Prepares data directory
end note 
Blog.Build->Blog.Build: Build content of blog
Blog.Build->Blog: Upload via FTP
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
Comments.Repo->Blog.Build: Trigger build
</code></pre>

