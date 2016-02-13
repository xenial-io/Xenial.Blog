---
 layout: post 
 title: "Migrating from FunnelWeb to Pretzel - Part 1"
 comments: true
 tags: [Pretzel, Jekyll, Git]
---
After now almost 2.5 years, I start blogging again.
But with the old FunnelWeb system it would'nt be much fun.
It was buggy and very hard to write in the browser. So i used [MarkdownPad](//markdownpad.com/) to write my posts, copy them into the blogengine, and fixed syntax erros to get the code highlighting working.
What a mess!

So i decided to migrate to a more code and commandline centric engine: [Pretzel](//github.com/Code52/pretzel).

<!-- more -->
## Getting started

According to the [documentation](//github.com/Code52/pretzel/wiki/Installing-Pretzel) is is really simple to get going.

Using [Chocolatey](//chocolatey.org/) its a few keystrokes away.

Install `Chocolatey` if you don't have it allready. Fire up a admin commandpromt.

For the commandline:

```
@powershell -NoProfile -ExecutionPolicy Bypass -Command "iex ((new-object net.webclient).DownloadString('https://chocolatey.org/install.ps1'))" && SET PATH=%PATH%;%ALLUSERSPROFILE%\chocolatey\bin
```

Or using Powershell

```
iex ((new-object net.webclient).DownloadString('https://chocolatey.org/install.ps1'))
```

Next we install pretzel, initialize git and the blogengine:

```
choco install pretzel -y
  
mkdir myNewBlog
cd myNewBlog
    
git init

pretzel create
```

This will create the following output:

```
C:\tmp>mkdir myNewBlog

C:\tmp>cd myNewBlog

C:\tmp\myNewBlog>git init
Initialized empty Git repository in C:/tmp/myNewBlog/.git/

C:\tmp\myNewBlog>pretzel create
starting pretzel...
create - configure a new site
Using Liquid Engine
Pretzel site template has been created

C:\tmp\myNewBlog>
```

## Taste it!

```
pretzel taste
```

This will fire up a browser and start looking for all your html and md files in the blog, and regenerate the when files change. 

![Pretzel in the browser](/img/posts/2016/pretzel1.png)

Nice, we are good to go.
Stop tasting by hitting `Q`

Lets look in the blog directory by `explorer .`

![Pretzel in the explorer](/img/posts/2016/pretzel2.png)

Everything in this directory except `_site` should go under versioncontrol.

Lets start by getting a `.gitignore` file.
I used the `Jekyll` one because `Pretzel` is a port of `Jekyll` written in C#

```powershell
powershell
Invoke-WebRequest https://raw.githubusercontent.com/github/gitignore/master/Jekyll.gitignore -OutFile ".gitignore"
exit
```

Let's look at git:

```
git status
```

```dos
On branch master

Initial commit

Untracked files:
  (use "git add <file>..." to include in what will be committed)

        .gitignore
        _config.yml
        _includes/
        _layouts/
        _posts/
        about.md
        atom.xml
        css/
        img/
        index.html
        rss.xml
        sitemap.xml

nothing added to commit but untracked files present (use "git add" to track)
```

Okay, lets check this in what we have so far.

```
git add .
git commit -m "Pretzel blog is running"
```

Now we need to get sure we don't have files in our `_site` directory that are not needed

```
pretzel bake --cleantarget
explorer .\_site
```

![_site in the explorer](/img/posts/2016/pretzel2.png)

Open `_config.yml` and add a few lines we need in future blog posts.

```yaml
pretzel: 
    engine: liquid
    
exclude:
  - publish.ps1
  - build.cake
  - build.ps1
  - tools\
  - .git
  - .gitignore
  - add-tag.cmd
```

Lets checkin this.

```
git add .
git commit -m "Pretzel now excludes tools we need in the future"
```

Alright! That was easy. The next time we look how we build the blog in [Visual-Studio-Team-Services)[//www.visualstudio.com/en-us/products/visual-studio-team-services-vs.aspx] (former VSO, Visual-Studio-Online, now VSTS).