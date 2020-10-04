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

var version = new Lazy<Task<string>>(async () => (await ReadToolAsync(() => ReadAsync("dotnet", "minver -v e", noEcho: true))).Trim());
var branch = new Lazy<Task<string>>(async () => (await ReadAsync("git", "rev-parse --abbrev-ref HEAD", noEcho: true)).Trim());
var lastUpdate = new Lazy<Task<string>>(async () => $"{UnixTimeStampToDateTime(await ReadAsync("git", "log -1 --format=%ct", noEcho: true)):yyyy-MM-dd}");
var hash = new Lazy<Task<string>>(async () => (await ReadAsync("git", "rev-parse HEAD", noEcho: true)).Trim());

var NpmLocation = $@"{Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles)}\nodejs\npm.cmd";
var pretzelLocation = @"C:\f\git\pretzel\src\Pretzel\bin\Release\net5\Pretzel.exe";
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

    await WriteConfig(config);
});

Target("version", DependsOn("version:read", "version:write"));

Target("clean:npm", () => Ignored(() => RunAsync("cmd.exe", "/C rmdir /S /Q node_modules")));
Target("clean:_site", () => Ignored(() => RunAsync("cmd.exe", "/C rmdir /S /Q _site")));
Target("clean", DependsOn("clean:npm", "clean:_site"));

Target("npm:install", () => RunAsync("npm", "install", windowsName: NpmLocation));
Target("npm:run:build", DependsOn("npm:install"), () => RunAsync("npm", "run build", windowsName: NpmLocation));
Target("npm", DependsOn("npm:run:build"));

Target("comments", async () =>
{
    var config = await ReadConfig();
    var repository = config["comment-repo"].ToString();
    var repoPath = Repository.Clone(repository, Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString()), new CloneOptions
    {
        IsBare = false
    });

    var posts = Directory.EnumerateFiles(postsDirectory);
    var postIds = posts.Select(GetPostId).Select(p => $"comments/{p}").ToList();
    using IGitDb db = new LocalGitDb(repoPath);
    var branchName = "master";

    foreach (var postId in postIds)
    {
        var pageInDb = await db.Get<Page>(branchName, postId);
        if(pageInDb != null)
        {
            var comments = pageInDb.Comments.OrderBy(m => m.Date).ToList();
            var data = new
            {
                commentsCount = comments.Count,
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

Target("build:blog", DependsOn("version", "comments"), () => RunAsync(pretzelLocation, $"bake {defaultArguments}"));

Target("build", DependsOn("clean", "npm", "build:blog"));


Target("default", DependsOn("build"));
await RunTargetsAndExitAsync(args);



static async Task RunToolAsync(Func<Task> action)
{
    try
    {
        await action();
    }
    catch (SimpleExec.NonZeroExitCodeException)
    {
        Console.WriteLine("Tool seams missing. Try to restore");
        await RunAsync("dotnet", "tool restore");
        await action();
    }
}

static async Task<string> ReadToolAsync(Func<Task<string>> action)
{
    try
    {
        return await action();
    }
    catch (SimpleExec.NonZeroExitCodeException)
    {
        Console.WriteLine("Tool seams missing. Try to restore");
        await RunAsync("dotnet", "tool restore");
        return await action();
    }
}


static async Task Ignored(Func<Task> action)
{
    try
    {
        await action();
    }
    catch (SimpleExec.NonZeroExitCodeException e)
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
public class Page
{
    public string Id { get; set; }

    public IList<Comment> Comments { get; } = new List<Comment>();
}

public class Comment
{
    public string Name { get; set; }
    public string GithubOrEmail { get; set; }
    public string Content { get; set; }
    public DateTime Date { get; set; }
    public string AvatarUrl { get; set; }
}