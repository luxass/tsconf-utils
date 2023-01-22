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
import {
  findTSConfig,
  findTSConfigSync,
  parseTSConfig,
  parseTSConfigSync,
  resolveTSConfig,
  resolveTSConfigSync
} from "tsconf-utils";

// Find tsconfig.json files
const path = await findTSConfig();

// Find tsconfig.json files synchronously
const path = findTSConfigSync();

// Parse tsconfig.json files
const config = await parseTSConfig(path);

// Parse tsconfig.json files synchronously
const config = parseTSConfigSync(path);

// Resolve tsconfig.json files (find and parse)
const config = await resolveTSConfig(path);

// Resolve tsconfig.json files synchronously (find and parse)
const config = resolveTSConfigSync(path);

```
