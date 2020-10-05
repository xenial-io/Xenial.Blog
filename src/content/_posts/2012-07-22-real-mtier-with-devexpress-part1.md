---
layout: post 
title: "Real MTier with DevExpress (Part 1)"
tags: ["XAF", "OData", "T4", "WCF", "WinRT", "XPO"]
---
Technologie overview
------

First of all one thing:

I like [DevExpress][1] and their controls, but i'm dissatisfied with the speed of the development on the mobile sector with large scaling [XAF][2] applications and the way they are managing their APIs. The options for developers are very restrictive in a manor of extensibility (thanks to VB.NET customers, i think. We develop C#. **WE** know what we shall or not shall do!). Why the fuck is every second method we like to use is fucking Browsable(false) or internal or is only reachable with real reflection pain? "For internal use only"? Are you fucking kidding me? DevExpress, please think of us developers when designing your APIs, not business analysts and script kiddies :(

Phew, that has done well. :)

Our main product is published to a wide range of clients, from small size scaling up to the enterprise sector. 

One thing i really miss in our Portfolio are native apps for all kind of customers mobile devices. One real need for native apps is offline availability of the clients data (enterprise customers need to access their data anytime, regardless of connectionstate). So a Web solution will **NOT** meet our customers needs. Gladly we found [Mono For Android][3] and the [MonoTouch][4] framework from the [Xamarin][5] guys.

<!--more-->

Technologie decision 
--------------------

But what data transport protocol should we use to support all upcomming platforms? [WCF][6]? [SOAP][7]? [OData][8]?



I think pure WCF is a overkill for most of our needs, and there is no tooling on all of our planned supported platforms (IOS for example).

SOAP has the problem that the effort to implement and extend a service for all our needs will take too long, and is a horror in maintainability across our customer needs. There is so much work on the meta-model before we get anything out/back from/to our database model.

DevExpress and OData
--------------------

