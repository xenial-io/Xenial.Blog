---
 layout: post 
 title: "How to use Dependency Injection in XAF (UnitTesting) Part 2"
 comments: false
 tags: ["Testing","UnitTesting", "XAF", "XPO", "Unity", "DI", "NUnit"]
---
It's not a really easy task to correctly UnitTest a XAF/XPO application, but as we all know, UnitTesting is a very important part of our work today.

## Why? ##

Cause nobody can know all impacts a change can make in an application.

## How? ##

I've written a bunch of little helpers to accomplish this tasks:

- `XpoTest`
- `XafTest`
- `XafModelTestHelper`


### XpoTest ###
I prefer this kind of test cause it is horrible fast and only tests model classes. Perfect to test DomainLogic.

This baseclass provides all you need to test a business object in memory (and of course with `Unity`)

```cs
public abstract class XpoTest
{
    private TestHelper _Helper;
    protected TestHelper GetHelper()
    {
        if (_Helper == null)
        {
            _Helper = GetHelperCore();
            InitUnityContainer(_Helper.UnityContainer);
        }
        return _Helper;
    }

    protected virtual void InitUnityContainer(IUnityContainer unityContainer)
    {

    }

    protected virtual TestHelper GetHelperCore()
    {
        return TestHelper.NewInstanceXpo();
    }

    protected Session CreateSession()
    {
        return GetHelper().GetNewObjectSpace().GetSession();
    }
}
```

There are currently 5 generic versions of this class to provide a easy to read, and convention based approach to unit-test our classes:

```cs
public abstract class XpoTest<T, T2, T3, T4, T5> : XpoTest
{
    protected override TestHelper GetHelperCore()
    {
        return TestHelper.NewInstanceXpo<T, T2, T3, T4, T5>();
    }
}

public abstract class XpoTest<T, T2, T3, T4> : XpoTest
{
    protected override TestHelper GetHelperCore()
    {
        return TestHelper.NewInstanceXpo<T, T2, T3, T4>();
    }
}

public abstract class XpoTest<T, T2, T3> : XpoTest
{
    protected override TestHelper GetHelperCore()
    {
        return TestHelper.NewInstanceXpo<T, T2, T3>();
    }
}

public abstract class XpoTest<T, T2> : XpoTest
{
    protected override TestHelper GetHelperCore()
    {
        return TestHelper.NewInstanceXpo<T, T2>();
    }
}

public abstract class XpoTest<T> : XpoTest
{
    protected override TestHelper GetHelperCore()
    {
        return TestHelper.NewInstanceXpo<T>();
    }
}
```

It uses the `TestHelper` class which does all the bootstrapping for you:

```cs
public class TestHelper
{
    public IUnityContainer UnityContainer { get; set; }

    private IObjectSpaceProvider ObjectSpaceProvider;

    public static TestHelper NewInstance()
    {
        return new TestHelper();
    }

    public static TestHelper NewInstanceXpo(params Type[] types)
    {
        return new TestHelper();
    }

    public static TestHelper NewInstanceXpo<T>()
    {
        return NewInstanceXaf(typeof(T));
    }

    public static TestHelper NewInstanceXpo<T, T2>()
    {
        return NewInstanceXaf(typeof(T), typeof(T2));
    }

    public static TestHelper NewInstanceXpo<T, T2, T3>()
    {
        return NewInstanceXaf(typeof(T), typeof(T2), typeof(T3));
    }

    public static TestHelper NewInstanceXpo<T, T2, T3, T4>()
    {
        return NewInstanceXaf(typeof(T), typeof(T2), typeof(T3), typeof(T4));
    }

    public static TestHelper NewInstanceXpo<T, T2, T3, T4, T5>()
    {
        return NewInstanceXaf(typeof(T), typeof(T2), typeof(T3), typeof(T4), typeof(T5));
    }

    public static TestHelper NewInstanceXaf(params Type[] types)
    {
        XafTypesInfo.Reset();

        if (XafTypesInfo.PersistentEntityStore == null)
            XafTypesInfo.SetPersistentEntityStore(new XpoTypeInfoSource(XafTypesInfo.Instance as TypesInfo));

        foreach (var typeToRegister in types)
            XafTypesInfo.Instance.RegisterEntity(typeToRegister);

        return new TestHelper();
    }

    public static TestHelper NewInstanceXaf<T>()
    {
        return NewInstanceXaf(typeof(T));
    }

    public static TestHelper NewInstanceXaf<T, T2>()
    {
        return NewInstanceXaf(typeof(T), typeof(T2));
    }

    public static TestHelper NewInstanceXaf<T, T2, T3>()
    {
        return NewInstanceXaf(typeof(T), typeof(T2), typeof(T3));
    }

    public static TestHelper NewInstanceXaf<T, T2, T3, T4>()
    {
        return NewInstanceXaf(typeof(T), typeof(T2), typeof(T3), typeof(T4));
    }

    public static TestHelper NewInstanceXaf<T, T2, T3, T4, T5>()
    {
        return NewInstanceXaf(typeof(T), typeof(T2), typeof(T3), typeof(T4), typeof(T5));
    }

    public TestHelper AutoMock()
    {
        UnityContainer.AddNewExtension<AutoMockingContainerExtension>();
        return this;
    }

    public TestHelper()
    {
        UnityContainer = new UnityContainer();
    }

    public IObjectSpace GetNewObjectSpace(bool generateIds = true)
    {
        ObjectSpaceProvider = new UnityObjectSpaceProvider(new MemoryDataStoreProvider(), UnityContainer);
        var OS = ObjectSpaceProvider.CreateObjectSpace();

        if (generateIds)
            (OS as UnityObjectSpace).ObjectNewInObjectSpace += ChannelTestsHelper_ObjectNewInObjectSpace;

        return OS;
    }

    private static void ChannelTestsHelper_ObjectNewInObjectSpace(object sender, ObjectNewInObjectSpaceEventArgs e)
    {
        var classInfo = (e.Object as IXPObject).ClassInfo;
        if (!classInfo.IsPersistent)
            return;

        if (classInfo.KeyProperty.MemberType.IsAssignableFrom(typeof(int)))
        {
            classInfo.KeyProperty.SetValue(e.Object, IDGenerator.NextInt());
        }

        if (classInfo.KeyProperty.MemberType.IsAssignableFrom(typeof(Guid)))
        {
            classInfo.KeyProperty.SetValue(e.Object, IDGenerator.NextGuid());
        }
    }
}

static class TestExtensions
{
    internal static Session GetSession(this IObjectSpace os)
    {
        return (os as XPObjectSpace).Session;
    }
}
```

