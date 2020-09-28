---
 layout: post 
 title: "How to use Dependency Injection in XAF (ASP.NET Custom Actions) Part 4"
 series: how-to-use-dependency-injection-in-xaf
 comments: false
 tags: ["XAF", "XPO", "Web", "Unity", "UnitTesting", "async", "await", "WebApi", "MVC"]
---
Now we get to the interesting part. Dependency Injection for an [ApiAction](https://www.asp.net/web-api/overview/web-api-routing-and-actions/routing-and-action-selection).

The interface of the [first blog post](https://blog.paraoffice.at/how-to-use-dependency-injection-in-xaf) `IRenamer` looks like this:

```cs
public interface IRenamer
{
    void RenameMe(MyBo1 myBo1);
}
```

Our implementation from WebApi looks like this

```cs
public class WebApiRenamer : IRenamer
{
    public void RenameMe(MyBo1 myBo1)
    {
        myBo1.MyName = string.Format("I was renamed by '{0}'. Original Name '{1}'", typeof (WebApiRenamer).FullName, myBo1.MyName);
    }
}
```

Now we should register our `Renamer` in the `Bootstrapper`:

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
        unityContainer.RegisterType<IRenamer, WebApiRenamer>();

        return unityContainer;
    }
}
```

## The WebApiRepository ##

We need to extend the `IBusinessObjectRepository` with the method `Rename` that takes the `id` of an BusinessObject and returns it's `id`:

```cs
public interface IBusinessObjectRepository
{
    Task<IEnumerable<MyBo1>> GetBusinessObjects();

    Task<MyBo1> GetBusinessObjectById(int id);

    Task<MyBo1> Save(MyBo1 bo);

    Task<MyBo1> Delete(int id);

    Task<MyBo1> Save(int id, MyBo1 bo);

    Task<int> Rename(int id);
}
```

The implementation can look like this:

```cs
public class MyBo1Repository : IBusinessObjectRepository
{
    //...

    public Task<MyBo1> Rename(int id)
    {
        return Task.Run(() =>
        {
            var bo = this.BusinessObjectsXPO.FirstOrDefault(m => m.Oid == id);

            if (bo != null)
            {
                bo.RenameMe();

                bo.Session.CommitTransaction();

                return CreateBusinessObject(bo);
            }
            return null;
        });
    }
}
```

Let's test this:

```cs
[Test]
public async void Rename_Will_Be_Called_Correctly()
{
    var unityContainer = new UnityContainer();

    var mockRenamer = new Mock<IRenamer>();
    mockRenamer.Setup(m => m.RenameMe(It.IsAny<Module.BusinessObjects.MyBo1>()));

    unityContainer.RegisterInstance<IRenamer>(mockRenamer.Object);

    //Arrange
    var xpoHelper = new XpoHelper(unityContainer, CreateDataLayer());

    var session = xpoHelper.GetNewSession();

    var bo = new Module.BusinessObjects.MyBo1(session);

    bo.MyName = "TestName";

    session.CommitTransaction();

    var oid = session.FindObject<Module.BusinessObjects.MyBo1>(null).Oid;

    var repo = new MyBo1Repository(xpoHelper);

    //Act

    var result = await repo.Rename(oid);

    //Assert
    Assert.That(result, Is.Not.Null);
    Assert.That(result.Oid, Is.EqualTo(1));
    Assert.That(result.MyName, Is.EqualTo("TestName"));

    mockRenamer.Verify(m => m.RenameMe(It.IsAny<Module.BusinessObjects.MyBo1>()), Times.Exactly(1));
}
```

Also test the Real implementation:

```cs
[TestFixture]
[Category("CI")]
public class WebApiRenamerTest
{
    [Test]
    public void Ctor_Does_Not_Throw_An_Exception()
    {
        //Arrange / Act / Assert
        Assert.DoesNotThrow(() =>
        {
            var renamer = new WebApiRenamer();

            Assert.That(renamer, Is.InstanceOf<WebApiRenamer>());
        });
    }

