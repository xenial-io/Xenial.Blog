using System;
using System.IO;
using System.Linq;
using System.Collections.Generic;
using System.Threading.Tasks;
using YamlDotNet.Serialization;

using static Bullseye.Targets;
using static SimpleExec.Command;
using static System.Console;
using LibGit2Sharp;
using Appy.GitDb.Local;
using Appy.GitDb.Core.Interfaces;
using Newtonsoft.Json;
using Newtonsoft.Json.Serialization;

var version = new Lazy<Task<string>>(async () => (await ReadToolAsync(() => ReadAsync("dotnet", "minver -v e"))).Trim());
var branch = new Lazy<Task<string>>(async () => (await ReadAsync("git", "rev-parse --abbrev-ref HEAD")).StandardOutput.Trim());
var lastUpdate = new Lazy<Task<string>>(async () => $"{UnixTimeStampToDateTime((await ReadAsync("git", "log -1 --format=%ct")).StandardOutput):yyyy-MM-dd}");
var hash = new Lazy<Task<string>>(async () => ((await ReadAsync("git", "rev-parse HEAD")).StandardOutput).Trim());

var blogDirectory = "src\\content";
var postsDirectory = Path.Combine(blogDirectory, "_posts");
var dataDirectory = Path.Combine(blogDirectory, "_data");
var configFile = Path.Combine(blogDirectory, "_config.yml");
var defaultArguments = $"-s={blogDirectory} -d=../../_site";

Target("version:read", async () =>
{
    WriteLine($"Version: {await version.Value}");
    WriteLine($"Branch: {await branch.Value}");
    WriteLine($"Update: {await lastUpdate.Value}");
    WriteLine($"Hash: {await hash.Value}");
});

Target("version:write", DependsOn("version:read"), async () =>
{
    var config = await ReadConfig();

    config["version"] = await version.Value;
    config["commit"] = await hash.Value;
    config["last-update"] = await lastUpdate.Value;

    if(!string.IsNullOrEmpty(Environment.GetEnvironmentVariable("XENIAL-IO")))
    {
        config["site-title"] = "blog.xenial.io";
        config["site-name"] = "blog.xenial.io";
        config["feed-name"] = "blog.xenial.io";
        config["site-url"] = "https://blog.xenial.io";
    }

    await WriteConfig(config);
});

Target("version", DependsOn("version:read", "version:write"));

Target("clean:npm", () => Ignored(() => RunAsync("cmd.exe", "/C rmdir /S /Q node_modules")));
Target("clean:_site", () => Ignored(() => RunAsync("cmd.exe", "/C rmdir /S /Q _site")));
Target("clean", DependsOn("clean:npm", "clean:_site"));

Target("npm:ci", () => RunAsync("npm", "ci"));
Target("npm:run:build", DependsOn("npm:ci"), () => RunAsync("npm", "run build"));
Target("npm", DependsOn("version", "npm:run:build"));


Target("clean:_data", () => Ignored(() => RunAsync("cmd.exe", $"/C rmdir /S /Q {dataDirectory}")));
Target("comments", DependsOn("clean:_data"), async () =>
{
    var config = await ReadConfig();
    var repository = config["comment-repo"].ToString();
    var branchName = config["comment-branch"].ToString();
    var repoPath = Repository.Clone(repository, Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString()), new CloneOptions
    {
        IsBare = false
    });

    var posts = Directory.EnumerateFiles(postsDirectory);
    var postIds = posts.Select(GetPostId).Select(p => $"comments/{p}").ToList();
    using IGitDb db = new LocalGitDb(repoPath);

    foreach (var postId in postIds)
    {
        var pageInDb = await db.Get<Page>(branchName, postId);
        if (pageInDb != null)
        {
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
});

Target("build:blog", DependsOn("version", "comments"), () => RunToolAsync(() => RunAsync("dotnet", $"pretzel bake {defaultArguments}")));

Target("build", DependsOn("clean", "npm", "build:blog"));

var deployDirectory = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString());

Target("deploy:copy", async () =>
{
    var connectionString = $"ftp://{Environment.GetEnvironmentVariable("FTP_USER")}:{Environment.GetEnvironmentVariable("FTP_PASS")}@{Environment.GetEnvironmentVariable("FTP_HOST")}{Environment.GetEnvironmentVariable("FTP_DIRECTORY")}";

    var config = new
    {
        @default = new
        {
            connection = connectionString
        }
    };

    await File.WriteAllTextAsync("_site/.creep.env", JsonConvert.SerializeObject(config, Formatting.Indented));

    DirectoryCopy("_site", deployDirectory, true);
});

