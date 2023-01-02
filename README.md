# tsconf-utils

> Utilities for working with tsconfig.json files

<p align="center">
  <a href="https://www.npmjs.com/package/tsconf-utils"><img src="https://img.shields.io/npm/v/tsconf-utils?style=for-the-badge&color=3FA7D6&label="></a>
<p>


## Install
```bash
pnpm install tsconf-utils
```

## Usage

```ts
import {  } from "tsconf-utils";

// From file async
const jsonCFile = await parseFile("./config.jsonc");

// From file
const jsonCFile = parseFileSync("./config.jsonc");

// From string
const jsonC = parse(`
{
  "bar": "foo",
  // This is a comment.
  "foo": /* This is also a comment */ "bar",
}`);
```