    [Test]
    public void Rename_Does_Rename_Object()
    {
        //Arrange
        var renamer = new WebApiRenamer();

        var session = new Session(new SimpleDataLayer(new InMemoryDataStore()));
        var bo = new MyBo1(session);
        bo.MyName = "Test";

        //Act
        renamer.RenameMe(bo);

        //Assert
        Assert.That(bo.MyName, Is.EqualTo("I was renamed by 'XAFDISolution.WebApi.Domain.WebApiRenamer'. Original Name 'Test'"));
    }
}
```

## The WebApiController ##

Extend the `MyBusinessObjectController` with the `Rename` method:
	
 ```cs
// PUT api/MyBusinessObject/5
[HttpPut]
public async Task<MyBo1> Rename(int id)
{
    return await _repository.Rename(id);
}
```

The `HttpPutAttribute` tells the framework that this will be a `Put-Http-Request`.

Test it:

```cs
[Test]
public async void Rename_Will_Call_Rename_And_Return_TheObject()
{
    //Arrange
    var mockRepo = new Mock<IBusinessObjectRepository>();
    mockRepo.Setup(m => m.Rename(It.IsAny<int>())).Returns(() => Task.Run(() => new MyBo1(){MyName = "Renamed"}));

    var controller = new MyBusinessObjectController(mockRepo.Object);

    //Act
    var actual = await controller.Rename(1);

    //Assert
    Assert.That(actual, Is.Not.Null);
    Assert.That(actual.MyName, Is.EqualTo("Renamed"));
}
```

## Fiddler! ##
One thing we need to tell WebApi how to handle routes with a custom pattern:

```cs
public class RouteConfig
{
    public static void RegisterRoutes(RouteCollection routes)
    {
        routes.IgnoreRoute("{resource}.axd/{*pathInfo}");

        routes.MapRoute(
            name: "Default",
            url: "{controller}/{action}/{id}",
            defaults: new { controller = "Home", action = "Index", id = UrlParameter.Optional }
        );

        routes.MapHttpRoute(
            name: "DefaultApi2",
            routeTemplate: "api/{controller}/{action}/{id}",
            defaults: new { id = RouteParameter.Optional }
        );
    }
}
```

The `DefaultApi2` will handle our custom actions that will accept a id in the url.

Then we can call fiddler:

![Call Fiddler](/img/posts/2013/fiddler.png)

Result: 

![Result from fiddler](/img/posts/2013/fiddler2.png)


# WebMvc #


## Repository ##

We need to extend the `WebApiBoRepository`:

```cs
public async Task<MyBo1> Rename(int id)
{
    var client = CreateHttpClient();

    var response = await client.PutAsync("api/MyBusinessObject/Rename/" + id, new MyBo1(), new JsonMediaTypeFormatter());

    response.EnsureSuccessStatusCode();

    return await response.Content.ReadAsAsync<MyBo1>();
}
```

## Controller ##

The `BOController` must be extended:

```cs
// POST: /BO/Rename/5
[HttpPut]
public async Task<ActionResult> Rename(int id)
{
    if (ModelState.IsValid)
    {
        try
        {
            var bo = await _repository.Rename(id);

            return RedirectToAction("Details", bo);
        }
        catch
        {
            return View("Index");
        }
    }
    return View("Index");
}
```

Test it:

```cs
[Test]
public async void Rename_Will_Call_Repo_Rename_Correct()
{
    //Arrange
    var mockRepository = new Mock<IBusinessObjectRepository>();
    mockRepository.Setup(m => m.Rename(It.IsAny<int>())).Returns(() => Task.Run(() => new MyBo1() { Oid = 1}));

    var controller = new BOController(mockRepository.Object);

    
    //Act
    var result = (RedirectToRouteResult)await controller.Rename(1);

    //Assert
    mockRepository.Verify(m => m.Rename(1), Times.Exactly(1));
}
```

Extent the Index.cshtml:

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
            @Html.ActionLink("Rename", "Rename", new { id=item.Oid })
        </td>
    </tr>
}

</table>
```

# Action! #

![Call it](/img/posts/2013/MVC.png)

![See the action!](/img/posts/2013/MVC2.png)

## Source is updated: ##

See [here](https://bitbucket.org/biohazard999/xafdisolution).