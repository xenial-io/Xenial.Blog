---
 layout: post 
 title: "How to use Dependency Injection in XAF"
 comments: false
 author: "Manuel Grundner"
 tags: ["XAF", "Unity", "DI"]
---
XAF has the ability to provide DependencyInjection over Domain-Componants, we use XPO so we don't have a chance to use this feature (and yes, i **hate static** methods! (**testing testing testing**))

[http://en.wikipedia.org/wiki/Dependency_injection](http://en.wikipedia.org/wiki/Dependency_injection)

# Why? #
It's simple. We have a legacy model with a lot of customers, and can't affort to recreate the model all and all over.

Testing abilities are also a huge factor for our development.

# How? #
It was a really *tricky* task to tell XAF & XPO the trick of DI (or IOC [http://en.wikipedia.org/wiki/Inversion_of_control](http://en.wikipedia.org/wiki/Inversion_of_control))


# Okay Let's start #

First of all: The sample uses Unity ([http://unity.codeplex.com](http://unity.codeplex.com)) cause it's well known and supported from microsoft (and fits our needs perfect), but it's also possible to extract this hard dependency through the Service Locator Pattern if you like to. ([http://en.wikipedia.org/wiki/Service_locator_pattern](http://en.wikipedia.org/wiki/Service_locator_pattern))

## The key interfaces! ##

First we need two simple interface's we can talk to:

```cs
public interface IUnityContainerProvider
{
    IUnityContainer UnityContainer { get; set; }
}

public interface IUnityModule
{
    void InitUnityContainer(IUnityContainer unityContainer);
    void UnityContainerInitialized(IUnityContainer unityContainer);
}
```

The `IUnityContainerProvider` is used for any class resolved by the `UnityContainer` to inject himself (we prefer `PropertyInjection` cause of the Session constructor forced by XPO.

The IUnityModule is intended to be implemented by a `DevExpress.ExpressApp.ModuleBase` derived type.

The `InitUnityContainer` is inteded to be called after the `Application.Setup()` method for each module loaded. The `UnityContainerInitialized` is called after the `InitUnityContainer` for each module. So we can *override* behavior provided by other modules.


## How the hell can this work with XAF? ##


I've played with this really long and still facing out some problems i've seen with our implementation, but this works for almost 2 years now. So i can say it works *almost* with no problems so long. *Till the next XAF update* ;)

### Children ###

Unity has the ability to create ChildContainer's from parent containers. This is nice cause the Frame concept in XAF is almost the same for the view handling.

We could *reuse* this for the domain-logic so we can simply write domain code without having to deal with different Sessions/UnitOfWorks/ObjectSpaces.

### Code it please! ###

Okay okay, dont hustle...

#### UnityUnitOfWork ####


First of all we need a `UnityUnitOfWork`. This Class provides a UnityContainer and stores itself as a instance of type `Session` and `UnitOfWork`.

```cs
public class UnityUnitOfWork : UnitOfWork, IUnityContainerProvider
{
    public UnityUnitOfWork() { }
    public UnityUnitOfWork(DevExpress.Xpo.Metadata.XPDictionary dictionary) : base(dictionary) { }
    public UnityUnitOfWork(IDataLayer layer, params IDisposable[] disposeOnDisconnect) : base(layer, disposeOnDisconnect) { }
    public UnityUnitOfWork(IObjectLayer layer, params IDisposable[] disposeOnDisconnect) : base(layer, disposeOnDisconnect) { }

    private IUnityContainer _UnityContainer;
    public IUnityContainer UnityContainer
    {
        get
        {
            return _UnityContainer;
        }
        set
        {
            value.RegisterInstance<UnitOfWork>(this, new HierarchicalLifetimeManager());
            value.RegisterInstance<Session>(this, new HierarchicalLifetimeManager());
            _UnityContainer = value;
        }
    }

    protected override NestedUnitOfWork CreateNestedUnitOfWork()
    {
        return new NestedUnityUnitOfWork(this);
    }
}
```

#### NestedUnityUnitOfWork ####

Cause XPO supports nested transactions we shouldn't miss the `NestedUnitOfWork` who is also a *full* `UnityOfWork`.

```cs
public class NestedUnityUnitOfWork : NestedUnitOfWork, IUnityContainerProvider
{
    protected internal NestedUnityUnitOfWork(Session parent)
        : base(parent)
    {
        UnityContainer = (parent as IUnityContainerProvider).UnityContainer.CreateChildContainer();
        UnityContainer.RegisterInstance<NestedUnitOfWork>(this, new HierarchicalLifetimeManager());
        UnityContainer.RegisterInstance<UnitOfWork>(this, new HierarchicalLifetimeManager());
        UnityContainer.RegisterInstance<Session>(this, new HierarchicalLifetimeManager());
    }

    public IUnityContainer UnityContainer { get; set; }

    protected override NestedUnitOfWork CreateNestedUnitOfWork()
    {
        return new NestedUnityUnitOfWork(this);
    }
}
```

## But what about XAF? ##

We need to provide the same functionality to the `XPObjectSpace` as well to the `XPNestedObjectSpace`.
### ObjectSpaces ###

#### UnityObjectSpace ####

```cs
public class UnityObjectSpace : XPObjectSpace, IUnityContainerProvider, IUnityObjectSpace
{
    public UnityObjectSpace(UnitOfWork unitOfWork) : base(unitOfWork) { }

    public UnityObjectSpace(ITypesInfo typesInfo, XpoTypeInfoSource xpoTypeInfoSource, CreateUnitOfWorkHandler createUnitOfWorkDelegate) : base(typesInfo, xpoTypeInfoSource, createUnitOfWorkDelegate) { }

    public IUnityContainer UnityContainer
    {
        get
        {
            if (Session is UnityUnitOfWork)
                return (Session as UnityUnitOfWork).UnityContainer;
            return null;
        }
        set { }
    }

    protected override UnitOfWork RecreateUnitOfWork()
    {
        var uow = base.RecreateUnitOfWork();
        if (uow is UnityUnitOfWork)
            (uow as UnityUnitOfWork).UnityContainer.RegisterInstance<IObjectSpace>(this, new HierarchicalLifetimeManager());
        return uow;
    }

    public override IObjectSpace CreateNestedObjectSpace()
    {
        var os = new UnityNestedObjectSpace(this);
        (os.Session as IUnityContainerProvider).UnityContainer.RegisterInstance<IObjectSpace>(os, new HierarchicalLifetimeManager());
        return os;
    }
}
```

#### UnityNestedObjectSpace ####

```cs 
public class UnityNestedObjectSpace : XPNestedObjectSpace, IUnityContainerProvider
{
    public UnityNestedObjectSpace(IObjectSpace parentObjectSpace)
        : base(parentObjectSpace) {}

    public IUnityContainer UnityContainer
    {
        get
        {
            return (Session as IUnityContainerProvider).UnityContainer;
        }
        set {}
    }

    public override IObjectSpace CreateNestedObjectSpace()
    {
        var nestedOS = new UnityNestedObjectSpace(this);
        nestedOS.AsyncServerModeSourceResolveSession = AsyncServerModeSourceResolveSession;
        nestedOS.AsyncServerModeSourceDismissSession = AsyncServerModeSourceDismissSession;

        (nestedOS.Session as IUnityContainerProvider).UnityContainer.RegisterInstance<IObjectSpace>(nestedOS, new HierarchicalLifetimeManager());

        return nestedOS;
    }


    protected override UnitOfWork RecreateUnitOfWork()
    {
        var Result = base.RecreateUnitOfWork();
        (Result as IUnityContainerProvider).UnityContainer.RegisterInstance<IObjectSpace>(this, new HierarchicalLifetimeManager());
        return Result;
    }
}
```

## Okay we have almost all we need, hurry up! ##

There are only 2 things missing. The infrastrucure for the `ObjectSpaceProviders` and the `XAFApplication`.

### ObjectSpaceProviders & Application ###


There are 2 versions of the `ObjectSpaceProvider`: Secured and Unsecured. 

First the unsecured version:

```cs
public class UnityObjectSpaceProvider : XPObjectSpaceProvider, IUnityContainerProvider
{
    public IUnityContainer UnityContainer { get; set; }

    public UnityObjectSpaceProvider(string connectionString, IDbConnection connection, IUnityContainer unityContainer) : base(connectionString, connection)
    {
        UnityContainer = unityContainer;
        unityContainer.RegisterInstance(typeof(IObjectSpaceProvider), this, new ContainerControlledLifetimeManager());
    }

    public UnityObjectSpaceProvider(IXpoDataStoreProvider dataStoreProvider, IUnityContainer unityContainer)
        : base(dataStoreProvider)
    {
        UnityContainer = unityContainer;
        unityContainer.RegisterInstance(typeof(IObjectSpaceProvider), this, new ContainerControlledLifetimeManager());
    }

    public UnityObjectSpaceProvider(IXpoDataStoreProvider dataStoreProvider, ITypesInfo typesInfo, XpoTypeInfoSource xpoTypeInfoSource, IUnityContainer unityContainer)
        : base(dataStoreProvider, typesInfo, xpoTypeInfoSource)
    {
        UnityContainer = unityContainer;
        unityContainer.RegisterInstance(typeof(IObjectSpaceProvider), this, new ContainerControlledLifetimeManager());
    }

    protected override IDataLayer CreateDataLayer(IDataStore dataStore)
    {
        var dataLayer = new SimpleDataLayer(this.XPDictionary, dataStore);

        return dataLayer;
    }

    protected override IObjectSpace CreateObjectSpaceCore()
    {
        var os = new UnityObjectSpace(TypesInfo, XpoTypeInfoSource, CreateUnitOfWorkDelegate);

        os.UnityContainer.RegisterInstance<IObjectSpace>(os, new HierarchicalLifetimeManager());

        return os;
    }

    protected override UnitOfWork CreateUnitOfWork(IDataLayer dataLayer)
    {
        var uow = new UnityUnitOfWork(dataLayer, null)
                    {
                        UnityContainer = UnityContainer.CreateChildContainer()
                    };

        return uow;
    }
}
```

And Secured:

```cs
public class SecureUnityObjectSpaceProvider : XPObjectSpaceProvider, IUnityContainerProvider
{
    private ISelectDataSecurityProvider SelectDataSecurityProvider;

    public bool AllowICommandChannelDoWithSecurityContext { get; set; }

    public SecureUnityObjectSpaceProvider(ISelectDataSecurityProvider selectDataSecurityProvider, IXpoDataStoreProvider dataStoreProvider, ITypesInfo typesInfo, XpoTypeInfoSource xpoTypeInfoSource, IUnityContainer unityContainer)
        : base(dataStoreProvider, typesInfo, xpoTypeInfoSource)
    {
        UnityContainer = unityContainer;
        SelectDataSecurityProvider = selectDataSecurityProvider;
        AllowICommandChannelDoWithSecurityContext = true;
    }

    public SecureUnityObjectSpaceProvider(ISelectDataSecurityProvider selectDataSecurityProvider, IXpoDataStoreProvider dataStoreProvider, IUnityContainer unityContainer)
        : base(dataStoreProvider)
    {
        UnityContainer = unityContainer;
        SelectDataSecurityProvider = selectDataSecurityProvider;
        AllowICommandChannelDoWithSecurityContext = true;
    }

    public SecureUnityObjectSpaceProvider(ISelectDataSecurityProvider selectDataSecurityProvider, string databaseConnectionString, IDbConnection connection, IUnityContainer unityContainer)
        : base(databaseConnectionString, connection)
    {
        UnityContainer = unityContainer;
        SelectDataSecurityProvider = selectDataSecurityProvider;
        AllowICommandChannelDoWithSecurityContext = true;
    }

    public IUnityContainer UnityContainer { get; set; }

    protected override IDataLayer CreateDataLayer(IDataStore dataStore)
    {
        var datalayer = new SimpleDataLayer(dataStore);

        return datalayer;
    }


    protected override IObjectSpace CreateObjectSpaceCore()
    {
        var os = new UnityObjectSpace(TypesInfo, XpoTypeInfoSource, CreateUnitOfWorkDelegate);

        os.UnityContainer.RegisterInstance<IObjectSpace>(os, new HierarchicalLifetimeManager());

        return os;
    }

    protected override UnitOfWork CreateUnitOfWork(IDataLayer dataLayer)
    {
        UnityUnitOfWork uow = new UnityUnitOfWork(dataLayer, null);

        uow.UnityContainer = UnityContainer.CreateChildContainer();

        SessionObjectLayer currentObjectLayer = new SecuredSessionObjectLayer(AllowICommandChannelDoWithSecurityContext, uow, true, null, new SecurityRuleProvider(XPDictionary, SelectDataSecurityProvider.CreateSelectDataSecurity()), null);

        var secureUnitOfWork = new UnityUnitOfWork(currentObjectLayer, uow);

        secureUnitOfWork.UnityContainer = uow.UnityContainer;

        return secureUnitOfWork;
    }
}
```

**Note: The second one is almost a clone of the `SecuredObjectSpaceProvider` provided by DevExpress but we didn't want to intercept this class with reflection so we made a *clone* to *inject* our needs.**


### Application & Bootstrapping ###

```cs
public class UnityModuleInitializer
{
    public void InitUnityModules(IUnityContainer container, IEnumerable<IUnityModule> modules)
    {
        foreach (var module in modules)
            module.InitUnityContainer(container);

        foreach (var module in modules)
            module.UnityContainerInitialized(container);
    }
}

public class UnityWinApplication : WinApplication, IUnityContainerProvider
{
    public IUnityContainer UnityContainer { get; set; }

    public UnityWinApplication() : this(new UnityContainer()) { }

    public UnityWinApplication(IUnityContainer container)
    {
        UnityContainer = container;
        UnityContainer.RegisterInstance<XafApplication>(this, new ContainerControlledLifetimeManager());

        SettingUp += ParaXAFApplication_SettingUp;
    }

    protected override void CreateDefaultObjectSpaceProvider(CreateCustomObjectSpaceProviderEventArgs args)
    {
        args.ObjectSpaceProvider = CreateUnityObjectSpaceProvider(args);
    }
    
    public XPObjectSpaceProvider CreateUnityObjectSpaceProvider(CreateCustomObjectSpaceProviderEventArgs e)
    {
        return new UnityObjectSpaceProvider(e.ConnectionString, e.Connection, UnityContainer);
    }

    void ParaXAFApplication_SettingUp(object sender, SetupEventArgs e)
    {
        new UnityModuleInitializer().InitUnityModules(UnityContainer, Modules.OfType<IUnityModule>());
    }
}
```

## Bring the stuff together ##

The Application:

```cs
public partial class XAFDISolutionWindowsFormsApplication : UnityWinApplication
{
    public XAFDISolutionWindowsFormsApplication(IUnityContainer container)
        : base(container)
    {
        InitializeComponent();
        DelayedViewItemsInitialization = true;
    }

    public XAFDISolutionWindowsFormsApplication() : this(new UnityContainer()) { }

    private void XAFDISolutionWindowsFormsApplication_DatabaseVersionMismatch(object sender, DevExpress.ExpressApp.DatabaseVersionMismatchEventArgs e)
    {
        if (System.Diagnostics.Debugger.IsAttached)
        {
            e.Updater.Update();
            e.Handled = true;
        }
        else
        {
            throw new InvalidOperationException(
                "The application cannot connect to the specified database, because the latter doesn't exist or its version is older than that of the application.\r\n" +
                "This error occurred  because the automatic database update was disabled when the application was started without debugging.\r\n" +
                "To avoid this error, you should either start the application under Visual Studio in debug mode, or modify the " +
                "source code of the 'DatabaseVersionMismatch' event handler to enable automatic database update, " +
                "or manually create a database using the 'DBUpdater' tool.\r\n" +
                "Anyway, refer to the 'Update Application and Database Versions' help topic at http://www.devexpress.com/Help/?document=ExpressApp/CustomDocument2795.htm " +
                "for more detailed information. If this doesn't help, please contact our Support Team at http://www.devexpress.com/Support/Center/");
        }
    }

    private void XAFDISolutionWindowsFormsApplication_CustomizeLanguagesList(object sender, CustomizeLanguagesListEventArgs e)
    {
        string userLanguageName = System.Threading.Thread.CurrentThread.CurrentUICulture.Name;
        if (userLanguageName != "en-US" && e.Languages.IndexOf(userLanguageName) == -1)
        {
            e.Languages.Add(userLanguageName);
        }
    }
}
```

And Program.cs

```cs
static class Program
{
    [STAThread]
    static void Main()
    {
        var unityContainer = new UnityContainer();

        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);
        EditModelPermission.AlwaysGranted = System.Diagnostics.Debugger.IsAttached;

        string connectionString = null;

        if (ConfigurationManager.ConnectionStrings["ConnectionString"] != null)
            connectionString = ConfigurationManager.ConnectionStrings["ConnectionString"].ConnectionString;

        var winApplication = new XAFDISolutionWindowsFormsApplication(unityContainer);
        winApplication.ConnectionString = connectionString;

        try
        {
            winApplication.Setup();
            winApplication.Start();
        }
        catch (Exception e)
        {
            winApplication.HandleException(e);
        }
    }
}
```

## Lets rock! ##

In our platform agnostic module we create a simple BO:

```cs
[Persistent]
[DefaultClassOptions]
public class MyBo1 : XPObject
{
    public MyBo1()
    {
    }

    public MyBo1(Session session) : base(session)
    {
    }

    public MyBo1(Session session, XPClassInfo classInfo) : base(session, classInfo)
    {
    }

    [NonPersistent]
    [MemberDesignTimeVisibility(false)]
    public IUnityContainer UnityContainer
    {
        get { return (Session as IUnityContainerProvider).UnityContainer; }
    }

    private string _MyName;
    [Size(SizeAttribute.Unlimited)]
    [Persistent]
    public string MyName
    {
        get { return _MyName; }
        set { SetPropertyValue("MyName", ref _MyName, value); }
    }

    [DevExpress.Persistent.Base.Action(Caption = "Rename Me!!!")]
    public void RenameMe()
    {
        UnityContainer.Resolve<IRenamer>().RenameMe(this);
    }
}
```

Notice there is a MethodAction that pulls out the dependency of `IRenamer'

```cs
public interface IRenamer
{
    void RenameMe(MyBo1 myBo1);
}
```

And a NullImplementation

```cs
public class NullRenamer : IRenamer
{
    [Dependency]
    public IObjectSpace OS { get; set; }

    public void RenameMe(MyBo1 myBo1)
    {
        //I should never be called.
    }
}
```

So we have a nice NullImplementation and we don't have to check allways if the dependency is already registered (performance).

In the Module we implement the interface `IUnityModule` and register the type of the `NullRenamer`

```cs
public sealed partial class XAFDISolutionModule : ModuleBase, IUnityModule
{
    public XAFDISolutionModule()
    {
        InitializeComponent();
    }

    public override IEnumerable<ModuleUpdater> GetModuleUpdaters(IObjectSpace objectSpace, Version versionFromDB)
    {
        ModuleUpdater updater = new DatabaseUpdate.Updater(objectSpace, versionFromDB);
        return new ModuleUpdater[] { updater };
    }

    public void InitUnityContainer(Microsoft.Practices.Unity.IUnityContainer unityContainer)
    {
        unityContainer.RegisterType<IRenamer, NullRenamer>();
    }

    public void UnityContainerInitialized(Microsoft.Practices.Unity.IUnityContainer unityContainer)
    {
        
    }
}
```

In the WinProject we create a new DomainLogic class called `WinRenamer`
```cs
public class WinRenamer : IRenamer
{
    [Dependency]
    public IObjectSpace OS { get; set; }

    public void RenameMe(MyBo1 myBo1)
    {
        //I should be be called.

        myBo1.MyName = "Hello from the Win Project: My Dependencies: " + GetType().FullName + " " + OS + "Session id:" + (OS as XPObjectSpace).Session;
    }
}
```

And the WinModule need's to overwrite the `IRenamer` registration

```cs
[ToolboxItemFilter("Xaf.Platform.Win")]
public sealed partial class XAFDISolutionWindowsFormsModule : ModuleBase, IUnityModule
{
    public XAFDISolutionWindowsFormsModule()
    {
        InitializeComponent();
    }
    public override IEnumerable<ModuleUpdater> GetModuleUpdaters(IObjectSpace objectSpace, Version versionFromDB)
    {
        return ModuleUpdater.EmptyModuleUpdaters;
    }

    public void InitUnityContainer(IUnityContainer unityContainer)
    {
        unityContainer.RegisterType<IRenamer, WinRenamer>();
    }

    public void UnityContainerInitialized(IUnityContainer unityContainer)
    {
        
    }
}
```

Thats it!

Check out the video on [Screencast][1]
And the source-code on [Bitbucket][2]

# Imported Comments #
## Petre, 03 Sep, 2015 ##

Hello Manuel,

I've been thinking of injecting dependencies into XPO objects and XAF Controllers and came across your blog.

It seems like you are making the container available to business objects? I believe it is a service locator anti-pattern.

I'm suggesting that you rework the solution by introducing dependencies in your classes, as opposed to having _container.Resolve calls, preferably initialized in a constructor (along with Session) or as injectable properties, and build the object graph in the Composition Root, i.e. at application startup.

Take a look at the following: http://blog.ploeh.dk/2010/02/03/ServiceLocatorisanAnti-Pattern/ http://blog.ploeh.dk/2011/07/28/CompositionRoot/

Thanks. Petre

## Manuel, 03 Feb, 2016 ##

Hi Petre,

you are absolute right. It IS an antipattern, but you can't control the creation of XPO Objects no'r XAF Controllers. There isn't event a point where you can do properly do Property or Method injection.

The main reason we use this in XPO Objects is to use some services like logging or Object initializers (AfterConstruction) from client specific assemblies/modules. Of course there are other patterns (EventAggregators, Messaging for example) that can handle this kind of problems, but at the time we didn't know how we can keep track of the objectspace scope.

Cause the fact that the lifetime of objects is controlled by XAF & XPO we didn't find a better way to do this.


  [1]: http://www.screencast.com/users/Paragraph-Software/folders/Jing/media/0fd30e6c-8757-4293-91e9-29a1a67e5443
  [2]: https://bitbucket.org/biohazard999/xafdisolution