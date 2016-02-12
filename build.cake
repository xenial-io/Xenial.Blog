var target = Argument("target", "Default");

Task("Clean")
  .Does(() =>
{
  if(FileExists("Tools/Pretzel.zip"))
    DeleteFile("Tools/Pretzel.zip");
  if(DirectoryExists("Tools/Pretzel"))
    DeleteDirectory("Tools/Pretzel", true);
  if(DirectoryExists("_site"))
    DeleteDirectory("_site", true);
});


Task("DownloadPretzel")
  .IsDependentOn("Clean")
  .Does(() =>
{
   DownloadFile("https://github.com/Code52/pretzel/releases/download/v0.4.0/Pretzel.0.4.0.zip", "Tools/Pretzel.zip");
});

Task("UnzipPretzel")
  .IsDependentOn("DownloadPretzel")
  .Does(() =>
{
   Unzip("Tools/Pretzel.zip","Tools/Pretzel");
   DeleteFile("Tools/Pretzel.zip");
});

Task("Bake")
  .IsDependentOn("UnzipPretzel")
  .Does(() =>
{
   StartProcess("Tools/Pretzel/Pretzel.exe", new ProcessSettings{
      Arguments = "bake"
   });
});

Task("Taste")
  .IsDependentOn("UnzipPretzel")
  .Does(() =>
{
   StartProcess("Tools/Pretzel/Pretzel.exe", new ProcessSettings{
      Arguments = "taste"
   });
});

Task("Default")
  .IsDependentOn("Bake")
  .Does(() =>
{
});

RunTarget(target);