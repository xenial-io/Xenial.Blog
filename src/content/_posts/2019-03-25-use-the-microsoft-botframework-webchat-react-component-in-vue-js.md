---
 layout: post 
 title: Use the Microsoft BotFramework-WebChat react component in vue.js
 tags: [React, Microsoft, VueJS, Vue, BotFramework, Programming, TypeScript, Aurelia, DevExtreme, Vuera]
---
This is a quick one, cause I think it's worth writing down.

Recently I did a lot with the [Microsoft Bot-Framework](//dev.botframework.com/). The Year I worked with [Aurelia](//aurelia.io) and I always wanted to look into [VueJS](//vuejs.org/) cause it's the [new kid on the block](//medium.com/@kevinakuviza/vuejs-the-new-kid-in-the-block-1e1de8a7c23). But it's getting a lot of [momentum](//medium.com/the-vue-storefront-journal/why-we-choose-vue-js-over-react-for-vue-storefront-7f499c950239) since it originated. But there is a problem: They use [React](//reactjs.org/) for the [WebChat](//github.com/Microsoft/BotFramework-WebChat) but we have [vuera](//github.com/akxcv/vuera)!

I didn't want go the react route, cause I think it's quite verbose, and I needed to get something out really quickly.
So I started the project with [@vue/cli](//cli.vuejs.org/).

```cmd
npm -g i @vue/cli
```

I'm going to use [Typescript](//www.typescriptlang.org), [Vuex](//vuex.vuejs.org), [Babel](//babeljs.io), [Router](//router.vuejs.org), [Node-SASS](//github.com/sass/node-sass), [TSLint](//palantir.github.io/tslint/), [Jest](//jestjs.io) so I need to manually select the features I want to use.
I like the [class-style component](//alligator.io/vuejs/typescript-class-components/) syntax with [decorators](//www.typescriptlang.org/docs/handbook/decorators.html).

```cmd
npx vue create use-the-microsoft-botframework-webchat-react-component-in-vue-js
```

![Setting up vue project with @vue/cli #1](/img/posts/2019/2019-03-25-use-the-microsoft-botframework-webchat-react-component-in-vue-cli1.png)
![Setting up vue project with @vue/cli #2](/img/posts/2019/2019-03-25-use-the-microsoft-botframework-webchat-react-component-in-vue-cli2.png)
![Setting up vue project with @vue/cli #3](/img/posts/2019/2019-03-25-use-the-microsoft-botframework-webchat-react-component-in-vue-cli3.png)

After launching the project using `npm run serve` we can navigate to [http://localhost:8080](http://localhost:8080) and have a nice empty skeleton.

![Skeleton of project after first launch](/img/posts/2019/2019-03-25-use-the-microsoft-botframework-webchat-react-component-in-vue-skeleton.png)

Let's add another component called `Chat.vue` and add a route so we can access it.

`src/views/Chat.vue`

```html
<template>
  <div class="chat">
    <h1>Chat</h1>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';

@Component({
  components: {},
})
export default class Home extends Vue {}
</script>

<style lang="sass" scoped>

</style>
```

`src/router.ts`

```ts
import Vue from 'vue';
import Router from 'vue-router';
import Home from './views/Home.vue';

Vue.use(Router);

export default new Router({
  mode: 'history',
  base: process.env.BASE_URL,
  routes: [
    {
      path: '/',
      name: 'home',
      component: Home,
    },
    {
      path: '/about',
      name: 'about',
      // route level code-splitting
      // this generates a separate chunk (about.[hash].js) for this route
      // which is lazy-loaded when the route is visited.
      component: () =>
        import(/* webpackChunkName: "about" */ './views/About.vue'),
    },
    {
      path: '/chat',
      name: 'chat',
      // route level code-splitting
      // this generates a separate chunk (about.[hash].js) for this route
      // which is lazy-loaded when the route is visited.
      component: () =>
        import(/* webpackChunkName: "about" */ './views/Chat.vue'),
    },
  ],
});

```

`src/App.vue`

```html
<template>
  <div id="app">
    <div id="nav">
      <router-link to="/">Home</router-link> |
      <router-link to="/about">About</router-link> |
      <router-link to="/chat">Chat</router-link>
    </div>
    <router-view/>
  </div>
</template>

<style lang="scss">
#app {
  font-family: 'Avenir', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
}
#nav {
  padding: 30px;
  a {
    font-weight: bold;
    color: #2c3e50;
    &.router-link-exact-active {
      color: #42b983;
    }
  }
}
</style>
```

That gives us this nice page where we can put stuff into it:

![Skeleton of project after first launch](/img/posts/2019/2019-03-25-use-the-microsoft-botframework-webchat-react-component-in-vue-empty-chat.png)

Lets get out dependencies in.

```cmd
npm i vuera botframework-webchat botframework-directlinejs
```

Use the vuera plugin by adding `Vue.use(VuePlugin)` into `src/main.ts`

```ts
import Vue from 'vue';
import { VuePlugin } from 'vuera';
import App from './App.vue';
import router from './router';
import store from './store';

Vue.use(VuePlugin);

Vue.config.productionTip = false;

new Vue({
  router,
  store,
  render: (h) => h(App),
}).$mount('#app');

```

Unfortunately there are no types for vuera yet, but we deal with that later.

Hopp over to `src/views/Chat.vue` and let's embed the webchat.

```html
<template>
  <div class="chat">
    <h1>Chat</h1>
    <react-web-chat
      class="web-chat"
      v-if="directLine && webchatStore"
      :directLine="directLine"
      :store="webchatStore"
      :styleOptions="styleOptions"
    ></react-web-chat>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import { Middleware } from "redux";
import { DirectLine } from "botframework-directlinejs";
import ReactWebChat, {
  createDirectLine,
  createStore
} from "botframework-webchat/lib/index";

@Component({
  components: { "react-web-chat": ReactWebChat }
})
export default class Home extends Vue {
  directLine: DirectLine | null = null;
  webchatStore: any | null = null;
  styleOptions: any | null = {
    rootHeight: "100%",
    rootWidth: "100%"
  };

  async mounted() {
    const res = await fetch(
      "https://webchat-mockbot.azurewebsites.net/directline/token",
      { method: "POST" }
    );

    const { token } = await res.json();

    this.directLine = createDirectLine({
      token: token.token
    });

    const middleware: Middleware = ({ dispatch }) => next => action => {
      return next(action);
    };

    this.webchatStore = createStore({}, middleware);
  }
}
</script>

<style lang="scss" scoped>
.chat {
  height: 400px;
  width: 100%;
}
.web-chat{
  height: 100%;
  width: 100%;
  border: 1px solid #999;
}
</style>
```

Voilà! There it is:

![Working Chat in Browser](/img/posts/2019/2019-03-25-use-the-microsoft-botframework-webchat-react-component-in-vue-chat-working.png)

### Bonus

Remembered the types problem of vuera beforehand? Let's write some typings.

`src/vuera.d.ts`

```ts
declare module 'vuera' {
  import { PluginObject } from 'Vue';
  const VuePlugin: PluginObject<any>;
  export { VuePlugin };
}
```

After running `npm run build` we get nasty errors from the compiler

```txt
C:\F\github\use-the-microsoft-botframework-webchat-react-component-in-vue-js>npm run build

> use-the-microsoft-botframework-webchat-react-component-in-vue-js@0.1.0 build C:\F\github\use-the-microsoft-botframework-webchat-react-component-in-vue-js
> vue-cli-service build


\  Building for production...Starting type checking service...
Using 1 worker with 2048MB memory limit
|  Building for production...

 ERROR  Failed to compile with 15 errors                                                                                                                                                                13:25:03
 error  in C:/F/github/use-the-microsoft-botframework-webchat-react-component-in-vue-js/node_modules/botframework-webchat-component/lib/index.d.ts

ERROR in C:/F/github/use-the-microsoft-botframework-webchat-react-component-in-vue-js/node_modules/botframework-webchat-component/lib/index.d.ts
1:26 Could not find a declaration file for module './BasicWebChat'. 'C:/F/github/use-the-microsoft-botframework-webchat-react-component-in-vue-js/node_modules/botframework-webchat-component/lib/BasicWebChat.js' implicitly has an 'any' type.
  > 1 | import BasicWebChat from './BasicWebChat';
      |                          ^
    2 | import concatMiddleware from './Middleware/concatMiddleware';
    3 | import connectToWebChat from './connectToWebChat';
    4 | import Context from './Context';

 error  in C:/F/github/use-the-microsoft-botframework-webchat-react-component-in-vue-js/node_modules/botframework-webchat-component/lib/index.d.ts

ERROR in C:/F/github/use-the-microsoft-botframework-webchat-react-component-in-vue-js/node_modules/botframework-webchat-component/lib/index.d.ts
2:30 Could not find a declaration file for module './Middleware/concatMiddleware'. 'C:/F/github/use-the-microsoft-botframework-webchat-react-component-in-vue-js/node_modules/botframework-webchat-component/lib/Middleware/concatMiddleware.js' implicitly has an 'any' type.
    1 | import BasicWebChat from './BasicWebChat';
  > 2 | import concatMiddleware from './Middleware/concatMiddleware';
      |                              ^
    3 | import connectToWebChat from './connectToWebChat';
    4 | import Context from './Context';
    5 | import createAdaptiveCardsAttachmentMiddleware from './Middleware/Attachment/createAdaptiveCardMiddleware';

 error  in C:/F/github/use-the-microsoft-botframework-webchat-react-component-in-vue-js/node_modules/botframework-webchat-component/lib/index.d.ts

ERROR in C:/F/github/use-the-microsoft-botframework-webchat-react-component-in-vue-js/node_modules/botframework-webchat-component/lib/index.d.ts
3:30 Could not find a declaration file for module './connectToWebChat'. 'C:/F/github/use-the-microsoft-botframework-webchat-react-component-in-vue-js/node_modules/botframework-webchat-component/lib/connectToWebChat.js' implicitly has an 'any' type.
    1 | import BasicWebChat from './BasicWebChat';
    2 | import concatMiddleware from './Middleware/concatMiddleware';
  > 3 | import connectToWebChat from './connectToWebChat';
      |                              ^
    4 | import Context from './Context';
    5 | import createAdaptiveCardsAttachmentMiddleware from './Middleware/Attachment/createAdaptiveCardMiddleware';
    6 | import createCoreActivityMiddleware from './Middleware/Activity/createCoreMiddleware';

 error  in C:/F/github/use-the-microsoft-botframework-webchat-react-component-in-vue-js/node_modules/botframework-webchat-component/lib/index.d.ts

ERROR in C:/F/github/use-the-microsoft-botframework-webchat-react-component-in-vue-js/node_modules/botframework-webchat-component/lib/index.d.ts
4:21 Could not find a declaration file for module './Context'. 'C:/F/github/use-the-microsoft-botframework-webchat-react-component-in-vue-js/node_modules/botframework-webchat-component/lib/Context.js' implicitly has an 'any' type.
    2 | import concatMiddleware from './Middleware/concatMiddleware';
    3 | import connectToWebChat from './connectToWebChat';
  > 4 | import Context from './Context';
      |                     ^
    5 | import createAdaptiveCardsAttachmentMiddleware from './Middleware/Attachment/createAdaptiveCardMiddleware';
    6 | import createCoreActivityMiddleware from './Middleware/Activity/createCoreMiddleware';
    7 | import createCoreAttachmentMiddleware from './Middleware/Attachment/createCoreMiddleware';

 error  in C:/F/github/use-the-microsoft-botframework-webchat-react-component-in-vue-js/node_modules/botframework-webchat-component/lib/index.d.ts

ERROR in C:/F/github/use-the-microsoft-botframework-webchat-react-component-in-vue-js/node_modules/botframework-webchat-component/lib/index.d.ts
5:53 Could not find a declaration file for module './Middleware/Attachment/createAdaptiveCardMiddleware'. 'C:/F/github/use-the-microsoft-botframework-webchat-react-component-in-vue-js/node_modules/botframework-webchat-component/lib/Middleware/Attachment/createAdaptiveCardMiddleware.js' implicitly has an 'any' type.
    3 | import connectToWebChat from './connectToWebChat';
    4 | import Context from './Context';
  > 5 | import createAdaptiveCardsAttachmentMiddleware from './Middleware/Attachment/createAdaptiveCardMiddleware';
      |                                                     ^
    6 | import createCoreActivityMiddleware from './Middleware/Activity/createCoreMiddleware';
    7 | import createCoreAttachmentMiddleware from './Middleware/Attachment/createCoreMiddleware';
    8 | import createStyleSet from './Styles/createStyleSet';

 error  in C:/F/github/use-the-microsoft-botframework-webchat-react-component-in-vue-js/node_modules/botframework-webchat-component/lib/index.d.ts

ERROR in C:/F/github/use-the-microsoft-botframework-webchat-react-component-in-vue-js/node_modules/botframework-webchat-component/lib/index.d.ts
6:42 Could not find a declaration file for module './Middleware/Activity/createCoreMiddleware'. 'C:/F/github/use-the-microsoft-botframework-webchat-react-component-in-vue-js/node_modules/botframework-webchat-component/lib/Middleware/Activity/createCoreMiddleware.js' implicitly has an 'any' type.
    4 | import Context from './Context';
    5 | import createAdaptiveCardsAttachmentMiddleware from './Middleware/Attachment/createAdaptiveCardMiddleware';
  > 6 | import createCoreActivityMiddleware from './Middleware/Activity/createCoreMiddleware';
      |                                          ^
    7 | import createCoreAttachmentMiddleware from './Middleware/Attachment/createCoreMiddleware';
    8 | import createStyleSet from './Styles/createStyleSet';
    9 | declare const version: any;

 error  in C:/F/github/use-the-microsoft-botframework-webchat-react-component-in-vue-js/node_modules/botframework-webchat-component/lib/index.d.ts

ERROR in C:/F/github/use-the-microsoft-botframework-webchat-react-component-in-vue-js/node_modules/botframework-webchat-component/lib/index.d.ts
7:44 Could not find a declaration file for module './Middleware/Attachment/createCoreMiddleware'. 'C:/F/github/use-the-microsoft-botframework-webchat-react-component-in-vue-js/node_modules/botframework-webchat-component/lib/Middleware/Attachment/createCoreMiddleware.js' implicitly has an 'any' type.
     5 | import createAdaptiveCardsAttachmentMiddleware from './Middleware/Attachment/createAdaptiveCardMiddleware';
     6 | import createCoreActivityMiddleware from './Middleware/Activity/createCoreMiddleware';
  >  7 | import createCoreAttachmentMiddleware from './Middleware/Attachment/createCoreMiddleware';
       |                                            ^
     8 | import createStyleSet from './Styles/createStyleSet';
     9 | declare const version: any;
    10 | declare const Components: {

 error  in C:/F/github/use-the-microsoft-botframework-webchat-react-component-in-vue-js/node_modules/botframework-webchat-component/lib/index.d.ts

ERROR in C:/F/github/use-the-microsoft-botframework-webchat-react-component-in-vue-js/node_modules/botframework-webchat-component/lib/index.d.ts
8:28 Could not find a declaration file for module './Styles/createStyleSet'. 'C:/F/github/use-the-microsoft-botframework-webchat-react-component-in-vue-js/node_modules/botframework-webchat-component/lib/Styles/createStyleSet.js' implicitly has an 'any' type.
     6 | import createCoreActivityMiddleware from './Middleware/Activity/createCoreMiddleware';
     7 | import createCoreAttachmentMiddleware from './Middleware/Attachment/createCoreMiddleware';
  >  8 | import createStyleSet from './Styles/createStyleSet';
       |                            ^
     9 | declare const version: any;
    10 | declare const Components: {
    11 |     Composer: any;

 error  in C:/F/github/use-the-microsoft-botframework-webchat-react-component-in-vue-js/node_modules/botframework-webchat/lib/index-minimal.d.ts

ERROR in C:/F/github/use-the-microsoft-botframework-webchat-react-component-in-vue-js/node_modules/botframework-webchat/lib/index-minimal.d.ts
1:40 Could not find a declaration file for module 'botframework-webchat-core'. 'C:/F/github/use-the-microsoft-botframework-webchat-react-component-in-vue-js/node_modules/botframework-webchat-core/lib/index.js' implicitly has an 'any' type.
  Try `npm install @types/botframework-webchat-core` if it exists or add a new declaration (.d.ts) file containing `declare module 'botframework-webchat-core';`
  > 1 | import { Constants, createStore } from 'botframework-webchat-core';
      |                                        ^
    2 | import ReactWebChat, { Components, concatMiddleware, connectToWebChat, createStyleSet } from 'botframework-webchat-component';
    3 | import createBrowserWebSpeechPonyfillFactory from './createBrowserWebSpeechPonyfillFactory';
    4 | import createDirectLine from './createDirectLine';

 error  in C:/F/github/use-the-microsoft-botframework-webchat-react-component-in-vue-js/node_modules/botframework-webchat/lib/index-minimal.d.ts

ERROR in C:/F/github/use-the-microsoft-botframework-webchat-react-component-in-vue-js/node_modules/botframework-webchat/lib/index-minimal.d.ts
3:51 Could not find a declaration file for module './createBrowserWebSpeechPonyfillFactory'. 'C:/F/github/use-the-microsoft-botframework-webchat-react-component-in-vue-js/node_modules/botframework-webchat/lib/createBrowserWebSpeechPonyfillFactory.js' implicitly has an 'any' type.
    1 | import { Constants, createStore } from 'botframework-webchat-core';
    2 | import ReactWebChat, { Components, concatMiddleware, connectToWebChat, createStyleSet } from 'botframework-webchat-component';
  > 3 | import createBrowserWebSpeechPonyfillFactory from './createBrowserWebSpeechPonyfillFactory';
      |                                                   ^
    4 | import createDirectLine from './createDirectLine';
    5 | declare const renderWebChat: any;
    6 | export default ReactWebChat;

 error  in C:/F/github/use-the-microsoft-botframework-webchat-react-component-in-vue-js/node_modules/botframework-webchat/lib/index-minimal.d.ts

ERROR in C:/F/github/use-the-microsoft-botframework-webchat-react-component-in-vue-js/node_modules/botframework-webchat/lib/index-minimal.d.ts
4:30 Could not find a declaration file for module './createDirectLine'. 'C:/F/github/use-the-microsoft-botframework-webchat-react-component-in-vue-js/node_modules/botframework-webchat/lib/createDirectLine.js' implicitly has an 'any' type.
    2 | import ReactWebChat, { Components, concatMiddleware, connectToWebChat, createStyleSet } from 'botframework-webchat-component';
    3 | import createBrowserWebSpeechPonyfillFactory from './createBrowserWebSpeechPonyfillFactory';
  > 4 | import createDirectLine from './createDirectLine';
      |                              ^
    5 | declare const renderWebChat: any;
    6 | export default ReactWebChat;
    7 | export { Components, concatMiddleware, connectToWebChat, Constants, createBrowserWebSpeechPonyfillFactory, createDirectLine, createStore, createStyleSet, renderWebChat };

 error  in C:/F/github/use-the-microsoft-botframework-webchat-react-component-in-vue-js/node_modules/botframework-webchat/lib/index.d.ts

ERROR in C:/F/github/use-the-microsoft-botframework-webchat-react-component-in-vue-js/node_modules/botframework-webchat/lib/index.d.ts
2:62 Could not find a declaration file for module './createCognitiveServicesBingSpeechPonyfillFactory'. 'C:/F/github/use-the-microsoft-botframework-webchat-react-component-in-vue-js/node_modules/botframework-webchat/lib/createCognitiveServicesBingSpeechPonyfillFactory.js' implicitly has an 'any' type.
    1 | export * from './index-minimal';
  > 2 | import createCognitiveServicesBingSpeechPonyfillFactory from './createCognitiveServicesBingSpeechPonyfillFactory';
      |                                                              ^
    3 | import createCognitiveServicesSpeechServicesPonyfillFactory from './createCognitiveServicesSpeechServicesPonyfillFactory';
    4 | import ReactWebChat from './FullReactWebChat';
    5 | import renderMarkdown from './renderMarkdown';

 error  in C:/F/github/use-the-microsoft-botframework-webchat-react-component-in-vue-js/node_modules/botframework-webchat/lib/index.d.ts

ERROR in C:/F/github/use-the-microsoft-botframework-webchat-react-component-in-vue-js/node_modules/botframework-webchat/lib/index.d.ts
3:66 Could not find a declaration file for module './createCognitiveServicesSpeechServicesPonyfillFactory'. 'C:/F/github/use-the-microsoft-botframework-webchat-react-component-in-vue-js/node_modules/botframework-webchat/lib/createCognitiveServicesSpeechServicesPonyfillFactory.js' implicitly has an 'any' type.
    1 | export * from './index-minimal';
    2 | import createCognitiveServicesBingSpeechPonyfillFactory from './createCognitiveServicesBingSpeechPonyfillFactory';
  > 3 | import createCognitiveServicesSpeechServicesPonyfillFactory from './createCognitiveServicesSpeechServicesPonyfillFactory';
      |                                                                  ^
    4 | import ReactWebChat from './FullReactWebChat';
    5 | import renderMarkdown from './renderMarkdown';
    6 | declare const renderWebChat: any;

 error  in C:/F/github/use-the-microsoft-botframework-webchat-react-component-in-vue-js/node_modules/botframework-webchat/lib/index.d.ts

ERROR in C:/F/github/use-the-microsoft-botframework-webchat-react-component-in-vue-js/node_modules/botframework-webchat/lib/index.d.ts
4:26 Could not find a declaration file for module './FullReactWebChat'. 'C:/F/github/use-the-microsoft-botframework-webchat-react-component-in-vue-js/node_modules/botframework-webchat/lib/FullReactWebChat.js' implicitly has an 'any' type.
    2 | import createCognitiveServicesBingSpeechPonyfillFactory from './createCognitiveServicesBingSpeechPonyfillFactory';
    3 | import createCognitiveServicesSpeechServicesPonyfillFactory from './createCognitiveServicesSpeechServicesPonyfillFactory';
  > 4 | import ReactWebChat from './FullReactWebChat';
      |                          ^
    5 | import renderMarkdown from './renderMarkdown';
    6 | declare const renderWebChat: any;
    7 | export default ReactWebChat;

 error  in C:/F/github/use-the-microsoft-botframework-webchat-react-component-in-vue-js/node_modules/botframework-webchat/lib/index.d.ts

ERROR in C:/F/github/use-the-microsoft-botframework-webchat-react-component-in-vue-js/node_modules/botframework-webchat/lib/index.d.ts
5:28 Could not find a declaration file for module './renderMarkdown'. 'C:/F/github/use-the-microsoft-botframework-webchat-react-component-in-vue-js/node_modules/botframework-webchat/lib/renderMarkdown.js' implicitly has an 'any' type.
    3 | import createCognitiveServicesSpeechServicesPonyfillFactory from './createCognitiveServicesSpeechServicesPonyfillFactory';
    4 | import ReactWebChat from './FullReactWebChat';
  > 5 | import renderMarkdown from './renderMarkdown';
      |                            ^
    6 | declare const renderWebChat: any;
    7 | export default ReactWebChat;
    8 | export { createCognitiveServicesBingSpeechPonyfillFactory, createCognitiveServicesSpeechServicesPonyfillFactory, renderMarkdown, renderWebChat };

 ERROR  Build failed with errors.
npm ERR! code ELIFECYCLE
npm ERR! errno 1
npm ERR! use-the-microsoft-botframework-webchat-react-component-in-vue-js@0.1.0 build: `vue-cli-service build`
npm ERR! Exit status 1
npm ERR!
npm ERR! Failed at the use-the-microsoft-botframework-webchat-react-component-in-vue-js@0.1.0 build script.
npm ERR! This is probably not a problem with npm. There is likely additional logging output above.

npm ERR! A complete log of this run can be found in:
npm ERR!     C:\Users\mgrun\AppData\Roaming\npm-cache\_logs\2019-03-25T12_25_03_210Z-debug.log
```

![Nasty errors after building](/img/posts/2019/2019-03-25-use-the-microsoft-botframework-webchat-react-component-in-vue-nasty-errors.png)

Hopp over to `ts.config` and set `noImplicitAny` to `false`.

```json
{
    "compilerOptions": {
        "target": "esnext",
    "module": "esnext",
    "strict": true,
    "jsx": "preserve",
    "importHelpers": true,
    "moduleResolution": "node",
    "experimentalDecorators": true,
    "noImplicitAny": false,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "sourceMap": true,
    "baseUrl": ".",
    "types": [
        "webpack-env",
      "jest"
    ],
    "paths": {
        "@/*": [
            "src/*"
      ]
    },
    "lib": [
        "esnext",
      "dom",
      "dom.iterable",
      "scripthost"
    ]
  },
  "include": [
      "src/**/*.ts",
    "src/**/*.tsx",
    "src/**/*.vue",
    "tests/**/*.ts",
    "tests/**/*.tsx"
  ],
  "exclude": [
      "node_modules"
  ]
}

```

That's it, its not the best solution i can imagine, but at least it's working!

```txt
C:\F\github\use-the-microsoft-botframework-webchat-react-component-in-vue-js>npm run build

> use-the-microsoft-botframework-webchat-react-component-in-vue-js@0.1.0 build C:\F\github\use-the-microsoft-botframework-webchat-react-component-in-vue-js
> vue-cli-service build


\  Building for production...Starting type checking service...
Using 1 worker with 2048MB memory limit
/  Building for production...

 WARNING  Compiled with 2 warnings                                                                                                                                                                      13:29:05
 warning 

asset size limit: The following asset(s) exceed the recommended size limit (244 KiB).
This can impact web performance.
Assets:
  js/about.38ba8e33.js (1.45 MiB)
  js/chunk-vendors.303f3451.js (261 KiB)

 warning 

entrypoint size limit: The following entrypoint(s) combined asset size exceeds the recommended limit (244 KiB). This can impact web performance.
Entrypoints:
  app (269 KiB)
      js/chunk-vendors.303f3451.js
      css/app.f595b69e.css
      js/app.d0dc8921.js


  File                                 Size               Gzipped

  dist\js\about.38ba8e33.js            1483.25 KiB        427.57 KiB
  dist\js\chunk-vendors.303f3451.js    261.10 KiB         85.58 KiB
  dist\js\app.d0dc8921.js              7.66 KiB           2.72 KiB
  dist\css\app.f595b69e.css            0.42 KiB           0.26 KiB
  dist\css\about.2a81e48a.css          0.12 KiB           0.10 KiB

  Images and other types of assets omitted.

 DONE  Build complete. The dist directory is ready to be deployed.
 INFO  Check out deployment instructions at https://cli.vuejs.org/guide/deployment.html
```

![Working building](/img/posts/2019/2019-03-25-use-the-microsoft-botframework-webchat-react-component-in-vue-working-build.png)

Happy Chatting! :)

Ps.: As always you can find the source on my [github](//github.com/biohazard999/use-the-microsoft-botframework-webchat-react-component-in-vue-js)