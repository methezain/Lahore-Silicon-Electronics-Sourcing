import { runChecks } from "./harness.mjs";
import { catalogChecks } from "./checks-catalog.mjs";
import { productChecks } from "./checks-product.mjs";
import { flowChecks } from "./checks-flow.mjs";
import { homeChecks } from "./checks-home.mjs";

const all = [...catalogChecks, ...productChecks, ...flowChecks, ...homeChecks];
await runChecks(all, process.argv.slice(2));
