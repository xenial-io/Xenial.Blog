using System;
using System.Threading.Tasks;

using static Bullseye.Targets;

using static SimpleExec.Command;

namespace build
{
    class Program
    {
        static Task Main(string[] args)
        {
            Target("npm install", () => RunAsync("npm", "install", windowsName: NpmLocation));
            Target("npm run build", DependsOn("npm install"), () => RunAsync("npm", "run build", windowsName: NpmLocation));
            Target("npm", DependsOn("npm run build"));

            Target("build", DependsOn("npm"));

            Target("default", DependsOn("build"));

            return RunTargetsAndExitAsync(args);
        }

        static string NpmLocation => $@"{Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles)}\nodejs\npm.cmd";
    }
}
