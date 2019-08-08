#tool "nuget:?package=GitVersion.CommandLine"
#addin "nuget:?package=Cake.Yaml&version=3.1.0"
#addin "nuget:?package=YamlDotNet&version=6.1.2"

using YamlDotNet.Serialization;

var target = string.IsNullOrEmpty(Argument("target", "Default")) ? "Default" : Argument("target", "Default");
var endpoints = Argument("endpoints", "Chrome Headless,Firefox Headless");

var pretzelVersion = "0.7.1";

public class Pretzel
{
  [YamlMember(Alias = "engine", ApplyNamingConventions = false)]
  public string Engine {get;set;}
}

public class BlogConfig {
  [YamlMember(Alias = "pretzel", ApplyNamingConventions = false)]
  public Pretzel Pretzel {get;set;} = new Pretzel();
  [YamlMember(Alias = "exclude", ApplyNamingConventions = false)]
  public List<string> Exclude {get;set;} = new List<string>();
  [YamlMember(Alias = "include", ApplyNamingConventions = false)]
  public List<string> Include {get;set;} = new List<string>();
  [YamlMember(Alias = "author", ApplyNamingConventions = false)]
  public string Author { get; set; }    

  [YamlMember(Alias = "author-email", ApplyNamingConventions = false)]
  public string AuthorEmail { get; set; }    

  [YamlMember(Alias = "author-github", ApplyNamingConventions = false)]
  public string AuthorGithub { get; set; }    

  [YamlMember(Alias = "disqus-shortname", ApplyNamingConventions = false)]
  public string DisqusShortname { get; set; }    

  [YamlMember(Alias = "main-url", ApplyNamingConventions = false)]
  public string MainUrl { get; set; }    
  
  [YamlMember(Alias = "site-name", ApplyNamingConventions = false)]
  public string SiteName { get; set; }    
    
  [YamlMember(Alias = "feed-name", ApplyNamingConventions = false)]
  public string FeedName { get; set; }    
    
  [YamlMember(Alias = "site-url", ApplyNamingConventions = false)]
  public string SiteUrl { get; set; }      
  [YamlMember(Alias = "version", ApplyNamingConventions = false)]
  public string Version { get; set; }
  [YamlMember(Alias = "commit", ApplyNamingConventions = false)]
  public string Commit { get; set; }    
  [YamlMember(Alias = "last-update", ApplyNamingConventions = false)]
  public string LastUpdate { get; set; }    

}

Task("Clean")
  .Does(() =>
{
  if(FileExists("Tools/Pretzel.zip"))
  {
    DeleteFile("Tools/Pretzel.zip");
  }
  if(DirectoryExists("Tools/Pretzel"))
  {
    DeleteDirectory("Tools/Pretzel", new DeleteDirectorySettings 
    {
      Recursive = true
    });
  }
  if(DirectoryExists("_site"))
  {
    DeleteDirectory("_site", new DeleteDirectorySettings 
    {
      Recursive = true
    });
  }
  if(DirectoryExists("_tests"))
  {
    DeleteDirectory("_tests", new DeleteDirectorySettings 
    {
      Recursive = true
    });
  }
});

Task("DownloadPretzel")
  .IsDependentOn("Clean")
  .Does(() => DownloadFile($"https://github.com/Code52/pretzel/releases/download/v{pretzelVersion}/Pretzel.{pretzelVersion}.zip", "Tools/Pretzel.zip"));

Task("UnzipPretzel")
  .IsDependentOn("DownloadPretzel")
  .Does(() =>
{
   Unzip("Tools/Pretzel.zip","Tools/Pretzel");
   DeleteFile("Tools/Pretzel.zip");
});

Task("UpdateVersionInfo")
    .Does(() =>
    {
      var result = GitVersion();
      var config = DeserializeYamlFromFile<BlogConfig>("./_config.yml");
      config.Version = result.FullSemVer;
      config.Commit = result.Sha;
      config.LastUpdate = result.CommitDate;
      SerializeYamlToFile("./_config.yml", config);
    });

