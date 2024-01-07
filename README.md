# tsconf-utils

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]

## Install

```bash
npm install tsconf-utils
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

## 📄 License

Published under [MIT License](./LICENSE).

<!-- Badges -->

[npm-version-src]: https://img.shields.io/npm/v/tsconf-utils?style=flat&colorA=18181B&colorB=4169E1
[npm-version-href]: https://npmjs.com/package/tsconf-utils
[npm-downloads-src]: https://img.shields.io/npm/dm/tsconf-utils?style=flat&colorA=18181B&colorB=4169E1
[npm-downloads-href]: https://npmjs.com/package/tsconf-utils
