---
layout: post
title: Introducing dotnet new Scissors.XafTemplates
comments: true
tags: [XAF, Scissors, dotnet, dotnetcore, new, templates, template]
github: Scissors.XafTemplates
nuget: Scissors.XafTemplates
---

With the [command line renaissance](//lifehacker.com/geek-to-live-the-command-line-comeback-226223) and [dotnet core](//dotnet.microsoft.com/download) I almost never want to open up VisualStudio anymore.

The new [csproj format](//docs.microsoft.com/en-us/dotnet/core/tools/csproj) provides many advantages over the old csproj format.

- Human readable
- Better source control behavior (less code, nothing generated)
- Convention based

But there are no XAF-Templates yet. So I decided to create my own ones.

## Installation

You can find them on [nuget](https://www.nuget.org/packages/{{ page.nuget }}) or just install them via cli:


```cmd
dotnet new -i Scissors.XafTemplates
```

Afterwards you should see the following templates.

```txt
expressApp Framework Empty Module                   xaf-module           [C#]              Common/Console
expressApp Framework Empty WindowsForms Module      xaf-win-module       [C#]              Common/Console
expressApp Framework Winforms Application           xaf-win              [C#]              Common/Console
```

## Usage

To create an empty application (for now this will initialize with XPO, but that may change in the future)

```cmd
dotnet new xaf-win -o src -n Acme.DemoCenter
```

There are serval options you can use. Use the `--help` switch for more information:

```cmd
dotnet new xaf-win --help
```

```txt
Nutzung: new [Optionen]

Optionen:
  -h, --help          Displays help for this command.
  -l, --list          Lists templates containing the specified name. If no name is specified, lists all templates.
  -n, --name          The name for the output being created. If no name is specified, the name of the current directory is used.
  -o, --output        Location to place the generated output.
  -i, --install       Installs a source or a template pack.
  -u, --uninstall     Uninstalls a source or a template pack.
  --nuget-source      Specifies a NuGet source to use during install.
  --type              Filters templates based on available types. Predefined values are "project", "item" or "other".
  --dry-run           Displays a summary of what would happen if the given command line were run if it would result in a template creation.
  --force             Forces content to be generated even if it would change existing files.
  -lang, --language   Filters templates based on language and specifies the language of the template to create.


expressApp Framework Winforms Application (C#)
Author: Manuel Grundner
Options:
  --no-restore            If specified, skips the automatic restore of the project on create.
                          bool - Optional
                          Default: false / (*) true

  -tf|--target-framework
                          text - Optional
                          Default: net462

  -dx|--dx-version
                          text - Optional
                          Default: 19.1.2

  -U|--UseEasyTest
                          bool - Optional
                          Default: false / (*) true


* Indicates the value used if the switch is provided without a value.
```

The templates are rather basic for now, but I think it provides a lot of value, esp. if you don't want to leave the command line.

As always, you can find the sources on [github](//github.com/{{ site.author-github }}/{{ page.github }}) and let me know what you think!
