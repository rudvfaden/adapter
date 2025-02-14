# @sasjs/adapter

[![npm package][npm-image]][npm-url]
[![Github Workflow][githubworkflow-image]][githubworkflow-url]
[![npm](https://img.shields.io/npm/dt/@sasjs/adapter)]()
![Snyk Vulnerabilities for npm package](https://img.shields.io/snyk/vulnerabilities/npm/@sasjs/adapter)
[![License](https://img.shields.io/apm/l/atomic-design-ui.svg)](/LICENSE)
![GitHub top language](https://img.shields.io/github/languages/top/sasjs/adapter)
![GitHub issues](https://img.shields.io/github/issues/sasjs/adapter)
[![Gitpod ready-to-code](https://img.shields.io/badge/Gitpod-ready--to--code-908a85?logo=gitpod)](https://gitpod.io/#https://github.com/sasjs/adapter)


[npm-image]:https://img.shields.io/npm/v/@sasjs/adapter.svg
[npm-url]:http://npmjs.org/package/@sasjs/adapter
[githubworkflow-image]:https://github.com/sasjs/adapter/actions/workflows/build.yml/badge.svg
[githubworkflow-url]:https://github.com/sasjs/adapter/blob/main/.github/workflows/build.yml
[dependency-image]:https://david-dm.org/sasjs/adapter.svg

SASjs is a open-source framework for building Web Apps on SAS® platforms. You can use as much or as little of it as you like. This repository contains the JS adapter, the part that handles the to/from SAS communication on the client side. There are 3 ways to install it:

1 - `npm install @sasjs/adapter` - for use in a nodeJS project (recommended)

2 - [Download](https://cdn.jsdelivr.net/npm/@sasjs/adapter@3/index.min.js) and use a copy of the latest JS file

3 - Reference directly from the CDN - in which case click [here](https://www.jsdelivr.com/package/npm/@sasjs/adapter?tab=collection) and select "SRI" to get the script tag with the integrity hash.

If you are short on time and just need to build an app quickly, then check out [this video](https://vimeo.com/393161794) and the [react-seed-app](https://github.com/sasjs/react-seed-app) which provides some boilerplate.

For more information on building web apps with SAS, check out [sasjs.io](https://sasjs.io)

## None of this makes sense. How do I build an app with it?

Ok ok. Deploy this [example.html](https://raw.githubusercontent.com/sasjs/adapter/master/example.html) file to your web server, and update `servertype` to `SAS9`, `SASVIYA`, or `SASJS` depending on your backend.

The backend part can be deployed as follows:

```sas
%let appLoc=/Public/app/readme;  /* Metadata or Viya Folder per SASjs config */
filename mc url "https://raw.githubusercontent.com/sasjs/core/main/all.sas";
%inc mc; /* compile macros (can also be downloaded & compiled seperately) */
filename ft15f001 temp;
parmcards4;
  %webout(FETCH) /* receive all data as SAS datasets */
  proc sql;
  create table areas as select make,mean(invoice) as avprice
    from sashelp.cars
    where type in (select type from work.fromjs)
    group by 1;
  %webout(OPEN)
  %webout(OBJ,areas)
  %webout(CLOSE)
;;;;
%mx_createwebservice(path=&appLoc/common,name=getdata)
```

You now have a simple web app with a backend service!

## Detailed Overview

The SASjs adapter is a JS library and a set of SAS Macros that handle the communication between the frontend app and backend SAS services.

There are three parts to consider:

1. JS request / response
2. SAS inputs / outputs
3. Configuration

### JS Request / Response

To install the library you can simply run `npm i @sasjs/adapter` or include a `<script>` tag with a reference to our [CDN](https://www.jsdelivr.com/package/npm/@sasjs/adapter).

Full technical documentation is available [here](https://adapter.sasjs.io).  The main parts are:

### Instantiation
The following code will instantiate an instance of the adapter:

```javascript
let sasJs = new SASjs.default(
  {
    appLoc: "/Your/SAS/Folder",
    serverType:"SAS9"
  }
);
```
If you've installed it via NPM, you can import it as a default import like so:
```js
  import SASjs from '@sasjs/adapter';
```
You can then instantiate it with:
```js
const sasJs = new SASjs({your config})
```

More on the config later.

### SAS Logon
All authentication from the adapter is done against SASLogon.  There are two approaches that can be taken, which are configured using the `loginMechanism` attribute of the sasJs config object (above):

* `loginMechanism:'Redirected'` - this approach enables authentication through a SASLogon window, supporting complex authentication flows (such as 2FA) and avoids the need to handle passwords in the application itself.  The styling of the window can be modified using CSS.
* `loginMechanism:'Default'` - this approach requires that the username and password are captured, and used within the `.login()` method.  This can be helpful for development, or automated testing.

Sample code for logging in with the `Default` approach:

```javascript
sasJs.logIn('USERNAME','PASSWORD'
  ).then((response) => {
  if (response.isLoggedIn === true) {
    console.log('do stuff')
  } else {
    console.log('do other stuff')
  }
}
```

More examples of using authentication, and more, can be found in the [SASjs Seed Apps](https://github.com/search?q=topic%3Asasjs-app+org%3Asasjs+fork%3Atrue) on github.

###  Request / Response
A simple request can be sent to SAS in the following fashion:

```javascript
sasJs.request("/path/to/my/service", dataObject)
  .then((response) => {
    // all tables are in the response object, eg:
    console.log(response.tablewith2cols1row[0].COL1.value)
  })
```

We supply the path to the SAS service, and a data object.  

If the path starts with a `/` then it should be a full path to the service.  If there is no leading `/` then it is relative to the `appLoc`. 

The data object can be null (for services with no input), or can contain one or more "tables" in the following format:

```javascript
let dataObject={
	"tablewith2cols1row": [{
		"col1": "val1",
		"col2": 42
	}],
	"tablewith1col2rows": [{
		"col": "row1"
	}, {
		"col": "row2"
	}]
};
```

These tables (`tablewith2cols1row` and `tablewith1col2rows`) will be created in SAS WORK after running `%webout(FETCH)` in your SAS service.

The `request()` method also has optional parameters such as a config object and a callback login function.

The response object will contain returned tables and columns.  Table names are always lowercase, and column names uppercase.

The adapter will also cache the logs (if debug enabled) and even the work tables.  For performance, it is best to keep debug mode off.

### Variable Types

The SAS type (char/numeric) of the values is determined according to a set of rules:

* If the values are numeric, the SAS type is numeric
* If the values are all string, the SAS type is character
* If the values contain a single character (a-Z + underscore + .) AND a numeric, then the SAS type is numeric (with special missing values).  
* `null` is set to either '.' or '' depending on the assigned or derived type per the above rules.  If entire column is `null` then the type will be numeric.

The following table illustrates the formats applied to columns under various scenarios:

|JS Values |SAS Format|
|---|---|
|'a', 'a' |$char1.|
|0, '_' |best.|
|'Z', 0 |best.|
|'a', 'aaa' |$char3.|
|null, 'a', 'aaa' | $char3.|
|null, 'a', 0 | best.|
|null, null | best.|
|null, '' | $char1.|
|null, 'a' | $char1.|
|'a' | $char1.|
|'a', null | $char1.|
|'a', null, 0 | best.|

Validation is also performed on the values.  The following combinations will throw errors:

|JS Values |SAS Format|
|---|---|
|null, 'aaaa', 0 | Error: mixed types. 'aaaa' is not a special missing value.|
|0, 'a', '!' | Error: mixed types. '!' is not a special missing value|
|1.1, '.', 0| Error: mixed types.  For regular nulls, use `null`|

### Variable Format Override
The auto-detect functionality above is thwarted in the following scenarios:

* A character column containing only `null` values (is considered numeric)
* A numeric column containing only special missing values (is considered character)

To cater for these scenarios, an optional array of formats can be passed along with the data to ensure that SAS will read them in correctly.

To understand these formats, it should be noted that the JSON data is NOT passed directly (as JSON) to SAS. It is first converted into CSV, and the header row is actually an `infile` statement in disguise.  It looks a bit like this:

```csv
CHARVAR1:$char4. CHARVAR2:$char1. NUMVAR:best.
LOAD,,0
ABCD,X,.
```

To provide overrides to this header row, the tables object can be constructed as follows (with a leading '$' in the table name):

```javascript
let specialData={
  "tablewith2cols2rows": [
    {"col1": "val1","specialMissingsCol": "A"},
    {"col1": "val2","specialMissingsCol": "_"}
  ],
  "$tablewith2cols2rows":{"formats":{"specialMissingsCol":"best."}
  }
};
```

It is not necessary to provide formats for ALL the columns, only the ones that need to be overridden.

## SAS Inputs / Outputs

The SAS side is handled by a number of macros in the [macro core](https://github.com/sasjs/core) library.

The following snippet shows the process of SAS tables arriving / leaving:

```sas
/* convert frontend input tables from into SASWORK datasets */
%webout(FETCH)

/* some sas code */
data a b c;
  set from js;
run;

%webout(OPEN)  /* Open the JSON to be returned */
%webout(OBJ,a) /* Rows in table `a` are objects (easy to use) */
%webout(ARR,b) /* Rows in table `b` are arrays (compact) */
%webout(OBJ,c,fmt=N) /* Table `c` is sent unformatted (raw) */
%webout(OBJ,c,label=d) /* Rename table as `d` in output JSON */
%webout(OBJ,c,label=e, maxobs=10) /* send only 10 rows back */
%webout(CLOSE) /* Close the JSON and add default variables */
```

By default, special SAS numeric missings (_a-Z) are converted to `null` in the JSON.  If you'd like to preserve these, use the `missing=STRING` option as follows:

```sas
%webout(OBJ,a,missing=STRING)
```
In this case, special missings (such as `.a`, `.b`) are converted to javascript string values (`'A', 'B'`).

Where an entire column is made up of special missing numerics, there would be no way to distinguish it from a single-character column by looking at the values.  To cater for this scenario, it is possible to export the variable types (and other attributes such as label and format) by adding a `showmeta` param to the `webout()` macro as follows:

```sas
%webout(OBJ,a,missing=STRING,showmeta=YES)
```

The `%webout()` macro itself is just a wrapper for the [mp_jsonout](https://core.sasjs.io/mp__jsonout_8sas.html) macro.

## Configuration

Configuration on the client side involves passing an object on startup, which can also be passed with each request.  Technical documentation on the SASjsConfig class is available [here](https://adapter.sasjs.io/classes/types.sasjsconfig.html).  The main config items are:

* `appLoc` - this is the folder (eg in metadata or SAS Drive) under which the SAS services are created.
* `serverType` - either `SAS9`, `SASVIYA` or `SASJS`.  The `SASJS` server type is for use with [sasjs/server](https://github.com/sasjs/server).
* `serverUrl` - the location (including http protocol and port) of the SAS Server. Can be omitted, eg if serving directly from the SAS Web Server, or in streaming mode.
* `debug` - if `true` then SAS Logs and extra debug information is returned.
* `loginMechanism` - either `Default` or `Redirected`.  See [SAS Logon](#sas-logon) section.
* `useComputeApi` - Only relevant when the serverType is `SASVIYA`. If `true` the [Compute API](#using-the-compute-api) is used.  If `false` the [JES API](#using-the-jes-api) is used.  If `null` or `undefined` the [Web](#using-jes-web-app) approach is used.
* `contextName` - Compute context on which the requests will be called.  If missing or not provided, defaults to `Job Execution Compute context`.
* `requestHistoryLimit` - Request history limit. Increasing this limit may affect browser performance, especially with debug (logs) enabled.  Default is 10.

The adapter supports a number of approaches for interfacing with Viya (`serverType` is `SASVIYA`).  For maximum performance, be sure to [configure your compute context](https://sasjs.io/guide-viya/#shared-account-and-server-re-use) with `reuseServerProcesses` as `true` and a system account in `runServerAs`.  This functionality is available since Viya 3.5.  This configuration is supported when [creating contexts using the CLI](https://sasjs.io/sasjs-cli-context/#sasjs-context-create).

### Using JES Web App

In this setup, all requests are routed through the JES web app, at `YOURSERVER/SASJobExecution?_program=/your/program`.  This is the most reliable method, and also the slowest.  One request is made to the JES app, and remaining requests (getting job uri, session spawning, passing parameters, running the program, fetching the log) are handled by the SAS server inside the JES app.

```
{
  appLoc:"/Your/Path",
  serverType:"SASVIYA",
  contextName: 'yourComputeContext'
}
```

Note - to use the web approach, the `useComputeApi` property must be `undefined` or `null`.

### Using the JES API
Here we are running Jobs using the Job Execution Service except this time we are making the requests directly using the REST API instead of through the JES Web App.  This is helpful when we need to call web services outside of a browser (eg with the SASjs CLI or other commandline tools).  To save one network request, the adapter prefetches the JOB URIs and passes them in the `__job` parameter.  Depending on your network bandwidth, it may or may not be faster than the JES Web approach.

This approach (`useComputeApi: false`) also ensures that jobs are displayed in Environment Manager.

```json
{
  appLoc:"/Your/Path",
  serverType:"SASVIYA",
  useComputeApi: false,
  contextName: 'yourComputeContext'
}
```

### Using the Compute API
This approach is by far the fastest, as a result of the optimisations we have built into the adapter.  With this configuration, in the first sasjs request, we take a URI map of the services in the target folder, and create a session manager.  This manager will spawn a additional session every time a request is made. Subsequent requests will use the existing 'hot' session, if it exists.  Sessions are always deleted after every use, which actually makes this _less_ resource intensive than a typical JES web app, in which all sessions are kept alive by default for 15 minutes.

With this approach (`useComputeApi: true`), the requests/logs will _not_ appear in the list in Environment manager.

```json
{
  appLoc:"/Your/Path",
  serverType:"SASVIYA",
  useComputeApi: true,
  contextName: "yourComputeContext"
}
```


# More resources

For more information and examples specific to this adapter you can check out the [user guide](https://sasjs.io/sasjs-adapter/) or the [technical](http://adapter.sasjs.io/) documentation.

For more information on building web apps in general, check out these [resources](https://sasjs.io/training/resources/) or contact the [author](https://www.linkedin.com/in/allanbowe/) directly.

As a SAS customer you can also request a copy of [Data Controller](https://datacontroller.io) - free for up to 5 users, this tool makes use of all parts of the SASjs framework.


## Star Gazing

If you find this library useful, help us grow our star graph!

![](https://starchart.cc/sasjs/adapter.svg)

## Contributors ✨
<!-- ALL-CONTRIBUTORS-BADGE:START - Do not remove or modify this section -->
[![All Contributors](https://img.shields.io/badge/all_contributors-7-orange.svg?style=flat-square)](#contributors-)
<!-- ALL-CONTRIBUTORS-BADGE:END -->

Thanks goes to these wonderful people ([emoji key](https://allcontributors.org/docs/en/emoji-key)):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tr>
    <td align="center"><a href="https://krishna-acondy.io/"><img src="https://avatars.githubusercontent.com/u/2980428?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Krishna Acondy</b></sub></a><br /><a href="https://github.com/sasjs/adapter/commits?author=krishna-acondy" title="Code">💻</a> <a href="#infra-krishna-acondy" title="Infrastructure (Hosting, Build-Tools, etc)">🚇</a> <a href="#blog-krishna-acondy" title="Blogposts">📝</a> <a href="#content-krishna-acondy" title="Content">🖋</a> <a href="#ideas-krishna-acondy" title="Ideas, Planning, & Feedback">🤔</a> <a href="#video-krishna-acondy" title="Videos">📹</a></td>
    <td align="center"><a href="https://www.erudicat.com/"><img src="https://avatars.githubusercontent.com/u/25773492?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Yury Shkoda</b></sub></a><br /><a href="https://github.com/sasjs/adapter/commits?author=YuryShkoda" title="Code">💻</a> <a href="#infra-YuryShkoda" title="Infrastructure (Hosting, Build-Tools, etc)">🚇</a> <a href="#ideas-YuryShkoda" title="Ideas, Planning, & Feedback">🤔</a> <a href="https://github.com/sasjs/adapter/commits?author=YuryShkoda" title="Tests">⚠️</a> <a href="#video-YuryShkoda" title="Videos">📹</a></td>
    <td align="center"><a href="https://github.com/medjedovicm"><img src="https://avatars.githubusercontent.com/u/18329105?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Mihajlo Medjedovic</b></sub></a><br /><a href="https://github.com/sasjs/adapter/commits?author=medjedovicm" title="Code">💻</a> <a href="#infra-medjedovicm" title="Infrastructure (Hosting, Build-Tools, etc)">🚇</a> <a href="https://github.com/sasjs/adapter/commits?author=medjedovicm" title="Tests">⚠️</a> <a href="https://github.com/sasjs/adapter/pulls?q=is%3Apr+reviewed-by%3Amedjedovicm" title="Reviewed Pull Requests">👀</a></td>
    <td align="center"><a href="https://github.com/allanbowe"><img src="https://avatars.githubusercontent.com/u/4420615?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Allan Bowe</b></sub></a><br /><a href="https://github.com/sasjs/adapter/commits?author=allanbowe" title="Code">💻</a> <a href="https://github.com/sasjs/adapter/pulls?q=is%3Apr+reviewed-by%3Aallanbowe" title="Reviewed Pull Requests">👀</a> <a href="https://github.com/sasjs/adapter/commits?author=allanbowe" title="Tests">⚠️</a> <a href="#mentoring-allanbowe" title="Mentoring">🧑‍🏫</a> <a href="#maintenance-allanbowe" title="Maintenance">🚧</a></td>
    <td align="center"><a href="https://github.com/saadjutt01"><img src="https://avatars.githubusercontent.com/u/8914650?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Muhammad Saad </b></sub></a><br /><a href="https://github.com/sasjs/adapter/commits?author=saadjutt01" title="Code">💻</a> <a href="https://github.com/sasjs/adapter/pulls?q=is%3Apr+reviewed-by%3Asaadjutt01" title="Reviewed Pull Requests">👀</a> <a href="https://github.com/sasjs/adapter/commits?author=saadjutt01" title="Tests">⚠️</a> <a href="#mentoring-saadjutt01" title="Mentoring">🧑‍🏫</a> <a href="#infra-saadjutt01" title="Infrastructure (Hosting, Build-Tools, etc)">🚇</a></td>
    <td align="center"><a href="https://github.com/sabhas"><img src="https://avatars.githubusercontent.com/u/82647447?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Sabir Hassan</b></sub></a><br /><a href="https://github.com/sasjs/adapter/commits?author=sabhas" title="Code">💻</a> <a href="https://github.com/sasjs/adapter/pulls?q=is%3Apr+reviewed-by%3Asabhas" title="Reviewed Pull Requests">👀</a> <a href="https://github.com/sasjs/adapter/commits?author=sabhas" title="Tests">⚠️</a> <a href="#ideas-sabhas" title="Ideas, Planning, & Feedback">🤔</a></td>
    <td align="center"><a href="https://github.com/VladislavParhomchik"><img src="https://avatars.githubusercontent.com/u/83717836?v=4?s=100" width="100px;" alt=""/><br /><sub><b>VladislavParhomchik</b></sub></a><br /><a href="https://github.com/sasjs/adapter/commits?author=VladislavParhomchik" title="Tests">⚠️</a> <a href="https://github.com/sasjs/adapter/pulls?q=is%3Apr+reviewed-by%3AVladislavParhomchik" title="Reviewed Pull Requests">👀</a></td>
  </tr>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://github.com/all-contributors/all-contributors) specification. Contributions of any kind welcome!