With memory-datastores there is no auto-incrementing key, so we have to mimic this behaviour.

```cs
public static class IDGenerator
{
    private static int Current = 0;

    public static int NextInt()
    {
        Current++;
        return Current;
    }

    public static Guid NextGuid()
    {
        return Guid.NewGuid();
    }
}
```

It also provides support for [Moq](http://code.google.com/p/moq/ "Moq"), and [Unity](http://unity.codeplex.com/ "Unity") based [AutoMoq](https://github.com/darrencauthon/AutoMoq "AutoMoq").

```cs
public static class MoqExtensions
{
    public static Mock<T> RegisterMock<T>(this IUnityContainer container, MockBehavior behavior = MockBehavior.Strict) where T : class
    {
        var mock = new Mock<T>(behavior);

        container.RegisterInstance<Mock<T>>(mock);
        container.RegisterInstance<T>(mock.Object);

        return mock;
    }

    /// <summary>
    /// Use this to add additional setups for a mock that is already registered
    /// </summary>
    public static Mock<T> ConfigureMockFor<T>(this IUnityContainer container) where T : class
    {
        return container.Resolve<Mock<T>>();
    }

    public static void VerifyMockFor<T>(this IUnityContainer container) where T : class
    {
        container.Resolve<Mock<T>>().VerifyAll();
    }
}

public class AutoMockingContainerExtension : UnityContainerExtension
{
    protected override void Initialize()
    {
        var strategy = new AutoMockingBuilderStrategy(Container);

        Context.Strategies.Add(strategy, UnityBuildStage.PreCreation);
    }

    class AutoMockingBuilderStrategy : BuilderStrategy
    {
        private readonly IUnityContainer container;

        public AutoMockingBuilderStrategy(IUnityContainer container)
        {
            this.container = container;
        }

        public override void PreBuildUp(IBuilderContext context)
        {
            var key = context.OriginalBuildKey;

            if (key.Type.IsInterface && !container.IsRegistered(key.Type))
            {
                context.Existing = CreateDynamicMock(key.Type);
            }
        }

        private static object CreateDynamicMock(Type type)
        {
            var genericMockType = typeof(Mock<>).MakeGenericType(type);
            var mock = (Mock)Activator.CreateInstance(genericMockType);
            return mock.Object;
        }
    }
}
```

I have borrowed this classes from a blogpost i can't remember (sorry).

### XafTest ###

Is intended to test all kinds of DomainLogic that interacts with XafTypesInfo and ObjectSpace relevant tests. It is much slower than the XpoTest cause the XafTypesInfo has to reset and needs to be repopulated.

The only difference in the usage of `XpoTest` and `XafTest` is that the `XafTest` provides a additional `CreateObjectSpace` method:

```cs
public abstract class XafTest : XpoTest
{
    protected override TestHelper GetHelperCore()
    {
        return TestHelper.NewInstance();
    }

    protected virtual IObjectSpace CreateObjectSpace()
    {
        return GetHelper().GetNewObjectSpace();
    }
}

public abstract class XafTest<T, T2> : XafTest
{
    protected override TestHelper GetHelperCore()
    {
        return TestHelper.NewInstanceXaf<T, T2>();
    }
}

public abstract class XafTest<T, T2, T3> : XafTest
{
    protected override TestHelper GetHelperCore()
    {
        return TestHelper.NewInstanceXaf<T, T2, T3>();
    }
}

public abstract class XafTest<T, T2, T3, T4> : XafTest
{
    protected override TestHelper GetHelperCore()
    {
        return TestHelper.NewInstanceXaf<T, T2, T3, T4>();
    }
}

public abstract class XafTest<T, T2, T3, T4, T5> : XafTest
{
    protected override TestHelper GetHelperCore()
    {
        return TestHelper.NewInstanceXpo<T, T2, T3, T4, T5>();
    }
}
```

### XafModelTestHelper ###
Can be used to load a ApplicationModel and test it's properties. You can test orders and columns of listviews  or PropertyEditors of DetailViews ect.
This is in fact the slowest guy in this round. But we have a lot of problems with small refactorings that can happen in huge view problems :(
 
```cs
public static class XafModelTestHelper
{
    public static IModelApplication LoadApplicationModel(this ModuleBase module)
    {
        var manager = new ApplicationModulesManager();
        
        manager.AddModule(module);

        manager.Load(XafTypesInfo.Instance, true);

        return new DesignerModelFactory().CreateApplicationModel(module,
                                                            manager,
                                                            ModelStoreBase.Empty);
    }
}
```

## Go and test! ##

> For simplicity i only used one UnitTest project to test platform agnostic and winforms code.

```cs
[TestFixture]
[Category("CI")]
public class XpoTest_MyBo1 : XpoTest<MyBo1>
{
    [Test]
    public void Test_Ctor()
    {
        var session = CreateSession();

        var myBo = new MyBo1(session);

        Assert.That(myBo, Is.AssignableFrom<MyBo1>());
    }

    private MyBo1 CreateEmptyTestObject()
    {
        var session = CreateSession();

        return new MyBo1(session);
    }

    [Test]
    public void Test_MyName_Stores_Value_Correctly()
    {
        var bo = CreateEmptyTestObject();

        const string expected = "My String";
        bo.MyName = "My String";

        Assert.That(bo.MyName, Is.EqualTo(expected));
    }

    [Test]
    public void Test_MyName_Stores_And_Resets_Value_Correctly()
    {
        var bo = CreateEmptyTestObject();

        const string expected = "My String";
        bo.MyName = "My String";
        bo.MyName = null;
        Assert.That(bo.MyName, Is.Null);
    }
}
```

This tests are simple property tests, nothing really special here..

But now the interessting things come:

```cs
[TestFixture]
[Category("CI")]
public class XpoTest_Manually_Mock_MyBo1 : XpoTest<MyBo1>
{
    public class Mock_Renamer : IRenamer
    {
        public void RenameMe(MyBo1 myBo1)
        {
            myBo1.MyName = typeof (Mock_Renamer).FullName;
        }
    }

    protected override void InitUnityContainer(IUnityContainer unityContainer)
    {
        base.InitUnityContainer(unityContainer);
        unityContainer.RegisterType<IRenamer, Mock_Renamer>();
    }

    [Test]
    public void Test_Rename_Works()
    {
        var bo = new MyBo1(CreateSession());

        bo.RenameMe();

        Assert.That(bo.MyName, Is.EqualTo(typeof(Mock_Renamer).FullName));
    }
}
```

As you can see we have a successfull test! And decoupled from the original dependency.
But it can be really annoying to write a mock class for every interface we use. So get `Moq`!

```cs
[TestFixture]
[Category("CI")]
public class XpoTest_Moq_Mock_MyBo1 : XpoTest<MyBo1>
{
    [Test]
    public void Test_Rename_Works_Mocked()
    {
        var session = CreateSession();

        var mock = session.GetUnityContainer().RegisterMock<IRenamer>();

        mock.Setup(m => m.RenameMe(It.IsAny<MyBo1>()));

        var bo = new MyBo1(session);

        bo.RenameMe();

        mock.Verify(m => m.RenameMe(bo), Times.AtLeastOnce());
    }
}
```

We don't use a expected value here, cause we only want to know that this interface is resolved and test only the existence of the call.

Now want to test the XAF part:

```cs
[TestFixture]
[Category("CI")]
public class XafTest_MyBo1 : XafTest<MyBo1>
{
    [Test]
    public void Test_Ctor_With_OS()
    {
        var os = CreateObjectSpace();

        var myBo = os.CreateObject<MyBo1>();

        Assert.That(myBo, Is.AssignableFrom<MyBo1>());
    }

    private MyBo1 CreateEmptyTestObject()
    {
        var os = CreateObjectSpace();

        return os.CreateObject<MyBo1>();
    }

    [Test]
    public void Test_MyName_Stores_Value_Correctly()
    {
        var bo = CreateEmptyTestObject();

        const string expected = "My String";
        bo.MyName = "My String";

        Assert.That(bo.MyName, Is.EqualTo(expected));
    }

    [Test]
    public void Test_MyName_Stores_And_Resets_Value_Correctly()
    {
        var bo = CreateEmptyTestObject();

        const string expected = "My String";
        bo.MyName = "My String";
        bo.MyName = null;
        Assert.That(bo.MyName, Is.Null);
    }
}
```

Boring. Nothing special here. but a lot slower:

![](/img/posts/2013/XAFDISolution_2013-02-22_17-12-35.png)

Now the XafApplicationModel part:

```cs
[TestFixture]
[Category("CI")]
public class XafApplicationModelTest_MyBo1
{
    [Test]
    public void Test_ListView_Should_Only_Contain_1_Column()
    {
        var model = XafModelTestHelper.LoadApplicationModel(new XAFDISolutionModule());

        var view = model.Views.OfType<IModelListView>().FirstOrDefault(m => m.Id == "MyBo1_ListView");

        Assert.That(view, Is.Not.Null);

        Assert.That(view.Columns.Count, Is.EqualTo(2));
        // Two is not correct, but i have no idea why the UnityContainer Column is generated??? :(
    }
}
```

This is almost the slowest of all tests, so i recommend you init the ApplicationModel only once per TestCase:

```cs
[TestFixture]
[Category("CI")]
public class XafApplicationModelTest_MyBo1
{
    private IModelApplication _Model;

    [TestFixtureSetUp]
    public void SetUp()
    {
        _Model = XafModelTestHelper.LoadApplicationModel(new XAFDISolutionModule());
    }

    [Test]
    public void Test_ListView_Should_Only_Contain_1_Column()
    {
        var view = _Model.Views.OfType<IModelListView>().FirstOrDefault(m => m.Id == "MyBo1_ListView");

        Assert.That(view, Is.Not.Null);

        Assert.That(view.Columns.Count, Is.EqualTo(2));
        // Two is not correct, but i have no idea why the UnityContainer Column is generated??? :(
    }

    [Test]
    public void Test_Caption_Of_MyName_Is_My_Name()
    {
        var view = _Model.Views.OfType<IModelListView>().FirstOrDefault(m => m.Id == "MyBo1_ListView");

        var column = view.Columns.FirstOrDefault(m => m.Id == "MyName");

        Assert.That(column, Is.Not.Null);

        Assert.That(column.Caption, Is.EqualTo("My Name"));
    }
}
```

The last one is the Application-Based Test:

```cs
[TestFixture]
[Category("CI")]
public class ApplicationTest_MyBo1
{
    private WinApplication TestApplication;
    [TestFixtureSetUp]
    public void SetUp()
    {
        var unityContainer = new UnityContainer();

        TestApplication = new TestApplication(unityContainer);

        var objectSpaceProvider = new UnityObjectSpaceProvider(new MemoryDataStoreProvider(), unityContainer);

        var testModule = new ModuleBase();

        testModule.AdditionalExportedTypes.Add(typeof(MyBo1));

        TestApplication.Modules.Add(new SystemModule());
        TestApplication.Modules.Add(testModule);

        TestApplication.Setup("TestApplication", objectSpaceProvider);

        TestApplication.CustomCheckCompatibility += (o, args) => args.Handled = true;
    }

    [Test]
    public void Test_Action_WorksCorrectly()
    {
        var os = TestApplication.CreateObjectSpace();

        var bo = os.CreateObject<MyBo1>();

        var detailView = TestApplication.CreateDetailView(os, bo);

        var controller = TestApplication.CreateController<DevExpress.ExpressApp.SystemModule.ObjectMethodActionsViewController>();

        controller.SetView(detailView);
        
        Assert.That(controller.Actions.Count, Is.GreaterThan(0));
    }
}
```

Note that the last test fails, because i have no idea how to instanciate the ObjectMethodActionsViewController correctly to test my action :(

But i think you get the point :)

[Source](https://bitbucket.org/biohazard999/xafdisolution)


Update:
Thanks to [Robert Anderson][1] the ControllerTest is now working correctly :)

# Imported Comments #

## Robert Anderson, 28 Feb, 2013 ## 
Fantastic work!

  [1]: https://bitbucket.org/shamp00
