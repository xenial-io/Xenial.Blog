---
 layout: post 
 title: "How to use Dependency Injection in XAF (ASP.NET WebApi/WebMvc) Part 3"
 series: how-to-use-dependency-injection-in-xaf
 tags: ["XAF", "XPO", "Web", "WebApi", "Testing", "UnitTesting", "Unity", "NUnit", "MVC", "async", "await"]
---
How to add support for ASP.NET WebAPI / MVC4 in XAF?
It is not quite complicated, but took me also some hours of work to get it running.

## Why?

We'd like to provide a WebAPI to other companies to reduce our amount of work, when handling with other companies data.

Microsoft's [WebAPI](https://www.asp.net/web-api)/[MVC4](https://www.asp.net/mvc) are great frameworks to easily write such platforms. [XPO](https://www.devexpress.com/) and [XAF](https://www.devexpress.com/Products/NET/Application_Framework/) are great products. So let's combine them.

## How?

First of all we need 3 new projects in our solution.
The first one is the WebApi project. The second one is the WebMvc Project. The third one will contain our Datatransfer objects to support strong typing. This one will be a portable class library.

## WebApi

In this project goes the whole big stuff (domain logic & co).
Let's start:

First of all we need to install the [Unity.WebAPI](https://nuget.org/packages/Unity.WebAPI/) nuget package. (Attention: if your project is strong signed, this will fail, but the source is not that hard ;))

We get this nice little bootstrapper class that allowes us to configure our UnityContainer.

```cs
public static class Bootstrapper
{
    public static void Initialise()
    {
        var container = BuildUnityContainer();

        GlobalConfiguration.Configuration.DependencyResolver = new Unity.WebApi.UnityDependencyResolver(container);
    }

    private static IUnityContainer BuildUnityContainer()
    {
        var container = new UnityContainer();

        // register all your components with the container here
        // e.g. container.RegisterType<ITestService, TestService>();

        return container;
    }
}
```

The only thing we need to do is call our `Bootstrapper` in our `Global.asax` file:

```cs
public class WebApiApplication : System.Web.HttpApplication
{
    protected void Application_Start()
    {
        AreaRegistration.RegisterAllAreas();

        WebApiConfig.Register(GlobalConfiguration.Configuration);
        FilterConfig.RegisterGlobalFilters(GlobalFilters.Filters);
        RouteConfig.RegisterRoutes(RouteTable.Routes);
        BundleConfig.RegisterBundles(BundleTable.Bundles);

        Bootstrapper.Initialise();
    }
}
```

Nothing special so far. This is default ASP.NET WebApi.

How to deal now with XPO? We need to bootstrap the  `Datalayer` and the `Session`:

The interface IDataLayerHelper is used to abstract the procress of creating an DataLayer:

```cs
public interface IDataLayerHelper
{
    IDataLayer DataLayer { get; }
}
```

The implementation is pretty straight forward. Notice that nothing is static here, except of the `XPDictionary` (cause this is the only thing that is very time consuming, and dosn't change at all, when the application is running)

```cs
public class DataLayerHelper : IDataLayerHelper
{
    private IDataLayer _DataLayer;
    public IDataLayer DataLayer
    {
        get
        {
            if (_DataLayer == null)
            {
                var connectionString = ConnectionString;
                XpoDefault.Session = null;

                _DataLayer = new ThreadSafeDataLayer(XpDictionary, GetConnectionProvider(connectionString));
            }

            return _DataLayer;
        }

    }

    private readonly static object lockObjectXpDictionary = new object();

    private volatile static XPDictionary _XpDictionary;
    private static XPDictionary XpDictionary
    {
        get
        {
            if (_XpDictionary == null)
            {
                lock (lockObjectXpDictionary)
                {
                    if (_XpDictionary == null)
                    {
                        _XpDictionary = new ReflectionDictionary();

                        _XpDictionary.GetDataStoreSchema(Assembly.GetExecutingAssembly(), typeof(XAFDISolutionModule).Assembly);
                    }
                }
            }
            return _XpDictionary;
        }
    }

    protected internal string _ConnectionString;

    protected internal AutoCreateOption _DefaultAutoCreateOption = AutoCreateOption.None;

    protected virtual string ConnectionString
    {
        get
        {
            if (string.IsNullOrEmpty(_ConnectionString) && ConfigurationManager.ConnectionStrings["ConnectionString"] != null)
                _ConnectionString = ConfigurationManager.ConnectionStrings["ConnectionString"].ConnectionString;

            return _ConnectionString;
        }
    }

    protected virtual IDataStore GetConnectionProvider(string connectionString)
    {
        return XpoDefault.GetConnectionProvider(connectionString, _DefaultAutoCreateOption);
    }
}
```

Now we need to register this `Type` with the correct `LifeTimeManager`:

```cs
public static class Bootstrapper
{
    public static void Initialise()
    {
        var container = BuildUnityContainer();

        GlobalConfiguration.Configuration.DependencyResolver = new Unity.WebApi.UnityDependencyResolver(container);
    }

    private static IUnityContainer BuildUnityContainer()
    {
        var unityContainer = new UnityContainer();

        unityContainer.RegisterType<IDataLayerHelper, DataLayerHelper>(new ContainerControlledLifetimeManager());

        return unityContainer;
    }
}
```

In this case we need a `ContainerControlledLifetimeManager` so the instance will live for every `ChildUnityContainer` that is created.

Of course we write a `UnitTest` for this:

```cs
[TestFixture]
[Category("CI")]
public class DataLayerHelperTest
{
    [Test]
    public void DataLayerHelper_Ctor_DoesNotThrowAnException()
    {
        Assert.DoesNotThrow(() =>
        {
            var helper = new DataLayerHelper();

            Assert.That(helper, Is.InstanceOf<DataLayerHelper>());
        });
    }

    [Test]
    public void DataLayerHelper_Can_Load_DataLayer_With_InMemoryConnectionString()
    {
        //Arrange
        var helper = new DataLayerHelper
            {
                _ConnectionString = InMemoryDataStore.GetConnectionStringInMemory(true),
                _DefaultAutoCreateOption = AutoCreateOption.DatabaseAndSchema
            };

        //Act
        var session = new UnitOfWork(helper.DataLayer);
        var bo = new MyBo1(session)
            {
                MyName = "test"
            };

        session.CommitTransaction();

        //Assert
        var itemToAssert = session.FindObject<MyBo1>(null);

        Assert.That(itemToAssert.MyName, Is.EqualTo("test"));
    }
}
```

Now we need a little interface that abstracts the creation of a new `Session` aka `UnityUnitOfWork`:

```cs
public interface IXpoHelper
{
    Session GetNewSession();
}
```

The implementation is easy:

```cs
public class XpoHelper : IXpoHelper
{
    private readonly IDataLayerHelper _DataLayerHelper;

    internal readonly IUnityContainer _UnityContainer;

    public XpoHelper(IUnityContainer unityContainer, IDataLayerHelper dataLayerHelper)
    {
        _DataLayerHelper = dataLayerHelper;
        _UnityContainer = unityContainer;
    }

    public Session GetNewSession()
    {
        return GetNewUnitOfWork();
    }

    UnityUnitOfWork GetNewUnitOfWork()
    {
        var uow = new UnityUnitOfWork(_DataLayerHelper.DataLayer)
        {
            UnityContainer = _UnityContainer
        };
        return uow;
    }
}
```

> Notice that we use here `ConstructorInjection`

The UnitTest:

```cs
[TestFixture]
[Category("CI")]
public class XpoHelperTest
{
    [Test]
    public void Ctor_OfXpoHelperTest_DoesNotThrowAnException()
    {
        //Arrange
        var dataLayerHelperMock = new Moq.Mock<IDataLayerHelper>();
        var unityContainerMock = new Moq.Mock<IUnityContainer>();

        //Act & Assert
        Assert.DoesNotThrow(() =>
        {
            var xpoHelper = new XpoHelper(unityContainerMock.Object, dataLayerHelperMock.Object);
            Assert.That(xpoHelper, Is.InstanceOf<XpoHelper>());
        });
    }

    [Test]
    public void GetNewSession_Creates_A_New_Session()
    {
        //Arrange
        var dataLayerHelperMock = new Moq.Mock<IDataLayerHelper>();
        dataLayerHelperMock.SetupGet(m => m.DataLayer).Returns(new SimpleDataLayer(new InMemoryDataStore()));

        var unityContainerMock = new Moq.Mock<IUnityContainer>();
        var sessionHelper = new XpoHelper(unityContainerMock.Object, dataLayerHelperMock.Object);

        //Act
        var session = sessionHelper.GetNewSession();

        //Assert
        Assert.That(session, Is.Not.Null);
        Assert.That(session, Is.InstanceOf<Session>());
    }
}
```

Now we also must register this guy in the `Bootstrapper`:

```cs
public static class Bootstrapper
{
    public static void Initialise()
    {
        var container = BuildUnityContainer();

        GlobalConfiguration.Configuration.DependencyResolver = new Unity.WebApi.UnityDependencyResolver(container);
    }

    private static IUnityContainer BuildUnityContainer()
    {
        var unityContainer = new UnityContainer();

        unityContainer.RegisterType<IDataLayerHelper, DataLayerHelper>(new ContainerControlledLifetimeManager());
        unityContainer.RegisterType<IXpoHelper, XpoHelper>();

        return unityContainer;
    }
}
```

## The portable assembly

> Note that the WebApi and WebMvc are using `.Net 4.5` to use the nice async/await featues we build the protable assembly with support for `.Net 4.0` support to use the calls from our *legacy* XAFSolution.

![Portable Lib](/img/posts/2013/2013-03-03-12_49_53-Add_Portable_Class_Library.png)

Here is the very simple `MyBo1-DTO`

```cs
public class MyBo1
{
    public int Oid { get; set; }
    public string MyName { get; set; }
}
```

## Back to the future, ahm WebApi

We know use a simple pattern called the [RepositoryPattern](https://msdn.microsoft.com/en-us/library/ff649690.aspx) to access our Database via XPO and keep testablility and [Seperation of Conserns](https://en.wikipedia.org/wiki/Separation_of_concerns):

```cs
public interface IBusinessObjectRepository
{
    Task<IEnumerable<MyBo1>> GetBusinessObjects();

    Task<MyBo1> GetBusinessObjectById(int id);

    Task<MyBo1> Save(MyBo1 bo);

    Task<MyBo1> Delete(int id);

    Task<MyBo1> Save(int id, MyBo1 value);
}
```

A nice an clean interface, isn't it? :)

The implementation is also not that complicated:

```cs
public class MyBo1Repository : IBusinessObjectRepository
{
    internal readonly IXpoHelper _Helper;

    public MyBo1Repository(IXpoHelper helper)
    {
        _Helper = helper;
    }

    MyBo1 CreateBusinessObject(XAFDISolution.Module.BusinessObjects.MyBo1 boXPO)
    {
        if(boXPO == null)
            return null;

        return new MyBo1()
            {
                Oid = boXPO.Oid,
                MyName = boXPO.MyName,
            };
    }

    XAFDISolution.Module.BusinessObjects.MyBo1 CreateBusinessObject(MyBo1 bo, Session session)
    {
        return MapBusinessObject(bo, new XAFDISolution.Module.BusinessObjects.MyBo1(session));
    }

    XAFDISolution.Module.BusinessObjects.MyBo1 MapBusinessObject(MyBo1 bo, XAFDISolution.Module.BusinessObjects.MyBo1 boXPO)
    {
        boXPO.MyName = bo.MyName;

        return boXPO;
    }

    public async Task<IEnumerable<MyBo1>> GetBusinessObjects()
    {
        return await Task<IEnumerable<MyBo1>>.Run(() => BusinessObjectsXPO.Select(CreateBusinessObject));
    }

    IEnumerable<XAFDISolution.Module.BusinessObjects.MyBo1> BusinessObjectsXPO
    {
        get
        {
            return new XPQuery<XAFDISolution.Module.BusinessObjects.MyBo1>(_Helper.GetNewSession());
        }
    }

    public async Task<MyBo1> GetBusinessObjectById(int id)
    {
        return CreateBusinessObject(_Helper.GetNewSession().GetObjectByKey<XAFDISolution.Module.BusinessObjects.MyBo1>(id));
    }

    public async Task<MyBo1> Save(MyBo1 bo)
    {
        return await Task<MyBo1>.Run(() =>
            {
                var session = _Helper.GetNewSession();
                var boToReturn = CreateBusinessObject(bo, session);
                session.CommitTransaction();

                return CreateBusinessObject(boToReturn);
            });
    }

    public async Task<MyBo1> Delete(int id)
    {
        return await Task<MyBo1>.Run(() =>
            {
                var session = _Helper.GetNewSession();
                var boXpo = session.GetObjectByKey<XAFDISolution.Module.BusinessObjects.MyBo1>(id);
                if (boXpo == null)
                    return CreateBusinessObject(null);

                session.Delete(boXpo);
                session.CommitTransaction();
                boXpo.Oid = -1;

                return CreateBusinessObject(boXpo);
            });
    }

    public async Task<MyBo1> Save(int id, MyBo1 bo)
    {
        return await Task<MyBo1>.Run(() =>
            {
                var session = _Helper.GetNewSession();
                var boXpo = session.GetObjectByKey<XAFDISolution.Module.BusinessObjects.MyBo1>(id);

                MapBusinessObject(bo, boXpo);

                session.CommitTransaction();

                return CreateBusinessObject(boXpo);
            });
    }
}
```

What we do here is basicly a proxy arround our XPO-Database-Objects and wrap the whole thing in async/await Tasks. The most complex thing that can happen are in the `CreateBusinessObject` and `MapBusinessObject` methods. Here is good testing absolutly necessary. If you miss a property the whole thing is unstable. The other side of the medal is that we can provide a clear interface to the database, and can decide how to serialize/deserialize data to the database.

The tests are also very interessting:

```cs
[TestFixture]
[Category("CI")]
public class MyBo1RepositoryTests
{
    [Test]
    public void Ctor_Is_Not_Throwing_An_Exception()
    {
        //Arrange
        var mockXpoHelper = new Mock<IXpoHelper>();

        //Act & Assert
        Assert.DoesNotThrow(() =>
        {
            var repo = new MyBo1Repository(mockXpoHelper.Object);

            Assert.That(repo, Is.InstanceOf<MyBo1Repository>());
        });
    }

    private IDataLayerHelper CreateDataLayer()
    {
        //Arrange
        var dataLayerHelperMock = new Moq.Mock<IDataLayerHelper>();
        dataLayerHelperMock.SetupGet(m => m.DataLayer).Returns(new SimpleDataLayer(new InMemoryDataStore()));
        return dataLayerHelperMock.Object;
    }

    [Test]
    public async void Save_A_New_Object_Will_Go_To_Database()
    {
        //Arrange
        var xpoHelper = new XpoHelper(new Mock<IUnityContainer>().Object, CreateDataLayer());

        var repo = new MyBo1Repository(xpoHelper);

        //Act
        var boToTest = new XAFDiSolution.DTO.MyBo1()
            {
                MyName = "Test Name"
            };

        await repo.Save(boToTest);

        //Assert
        var myBo1Expected = xpoHelper.GetNewSession().FindObject<XAFDISolution.Module.BusinessObjects.MyBo1>(null);

        Assert.That(myBo1Expected, Is.Not.Null);

        Assert.That(myBo1Expected.MyName, Is.EqualTo("Test Name"));
    }

    [Test]
    public async void Save_An_Existing_Object_Will_Modify_The_XPO_Object()
    {
        //Arrange
        var xpoHelper = new XpoHelper(new Mock<IUnityContainer>().Object, CreateDataLayer());

        var session = xpoHelper.GetNewSession();

        var existingXpoBo = new XAFDISolution.Module.BusinessObjects.MyBo1(session)
            {
                MyName = "Test existing",
            };

        session.CommitTransaction();

        var oid = session.FindObject<XAFDISolution.Module.BusinessObjects.MyBo1>(null).Oid;

        var repo = new MyBo1Repository(xpoHelper);

        //Act
        var boToTest = new XAFDiSolution.DTO.MyBo1()
        {
            MyName = "Test Name"
        };

        await repo.Save(oid, boToTest);

        //Assert
        var assertSession = xpoHelper.GetNewSession();
        var myBo1ExpectedCollection = assertSession.GetObjects(assertSession.GetClassInfo<XAFDISolution.Module.BusinessObjects.MyBo1>(), null, new SortingCollection(), 0, Int32.MaxValue, true, true);

        Assert.That(myBo1ExpectedCollection, Is.Not.Null);
        Assert.That(myBo1ExpectedCollection.Count, Is.EqualTo(1));

        Assert.That(myBo1ExpectedCollection.OfType<XAFDISolution.Module.BusinessObjects.MyBo1>().ElementAt(0).MyName, Is.EqualTo("Test Name"));
    }

    [Test]
    public async void GetBusinessObjects_With_Empty_Database_Does_Not_Return_Null()
    {
        //Arrange
        var xpoHelper = new XpoHelper(new Mock<IUnityContainer>().Object, CreateDataLayer());

        var session = xpoHelper.GetNewSession();

        var repo = new MyBo1Repository(xpoHelper);

        //Act
        var result = await repo.GetBusinessObjects();

        //Assert
        Assert.That(result, Is.Not.Null);
        Assert.That(result.Count(), Is.EqualTo(0));
    }

    [Test]
    public async void GetBusinessObjects_With_Filled_Database_Returns_All_BusinessObjects_Correct()
    {
        //Arrange
        var xpoHelper = new XpoHelper(new Mock<IUnityContainer>().Object, CreateDataLayer());

        var session = xpoHelper.GetNewSession();

        var existingXpoBo1 = new XAFDISolution.Module.BusinessObjects.MyBo1(session)
        {
            MyName = "Test existing1",
        };

        var existingXpoBo2 = new XAFDISolution.Module.BusinessObjects.MyBo1(session)
        {
            MyName = "Test existing2",
        };

        session.CommitTransaction();

        var repo = new MyBo1Repository(xpoHelper);

        //Act

        var result = (await repo.GetBusinessObjects()).OrderBy(m => m.Oid);

        //Assert
        Assert.That(result, Is.Not.Null);
        Assert.That(result.Count(), Is.EqualTo(2));

        Assert.That(result.ElementAt(0).MyName, Is.EqualTo("Test existing1"));
        Assert.That(result.ElementAt(1).MyName, Is.EqualTo("Test existing2"));
    }

    [Test]
    public async void GetBusinessObjectById_With_Filled_Database_Returns_Correct_BusinessObject_With_Exisiting_Key_Property()
    {
        //Arrange
        var xpoHelper = new XpoHelper(new Mock<IUnityContainer>().Object, CreateDataLayer());

        var session = xpoHelper.GetNewSession();

        var existingXpoBo1 = new XAFDISolution.Module.BusinessObjects.MyBo1(session)
        {
            MyName = "Test existing1",
        };

        var existingXpoBo2 = new XAFDISolution.Module.BusinessObjects.MyBo1(session)
        {
            MyName = "Test existing2",
        };

        session.CommitTransaction();

        var oid = session.FindObject<Module.BusinessObjects.MyBo1>(CriteriaOperator.Parse("MyName = ?", "Test existing2")).Oid;

        var repo = new MyBo1Repository(xpoHelper);

        //Act

        var result = await repo.GetBusinessObjectById(oid);

        //Assert
        Assert.That(result, Is.Not.Null);
        Assert.That(result.MyName, Is.EqualTo("Test existing2"));
    }

    [Test]
    public async void GetBusinessObjectById_With_Empty_Database_Returns_Null_With_Non_Exisiting_Key_Property()
    {
        //Arrange
        var xpoHelper = new XpoHelper(new Mock<IUnityContainer>().Object, CreateDataLayer());

        var session = xpoHelper.GetNewSession();

        session.CommitTransaction();

        var repo = new MyBo1Repository(xpoHelper);

        //Act
        var result = await repo.GetBusinessObjectById(1);

        //Assert
        Assert.That(result, Is.Null);
    }

    [Test]
    public async void Delete_With_Filled_Database_Returns_Correct_BusinessObject_With_Exisiting_Key_Property()
    {
        //Arrange
        var xpoHelper = new XpoHelper(new Mock<IUnityContainer>().Object, CreateDataLayer());

        var session = xpoHelper.GetNewSession();

        var existingXpoBo1 = new XAFDISolution.Module.BusinessObjects.MyBo1(session)
        {
            MyName = "Test existing1",
        };

        var existingXpoBo2 = new XAFDISolution.Module.BusinessObjects.MyBo1(session)
        {
            MyName = "Test existing2",
        };

        session.CommitTransaction();

        var oid = session.FindObject<Module.BusinessObjects.MyBo1>(CriteriaOperator.Parse("MyName = ?", "Test existing2")).Oid;

        var repo = new MyBo1Repository(xpoHelper);

        //Act

        var result = await repo.Delete(oid);
        var collectionResult = await repo.GetBusinessObjects();

        //Assert
        Assert.That(result, Is.Not.Null);
        Assert.That(result.Oid, Is.EqualTo(-1));
        Assert.That(result.MyName, Is.EqualTo("Test existing2"));

        Assert.That(collectionResult, Is.Not.Null);
        Assert.That(collectionResult.Count(), Is.EqualTo(1));

        Assert.That(collectionResult.ElementAt(0).MyName, Is.EqualTo("Test existing1"));
    }

    [Test]
    public async void Delete_With_Empty_Database_Returns_Null()
    {
        //Arrange
        var xpoHelper = new XpoHelper(new Mock<IUnityContainer>().Object, CreateDataLayer());

        var repo = new MyBo1Repository(xpoHelper);

        //Act

        var result = await repo.Delete(1);
        var collectionResult = await repo.GetBusinessObjects();

        //Assert
        Assert.That(result, Is.Null);

        Assert.That(collectionResult, Is.Not.Null);
        Assert.That(collectionResult.Count(), Is.EqualTo(0));
    }
}
```

Do not forget to add the Repository to the UnityContainer:

```cs
public static class Bootstrapper
{
    public static void Initialise()
    {
        var container = BuildUnityContainer();

        GlobalConfiguration.Configuration.DependencyResolver = new Unity.WebApi.UnityDependencyResolver(container);
    }

    private static IUnityContainer BuildUnityContainer()
    {
        var unityContainer = new UnityContainer();

        unityContainer.RegisterType<IDataLayerHelper, DataLayerHelper>(new ContainerControlledLifetimeManager());
        unityContainer.RegisterType<IXpoHelper, XpoHelper>();
        unityContainer.RegisterType<IBusinessObjectRepository, MyBo1Repository>();

        return unityContainer;
    }
}
```

For now the data access aspect is finished. How to get the data now to the client?

We need to implement a new `MyBusinessObjectController` derived from `ApiController`;

```cs
public class MyBusinessObjectController : ApiController
{
    private readonly IBusinessObjectRepository _repository;

    public MyBusinessObjectController(IBusinessObjectRepository repository)
    {
        _repository = repository;
    }

    // GET api/MyBusinessObject
    public async Task<IEnumerable<MyBo1>> Get()
    {
        return await _repository.GetBusinessObjects();
    }

    // GET api/MyBusinessObject/5
    public async Task<MyBo1> Get(int id)
    {
        return await _repository.GetBusinessObjectById(id);
    }

    // POST api/MyBusinessObject
    public async Task<MyBo1> Post([FromBody]MyBo1 value)
    {
        return await _repository.Save(value);
    }

    // PUT api/MyBusinessObject/5
    public async Task<MyBo1> Put(int id, [FromBody]MyBo1 value)
    {
        return await _repository.Save(id, value);
    }

    // DELETE api/MyBusinessObject/5
    public async Task<MyBo1> Delete(int id)
    {
        return await _repository.Delete(id);
    }
}
```

Here we need no registration to create the controller, cause of the `Unity.WebApi` package we've imported via nuget.

The tests are not that clear cause we have to return tasks for now, but the async/await in the unittests helps us to write quite straight tests:

```cs
[TestFixture]
[Category("CI")]
public class MyBusinessObjectControllerTests
{
    [Test]
    public void Ctor_Does_Not_Throw_Exception()
    {
        //Arrage
        var mockRepo = new Mock<IBusinessObjectRepository>();

        //Act & Assert
        Assert.DoesNotThrow(() =>
        {
            var controller = new MyBusinessObjectController(mockRepo.Object);
            Assert.That(controller, Is.InstanceOf<MyBusinessObjectController>());
        });
    }

    [Test]
    public async void Get_Will_Call_Repo()
    {
        //Arrage
        var mockRepo = new Mock<IBusinessObjectRepository>();
        mockRepo.Setup(m => m.GetBusinessObjects()).Returns(() => Task.Run(() => new List<MyBo1>().AsEnumerable()));

        var controller = new MyBusinessObjectController(mockRepo.Object);

        //Act
        var result = await controller.Get();

        //Assert
        mockRepo.Verify(m => m.GetBusinessObjects(), Times.Exactly(1));
    }

    [Test]
    public async void Get_Will_Return_2_Bo()
    {
        //Arrage
        var mockRepo = new Mock<IBusinessObjectRepository>();
        mockRepo.Setup(m => m.GetBusinessObjects()).Returns(() => Task.Run(() => new List<MyBo1>() { new MyBo1() { MyName = "Test" }, new MyBo1() {MyName = "Test2"} }.AsEnumerable()));

        var controller = new MyBusinessObjectController(mockRepo.Object);

        //Act
        var result = (await controller.Get()).OrderBy(m => m.Oid);

        //Assert
        Assert.That(result, Is.Not.Null);
        Assert.That(result.Count(), Is.EqualTo(2));
        Assert.That(result.ElementAt(0).MyName, Is.EqualTo("Test"));
        Assert.That(result.ElementAt(1).MyName, Is.EqualTo("Test2"));
    }

    [Test]
    public async void Get_Will_Return_1_Bo()
    {
        //Arrage
        var mockRepo = new Mock<IBusinessObjectRepository>();
        mockRepo.Setup(m => m.GetBusinessObjectById(It.IsAny<int>())).Returns(() => Task.Run(() => new MyBo1() { MyName = "Test" }));

        var controller = new MyBusinessObjectController(mockRepo.Object);

        //Act
        var result = await controller.Get(1);

        //Assert
        Assert.That(result, Is.Not.Null);
        Assert.That(result.MyName, Is.EqualTo("Test"));
    }

    [Test]
    public async void Post_Will_Set_Something_Up_In_The_Database()
    {
        //Arrage
        var mockRepo = new Mock<IBusinessObjectRepository>();
        mockRepo.Setup(m => m.Save(It.IsAny<MyBo1>())).Returns(Task.Run(() => new MyBo1() { Oid = 1, MyName = "Test" }));

        var controller = new MyBusinessObjectController(mockRepo.Object);

        //Act
        var bo = new MyBo1() { MyName = "Test" };
        var result = await controller.Post(bo);

        //Assert
        mockRepo.Verify(m => m.Save(bo), Times.Exactly(1));
        Assert.That(result, Is.Not.Null);
        Assert.That(result.Oid, Is.EqualTo(1));
        Assert.That(result.MyName, Is.EqualTo("Test"));
    }

    [Test]
    public async void Put_Will_Set_Something_Up_In_The_Database()
    {
        //Arrage
        var mockRepo = new Mock<IBusinessObjectRepository>();
        mockRepo.Setup(m => m.Save(It.IsAny<int>(), It.IsAny<MyBo1>())).Returns(Task.Run(() => new MyBo1() { Oid = 1, MyName = "Test" }));

        var controller = new MyBusinessObjectController(mockRepo.Object);

        //Act
        var bo = new MyBo1() { MyName = "Test" };
        var result = await controller.Put(1, bo);

        //Assert
        mockRepo.Verify(m => m.Save(1, bo), Times.Exactly(1));
        Assert.That(result, Is.Not.Null);
        Assert.That(result.Oid, Is.EqualTo(1));
        Assert.That(result.MyName, Is.EqualTo("Test"));
    }

    [Test]
    public async void Delete_Will_Set_Something_Up_In_The_Database()
    {
        //Arrage
        var mockRepo = new Mock<IBusinessObjectRepository>();
        mockRepo.Setup(m => m.Delete(It.IsAny<int>())).Returns(Task.Run(() => new MyBo1() { Oid = -1, MyName = "Test" }));

        var controller = new MyBusinessObjectController(mockRepo.Object);

        //Act
        var result = await controller.Delete(1);

        //Assert
        mockRepo.Verify(m => m.Delete(1), Times.Exactly(1));
        Assert.That(result, Is.Not.Null);
        Assert.That(result.Oid, Is.EqualTo(-1));
        Assert.That(result.MyName, Is.EqualTo("Test"));
    }
}
```

### Ready to rock!

Starting up our [projects](https://msdn.microsoft.com/en-us/library/ms165413(v=vs.80).aspx) and see something in action.

Hit the page from our controller [http://localhost:3786/api/MyBusinessObject](http://localhost:3786/api/MyBusinessObject) we get this result:

```xml
<ArrayOfMyBo1 xmlns:i="http://www.w3.org/2001/XMLSchema-instance" xmlns="http://schemas.datacontract.org/2004/07/XAFDiSolution.DTO">
    <MyBo1>
        <MyName>Hello from the Win Project: My Dependencies: XAFDISolution.Module.Win.DomainLogic.WinRenamer XAFDISolution.Core.UnityObjectSpaceSession id:XAFDISolution.Core.UnityUnitOfWork(13)</MyName>
        <Oid>2</Oid>
    </MyBo1>
    <MyBo1>
        <MyName>Hello from the Win Project: My Dependencies: XAFDISolution.Module.Win.DomainLogic.WinRenamer XAFDISolution.Core.UnityObjectSpaceSession id:XAFDISolution.Core.UnityUnitOfWork(5)</MyName>
        <Oid>0</Oid>
    </MyBo1>
    <MyBo1>
        <MyName>Hello from the Win Project: My Dependencies: XAFDISolution.Module.Win.DomainLogic.WinRenamer XAFDISolution.Core.UnityObjectSpaceSession id:XAFDISolution.Core.UnityUnitOfWork(12)</MyName>
        <Oid>1</Oid>
    </MyBo1>
</ArrayOfMyBo1>
```

Nice or is it? :)

Let's check out [fiddler](https://www.fiddler2.com/fiddler2/) an see if we can get some [JSON](https://www.json.org/) from our api.

![Fiddler input](/img/posts/2013/fiddler_input.png)

Outputs:

![Fiddler output](/img/posts/2013/fiddler_output.png)

Nice!
Lets input some data:

![Post from fiddler](/img/posts/2013/post_from_fiddler.png)

![XAF Post from fiddler](/img/posts/2013/XAF_Post_From_Fiddler.png)

Update some data:

![Update from Fiddler](/img/posts/2013/put_from_fiddler.png)

![XAF Update from fiddler](/img/posts/2013/XAF_Put_From_Fiddler.png)

And delete it:

![Delete from fiddler](/img/posts/2013/delete_from_fiddler.png)

![XAF Delete from fiddler](/img/posts/2013/XAF_Delete_From_Fiddler.png)

> As you maybe noticed, i've never startet the application so far. The unit-testing works like a charm.

## WebMvc

Here we need a little different package from nuget. Install [Unity.WebMvc3](https://nuget.org/packages/Unity.Mvc3/1.2) This will also work in Mvc4.

Our little friend the `Bootstrapper` is also present here:

```cs
public static class Bootstrapper
{
    public static void Initialise()
    {
        var container = BuildUnityContainer();

        DependencyResolver.SetResolver(new UnityDependencyResolver(container));
    }

    private static IUnityContainer BuildUnityContainer()
    {
        var container = new UnityContainer();

        // register all your components with the container here
        // it is NOT necessary to register your controllers

        // e.g. container.RegisterType<ITestService, TestService>();

        return container;
    }
}
```

Same thing here with the `Global.asax` file. We need to call the `Bootstrapper` once to get the nice DI-Thing:

```cs
public class MvcApplication : System.Web.HttpApplication
{
    protected void Application_Start()
    {
        AreaRegistration.RegisterAllAreas();

        WebApiConfig.Register(GlobalConfiguration.Configuration);
        FilterConfig.RegisterGlobalFilters(GlobalFilters.Filters);
        RouteConfig.RegisterRoutes(RouteTable.Routes);
        BundleConfig.RegisterBundles(BundleTable.Bundles);
        AuthConfig.RegisterAuth();

        Bootstrapper.Initialise();
    }
}
```

> Notice: The only thing we need in this assembly is the `XAFDISolution.DTO` Reference. Don't reference any XPO-specific here!!

Unfortunately the portable lib doesn't provide support for the `Task<T>` class we used so far, so we have to recreate the `IBusinessObjectRepository`. But i don't like that. So i link the files via `Add Existing Item` feature from VisualStudio.

Now we need a new `Repository`. I call this one `WebApiBoRepository`:

```cs
public class WebApiBoRepository : IBusinessObjectRepository
{
    private readonly IEndpointProvider _endpointProvider;

    public WebApiBoRepository(IEndpointProvider endpointProvider)
    {
        _endpointProvider = endpointProvider;
    }

    private HttpClient CreateHttpClient()
    {
        var client = new HttpClient();

        client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

        client.BaseAddress = new Uri(_endpointProvider.WebApiEndpoint);
        return client;
    }

    public async Task<IEnumerable<MyBo1>> GetBusinessObjects()
    {
        var client = CreateHttpClient();

        var response = await client.GetAsync("api/MyBusinessObject");

        response.EnsureSuccessStatusCode();

        return await response.Content.ReadAsAsync<IEnumerable<MyBo1>>();
    }

    public async Task<MyBo1> GetBusinessObjectById(int id)
    {
        var client = CreateHttpClient();

        var response = await client.GetAsync("api/MyBusinessObject/" + id);

        response.EnsureSuccessStatusCode();

        return await response.Content.ReadAsAsync<MyBo1>();
    }

    public async Task<MyBo1> Save(MyBo1 bo)
    {
        var client = CreateHttpClient();

        var response = await client.PostAsync("api/MyBusinessObject/", bo, new JsonMediaTypeFormatter());

        response.EnsureSuccessStatusCode();

        return await response.Content.ReadAsAsync<MyBo1>();
    }

    public async Task<MyBo1> Delete(int id)
    {
        var client = CreateHttpClient();

        var response = await client.DeleteAsync("api/MyBusinessObject/" + id);

        response.EnsureSuccessStatusCode();

        return await response.Content.ReadAsAsync<MyBo1>();
    }

    public async Task<MyBo1> Save(int id, MyBo1 bo)
    {
        var client = CreateHttpClient();

        var response = await client.PutAsync("api/MyBusinessObject/" + id, bo, new JsonMediaTypeFormatter());

        response.EnsureSuccessStatusCode();

        return await response.Content.ReadAsAsync<MyBo1>();
    }
}
```

To avoid hard references to a singe WebApi-Endpoint we use a IEndpointProvider

```cs
public interface IEndpointProvider
{
    string WebApiEndpoint { get; }
}
```

And implement this really silly (but important) class:

```cs
public class HTTPEndpointProvider : IEndpointProvider
{
    public string WebApiEndpoint
    {
        get { return "http://localhost:3786/"; }
    }
}
```

If you need to implement SSL this [post](https://www.hanselman.com/blog/WorkingWithSSLAtDevelopmentTimeIsEasierWithIISExpress.aspx) from [Scott Hanselmann](https://www.hanselman.com) will help you, and you can use a SSLEndpointProvider:

```cs
public class SSLEndpointProvider : IEndpointProvider
{
    public string WebApiEndpoint
    {
        get { return "https://localhost:8443/"; }
    }
}
```

Don't forget to register the IEndpointProvider and the IBusinessObjectRepository

```cs
public static class Bootstrapper
{
    public static void Initialise()
    {
        var container = BuildUnityContainer();

        DependencyResolver.SetResolver(new UnityDependencyResolver(container));
    }

    private static IUnityContainer BuildUnityContainer()
    {
        var unityContainer = new UnityContainer();

        // register all your components with the container here
        // it is NOT necessary to register your controllers

        unityContainer.RegisterType<IEndpointProvider, HTTPEndpointProvider>();

        unityContainer.RegisterType<IBusinessObjectRepository, WebApiBoRepository>();

        return unityContainer;
    }
}
```

So far i found no easy way to test this `Repository` without providing a WebApi. Maybe someone will provide this functionality :).

Now we need a simple `AsyncController` called `BOController`:

```cs
public class BOController : AsyncController
{
    private readonly IBusinessObjectRepository _repository;

    public BOController(IBusinessObjectRepository repository)
    {
        _repository = repository;
    }

    //
    // GET: /BO/
    public async Task<ActionResult> Index()
    {
        return View(await _repository.GetBusinessObjects());
    }

    //
    // GET: /BO/Details/5

    public async Task<ActionResult> Details(int id)
    {
        return View(await _repository.GetBusinessObjectById(id));
    }

    //
    // GET: /BO/Create

    public ActionResult Create()
    {
        return View();
    }

    //
    // POST: /BO/Create

    [HttpPost]
    public async Task<ActionResult> Create(MyBo1 bo)
    {
        if (ModelState.IsValid)
        {
            try
            {
                await _repository.Save(bo);

                return RedirectToAction("Index");
            }
            catch
            {
                return View(bo);
            }
        }
        return View(bo);
    }

    //
    // GET: /BO/Edit/5

    public async Task<ActionResult> Edit(int id)
    {
        return View(await _repository.GetBusinessObjectById(id));
    }

    //
    // POST: /BO/Edit/5

    [HttpPost]
    public async Task<ActionResult> Edit(int id, MyBo1 bo)
    {
        if (ModelState.IsValid)
        {
            try
            {
                _repository.Save(id, bo);

                return RedirectToAction("Index");
            }
            catch
            {
                return View(bo);
            }
        }
        return View(bo);
    }

    //
    // GET: /BO/Delete/5

    public async Task<ActionResult> Delete(int id)
    {
        return View(await _repository.GetBusinessObjectById(id));
    }

    //
    // POST: /BO/Delete/5

    [HttpPost]
    public async Task<ActionResult> Delete(int id, MyBo1 bo)
    {
        if (ModelState.IsValid)
        {
            try
            {
                bo = await _repository.Delete(id);

                return RedirectToAction("Index");
            }
            catch
            {
                return View(bo);
            }
        }
        return View(bo);
    }

}
```

The unit tests are simple:

```cs
[TestFixture]
[Category("CI")]
public class BOControllerTest
{
    [Test]
    public void Ctor_Does_Not_Throw_Exception()
    {
        //Arrange
        var mockRepository = new Mock<IBusinessObjectRepository>();

        //Arrange & Assert
        Assert.DoesNotThrow(() =>
        {
            var controller = new BOController(mockRepository.Object);
            Assert.That(controller, Is.InstanceOf<BOController>());
        });
    }

    [Test]
    public async void Index_Does_Call_Repo_Correct()
    {
        //Arrange
        var mockRepository = new Mock<IBusinessObjectRepository>();
        mockRepository.Setup(m => m.GetBusinessObjects())
                        .Returns(() => Task.Run(() => new List<MyBo1>().AsEnumerable()));
        var controller = new BOController(mockRepository.Object);

        //Act
        var result = (ViewResult) await controller.Index();

        //Assert
        Assert.That(result.Model, Is.Not.EqualTo(null));
        Assert.That(result.Model, Is.InstanceOf<IEnumerable<MyBo1>>());

        mockRepository.Verify(m => m.GetBusinessObjects(), Times.Exactly(1));
    }

    [Test]
    public async void Details_Does_Call_Repo_Correct()
    {
        //Arrange
        var mockRepository = new Mock<IBusinessObjectRepository>();
        mockRepository.Setup(m => m.GetBusinessObjectById(It.IsAny<int>())).Returns(() => Task.Run(() => new MyBo1{Oid = 1, MyName = "Test"}));
        var controller = new BOController(mockRepository.Object);

        //Act
        var result = (ViewResult)await controller.Details(1);

        //Assert
        Assert.That(result.Model, Is.Not.EqualTo(null));
        Assert.That(result.Model, Is.InstanceOf<MyBo1>());
        Assert.That((result.Model as MyBo1).Oid, Is.EqualTo(1));
        Assert.That((result.Model as MyBo1).MyName, Is.EqualTo("Test"));
        mockRepository.Verify(m => m.GetBusinessObjectById(1), Times.Exactly(1));
    }

    [Test]
    public  void Create_Does_Not_Call_Repo()
    {
        //Arrange
        var mockRepository = new Mock<IBusinessObjectRepository>();
        var controller = new BOController(mockRepository.Object);

        //Act
        var result = (ViewResult) controller.Create();

        //Assert
        mockRepository.Verify(m => m.GetBusinessObjectById(1), Times.Exactly(0));
    }

    [Test]
    public async void Create_Does_Call_Repo_Correct()
    {
        //Arrange
        var mockRepository = new Mock<IBusinessObjectRepository>();
        mockRepository.Setup(m => m.Save(It.IsAny<MyBo1>()));
        var controller = new BOController(mockRepository.Object);

        var expected = new MyBo1() {MyName = "Test"};
        //Act
        var result = (ViewResult)await controller.Create(expected);

        //Assert
        mockRepository.Verify(m => m.Save(expected), Times.Exactly(1));
    }

    [Test]
    public async void Edit_Does_Call_Repo_Correct()
    {
        //Arrange
        var mockRepository = new Mock<IBusinessObjectRepository>();
        mockRepository.Setup(m => m.GetBusinessObjectById(It.IsAny<int>())).Returns(() => Task.Run(() => new MyBo1 { Oid = 1, MyName = "Test" }));
        var controller = new BOController(mockRepository.Object);

        //Act
        var result = (ViewResult)await controller.Edit(1);

        //Assert
        Assert.That(result.Model, Is.Not.EqualTo(null));
        Assert.That(result.Model, Is.InstanceOf<MyBo1>());
        Assert.That((result.Model as MyBo1).Oid, Is.EqualTo(1));
        Assert.That((result.Model as MyBo1).MyName, Is.EqualTo("Test"));
        mockRepository.Verify(m => m.GetBusinessObjectById(1), Times.Exactly(1));
    }

    [Test]
    public async void Edit_Will_Update_Call_Repo_Correct()
    {
        //Arrange
        var mockRepository = new Mock<IBusinessObjectRepository>();
        mockRepository.Setup(m => m.Save(It.IsAny<int>(), It.IsAny<MyBo1>()));

        var controller = new BOController(mockRepository.Object);

        var expected = new MyBo1() {MyName = "Update"};
        //Act
        var result = (RedirectToRouteResult)await controller.Edit(1, expected);

        //Assert
        mockRepository.Verify(m => m.Save(1, expected), Times.Exactly(1));
    }

    [Test]
    public async void Delete_Will_Call_Repo_Correct()
    {
        //Arrange
        var mockRepository = new Mock<IBusinessObjectRepository>();
        mockRepository.Setup(m => m.GetBusinessObjectById(It.IsAny<int>())).Returns(() => Task.Run(() => new MyBo1 { Oid = 1, MyName = "Test" }));

        var controller = new BOController(mockRepository.Object);

        //Act
        var result = (ViewResult)await controller.Delete(1);

        //Assert
        mockRepository.Verify(m => m.GetBusinessObjectById(1), Times.Exactly(1));
    }

    [Test]
    public async void Delete_Will_Call_Repo_Delete_Correct()
    {
        //Arrange
        var mockRepository = new Mock<IBusinessObjectRepository>();
        mockRepository.Setup(m => m.Delete(It.IsAny<int>()));

        var controller = new BOController(mockRepository.Object);

        var expected = new MyBo1() { MyName = "Update" };
        //Act
        var result = (ViewResult)await controller.Delete(1, expected);

        //Assert
        mockRepository.Verify(m => m.Delete(1), Times.Exactly(1));
    }
}
```

## Views

Let's modify the scaffolded views:

Create.cshtml

```html
@model XAFDISolution.DTO.MyBo1

@{
    ViewBag.Title = "View2";
}

<h2>View2</h2>

@using (Html.BeginForm()) {
    @Html.ValidationSummary(true)

    <fieldset>
        <legend>MyBo1</legend>

        <div class="editor-label">
            @Html.LabelFor(model => model.MyName)
        </div>
        <div class="editor-field">
            @Html.EditorFor(model => model.MyName)
            @Html.ValidationMessageFor(model => model.MyName)
        </div>

        <p>
            <input type="submit" value="Create" />
        </p>
    </fieldset>
}

<div>
    @Html.ActionLink("Back to List", "Index")
</div>

@section Scripts {
    @Scripts.Render("~/bundles/jqueryval")
}
```

Delete.cshtml

```html
@model XAFDISolution.DTO.MyBo1

@{
    ViewBag.Title = "Delete";
}

<h2>Delete</h2>

<h3>Are you sure you want to delete this?</h3>
<fieldset>
    <legend>MyBo1</legend>

    <div class="display-label">
            @Html.DisplayNameFor(model => model.Oid)
    </div>
    <div class="display-field">
        @Html.DisplayFor(model => model.Oid)
    </div>

    <div class="display-label">
            @Html.DisplayNameFor(model => model.MyName)
    </div>
    <div class="display-field">
        @Html.DisplayFor(model => model.MyName)
    </div>
</fieldset>
@using (Html.BeginForm()) {
    <p>
        <input type="submit" value="Delete" /> |
        @Html.ActionLink("Back to List", "Index")
    </p>
}
```

Details.cshtml

```html
@model XAFDISolution.DTO.MyBo1

@{
    ViewBag.Title = "Details";
}

<h2>Details</h2>

<fieldset>
    <legend>MyBo1</legend>

    <div class="display-label">
            @Html.DisplayNameFor(model => model.Oid)
    </div>
    <div class="display-field">
        @Html.DisplayFor(model => model.Oid)
    </div>

    <div class="display-label">
            @Html.DisplayNameFor(model => model.MyName)
    </div>
    <div class="display-field">
        @Html.DisplayFor(model => model.MyName)
    </div>
</fieldset>
<p>
    @Html.ActionLink("Edit", "Edit", new { id=Model.Oid  }) |
    @Html.ActionLink("Back to List", "Index")
</p>
```

Edit.cshtml

```html
@model XAFDISolution.DTO.MyBo1

@{
    ViewBag.Title = "Edit";
}

<h2>Edit</h2>

@using (Html.BeginForm()) {
    @Html.ValidationSummary(true)

    <fieldset>
        <legend>MyBo1</legend>

        <div class="editor-label">
            @Model.Oid
        </div>

        <div class="editor-label">
            @Html.LabelFor(model => model.MyName)
        </div>
        <div class="editor-field">
            @Html.EditorFor(model => model.MyName)
            @Html.ValidationMessageFor(model => model.MyName)
        </div>

        <p>
            <input type="submit" value="Save" />
        </p>
    </fieldset>
}

<div>
    @Html.ActionLink("Back to List", "Index")
</div>

@section Scripts {
    @Scripts.Render("~/bundles/jqueryval")
}
```

Index.cshtml

```html
@model IEnumerable<XAFDISolution.DTO.MyBo1>

@{
    ViewBag.Title = "View1";
}

<h2>View1</h2>

<p>
    @Html.ActionLink("Create New", "Create")
</p>
<table>
    <tr>
        <th>
            @Html.DisplayNameFor(model => model.Oid)
        </th>
        <th>
            @Html.DisplayNameFor(model => model.MyName)
        </th>
        <th></th>
    </tr>

@foreach (var item in Model) {
    <tr>
        <td>
            @Html.DisplayFor(modelItem => item.Oid)
        </td>
        <td>
            @Html.DisplayFor(modelItem => item.MyName)
        </td>
        <td>
            @Html.ActionLink("Edit", "Edit", new { id=item.Oid }) |
            @Html.ActionLink("Details", "Details", new { id=item.Oid }) |
            @Html.ActionLink("Delete", "Delete", new { id=item.Oid })
        </td>
    </tr>
}

</table>
```

## Action!

List:

![List MVC](/img/posts/2013/MVC_List.png)

Create:

![MVC Create](/img/posts/2013/MVC_Create.png)

Result:
![MVC Create Result](/img/posts/2013/MVC_Create2.png)

Details:

![MVC Details](/img/posts/2013/MVC_Details.png)

Edit:

![MVC Edit](/img/posts/2013/MVC_Edit.png)

Result:

![MVC Edit Result](/img/posts/2013/MVC_Edit1.png)

Delete:

![MVC Delete](/img/posts/2013/MVC_Delete.png)

Result:

![MVC Delete Result](/img/posts/2013/MVC_Delete1.png)

## Missing Parts

The one missing part is how to apply custom business logic for the XPO Object (Rename me, remember?). This will be covered in a future blog post.

## Check out the sources

* [Bitbucket](https://bitbucket.org/biohazard999/xafdisolution)