Then, all of a sudden, DevExpress announced [support][9] for OData in combination with [XPO][10]. Hurray! Getting the hands on the first versions and the result was sobering. :(


We have a huge XPO-Model (800+ PeristentClasses) with a legacy Database (migrating from our delphi application) and a legacy XPO-Model (many many many rookie mistakes was made in the beginning of migration).

Our Namespace model looks like something like this:

 - OurProduct.Model.Products
    - Product.cs
    - ProductCategory.cs

 - OurProduct.Model.Customer
    - Customer.cs
    - ContactInformation.cs

The problem here is there is no way to tell the XPO-Context-Driver to export complex types across different namespaces. That means we have to fetch up our data clientside with multiple queries to the OData-Service which is annoying and not very performant.

The second thing: The documentation was terrible. I don't know if there was a ability to filter out some of our classes from the ResourceSets.

So we decided to wait until DevExpress brings us new features with the next releases.

Starting with [DXperience-12.1][11] they did a great job of cleaning the direct dependency of XAF on XPO. Nice stuff. And tadaaa there was the direct integration of [OData into XPO][12]!

And yes in this version the filtering of the ResourceSets is integrated! Also the Namespace is included in the Classname (sure not pretty, but hey it works!). Now we can start using this stuff and do some really cool things.


The Code
--------

The code is pretty strate forward:

```cs
using System;
using System.Collections.Generic;
using System.Data.Services;
using System.Data.Services.Common;
using DevExpress.Xpo.DB;
using DevExpress.Xpo;
using System.ServiceModel;
using DevExpress.Persistent.BaseImpl;

namespace MultitierSolution.OData
{
    [ServiceBehavior(InstanceContextMode = InstanceContextMode.Single)]
    public class MultitierSolutionODataService : XpoDataService
    {

        public MultitierSolutionODataService() : base(new MultitierSolutionContext("XpoContext", "MultitierSolutionModel", CreateDataLayer())) { }

        static IDataLayer CreateDataLayer()
        {
            string conn = MySqlConnectionProvider.GetConnectionString("servername", "user", "password", "database");
            DevExpress.Xpo.Metadata.XPDictionary dict = new DevExpress.Xpo.Metadata.ReflectionDictionary();
            // Initialize the XPO dictionary. 
            dict.GetDataStoreSchema(typeof(Event).Assembly);
            IDataStore store = XpoDefault.GetConnectionProvider(conn, DevExpress.Xpo.DB.AutoCreateOption.SchemaAlreadyExists);
            return new ThreadSafeDataLayer(dict, store);
        }
        public static void InitializeService(DataServiceConfiguration config)
        {
            config.SetEntitySetAccessRule("*", EntitySetRights.AllRead);
            config.DataServiceBehavior.MaxProtocolVersion = DataServiceProtocolVersion.V2;
            config.DataServiceBehavior.AcceptProjectionRequests = true;
        }
    }

    public class MultitierSolutionContext : XpoContext
    {
        public MultitierSolutionContext(string containerName, string namespaceName, IDataLayer dataLayer)
            : base(containerName, namespaceName, dataLayer) { }

        public override bool HideMetaDataResourceProperty(Type classType, string propertyName)
        {
            if (classType == typeof(Event) && propertyName == "resourceIds")
                return true;
            return false;
        }

        public override bool HideMetaDataResourceSet(Type classType)
        {
            if (classType == typeof(Event))
                return false;

            return true;
        }
    }
}
```

![Project overview of ODataService][13]


Now whe have what we want. Only events are publised to the OData-Serivce:


```xml
<?xml version="1.0" encoding="iso-8859-1" standalone="yes"?>    
<service xml:base="http://localhost/MultitierSolution.OData/ODataDemoService.svc/" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:app="http://www.w3.org/2007/app" xmlns="http://www.w3.org/2007/app">
    <workspace>
    <atom:title>Default</atom:title>
    <collection href="DevExpress_Persistent_BaseImpl_Event">
        <atom:title>DevExpress_Persistent_BaseImpl_Event</atom:title>
    </collection>
    </workspace>
</service>
```
    
And the result:
    
    
```xml                                                                                                                                                                                           <?xml version="1.0" encoding="iso-8859-1" standalone="yes"?>
<feed xml:base="http://localhost/MultitierSolution.OData/ODataDemoService.svc/" xmlns:d="http://schemas.microsoft.com/ado/2007/08/dataservices" xmlns:m="http://schemas.microsoft.com/ado/2007/08/dataservices/metadata" xmlns="http://www.w3.org/2005/Atom">
    <title type="text">DevExpress_Persistent_BaseImpl_Event</title>
    <id>http://localhost/MultitierSolution.OData/ODataDemoService.svc/DevExpress_Persistent_BaseImpl_Event</id>
    <updated>2012-07-21T22:58:09Z</updated>
    <link rel="self" title="DevExpress_Persistent_BaseImpl_Event" href="DevExpress_Persistent_BaseImpl_Event" />
    <entry>
    <id>http://localhost/MultitierSolution.OData/ODataDemoService.svc/DevExpress_Persistent_BaseImpl_Event(guid'61bf9c11-a05e-46fd-9a82-4eb91dabb1a2')</id>
    <title type="text"></title>
    <updated>2012-07-21T22:58:09Z</updated>
    <author>
        <name />
    </author>
    <link rel="edit" title="DevExpress_Persistent_BaseImpl_Event" href="DevExpress_Persistent_BaseImpl_Event(guid'61bf9c11-a05e-46fd-9a82-4eb91dabb1a2')" />
    <link rel="http://schemas.microsoft.com/ado/2007/08/dataservices/related/recurrencePattern" type="application/atom+xml;type=entry" title="recurrencePattern" href="DevExpress_Persistent_BaseImpl_Event(guid'61bf9c11-a05e-46fd-9a82-4eb91dabb1a2')/recurrencePattern" />
    <category term="MultitierSolutionModel.DevExpress_Persistent_BaseImpl_Event" scheme="http://schemas.microsoft.com/ado/2007/08/dataservices/scheme" />
    <content type="application/xml">
        <m:properties>
        <d:oid m:type="Edm.Guid">61bf9c11-a05e-46fd-9a82-4eb91dabb1a2</d:oid>
        <d:Subject>test3</d:Subject>
        <d:Description></d:Description>
        <d:StartOn m:type="Edm.DateTime">2012-07-21T14:00:00</d:StartOn>
        <d:EndOn m:type="Edm.DateTime">2012-07-21T15:30:00</d:EndOn>
        <d:AllDay m:type="Edm.Boolean">false</d:AllDay>
        <d:Location></d:Location>
        <d:Label m:type="Edm.Int32">0</d:Label>
        <d:Status m:type="Edm.Int32">2</d:Status>
        <d:Type m:type="Edm.Int32">0</d:Type>
        <d:RecurrenceInfoXml m:null="true" />
        </m:properties>
    </content>
    </entry>
    <entry>
    <id>http://localhost/MultitierSolution.OData/ODataDemoService.svc/DevExpress_Persistent_BaseImpl_Event(guid'af62e758-f181-4702-8712-76111fb4705f')</id>
    <title type="text"></title>
    <updated>2012-07-21T22:58:09Z</updated>
    <author>
        <name />
    </author>
    <link rel="edit" title="DevExpress_Persistent_BaseImpl_Event" href="DevExpress_Persistent_BaseImpl_Event(guid'af62e758-f181-4702-8712-76111fb4705f')" />
    <link rel="http://schemas.microsoft.com/ado/2007/08/dataservices/related/recurrencePattern" type="application/atom+xml;type=entry" title="recurrencePattern" href="DevExpress_Persistent_BaseImpl_Event(guid'af62e758-f181-4702-8712-76111fb4705f')/recurrencePattern" />
    <category term="MultitierSolutionModel.DevExpress_Persistent_BaseImpl_Event" scheme="http://schemas.microsoft.com/ado/2007/08/dataservices/scheme" />
    <content type="application/xml">
        <m:properties>
        <d:oid m:type="Edm.Guid">af62e758-f181-4702-8712-76111fb4705f</d:oid>
        <d:Subject>some stuff</d:Subject>
        <d:Description></d:Description>
        <d:StartOn m:type="Edm.DateTime">2012-07-21T07:30:00</d:StartOn>
        <d:EndOn m:type="Edm.DateTime">2012-07-21T12:30:00</d:EndOn>
        <d:AllDay m:type="Edm.Boolean">false</d:AllDay>
        <d:Location></d:Location>
        <d:Label m:type="Edm.Int32">3</d:Label>
        <d:Status m:type="Edm.Int32">2</d:Status>
        <d:Type m:type="Edm.Int32">0</d:Type>
        <d:RecurrenceInfoXml m:null="true" />
        </m:properties>
    </content>
    </entry>
    <entry>
    <id>http://localhost/MultitierSolution.OData/ODataDemoService.svc/DevExpress_Persistent_BaseImpl_Event(guid'e7d053b8-1970-4c0d-b6a3-c6c3dd3ca83a')</id>
    <title type="text"></title>
    <updated>2012-07-21T22:58:09Z</updated>
    <author>
        <name />
    </author>
    <link rel="edit" title="DevExpress_Persistent_BaseImpl_Event" href="DevExpress_Persistent_BaseImpl_Event(guid'e7d053b8-1970-4c0d-b6a3-c6c3dd3ca83a')" />
    <link rel="http://schemas.microsoft.com/ado/2007/08/dataservices/related/recurrencePattern" type="application/atom+xml;type=entry" title="recurrencePattern" href="DevExpress_Persistent_BaseImpl_Event(guid'e7d053b8-1970-4c0d-b6a3-c6c3dd3ca83a')/recurrencePattern" />
    <category term="MultitierSolutionModel.DevExpress_Persistent_BaseImpl_Event" scheme="http://schemas.microsoft.com/ado/2007/08/dataservices/scheme" />
    <content type="application/xml">
        <m:properties>
        <d:oid m:type="Edm.Guid">e7d053b8-1970-4c0d-b6a3-c6c3dd3ca83a</d:oid>
        <d:Subject>test</d:Subject>
        <d:Description></d:Description>
        <d:StartOn m:type="Edm.DateTime">2012-07-21T01:00:00</d:StartOn>
        <d:EndOn m:type="Edm.DateTime">2012-07-21T01:30:00</d:EndOn>
        <d:AllDay m:type="Edm.Boolean">true</d:AllDay>
        <d:Location></d:Location>
        <d:Label m:type="Edm.Int32">0</d:Label>
        <d:Status m:type="Edm.Int32">2</d:Status>
        <d:Type m:type="Edm.Int32">0</d:Type>
        <d:RecurrenceInfoXml m:null="true" />
        </m:properties>
    </content>
    </entry>
</feed>
```

WinRT Client Consumption
------------------------

This task is like the use of a regular WCF-Service. Use the `Add Service Reference` command in Visual Studio:

![Add Service Reference for OData in Visual Studio][14]

Rebuild. Booom! What the heck!? It's not compiling anymore. According to a [bug][15] in the code generation of VS12 in the xaml designers we cannot fix this error now :(

But you catch the idea, right?

Shame on you Microsoft! :>


Mono For Android Client Consumption
-----------------------------------

This task is a little bit trickier (for sure, its not MS technologie). But hey, we've got still tools to help us here. 

I've found a [blog post][16] to create the client proxy on a Mono based platform.

Create a custom tool entry under Visual Studio `Tools/External Tools...` to make this task a little bit more comfortable.

![Tools/External Tools... Property Window][17]

    C:\Windows\Microsoft.NET\Framework\v4.0.30319\DataSvcUtil.exe
    /out:Client.cs /version:2.0 /uri:http://localhost/sampleservice/peoplefeed.svc
    $(ProjectDir)

Run the command with our Argument

    /out:Client.cs /version:2.0 /uri:http://localhost/MultitierSolution.OData/MultitierSolutionODataService.svc

Add the generated `Client.cs` file to the Mono For android project and add a reference to `System.Data.Services.Client`.

I don't know why this is no where documented. Neither on the [Mono][18] Documentation nor the [Mono for Android][19] documentation.


Further steps
-------------

In our next post we implement the android client to see some action!


Demo Source
-----------
The source can be found at [Bitbucket][20]

  [1]: https://www.devexpress.com/
  [2]: https://www.devexpress.com/Subscriptions/DXperience/WhatsNew2012v1/xaf.xml
  [3]: https://xamarin.com/monoforandroid
  [4]: https://xamarin.com/monotouch
  [5]: https://xamarin.com/
  [6]: https://msdn.microsoft.com/en-us/netframework/aa663324.aspx
  [7]: https://www.w3.org/TR/soap/
  [8]: https://www.odata.org/
  [9]: https://xpo.codeplex.com/
  [10]: https://www.devexpress.com/Products/NET/ORM/
  [11]: https://www.devexpress.com/Subscriptions/DXperience/WhatsNew2012v1/index.xml?page=58
  [12]: https://www.devexpress.com/Support/Center/p/Q408635.aspx
  [13]: /img/posts/2013/MultitierSolution_OData_Project.png
  [14]: /img/posts/2013/Add_Service_Reference.png
  [15]: https://social.msdn.microsoft.com/Forums/en-US/winappswithcsharp/thread/c699fd8e-6178-4e1c-9a02-6db7a2b4db87
  [16]: https://fizzylogic.azurewebsites.net/2011/05/06/using-odata-with-mono-for-android/
  [17]: /img/posts/2013/External_Tools.png
  [18]: https://www.mono-project.com/WCF_Development
  [19]: https://docs.xamarin.com/ios/tutorials/Working_with_Web_Services
  [20]: https://bitbucket.org/biohazard999/multitiersolutionxaf