Task("Only-Bake")
  .IsDependentOn("UpdateVersionInfo")
  .Does(() =>
  {
    using(var process = StartAndReturnProcess("Tools/Pretzel/Pretzel.exe", new ProcessSettings
    {
      Arguments = "bake"
    }))
    {
      process.WaitForExit();
      var result = process.GetExitCode();
      Information("Exit code: {0}", result);
      
      if(result != 0)
      {
        throw new Exception($"Pretzel did not bake correctly: Error-Code: {result}"); 
      }
    }
  });

Task("Bake")
  .IsDependentOn("UnzipPretzel")
  .IsDependentOn("Only-Bake");

Task("Only-Taste")
  .Does(() =>
  {
    using(var process = StartAndReturnProcess("Tools/Pretzel/Pretzel.exe", new ProcessSettings
    {
      Arguments = "taste"
    }))
    {
      process.WaitForExit();
      var result = process.GetExitCode();
      Information("Exit code: {0}", result);
      
      if(result != 0)
      {
        throw new Exception($"Pretzel did not taste correctly: Error-Code: {result}"); 
      }
    }
  });

Task("Taste")
  .IsDependentOn("UnzipPretzel")
  .IsDependentOn("Only-Taste");

Task("Draft")
  .Does(() =>
  {
    using(var process = StartAndReturnProcess("Tools/Pretzel/Pretzel.exe", new ProcessSettings
    {
      Arguments = "ingredient --drafts"
    }))
    {
      process.WaitForExit();
      var result = process.GetExitCode();
      Information("Exit code: {0}", result);
      
      if(result != 0)
      {
        throw new Exception($"Pretzel did not ingredient correctly: Error-Code: {result}"); 
      }
    }
  });

Task("Ingredient")
  .Does(() =>
  {
    using(var process = StartAndReturnProcess("Tools/Pretzel/Pretzel.exe", new ProcessSettings
    {
      Arguments = "ingredient"
    }))
    {
      process.WaitForExit();
      var result = process.GetExitCode();
      Information("Exit code: {0}", result);
      
      if(result != 0)
      {
        throw new Exception($"Pretzel did not ingredient correctly: Error-Code: {result}"); 
      }
    }
  });

var webtestit = MakeAbsolute(File(EnvironmentVariable("LOCALAPPDATA") + @"\Programs\rxse-app\Ranorex Webtestit.exe"));

Task("UI-Test")
  .IsDependentOn("UnzipPretzel")
  .WithCriteria(() => FileExists(webtestit))
  .Does(() => 
  {
    var port = 9999;
    
    using(var pretzelProcess = StartAndReturnProcess("Tools/Pretzel/Pretzel.exe", new ProcessSettings
    {
      Arguments = $"taste --nobrowser --p={port}",
      RedirectStandardOutput = true,
    }))
    {
      foreach(var output in pretzelProcess.GetStandardOutput())
      {
        Information(output);
        if(output == "Press 'Q' to stop the web host...")
        {
          break;
        }
      }
      try
      {       
        using(var process = StartAndReturnProcess(webtestit, new ProcessSettings
        {
          Arguments = $"run --report-file-name-pattern=UI-Tests --endpoints=\"{endpoints}\" --include-inactive-endpoints .\\tests\\ui-tests\\ts",
          RedirectStandardOutput = true,
          EnvironmentVariables = new Dictionary<string, string>
          {
            { "SITE_URL", "http://localhost" },
            { "SITE_PORT", port.ToString() },
          }
        }))
        { 
          foreach(var output in process.GetStandardOutput())
          {
            Information(output);
          }
          
          process.WaitForExit();
          var result = process.GetExitCode();
          Information("Exit code: {0}", result);
          
          if(result != 0)
          {
            throw new Exception($"Webtestit failed: Error-Code: {result}"); 
          }
        }

        var pretzelResult = pretzelProcess.GetExitCode();
        Information($"Exit code: {pretzelResult}");
        if(pretzelResult != 0)
        {
          throw new Exception($"Pretzel did not taste correctly: Error-Code: {pretzelResult}"); 
        }
      }
      finally
      {
        pretzelProcess.Kill();
      }
    }
  });


Task("Default")
  .IsDependentOn("Bake");

RunTarget(target);