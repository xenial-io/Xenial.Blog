using System;
using System.IO;
using System.Threading.Tasks;

using static Bullseye.Targets;

using static SimpleExec.Command;

namespace build
{
    class Program
    {
        static Task Main(string[] args)
        {
            Target("clean:npm", () => Ignored(() => RunAsync("cmd.exe", "/C rmdir /S /Q node_modules")));
            Target("clean:_site", () => Ignored(() => RunAsync("cmd.exe", "/C rmdir /S /Q _site")));
            Target("clean", DependsOn("clean:npm", "clean:_site"));

            Target("npm:install", () => RunAsync("npm", "install", windowsName: NpmLocation));
            Target("npm:run:build", DependsOn("npm:install"), () => RunAsync("npm", "run build", windowsName: NpmLocation));
            Target("npm", DependsOn("npm:run:build"));

            Target("build", DependsOn("clean", "npm"));

            Target("default", DependsOn("build"));

            return RunTargetsAndExitAsync(args);
        }

        static string NpmLocation => $@"{Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles)}\nodejs\npm.cmd";

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
    }
}
