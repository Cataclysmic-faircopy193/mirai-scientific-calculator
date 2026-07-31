# @openmirai/calculator-core

Framework-independent calculation utilities for the OpenMirai calculator. The
package has no runtime dependencies, React code, styles, or assets.

```bash
pnpm add @openmirai/calculator-core
```

```ts
import { evaluateExpression } from "@openmirai/calculator-core/engine"

const result = evaluateExpression("sin(30) + sqrt(81)", {
  angleMode: "degrees",
})
```