Target("deploy", DependsOn("deploy:copy"), async () =>
{
    await RunAsync("creep", "-y -v", workingDirectory: deployDirectory);
});

Target("default", DependsOn("build"));

await RunTargetsAndExitAsync(args);

static async Task RunToolAsync(Func<Task> action)
{
    try
    {
        await action();
    }
    catch (SimpleExec.ExitCodeException)
    {
        Console.WriteLine("Tool seams missing. Try to restore");
        await RunAsync("dotnet", "tool restore");
        await action();
    }
}

static async Task<string> ReadToolAsync(Func<Task<(string StandardOutput, string StandardError)>> action)
{
    try
    {
        return (await action()).StandardOutput;
    }
    catch (SimpleExec.ExitCodeException)
    {
        Console.WriteLine("Tool seams missing. Try to restore");
        await RunAsync("dotnet", "tool restore");
        return (await action()).StandardOutput;
    }
}

static async Task Ignored(Func<Task> action)
{
    try
    {
        await action();
    }
    catch (SimpleExec.ExitCodeException e)
    {
        Console.WriteLine($"Action Failed. Ignored {e}");
    }
}

static DateTime UnixTimeStampToDateTime(string unixTimeStamp)
{
    var time = double.Parse(unixTimeStamp.Trim());
    var dtDateTime = new DateTime(1970, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc);
    dtDateTime = dtDateTime.AddSeconds(time).ToLocalTime();
    return dtDateTime;
}

async Task<Dictionary<object, object>> ReadConfig()
{
    var ymlContent = await File.ReadAllTextAsync(configFile);
    var deserializer = new DeserializerBuilder().Build();
    var result = deserializer.Deserialize<Dictionary<object, object>>(ymlContent);
    return result;
}

async Task WriteConfig(Dictionary<object, object> config)
{
    var serializer = new SerializerBuilder().Build();
    var ymlContent = serializer.Serialize(config);
    await File.WriteAllTextAsync(configFile, ymlContent);
}

string GetPostId(string post)
{
    var postName = Path.GetFileNameWithoutExtension(post);

    var year = postName[0..4];
    var month = postName[5..7];
    var day = postName[8..10];
    var name = postName[11..];

    return $"{year}/{month}/{day}/{name}";
}


static IEnumerable<Comment> Flatten(Page page)
{
    foreach (var comment in page.Comments)
    {
        foreach (var comment2 in Flatten(comment))
        {
            yield return comment2;
        }
        yield return comment;
    }


    static IEnumerable<Comment> Flatten(Comment comment)
    {
        foreach (var comment2 in comment.Comments)
        {
            yield return comment2;
        }
    }
}

static void DirectoryCopy(string sourceDirName, string destDirName, bool copySubDirs)
{
    // Get the subdirectories for the specified directory.
    var dir = new DirectoryInfo(sourceDirName);

    if (!dir.Exists)
    {
        throw new DirectoryNotFoundException(
            "Source directory does not exist or could not be found: "
            + sourceDirName);
    }

    var dirs = dir.GetDirectories();

    // If the destination directory doesn't exist, create it.       
    Directory.CreateDirectory(destDirName);

    // Get the files in the directory and copy them to the new location.
    var files = dir.GetFiles();
    foreach (var file in files)
    {
        var tempPath = Path.Combine(destDirName, file.Name);
        file.CopyTo(tempPath, false);
    }

    // If copying subdirectories, copy them and their contents to new location.
    if (copySubDirs)
    {
        foreach (var subdir in dirs)
        {
            var tempPath = Path.Combine(destDirName, subdir.Name);
            DirectoryCopy(subdir.FullName, tempPath, copySubDirs);
        }
    }
}

public class Page
{
    public string Id { get; set; }

    public IList<Comment> Comments { get; } = new List<Comment>();
}

public class Comment
{
    public string Id { get; set; }
    public string Name { get; set; }
    public string Homepage { get; set; }
    public string Content { get; set; }
    public DateTime Date { get; set; }
    public string AvatarUrl { get; set; }

    public bool isLast { get; set; }
    public bool isRoot { get; set; }
    public string replyTo { get; set; }
    public IList<Comment> Comments { get; set; } = new List<Comment>();
}
