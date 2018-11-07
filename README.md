This actor finds broken links on a website. But unlike other SEO auditing tools,
it also find broken URL #fragments.

The actors starts at a given URL and recursively crawls all linked pages under that website. For example,
if the crawler starts at:

```
https://www.example.com/something
```

The actor then also crawls pages like:

```
https://www.example.com/something/index.html
https://www.example.com/something/else
https://www.example.com/something
```

On every page, the crawler analyses whether links to other pages are working or not.
For example, let's say the page contains a link to:

```
https://www.example.com/some/other/page#anchor
```

The actor opens the page `https://www.example.com/some/other/page`, checks that the page loads
correctly and then it also checks that it supports the `#anchor`. That means it checks the page contains either

```
<a name="anchor"></a>
```

or some HTML element with id `anchor`:

```
<div id="anchor>
  ...
</div>
```

Once the crawler finishes, it stores a report of the broken links to the key-value store. There are two files:

- `OUTPUT` contains a JSON report
- `OUTPUT.html` contains a HTML report
