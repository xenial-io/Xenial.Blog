using System;
using System.Threading.Tasks;
using YamlDotNet.Serialization;

using static Bullseye.Targets;
using static SimpleExec.Command;
using static System.Console;

var version = new Lazy<Task<string>>(async () => await ReadToolAsync(() => ReadAsync("dotnet", "minver -v e")));
var branch = new Lazy<Task<string>>(async () => await ReadAsync("git", "rev-parse --abbrev-ref HEAD"));
var lastUpdate = new Lazy<Task<string>>(async () => await ReadAsync("git", "log -1 --format=%cd "));

var NpmLocation = $@"{Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles)}\nodejs\npm.cmd";
var pretzelLocation = @"C:\f\git\pretzel\src\Pretzel\bin\Release\net5\Pretzel.exe";
var blogDirectory = "src\\content";
var defaultArguments = $"-s={blogDirectory} -d=../../_site";

Target("version", async () =>
{
    WriteLine(await version.Value);
    WriteLine(await branch.Value);
    WriteLine(await lastUpdate.Value);
});

Target("clean:npm", () => Ignored(() => RunAsync("cmd.exe", "/C rmdir /S /Q node_modules")));
Target("clean:_site", () => Ignored(() => RunAsync("cmd.exe", "/C rmdir /S /Q _site")));
Target("clean", DependsOn("clean:npm", "clean:_site"));

Target("npm:install", () => RunAsync("npm", "install", windowsName: NpmLocation));
Target("npm:run:build", DependsOn("npm:install"), () => RunAsync("npm", "run build", windowsName: NpmLocation));
Target("npm", DependsOn("npm:run:build"));

Target("build:blog", DependsOn("version"), () => RunAsync(pretzelLocation, $"bake {defaultArguments}"));

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
